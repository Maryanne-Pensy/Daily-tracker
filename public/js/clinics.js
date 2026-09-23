const STATUSES = [
  ['researching', 'Researching'],
  ['contacted', 'Contacted'],
  ['replied', 'Replied'],
  ['demo_booked', 'Demo booked'],
  ['demo_done', 'Demo completed'],
  ['trial', 'Trial / testing'],
  ['paying', 'Paying 🎯'],
  ['not_interested', 'Not interested'],
  ['follow_up_later', 'Follow up later']
];
const CLOSED = ['paying', 'not_interested'];

let leads = [];
let stats = null;
let filter = 'all';
let today = '';

const $ = id => document.getElementById(id);

async function initClinicsPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('clinics');
  const status = await fetch('/api/status').then(r => r.json()).catch(() => ({}));
  today = status.today || new Date().toISOString().slice(0, 10);
  await loadLeads();
  setupEvents();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function loadLeads() {
  try {
    const clinicRes = await API.get('/api/prospects');
    leads = clinicRes ? clinicRes.items : [];
    stats = clinicRes ? clinicRes.stats : null;
    render();
  } catch (err) {
    API.showToast('Failed to load prospects.');
  }
}

const isDue = l => Boolean(l.nextFollowUp) && l.nextFollowUp <= today && !CLOSED.includes(l.status);

function render() {
  renderStats();
  renderFilters();
  renderList();
}

function renderStats() {
  if (!stats) return;
  const cards = [
    [stats.prospects, 'Prospects'],
    [stats.contacted, 'Contacted'],
    [stats.replies, 'Replies'],
    [stats.demosBooked, 'Demos booked'],
    [stats.trials, 'Trials'],
    [stats.paying, 'Paying clinics']
  ];
  $('statGrid').innerHTML = cards.map(([val, lbl]) =>
    `<div class="stat-card"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>`).join('');
}

function renderFilters() {
  const due = leads.filter(isDue).length;
  const chips = [['all', 'All'], ['due', `Follow-ups due (${due})`], ['active', 'Active pipeline'], ['closed', 'Paying / not interested']];
  $('filters').innerHTML = chips.map(([key, label]) =>
    `<button class="chip ${filter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`).join('');
}

