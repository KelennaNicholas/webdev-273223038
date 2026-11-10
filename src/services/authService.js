import { getDb } from '../db/database.js';
import crypto from 'node:crypto';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') {
    return false;
  }
  const [salt, key, extra] = storedHash.split(':');
  if (extra !== undefined || !/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{128}$/.test(key)) {
    return false;
  }
  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (hashBuffer.length !== keyBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashBuffer, keyBuffer);
}

export function registerUser(email, password) {
  const db = getDb();
  const passwordHash = hashPassword(password);
  try {
    const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    const result = stmt.run(email, passwordHash);
    return { id: result.lastInsertRowid, email };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('Email already registered');
    }
    throw err;
  }
}

export function authenticateUser(email, password) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email);
  if (!user) {
    return null;
  }
  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return null;
  }
  return { id: user.id, email: user.email };
}

export function createUserSession(userId, database = getDb(), now = Date.now()) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = now + SESSION_DURATION_MS;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  database.prepare(`
    INSERT INTO user_sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, tokenHash, expiresAt);
  return { token, expiresAt };
}

export function authenticateSession(token, database = getDb(), now = Date.now()) {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
    return null;
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = database.prepare(`
    SELECT users.id, users.email
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > ?
  `).get(tokenHash, now);
  return user || null;
}
