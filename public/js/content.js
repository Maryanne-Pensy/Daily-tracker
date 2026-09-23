// One page for every content stream: Slotly marketing, digital-product videos,
// and the archived copywriting calendar.
const STREAMS = {
  slotly: { subtitle: 'Slotly marketing · 30 days → booked demo calls (not views)' },
  products: { subtitle: 'Digital product & tech videos · target: 2 posted per day' },
  copywriting: { subtitle: 'Archived calendar from the old copywriting tracker — kept for reference' }
};
const CONTENT_TYPES = [['', 'Type'], ['reel', 'Reel'], ['carousel', 'Carousel'], ['short', 'Short'], ['video', 'Video'], ['story', 'Story'], ['post', 'Post'], ['other', 'Other']];
const FILTERS = [['all', 'All'], ['idea', 'Ideas'], ['scripted', 'Scripted'], ['recorded', 'Recorded'], ['edited', 'Edited'], ['scheduled', 'Scheduled'], ['posted', 'Posted']];

let stream = STREAMS[location.hash.slice(1)] ? location.hash.slice(1) : 'slotly';
let items = [];
let products = [];
let pipeline = null;
let statusFilter = 'all';
let productFilter = '';
let today = '';

const $ = id => document.getElementById(id);

async function initContentPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('content');
  const [status, productRes, prospectRes] = await Promise.all([
    fetch('/api/status').then(r => r.json()).catch(() => ({})),
    API.get('/api/products').catch(() => null),
    API.get('/api/prospects?kind=clinic').catch(() => null)
  ]);
  today = status.today || new Date().toISOString().slice(0, 10);
  products = productRes ? productRes.items.filter(p => p.status !== 'archived') : [];
  pipeline = prospectRes ? prospectRes.stats : null;

  setupEvents();
  await switchStream(stream);

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function switchStream(next) {
  stream = next;
  history.replaceState(null, '', '#' + stream);
  document.querySelectorAll('#streamTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.stream === stream));
  $('tabSubtitle').textContent = STREAMS[stream].subtitle;
  $('quickAdd').classList.toggle('hidden', stream !== 'products');
  $('addDayBtn').classList.toggle('hidden', stream !== 'slotly');
  statusFilter = 'all';
  productFilter = '';
  try {
    const res = await API.get(`/api/content?stream=${stream}`);
    items = res ? res.items : [];
  } catch (err) {
    items = [];
    API.showToast('Failed to load content.');
  }
  renderFilters();
  renderStats();
  renderList();
}

function productNames(extra) {
  const names = products.map(p => p.name).concat('General tech');
  return extra && !names.includes(extra) ? names.concat(extra) : names;
}

function renderFilters() {
  let html = FILTERS.map(([key, label]) =>
    `<button class="chip ${statusFilter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`).join('');
  if (stream === 'products') {
    const used = [...new Set(items.map(i => i.product).filter(Boolean))];
    const names = [...new Set(productNames().concat(used))];
    html += `<select class="compact" id="productFilter" style="margin-left:auto;">${API.options([['', 'All products / topics'], ...names], productFilter)}</select>`;
  }
  $('filters').innerHTML = html;
}

function renderStats() {
  const count = fn => items.filter(fn).length;
  const posted = count(i => i.status === 'posted');
  let cards;
  if (stream === 'slotly') {
    cards = [
      [`${posted} / ${items.length}`, 'Posted'],
      [count(i => ['scripted', 'recorded', 'edited', 'scheduled'].includes(i.status)), 'In progress'],
      [pipeline ? pipeline.demosBooked : '–', 'Demos booked (the goal)']
    ];
  } else if (stream === 'products') {
    cards = [
      [`${count(i => i.postedDate === today)} / 2`, 'Posted today'],
      [count(i => i.status !== 'posted' && i.date >= today), 'Planned ahead'],
      [count(i => i.status === 'idea'), 'Ideas'],
      [posted, 'Posted total']
    ];
  } else {
    cards = [[items.length, 'Items'], [posted, 'Posted']];
  }
  $('statGrid').innerHTML = cards.map(([val, lbl]) =>
    `<div class="stat-card"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>`).join('');
}

function visibleItems() {
  return items
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .filter(i => !productFilter || i.product === productFilter)
    .sort((a, b) => stream === 'products'
      ? (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '')
      : (a.day || 0) - (b.day || 0));
}

function itemHtml(item) {
  const meta = [item.day ? `Day ${item.day}` : '', item.date ? API.fmtDate(item.date) : ''].filter(Boolean).join(' · ');
  const isToday = item.date === today;
  const link = API.safeUrl(item.link);
  const field = (label, name, attrs = '') =>
    `<div><label class="field-label">${label}</label><input type="text" data-field="${name}" value="${API.esc(item[name] || '')}" ${attrs}></div>`;
  const area = (label, name, rows = 2) =>
    `<div class="span-2"><label class="field-label">${label}</label><textarea rows="${rows}" data-field="${name}">${API.esc(item[name] || '')}</textarea></div>`;

  return `
  <div class="item-row status-${item.status}" data-id="${item._id}">
    <div class="item-main">
      <span class="item-meta" style="${isToday ? 'color:var(--rust);font-weight:700;' : ''}">${isToday ? 'TODAY · ' : ''}${meta}</span>
      <input type="text" class="item-title" data-field="title" value="${API.esc(item.title)}" placeholder="Topic / title">
      ${stream === 'products'
        ? `<select class="compact" data-field="product">${API.options([['', 'Product / topic'], ...productNames(item.product)], item.product || '')}</select>`
        : `<select class="compact" data-field="contentType">${API.options(CONTENT_TYPES, item.contentType || '')}</select>`}
      <select class="compact" data-field="status">${API.options(API.CONTENT_STATUSES, item.status)}</select>
      ${item.status === 'posted'
        ? `<span class="badge badge-teal">${item.postedDate ? 'Posted ' + API.fmtDate(item.postedDate) : 'Posted'}</span>`
        : '<button class="btn-outline" data-act="posted" style="font-size:11px;">Posted today ✓</button>'}
      ${link ? `<a href="${API.esc(link)}" target="_blank" rel="noopener" class="item-meta">link ↗</a>` : ''}
      <button class="btn-mini" data-act="toggle" title="Details">▾</button>
    </div>
    <div class="item-details">
      <div class="form-grid">
        <div><label class="field-label">Date</label><input type="date" data-field="date" value="${API.esc(item.date || '')}"></div>
        ${stream === 'products'
          ? `<div><label class="field-label">Content type</label><select data-field="contentType">${API.options(CONTENT_TYPES, item.contentType || '')}</select></div>`
          : `<div><label class="field-label">Platform</label><select data-field="platform">${API.options(API.PLATFORMS.map(p => [p, p || '—']).concat(item.platform && !API.PLATFORMS.includes(item.platform) ? [[item.platform, item.platform]] : []), item.platform || '')}</select></div>`}
        ${stream === 'products'
          ? `<div><label class="field-label">Platform</label><select data-field="platform">${API.options(API.PLATFORMS.map(p => [p, p || '—']), item.platform || '')}</select></div>`
          : field('Hook', 'hook')}
        ${stream === 'products' ? field('Hook', 'hook') : field('CTA', 'cta')}
        ${field('Post link', 'link', 'placeholder="https://..."')}
        ${field('Results', 'results', 'placeholder="views, saves, DMs, demos booked..."')}
        ${area('Notes', 'notes')}
        ${stream !== 'products' || item.script ? area('Script', 'script', 4) : ''}
      </div>
      <div class="detail-actions">
        <span class="item-meta">${item.legacyStatus ? 'Original status: ' + API.esc(item.legacyStatus) : ''}</span>
        <button class="btn-danger" data-act="delete" style="font-size:11px;">Delete</button>
      </div>
    </div>
  </div>`;
}

function renderList() {
  const list = visibleItems();
  $('itemList').innerHTML = list.length
    ? list.map(itemHtml).join('')
    : `<div class="empty">${stream === 'products' ? 'No videos here yet — add what you\'re uploading above.' : 'Nothing matches this filter.'}</div>`;
}

function replaceRow(item) {
  const row = document.querySelector(`.item-row[data-id="${item._id}"]`);
  if (!row) return;
  const wasOpen = row.classList.contains('open');
  row.outerHTML = itemHtml(item);
  if (wasOpen) document.querySelector(`.item-row[data-id="${item._id}"]`).classList.add('open');
}

async function saveField(id, field, value) {
  try {
    const res = await API.put(`/api/content/${id}`, { [field]: value });
    if (!res || !res.item) return;
    const idx = items.findIndex(i => i._id === id);
    items[idx] = res.item;
    if (['status', 'date', 'link', 'product', 'contentType'].includes(field)) {
      replaceRow(res.item);
      renderStats();
    }
  } catch (err) {
    API.showToast('Could not save.');
  }
}

function setupEvents() {
  document.querySelectorAll('#streamTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => switchStream(tab.dataset.stream));
  });

  $('filters').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    statusFilter = chip.dataset.filter;
    renderFilters();
    renderList();
  });
  $('filters').addEventListener('change', e => {
    if (e.target.id !== 'productFilter') return;
    productFilter = e.target.value;
    renderList();
  });

  API.bindAutosave($('itemList'), (field, value, el) => saveField(el.closest('.item-row').dataset.id, field, value));

  $('itemList').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('.item-row');
    const id = row.dataset.id;
    if (btn.dataset.act === 'toggle') {
      row.classList.toggle('open');
    } else if (btn.dataset.act === 'posted') {
      const res = await API.post(`/api/content/${id}/posted`).catch(() => null);
      if (res && res.item) {
        items[items.findIndex(i => i._id === id)] = res.item;
        replaceRow(res.item);
        renderStats();
        API.showToast('Marked as posted today.');
      }
    } else if (btn.dataset.act === 'delete') {
      if (!confirm('Delete this content item?')) return;
      await API.del(`/api/content/${id}`).catch(() => null);
      items = items.filter(i => i._id !== id);
      renderStats();
      renderList();
    }
  });

  // Quick add (digital product videos)
  $('qaDate').value = today || new Date().toISOString().slice(0, 10);
  $('qaPlatform').innerHTML = API.options(API.PLATFORMS.map(p => [p, p || 'Platform']), '');
  $('qaProduct').innerHTML = API.options([['', 'Product / topic'], ...productNames()], products[0] ? products[0].name : '');
  $('quickAdd').addEventListener('submit', async e => {
    e.preventDefault();
    const title = $('qaTitle').value.trim();
    if (!title) return;
    const res = await API.post('/api/content', {
      stream: 'products',
      title,
      date: $('qaDate').value || today,
      platform: $('qaPlatform').value,
      product: $('qaProduct').value,
      status: 'idea'
    }).catch(() => null);
    if (res && res.item) {
      items.push(res.item);
      $('qaTitle').value = '';
      $('qaTitle').focus();
      renderStats();
      renderList();
    }
  });

  // Add another Slotly day after the last one
  $('addDayBtn').addEventListener('click', async () => {
    const last = items.reduce((a, b) => ((b.day || 0) > (a ? a.day || 0 : 0) ? b : a), null);
    const date = last && last.date ? new Date(last.date + 'T00:00:00Z') : new Date(today + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + 1);
    const res = await API.post('/api/content', {
      stream: 'slotly',
      day: (last ? last.day || 0 : 0) + 1,
      date: date.toISOString().slice(0, 10),
      title: '',
      status: 'idea'
    }).catch(() => null);
    if (res && res.item) {
      items.push(res.item);
      renderStats();
      renderList();
    }
  });
}

initContentPage();
