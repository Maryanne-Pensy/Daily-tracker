const mongoose = require('mongoose');

// Clinic prospects for Slotly. Old copywriting leads are kept with kind = 'copywriting'.
const outreachLeadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  kind: { type: String, default: 'clinic' },
  name: { type: String, default: '', trim: true },
  contact: { type: String, default: '', trim: true },
  link: { type: String, default: '', trim: true }, // Instagram / website
  phone: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  currentSystem: { type: String, default: '' },
  problem: { type: String, default: '' },
  dateContacted: { type: String, default: '' },
  lastContact: { type: String, default: '' },
  nextFollowUp: { type: String, default: '' },
  // researching | contacted | replied | demo_booked | demo_done | trial | paying | not_interested | follow_up_later
  status: { type: String, default: 'researching' },
  notes: { type: String, default: '' },

  // Legacy copywriting fields
  clientName: { type: String, default: '' },
  storeUrl: { type: String, default: '' },
  emailGaps: { type: String, default: '' },
  pitchSample: { type: String, default: '' },
  contactEmail: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OutreachLead', outreachLeadSchema);
