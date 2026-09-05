import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/current', (req, res) => {
  try {
    const user = db.queryOne('SELECT id, username, full_name, role, avatar_initials FROM users LIMIT 1');
    if (!user) {
      return res.status(404).json({ error: 'No user found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', (req, res) => {
  try {
    const users = db.queryAll('SELECT id, username, full_name, role, avatar_initials FROM users');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { userId } = req.body;
    let user;
    if (userId) {
      user = db.queryOne('SELECT id, username, full_name, role, avatar_initials FROM users WHERE id = ?', [userId]);
    } else {
      user = db.queryOne('SELECT id, username, full_name, role, avatar_initials FROM users LIMIT 1');
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid user selection' });
    }
    res.json({ user, token: `token_${user.id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
