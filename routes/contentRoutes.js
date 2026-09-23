const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');
const { crudRouter } = require('./crud');
const { todayStr } = require('../utils/dates');

const STATUSES = ['idea', 'scripted', 'recorded', 'edited', 'scheduled', 'posted'];
const STREAMS = ['slotly', 'products'];

// Keep postedDate in step with status so "posted today" counts are exact.
function applyPostedDate(updates, existing) {
  if (updates.status !== undefined && !STATUSES.includes(updates.status)) {
    updates.status = existing ? existing.status : 'idea';
  }
  if (updates.stream !== undefined && !STREAMS.includes(updates.stream)) {
    updates.stream = 'products';
  }
  const status = updates.status !== undefined ? updates.status : (existing && existing.status);
  if (status === 'posted' && !(existing && existing.postedDate) && !updates.postedDate) {
    updates.postedDate = todayStr();
  } else if (status && status !== 'posted') {
    updates.postedDate = '';
  }
  return updates;
}

const router = crudRouter('calendar', {
  label: 'content item',
  fields: ['stream', 'day', 'date', 'title', 'contentType', 'platform', 'product', 'hook', 'cta',
    'status', 'postedDate', 'link', 'results', 'script', 'notes'],
  filters: ['stream', 'status', 'product', 'date'],
  sort: { day: 1, date: 1, createdAt: 1 },
  defaults: () => ({ stream: 'products', status: 'idea', date: todayStr() }),
  beforeSave: applyPostedDate,
  visible: item => STREAMS.includes(item.stream)
});

// POST /api/content/:id/posted — one-tap "Posted today"
router.post('/:id/posted', authMiddleware, async (req, res) => {
  try {
    const existing = await storage.findOne('calendar', req.user.userId, { _id: req.params.id }).catch(() => null);
    if (!existing || !STREAMS.includes(existing.stream)) return res.status(404).json({ error: 'Content item not found.' });
    const item = await storage.update('calendar', req.user.userId, req.params.id, {
      status: 'posted',
      postedDate: todayStr()
    });
    if (!item) return res.status(404).json({ error: 'Content item not found.' });
    res.json({ success: true, item });
  } catch (err) {
    console.error('Mark posted error:', err);
    res.status(500).json({ error: 'Failed to mark as posted.' });
  }
});

module.exports = router;
