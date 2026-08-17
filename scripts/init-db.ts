import { getDefaultDatabase } from '../database/sqlite';
import { initializeSchema } from '../database/schema';

console.log('Initializing database schema...');
const conn = getDefaultDatabase();
try {
  initializeSchema(conn);
  console.log('Database schema initialized successfully.');
} catch (error) {
  console.error('Failed to initialize database schema:', error);
  process.exit(1);
} finally {
  conn.close();
}
