const mongoose = require('mongoose');

const outreachLeadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  storeUrl: {
    type: String,
    default: '',
    trim: true
  },
  emailGaps: {
    type: String,
    default: ''
  },
  pitchSample: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['researching', 'drafted', 'sent', 'replied', 'closed'],
    default: 'researching'
  },
  contactEmail: {
    type: String,
    default: '',
    trim: true
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OutreachLead', outreachLeadSchema);
