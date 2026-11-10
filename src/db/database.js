import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dbDir = path.resolve('data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'app.db');
const db = new DatabaseSync(dbPath);
const seededPasswordHash = '737475647967726f7570737365656421:faadcb76da7362749289bd2adf0f0c52cb358d4735909218a2475d9d09514abf26fe7acc5903e579592cbc894a4418e716fc5d9f601534522afaa8de3eb47b76';

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      creator_id INTEGER,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );
  `);

  // Seed initial data if tables are empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    const userResult = insertUser.run('student@example.com', seededPasswordHash);
    const userId = userResult.lastInsertRowid;

    const insertGroup = db.prepare('INSERT INTO study_groups (name, subject, description, creator_id) VALUES (?, ?, ?, ?)');
    insertGroup.run('Math Wizards', 'Mathematics', 'Calculus and linear algebra study group', userId);
    insertGroup.run('Code Crafters', 'Computer Science', 'Algorithms and web development practice', userId);
  }

  db.prepare(`
    UPDATE users
    SET password_hash = ?
    WHERE email = ? AND password_hash = ?
  `).run(seededPasswordHash, 'student@example.com', 'hashed_password_123');
}

export function getDb() {
  return db;
}
