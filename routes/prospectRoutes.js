const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');
const { crudRouter } = require('./crud');
const { prospectStats } = require('../services/today');
const { todayStr, addDays } = require('../utils/dates');

const STATUSES = ['researching', 'contacted', 'replied', 'demo_booked', 'demo_done', 'trial', 'paying',
  'not_interested', 'follow_up_later'];
const FOLLOW_UP_DAYS = 3;

const router = crudRouter('leads', {
  label: 'prospect',
  fields: ['name', 'contact', 'link', 'phone', 'location', 'currentSystem', 'problem',
    'dateContacted', 'lastContact', 'nextFollowUp', 'status', 'notes'],
  filters: ['kind', 'status'],
  sort: { updatedAt: -1 },
  defaults: () => ({ kind: 'clinic', status: 'researching' }),
  beforeSave: (updates, existing) => {
    if (updates.status !== undefined && !STATUSES.includes(updates.status)) {
      updates.status = existing ? existing.status : 'researching';
    }
    // Moving past "researching" without a contact date means it happened today.
    if (updates.status && updates.status !== 'researching' && !(existing && existing.dateContacted) && !updates.dateContacted) {
      updates.dateContacted = todayStr();
    }
    return updates;
  },
  decorateList: (items) => ({ stats: prospectStats(items, todayStr()) }),
  visible: lead => lead.kind === 'clinic'
});

// POST /api/prospects/:id/contacted — one-tap "Contacted today"
router.post('/:id/contacted', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const lead = await storage.findOne('leads', userId, { _id: req.params.id }).catch(() => null);
    if (!lead || lead.kind !== 'clinic') return res.status(404).json({ error: 'Prospect not found.' });
    const today = todayStr();
    const item = await storage.update('leads', userId, lead._id, {
      lastContact: today,
      dateContacted: lead.dateContacted || today,
      status: lead.status === 'researching' ? 'contacted' : lead.status,
      nextFollowUp: addDays(today, FOLLOW_UP_DAYS)
    });
    res.json({ success: true, item });
  } catch (err) {
    console.error('Mark contacted error:', err);
    res.status(500).json({ error: 'Failed to mark as contacted.' });
  }
});

module.exports = router;
