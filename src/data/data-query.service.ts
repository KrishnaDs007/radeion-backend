import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import type { UserContext } from '../auth/auth.types';
import { DatabricksService } from '../databricks/databricks.service';
import type { DatabricksStatementResponse } from '../databricks/databricks.types';
import { DataQueryDto } from './dto/data-query.dto';

type DataSet = 'claims' | 'providers' | 'patientMetrics';

type DataSetConfig = {
  tableEnv: string;
  defaultTable: string;
  columns: DataSetColumns;
};

type DataSetColumns = {
  organizationId: ColumnConfig;
  practiceId: ColumnConfig;
  providerId: ColumnConfig;
  patientId: ColumnConfig;
  date?: ColumnConfig;
};

type ColumnConfig = {
  env: string;
  defaultName: string;
};

type ResolvedDataSetConfig = {
  tableName: string;
  columns: ResolvedDataSetColumns;
};

type ResolvedDataSetColumns = {
  organizationId: string;
  practiceId: string;
  providerId: string;
  patientId: string;
  date?: string;
};

type DataPageMetadata = {
  limit: number;
  offset: number;
  returnedRowCount: number;
  nextOffset: number | null;
  hasNextPage: boolean;
  includedResultChunks: boolean;
  resultChunkCount: number;
  hasMoreResultChunks: boolean;
};

export type DataQueryResponse = {
  data: DatabricksStatementResponse;
  page: DataPageMetadata;
};

const DATA_SET_CONFIG: Record<DataSet, DataSetConfig> = {
  claims: {
    tableEnv: 'DATABRICKS_CLAIMS_TABLE',
    defaultTable: 'claims',
    columns: {
      organizationId: {
        env: 'DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN',
        defaultName: 'organization_id',
      },
      practiceId: {
        env: 'DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN',
        defaultName: 'practice_id',
      },
      providerId: {
        env: 'DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN',
        defaultName: 'provider_id',
      },
      patientId: {
        env: 'DATABRICKS_CLAIMS_PATIENT_ID_COLUMN',
        defaultName: 'patient_id',
      },
      date: {
        env: 'DATABRICKS_CLAIMS_DATE_COLUMN',
        defaultName: 'service_date',
      },
    },
  },
  providers: {
    tableEnv: 'DATABRICKS_PROVIDERS_TABLE',
    defaultTable: 'providers',
    columns: {
      organizationId: {
        env: 'DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN',
        defaultName: 'organization_id',
      },
      practiceId: {
        env: 'DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN',
        defaultName: 'practice_id',
      },
      providerId: {
        env: 'DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN',
        defaultName: 'provider_id',
      },
      patientId: {
        env: 'DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN',
        defaultName: 'patient_id',
      },
    },
  },
  patientMetrics: {
    tableEnv: 'DATABRICKS_PATIENT_METRICS_TABLE',
    defaultTable: 'patient_metrics',
    columns: {
      organizationId: {
        env: 'DATABRICKS_PATIENT_METRICS_ORGANIZATION_ID_COLUMN',
        defaultName: 'organization_id',
      },
      practiceId: {
        env: 'DATABRICKS_PATIENT_METRICS_PRACTICE_ID_COLUMN',
        defaultName: 'practice_id',
      },
      providerId: {
        env: 'DATABRICKS_PATIENT_METRICS_PROVIDER_ID_COLUMN',
        defaultName: 'provider_id',
      },
      patientId: {
        env: 'DATABRICKS_PATIENT_METRICS_PATIENT_ID_COLUMN',
        defaultName: 'patient_id',
      },
      date: {
        env: 'DATABRICKS_PATIENT_METRICS_DATE_COLUMN',
        defaultName: 'measured_at',
      },
    },
  },
};

const PLATFORM_ROLES = new Set(['developer', 'superAdmin']);

