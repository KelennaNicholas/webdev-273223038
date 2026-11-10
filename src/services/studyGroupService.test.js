import test from 'node:test';
import assert from 'node:assert';
import { initDb } from '../db/database.js';
import { getAllStudyGroups } from './studyGroupService.js';

test('AC-15 & AC-16: retrieve study groups or handle empty state', () => {
  initDb();
  const groups = getAllStudyGroups();
  assert.ok(Array.isArray(groups), 'Should return an array of groups');
  // Seeder seeded at least 2 groups
  assert.ok(groups.length >= 2, 'Should have seeded groups');
  assert.ok(groups[0].name, 'Group should have a name');
  assert.ok(groups[0].subject, 'Group should have a subject');
});
