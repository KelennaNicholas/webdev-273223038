import express from 'express';
import path from 'path';
import { initDb } from './db/database.js';
import { authenticateSession, authenticateUser, createUserSession } from './services/authService.js';
import {
  getAllStudyGroups,
  joinStudyGroup,
  StudyGroupError,
  updateStudyGroup as updateStudyGroupService
} from './services/studyGroupService.js';

initDb();

function requireAuthentication(req, res, next) {
  const authorization = req.get('authorization');
  const match = authorization?.match(/^Bearer ([0-9a-f]{64})$/);
  const user = match ? authenticateSession(match[1]) : null;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = user;
  next();
}

export function createApp({ updateStudyGroup = updateStudyGroupService } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve('src/public')));

  // API: Login (AC-14)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const session = createUserSession(user.id);
    res.json({ success: true, user, accessToken: session.token, expiresAt: session.expiresAt });
  });

  // API: Get study groups (AC-15, AC-16)
  app.get('/api/study-groups', (req, res) => {
    const groups = getAllStudyGroups();
    res.json(groups);
  });

  app.post('/api/study-groups/:groupId/join', requireAuthentication, (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.groupId) || !Number.isSafeInteger(Number(req.params.groupId))) {
      return res.status(400).json({ error: 'A valid study group ID is required' });
    }

    try {
      const membership = joinStudyGroup(req.user.id, Number(req.params.groupId));
      res.status(201).json(membership);
    } catch (error) {
      if (error instanceof StudyGroupError) {
        if (error.code === 'GROUP_NOT_FOUND') {
          return res.status(404).json({ error: error.message });
        }
        if (error.code === 'ALREADY_MEMBER' || error.code === 'GROUP_CLOSED') {
          return res.status(409).json({ error: error.message });
        }
      }
      next(error);
    }
  });

  app.patch('/api/study-groups/:groupId', requireAuthentication, (req, res, next) => {
    if (!/^[1-9]\d*$/.test(req.params.groupId) || !Number.isSafeInteger(Number(req.params.groupId))) {
      return res.status(400).json({ error: 'A valid study group ID is required' });
    }

    try {
      const group = updateStudyGroup(req.user.id, Number(req.params.groupId), req.body);
      res.json(group);
    } catch (error) {
      if (error instanceof StudyGroupError) {
        if (error.code === 'GROUP_NOT_FOUND') {
          return res.status(404).json({ error: error.message });
        }
        if (error.code === 'FORBIDDEN') {
          return res.status(403).json({ error: error.message });
        }
        if (error.code === 'INVALID_UPDATE') {
          return res.status(400).json({ error: error.message });
        }
      }
      next(error);
    }
  });

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) {
      return next(error);
    }
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message });
  });

  return app;
}

const app = createApp();

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