@Injectable()
export class DataQueryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databricksService: DatabricksService,
    private readonly auditService: AuditService,
  ) {}

  async listClaims(
    query: DataQueryDto,
    user: UserContext,
  ): Promise<DataQueryResponse> {
    return this.executeDataSet('claims', query, user);
  }

  async listProviders(
    query: DataQueryDto,
    user: UserContext,
  ): Promise<DataQueryResponse> {
    return this.executeDataSet('providers', query, user);
  }

  async listPatientMetrics(
    query: DataQueryDto,
    user: UserContext,
  ): Promise<DataQueryResponse> {
    return this.executeDataSet('patientMetrics', query, user);
  }

  private async executeDataSet(
    dataSet: DataSet,
    query: DataQueryDto,
    user: UserContext,
  ): Promise<DataQueryResponse> {
    const config = DATA_SET_CONFIG[dataSet];
    const resolvedConfig = this.resolveDataSetConfig(config);
    const statement = this.buildStatement(resolvedConfig, query, user);
    const data = await this.databricksService.executeStatement({
      statement,
      waitTimeout: '10s',
      onWaitTimeout: 'CONTINUE',
      fetchAllResultChunks: query.includeResultChunks ?? false,
    });
    const page = this.buildPageMetadata(query, data);

    await this.auditService.record({
      actorProfileId: user.profileId,
      action: 'data.read',
      targetType: 'dataQuery',
      targetId: data.statement_id,
      organizationId: query.organizationId,
      metadata: {
        dataSet,
        tableName: resolvedConfig.tableName,
        limit: page.limit,
        offset: page.offset,
        returnedRowCount: page.returnedRowCount,
        includedResultChunks: page.includedResultChunks,
        resultChunkCount: page.resultChunkCount,
        filters: this.getFilterPresence(query),
      },
    });

    return {
      data,
      page,
    };
  }

  buildStatement(
    config: ResolvedDataSetConfig,
    query: DataQueryDto,
    user: UserContext,
  ): string {
    const conditions = [
      ...this.buildUserScopeConditions(user, config.columns),
      ...this.buildQueryConditions(query, config),
    ];
    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    return `SELECT * FROM ${config.tableName}${whereClause} LIMIT ${limit} OFFSET ${offset}`;
  }

  private resolveDataSetConfig(config: DataSetConfig): ResolvedDataSetConfig {
    return {
      tableName: this.getTableName(config),
      columns: {
        organizationId: this.getColumnName(config.columns.organizationId),
        practiceId: this.getColumnName(config.columns.practiceId),
        providerId: this.getColumnName(config.columns.providerId),
        patientId: this.getColumnName(config.columns.patientId),
        date: config.columns.date
          ? this.getColumnName(config.columns.date)
          : undefined,
      },
    };
  }

  private getTableName(
    config: Pick<DataSetConfig, 'tableEnv' | 'defaultTable'>,
  ) {
    const tableName =
      this.configService.get<string>(config.tableEnv) ?? config.defaultTable;

    if (!this.isSafeSqlIdentifierPath(tableName)) {
      throw new Error(`Invalid Databricks table name for ${config.tableEnv}`);
    }

    return tableName;
  }

  private getColumnName(config: ColumnConfig) {
    const columnName =
      this.configService.get<string>(config.env) ?? config.defaultName;

    if (!this.isSafeSqlIdentifierPath(columnName)) {
      throw new Error(`Invalid Databricks column name for ${config.env}`);
    }

    return columnName;
  }

  private buildUserScopeConditions(
    user: UserContext,
    columns: ResolvedDataSetColumns,
  ): string[] {
    if (user.roles.some((role) => PLATFORM_ROLES.has(role.name))) {
      return [];
    }

    const organizationIds = new Set<string>();
    const practiceIds = new Set<string>();
    const providerIds = new Set<string>();

    for (const role of user.roles) {
      if (role.organizationId) {
        organizationIds.add(role.organizationId);
      }

      if (role.scopeType === 'practice' && role.scopeId) {
        practiceIds.add(role.scopeId);
      }

      if (role.scopeType === 'provider' && role.scopeId) {
        providerIds.add(role.scopeId);
      }
    }

    const scopedConditions = [
      this.inCondition(columns.organizationId, organizationIds),
      this.inCondition(columns.practiceId, practiceIds),
      this.inCondition(columns.providerId, providerIds),
    ].filter((condition): condition is string => Boolean(condition));

    if (scopedConditions.length === 0) {
      return ['1 = 0'];
    }

    return [`(${scopedConditions.join(' OR ')})`];
  }

  private buildQueryConditions(
    query: DataQueryDto,
    config: ResolvedDataSetConfig,
  ): string[] {
    const conditions = [
      this.equalsCondition(config.columns.organizationId, query.organizationId),
      this.equalsCondition(config.columns.practiceId, query.practiceId),
      this.equalsCondition(config.columns.providerId, query.providerId),
      this.equalsCondition(config.columns.patientId, query.patientId),
    ].filter((condition): condition is string => Boolean(condition));

    if (config.columns.date && query.fromDate) {
      conditions.push(
        `${config.columns.date} >= DATE '${this.escapeSqlLiteral(query.fromDate)}'`,
      );
    }

    if (config.columns.date && query.toDate) {
      conditions.push(
        `${config.columns.date} <= DATE '${this.escapeSqlLiteral(query.toDate)}'`,
      );
    }

    return conditions;
  }

  private equalsCondition(columnName: string, value?: string): string | null {
    return value ? `${columnName} = '${this.escapeSqlLiteral(value)}'` : null;
  }

  private inCondition(columnName: string, values: Set<string>): string | null {
    if (values.size === 0) {
      return null;
    }

    return `${columnName} IN (${Array.from(values)
      .map((value) => `'${this.escapeSqlLiteral(value)}'`)
      .join(', ')})`;
  }

  private escapeSqlLiteral(value: string): string {
    return value.replaceAll("'", "''");
  }

  private isSafeSqlIdentifierPath(value: string): boolean {
    return /^[A-Za-z0-9_.$`]+$/.test(value);
  }

  private buildPageMetadata(
    query: DataQueryDto,
    response: DatabricksStatementResponse,
  ): DataPageMetadata {
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;
    const resultChunks = response.result_chunks ?? [];
    const returnedRowCount =
      this.countRows(response.result) +
      resultChunks.reduce((total, chunk) => total + this.countRows(chunk), 0);
    const lastFetchedChunk = resultChunks.at(-1);
    const hasMoreResultChunks = Boolean(
      lastFetchedChunk?.next_chunk_internal_link ??
      response.result?.next_chunk_internal_link,
    );
    const hasNextPage = returnedRowCount >= limit;

    return {
      limit,
      offset,
      returnedRowCount,
      nextOffset: hasNextPage ? offset + limit : null,
      hasNextPage,
      includedResultChunks: query.includeResultChunks ?? false,
      resultChunkCount: resultChunks.length,
      hasMoreResultChunks,
    };
  }

  private countRows(result?: DatabricksStatementResponse['result']): number {
    const rows = result?.data_array;

    return Array.isArray(rows) ? rows.length : 0;
  }

  private getFilterPresence(query: DataQueryDto): Record<string, boolean> {
    return {
      organizationId: Boolean(query.organizationId),
      practiceId: Boolean(query.practiceId),
      providerId: Boolean(query.providerId),
      patientId: Boolean(query.patientId),
      fromDate: Boolean(query.fromDate),
      toDate: Boolean(query.toDate),
    };
  }
}
