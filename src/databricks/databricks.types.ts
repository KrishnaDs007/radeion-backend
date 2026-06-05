export type DatabricksStatementRequest = {
  statement: string;
  waitTimeout?: string;
  onWaitTimeout?: 'CONTINUE' | 'CANCEL';
};

export type DatabricksStatementResponse = Record<string, unknown>;
