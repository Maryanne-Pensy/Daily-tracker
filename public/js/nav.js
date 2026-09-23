const NAV_TABS = [
  ['today', 'Today'],
  ['clinics', 'Clinics'],
  ['content', 'Content'],
  ['products', 'Products'],
  ['focus', 'Focus'],
  ['review', 'Review'],
  ['history', 'History'],
  ['coach', 'Coach']
];

function renderNavbar(activeTab) {
  const user = API.getUser();
  const navContainer = document.getElementById('globalNavbar');
  if (!navContainer) return;

  navContainer.className = 'navbar';
  navContainer.innerHTML = `
    <div class="navbar-inner">
      <a href="/today.html" class="nav-brand">
        BUILDER OS
        <span class="tag">v3</span>
      </a>

      <ul class="nav-links">
        ${NAV_TABS.map(([key, label]) => `
          <li class="nav-item">
            <a href="/${key}.html" class="${activeTab === key ? 'active' : ''}">${label}</a>
          </li>`).join('')}
      </ul>

      <div class="nav-right">
        <div class="db-pill" id="dbStatusPill" title="Database status">
          <span class="dot online" id="dbStatusDot"></span>
          <span id="dbStatusText">Checking DB...</span>
        </div>
        ${user ? `<span class="user-badge">${API.esc(user.username)}</span>` : ''}
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
