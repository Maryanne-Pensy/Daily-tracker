const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');

const router = express.Router();

// GET /api/content
router.get('/', authMiddleware, async (req, res) => {
  try {
    const calendar = await storage.getContentCalendar(req.user.userId);
    res.json({ calendar });
  } catch (err) {
    console.error('Fetch calendar error:', err);
    res.status(500).json({ error: 'Failed to retrieve content calendar.' });
  }
});

// PUT /api/content/:day
router.put('/:day', authMiddleware, async (req, res) => {
  try {
    const day = parseInt(req.params.day);
    const { status, script, notes, title } = req.body;

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (script !== undefined) updates.script = script;
    if (notes !== undefined) updates.notes = notes;
    if (title !== undefined) updates.title = title;

    const updated = await storage.updateContentCalendarDay(req.user.userId, day, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Day not found in calendar.' });
    }

    res.json({ success: true, item: updated });
  } catch (err) {
    console.error('Update calendar day error:', err);
    res.status(500).json({ error: 'Failed to update calendar day.' });
  }
});

module.exports = router;
