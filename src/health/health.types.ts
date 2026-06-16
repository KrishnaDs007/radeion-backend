export type HealthStatus = {
  status: 'ok';
  service: string;
  timestamp: string;
};

export type ConfigurationStatus = {
  supabase: {
    url: boolean;
    publishableKey: boolean;
    secretKey: boolean;
  };
  database: {
    databaseUrl: boolean;
    directUrl: boolean;
  };
  databricks: {
    host: boolean;
    token: boolean;
    httpPath: boolean;
    warehouseId: boolean;
    tables: {
      claims: boolean;
      providers: boolean;
      patientMetrics: boolean;
    };
    columnMappings: {
      claims: boolean;
      providers: boolean;
      patientMetrics: boolean;
    };
  };
  cache: {
    driver: string;
  };
  email: {
    driver: string;
    from: boolean;
    resendApiKey: boolean;
    inviteAcceptUrl: boolean;
    passwordRecoveryRedirectUrl: boolean;
  };
};

export type DatabaseHealthStatus = {
  connected: boolean;
};

export type CacheHealthStatus = {
  connected: boolean;
  driver: string;
};
