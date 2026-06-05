import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DatabricksStatementRequest,
  DatabricksStatementResponse,
} from './databricks.types';

@Injectable()
export class DatabricksService {
  private readonly host: string;
  private readonly token: string;
  private readonly warehouseId: string;

  constructor(configService: ConfigService) {
    this.host = this.normalizeHost(
      configService.getOrThrow<string>('DATABRICKS_HOST'),
    );
    this.token = configService.getOrThrow<string>('DATABRICKS_TOKEN');
    this.warehouseId =
      configService.get<string>('DATABRICKS_WAREHOUSE_ID') ??
      this.parseWarehouseId(
        configService.getOrThrow<string>('DATABRICKS_HTTP_PATH'),
      );
  }

  async executeStatement(
    request: DatabricksStatementRequest,
  ): Promise<DatabricksStatementResponse> {
    const response = await fetch(`${this.host}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statement: request.statement,
        warehouse_id: this.warehouseId,
        wait_timeout: request.waitTimeout ?? '10s',
        on_wait_timeout: request.onWaitTimeout ?? 'CONTINUE',
      }),
    });

    const body = (await response.json()) as DatabricksStatementResponse;

    if (!response.ok) {
      throw new Error(
        `Databricks statement request failed with status ${response.status}`,
      );
    }

    return body;
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
}
