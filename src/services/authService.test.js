import test from 'node:test';
import assert from 'node:assert';
import { initDb, getDb } from '../db/database.js';
import { registerUser, authenticateUser } from './authService.js';

test('AC-1 & sign-in: register and authenticate user successfully', () => {
  initDb();
  const email = `test_${Date.now()}@example.com`;
  const password = 'securePassword123';

  const user = registerUser(email, password);
  assert.ok(user.id, 'Registered user should have an ID');
  assert.strictEqual(user.email, email);

  const authUser = authenticateUser(email, password);
  assert.ok(authUser, 'Authentication should succeed with correct credentials');
  assert.strictEqual(authUser.email, email);

  const failedAuth = authenticateUser(email, 'wrongPassword');
  assert.strictEqual(failedAuth, null, 'Authentication should fail with incorrect password');
});
