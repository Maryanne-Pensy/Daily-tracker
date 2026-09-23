const mongoose = require('mongoose');

// kind: main (Slotly) | weekend (TradeIQ) | parked (parking lot ideas)
const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  key: { type: String, default: '' }, // 'slotly' | 'tradeiq' for the built-in projects
  kind: { type: String, default: 'parked' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  whyInteresting: { type: String, default: '' },
  potentialCustomer: { type: String, default: '' },
  nextStep: { type: String, default: '' },
  status: { type: String, default: 'parked' }, // idea | parked | research_later | active
  milestone: { type: String, default: '' },
  nextTask: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  dateAdded: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
