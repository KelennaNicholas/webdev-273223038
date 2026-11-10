import { getDb } from '../db/database.js';
import crypto from 'node:crypto';

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
