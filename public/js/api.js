const API = {
  TOKEN_KEY: 'daily_sheet_token',
  USER_KEY: 'daily_sheet_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  getUser() {
    try {
      const u = localStorage.getItem(this.USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.href = '/login.html';
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(endpoint, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        // Unauthorized
        this.clearSession();
        return null;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Server request failed');
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  async checkAuth(requireAuth = true) {
    const token = this.getToken();
    if (!token) {
      if (requireAuth) {
        window.location.href = '/login.html';
      }
      return false;
    }

    try {
      const profile = await this.request('/api/auth/me');
      if (profile && profile.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(profile.user));
        return profile;
      }
    } catch (e) {
      if (requireAuth) {
        this.clearSession();
      }
      return false;
    }
    return false;
  },

  // Shorthand JSON helpers
  get(endpoint) { return this.request(endpoint); },
  post(endpoint, body = {}) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
  put(endpoint, body = {}) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
  del(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },

  // Escape user text before putting it into innerHTML
  esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // Only allow http(s) links in hrefs
  safeUrl(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return 'https://' + v;
    return '';
  },

  // <option> list from [[value, label], ...] or ['value', ...]
  options(list, selected) {
    return list.map(o => {
      const [value, label] = Array.isArray(o) ? o : [o, o];
      return `<option value="${this.esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${this.esc(label)}</option>`;
    }).join('');
  },

  debounce(fn, wait = 600) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  // Autosave every [data-field] control inside `root`: text saves after a pause,
  // selects/checkboxes/dates save immediately. save(field, value, el) does the work.
  bindAutosave(root, save) {
    const pending = new Map();
    const valueOf = el => el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value);
    const run = el => save(el.dataset.field, valueOf(el), el);
    root.addEventListener('input', e => {
      const el = e.target.closest('[data-field]');
      if (!el || el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date') return;
      clearTimeout(pending.get(el));
      pending.set(el, setTimeout(() => run(el), 700));
    });
    root.addEventListener('change', e => {
      const el = e.target.closest('[data-field]');
      if (!el) return;
      clearTimeout(pending.get(el));
      run(el);
    });
  },

  fmtDate(dateStr, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, opts);
  },

  CONTENT_STATUSES: [['idea', 'Idea'], ['scripted', 'Scripted'], ['recorded', 'Recorded'], ['edited', 'Edited'], ['scheduled', 'Scheduled'], ['posted', 'Posted']],
  PLATFORMS: ['', 'TikTok', 'Instagram', 'YouTube Shorts', 'YouTube', 'LinkedIn', 'X', 'Facebook', 'Other'],

  showToast(message, duration = 3500) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
};

window.API = API;
