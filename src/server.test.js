import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.STUDY_GROUP_DB_PATH = ':memory:';
const [{ default: app, createApp }, { initDb, getDb }, { registerUser }] = await Promise.all([
  import('./server.js'),
  import('./db/database.js'),
  import('./services/authService.js')
]);

async function withServer(callback, appToServe = app) {
  initDb();
  getDb().prepare('DELETE FROM memberships').run();
  getDb().prepare('UPDATE study_groups SET is_open = 1').run();

  const server = http.createServer(appToServe);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function signIn(baseUrl, email = 'student@example.com', password = 'securePassword123') {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return { response: loginResponse, data: await loginResponse.json() };
}

test('API endpoints: login (AC-14) and get study groups (AC-15, AC-16)', async () => {
  await withServer(async (baseUrl) => {
    const { response: loginResponse, data: loginData } = await signIn(baseUrl);
    assert.strictEqual(loginResponse.status, 200);
    assert.strictEqual(loginData.success, true);
    assert.ok(loginData.user);
    assert.ok(loginData.accessToken);

    const groupsResponse = await fetch(`${baseUrl}/api/study-groups`);
    const groups = await groupsResponse.json();
    assert.strictEqual(groupsResponse.status, 200);
    assert.ok(Array.isArray(groups));
    assert.ok(groups.length >= 2);
    assert.ok(groups[0].name);
    assert.ok(groups[0].subject);
  });
});

test('AC-17 an authenticated student joins an open group and creates one membership', async () => {
  await withServer(async (baseUrl) => {
    const { data: login } = await signIn(baseUrl);
    const response = await fetch(`${baseUrl}/api/study-groups/1/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${login.accessToken}` }
    });
    const membership = await response.json();

    assert.strictEqual(response.status, 201);
    assert.strictEqual(membership.id, 1);
    assert.strictEqual(membership.membershipId, 1);
    assert.strictEqual(getDb().prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 1);
  });
});

test('AC-18 joining a group twice returns 409 without a duplicate membership', async () => {
  await withServer(async (baseUrl) => {
    const { data: login } = await signIn(baseUrl);
    const headers = { Authorization: `Bearer ${login.accessToken}` };
    await fetch(`${baseUrl}/api/study-groups/1/join`, { method: 'POST', headers });
    const response = await fetch(`${baseUrl}/api/study-groups/1/join`, { method: 'POST', headers });

    assert.strictEqual(response.status, 409);
    assert.strictEqual(getDb().prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 1);
  });
});

test('AC-19 joining a closed group returns 409 without creating a membership', async () => {
  await withServer(async (baseUrl) => {
    getDb().prepare('UPDATE study_groups SET is_open = 0 WHERE id = 2').run();
    const { data: login } = await signIn(baseUrl);
    const response = await fetch(`${baseUrl}/api/study-groups/2/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${login.accessToken}` }
    });

    assert.strictEqual(response.status, 409);
    assert.strictEqual(getDb().prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 0);
  });
});

test('AC-20 joining a nonexistent group returns 404 without creating a membership', async () => {
  await withServer(async (baseUrl) => {
    const { data: login } = await signIn(baseUrl);
    const response = await fetch(`${baseUrl}/api/study-groups/999/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${login.accessToken}` }
    });

    assert.strictEqual(response.status, 404);
    assert.strictEqual(getDb().prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 0);
  });
});

test('AC-21 joining without authentication returns 401 without creating a membership', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/study-groups/1/join`, { method: 'POST' });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(getDb().prepare('SELECT COUNT(*) AS count FROM memberships').get().count, 0);
  });
});

test('joining with an invalid study group ID returns 400', async () => {
  await withServer(async (baseUrl) => {
    const { data: login } = await signIn(baseUrl);
    const response = await fetch(`${baseUrl}/api/study-groups/invalid/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${login.accessToken}` }
    });

    assert.strictEqual(response.status, 400);
  });
});

test('PATCH without a session returns 401 before calling the update service', async () => {
  let serviceCalled = false;
  const unauthenticatedTestApp = createApp({
    updateStudyGroup() {
      serviceCalled = true;
      throw new Error('Update service should not be called');
    }
  });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/study-groups/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated group' })
    });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(serviceCalled, false);
  }, unauthenticatedTestApp);
});

test('PATCH by a signed-in non-owner returns 403 from the update service', async () => {
  await withServer(async (baseUrl) => {
    const email = `non-owner-${Date.now()}@example.com`;
    const password = 'securePassword123';
    registerUser(email, password);
    const { data: login } = await signIn(baseUrl, email, password);
    const response = await fetch(`${baseUrl}/api/study-groups/1`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${login.accessToken}`
      },
      body: JSON.stringify({ name: 'Updated group' })
    });

    assert.strictEqual(response.status, 403);
    assert.strictEqual(
      getDb().prepare('SELECT name FROM study_groups WHERE id = 1').get().name,
      'Math Wizards'
    );
  });
});
