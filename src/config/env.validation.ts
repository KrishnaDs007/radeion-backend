type EnvironmentVariables = Record<string, string | undefined>;

const REQUIRED_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
  'DATABRICKS_HOST',
  'DATABRICKS_TOKEN',
  'DATABRICKS_HTTP_PATH',
] as const;

const OPTIONAL_INTEGER_KEYS = [
  'PORT',
  'DATABRICKS_POLL_MAX_ATTEMPTS',
  'DATABRICKS_POLL_INTERVAL_MS',
  'DATABRICKS_MAX_RESULT_CHUNKS',
] as const;

const OPTIONAL_DATABRICKS_IDENTIFIER_KEYS = [
  'DATABRICKS_CLAIMS_TABLE',
  'DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN',
  'DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN',
  'DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN',
  'DATABRICKS_CLAIMS_PATIENT_ID_COLUMN',
  'DATABRICKS_CLAIMS_DATE_COLUMN',
  'DATABRICKS_PROVIDERS_TABLE',
  'DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN',
  'DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN',
  'DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN',
  'DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN',
  'DATABRICKS_PATIENT_METRICS_TABLE',
  'DATABRICKS_PATIENT_METRICS_ORGANIZATION_ID_COLUMN',
  'DATABRICKS_PATIENT_METRICS_PRACTICE_ID_COLUMN',
  'DATABRICKS_PATIENT_METRICS_PROVIDER_ID_COLUMN',
  'DATABRICKS_PATIENT_METRICS_PATIENT_ID_COLUMN',
  'DATABRICKS_PATIENT_METRICS_DATE_COLUMN',
] as const;

const CACHE_DRIVERS = new Set(['memory', 'redis']);
const EMAIL_DRIVERS = new Set(['disabled', 'resend']);

export function validateEnvironment(
  config: EnvironmentVariables,
): EnvironmentVariables {
  const errors: string[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!hasValue(config[key])) {
      errors.push(`${key} is required`);
    }
  }

  validateOptionalUrl(config.SUPABASE_URL, 'SUPABASE_URL', errors);
  validateOptionalPostgresUrl(config.DATABASE_URL, 'DATABASE_URL', errors);
  validateOptionalPostgresUrl(config.DIRECT_URL, 'DIRECT_URL', errors);

  const cacheDriver = config.CACHE_DRIVER ?? 'memory';
  if (!CACHE_DRIVERS.has(cacheDriver)) {
    errors.push('CACHE_DRIVER must be memory or redis');
  }

  if (cacheDriver === 'redis') {
    if (!hasValue(config.REDIS_URL)) {
      errors.push('REDIS_URL is required when CACHE_DRIVER=redis');
    } else {
      validateOptionalUrl(config.REDIS_URL, 'REDIS_URL', errors);
    }
  }

  const emailDriver = config.EMAIL_DRIVER ?? 'disabled';
  if (!EMAIL_DRIVERS.has(emailDriver)) {
    errors.push('EMAIL_DRIVER must be disabled or resend');
  }

  if (emailDriver === 'resend') {
    if (!hasValue(config.RESEND_API_KEY)) {
      errors.push('RESEND_API_KEY is required when EMAIL_DRIVER=resend');
    }

    if (!hasValue(config.EMAIL_FROM)) {
      errors.push('EMAIL_FROM is required when EMAIL_DRIVER=resend');
    }
  }

  validateOptionalUrl(config.RESEND_API_URL, 'RESEND_API_URL', errors);
  validateOptionalUrl(config.INVITE_ACCEPT_URL, 'INVITE_ACCEPT_URL', errors);

  for (const key of OPTIONAL_INTEGER_KEYS) {
    validateOptionalNonNegativeInteger(config[key], key, errors);
  }

  for (const key of OPTIONAL_DATABRICKS_IDENTIFIER_KEYS) {
    validateOptionalSqlIdentifierPath(config[key], key, errors);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return config;
}

function hasValue(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

function validateOptionalUrl(
  value: string | undefined,
  key: string,
  errors: string[],
) {
  if (!hasValue(value)) {
    return;
  }

  try {
    new URL(value);
  } catch {
    errors.push(`${key} must be a valid URL`);
  }
}

function validateOptionalPostgresUrl(
  value: string | undefined,
  key: string,
  errors: string[],
) {
  if (!hasValue(value)) {
    return;
  }

  try {
    const url = new URL(value);
    if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
      errors.push(`${key} must use postgres or postgresql protocol`);
    }
  } catch {
    errors.push(`${key} must be a valid Postgres URL`);
  }
}

function validateOptionalNonNegativeInteger(
  value: string | undefined,
  key: string,
  errors: string[],
) {
  if (!hasValue(value)) {
    return;
  }

  if (!/^\d+$/.test(value)) {
    errors.push(`${key} must be a non-negative integer`);
  }
}

function validateOptionalSqlIdentifierPath(
  value: string | undefined,
  key: string,
  errors: string[],
) {
  if (!hasValue(value)) {
    return;
  }

  if (!/^[A-Za-z0-9_.$`]+$/.test(value)) {
    errors.push(`${key} must be a safe SQL identifier or identifier path`);
  }
}
