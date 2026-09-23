const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, default: '' },
  category: { type: String, default: 'Other' }, // Cybersecurity | AI | AI Automation | IT | Software | Other
  version: { type: String, default: '' },
  status: { type: String, default: 'idea' }, // idea | research | building | v1 | published | improving | archived
  description: { type: String, default: '' },
  currentlyBuilding: { type: String, default: '' },
  launchStatus: { type: String, default: '' },
  price: { type: String, default: '' },
  link: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
