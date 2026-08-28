import { openDatabase, type DatabaseConnection } from '../database/sqlite';

export interface DatabaseScriptDependencies {
  readonly openDatabase?: typeof openDatabase;
  readonly logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

export const withDatabase = <T>(
  databasePath: string,
  operation: (connection: DatabaseConnection) => T,
  open: typeof openDatabase = openDatabase,
): T => {
  const connection = open(databasePath);
  try {
    return operation(connection);
  } finally {
    connection.close();
  }
};

export const withDatabaseAsync = async <T>(
  databasePath: string,
  operation: (connection: DatabaseConnection) => Promise<T>,
  open: typeof openDatabase = openDatabase,
): Promise<T> => {
  const connection = open(databasePath);
  try {
    return await operation(connection);
  } finally {
    connection.close();
  }
};
