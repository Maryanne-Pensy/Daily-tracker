const mongoose = require('mongoose');

const contentCalendarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  day: {
    type: Number,
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'drafted', 'recorded', 'posted'],
    default: 'pending'
  },
  script: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

contentCalendarSchema.index({ userId: 1, day: 1 });

module.exports = mongoose.model('ContentCalendar', contentCalendarSchema);
