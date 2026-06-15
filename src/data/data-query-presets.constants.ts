export const DATA_QUERY_PRESET_DATA_SETS = [
  'claims',
  'providers',
  'patientMetrics',
] as const;

export type DataQueryPresetDataSet =
  (typeof DATA_QUERY_PRESET_DATA_SETS)[number];
