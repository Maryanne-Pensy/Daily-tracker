const mongoose = require('mongoose');

// One flexible content model for every stream:
//   slotly      – the 30-day "booked demo calls" marketing plan
//   products    – digital-product / tech videos (2 per day target)
//   copywriting – archived calendar from the old copywriting tracker
const contentCalendarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stream: { type: String, default: 'slotly', index: true },
  day: { type: Number, default: null },
  date: { type: String, default: '' }, // YYYY-MM-DD
  title: { type: String, default: '' },
  contentType: { type: String, default: '' }, // reel | carousel | short | video | story | other
  platform: { type: String, default: '' },
  product: { type: String, default: '' }, // product / topic label
  hook: { type: String, default: '' },
  cta: { type: String, default: '' },
  // idea | scripted | recorded | edited | scheduled | posted
  status: { type: String, default: 'idea' },
  postedDate: { type: String, default: '' },
  link: { type: String, default: '' },
  results: { type: String, default: '' },
  script: { type: String, default: '' },
  notes: { type: String, default: '' },
  legacyStatus: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

contentCalendarSchema.index({ userId: 1, stream: 1, day: 1 });

module.exports = mongoose.model('ContentCalendar', contentCalendarSchema);
