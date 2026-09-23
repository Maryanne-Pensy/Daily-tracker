const mongoose = require('mongoose');

const checkItem = new mongoose.Schema({
  label: { type: String, default: '' },
  tag: { type: String, default: '' }, // Slotly: product | customers | '' (counts as product)
  done: { type: Boolean, default: false }
}, { _id: false });

const needleItem = new mongoose.Schema({
  category: { type: String, default: 'build' }, // build | customers | validation
  text: { type: String, default: '' },
  done: { type: Boolean, default: false }
}, { _id: false });

const dailyProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },
  // 2 = Builder OS day; older records from the previous tracker are hidden
  schemaVersion: { type: Number, default: 1 },

  mission: { type: String, default: '' },
  missionDone: { type: Boolean, default: false },
  slotlyChecklist: { type: [checkItem], default: undefined },
  needle: { type: [needleItem], default: undefined },
  productWork: { type: Boolean, default: false },
  productWorkNote: { type: String, default: '' },
  learningDone: { type: Boolean, default: false },
  learningNote: { type: String, default: '' },
  tradeiqChecklist: { type: [checkItem], default: undefined },
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },

  // true = the day's main mission moved (counts toward the streak)
  isCompleted: {
    type: Boolean,
    default: false
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

dailyProgressSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyProgress', dailyProgressSchema);
