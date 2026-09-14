let leadsData = [];
let sentOnlyFilter = false;

async function initOutreachPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('outreach');
  await loadLeads();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }

  setupEventListeners();
}

async function loadLeads() {
  try {
    const data = await API.request('/api/outreach');
    if (!data || !data.leads) return;
    leadsData = data.leads;
    updateStats();
    renderTable();
  } catch (err) {
    API.showToast('Failed to load outreach prospects.');
  }
}

function updateStats() {
  document.getElementById('statTotalLeads').textContent = leadsData.length;
  document.getElementById('statSent').textContent = leadsData.filter(l => l.status === 'sent' || l.status === 'replied' || l.status === 'closed').length;
  document.getElementById('statReplied').textContent = leadsData.filter(l => l.status === 'replied').length;
  document.getElementById('statClosed').textContent = leadsData.filter(l => l.status === 'closed').length;
}

function renderTable() {
  const tbody = document.getElementById('leadTableBody');
  tbody.innerHTML = '';

  const list = sentOnlyFilter
    ? leadsData.filter(l => l.status === 'sent' || l.status === 'replied' || l.status === 'closed')
    : leadsData;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:36px; font-family:'IBM Plex Mono', monospace; color:var(--ink-soft);">
          No prospects logged yet. Click "+ Add Client Prospect" above to record research for Block 1!
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(lead => {
    const tr = document.createElement('tr');

    const statusBadges = {
      researching: '<span class="badge badge-gray">Researching</span>',
      drafted: '<span class="badge" style="background:#FFF3CD; color:#856404;">Drafted</span>',
      sent: '<span class="badge badge-teal">Pitch Sent</span>',
      replied: '<span class="badge" style="background:#CCE5FF; color:#004085;">Replied</span>',
      closed: '<span class="badge badge-rust">Closed 🎯</span>'
    };

    tr.innerHTML = `
      <td>
        <div class="lead-name">${lead.clientName}</div>
        ${lead.storeUrl ? `<a href="${lead.storeUrl}" target="_blank" class="lead-link">${lead.storeUrl.replace(/^https?:\/\//, '')} ↗</a>` : ''}
        ${lead.contactEmail ? `<div style="font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--ink-soft); margin-top:2px;">${lead.contactEmail}</div>` : ''}
      </td>
      <td>
        <div class="gap-text">${lead.emailGaps ? lead.emailGaps : '<span style="color:var(--ink-muted); font-style:italic;">No visible gaps noted</span>'}</div>
      </td>
      <td>
        <div class="gap-text" style="font-style:italic;">
          ${lead.pitchSample ? (lead.pitchSample.substring(0, 70) + '...') : '<span style="color:var(--ink-muted);">No pitch sample yet</span>'}
        </div>
      </td>
      <td>
        ${statusBadges[lead.status] || lead.status}
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn-outline" style="font-size:10px; padding:3px 6px;" data-edit-id="${lead._id || lead.id}">Edit</button>
          <button class="btn-danger" style="font-size:10px; padding:3px 6px;" data-del-id="${lead._id || lead.id}">✕</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach handlers
  tbody.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-id');
      openLeadModal(id);
    });
  });

  tbody.querySelectorAll('[data-del-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del-id');
      if (confirm('Delete this prospect from your pipeline?')) {
        await deleteLead(id);
      }
    });
  });
}

function openLeadModal(id = null) {
  const modal = document.getElementById('leadModal');
  const form = document.getElementById('leadForm');
  form.reset();

  if (id) {
    const lead = leadsData.find(l => (l._id === id || l.id === id));
    if (!lead) return;
    document.getElementById('leadModalTitle').textContent = 'Edit Client Prospect';
    document.getElementById('leadIdInput').value = id;
    document.getElementById('leadNameInput').value = lead.clientName || '';
    document.getElementById('leadUrlInput').value = lead.storeUrl || '';
    document.getElementById('leadContactInput').value = lead.contactEmail || '';
    document.getElementById('leadGapsInput').value = lead.emailGaps || '';
    document.getElementById('leadSampleInput').value = lead.pitchSample || '';
    document.getElementById('leadStatusInput').value = lead.status || 'researching';
  } else {
    document.getElementById('leadModalTitle').textContent = 'Add Client Prospect';
    document.getElementById('leadIdInput').value = '';
    document.getElementById('leadStatusInput').value = 'researching';
  }

  modal.classList.add('open');
}

function closeLeadModal() {
  document.getElementById('leadModal').classList.remove('open');
}

async function saveLead(e) {
  e.preventDefault();
  const id = document.getElementById('leadIdInput').value;
  const payload = {
    clientName: document.getElementById('leadNameInput').value.trim(),
    storeUrl: document.getElementById('leadUrlInput').value.trim(),
    contactEmail: document.getElementById('leadContactInput').value.trim(),
    emailGaps: document.getElementById('leadGapsInput').value.trim(),
    pitchSample: document.getElementById('leadSampleInput').value.trim(),
    status: document.getElementById('leadStatusInput').value
  };

  try {
    let res;
    if (id) {
      res = await API.request(`/api/outreach/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await API.request('/api/outreach', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (res && res.success) {
      closeLeadModal();
      await loadLeads();
      API.showToast(id ? 'Prospect updated.' : 'New prospect logged in MongoDB!');
    }
  } catch (err) {
    API.showToast('Failed to save prospect.');
  }
}

async function deleteLead(id) {
  try {
    const res = await API.request(`/api/outreach/${id}`, { method: 'DELETE' });
    if (res && res.success) {
      leadsData = leadsData.filter(l => !(l._id === id || l.id === id));
      updateStats();
      renderTable();
      API.showToast('Prospect removed.');
    }
  } catch (e) {
    API.showToast('Failed to delete prospect.');
  }
}

function setupEventListeners() {
  document.getElementById('addLeadBtn').addEventListener('click', () => openLeadModal());
  document.getElementById('leadModalCloseBtn').addEventListener('click', closeLeadModal);
  document.getElementById('leadCancelBtn').addEventListener('click', closeLeadModal);
  document.getElementById('leadForm').addEventListener('submit', saveLead);

  document.getElementById('filterAll').addEventListener('click', () => {
    sentOnlyFilter = false;
    renderTable();
  });
  document.getElementById('filterSent').addEventListener('click', () => {
    sentOnlyFilter = true;
    renderTable();
  });
}

initOutreachPage();
