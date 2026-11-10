import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from './server.js';
import { initDb } from './db/database.js';

test('API endpoints: login (AC-14) and get study groups (AC-15, AC-16)', async () => {
  initDb();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Test login success (AC-14)
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.com', password: 'securePassword123' })
    });
    const loginData = await loginResponse.json();
    assert.strictEqual(loginResponse.status, 200);
    assert.strictEqual(loginData.success, true);
    assert.ok(loginData.user);

    // 2. Test get study groups (AC-15)
    const groupsResponse = await fetch(`${baseUrl}/api/study-groups`);
    const groups = await groupsResponse.json();
    assert.strictEqual(groupsResponse.status, 200);
    assert.ok(Array.isArray(groups));
    assert.ok(groups.length >= 2);
    assert.ok(groups[0].name);
    assert.ok(groups[0].subject);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
