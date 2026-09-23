const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');
const { buildToday } = require('../services/today');
const { todayStr } = require('../utils/dates');

const router = express.Router();

const TEXT_FIELDS = ['mission', 'productWorkNote', 'learningNote', 'notes'];
const BOOL_FIELDS = ['missionDone', 'productWork', 'learningDone'];
const NEEDLE_CATEGORIES = ['build', 'customers', 'validation'];

function cleanChecklist(list) {
  return (Array.isArray(list) ? list : []).slice(0, 20).map(i => ({
    label: String(i.label || '').slice(0, 200),
    tag: ['product', 'customers'].includes(i.tag) ? i.tag : '',
    done: Boolean(i.done)
  }));
}

function cleanNeedle(list) {
  return (Array.isArray(list) ? list : []).slice(0, 50).map(n => ({
    category: NEEDLE_CATEGORIES.includes(n.category) ? n.category : 'build',
    text: String(n.text || '').slice(0, 300),
    done: Boolean(n.done)
  }));
}

function todayResponse(data) {
  const { user, ...rest } = data;
  return rest;
}

// GET /api/tracker/today
router.get('/today', authMiddleware, async (req, res) => {
  try {
    res.json(todayResponse(await buildToday(req.user.userId)));
  } catch (err) {
    console.error('Tracker today error:', err);
    res.status(500).json({ error: 'Failed to fetch today.' });
  }
});

// PUT /api/tracker/today — save any subset of today's fields
router.put('/today', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const current = await buildToday(userId);
    const updates = {};
    TEXT_FIELDS.forEach(f => { if (typeof req.body[f] === 'string') updates[f] = req.body[f].slice(0, 2000); });
    BOOL_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = Boolean(req.body[f]); });
    if (req.body.needle !== undefined) updates.needle = cleanNeedle(req.body.needle);
    if (req.body.tradeiqChecklist !== undefined) updates.tradeiqChecklist = cleanChecklist(req.body.tradeiqChecklist);
    if (req.body.slotlyChecklist !== undefined) {
      updates.slotlyChecklist = cleanChecklist(req.body.slotlyChecklist);
      // Label edits become the default checklist for future days.
      const labels = updates.slotlyChecklist.map(i => ({ label: i.label, tag: i.tag }));
      const oldLabels = (current.day.slotlyChecklist || []).map(i => ({ label: i.label, tag: i.tag }));
      if (JSON.stringify(labels) !== JSON.stringify(oldLabels)) {
        const preferences = { ...((current.user && current.user.preferences) || {}), slotlyChecklist: labels };
        await storage.updateUser(userId, { preferences });
      }
    }

    await storage.update('progress', userId, current.day._id, updates);
    res.json(todayResponse(await buildToday(userId)));
  } catch (err) {
    console.error('Tracker update error:', err);
    res.status(500).json({ error: 'Failed to save today.' });
  }
});

// POST /api/tracker/reset — uncheck everything for today (text is kept)
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { day } = await buildToday(userId);
    const uncheck = list => (list || []).map(i => ({ ...i, done: false }));
    await storage.update('progress', userId, day._id, {
      missionDone: false,
      productWork: false,
      learningDone: false,
      slotlyChecklist: uncheck(day.slotlyChecklist),
      needle: uncheck(day.needle),
      tradeiqChecklist: uncheck(day.tradeiqChecklist)
    });
    res.json(todayResponse(await buildToday(userId)));
  } catch (err) {
    console.error('Tracker reset error:', err);
    res.status(500).json({ error: 'Failed to reset today.' });
  }
});

// GET /api/tracker/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { streak } = await buildToday(userId);
    const days = await storage.find('progress', userId, {}, { date: -1 });
    const history = days.filter(d => (d.schemaVersion || 1) >= 2).slice(0, 60).map(d => ({
      date: d.date,
      score: d.score || 0,
      maxScore: d.maxScore || 5,
      mainMoved: Boolean(d.isCompleted),
      mission: d.mission || '',
      needleDone: (d.needle || []).filter(n => n.done).map(n => n.text),
      isToday: d.date === todayStr()
    }));
    res.json({ history, streak });
  } catch (err) {
    console.error('Tracker history error:', err);
    res.status(500).json({ error: 'Failed to retrieve history.' });
  }
});

module.exports = router;
