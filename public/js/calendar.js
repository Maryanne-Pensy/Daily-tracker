let calendarData = [];
let activeFilter = 'all';
let currentEditingDay = null;

async function initCalendarPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('calendar');
  await loadCalendar();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }

  setupEventListeners();
}

async function loadCalendar() {
  try {
    const data = await API.request('/api/content');
    if (!data || !data.calendar) return;
    calendarData = data.calendar;
    updateStats();
    renderList();
  } catch (err) {
    API.showToast('Failed to load content calendar.');
  }
}

function updateStats() {
  const posted = calendarData.filter(c => c.status === 'posted').length;
  const drafted = calendarData.filter(c => c.status === 'drafted' || c.status === 'recorded').length;
  const pending = calendarData.filter(c => c.status === 'pending').length;

  document.getElementById('statPosted').textContent = posted;
  document.getElementById('statDrafted').textContent = drafted;
  document.getElementById('statPending').textContent = pending;
}

function renderList() {
  const container = document.getElementById('calendarList');
  container.innerHTML = '';

  const filtered = calendarData.filter(item => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding:30px; text-align:center; font-family:'IBM Plex Mono', monospace; color:var(--ink-soft); border:1px dashed var(--card-edge);">
        No topics found for filter "${activeFilter}".
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = `cal-item status-${item.status}`;

    const d = new Date(item.date + 'T00:00:00');
    const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    card.innerHTML = `
      <div style="flex:1;">
        <div class="cal-meta">Day ${item.day} · Due ${dateFormatted}</div>
        <h3 class="cal-title">${item.title}</h3>
        <div class="cal-preview">${item.script ? (item.script.substring(0, 110) + '...') : 'No draft script added yet.'}</div>
      </div>
      <div class="cal-actions">
        <select class="status-select" data-day="${item.day}">
          <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="drafted" ${item.status === 'drafted' ? 'selected' : ''}>Drafted</option>
          <option value="recorded" ${item.status === 'recorded' ? 'selected' : ''}>Recorded</option>
          <option value="posted" ${item.status === 'posted' ? 'selected' : ''}>Posted</option>
        </select>
        <button class="btn-outline" style="font-size:11px; padding:4px 8px;" data-edit-day="${item.day}">
          ${item.script ? 'Edit Script' : '+ Add Script'}
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach status change events
  container.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const day = e.target.getAttribute('data-day');
      const newStatus = e.target.value;
      await updateDayStatus(day, newStatus);
    });
  });

  // Attach modal open events
  container.querySelectorAll('[data-edit-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.getAttribute('data-edit-day'));
      openEditModal(day);
    });
  });
}

async function updateDayStatus(day, status) {
  try {
    const res = await API.request(`/api/content/${day}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (res && res.success) {
      const idx = calendarData.findIndex(c => c.day === Number(day));
      if (idx !== -1) {
        calendarData[idx].status = status;
        updateStats();
        renderList();
      }
      API.showToast(`Day ${day} marked as ${status.toUpperCase()}.`);
    }
  } catch (err) {
    API.showToast('Failed to update status.');
  }
}

function openEditModal(day) {
  const item = calendarData.find(c => c.day === day);
  if (!item) return;

  currentEditingDay = day;
  document.getElementById('modalDayBadge').textContent = `Day ${item.day}`;
  document.getElementById('modalTitle').textContent = item.title;
  document.getElementById('modalTopicInput').value = item.title;
  document.getElementById('modalStatusSelect').value = item.status;
  document.getElementById('modalScriptInput').value = item.script || '';
  document.getElementById('modalNotesInput').value = item.notes || '';

  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
  currentEditingDay = null;
}

async function saveModalChanges() {
  if (!currentEditingDay) return;

  const title = document.getElementById('modalTopicInput').value.trim();
  const status = document.getElementById('modalStatusSelect').value;
  const script = document.getElementById('modalScriptInput').value;
  const notes = document.getElementById('modalNotesInput').value;

  try {
    const res = await API.request(`/api/content/${currentEditingDay}`, {
      method: 'PUT',
      body: JSON.stringify({ title, status, script, notes })
    });

    if (res && res.success) {
      const idx = calendarData.findIndex(c => c.day === currentEditingDay);
      if (idx !== -1) {
        calendarData[idx] = res.item;
        updateStats();
        renderList();
      }
      closeEditModal();
      API.showToast(`Day ${currentEditingDay} draft saved to MongoDB.`);
    }
  } catch (err) {
    API.showToast('Failed to save script changes.');
  }
}

function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderList();
    });
  });

  // Modal controls
  document.getElementById('modalCloseBtn').addEventListener('click', closeEditModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeEditModal);
  document.getElementById('modalSaveBtn').addEventListener('click', saveModalChanges);
}

initCalendarPage();
