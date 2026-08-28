import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface DatabaseConnection {
  db: Database.Database;
  close: () => void;
}

export const openDatabase = (dbPath: string): DatabaseConnection => {
  // If the path is a file, ensure the directory exists
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  return {
    db,
    close: () => db.close(),
  };
};
