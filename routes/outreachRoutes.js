const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');

const router = express.Router();

// GET /api/outreach
router.get('/', authMiddleware, async (req, res) => {
  try {
    const leads = await storage.getOutreachLeads(req.user.userId);
    res.json({ leads });
  } catch (err) {
    console.error('Fetch outreach leads error:', err);
    res.status(500).json({ error: 'Failed to retrieve outreach leads.' });
  }
});

// POST /api/outreach
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { clientName, storeUrl, emailGaps, pitchSample, status, contactEmail, notes } = req.body;
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({ error: 'Client/Store name is required.' });
    }

    const lead = await storage.createOutreachLead(req.user.userId, {
      clientName: clientName.trim(),
      storeUrl,
      emailGaps,
      pitchSample,
      status: status || 'researching',
      contactEmail,
      notes
    });

    res.status(201).json({ success: true, lead });
  } catch (err) {
    console.error('Create outreach lead error:', err);
    res.status(500).json({ error: 'Failed to create outreach lead.' });
  }
});

// PUT /api/outreach/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await storage.updateOutreachLead(req.user.userId, req.params.id, req.body);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }
    res.json({ success: true, lead });
  } catch (err) {
    console.error('Update outreach lead error:', err);
    res.status(500).json({ error: 'Failed to update outreach lead.' });
  }
});

// DELETE /api/outreach/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await storage.deleteOutreachLead(req.user.userId, req.params.id);
    res.json({ success: true, message: 'Lead deleted.' });
  } catch (err) {
    console.error('Delete outreach lead error:', err);
    res.status(500).json({ error: 'Failed to delete lead.' });
  }
});

module.exports = router;
