let T = null; // payload from /api/tracker/today

const PHASES = {
  main: 'Main hours → Slotly',
  evening: 'Evening → Digital products + content',
  weekend: 'Weekend → TradeIQ'
};
const NEEDLE_LABELS = { build: 'Build', customers: 'Customers', validation: 'Validation' };

const $ = id => document.getElementById(id);

async function initTodayPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('today');
  await loadToday();
  bindEvents();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function loadToday() {
  try {
    const data = await API.get('/api/tracker/today');
    if (!data) return;
    T = data;
    renderAll();
  } catch (err) {
    API.showToast('Failed to load today.');
  }
}

const refreshCoach = API.debounce(() => {
  if (window.HarshCoachWidget) window.HarshCoachWidget.refreshAssessment(true);
}, 1500);

// Save part of today's record; the server answers with the full recalculated day.
async function saveDay(patch) {
  try {
    const wasMoved = T.score.mainMoved;
    const res = await API.put('/api/tracker/today', patch);
    if (!res) return;
    T = res;
    renderScore();
    refreshCoach();
    if (!wasMoved && T.score.mainMoved) {
      API.showToast(T.dayType === 'weekday' ? '🔥 Slotly moved today. That counts.' : '🔥 Main mission moved today.');
    }
  } catch (err) {
    API.showToast('Could not save — check your connection.');
  }
}

function renderAll() {
  $('dateLabel').textContent = API.fmtDate(T.date, { weekday: 'long', month: 'long', day: 'numeric' });
  $('phaseLabel').textContent = PHASES[T.phase] || '';
  renderScore();
  renderBanners();
  renderSlotly();
  renderContent();
  renderLearning();
  renderWeekend();
  $('parkedCount').textContent = T.parkedCount;
  arrangeSections();
}

function renderScore() {
  $('scoreNum').textContent = T.score.points;
  $('scoreMax').textContent = T.score.max;
  $('streakNum').textContent = T.streak.count;
  $('scoreItems').innerHTML = T.score.items.map(i => {
    const cls = i.value >= 1 ? 'on' : (i.value > 0 ? 'half' : '');
    const mark = i.value >= 1 ? '✓' : (i.value > 0 ? '◐' : '○');
    return `<span class="${cls}">${mark} ${API.esc(i.label)}</span>`;
  }).join('');
  $('postedCount').textContent = `${T.videosPosted} / ${T.videoTarget} posted today`;
  $('postedCount').classList.toggle('met', T.videosPosted >= T.videoTarget);
}

function renderBanners() {
  const parts = [];
  if (T.isReviewDay) {
    parts.push(`<div class="banner">🗒️ It's Sunday — time for your weekly review. <a href="/review.html">Open review →</a></div>`);
  }
  if (T.weekOutcome) {
    parts.push(`<div class="banner" style="background:var(--success-bg);">🎯 This week's ONE outcome: <b>${API.esc(T.weekOutcome)}</b></div>`);
  }
  $('banners').innerHTML = parts.join('');
}

// ---------- Slotly ----------

function renderSlotly() {
  const day = T.day;
  $('missionInput').value = day.mission || '';
  $('missionDone').checked = Boolean(day.missionDone);
  $('missionRow').classList.toggle('done', Boolean(day.missionDone));
  renderChecklist();
  renderNeedle();

  const slotly = T.slotly || {};
  $('milestoneText').textContent = slotly.milestone || 'Set a milestone on the Focus page';
  $('slotlyProgress').style.width = (slotly.progress || 0) + '%';
  $('slotlyProgressPct').textContent = (slotly.progress || 0) + '%';

  const s = T.slotlyStats;
  const stat = (n, label, alert) => `<a href="/clinics.html" class="${alert && n > 0 ? 'alert' : ''}"><b>${n}</b> ${label}</a>`;
  $('slotlyStats').innerHTML = [
    stat(s.contacted, 'contacted'),
    stat(s.followUpsDue, 'follow-ups due', true),
    stat(s.demosBooked, 'demos booked'),
    stat(s.testing, 'clinics testing'),
    stat(s.paying, 'paying')
  ].join('');

  renderSlotlyPost();
}

