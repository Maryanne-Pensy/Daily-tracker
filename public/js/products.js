const CATEGORIES = ['Cybersecurity', 'AI', 'AI Automation', 'IT', 'Software', 'Other'];
const STATUSES = [
  ['idea', 'Idea'], ['research', 'Research'], ['building', 'Building'], ['v1', 'V1'],
  ['published', 'Published'], ['improving', 'Improving'], ['archived', 'Archived']
];

let products = [];
let videoCounts = {};
let showArchived = false;

const $ = id => document.getElementById(id);

async function initProductsPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('products');
  $('qaCategory').innerHTML = API.options(CATEGORIES, 'Cybersecurity');
  await loadProducts();
  setupEvents();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function loadProducts() {
  try {
    const [productRes, contentRes] = await Promise.all([
      API.get('/api/products'),
      API.get('/api/content?stream=products')
    ]);
    products = productRes ? productRes.items : [];
    videoCounts = {};
    (contentRes ? contentRes.items : []).forEach(c => {
      if (!c.product) return;
      videoCounts[c.product] = videoCounts[c.product] || { posted: 0, planned: 0 };
      videoCounts[c.product][c.status === 'posted' ? 'posted' : 'planned']++;
    });
    render();
  } catch (err) {
    API.showToast('Failed to load products.');
  }
}

function render() {
  const archivedCount = products.filter(p => p.status === 'archived').length;
  $('filters').innerHTML = archivedCount
    ? `<button class="chip ${showArchived ? '' : 'active'}" data-archived="0">Active</button>
       <button class="chip ${showArchived ? 'active' : ''}" data-archived="1">Archived (${archivedCount})</button>`
    : '';
  const list = products.filter(p => (p.status === 'archived') === showArchived);
  $('productList').innerHTML = list.length
    ? list.map(productHtml).join('')
    : '<div class="empty">No products here yet.</div>';
}

function productHtml(p) {
  const counts = videoCounts[p.name] || { posted: 0, planned: 0 };
  const link = API.safeUrl(p.link);
  const field = (label, name, placeholder = '') =>
    `<div><label class="field-label">${label}</label><input type="text" data-field="${name}" value="${API.esc(p[name] || '')}" placeholder="${placeholder}"></div>`;
  const area = (label, name) =>
    `<div class="span-2"><label class="field-label">${label}</label><textarea rows="2" data-field="${name}">${API.esc(p[name] || '')}</textarea></div>`;
  return `
  <div class="item-row" data-id="${p._id}">
    <div class="item-main">
      <input type="text" class="item-title" data-field="name" value="${API.esc(p.name)}" placeholder="Product name">
      <input type="text" class="compact version-input" data-field="version" value="${API.esc(p.version || '')}" placeholder="Version">
      <select class="compact" data-field="category">${API.options(CATEGORIES.includes(p.category) ? CATEGORIES : CATEGORIES.concat(p.category || []), p.category)}</select>
      <select class="compact" data-field="status">${API.options(STATUSES, p.status)}</select>
      <span class="item-meta" title="Videos for this product">🎥 ${counts.posted} posted · ${counts.planned} planned</span>
      ${link ? `<a href="${API.esc(link)}" target="_blank" rel="noopener" class="item-meta">page ↗</a>` : ''}
      <button class="btn-mini" data-act="toggle" title="Details">▾</button>
    </div>
    <div class="building">
      <input type="text" class="compact" data-field="currentlyBuilding" value="${API.esc(p.currentlyBuilding || '')}" placeholder="What I'm building right now...">
    </div>
    <div class="item-details">
      <div class="form-grid">
        ${area('Description', 'description')}
        ${field('Launch status', 'launchStatus', 'e.g. Soft-launched to followers')}
        ${field('Price', 'price', 'optional')}
        ${field('Sales page link', 'link', 'https://...')}
        <div></div>
        ${area('Notes', 'notes')}
      </div>
      <div class="detail-actions">
        <span class="item-meta">Renaming a product doesn't rename it on videos already logged.</span>
        <button class="btn-danger" data-act="delete" style="font-size:11px;">Delete</button>
      </div>
    </div>
  </div>`;
}

function setupEvents() {
  $('filters').addEventListener('click', e => {
    const chip = e.target.closest('[data-archived]');
    if (!chip) return;
    showArchived = chip.dataset.archived === '1';
    render();
  });

  API.bindAutosave($('productList'), async (field, value, el) => {
    const row = el.closest('.item-row');
    const res = await API.put(`/api/products/${row.dataset.id}`, { [field]: value }).catch(() => null);
    if (!res || !res.item) return API.showToast('Could not save.');
    products[products.findIndex(p => p._id === res.item._id)] = res.item;
    if (field === 'status' && (value === 'archived') !== showArchived) render();
  });

  $('productList').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('.item-row');
    if (btn.dataset.act === 'toggle') {
      row.classList.toggle('open');
    } else if (btn.dataset.act === 'delete') {
      if (!confirm('Delete this product? (Tip: set it to Archived to keep it.)')) return;
      await API.del(`/api/products/${row.dataset.id}`).catch(() => null);
      products = products.filter(p => p._id !== row.dataset.id);
      render();
    }
  });

  $('quickAdd').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('qaName').value.trim();
    if (!name) return;
    const res = await API.post('/api/products', { name, category: $('qaCategory').value, status: 'idea' }).catch(() => null);
    if (res && res.item) {
      products.push(res.item);
      $('qaName').value = '';
      showArchived = false;
      render();
    }
  });
}

initProductsPage();