function visibleLeads() {
  const list = leads.filter(l => {
    if (filter === 'due') return isDue(l);
    if (filter === 'active') return !CLOSED.includes(l.status);
    if (filter === 'closed') return CLOSED.includes(l.status);
    return true;
  });
  // Due follow-ups first, then soonest follow-up, then most recently updated
  return list.sort((a, b) =>
    (isDue(b) - isDue(a)) ||
    (a.nextFollowUp || '9999').localeCompare(b.nextFollowUp || '9999') ||
    (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function leadHtml(l) {
  const link = API.safeUrl(l.link);
  const field = (label, name, type = 'text', span = false) =>
    `<div class="${span ? 'span-2' : ''}"><label class="field-label">${label}</label><input type="${type}" data-field="${name}" value="${API.esc(l[name] || '')}"></div>`;
  const area = (label, name) =>
    `<div class="span-2"><label class="field-label">${label}</label><textarea rows="2" data-field="${name}">${API.esc(l[name] || '')}</textarea></div>`;
  return `
  <div class="item-row status-${l.status} ${isDue(l) ? 'due' : ''}" data-id="${l._id}">
    <div class="item-main">
      <input type="text" class="item-title" data-field="name" value="${API.esc(l.name)}" placeholder="Clinic name">
      ${link ? `<a href="${API.esc(link)}" target="_blank" rel="noopener" class="item-meta">open ↗</a>` : ''}
      <select class="compact" data-field="status">${API.options(STATUSES, l.status)}</select>
      <span class="fu-label">${isDue(l) ? '<b style="color:var(--rust)">follow up</b>' : 'next'}</span>
      <input type="date" class="compact fu-date" data-field="nextFollowUp" value="${API.esc(l.nextFollowUp || '')}" title="Next follow-up">
      <button class="btn-outline" data-act="contacted" style="font-size:11px;" title="Sets last contact to today and the next follow-up to 3 days from now">Contacted today</button>
      <button class="btn-mini" data-act="toggle" title="Details">▾</button>
    </div>
    <div class="item-details">
      <div class="form-grid">
        ${field('Contact / person', 'contact')}
        ${field('Instagram / website', 'link')}
        ${field('Phone / WhatsApp', 'phone')}
        ${field('Location', 'location')}
        ${field('Current system / booking method', 'currentSystem', 'text', true)}
        ${area('Problem noticed', 'problem')}
        ${field('Date contacted', 'dateContacted', 'date')}
        ${field('Last contact', 'lastContact', 'date')}
        ${area('Notes', 'notes')}
      </div>
      <div class="detail-actions">
        <span class="item-meta">${l.lastContact ? 'Last contact ' + API.fmtDate(l.lastContact) : 'Not contacted yet'}</span>
        <button class="btn-danger" data-act="delete" style="font-size:11px;">Delete</button>
      </div>
    </div>
  </div>`;
}

function renderList() {
  const list = visibleLeads();
  $('leadList').innerHTML = list.length
    ? list.map(leadHtml).join('')
    : `<div class="empty">${leads.length ? 'Nothing here.' : 'No clinics yet. Add the first one above — name is enough to start.'}</div>`;
}

async function refreshStats() {
  const res = await API.get('/api/prospects').catch(() => null);
  if (res) {
    stats = res.stats;
    renderStats();
    renderFilters();
  }
}

function replaceLead(item) {
  leads[leads.findIndex(l => l._id === item._id)] = item;
  const row = document.querySelector(`.item-row[data-id="${item._id}"]`);
  if (!row) return;
  const wasOpen = row.classList.contains('open');
  row.outerHTML = leadHtml(item);
  if (wasOpen) document.querySelector(`.item-row[data-id="${item._id}"]`).classList.add('open');
}

function setupEvents() {
  $('filters').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    filter = chip.dataset.filter;
    renderFilters();
    renderList();
  });

  API.bindAutosave($('leadList'), async (field, value, el) => {
    const id = el.closest('.item-row').dataset.id;
    const res = await API.put(`/api/prospects/${id}`, { [field]: value }).catch(() => null);
    if (!res || !res.item) return API.showToast('Could not save.');
    if (['status', 'nextFollowUp', 'link', 'dateContacted', 'lastContact'].includes(field)) {
      replaceLead(res.item);
      refreshStats();
      if (field === 'status' && value === 'paying') API.showToast('🎯 A paying clinic! That is the whole game.');
      if (field === 'status' && value === 'demo_booked') API.showToast('📅 Demo booked. Prep the walkthrough.');
    } else {
      leads[leads.findIndex(l => l._id === id)] = res.item;
    }
  });

  $('leadList').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('.item-row');
    const id = row.dataset.id;
    if (btn.dataset.act === 'toggle') {
      row.classList.toggle('open');
    } else if (btn.dataset.act === 'contacted') {
      const res = await API.post(`/api/prospects/${id}/contacted`).catch(() => null);
      if (res && res.item) {
        replaceLead(res.item);
        refreshStats();
        API.showToast(`Logged. Follow up on ${API.fmtDate(res.item.nextFollowUp)}.`);
      }
    } else if (btn.dataset.act === 'delete') {
      if (!confirm('Delete this clinic from your pipeline?')) return;
      await API.del(`/api/prospects/${id}`).catch(() => null);
      leads = leads.filter(l => l._id !== id);
      renderList();
      refreshStats();
    }
  });

  $('quickAdd').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('qaName').value.trim();
    if (!name) return;
    const res = await API.post('/api/prospects', { name, link: $('qaLink').value.trim() }).catch(() => null);
    if (res && res.item) {
      leads.unshift(res.item);
      $('qaName').value = '';
      $('qaLink').value = '';
      $('qaName').focus();
      renderFilters();
      renderList();
      refreshStats();
    }
  });
}

initClinicsPage();
