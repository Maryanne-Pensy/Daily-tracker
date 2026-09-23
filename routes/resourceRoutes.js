// Digital products, projects (Slotly / TradeIQ / parking lot) and learning tracks.
const { crudRouter } = require('./crud');
const { todayStr } = require('../utils/dates');

const clampProgress = (updates) => {
  if (updates.progress !== undefined) {
    updates.progress = Math.max(0, Math.min(100, Number(updates.progress) || 0));
  }
  return updates;
};

const products = crudRouter('products', {
  label: 'product',
  fields: ['name', 'category', 'version', 'status', 'description', 'currentlyBuilding',
    'launchStatus', 'price', 'link', 'notes'],
  filters: ['status', 'category'],
  defaults: () => ({ status: 'idea', category: 'Other' })
});

const projects = crudRouter('projects', {
  label: 'project',
  fields: ['name', 'description', 'whyInteresting', 'potentialCustomer', 'nextStep', 'status',
    'milestone', 'nextTask', 'progress', 'notes', 'dateAdded'],
  filters: ['kind', 'key', 'status'],
  // New projects always land in the parking lot.
  defaults: () => ({ kind: 'parked', status: 'parked', dateAdded: todayStr() }),
  beforeSave: clampProgress,
  canDelete: (project) => !project.key
});

const learning = crudRouter('learning', {
  label: 'learning track',
  fields: ['name', 'currentModule', 'modulesCompleted', 'totalModules', 'notes', 'lessons'],
  beforeSave: (updates) => {
    ['modulesCompleted', 'totalModules'].forEach(f => {
      if (updates[f] !== undefined) updates[f] = Math.max(0, Number(updates[f]) || 0);
    });
    if (updates.lessons !== undefined) {
      updates.lessons = (Array.isArray(updates.lessons) ? updates.lessons : []).map(l => ({
        text: String(l.text || ''),
        appliedTo: String(l.appliedTo || ''),
        date: String(l.date || todayStr())
      }));
    }
    return updates;
  }
});

module.exports = { products, projects, learning };
