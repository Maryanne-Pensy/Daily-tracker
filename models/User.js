const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  coachSettings: {
    personality: { type: String, default: 'sergeant' }, // sergeant, mom, wallstreet, ramsay
    voiceEnabled: { type: Boolean, default: false }
  },
  preferences: {
    // Editable default Slotly checklist: [{ label, tag }]
    slotlyChecklist: { type: [mongoose.Schema.Types.Mixed], default: undefined }
  },
  setupVersion: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
