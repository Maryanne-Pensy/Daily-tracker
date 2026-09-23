// End-to-end test: starts the server in local-JSON mode against a throwaway
// database shaped like the old copywriting tracker, checks the old records are
// hidden (not deleted)
// and every Builder OS endpoint. Run with: npm test
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const { todayStr, addDays } = require('./utils/dates');

const PORT = 3999;
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-os-test-'));
const DB_PATH = path.join(TMP_DIR, 'db.json');
const EMAIL = 'tester@example.com';
const PASSWORD = 'password123';

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost', port: PORT, path: urlPath, method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (e) { /* not JSON */ }
        resolve({ status: res.statusCode, body: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function writeLegacyDb() {
  const userId = 'user_legacy';
  const today = todayStr();
  const legacyDay = (date, count) => ({
    _id: 'prog_' + date, userId, date,
    checked: [0, 1, 2, 3, 4, 5].map(i => i < count),
    completedCount: count, isCompleted: count === 6, notes: '', updatedAt: new Date().toISOString()
  });
  const db = {
    users: [{
      _id: userId, username: 'Tester', email: EMAIL, password: bcrypt.hashSync(PASSWORD, 8),
      streak: { count: 3, lastCompletedDate: '2026-09-16' },
      coachSettings: { personality: 'ramsay' }, createdAt: new Date().toISOString()
    }],
    progress: [legacyDay('2026-09-14', 6), legacyDay('2026-09-15', 6), legacyDay(addDays(today, -1), 6)],
    calendar: Array.from({ length: 30 }, (_, i) => ({
      _id: 'cal_' + (i + 1), userId, day: i + 1, date: addDays('2026-09-07', i * 2),
      title: 'Copywriting topic ' + (i + 1), status: i < 4 ? 'posted' : 'pending',
      script: i === 0 ? 'old script' : '', notes: '', updatedAt: new Date().toISOString()
    })),
    leads: [{
      _id: 'lead_old', userId, clientName: 'EcoSocks', storeUrl: 'https://ecosocks.example.com',
      emailGaps: 'no post-purchase flow', pitchSample: 'Subject: ...', status: 'drafted',
      contactEmail: '', notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }]
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await request('GET', '/api/status');
      if (res.status === 200) return res.body;
    } catch (e) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Server did not start');
}

async function run() {
  const today = todayStr();

  const status = await waitForServer();
  assert.strictEqual(status.today, today, 'server and test agree on today');

  const reg = await request('POST', '/api/auth/register', { username: 'x', email: 'x@x.com', password: 'secret1' });
  assert.strictEqual(reg.status, 403, 'public registration stays disabled');

  const login = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  assert.strictEqual(login.status, 200, 'login works');
  const token = login.body.token;
  const api = (method, p, body) => request(method, p, body, token);

  // --- Migration
  let t = (await api('GET', '/api/tracker/today')).body;
  // Old-tracker records are hidden everywhere (but not deleted)
  assert.strictEqual((await api('GET', '/api/content?stream=copywriting')).body.items.length, 0, 'old calendar hidden');
  assert.strictEqual((await api('GET', '/api/content?stream=legacy')).body.items.length, 0, 'legacy stream hidden');
  assert.strictEqual((await api('GET', '/api/content')).body.items.length, 30, 'only the Slotly plan is visible');
  assert.strictEqual((await api('PUT', '/api/content/cal_1', { title: 'x' })).status, 404, 'old items not editable');
  const slotly = (await api('GET', '/api/content?stream=slotly')).body.items;
  assert.strictEqual(slotly.length, 30, 'Slotly 30-day plan seeded');
  assert.strictEqual(slotly[0].date, today, 'plan starts today');
  assert.strictEqual((await api('GET', '/api/prospects')).body.items.length, 0, 'old lead hidden');
  assert.strictEqual((await api('GET', '/api/prospects?kind=legacy')).body.items.length, 0, 'old lead hidden by kind too');
  const hist = (await api('GET', '/api/tracker/history')).body.history;
  assert.ok(hist.every(h => h.date === today), 'old daily sheets hidden from history');
  assert.strictEqual(t.streak.count, 0, 'old sheets do not count toward the streak');
  const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  assert.strictEqual(raw.calendar.filter(c => c.stream === 'legacy').length, 30, 'old calendar still stored');
  assert.strictEqual(raw.leads.filter(l => l.kind === 'legacy').length, 1, 'old lead still stored');
  assert.strictEqual(raw.progress.filter(d => d.checked).length, 3, 'old daily sheets still stored');
  assert.strictEqual(t.parkedCount, 1, 'gym/salon project parked');
  assert.strictEqual(t.products[0].name, 'Cybersecurity Guide');
  assert.strictEqual(t.learning.name, 'Copywriting Course');
  assert.strictEqual(t.day.slotlyChecklist.length, 4);

  // Setup is idempotent (second login/run doesn't duplicate)
  await api('GET', '/api/tracker/today');
  assert.strictEqual((await api('GET', '/api/content?stream=slotly')).body.items.length, 30);

  // --- Today: mission + needle + score + streak
  t = (await api('PUT', '/api/tracker/today', { mission: 'Finish payment integration', missionDone: true })).body;
  assert.strictEqual(t.day.mission, 'Finish payment integration');
  assert.ok(t.score.mainMoved, 'mission done moves the main mission');
  assert.strictEqual(t.streak.count, 1, 'today counts once the main mission moves');
  t = (await api('PUT', '/api/tracker/today', {
    needle: [{ category: 'customers', text: 'DM 5 clinics', done: true }],
    productWork: true, learningDone: true
  })).body;
  assert.strictEqual(t.score.points, t.dayType === 'weekday' ? 4 : 2);

  // Checklist label edits become tomorrow's defaults
  const checklist = t.day.slotlyChecklist.map(i => ({ ...i }));
  checklist[0].label = 'Ship one Slotly improvement';
  t = (await api('PUT', '/api/tracker/today', { slotlyChecklist: checklist })).body;
  assert.strictEqual(t.day.slotlyChecklist[0].label, 'Ship one Slotly improvement');

  // --- Videos: 2 posted today
  const v1 = (await api('POST', '/api/content', { title: 'Phishing mistakes', product: 'Cybersecurity Guide' })).body.item;
  assert.strictEqual(v1.stream, 'products');
  assert.strictEqual(v1.date, today);
  await api('POST', `/api/content/${v1._id}/posted`);
  const v2 = (await api('POST', '/api/content', { title: 'Protect your accounts', status: 'edited' })).body.item;
  await api('PUT', `/api/content/${v2._id}`, { status: 'posted' });
  t = (await api('GET', '/api/tracker/today')).body;
  assert.strictEqual(t.videosPosted, 2, '2 videos posted today');
  assert.strictEqual(t.videos.length, 2);
  const back = (await api('PUT', `/api/content/${v2._id}`, { status: 'edited' })).body.item;
  assert.strictEqual(back.postedDate, '', 'un-posting clears posted date');

  // --- Clinic prospects
  const lead = (await api('POST', '/api/prospects', { name: 'Glow Aesthetics', link: 'instagram.com/glow' })).body.item;
  const contacted = (await api('POST', `/api/prospects/${lead._id}/contacted`)).body.item;
  assert.strictEqual(contacted.status, 'contacted');
  assert.strictEqual(contacted.nextFollowUp, addDays(today, 3));
  await api('PUT', `/api/prospects/${lead._id}`, { status: 'demo_booked' });
  const pl = (await api('GET', '/api/prospects')).body.stats;
  assert.deepStrictEqual([pl.prospects, pl.contacted, pl.replies, pl.demosBooked, pl.paying], [1, 1, 1, 1, 0]);

  // --- Parking lot, TradeIQ, learning
  const idea = (await api('POST', '/api/projects', { name: 'AI tools directory' })).body.item;
  assert.strictEqual(idea.kind, 'parked', 'new projects always go to the parking lot');
  t = (await api('GET', '/api/tracker/today')).body;
  assert.strictEqual(t.parkedCount, 2);
  const tradeiq = (await api('GET', '/api/projects?key=tradeiq')).body.items[0];
  assert.strictEqual((await api('DELETE', `/api/projects/${tradeiq._id}`)).status, 400, 'built-in projects can\'t be deleted');
  const lp = (await api('PUT', `/api/projects/${tradeiq._id}`, { progress: 250 })).body.item;
  assert.strictEqual(lp.progress, 100, 'progress clamped');

  // --- Weekly review
  const review = (await api('GET', '/api/review')).body;
  assert.strictEqual(review.stats.products.videosPosted, 1);
  assert.strictEqual(review.stats.slotly.contactedThisWeek, 1);
  await api('PUT', '/api/review', { weekStart: review.weekStart, nextWeekOutcome: 'First paid trial' });
  assert.strictEqual((await api('GET', '/api/review')).body.answers.nextWeekOutcome, 'First paid trial');

  // --- Coach + settings merge
  const coach = (await api('GET', '/api/coach/assessment')).body;
  assert.ok(coach.headline && coach.roast && coach.situation, 'coach answers');
  assert.strictEqual(coach.personality, 'ramsay');
  await api('PUT', '/api/auth/settings', { coachSettings: { voiceEnabled: true } });
  await api('PUT', '/api/auth/settings', { coachSettings: { personality: 'mom' } });
  const me = (await api('GET', '/api/auth/me')).body.user;
  assert.strictEqual(me.coachSettings.personality, 'mom');
  assert.strictEqual(me.coachSettings.voiceEnabled, true, 'changing personality keeps voice setting');
  const shred = (await api('POST', '/api/coach/shred-excuse', { excuse: "I'd rather work on a new idea" })).body;
  assert.ok(shred.shredded);

  // --- Pages and redirects
  for (const page of ['/today', '/clinics', '/content', '/products', '/focus', '/review', '/history', '/coach']) {
    assert.strictEqual((await request('GET', page)).status, 200, page);
  }
  assert.strictEqual((await request('GET', '/calendar')).status, 302);
  assert.strictEqual((await api('GET', '/api/nope')).status, 404);
}

writeLegacyDb();
const server = spawn(process.execPath, ['server.js'], {
  cwd: __dirname,
  env: {
    ...process.env,
    PORT: String(PORT),
    LOCAL_DB_PATH: DB_PATH,
    MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
    GEMINI_API_KEY: ''
  },
  stdio: ['ignore', 'ignore', 'pipe']
});
let serverErrors = '';
server.stderr.on('data', d => { serverErrors += d; });

run()
  .then(() => {
    console.log('All Builder OS tests passed.');
    server.kill();
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err.message);
    if (serverErrors) console.error(serverErrors.split('\n').filter(l => !l.includes('MongoDB')).join('\n'));
    server.kill();
    process.exit(1);
  });
