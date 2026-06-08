export type DatabricksStatementRequest = {
  statement: string;
  waitTimeout?: string;
  onWaitTimeout?: 'CONTINUE' | 'CANCEL';
  fetchAllResultChunks?: boolean;
};

export type DatabricksStatementState =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'CLOSED';

export type DatabricksStatementResult = {
  next_chunk_index?: number;
  next_chunk_internal_link?: string;
  [key: string]: unknown;
};

export type DatabricksStatementResponse = {
  statement_id?: string;
  status?: {
    state?: DatabricksStatementState;
    error?: {
      message?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  result?: DatabricksStatementResult;
  result_chunks?: DatabricksStatementResult[];
  [key: string]: unknown;
};
