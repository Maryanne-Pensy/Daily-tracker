// Builder OS day logic: the day record, the daily score, the streak and the
// Slotly pipeline numbers. Shared by the tracker, coach and review routes.
const storage = require('./storage');
const seed = require('./seed');
const { todayStr, currentHour, addDays, dayType, isWeekend, weekStart, toDateStr } = require('../utils/dates');

const VIDEO_TARGET = 2;
const EVENING_HOUR = Number(process.env.EVENING_HOUR || 17);

// Pipeline order for clinic prospects; the last two statuses are side exits.
const CLINIC_STAGES = ['researching', 'contacted', 'replied', 'demo_booked', 'demo_done', 'trial', 'paying'];
const CLOSED_STATUSES = ['paying', 'not_interested'];

function prospectStats(leads, today) {
  const clinics = leads.filter(l => l.kind === 'clinic');
  const stage = l => CLINIC_STAGES.indexOf(l.status);
  return {
    prospects: clinics.length,
    contacted: clinics.filter(l => stage(l) >= 1 || l.dateContacted).length,
    replies: clinics.filter(l => stage(l) >= 2).length,
    demosBooked: clinics.filter(l => stage(l) >= 3).length,
    trials: clinics.filter(l => stage(l) >= 5).length,
    testing: clinics.filter(l => l.status === 'trial').length,
    paying: clinics.filter(l => l.status === 'paying').length,
    followUpsDue: clinics.filter(l => l.nextFollowUp && l.nextFollowUp <= today && !CLOSED_STATUSES.includes(l.status)).length
  };
}

function freshDay(date, user) {
  const checklist = (user && user.preferences && user.preferences.slotlyChecklist) || seed.DEFAULT_SLOTLY_CHECKLIST;
  const type = dayType(date);
  return {
    schemaVersion: 2,
    slotlyChecklist: checklist.map(i => ({ label: i.label, tag: i.tag || '', done: false })),
    needle: [],
    tradeiqChecklist: type === 'weekday' ? [] : seed.TRADEIQ_CHECKLIST[type].map(label => ({ label, tag: '', done: false }))
  };
}

async function getOrCreateDay(userId, date, user) {
  const existing = await storage.findOne('progress', userId, { date });
  if (!existing) {
    try {
      return await storage.create('progress', userId, { date, ...freshDay(date, user) });
    } catch (err) {
      if (err.code !== 11000) throw err; // created by a parallel request
      return storage.findOne('progress', userId, { date });
    }
  }
  if ((existing.schemaVersion || 1) < 2) {
    // A day record from the old tracker: add the new fields.
    return storage.update('progress', userId, existing._id, freshDay(date, user));
  }
  return existing;
}

function scoreDay(day, type, videosPosted) {
  const checklist = day.slotlyChecklist || [];
  const needle = day.needle || [];
  const slotlyProduct = Boolean(day.missionDone) ||
    checklist.some(i => i.done && i.tag !== 'customers') ||
    needle.some(n => n.done && n.category === 'build');
  const slotlyCustomers = checklist.some(i => i.done && i.tag === 'customers') ||
    needle.some(n => n.done && n.category !== 'build');
  const tradeiq = (day.tradeiqChecklist || []).some(i => i.done);
  const videos = Math.min(videosPosted, VIDEO_TARGET) / VIDEO_TARGET;
  const shared = [
    { key: 'productWork', label: 'Digital product work', value: day.productWork ? 1 : 0 },
    { key: 'videos', label: `${VIDEO_TARGET} videos posted`, value: videos },
    { key: 'learning', label: 'Learning', value: day.learningDone ? 1 : 0 }
  ];

  // TradeIQ only counts on weekends; Slotly is a bonus there.
  const items = type === 'weekday'
    ? [
      { key: 'slotlyProduct', label: 'Slotly product moved', value: slotlyProduct ? 1 : 0 },
      { key: 'slotlyCustomers', label: 'Slotly customer activity', value: slotlyCustomers ? 1 : 0 },
      ...shared
    ]
    : [
      { key: 'tradeiq', label: 'TradeIQ session', value: tradeiq ? 1 : 0 },
      ...shared,
      { key: 'slotly', label: 'Slotly (bonus)', value: (slotlyProduct || slotlyCustomers) ? 1 : 0, bonus: true }
    ];

  const core = items.filter(i => !i.bonus);
  const points = Math.round(core.reduce((sum, i) => sum + i.value, 0) * 10) / 10;
  const mainMoved = type === 'weekday'
    ? (slotlyProduct || slotlyCustomers)
    : (tradeiq || slotlyProduct || slotlyCustomers);

  return { items, points, max: core.length, mainMoved, slotlyProduct, slotlyCustomers, tradeiq };
}

