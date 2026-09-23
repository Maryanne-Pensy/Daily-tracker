const mongoose = require('mongoose');

const weeklyReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekStart: { type: String, required: true }, // Monday, YYYY-MM-DD
  needleMoved: { type: String, default: '' },
  nextWeekOutcome: { type: String, default: '' },
  biggestCustomerLearning: { type: String, default: '' },
  bestContent: { type: String, default: '' },
  sales: { type: String, default: '' },
  mostUsefulLesson: { type: String, default: '' },
  tradeiqNotes: { type: String, default: '' },
  stayedFocused: { type: String, default: '' }, // yes | mostly | no
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

weeklyReviewSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyReview', weeklyReviewSchema);
