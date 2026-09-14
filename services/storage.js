const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const DailyProgress = require('../models/DailyProgress');
const ContentCalendar = require('../models/ContentCalendar');
const OutreachLead = require('../models/OutreachLead');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'local_db.json');

const DEFAULT_CALENDAR = [
  { day: 1, date: "2026-09-07", title: "I Gave ChatGPT a Product to Sell. Here's What It Got Wrong." },
  { day: 2, date: "2026-09-09", title: "Why AI Copy Always Sounds Like AI Copy" },
  { day: 3, date: "2026-09-11", title: "I Asked AI to Write an Abandoned Cart Email — Then Rewrote It Line by Line" },
  { day: 4, date: "2026-09-14", title: "The One Thing AI Can't Do in Email Copy (and Why It's the Whole Job)" },
  { day: 5, date: "2026-09-16", title: "AI Wrote the First Draft of This Welcome Email. Here's My Editing Process." },
  { day: 6, date: "2026-09-18", title: "Why Your Abandoned Cart Email Isn't Bringing People Back" },
  { day: 7, date: "2026-09-21", title: "The Welcome Email Most Shopify Stores Get Wrong" },
  { day: 8, date: "2026-09-23", title: "Post-Purchase Emails: The Missed Opportunity Nobody Talks About" },
  { day: 9, date: "2026-09-25", title: "Why Your Win-Back Email Isn't Winning Anyone Back" },
  { day: 10, date: "2026-09-28", title: "I Audited a Shopify Store's Full Email Flow in 10 Minutes" },
  { day: 11, date: "2026-09-30", title: "5 Things I Check in Every Email Flow Audit" },
  { day: 12, date: "2026-10-02", title: "The First Line of Your Email Decides If It Gets Read — Here's How to Nail It" },
  { day: 13, date: "2026-10-05", title: "I Rewrote a Terrible Abandoned Cart Email" },
  { day: 14, date: "2026-10-07", title: "Same Product, Two Different Buyers — Watch the Email Copy Change" },
  { day: 15, date: "2026-10-09", title: "I Removed Half the Words From This Email Without Losing the Message" },
  { day: 16, date: "2026-10-12", title: "The Client Who Taught Me Features Don't Sell — Outcomes Do" },
  { day: 17, date: "2026-10-14", title: "Why \"Don't Miss Out\" Is Weak Subject Line Copy (and What Works Instead)" },
  { day: 18, date: "2026-10-16", title: "How I Find the Real Objection Behind Every \"Why Didn't They Buy\"" },
  { day: 19, date: "2026-10-19", title: "The Difference Between a Reminder Email and a Convincing One" },
  { day: 20, date: "2026-10-21", title: "This One Subject Line Change and What Happened After" },
  { day: 21, date: "2026-10-23", title: "A Client Told Me My Email Was \"Too Short.\" Here's What Happened When They Sent It." },
  { day: 22, date: "2026-10-26", title: "Before/After: What This Email Rewrite Actually Did to Open Rates" },
  { day: 23, date: "2026-10-28", title: "A Client Asked Me to Write a Misleading Subject Line. I Said No. Here's Why." },
  { day: 24, date: "2026-10-30", title: "My First Email Copywriting Client Paid Me $50. Here's What I'd Charge Now." },
  { day: 25, date: "2026-11-02", title: "The Pitch That Flopped — and What I Changed After" },
  { day: 26, date: "2026-11-04", title: "What Nobody Tells You About Freelance Copywriting Month 1 vs Month 6" },
  { day: 27, date: "2026-11-06", title: "I Wrote a Full Abandoned Cart Sequence From Scratch — Full Process" },
  { day: 28, date: "2026-11-09", title: "Writing Emails When Nobody's Heard of the Brand — Building Trust With Cold Subscribers" },
  { day: 29, date: "2026-11-11", title: "How Curiosity Actually Works in Subject Lines (Without Being Clickbait)" },
  { day: 30, date: "2026-11-13", title: "30 Days of Email Copywriting Content — What Changed, What I Got Wrong, What's Next" }
];

function isMongoActive() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// Local storage helper
function getLocalDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initialData = { users: [], progress: [], calendar: [], leads: [] };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { users: [], progress: [], calendar: [], leads: [] };
  }
}

