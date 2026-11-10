// ============================================================
// RENTORA — SUPABASE CLOUD & AUTHENTICATION GATEWAY
// Supports Official Supabase Auth (Google OAuth, Email/Password) & Cloud Database
// Powered by Supabase & Rentora
// ============================================================

const SupabaseGateway = {
  config: {
    url: 'https://ollsmelyjhtucnzzcijj.supabase.co',
    publishableKey: 'sb_publishable_1x0YQIESINZ7r4-0eQunSw_uq1OD2S4',
    jwksUrl: 'https://ollsmelyjhtucnzzcijj.supabase.co/auth/v1/.well-known/jwks.json'
  },

  client: null,
  initialized: false,
  _authListeners: [],

  getBaseUrl() {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return 'http://localhost:3000';
    }
    return '';
  },

  // Load custom config from localStorage if updated via settings
  loadSavedConfig() {
    try {
      const saved = localStorage.getItem('rentora_supabase_custom_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.url && parsed.publishableKey) {
          this.config = Object.assign({}, this.config, parsed);
        }
      }
    } catch (e) {
      console.warn('[Supabase] Could not read custom config:', e);
    }
  },

  saveCustomConfig(newConfig) {
    try {
      this.config = Object.assign({}, this.config, newConfig);
      localStorage.setItem('rentora_supabase_custom_config', JSON.stringify(this.config));
      return this.init(true);
    } catch (e) {
      console.error('[Supabase] Save config failed:', e);
      return false;
    }
  },

  isConfigured() {
    return !!(
      this.config &&
      this.config.url &&
      this.config.publishableKey &&
      this.config.publishableKey.startsWith('sb_publishable_')
    );
  },

  // ── INITIALIZE SUPABASE CLIENT ──────────────────────────────
  async init(forceReinit = false) {
    if (this.initialized && this.client && !forceReinit) return this.client;
    this.loadSavedConfig();

    // 1. Fetch server config if available
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/supabase/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url && data.publishableKey) {
          this.config.url = data.url;
          this.config.publishableKey = data.publishableKey;
        }
      }
    } catch (e) {
      // Offline / standalone fallback
    }

    // 2. Initialize browser client
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        this.client = window.supabase.createClient(this.config.url, this.config.publishableKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        });
        this.initialized = true;
        console.log('[SupabaseGateway] Connected to Supabase project:', this.config.url);

        // Attach internal listener
        this.client.auth.onAuthStateChange((event, session) => {
          this._authListeners.forEach(fn => {
            try { fn(event, session); } catch (err) { console.error(err); }
          });
        });

        return this.client;
      } catch (err) {
        console.error('[SupabaseGateway] Client init error:', err);
      }
    } else {
      console.warn('[SupabaseGateway] Supabase JS library not found in window.');
    }
    return null;
  },

  // ── AUTH STATE SUBSCRIPTION ─────────────────────────────────
  onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      this._authListeners.push(callback);
    }
    if (!this.initialized) this.init();
  },

  // ── GOOGLE AUTHENTICATION (OAUTH REDIRECT) ───────────────────
  async signInWithGoogle() {
    const client = await this.init();
    if (!client) {
      throw new Error('Supabase client failed to initialize. Please check network.');
    }

    const redirectTo = window.location.origin + window.location.pathname;
    console.log('[SupabaseGateway] Launching Google OAuth redirect to:', redirectTo);

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) throw error;
    return { success: true, pendingRedirect: true, data };
  },

  // ── EMAIL / PASSWORD SIGN UP ────────────────────────────────
  async signUpEmail(email, password, metadata = {}) {
    const client = await this.init();
    if (!client) throw new Error('Supabase client failed to initialize.');

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  },

  // ── EMAIL / PASSWORD SIGN IN ────────────────────────────────
  async signInEmail(email, password) {
    const client = await this.init();
    if (!client) throw new Error('Supabase client failed to initialize.');

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  // ── SIGN OUT ────────────────────────────────────────────────
  async signOut() {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn('[SupabaseGateway] Sign out note:', e.message);
      }
    }
  },

  // ── CURRENT SESSION & USER ──────────────────────────────────
  async getSession() {
    const client = await this.init();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data ? data.session : null;
  },

  async getUser() {
    const client = await this.init();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data ? data.user : null;
  },

  // ── CLOUD WORKSPACE BACKUP & RESTORE ────────────────────────
  async syncWorkspaceToCloud(userId, workspaceData) {
    if (!userId || !workspaceData) return false;
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/supabase/sync-workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workspaceData })
      });
      const json = await res.json();
      return json.success;
    } catch (e) {
      console.warn('[SupabaseGateway] Workspace sync deferred:', e.message);
      return false;
    }
  },

  async loadWorkspaceFromCloud(userId) {
    if (!userId) return null;
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/supabase/load-workspace?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.workspaceData) {
          return json.workspaceData;
        }
      }
    } catch (e) {
      console.warn('[SupabaseGateway] Workspace load deferred:', e.message);
    }
    return null;
  }
};

window.SupabaseGateway = SupabaseGateway;
