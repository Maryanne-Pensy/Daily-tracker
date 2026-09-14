function renderNavbar(activeTab) {
  const user = API.getUser();
  const navContainer = document.getElementById('globalNavbar');
  if (!navContainer) return;

  navContainer.className = 'navbar';
  navContainer.innerHTML = `
    <div class="navbar-inner">
      <a href="/today.html" class="nav-brand">
        DAILY SHEET
        <span class="tag">v2.0</span>
      </a>

      <ul class="nav-links">
        <li class="nav-item">
          <a href="/today.html" class="${activeTab === 'today' ? 'active' : ''}">Today's Sheet</a>
        </li>
        <li class="nav-item">
          <a href="/calendar.html" class="${activeTab === 'calendar' ? 'active' : ''}">Content Calendar</a>
        </li>
        <li class="nav-item">
          <a href="/outreach.html" class="${activeTab === 'outreach' ? 'active' : ''}">Outreach Board</a>
        </li>
        <li class="nav-item">
          <a href="/coach.html" class="${activeTab === 'coach' ? 'active' : ''}">
            <span style="color:var(--rust)">🔥</span> AI Coach
          </a>
        </li>
        <li class="nav-item">
          <a href="/history.html" class="${activeTab === 'history' ? 'active' : ''}">History</a>
        </li>
      </ul>

      <div class="nav-right">
        <div class="db-pill" id="dbStatusPill" title="Database status">
          <span class="dot online" id="dbStatusDot"></span>
          <span id="dbStatusText">Checking DB...</span>
        </div>
        ${user ? `<span class="user-badge">${user.username}</span>` : ''}
        <button class="logout-btn" onclick="API.clearSession()">Sign Out</button>
      </div>
    </div>
  `;

  // Check DB status
  checkDatabaseStatus();
}

async function checkDatabaseStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const dot = document.getElementById('dbStatusDot');
    const text = document.getElementById('dbStatusText');
    const pill = document.getElementById('dbStatusPill');

    if (!dot || !text) return;

    if (data.database && data.database.connected) {
      dot.className = 'dot online';
      text.textContent = 'MongoDB Connected';
      pill.title = `Connected to ${data.database.host}/${data.database.dbName}`;
    } else {
      dot.className = 'dot offline';
      text.textContent = 'Local Mode (No Mongo)';
      pill.title = 'Running in resilient local storage. Configure MONGODB_URI in .env for live MongoDB.';
    }
  } catch (e) {
    // Ignore error
  }
}

window.renderNavbar = renderNavbar;
