const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');

const router = express.Router();

const BLOCKS = [
  {
    id: 0,
    time: "Block 1 · 45–60 min",
    title: "Research 3 clients",
    desc: "Pull store profile, visible email gaps, likely customer for each."
  },
  {
    id: 1,
    time: "Block 2 · 90–120 min",
    title: "Write 3 email samples",
    desc: "Draft yourself first — slow and rough beats fast and borrowed."
  },
  {
    id: 2,
    time: "Block 3 · 30–45 min",
    title: "Editing pass",
    desc: "Bring drafts in for review. Revise before moving on."
  },
  {
    id: 3,
    time: "Block 4 · 45–60 min",
    title: "Send outreach",
    desc: "Pitch with the finished samples attached."
  },
  {
    id: 4,
    time: "Block 5 · 60–90 min",
    title: "Content — script + edit",
    desc: "Write your own first draft. Then editing pass, then visuals."
  },
  {
    id: 5,
    time: "Block 6 · 60–90 min",
    title: "Trade IQ",
    desc: "One real move forward — feedback, a fix, or outreach.",
    protectedNote: "PROTECTED — do not skip for overrun"
  }
];

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getYesterdayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// GET /api/tracker/today
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = getTodayStr();
    const user = await storage.findUserById(req.user.userId);
    const progress = await storage.getTodayProgress(req.user.userId, today);
    const calendar = await storage.getContentCalendar(req.user.userId);

    const todayContent = calendar.find(c => c.date === today);
    const upcomingContent = calendar.find(c => c.date > today && c.status !== 'posted');

    res.json({
      date: today,
      blocks: BLOCKS,
      checked: progress.checked || [false, false, false, false, false, false],
      completedCount: (progress.checked || []).filter(Boolean).length,
      streak: (user && user.streak) ? user.streak : { count: 0, lastCompletedDate: null },
      todayContent: todayContent || null,
      upcomingContent: upcomingContent || null
    });
  } catch (err) {
    console.error('Tracker today error:', err);
    res.status(500).json({ error: 'Failed to fetch today progress.' });
  }
});

// POST /api/tracker/toggle
router.post('/toggle', authMiddleware, async (req, res) => {
  try {
    const { blockIndex, checkedState } = req.body;
    const today = getTodayStr();

    if (blockIndex === undefined || blockIndex < 0 || blockIndex >= BLOCKS.length) {
      return res.status(400).json({ error: 'Invalid block index.' });
    }

    const progress = await storage.getTodayProgress(req.user.userId, today);
    const currentChecked = [...(progress.checked || [false, false, false, false, false, false])];
    
    // Toggle or set explicitly
    if (typeof checkedState === 'boolean') {
      currentChecked[blockIndex] = checkedState;
    } else {
      currentChecked[blockIndex] = !currentChecked[blockIndex];
    }

    const updatedProgress = await storage.updateTodayProgress(req.user.userId, today, currentChecked);

    // Handle Streak Updates
    const user = await storage.findUserById(req.user.userId);
    let streak = (user && user.streak) ? { ...user.streak } : { count: 0, lastCompletedDate: null };
    const allDone = currentChecked.every(Boolean);

    if (allDone && streak.lastCompletedDate !== today) {
      const yesterday = getYesterdayStr(today);
      if (streak.lastCompletedDate === yesterday) {
        streak.count += 1;
      } else {
        streak.count = 1;
      }
      streak.lastCompletedDate = today;
      await storage.updateUser(req.user.userId, { streak });
    }

    res.json({
      success: true,
      checked: updatedProgress.checked,
      completedCount: updatedProgress.completedCount,
      isCompleted: updatedProgress.isCompleted,
      streak
    });
  } catch (err) {
    console.error('Tracker toggle error:', err);
    res.status(500).json({ error: 'Failed to update progress.' });
  }
});

// POST /api/tracker/reset
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    const today = getTodayStr();
    const resetChecked = [false, false, false, false, false, false];
    const updated = await storage.updateTodayProgress(req.user.userId, today, resetChecked);
    res.json({
      success: true,
      message: 'Today progress reset.',
      checked: updated.checked,
      completedCount: 0
    });
  } catch (err) {
    console.error('Tracker reset error:', err);
    res.status(500).json({ error: 'Failed to reset progress.' });
  }
});

// GET /api/tracker/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await storage.getUserProgressHistory(req.user.userId);
    const user = await storage.findUserById(req.user.userId);
    res.json({
      history,
      streak: (user && user.streak) ? user.streak : { count: 0, lastCompletedDate: null }
    });
  } catch (err) {
    console.error('Tracker history error:', err);
    res.status(500).json({ error: 'Failed to retrieve history.' });
  }
});

module.exports = router;
