// ============================================================
// RENTORA — COMMERCIAL AUTHENTICATION & MULTI-TENANT CLOUD GATEWAY
// Supports Official Firebase Google Auth, Email/Password, & Cloud Partitioning
// Powered by Rentora
// ============================================================

const Auth = {
  currentUser: null,
  STORAGE_ACTIVE_USER: 'rentora_active_user',
  STORAGE_USERS_DB: 'rentora_users_db',
  _isAuthenticating: false,

  init() {
    try {
      const saved = localStorage.getItem(this.STORAGE_ACTIVE_USER);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    } catch (e) {
      this.currentUser = null;
    }

    // Attach to Supabase Auth state listener if SupabaseGateway is loaded
    if (typeof SupabaseGateway !== 'undefined') {
      SupabaseGateway.init().then(() => {
        SupabaseGateway.onAuthStateChange((event, session) => {
          if (session && session.user) {
            this._handleSupabaseAuthStateChange(session.user);
          }
        });
        SupabaseGateway.getSession().then(session => {
          if (session && session.user && !this.currentUser) {
            this._handleSupabaseAuthStateChange(session.user);
          }
        });
      }).catch(err => {
        console.warn('[Auth] Supabase init note:', err.message);
      });
    }

    // Attach to Firebase Auth state listener if FirebaseGateway is loaded
    if (typeof FirebaseGateway !== 'undefined' && FirebaseGateway.init()) {
      if (FirebaseGateway.auth) {
        FirebaseGateway.auth.onAuthStateChanged((fbUser) => {
          this._handleFirebaseAuthStateChange(fbUser);
        });
        // Check for returning redirect OAuth result
        FirebaseGateway.checkRedirectResult().then(fbUser => {
          if (fbUser) this._handleFirebaseAuthStateChange(fbUser);
        });
      }
    }

    return this.currentUser;
  },

  _handleSupabaseAuthStateChange(sbUser) {
    if (!sbUser) return;
    const meta = sbUser.user_metadata || {};
    const email = sbUser.email || meta.email || '';
    const name = meta.full_name || meta.name || (email ? email.split('@')[0] : 'Owner');
    const photoURL = meta.avatar_url || meta.picture || '';
    const provider = (sbUser.app_metadata && sbUser.app_metadata.provider) || 'supabase';

    const user = {
      uid: sbUser.id,
      uniqueId: 'UID-' + sbUser.id.replace(/-/g, '').slice(-6).toUpperCase(),
      email,
      name,
      photoURL,
      provider: provider === 'google' ? 'google' : 'supabase',
      createdAt: sbUser.created_at || new Date().toISOString()
    };

    // Record in users list
    const users = this._getUsersDb();
    const idx = users.findIndex(u => u.uid === user.uid || (user.email && u.email === user.email));
    if (idx >= 0) {
      users[idx] = Object.assign({}, users[idx], user);
    } else {
      users.push(user);
    }
    this._saveUsersDb(users);

    this.currentUser = user;
    localStorage.setItem(this.STORAGE_ACTIVE_USER, JSON.stringify(user));

    // Automatically check and restore cloud backup for this user if available
    if (typeof DB !== 'undefined' && DB.restoreFromSupabaseCloud) {
      DB.restoreFromSupabaseCloud(user.uid);
    }

    if (typeof App !== 'undefined' && App.onAuthStateChanged) {
      App.onAuthStateChanged(this.currentUser);
    }
  },

  _handleFirebaseAuthStateChange(fbUser) {
    if (fbUser) {
      const user = {
        uid: fbUser.uid,
        uniqueId: 'UID-' + fbUser.uid.slice(-6).toUpperCase(),
        email: fbUser.email || '',
        name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Owner'),
        photoURL: fbUser.photoURL || '',
        provider: 'google',
        createdAt: new Date().toISOString()
      };

      // Record in users list
      const users = this._getUsersDb();
      const idx = users.findIndex(u => u.uid === user.uid || u.email === user.email);
      if (idx >= 0) {
        users[idx] = Object.assign({}, users[idx], user);
      } else {
        users.push(user);
      }
      this._saveUsersDb(users);

      this.currentUser = user;
      localStorage.setItem(this.STORAGE_ACTIVE_USER, JSON.stringify(user));

      if (typeof App !== 'undefined' && App.onAuthStateChanged) {
        App.onAuthStateChanged(this.currentUser);
      }
    }
  },

  isAuthenticated() {
    return !!this.currentUser && !!this.currentUser.uid;
  },

  getUserId() {
    return this.currentUser ? this.currentUser.uid : '';
  },

  getUserDisplayName() {
    if (!this.currentUser) return 'Guest';
    return this.currentUser.name || this.currentUser.email || 'PG Owner';
  },

  getUniqueAccountId() {
    if (!this.currentUser) return '';
    return this.currentUser.uniqueId || `UID-${this.currentUser.uid.slice(-6).toUpperCase()}`;
  },

  _getUsersDb() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_USERS_DB)) || [];
    } catch (e) {
      return [];
    }
  },

  _saveUsersDb(users) {
    localStorage.setItem(this.STORAGE_USERS_DB, JSON.stringify(users));
  },

  // ── REAL GOOGLE SIGN-IN VIA SUPABASE / FIREBASE ─────────────
  async loginWithGoogle() {
    if (this._isAuthenticating) return null;
    const btn = document.querySelector('.btn-google-auth');
    const origHtml = btn ? btn.innerHTML : '';

    try {
      this._isAuthenticating = true;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <div class="ob-launch-spinner" style="width:18px;height:18px;margin-right:8px;border-width:2px;display:inline-block;vertical-align:middle"></div>
          <span>Connecting to Google...</span>
        `;
      }

      if (typeof SoundFX !== 'undefined' && SoundFX.navTab) SoundFX.navTab();

      // 1. Try Supabase Google Auth
      if (typeof SupabaseGateway !== 'undefined' && SupabaseGateway.isConfigured()) {
        try {
          const res = await SupabaseGateway.signInWithGoogle();
          if (res && res.pendingRedirect) {
            return null; // Browser redirecting to Google Auth
          }
        } catch (sbErr) {
          console.warn('[Auth] Supabase Google Auth note (falling back to Firebase if needed):', sbErr.message);
        }
      }

      // 2. Fallback to Firebase Google Auth
      if (typeof FirebaseGateway !== 'undefined') {
        const res = await FirebaseGateway.signInWithGoogle();

        if (res && res.success && res.user) {
          const fbUser = res.user;
          const user = {
            uid: fbUser.uid,
            uniqueId: 'UID-' + fbUser.uid.slice(-6).toUpperCase(),
            email: fbUser.email || '',
            name: fbUser.displayName || 'Google PG Owner',
            photoURL: fbUser.photoURL || '',
            provider: 'google',
            createdAt: new Date().toISOString()
          };

          const users = this._getUsersDb();
          const existingIdx = users.findIndex(u => u.email === user.email || u.uid === user.uid);
          if (existingIdx >= 0) {
            users[existingIdx] = Object.assign({}, users[existingIdx], user);
            this.currentUser = users[existingIdx];
          } else {
            users.push(user);
            this.currentUser = user;
          }
          this._saveUsersDb(users);

          localStorage.setItem(this.STORAGE_ACTIVE_USER, JSON.stringify(this.currentUser));
          if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
          showToast(`✅ Signed in with Google as ${this.currentUser.name}!`, 'success');

          // Trigger Supabase cloud restore
          if (typeof DB !== 'undefined' && DB.restoreFromSupabaseCloud) {
            DB.restoreFromSupabaseCloud(this.currentUser.uid);
          }

          if (typeof App !== 'undefined' && App.onAuthStateChanged) {
            App.onAuthStateChanged(this.currentUser);
          }
          return this.currentUser;
        }

        // If pending redirect or user opened setup modal or user closed popup
        if (res && res.pendingRedirect) {
          // App will reload when returning from Google redirect
          return null;
        }
      }

      return null;
    } catch (err) {
      console.error('[Auth] loginWithGoogle error:', err);
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Google sign-in error: ' + (err.message || 'Unknown'), 'error');
      return null;
    } finally {
      this._isAuthenticating = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  // ── EMAIL / UNIQUE ID SIGN-UP ──────────────────────────────
  async signupWithEmail(email, password, name = '') {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const cleanName = (name || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Please enter a valid email address', 'error');
      return null;
    }

    if (!cleanPass || cleanPass.length < 6) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Password must be at least 6 characters long', 'error');
      return null;
    }

    const users = this._getUsersDb();
    if (users.some(u => u.email === cleanEmail)) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('An account with this email already exists. Please sign in.', 'error');
      return null;
    }

    // 1. Try creating via Supabase Auth
    let sbUid = null;
    if (typeof SupabaseGateway !== 'undefined' && SupabaseGateway.isConfigured()) {
      try {
        const sbData = await SupabaseGateway.signUpEmail(cleanEmail, cleanPass, { full_name: cleanName });
        if (sbData && sbData.user && sbData.user.id) {
          sbUid = sbData.user.id;
          console.log('[Auth] User registered with Supabase Auth:', sbUid);
        }
      } catch (sbErr) {
        console.warn('[Auth] Supabase signup note:', sbErr.message);
      }
    }

    // 2. Try creating via Firebase if configured
    let fbUid = null;
    if (!sbUid && typeof FirebaseGateway !== 'undefined' && FirebaseGateway.isConfigured()) {
      try {
        const fbUser = await FirebaseGateway.signUpEmail(cleanEmail, cleanPass);
        if (fbUser && fbUser.uid) fbUid = fbUser.uid;
      } catch (fbErr) {
        console.warn('[Auth] Firebase signup error, continuing with partitioned storage:', fbErr);
      }
    }

    const passHash = typeof hashPin === 'function' ? await hashPin(cleanPass) : btoa(cleanPass);
    const rawId = Math.random().toString(36).substring(2, 8);
    const uniqueId = 'UID-' + rawId.toUpperCase();
    const uid = sbUid || fbUid || ('u_' + rawId + Date.now().toString(36));

    const newUser = {
      uid,
      uniqueId,
      email: cleanEmail,
      name: cleanName || cleanEmail.split('@')[0],
      passwordHash: passHash,
      provider: sbUid ? 'supabase_email' : (fbUid ? 'firebase_email' : 'password'),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this._saveUsersDb(users);

    this.currentUser = newUser;
    localStorage.setItem(this.STORAGE_ACTIVE_USER, JSON.stringify(newUser));

    // Cloud sync initial state
    if (typeof DB !== 'undefined' && DB.syncWithSupabaseCloud) {
      DB.syncWithSupabaseCloud(500);
    }

    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`🎉 Account created! Your Unique ID is ${uniqueId}`, 'success');

    if (typeof App !== 'undefined' && App.onAuthStateChanged) {
      App.onAuthStateChanged(this.currentUser);
    }
    return newUser;
  },

  // ── EMAIL / UNIQUE ID SIGN-IN ──────────────────────────────
  async loginWithEmail(emailOrId, password) {
    const identifier = (emailOrId || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!identifier) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Please enter your email or Unique ID', 'error');
      return null;
    }

    if (!cleanPass) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Please enter your password', 'error');
      return null;
    }

    // 1. Try signin via Supabase if identifier is email and Supabase configured
    if (identifier.includes('@') && typeof SupabaseGateway !== 'undefined' && SupabaseGateway.isConfigured()) {
      try {
        const sbData = await SupabaseGateway.signInEmail(identifier, cleanPass);
        if (sbData && sbData.user) {
          const sbUser = sbData.user;
          const meta = sbUser.user_metadata || {};
          const user = {
            uid: sbUser.id,
            uniqueId: 'UID-' + sbUser.id.replace(/-/g, '').slice(-6).toUpperCase(),
            email: sbUser.email,
            name: meta.full_name || meta.name || identifier.split('@')[0],
            photoURL: meta.avatar_url || meta.picture || '',
            provider: 'supabase_email',
            createdAt: sbUser.created_at || new Date().toISOString()
          };
          this.currentUser = user;
          localStorage.setItem(this.STORAGE_ACTIVE_USER, JSON.stringify(user));
          if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
          showToast(`✅ Welcome back, ${this.getUserDisplayName()}!`, 'success');

          // Trigger Supabase cloud restore
          if (typeof DB !== 'undefined' && DB.restoreFromSupabaseCloud) {
            DB.restoreFromSupabaseCloud(user.uid);
          }

          if (typeof App !== 'undefined' && App.onAuthStateChanged) {
            App.onAuthStateChanged(this.currentUser);
          }
          return user;
        }
      } catch (sbErr) {
        console.warn('[Auth] Supabase signin note:', sbErr.message);
      }
    }

    // 2. Try signin via Firebase if identifier is email and Firebase configured
    if (identifier.includes('@') && typeof FirebaseGateway !== 'undefined' && FirebaseGateway.isConfigured()) {
      try {
        const fbUser = await FirebaseGateway.signInEmail(identifier, cleanPass);
        if (fbUser) {
          const user = {
            uid: fbUser.uid,
            uniqueId: 'UID-' + fbUser.uid.slice(-6).toUpperCase(),
            email: fbUser.email,
            name: fbUser.displayName || identifier.split('@')[0],
            photoURL: fbUser.photoURL || '',
            provider: 'firebase_email',
            createdAt: new Date().toISOString()
          };
          this.currentUser = user;
          localStorage.setItem(this.STORAGE_ACTIVE_USER, JSON.stringify(user));
          if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
          showToast(`✅ Welcome back, ${this.getUserDisplayName()}!`, 'success');

          if (typeof DB !== 'undefined' && DB.restoreFromSupabaseCloud) {
            DB.restoreFromSupabaseCloud(user.uid);
          }

          if (typeof App !== 'undefined' && App.onAuthStateChanged) {
            App.onAuthStateChanged(this.currentUser);
          }
          return user;
        }
      } catch (fbErr) {
        console.warn('[Auth] Firebase signin failed, checking partitioned storage:', fbErr.message);
      }
    }

    const users = this._getUsersDb();
    const user = users.find(u => 
      u.email.toLowerCase() === identifier || 
      (u.uniqueId && u.uniqueId.toLowerCase() === identifier) ||
      u.uid.toLowerCase() === identifier
    );

    if (!user) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Account not found. Please create an account first.', 'error');
      return null;
    }

    const passHash = typeof hashPin === 'function' ? await hashPin(cleanPass) : btoa(cleanPass);
    if (user.passwordHash && user.passwordHash !== passHash) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Incorrect password. Please try again.', 'error');
      return null;
    }

    this.currentUser = user;
    localStorage.setItem(this.STORAGE_ACTIVE_USER, JSON.stringify(user));

    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ Welcome back, ${this.getUserDisplayName()}!`, 'success');

    if (typeof App !== 'undefined' && App.onAuthStateChanged) {
      App.onAuthStateChanged(this.currentUser);
    }
    return user;
  },

  // ── SIGN OUT / SWITCH ACCOUNT ──────────────────────────────
  logout(skipConfirm = false) {
    if (!skipConfirm && !confirm('Are you sure you want to sign out of Rentora?')) return;
    
    if (typeof SupabaseGateway !== 'undefined') {
      SupabaseGateway.signOut();
    }
    if (typeof FirebaseGateway !== 'undefined') {
      FirebaseGateway.signOut();
    }

    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_ACTIVE_USER);
    if (typeof SoundFX !== 'undefined' && SoundFX.toast) SoundFX.toast('info');
    showToast('👋 Signed out successfully', 'info');

    if (typeof App !== 'undefined' && App.onAuthStateChanged) {
      App.onAuthStateChanged(null);
    }
  }
};

window.Auth = Auth;