function renderChecklist() {
  const list = T.day.slotlyChecklist || [];
  $('slotlyChecklist').innerHTML = list.map((item, i) => `
    <li class="check-row ${item.done ? 'done' : ''}" data-idx="${i}">
      <input type="checkbox" data-act="toggle" ${item.done ? 'checked' : ''}>
      <input type="text" class="row-text" data-act="label" value="${API.esc(item.label)}">
      <button class="btn-mini" data-act="remove" title="Remove from checklist">✕</button>
    </li>`).join('');
}

function renderNeedle() {
  const list = T.day.needle || [];
  $('needleList').innerHTML = list.length ? list.map((n, i) => `
    <li class="check-row ${n.done ? 'done' : ''}" data-idx="${i}">
      <input type="checkbox" data-act="toggle" ${n.done ? 'checked' : ''}>
      <span class="tag-pill ${n.category}">${NEEDLE_LABELS[n.category] || n.category}</span>
      <span class="row-text">${API.esc(n.text)}</span>
      <button class="btn-mini" data-act="remove" title="Remove">✕</button>
    </li>`).join('') : '<li class="muted small mono" style="padding:4px 0;">No actions logged yet. What will actually move Slotly today?</li>';
}

function renderSlotlyPost() {
  const el = $('slotlyPost');
  const post = T.slotlyPost;
  if (!post) {
    el.classList.add('hidden');
    return;
  }
  const isToday = post.date === T.date;
  el.classList.remove('hidden');
  el.innerHTML = `
    <span class="t">📣 <b>Slotly post${isToday ? ' today' : ' next'}</b> · Day ${post.day}${isToday ? '' : ' (' + API.fmtDate(post.date) + ')'}: ${API.esc(post.title)}</span>
    <select class="compact" id="slotlyPostStatus">${API.options(API.CONTENT_STATUSES, post.status)}</select>
    ${post.status === 'posted' ? '<span class="badge badge-teal">Posted</span>' : '<button class="btn-outline" id="slotlyPostedBtn">Posted ✓</button>'}
  `;
}

// ---------- Content ----------

function productOptionsFor(value) {
  const options = [['', 'Product / topic'], ...T.products.map(p => p.name), 'General tech'];
  return value && !options.some(o => (Array.isArray(o) ? o[0] : o) === value) ? [...options, value] : options;
}

function videoRowHtml(v, i) {
  return `
    <div class="video-row ${v.status === 'posted' ? 'posted' : ''}" data-id="${v._id || ''}">
      <div class="video-label"><span>VIDEO ${i + 1}</span><span>${v.status === 'posted' ? '✓ posted' : ''}</span></div>
      <input type="text" class="full" data-v="title" value="${API.esc(v.title || '')}" placeholder="What am I uploading?">
      <div class="video-controls">
        <select class="compact" data-v="status">${API.options(API.CONTENT_STATUSES, v.status || 'idea')}</select>
        <select class="compact" data-v="platform">${API.options(API.PLATFORMS.map(p => [p, p || 'Platform']), v.platform || '')}</select>
        <select class="compact" data-v="product">${API.options(productOptionsFor(v.product), v.product || '')}</select>
      </div>
    </div>`;
}

function renderContent() {
  const videos = T.videos || [];
  const rows = Math.max(T.videoTarget, videos.length);
  let html = '';
  for (let i = 0; i < rows; i++) html += videoRowHtml(videos[i] || {}, i);
  $('videoRows').innerHTML = html;
  $('productWork').checked = Boolean(T.day.productWork);
  $('productWorkNote').value = T.day.productWorkNote || '';
}

