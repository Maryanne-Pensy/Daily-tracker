const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  appliedTo: { type: String, default: '' }, // slotly | products | other
  date: { type: String, default: '' }
}, { _id: false });

const learningSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, default: '' },
  currentModule: { type: String, default: '' },
  modulesCompleted: { type: Number, default: 0 },
  totalModules: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  lessons: { type: [lessonSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Learning', learningSchema);
