let todayData = null;

async function initTodayPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('today');
  await loadTrackerData();

  // Initialize persistent harsh coach
  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function loadTrackerData() {
  try {
    const data = await API.request('/api/tracker/today');
    if (!data) return;
    todayData = data;
    renderUI();
  } catch (err) {
    API.showToast('Failed to load today progress.');
  }
}

function formatDateLabel() {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function renderContentCard() {
  const card = document.getElementById('contentCard');
  if (!card) return;

  if (todayData && todayData.todayContent) {
    const entry = todayData.todayContent;
    card.className = 'content-card';
    card.innerHTML = `
      <div class="label">
        <span>Posting today — Day ${entry.day}</span>
        <span style="font-size:10px;text-decoration:underline;">OPEN CALENDAR →</span>
      </div>
      <div class="ctitle">${entry.title}</div>
      <div class="cmeta">Status: <b>${entry.status.toUpperCase()}</b> · script → record → edit → post</div>
    `;
    return;
  }

  if (todayData && todayData.upcomingContent) {
    const upcoming = todayData.upcomingContent;
    const d = new Date(upcoming.date + 'T00:00:00');
    const label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    card.className = 'content-card';
    card.innerHTML = `
      <div class="label">
        <span>No post due today</span>
        <span style="font-size:10px;text-decoration:underline;">OPEN CALENDAR →</span>
      </div>
      <div class="ctitle">Next up — Day ${upcoming.day}: ${upcoming.title}</div>
      <div class="next-hint">due ${label} — script it a day ahead if you can</div>
    `;
    return;
  }

  card.innerHTML = `
    <div class="label">Content Schedule Complete</div>
    <div class="ctitle">All sequence topics completed!</div>
  `;
}

function renderUI() {
  if (!todayData) return;

  document.getElementById('dateLabel').textContent = formatDateLabel();
  document.getElementById('streakNum').textContent = todayData.streak ? todayData.streak.count : 0;
  renderContentCard();

  const container = document.getElementById('blocks');
  container.innerHTML = '';

  const blocks = todayData.blocks || [];
  const checked = todayData.checked || [];

  blocks.forEach((b, i) => {
    const done = !!checked[i];
    const row = document.createElement('div');
    row.className = 'block';
    row.innerHTML = `
      <div class="checkbox ${done ? 'checked' : ''}" data-idx="${i}"></div>
      <div class="block-body">
        <div class="block-time">${b.time}</div>
        <div class="block-title ${done ? 'done' : ''}">${b.title}</div>
        <div class="block-desc">${b.desc}</div>
        ${b.protectedNote ? `<span class="protected">${b.protectedNote}</span>` : ''}
      </div>
    `;
    container.appendChild(row);
  });

  // Attach event handlers
  container.querySelectorAll('.checkbox').forEach(cb => {
    cb.addEventListener('click', async () => {
      const idx = parseInt(cb.getAttribute('data-idx'));
      await toggleBlock(idx);
    });
  });

  const doneCount = checked.filter(Boolean).length;
  document.getElementById('progressLabel').textContent = `${doneCount} / ${blocks.length}`;
  document.getElementById('progressFill').style.width = (doneCount / blocks.length * 100) + '%';
}

async function toggleBlock(idx) {
  try {
    const currentStatus = todayData.checked[idx];
    const newStatus = !currentStatus;

    const res = await API.request('/api/tracker/toggle', {
      method: 'POST',
      body: JSON.stringify({ blockIndex: idx, checkedState: newStatus })
    });

    if (res && res.success) {
      todayData.checked = res.checked;
      todayData.streak = res.streak;
      renderUI();

      // Refresh Coach Assessment live
      if (window.HarshCoachWidget) {
        await window.HarshCoachWidget.refreshAssessment(true);
      }

      if (newStatus) {
        const doneCount = res.completedCount;
        if (doneCount === 6) {
          API.showToast(`🔥 All 6 blocks finished! Streak is now ${res.streak.count} days!`);
          if (window.HarshCoachWidget) {
            window.HarshCoachWidget.toggleBubble();
          }
        } else if (doneCount === 3) {
          API.showToast('Halfway there! 3 blocks finished.');
        } else {
          API.showToast(`Block complete. ${6 - doneCount} remaining today.`);
        }
      }
    }
  } catch (err) {
    API.showToast('Failed to toggle block status.');
  }
}

// Reset Today
document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to reset today\'s checked blocks? The Coach WILL be furious!')) {
    return;
  }

  try {
    const res = await API.request('/api/tracker/reset', { method: 'POST' });
    if (res && res.success) {
      todayData.checked = res.checked;
      renderUI();
      if (window.HarshCoachWidget) {
        await window.HarshCoachWidget.refreshAssessment();
      }
      API.showToast('Today has been reset.');
    }
  } catch (e) {
    API.showToast('Failed to reset today.');
  }
});

// Notifications
document.getElementById('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    API.showToast('Notifications not supported on this browser.');
    return;
  }

  const permission = await Notification.requestPermission();
  const btn = document.getElementById('notifyBtn');
  if (permission === 'granted') {
    btn.textContent = 'notifications on';
    API.showToast('Notifications enabled!');
  } else {
    API.showToast('Notifications are off.');
  }
});

if ('Notification' in window && Notification.permission === 'granted') {
  document.getElementById('notifyBtn').textContent = 'notifications on';
}

initTodayPage();