function saveLocalDB(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// User Methods
async function findUserByEmail(email) {
  if (isMongoActive()) {
    return await User.findOne({ email: email.toLowerCase() });
  }
  const db = getLocalDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findUserById(id) {
  if (isMongoActive()) {
    return await User.findById(id).select('-password');
  }
  const db = getLocalDB();
  const user = db.users.find(u => u._id === id || u.id === id);
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

async function createUser({ username, email, password }) {
  if (isMongoActive()) {
    const user = new User({ username, email: email.toLowerCase(), password });
    await user.save();
    return user;
  }
  const db = getLocalDB();
  const newUser = {
    _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username,
    email: email.toLowerCase(),
    password,
    streak: { count: 0, lastCompletedDate: null },
    coachSettings: { personality: 'sergeant', voiceEnabled: false, rageLevelOverride: null },
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  saveLocalDB(db);
  return newUser;
}

async function updateUser(userId, updates) {
  if (isMongoActive()) {
    return await User.findByIdAndUpdate(userId, { $set: updates }, { new: true });
  }
  const db = getLocalDB();
  const idx = db.users.findIndex(u => u._id === userId || u.id === userId);
  if (idx !== -1) {
    db.users[idx] = { ...db.users[idx], ...updates };
    saveLocalDB(db);
    return db.users[idx];
  }
  return null;
}

// Daily Progress Methods
async function getTodayProgress(userId, dateStr) {
  if (isMongoActive()) {
    let progress = await DailyProgress.findOne({ userId, date: dateStr });
    if (!progress) {
      progress = new DailyProgress({
        userId,
        date: dateStr,
        checked: [false, false, false, false, false, false],
        completedCount: 0,
        isCompleted: false
      });
      await progress.save();
    }
    return progress;
  }
  const db = getLocalDB();
  let progress = db.progress.find(p => (p.userId === userId) && p.date === dateStr);
  if (!progress) {
    progress = {
      _id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      date: dateStr,
      checked: [false, false, false, false, false, false],
      completedCount: 0,
      isCompleted: false,
      notes: '',
      updatedAt: new Date().toISOString()
    };
    db.progress.push(progress);
    saveLocalDB(db);
  }
  return progress;
}

async function updateTodayProgress(userId, dateStr, checkedArray) {
  const completedCount = checkedArray.filter(Boolean).length;
  const isCompleted = completedCount === 6;

  if (isMongoActive()) {
    return await DailyProgress.findOneAndUpdate(
      { userId, date: dateStr },
      {
        $set: {
          checked: checkedArray,
          completedCount,
          isCompleted,
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );
  }
  const db = getLocalDB();
  let idx = db.progress.findIndex(p => p.userId === userId && p.date === dateStr);
  const updated = {
    userId,
    date: dateStr,
    checked: checkedArray,
    completedCount,
    isCompleted,
    updatedAt: new Date().toISOString()
  };
  if (idx !== -1) {
    db.progress[idx] = { ...db.progress[idx], ...updated };
  } else {
    updated._id = 'prog_' + Date.now();
    db.progress.push(updated);
  }
  saveLocalDB(db);
  return updated;
}

async function getUserProgressHistory(userId) {
  if (isMongoActive()) {
    return await DailyProgress.find({ userId }).sort({ date: -1 }).limit(30);
  }
  const db = getLocalDB();
  return db.progress
    .filter(p => p.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
}

// Content Calendar Methods
async function seedContentCalendarIfEmpty(userId) {
  if (isMongoActive()) {
    const count = await ContentCalendar.countDocuments({ userId });
    if (count === 0) {
      const docs = DEFAULT_CALENDAR.map(item => ({
        userId,
        day: item.day,
        date: item.date,
        title: item.title,
        status: 'pending',
        script: '',
        notes: ''
      }));
      await ContentCalendar.insertMany(docs);
    }
    return;
  }
  const db = getLocalDB();
  const existing = db.calendar.filter(c => c.userId === userId);
  if (existing.length === 0) {
    DEFAULT_CALENDAR.forEach(item => {
      db.calendar.push({
        _id: 'cal_' + userId + '_' + item.day,
        userId,
        day: item.day,
        date: item.date,
        title: item.title,
        status: 'pending',
        script: '',
        notes: '',
        updatedAt: new Date().toISOString()
      });
    });
    saveLocalDB(db);
  }
}

async function getContentCalendar(userId) {
  await seedContentCalendarIfEmpty(userId);
  if (isMongoActive()) {
    return await ContentCalendar.find({ userId }).sort({ day: 1 });
  }
  const db = getLocalDB();
  return db.calendar.filter(c => c.userId === userId).sort((a, b) => a.day - b.day);
}

async function updateContentCalendarDay(userId, dayNum, updates) {
  if (isMongoActive()) {
    return await ContentCalendar.findOneAndUpdate(
      { userId, day: dayNum },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );
  }
  const db = getLocalDB();
  const idx = db.calendar.findIndex(c => c.userId === userId && c.day === Number(dayNum));
  if (idx !== -1) {
    db.calendar[idx] = { ...db.calendar[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalDB(db);
    return db.calendar[idx];
  }
  return null;
}

// Outreach Leads Methods
async function getOutreachLeads(userId) {
  if (isMongoActive()) {
    return await OutreachLead.find({ userId }).sort({ updatedAt: -1 });
  }
  const db = getLocalDB();
  return db.leads.filter(l => l.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function createOutreachLead(userId, data) {
  if (isMongoActive()) {
    const lead = new OutreachLead({ ...data, userId });
    await lead.save();
    return lead;
  }
  const db = getLocalDB();
  const newLead = {
    _id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    clientName: data.clientName,
    storeUrl: data.storeUrl || '',
    emailGaps: data.emailGaps || '',
    pitchSample: data.pitchSample || '',
    status: data.status || 'researching',
    contactEmail: data.contactEmail || '',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.leads.push(newLead);
  saveLocalDB(db);
  return newLead;
}

async function updateOutreachLead(userId, leadId, updates) {
  if (isMongoActive()) {
    return await OutreachLead.findOneAndUpdate(
      { _id: leadId, userId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );
  }
  const db = getLocalDB();
  const idx = db.leads.findIndex(l => l._id === leadId && l.userId === userId);
  if (idx !== -1) {
    db.leads[idx] = { ...db.leads[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalDB(db);
    return db.leads[idx];
  }
  return null;
}

async function deleteOutreachLead(userId, leadId) {
  if (isMongoActive()) {
    await OutreachLead.findOneAndDelete({ _id: leadId, userId });
    return true;
  }
  const db = getLocalDB();
  db.leads = db.leads.filter(l => !(l._id === leadId && l.userId === userId));
  saveLocalDB(db);
  return true;
}

module.exports = {
  isMongoActive,
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  getTodayProgress,
  updateTodayProgress,
  getUserProgressHistory,
  getContentCalendar,
  updateContentCalendarDay,
  seedContentCalendarIfEmpty,
  getOutreachLeads,
  createOutreachLead,
  updateOutreachLead,
  deleteOutreachLead,
  DEFAULT_CALENDAR
};
