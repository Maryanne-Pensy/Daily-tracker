async function initHistoryPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('history');
  await loadHistory();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function loadHistory() {
  try {
    const data = await API.request('/api/tracker/history');
    if (!data) return;

    document.getElementById('histCurrentStreak').textContent = data.streak ? data.streak.count : 0;
    const history = data.history || [];
    document.getElementById('histTotalDays').textContent = history.length;

    let totalBlocks = 0;
    history.forEach(h => {
      totalBlocks += (h.checked || []).filter(Boolean).length;
    });
    document.getElementById('histTotalBlocks').textContent = totalBlocks;

    renderHistoryList(history);
  } catch (err) {
    API.showToast('Failed to load history.');
  }
}

function renderHistoryList(history) {
  const container = document.getElementById('historyList');
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = `
      <div style="padding:30px; text-align:center; font-family:'IBM Plex Mono', monospace; color:var(--ink-soft); border:1px dashed var(--card-edge);">
        No past days recorded yet. Check off blocks today to start your permanent record!
      </div>
    `;
    return;
  }

  history.forEach(item => {
    const card = document.createElement('div');
    const checked = item.checked || [false, false, false, false, false, false];
    const doneCount = checked.filter(Boolean).length;
    const isFull = doneCount === 6;

    card.className = `history-card ${isFull ? 'completed' : 'incomplete'}`;

    const d = new Date(item.date + 'T00:00:00');
    const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

    let dotsHtml = '';
    for (let i = 0; i < 6; i++) {
      dotsHtml += `<span class="block-dot ${checked[i] ? 'done' : ''}" title="Block ${i + 1}: ${checked[i] ? 'Finished' : 'Skipped'}"></span>`;
    }

    card.innerHTML = `
      <div>
        <div style="font-weight:600; font-size:16px;">${dateFormatted}</div>
        <div class="block-dots">${dotsHtml}</div>
      </div>
      <div style="text-align:right;">
        <span class="badge ${isFull ? 'badge-teal' : 'badge-rust'}">
          ${doneCount} / 6 Blocks
        </span>
        <div style="font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--ink-soft); margin-top:4px;">
          ${isFull ? '100% Complete' : 'Incomplete'}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

initHistoryPage();
