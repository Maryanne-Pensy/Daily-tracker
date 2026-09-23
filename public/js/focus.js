const PARKED_STATUSES = [['idea', 'Idea'], ['parked', 'Parked'], ['research_later', 'Research later'], ['active', 'Active']];
const APPLIED_TO = [['slotly', 'Slotly'], ['products', 'Digital products'], ['other', 'Other']];

let projects = [];
let tracks = [];
let today = '';

const $ = id => document.getElementById(id);

async function initFocusPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('focus');
  const status = await fetch('/api/status').then(r => r.json()).catch(() => ({}));
  today = status.today || new Date().toISOString().slice(0, 10);
  await loadAll();
  setupEvents();
  if (location.hash && $(location.hash.slice(1))) $(location.hash.slice(1)).scrollIntoView();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function loadAll() {
  try {
    const [projectRes, learningRes] = await Promise.all([API.get('/api/projects'), API.get('/api/learning')]);
    projects = projectRes ? projectRes.items : [];
    tracks = learningRes ? learningRes.items : [];
    renderProject('slotly', '🔥 Slotly · main mission', 'Main working hours. Everything that moves Slotly toward the first paying clinic.');
    renderProject('tradeiq', '🗓️ TradeIQ · weekend project', 'Saturday & Sunday only. The session checklist appears on Today on weekends.');
    renderLearning();
    renderParked();
  } catch (err) {
    API.showToast('Failed to load.');
  }
}

function renderProject(key, title, hint) {
  const p = projects.find(x => x.key === key);
  const sec = $(key);
  if (!p) {
    sec.innerHTML = '';
    return;
  }
  sec.dataset.id = p._id;
  sec.innerHTML = `
    <div class="section-head">
      <span class="section-label">${title}</span>
      <span class="section-meta">${hint}</span>
    </div>
    <label class="field-label">Current milestone</label>
    <input type="text" class="full" data-field="milestone" value="${API.esc(p.milestone || '')}" placeholder="e.g. Payments live + first clinic onboarded">
    <label class="field-label">Progress toward milestone</label>
    <div class="range-row">
      <input type="range" min="0" max="100" step="5" data-field="progress" value="${p.progress || 0}">
      <span class="mono small" data-progress-label>${p.progress || 0}%</span>
    </div>
    <label class="field-label">Next task</label>
    <input type="text" class="full" data-field="nextTask" value="${API.esc(p.nextTask || '')}">
    <label class="field-label">Notes</label>
    <textarea class="full" rows="3" data-field="notes">${API.esc(p.notes || '')}</textarea>`;
}

function renderLearning() {
  const sec = $('learning');
  sec.innerHTML = `
    <div class="section-head">
      <span class="section-label">🧠 Learning</span>
      <span class="section-meta">Learn copywriting → apply it to my own products</span>
    </div>
    ${tracks.map(trackHtml).join('')}
    <button class="link-btn" id="addTrackBtn">+ add another learning track</button>`;
}

function trackHtml(t) {
  const lessons = t.lessons || [];
  const applied = key => (APPLIED_TO.find(a => a[0] === key) || [key, key])[1];
  return `
  <div class="track" data-id="${t._id}" style="margin-bottom:16px;">
    <input type="text" class="item-title" data-field="name" value="${API.esc(t.name)}" style="font-size:16px;padding-left:0;">
    <div class="form-grid">
      <div><label class="field-label">Current lesson / module</label><input type="text" data-field="currentModule" value="${API.esc(t.currentModule || '')}"></div>
      <div><label class="field-label">Modules done / total</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="number" min="0" data-field="modulesCompleted" value="${t.modulesCompleted || 0}">
          <span>/</span>
          <input type="number" min="0" data-field="totalModules" value="${t.totalModules || 0}">
        </div>
      </div>
      <div class="span-2"><label class="field-label">Notes</label><textarea rows="2" data-field="notes">${API.esc(t.notes || '')}</textarea></div>
    </div>
    <label class="field-label">Key lessons — and where I applied them</label>
    <div class="lessons">
      ${lessons.map((l, i) => `
        <div class="lesson-row" data-idx="${i}">
          <span class="t">${API.esc(l.text)}</span>
          <span class="tag-pill">${API.esc(applied(l.appliedTo))}</span>
          <span class="item-meta">${API.esc(API.fmtDate(l.date))}</span>
          <button class="btn-mini" data-act="remove-lesson">✕</button>
        </div>`).join('') || '<div class="small muted mono">No lessons saved yet.</div>'}
    </div>
    <form class="add-row lesson-form">
      <input type="text" class="compact" name="text" placeholder="Key lesson (e.g. Lead with the outcome, not the feature)">
      <select class="compact" name="appliedTo">${API.options(APPLIED_TO, 'slotly')}</select>
      <button type="submit" class="btn-outline">Save</button>
    </form>
  </div>`;
}

