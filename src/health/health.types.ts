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
  };
  cache: {
    driver: string;
  };
};
