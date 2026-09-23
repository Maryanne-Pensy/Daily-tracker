const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');
const { getMongoStatus } = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_daily_tracker_jwt_key_2026';

// Public registration is intentionally disabled for this single-user app.
router.post('/register', async (req, res) => {
  res.status(403).json({ error: 'Public registration is disabled for this private tracker.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const user = await storage.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. No account found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userId = user._id ? user._id.toString() : user.id;

    const token = jwt.sign(
      { userId, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Sign in successful.',
      token,
      user: {
        id: userId,
        username: user.username,
        email: user.email,
        streak: user.streak || { count: 0, lastCompletedDate: null },
        coachSettings: user.coachSettings || { personality: 'sergeant', voiceEnabled: false }
      },
      dbStatus: getMongoStatus()
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await storage.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json({
      user: {
        id: req.user.userId,
        username: user.username,
        email: user.email,
        streak: user.streak || { count: 0, lastCompletedDate: null },
        coachSettings: user.coachSettings || { personality: 'sergeant', voiceEnabled: false }
      },
      dbStatus: getMongoStatus()
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// PUT /api/auth/settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    // Merge so changing one setting (e.g. personality) doesn't wipe the others.
    const user = await storage.findUserById(req.user.userId);
    const current = (user && user.coachSettings) || {};
    const incoming = req.body.coachSettings || {};
    const coachSettings = {
      personality: incoming.personality || current.personality || 'sergeant',
      voiceEnabled: incoming.voiceEnabled !== undefined ? Boolean(incoming.voiceEnabled) : Boolean(current.voiceEnabled),
      rageLevelOverride: current.rageLevelOverride === undefined ? null : current.rageLevelOverride
    };
    const updated = await storage.updateUser(req.user.userId, { coachSettings });
    res.json({ success: true, coachSettings: updated ? updated.coachSettings : coachSettings });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

module.exports = router;
