import express from 'express';
import path from 'path';
import { initDb } from './db/database.js';
import { authenticateUser } from './services/authService.js';
import { getAllStudyGroups } from './services/studyGroupService.js';

initDb();

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
  res.json({ success: true, user });
});

// API: Get study groups (AC-15, AC-16)
app.get('/api/study-groups', (req, res) => {
  const groups = getAllStudyGroups();
  res.json(groups);
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
