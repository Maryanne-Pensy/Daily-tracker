const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { whenReady } = require('../config/db');
const { todayStr, addDays } = require('../utils/dates');
const User = require('../models/User');
const DailyProgress = require('../models/DailyProgress');
const ContentCalendar = require('../models/ContentCalendar');
const OutreachLead = require('../models/OutreachLead');
const Product = require('../models/Product');
const Project = require('../models/Project');
const Learning = require('../models/Learning');
const WeeklyReview = require('../models/WeeklyReview');
const seed = require('./seed');

const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || path.join(__dirname, '..', 'data', 'local_db.json');
const DATA_DIR = path.dirname(LOCAL_DB_PATH);

// Collection name (also the key in local_db.json) -> Mongoose model
const MODELS = {
  users: User,
  progress: DailyProgress,
  calendar: ContentCalendar,
  leads: OutreachLead,
  products: Product,
  projects: Project,
  learning: Learning,
  reviews: WeeklyReview
};

function isMongoActive() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// Local storage helpers
function getLocalDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  let data = {};
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
    } catch (err) {
      data = {};
    }
  }
  Object.keys(MODELS).forEach(k => { if (!Array.isArray(data[k])) data[k] = []; });
  return data;
}

function saveLocalDB(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Plain JSON shape for both backends (ObjectIds and Dates become strings)
function normalize(doc) {
  return doc ? JSON.parse(JSON.stringify(doc)) : null;
}

function matches(doc, query) {
  return Object.entries(query).every(([k, v]) => String(doc[k]) === String(v));
}

function sortDocs(docs, sort) {
  if (!sort) return docs;
  const keys = Object.entries(sort);
  return docs.sort((a, b) => {
    for (const [k, dir] of keys) {
      const av = a[k] === undefined || a[k] === null ? '' : a[k];
      const bv = b[k] === undefined || b[k] === null ? '' : b[k];
      if (av < bv) return -dir;
      if (av > bv) return dir;
    }
    return 0;
  });
}

// Schema defaults applied the same way in both backends
function withDefaults(col, data) {
  const { userId, ...rest } = data;
  const doc = new MODELS[col](rest).toObject({ depopulate: true });
  delete doc.__v;
  return { ...doc, _id: col + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7), userId };
}

// ---------- Generic user-scoped CRUD ----------

async function find(col, userId, query = {}, sort = null) {
  await whenReady();
  if (isMongoActive()) {
    let q = MODELS[col].find({ ...query, userId });
    if (sort) q = q.sort(sort);
    return normalize(await q.lean());
  }
  const db = getLocalDB();
  return sortDocs(db[col].filter(d => d.userId === userId && matches(d, query)), sort);
}

async function findOne(col, userId, query = {}) {
  const docs = await find(col, userId, query);
  return docs[0] || null;
}

async function create(col, userId, data) {
  await whenReady();
  if (isMongoActive()) {
    const doc = await MODELS[col].create({ ...data, userId });
    return normalize(doc.toObject());
  }
  const db = getLocalDB();
  const doc = withDefaults(col, { ...data, userId });
  doc.createdAt = doc.createdAt || new Date().toISOString();
  db[col].push(doc);
  saveLocalDB(db);
  return normalize(doc);
}

async function update(col, userId, id, updates) {
  await whenReady();
  const set = { ...updates, updatedAt: new Date() };
  delete set._id;
  delete set.userId;
  if (isMongoActive()) {
    if (!mongoose.isValidObjectId(id)) return null;
    return normalize(await MODELS[col].findOneAndUpdate(
      { _id: id, userId },
      { $set: set },
      { new: true }
    ).lean());
  }
  const db = getLocalDB();
  const idx = db[col].findIndex(d => d._id === id && d.userId === userId);
  if (idx === -1) return null;
  db[col][idx] = { ...db[col][idx], ...normalize(set) };
  saveLocalDB(db);
  return normalize(db[col][idx]);
}

async function remove(col, userId, id) {
  await whenReady();
  if (isMongoActive()) {
    if (!mongoose.isValidObjectId(id)) return false;
    await MODELS[col].findOneAndDelete({ _id: id, userId });
    return true;
  }
  const db = getLocalDB();
  db[col] = db[col].filter(d => !(d._id === id && d.userId === userId));
  saveLocalDB(db);
  return true;
}

