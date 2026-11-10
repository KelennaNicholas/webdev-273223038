import { getDb } from '../db/database.js';

export function getAllStudyGroups() {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, subject, description FROM study_groups');
  return stmt.all();
}