async function saveVideo(row, field, value) {
  try {
    // Wait for a create that's still in flight so we don't make duplicates.
    if (row._creating) await row._creating;
    if (row.dataset.id) {
      await API.put(`/api/content/${row.dataset.id}`, { [field]: value });
    } else {
      const body = { stream: 'products', date: T.date };
      row.querySelectorAll('[data-v]').forEach(el => { body[el.dataset.v] = el.value; });
      row._creating = API.post('/api/content', body);
      const res = await row._creating;
      row._creating = null;
      if (res && res.item) row.dataset.id = res.item._id;
    }
    if (field === 'status') {
      const res = await API.get('/api/tracker/today');
      if (res) {
        T = res;
        renderScore();
        row.classList.toggle('posted', value === 'posted');
        row.querySelector('.video-label span:last-child').textContent = value === 'posted' ? '✓ posted' : '';
        refreshCoach();
        if (value === 'posted') {
          API.showToast(T.videosPosted >= T.videoTarget ? `🎥 ${T.videosPosted} posted — target hit!` : `🎥 Posted. ${T.videoTarget - T.videosPosted} to go.`);
        }
      }
    }
  } catch (err) {
    row._creating = null;
    API.showToast('Could not save the video.');
  }
}

// ---------- Learning ----------

function renderLearning() {
  const l = T.learning;
  $('learningRow').innerHTML = l ? `
    <b style="color:var(--ink);">${API.esc(l.name)}</b>
    · module <input type="text" class="compact module" data-l="currentModule" value="${API.esc(l.currentModule || '')}" placeholder="e.g. Module 3: Headlines">
    · done <input type="number" min="0" class="compact" data-l="modulesCompleted" value="${l.modulesCompleted || 0}">
    / <input type="number" min="0" class="compact" data-l="totalModules" value="${l.totalModules || 0}">
  ` : 'No learning track yet — add one on the <a href="/focus.html#learning">Focus page</a>.';
  $('learningNote').value = T.day.learningNote || '';
  $('learningDone').checked = Boolean(T.day.learningDone);
}

// ---------- TradeIQ ----------

function renderWeekend() {
  const sec = $('secWeekend');
  const tq = T.tradeiq || {};
  if (T.dayType === 'weekday') {
    sec.className = 'os-section quiet';
    sec.innerHTML = `
      <div class="section-head" style="margin-bottom:4px;">
        <span class="section-label">🗓️ Weekend · TradeIQ</span>
        <a class="section-meta" href="/focus.html#tradeiq">details →</a>
      </div>
      <div class="small muted">Next milestone: <b>${API.esc(tq.milestone || 'not set')}</b>${tq.nextTask ? ' · next task: ' + API.esc(tq.nextTask) : ''}</div>
      <div class="small muted mono" style="margin-top:4px;">Parked until Saturday. Slotly first.</div>`;
    return;
  }
  const list = T.day.tradeiqChecklist || [];
  sec.className = 'os-section primary';
  sec.innerHTML = `
    <div class="section-head">
      <span class="section-label">🗓️ TradeIQ weekend session · ${T.dayType === 'saturday' ? 'Saturday' : 'Sunday'}</span>
      <a class="section-meta" href="/focus.html#tradeiq">details →</a>
    </div>
    <ul class="check-list" id="tradeiqChecklist">
      ${list.map((item, i) => `
        <li class="check-row ${item.done ? 'done' : ''}" data-idx="${i}">
          <input type="checkbox" ${item.done ? 'checked' : ''}>
          <span class="row-text">${API.esc(item.label)}</span>
        </li>`).join('')}
    </ul>
    <label class="field-label">Milestone</label>
    <div class="progress-row">
      <span>${API.esc(tq.milestone || 'not set')}</span>
      <div class="progress-track"><div class="progress-fill" style="width:${tq.progress || 0}%"></div></div>
      <span>${tq.progress || 0}%</span>
    </div>
    <label class="field-label" for="tradeiqNextTask">Next task</label>
    <input type="text" class="full compact" id="tradeiqNextTask" value="${API.esc(tq.nextTask || '')}" placeholder="What's the one thing to build this session?">`;
}

