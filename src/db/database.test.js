import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { applyMigrations, initDb, getDb } from './database.js';

test('database initializes and seeds correctly', () => {
  // Use a test db or main db
  initDb();
  const db = getDb();

  const users = db.prepare('SELECT * FROM users').all();
  assert.ok(users.length > 0, 'Users table should be seeded');

  const groups = db.prepare('SELECT * FROM study_groups').all();
  assert.ok(groups.length >= 2, 'Study groups table should have at least 2 seeded groups');
  assert.strictEqual(groups[0].name, 'Math Wizards');
  assert.strictEqual(groups[1].name, 'Code Crafters');
});

test('database migration creates unique memberships and defaults groups to open', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      );
      CREATE TABLE study_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        creator_id INTEGER,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      );
      INSERT INTO users (email, password_hash) VALUES ('student@example.com', 'test-hash');
      INSERT INTO study_groups (name, subject, description, creator_id)
      VALUES ('Math Group', 'Mathematics', 'Test group', 1);
    `);

    applyMigrations(db);
    applyMigrations(db);

    assert.strictEqual(db.prepare('SELECT is_open FROM study_groups WHERE id = 1').get().is_open, 1);
    db.prepare('INSERT INTO memberships (student_id, study_group_id) VALUES (1, 1)').run();
    assert.throws(
      () => db.prepare('INSERT INTO memberships (student_id, study_group_id) VALUES (1, 1)').run(),
      /UNIQUE constraint failed/
    );
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 1);
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 1);
  } finally {
    db.close();
  }
});