// Consecutive days the main mission moved. An unfinished weekend day doesn't
// break the streak — focus means not doing everything every day.
async function computeStreak(userId, today) {
  const done = (await storage.find('progress', userId, { isCompleted: true })).filter(d => (d.schemaVersion || 1) >= 2);
  const dates = new Set(done.map(d => d.date));
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let count = 0;
  for (let guard = 0; guard < 3660; guard++) {
    if (dates.has(cursor)) count++;
    else if (!isWeekend(cursor)) break;
    cursor = addDays(cursor, -1);
  }
  const last = [...dates].sort().pop() || null;
  return { count, lastCompletedDate: last };
}

async function saveScore(userId, day, score) {
  if (day.score === score.points && day.maxScore === score.max && Boolean(day.isCompleted) === score.mainMoved) return day;
  return storage.update('progress', userId, day._id, {
    score: score.points, maxScore: score.max, isCompleted: score.mainMoved
  });
}

function videosPostedOn(content, date) {
  return content.filter(c => c.stream === 'products' && c.postedDate === date).length;
}

// Everything the Today page (and the coach) needs, in one call.
async function buildToday(userId) {
  await storage.ensureSetup(userId);
  const today = todayStr();
  const type = dayType(today);
  const hour = currentHour();
  const user = await storage.findUserById(userId);
  let day = await getOrCreateDay(userId, today, user);

  const [content, leads, projects, learning, products, lastReview] = await Promise.all([
    storage.find('calendar', userId, {}, { date: 1, createdAt: 1 }),
    storage.find('leads', userId),
    storage.find('projects', userId),
    storage.find('learning', userId, {}, { createdAt: 1 }),
    storage.find('products', userId, {}, { createdAt: 1 }),
    storage.findOne('reviews', userId, { weekStart: addDays(weekStart(today), -7) })
  ]);

  const videosPosted = videosPostedOn(content, today);
  const score = scoreDay(day, type, videosPosted);
  day = await saveScore(userId, day, score);
  const streak = await computeStreak(userId, today);

  const slotlyItems = content.filter(c => c.stream === 'slotly').sort((a, b) => (a.day || 0) - (b.day || 0));
  const slotlyPost = slotlyItems.find(c => c.date === today) ||
    slotlyItems.find(c => c.date > today && c.status !== 'posted') || null;
  const slotly = projects.find(p => p.key === 'slotly') || null;
  const tradeiq = projects.find(p => p.key === 'tradeiq') || null;
  const parked = projects.filter(p => p.kind === 'parked');

  return {
    date: today,
    dayType: type,
    hour,
    phase: type !== 'weekday' ? 'weekend' : (hour < EVENING_HOUR ? 'main' : 'evening'),
    day,
    score,
    streak,
    videos: content.filter(c => c.stream === 'products' && c.date === today),
    videosPosted,
    videoTarget: VIDEO_TARGET,
    slotly,
    slotlyStats: prospectStats(leads, today),
    slotlyPost,
    tradeiq,
    tradeiqTouchedOnWeekday: type === 'weekday' && Boolean(tradeiq) && toDateStr(tradeiq.updatedAt) === today &&
      toDateStr(tradeiq.createdAt) !== today,
    learning: learning[0] || null,
    products: products.filter(p => p.status !== 'archived').map(p => ({ _id: p._id, name: p.name })),
    parkedCount: parked.filter(p => p.status !== 'active').length,
    ideasThisWeek: parked.filter(p => p.dateAdded && p.dateAdded >= addDays(today, -6)).length,
    weekOutcome: lastReview ? lastReview.nextWeekOutcome : '',
    isReviewDay: type === 'sunday',
    user
  };
}

module.exports = {
  VIDEO_TARGET,
  CLINIC_STAGES,
  prospectStats,
  getOrCreateDay,
  scoreDay,
  computeStreak,
  saveScore,
  videosPostedOn,
  buildToday
};
