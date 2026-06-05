import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserContext } from '../auth/auth.types';
import { DatabricksService } from '../databricks/databricks.service';
import type { DatabricksStatementResponse } from '../databricks/databricks.types';
import { DataQueryDto } from './dto/data-query.dto';

type DataSet = 'claims' | 'providers' | 'patientMetrics';

type DataSetConfig = {
  tableEnv: string;
  defaultTable: string;
  dateColumn?: string;
};

const DATA_SET_CONFIG: Record<DataSet, DataSetConfig> = {
  claims: {
    tableEnv: 'DATABRICKS_CLAIMS_TABLE',
    defaultTable: 'claims',
    dateColumn: 'service_date',
  },
  providers: {
    tableEnv: 'DATABRICKS_PROVIDERS_TABLE',
    defaultTable: 'providers',
  },
  patientMetrics: {
    tableEnv: 'DATABRICKS_PATIENT_METRICS_TABLE',
    defaultTable: 'patient_metrics',
    dateColumn: 'measured_at',
  },
};

const PLATFORM_ROLES = new Set(['developer', 'superAdmin']);

@Injectable()
export class DataQueryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databricksService: DatabricksService,
  ) {}

  async listClaims(
    query: DataQueryDto,
    user: UserContext,
  ): Promise<DatabricksStatementResponse> {
    return this.executeDataSet('claims', query, user);
  }

  async listProviders(
    query: DataQueryDto,
    user: UserContext,
  ): Promise<DatabricksStatementResponse> {
    return this.executeDataSet('providers', query, user);
  }

  async listPatientMetrics(
    query: DataQueryDto,
    user: UserContext,
  ): Promise<DatabricksStatementResponse> {
    return this.executeDataSet('patientMetrics', query, user);
  }

  private executeDataSet(
    dataSet: DataSet,
    query: DataQueryDto,
    user: UserContext,
  ) {
    const config = DATA_SET_CONFIG[dataSet];
    const tableName = this.getTableName(config);
    const statement = this.buildStatement(tableName, config, query, user);

    return this.databricksService.executeStatement({
      statement,
      waitTimeout: '10s',
      onWaitTimeout: 'CONTINUE',
    });
  }

  buildStatement(
    tableName: string,
    config: Pick<DataSetConfig, 'dateColumn'>,
    query: DataQueryDto,
    user: UserContext,
  ): string {
    const conditions = [
      ...this.buildUserScopeConditions(user),
      ...this.buildQueryConditions(query, config),
    ];
    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    return `SELECT * FROM ${tableName}${whereClause} LIMIT ${limit} OFFSET ${offset}`;
  }

  private getTableName(config: DataSetConfig): string {
    const tableName =
      this.configService.get<string>(config.tableEnv) ?? config.defaultTable;

    if (!/^[A-Za-z0-9_.$`]+$/.test(tableName)) {
      throw new Error(`Invalid Databricks table name for ${config.tableEnv}`);
    }

    return tableName;
  }

  private buildUserScopeConditions(user: UserContext): string[] {
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
      this.inCondition('organization_id', organizationIds),
      this.inCondition('practice_id', practiceIds),
      this.inCondition('provider_id', providerIds),
    ].filter((condition): condition is string => Boolean(condition));

    if (scopedConditions.length === 0) {
      return ['1 = 0'];
    }

    return [`(${scopedConditions.join(' OR ')})`];
  }

  private buildQueryConditions(
    query: DataQueryDto,
    config: Pick<DataSetConfig, 'dateColumn'>,
  ): string[] {
    const conditions = [
      this.equalsCondition('organization_id', query.organizationId),
      this.equalsCondition('practice_id', query.practiceId),
      this.equalsCondition('provider_id', query.providerId),
      this.equalsCondition('patient_id', query.patientId),
    ].filter((condition): condition is string => Boolean(condition));

    if (config.dateColumn && query.fromDate) {
      conditions.push(
        `${config.dateColumn} >= DATE '${this.escapeSqlLiteral(query.fromDate)}'`,
      );
    }

    if (config.dateColumn && query.toDate) {
      conditions.push(
        `${config.dateColumn} <= DATE '${this.escapeSqlLiteral(query.toDate)}'`,
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
}
