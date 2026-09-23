const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');

function pick(body, fields) {
  const out = {};
  fields.forEach(f => {
    if (body[f] !== undefined) out[f] = body[f];
  });
  return out;
}

// Small user-scoped CRUD router: GET / (filter by ?field=value for filterable fields),
// POST /, PUT /:id, DELETE /:id. Hooks let a resource add its own rules.
function crudRouter(col, {
  label,
  fields,
  filters = [],
  sort = { createdAt: 1 },
  defaults = () => ({}),
  beforeSave = (updates) => updates,
  canDelete = () => true,
  decorateList = () => ({})
}) {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', async (req, res) => {
    try {
      await storage.ensureSetup(req.user.userId);
      const items = await storage.find(col, req.user.userId, pick(req.query, filters), sort);
      res.json({ items, ...decorateList(items, req) });
    } catch (err) {
      console.error(`List ${label} error:`, err);
      res.status(500).json({ error: `Failed to load ${label}.` });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const data = beforeSave({ ...defaults(req), ...pick(req.body, fields) }, null);
      const item = await storage.create(col, req.user.userId, data);
      res.status(201).json({ success: true, item });
    } catch (err) {
      console.error(`Create ${label} error:`, err);
      res.status(500).json({ error: `Failed to create ${label}.` });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const existing = await storage.findOne(col, req.user.userId, { _id: req.params.id }).catch(() => null);
      if (!existing) return res.status(404).json({ error: `${label} not found.` });
      const item = await storage.update(col, req.user.userId, req.params.id, beforeSave(pick(req.body, fields), existing));
      res.json({ success: true, item });
    } catch (err) {
      console.error(`Update ${label} error:`, err);
      res.status(500).json({ error: `Failed to update ${label}.` });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const existing = await storage.findOne(col, req.user.userId, { _id: req.params.id }).catch(() => null);
      if (existing && !canDelete(existing)) {
        return res.status(400).json({ error: `This ${label} can't be deleted.` });
      }
      await storage.remove(col, req.user.userId, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(`Delete ${label} error:`, err);
      res.status(500).json({ error: `Failed to delete ${label}.` });
    }
  });

  return router;
}

module.exports = { crudRouter, pick };