// Weekends lead with TradeIQ; Slotly stays available but secondary.
function arrangeSections() {
  const container = $('sections');
  const order = T.dayType === 'weekday'
    ? ['secSlotly', 'secContent', 'secLearning', 'secWeekend', 'secParking']
    : ['secWeekend', 'secContent', 'secLearning', 'secSlotly', 'secParking'];
  order.forEach(id => container.appendChild($(id)));
  $('secSlotly').classList.toggle('primary', T.dayType === 'weekday');
  $('secSlotly').querySelector('.section-label').textContent =
    T.dayType === 'weekday' ? '🔥 Main mission · Slotly' : '🔥 Slotly (optional on weekends)';
}

// ---------- Events ----------

function bindEvents() {
  // Mission
  const saveMission = API.debounce(() => saveDay({ mission: $('missionInput').value }), 700);
  $('missionInput').addEventListener('input', saveMission);
  $('missionDone').addEventListener('change', e => {
    $('missionRow').classList.toggle('done', e.target.checked);
    saveDay({ missionDone: e.target.checked });
  });

  // Slotly checklist
  const saveChecklist = () => saveDay({ slotlyChecklist: T.day.slotlyChecklist });
  const saveChecklistLater = API.debounce(saveChecklist, 800);
  $('slotlyChecklist').addEventListener('change', e => {
    const li = e.target.closest('[data-idx]');
    if (!li || e.target.dataset.act !== 'toggle') return;
    T.day.slotlyChecklist[li.dataset.idx].done = e.target.checked;
    li.classList.toggle('done', e.target.checked);
    saveChecklist();
  });
  $('slotlyChecklist').addEventListener('input', e => {
    const li = e.target.closest('[data-idx]');
    if (!li || e.target.dataset.act !== 'label') return;
    T.day.slotlyChecklist[li.dataset.idx].label = e.target.value;
    saveChecklistLater();
  });
  $('slotlyChecklist').addEventListener('click', e => {
    const li = e.target.closest('[data-idx]');
    if (!li || e.target.dataset.act !== 'remove') return;
    T.day.slotlyChecklist.splice(Number(li.dataset.idx), 1);
    renderChecklist();
    saveChecklist();
  });
  $('addChecklistBtn').addEventListener('click', () => {
    T.day.slotlyChecklist = T.day.slotlyChecklist || [];
    T.day.slotlyChecklist.push({ label: '', tag: '', done: false });
    renderChecklist();
    const inputs = $('slotlyChecklist').querySelectorAll('.row-text');
    inputs[inputs.length - 1].focus();
  });

  // Push the needle
  $('needleForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('needleText').value.trim();
    if (!text) return;
    T.day.needle = T.day.needle || [];
    T.day.needle.push({ category: $('needleCategory').value, text, done: true });
    $('needleText').value = '';
    renderNeedle();
    saveDay({ needle: T.day.needle });
  });
  $('needleList').addEventListener('change', e => {
    const li = e.target.closest('[data-idx]');
    if (!li) return;
    T.day.needle[li.dataset.idx].done = e.target.checked;
    li.classList.toggle('done', e.target.checked);
    saveDay({ needle: T.day.needle });
  });
  $('needleList').addEventListener('click', e => {
    const li = e.target.closest('[data-idx]');
    if (!li || e.target.dataset.act !== 'remove') return;
    T.day.needle.splice(Number(li.dataset.idx), 1);
    renderNeedle();
    saveDay({ needle: T.day.needle });
  });

  // Slotly marketing post
  $('slotlyPost').addEventListener('change', async e => {
    if (e.target.id !== 'slotlyPostStatus') return;
    const res = await API.put(`/api/content/${T.slotlyPost._id}`, { status: e.target.value }).catch(() => null);
    if (res && res.item) {
      T.slotlyPost = res.item;
      renderSlotlyPost();
    }
  });
  $('slotlyPost').addEventListener('click', async e => {
    if (e.target.id !== 'slotlyPostedBtn') return;
    const res = await API.post(`/api/content/${T.slotlyPost._id}/posted`).catch(() => null);
    if (res && res.item) {
      T.slotlyPost = res.item;
      renderSlotlyPost();
      API.showToast('📣 Slotly post marked as posted.');
    }
  });

  // Videos
  const videoTimers = new WeakMap();
  $('videoRows').addEventListener('input', e => {
    const el = e.target.closest('[data-v="title"]');
    if (!el) return;
    const row = el.closest('.video-row');
    clearTimeout(videoTimers.get(el));
    videoTimers.set(el, setTimeout(() => saveVideo(row, 'title', el.value), 700));
  });
  $('videoRows').addEventListener('change', e => {
    const el = e.target.closest('[data-v]');
    if (!el) return;
    clearTimeout(videoTimers.get(el));
    saveVideo(el.closest('.video-row'), el.dataset.v, el.value);
  });
  $('addVideoBtn').addEventListener('click', () => {
    const count = $('videoRows').querySelectorAll('.video-row').length;
    $('videoRows').insertAdjacentHTML('beforeend', videoRowHtml({}, count));
    $('videoRows').lastElementChild.querySelector('input').focus();
  });

  // Product work
  $('productWork').addEventListener('change', e => saveDay({ productWork: e.target.checked }));
  $('productWorkNote').addEventListener('input', API.debounce(() => saveDay({ productWorkNote: $('productWorkNote').value }), 700));

  // Learning
  $('learningNote').addEventListener('input', API.debounce(() => saveDay({ learningNote: $('learningNote').value }), 700));
  $('learningDone').addEventListener('change', e => saveDay({ learningDone: e.target.checked }));
  const saveLearning = API.debounce(async el => {
    if (!T.learning) return;
    const value = el.type === 'number' ? Number(el.value) : el.value;
    await API.put(`/api/learning/${T.learning._id}`, { [el.dataset.l]: value }).catch(() => API.showToast('Could not save learning.'));
  }, 600);
  $('learningRow').addEventListener('input', e => { if (e.target.dataset.l) saveLearning(e.target); });

  // TradeIQ (weekends)
  $('secWeekend').addEventListener('change', e => {
    const li = e.target.closest('#tradeiqChecklist [data-idx]');
    if (!li) return;
    T.day.tradeiqChecklist[li.dataset.idx].done = e.target.checked;
    li.classList.toggle('done', e.target.checked);
    saveDay({ tradeiqChecklist: T.day.tradeiqChecklist });
  });
  $('secWeekend').addEventListener('input', API.debounce(e => {
    if (e.target.id !== 'tradeiqNextTask' || !T.tradeiq) return;
    API.put(`/api/projects/${T.tradeiq._id}`, { nextTask: e.target.value }).catch(() => API.showToast('Could not save.'));
  }, 700));

  // Parking lot
  $('parkForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('parkInput').value.trim();
    if (!name) return;
    const res = await API.post('/api/projects', { name }).catch(() => null);
    if (res && res.success) {
      $('parkInput').value = '';
      T.parkedCount++;
      $('parkedCount').textContent = T.parkedCount;
      API.showToast('💡 Parked. It\'s safe — back to the main mission.');
      refreshCoach();
    }
  });

  // Reset
  $('resetBtn').addEventListener('click', async () => {
    if (!confirm('Uncheck everything for today? Your text stays.')) return;
    const res = await API.post('/api/tracker/reset').catch(() => null);
    if (res) {
      T = res;
      renderAll();
      refreshCoach();
      API.showToast('Today has been unchecked.');
    }
  });
}

initTodayPage();