// ---------- Users ----------

async function findUserByEmail(email) {
  await whenReady();
  if (isMongoActive()) {
    return normalize(await User.findOne({ email: email.toLowerCase() }).lean());
  }
  const db = getLocalDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findUserById(id) {
  await whenReady();
  let user;
  if (isMongoActive()) {
    if (!mongoose.isValidObjectId(id)) return null;
    user = normalize(await User.findById(id).lean());
  } else {
    const db = getLocalDB();
    user = db.users.find(u => u._id === id || u.id === id);
  }
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

async function createUser({ username, email, password }) {
  await whenReady();
  if (isMongoActive()) {
    const user = await User.create({ username, email: email.toLowerCase(), password });
    return normalize(user.toObject());
  }
  const db = getLocalDB();
  const newUser = {
    ...withDefaults('users', { username, email: email.toLowerCase(), password }),
    createdAt: new Date().toISOString()
  };
  newUser._id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  db.users.push(newUser);
  saveLocalDB(db);
  return newUser;
}

async function updateUser(userId, updates) {
  await whenReady();
  if (isMongoActive()) {
    return normalize(await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean());
  }
  const db = getLocalDB();
  const idx = db.users.findIndex(u => u._id === userId || u.id === userId);
  if (idx !== -1) {
    db.users[idx] = { ...db.users[idx], ...normalize(updates) };
    saveLocalDB(db);
    return db.users[idx];
  }
  return null;
}

// ---------- One-time setup ----------
// Records left over from the old copywriting tracker are tagged 'legacy' and
// never returned by the API. They are not deleted.

const SETUP_VERSION = 1;
const setupRuns = new Map();

function ensureSetup(userId) {
  const key = (isMongoActive() ? 'mongo:' : 'local:') + userId;
  if (!setupRuns.has(key)) {
    const run = runSetup(userId).catch(err => {
      setupRuns.delete(key);
      throw err;
    });
    setupRuns.set(key, run);
  }
  return setupRuns.get(key);
}

async function runSetup(userId) {
  await whenReady();
  const user = await findUserById(userId);
  if (!user) return;
  const firstSetup = (user.setupVersion || 0) < SETUP_VERSION;

  // 1. Hide old-tracker calendar items and leads
  const content = await find('calendar', userId);
  for (const item of content.filter(c => !c.stream || c.stream === 'copywriting')) {
    await update('calendar', userId, item._id, { stream: 'legacy' });
  }
  const leads = await find('leads', userId);
  for (const lead of leads.filter(l => !l.kind || l.kind === 'copywriting')) {
    await update('leads', userId, lead._id, { kind: 'legacy' });
  }

  // 2. Built-in projects always exist
  const projects = await find('projects', userId);
  for (const p of seed.DEFAULT_PROJECTS.filter(p => p.key)) {
    if (!projects.some(x => x.key === p.key)) {
      await create('projects', userId, { ...p, dateAdded: todayStr() });
    }
  }

  if (firstSetup) {
    // 3. Slotly 30-day marketing plan, starting today
    if (!content.some(c => c.stream === 'slotly')) {
      const start = todayStr();
      for (const post of seed.SLOTLY_30_DAY_PLAN) {
        await create('calendar', userId, {
          ...post, stream: 'slotly', date: addDays(start, post.day - 1), platform: 'Instagram', status: 'idea'
        });
      }
    }
    // 4. Parked ideas, first product, learning track
    for (const p of seed.DEFAULT_PROJECTS.filter(p => !p.key)) {
      if (!projects.some(x => x.name === p.name)) await create('projects', userId, { ...p, dateAdded: todayStr() });
    }
    if (!(await find('products', userId)).length) {
      for (const p of seed.DEFAULT_PRODUCTS) await create('products', userId, p);
    }
    if (!(await find('learning', userId)).length) {
      for (const l of seed.DEFAULT_LEARNING) await create('learning', userId, l);
    }
    await updateUser(userId, { setupVersion: SETUP_VERSION });
  }
}

module.exports = {
  isMongoActive,
  find,
  findOne,
  create,
  update,
  remove,
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  ensureSetup
};
