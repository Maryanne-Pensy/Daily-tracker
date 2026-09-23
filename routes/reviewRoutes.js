const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');
const { pick } = require('./crud');
const { prospectStats, scoreDay, videosPostedOn } = require('../services/today');
const { todayStr, addDays, dayType, weekStart, toDateStr } = require('../utils/dates');

const router = express.Router();
router.use(authMiddleware);

const ANSWER_FIELDS = ['needleMoved', 'nextWeekOutcome', 'biggestCustomerLearning', 'bestContent', 'sales',
  'mostUsefulLesson', 'tradeiqNotes', 'stayedFocused', 'notes'];

const inRange = (date, start, end) => Boolean(date) && date >= start && date <= end;

// GET /api/review?date=YYYY-MM-DD — the week (Mon–Sun) containing that date
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    await storage.ensureSetup(userId);
    const today = todayStr();
    const ref = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : today;
    const start = weekStart(ref);
    const end = addDays(start, 6);

    const [progress, content, leads, projects, learning, products, answers] = await Promise.all([
      storage.find('progress', userId),
      storage.find('calendar', userId),
      storage.find('leads', userId, { kind: 'clinic' }),
      storage.find('projects', userId),
      storage.find('learning', userId, {}, { createdAt: 1 }),
      storage.find('products', userId),
      storage.findOne('reviews', userId, { weekStart: start })
    ]);

    const days = progress
      .filter(d => (d.schemaVersion || 1) >= 2 && inRange(d.date, start, end))
      .map(d => ({ ...d, s: scoreDay(d, dayType(d.date), videosPostedOn(content, d.date)) }));
    const weekdays = days.filter(d => dayType(d.date) === 'weekday');
    const needleDone = days.flatMap(d => (d.needle || []).filter(n => n.done));
    const tradeiq = projects.find(p => p.key === 'tradeiq') || {};
    const track = learning[0] || {};
    const parked = projects.filter(p => p.kind === 'parked');

    res.json({
      weekStart: start,
      weekEnd: end,
      isCurrentWeek: inRange(today, start, end),
      stats: {
        slotly: {
          productDays: days.filter(d => d.s.slotlyProduct).length,
          customerDays: days.filter(d => d.s.slotlyCustomers).length,
          buildActions: needleDone.filter(n => n.category === 'build').length,
          customerActions: needleDone.filter(n => n.category !== 'build').length,
          contactedThisWeek: leads.filter(l => inRange(l.dateContacted, start, end)).length,
          conversationsThisWeek: leads.filter(l => inRange(l.lastContact, start, end)).length,
          pipeline: prospectStats(leads, today),
          needleList: needleDone.map(n => n.text).filter(Boolean)
        },
        products: {
          productWorkDays: days.filter(d => d.productWork).length,
          productsTouched: products.filter(p => inRange(toDateStr(p.updatedAt), start, end)).map(p => p.name),
          videosPosted: content.filter(c => c.stream === 'products' && inRange(c.postedDate, start, end)).length,
          videoTarget: 14,
          videosPlanned: content.filter(c => c.stream === 'products' && c.status !== 'posted' &&
            inRange(c.date, addDays(end, 1), addDays(end, 7))).length,
          slotlyPostsPosted: content.filter(c => c.stream === 'slotly' && inRange(c.postedDate, start, end)).length
        },
        tradeiq: {
          sessions: days.filter(d => d.s.tradeiq).length,
          milestone: tradeiq.milestone || '',
          nextTask: tradeiq.nextTask || '',
          progress: tradeiq.progress || 0
        },
        learning: {
          name: track.name || 'Learning',
          learningDays: days.filter(d => d.learningDone).length,
          lessonsAdded: (track.lessons || []).filter(l => inRange(l.date, start, end)).length,
          modulesCompleted: track.modulesCompleted || 0,
          totalModules: track.totalModules || 0
        },
        focus: {
          newIdeas: parked.filter(p => inRange(p.dateAdded, start, end)).length,
          parkedTotal: parked.length,
          slotlyWeekdays: weekdays.filter(d => d.s.mainMoved).length,
          weekdaysLogged: weekdays.length
        }
      },
      answers: answers || {}
    });
  } catch (err) {
    console.error('Weekly review error:', err);
    res.status(500).json({ error: 'Failed to build weekly review.' });
  }
});

// PUT /api/review — save answers for a week
router.put('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(req.body.weekStart || '') ? req.body.weekStart : todayStr());
    const updates = pick(req.body, ANSWER_FIELDS);
    const existing = await storage.findOne('reviews', userId, { weekStart: start });
    const item = existing
      ? await storage.update('reviews', userId, existing._id, updates)
      : await storage.create('reviews', userId, { weekStart: start, ...updates });
    res.json({ success: true, item });
  } catch (err) {
    console.error('Save review error:', err);
    res.status(500).json({ error: 'Failed to save weekly review.' });
  }
});

module.exports = router;