function renderParked() {
  const parked = projects.filter(p => p.kind === 'parked')
    .sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  $('parkedList').innerHTML = parked.length ? parked.map(p => `
    <div class="item-row" data-id="${p._id}">
      <div class="item-main">
        <input type="text" class="item-title" data-field="name" value="${API.esc(p.name)}">
        <select class="compact" data-field="status">${API.options(PARKED_STATUSES, p.status)}</select>
        <span class="item-meta">added ${API.esc(API.fmtDate(p.dateAdded) || '—')}</span>
        <button class="btn-mini" data-act="toggle" title="Details">▾</button>
      </div>
      <div class="item-details">
        <div class="form-grid">
          <div class="span-2"><label class="field-label">Description</label><textarea rows="2" data-field="description">${API.esc(p.description || '')}</textarea></div>
          <div class="span-2"><label class="field-label">Why it's interesting</label><textarea rows="2" data-field="whyInteresting">${API.esc(p.whyInteresting || '')}</textarea></div>
          <div><label class="field-label">Potential customer</label><input type="text" data-field="potentialCustomer" value="${API.esc(p.potentialCustomer || '')}"></div>
          <div><label class="field-label">Next possible step</label><input type="text" data-field="nextStep" value="${API.esc(p.nextStep || '')}"></div>
        </div>
        <div class="detail-actions">
          <span class="item-meta">${p.status === 'active' ? 'Marked active — still not a daily task until Slotly has paying clinics.' : ''}</span>
          <button class="btn-danger" data-act="delete" style="font-size:11px;">Delete</button>
        </div>
      </div>
    </div>`).join('') : '<div class="empty">No parked ideas. Good.</div>';
}

async function saveProject(id, field, value) {
  const res = await API.put(`/api/projects/${id}`, { [field]: value }).catch(() => null);
  if (!res || !res.item) return API.showToast('Could not save.');
  projects[projects.findIndex(p => p._id === id)] = res.item;
}

async function saveTrack(id, updates) {
  const res = await API.put(`/api/learning/${id}`, updates).catch(() => null);
  if (!res || !res.item) {
    API.showToast('Could not save.');
    return null;
  }
  tracks[tracks.findIndex(t => t._id === id)] = res.item;
  return res.item;
}

function setupEvents() {
  ['slotly', 'tradeiq'].forEach(key => {
    API.bindAutosave($(key), (field, value) => saveProject($(key).dataset.id, field, value));
    $(key).addEventListener('input', e => {
      if (e.target.type === 'range') $(key).querySelector('[data-progress-label]').textContent = e.target.value + '%';
    });
  });

  // Learning
  API.bindAutosave($('learning'), (field, value, el) => {
    const track = el.closest('.track');
    if (track) saveTrack(track.dataset.id, { [field]: value });
  });
  $('learning').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target.closest('.lesson-form');
    const track = tracks.find(t => t._id === form.closest('.track').dataset.id);
    const text = form.text.value.trim();
    if (!text) return;
    const lessons = (track.lessons || []).concat({ text, appliedTo: form.appliedTo.value, date: today });
    if (await saveTrack(track._id, { lessons })) renderLearning();
  });
  $('learning').addEventListener('click', async e => {
    if (e.target.id === 'addTrackBtn') {
      const res = await API.post('/api/learning', { name: 'New learning track' }).catch(() => null);
      if (res && res.item) {
        tracks.push(res.item);
        renderLearning();
      }
      return;
    }
    if (e.target.dataset.act === 'remove-lesson') {
      const track = tracks.find(t => t._id === e.target.closest('.track').dataset.id);
      const lessons = [...track.lessons];
      lessons.splice(Number(e.target.closest('[data-idx]').dataset.idx), 1);
      if (await saveTrack(track._id, { lessons })) renderLearning();
    }
  });

  // Parking lot
  API.bindAutosave($('parkedList'), (field, value, el) => saveProject(el.closest('.item-row').dataset.id, field, value));
  $('parkedList').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('.item-row');
    if (btn.dataset.act === 'toggle') {
      row.classList.toggle('open');
    } else if (btn.dataset.act === 'delete') {
      if (!confirm('Delete this idea for good?')) return;
      await API.del(`/api/projects/${row.dataset.id}`).catch(() => null);
      projects = projects.filter(p => p._id !== row.dataset.id);
      renderParked();
    }
  });
  $('parkForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('parkInput').value.trim();
    if (!name) return;
    const res = await API.post('/api/projects', { name }).catch(() => null);
    if (res && res.item) {
      projects.push(res.item);
      $('parkInput').value = '';
      renderParked();
      API.showToast('💡 Parked. Back to the main mission.');
    }
  });
}

initFocusPage();
