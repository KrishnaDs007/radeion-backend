import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { CacheService } from '../cache/cache.service';
import {
  DatabricksStatementRequest,
  DatabricksStatementResponse,
  DatabricksStatementResult,
  DatabricksStatementState,
} from './databricks.types';

const TERMINAL_STATEMENT_STATES = new Set<DatabricksStatementState>([
  'SUCCEEDED',
  'FAILED',
  'CANCELED',
  'CLOSED',
]);

@Injectable()
export class DatabricksService {
  private readonly host: string;
  private readonly token: string;
  private readonly warehouseId: string;
  private readonly maxPollAttempts: number;
  private readonly pollIntervalMs: number;
  private readonly maxResultChunks: number;

  constructor(
    configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.host = this.normalizeHost(
      configService.getOrThrow<string>('DATABRICKS_HOST'),
    );
    this.token = configService.getOrThrow<string>('DATABRICKS_TOKEN');
    this.warehouseId =
      configService.get<string>('DATABRICKS_WAREHOUSE_ID') ??
      this.parseWarehouseId(
        configService.getOrThrow<string>('DATABRICKS_HTTP_PATH'),
      );
    this.maxPollAttempts = this.getPositiveIntegerConfig(
      configService,
      'DATABRICKS_POLL_MAX_ATTEMPTS',
      10,
    );
    this.pollIntervalMs = this.getPositiveIntegerConfig(
      configService,
      'DATABRICKS_POLL_INTERVAL_MS',
      500,
    );
    this.maxResultChunks = this.getPositiveIntegerConfig(
      configService,
      'DATABRICKS_MAX_RESULT_CHUNKS',
      10,
    );
  }

  async executeStatement(
    request: DatabricksStatementRequest,
  ): Promise<DatabricksStatementResponse> {
    const cacheKey = this.createStatementCacheKey(request);

    return this.cacheService.remember(
      cacheKey,
      () => this.executeUncachedStatement(request),
      { ttlSeconds: 60 },
    );
  }

  private async executeUncachedStatement(
    request: DatabricksStatementRequest,
  ): Promise<DatabricksStatementResponse> {
    const body = await this.fetchDatabricksJson('/api/2.0/sql/statements', {
      method: 'POST',
      body: JSON.stringify({
        statement: request.statement,
        warehouse_id: this.warehouseId,
        wait_timeout: request.waitTimeout ?? '10s',
        on_wait_timeout: request.onWaitTimeout ?? 'CONTINUE',
      }),
    });

    const completedStatement = await this.pollUntilTerminal(body);

    this.assertSuccessfulStatement(completedStatement);

    if (request.fetchAllResultChunks) {
      return this.fetchRemainingResultChunks(completedStatement);
    }

    return completedStatement;
  }

  private async pollUntilTerminal(
    initialResponse: DatabricksStatementResponse,
  ): Promise<DatabricksStatementResponse> {
    let statement = initialResponse;

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt += 1) {
      const state = statement.status?.state;

      if (!state || TERMINAL_STATEMENT_STATES.has(state)) {
        return statement;
      }

      if (!statement.statement_id) {
        throw new Error('Databricks statement response did not include an id');
      }

      await this.sleep(this.pollIntervalMs);
      statement = await this.fetchDatabricksJson(
        `/api/2.0/sql/statements/${statement.statement_id}`,
        { method: 'GET' },
      );
    }

    throw new Error('Databricks statement polling exceeded max attempts');
  }

  private assertSuccessfulStatement(statement: DatabricksStatementResponse) {
    const state = statement.status?.state;

    if (!state || state === 'SUCCEEDED') {
      return;
    }

    const message = statement.status?.error?.message;
    throw new Error(
      message
        ? `Databricks statement ${state}: ${message}`
        : `Databricks statement finished with ${state}`,
    );
  }

  private async fetchRemainingResultChunks(
    statement: DatabricksStatementResponse,
  ): Promise<DatabricksStatementResponse> {
    const resultChunks: DatabricksStatementResult[] = [];
    let nextChunkLink = statement.result?.next_chunk_internal_link;

    while (nextChunkLink && resultChunks.length < this.maxResultChunks) {
      const chunk = (await this.fetchDatabricksJson(nextChunkLink, {
        method: 'GET',
      })) as DatabricksStatementResult;
      resultChunks.push(chunk);
      nextChunkLink = chunk.next_chunk_internal_link;
    }

    return {
      ...statement,
      result_chunks: resultChunks,
    };
  }

  private async fetchDatabricksJson(
    path: string,
    init: RequestInit,
  ): Promise<DatabricksStatementResponse> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${this.host}${normalizedPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    const body = (await response.json()) as DatabricksStatementResponse;

    if (!response.ok) {
      throw new Error(
        `Databricks request failed with status ${response.status}`,
      );
    }

    return body;
  }

  private sleep(milliseconds: number): Promise<void> {
    if (milliseconds <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private createStatementCacheKey(request: DatabricksStatementRequest): string {
    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          statement: request.statement,
          warehouseId: this.warehouseId,
          fetchAllResultChunks: request.fetchAllResultChunks ?? false,
        }),
      )
      .digest('hex');

    return `databricks:statement:${hash}`;
  }

  parseWarehouseId(httpPath: string): string {
    const parts = httpPath.split('/').filter(Boolean);
    const warehouseId = parts.at(-1);

    if (!warehouseId) {
      throw new Error('Unable to parse Databricks warehouse id from HTTP path');
    }

    return warehouseId;
  }

  private normalizeHost(host: string): string {
    const trimmedHost = host.trim().replace(/\/+$/, '');

    if (
      trimmedHost.startsWith('http://') ||
      trimmedHost.startsWith('https://')
    ) {
      return trimmedHost;
    }

    return `https://${trimmedHost}`;
  }

  private getPositiveIntegerConfig(
    configService: ConfigService,
    key: string,
    fallback: number,
  ): number {
    const value = configService.get<string | number>(key);

    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsedValue =
      typeof value === 'number' ? value : Number.parseInt(value, 10);

    return Number.isFinite(parsedValue) && parsedValue >= 0
      ? parsedValue
      : fallback;
  }
}
