import test from 'node:test';
import assert from 'node:assert';
import { initDb, getDb } from './database.js';
import fs from 'fs';
import path from 'path';

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
