import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { applyMigrations, initDb } from '../db/database.js';
import {
  getAllStudyGroups,
  getStudentStudyGroups,
  joinStudyGroup,
  StudyGroupError
} from './studyGroupService.js';

function createMembershipDb() {
  const db = new DatabaseSync(':memory:');
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
    VALUES ('Open Group', 'Mathematics', 'An open group', 1);
    INSERT INTO study_groups (name, subject, description, creator_id)
    VALUES ('Closed Group', 'Computer Science', 'A closed group', 1);
  `);
  applyMigrations(db);
  db.prepare('UPDATE study_groups SET is_open = 0 WHERE id = 2').run();
  return db;
}

function withMembershipDb(callback) {
  const db = createMembershipDb();
  try {
    callback(db);
  } finally {
    db.close();
  }
}

test('AC-15 & AC-16: retrieve study groups or handle empty state', () => {
  initDb();
  const groups = getAllStudyGroups();
  assert.ok(Array.isArray(groups), 'Should return an array of groups');
  // Seeder seeded at least 2 groups
  assert.ok(groups.length >= 2, 'Should have seeded groups');
  assert.ok(groups[0].name, 'Group should have a name');
  assert.ok(groups[0].subject, 'Group should have a subject');
});

test('AC-17 joining an open group creates one membership visible in the student group list', () => {
  withMembershipDb((db) => {
    const group = joinStudyGroup(1, 1, db);
    assert.strictEqual(group.id, 1);
    assert.strictEqual(group.membershipId, 1);
    assert.deepStrictEqual(getStudentStudyGroups(1, db).map((item) => item.id), [1]);
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 1);
  });
});

test('AC-18 joining a group again is refused without creating another membership', () => {
  withMembershipDb((db) => {
    joinStudyGroup(1, 1, db);
    assert.throws(
      () => joinStudyGroup(1, 1, db),
      (error) => error instanceof StudyGroupError && error.code === 'ALREADY_MEMBER'
    );
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 1);
  });

  withMembershipDb((db) => {
    const concurrentDatabase = {
      prepare(sql) {
        if (sql.includes('INSERT INTO memberships')) {
          return {
            run(studentId, groupId) {
              db.prepare(sql).run(studentId, groupId);
              throw new Error('UNIQUE constraint failed: memberships.student_id, memberships.study_group_id');
            }
          };
        }
        return db.prepare(sql);
      }
    };
    assert.throws(
      () => joinStudyGroup(1, 1, concurrentDatabase),
      (error) => error instanceof StudyGroupError && error.code === 'ALREADY_MEMBER'
    );
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 1);
  });
});

test('AC-19 joining a closed group is refused without creating a membership', () => {
  withMembershipDb((db) => {
    assert.throws(
      () => joinStudyGroup(1, 2, db),
      (error) => error instanceof StudyGroupError && error.code === 'GROUP_CLOSED'
    );
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 0);
  });
});

test('AC-20 joining a nonexistent group is refused without creating a membership', () => {
  withMembershipDb((db) => {
    assert.throws(
      () => joinStudyGroup(1, 999, db),
      (error) => error instanceof StudyGroupError && error.code === 'GROUP_NOT_FOUND'
    );
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 0);
  });
});
