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
    const data = await API.get('/api/tracker/history');
    if (!data) return;

    const history = data.history || [];
    document.getElementById('histCurrentStreak').textContent = data.streak ? data.streak.count : 0;
    document.getElementById('histTotalDays').textContent = history.length;
    document.getElementById('histTotalBlocks').textContent = history.filter(h => h.mainMoved).length;

    renderHistoryList(history);
  } catch (err) {
    API.showToast('Failed to load history.');
  }
}

function renderHistoryList(history) {
  const container = document.getElementById('historyList');

  if (history.length === 0) {
    container.innerHTML = '<div class="empty">No days recorded yet. Open Today and move the main mission to start your record.</div>';
    return;
  }

  container.innerHTML = history.map(item => {
    const dateFormatted = API.fmtDate(item.date, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    const detail = `
      ${item.mission ? `<div class="small" style="margin-top:4px;">🔥 ${API.esc(item.mission)}</div>` : ''}
      ${item.needleDone.length ? `<div class="small muted" style="margin-top:2px;">${item.needleDone.map(API.esc).join(' · ')}</div>` : ''}`;
    return `
      <div class="history-card ${item.mainMoved ? 'completed' : 'incomplete'}">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600; font-size:16px;">${dateFormatted}${item.isToday ? ' · today' : ''}</div>
          ${detail}
        </div>
        <div style="text-align:right;">
          <span class="badge ${item.mainMoved ? 'badge-teal' : 'badge-rust'}">${item.score} / ${item.maxScore}</span>
          <div class="small muted mono" style="margin-top:4px;">${item.mainMoved ? 'main mission moved' : 'main mission didn\'t move'}</div>
        </div>
      </div>`;
  }).join('');
}

initHistoryPage();
