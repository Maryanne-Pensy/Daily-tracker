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
      const data = await res.json();

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
