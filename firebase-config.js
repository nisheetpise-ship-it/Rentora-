// ============================================================
// RENTORA — FIREBASE CONFIGURATION & CLOUD AUTHENTICATION GATEWAY
// Supports Official Firebase Google Auth, Email/Password, & Cloud Firestore
// Powered by Rentora
// ============================================================

const FirebaseGateway = {
  // ── FIREBASE PROJECT CONFIGURATION ──────────────────────────
  // Replace these with your Firebase project credentials from Firebase Console:
  // Firebase Console → Project Settings → General → Your apps → SDK setup and configuration
  config: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "rentora-pg.firebaseapp.com",
    projectId: "rentora-pg",
    storageBucket: "rentora-pg.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
  },

  initialized: false,
  auth: null,
  db: null,

  // Load custom config from localStorage if saved via UI
  loadSavedConfig() {
    try {
      const saved = localStorage.getItem('rentora_firebase_custom_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.apiKey && parsed.apiKey !== 'YOUR_FIREBASE_API_KEY') {
          this.config = Object.assign({}, this.config, parsed);
        }
      }
    } catch (e) {
      console.warn('[Firebase] Could not read custom config:', e);
    }
  },

  saveCustomConfig(newConfig) {
    try {
      this.config = Object.assign({}, this.config, newConfig);
      localStorage.setItem('rentora_firebase_custom_config', JSON.stringify(this.config));
      return this.init(true);
    } catch (e) {
      console.error('[Firebase] Save config failed:', e);
      return false;
    }
  },

  isConfigured() {
    this.loadSavedConfig();
    return !!(
      this.config &&
      this.config.apiKey &&
      this.config.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
      this.config.projectId &&
      this.config.projectId !== 'rentora-pg'
    );
  },

  // ── INITIALIZE FIREBASE APP & AUTH ──────────────────────────
  init(forceReinit = false) {
    if (this.initialized && !forceReinit) return true;
    this.loadSavedConfig();

    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] Firebase SDK not loaded in window. Offline mode active.');
      return false;
    }

    try {
      if (!this.isConfigured()) {
        console.info('[Firebase] Awaiting live Firebase project credentials in firebase-config.js');
        return false;
      }

      if (firebase.apps.length === 0) {
        firebase.initializeApp(this.config);
      } else if (forceReinit) {
        // App already initialized
      }

      this.auth = firebase.auth();
      if (firebase.firestore) {
        this.db = firebase.firestore();
      }
      this.initialized = true;
      console.log('[Firebase] Successfully initialized for project:', this.config.projectId);
      return true;
    } catch (err) {
      console.error('[Firebase] Initialization error:', err);
      this.initialized = false;
      return false;
    }
  },

  // ── GOOGLE AUTHENTICATION (POPUP + REDIRECT FALLBACK) ───────
  async signInWithGoogle() {
    // 1. Verify if Firebase is configured with real project credentials
    if (!this.isConfigured()) {
      this.showConfigModal();
      return { success: false, reason: 'unconfigured' };
    }

    if (!this.init()) {
      showToast('Could not initialize Firebase. Check console for details.', 'error');
      return { success: false, reason: 'init_failed' };
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });

      // Attempt Popup first
      let result;
      try {
        result = await this.auth.signInWithPopup(provider);
      } catch (popupErr) {
        // Handle popup blockers by falling back to redirect
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
          if (popupErr.code === 'auth/popup-blocked') {
            console.warn('[Firebase] Popup blocked, attempting redirect...');
            await this.auth.signInWithRedirect(provider);
            return { success: false, pendingRedirect: true };
          }
          // User closed popup
          return { success: false, cancelled: true };
        }
        throw popupErr;
      }

      if (result && result.user) {
        return { success: true, user: result.user };
      }
      return { success: false, reason: 'no_user_returned' };
    } catch (err) {
      console.error('[Firebase] Google Sign-In error:', err);
      let userMsg = 'Google sign-in failed. Please try again.';

      if (err.code === 'auth/unauthorized-domain') {
        userMsg = `Domain not authorized. Add '${window.location.hostname}' to Firebase Console → Authentication → Settings → Authorized domains.`;
      } else if (err.code === 'auth/network-request-failed') {
        userMsg = 'Network error. Please check your internet connection.';
      } else if (err.code === 'auth/operation-not-allowed') {
        userMsg = 'Google Sign-In is disabled in your Firebase Console. Please enable it under Authentication → Sign-in method.';
      } else if (err.message) {
        userMsg = err.message;
      }

      showToast(userMsg, 'error');
      return { success: false, error: err };
    }
  },

  // ── CHECK REDIRECT RESULT ON APP STARTUP ───────────────────
  async checkRedirectResult() {
    if (!this.isConfigured() || !this.init()) return null;
    try {
      const result = await this.auth.getRedirectResult();
      if (result && result.user) {
        console.log('[Firebase] Redirect sign-in successful:', result.user.email);
        return result.user;
      }
    } catch (err) {
      console.error('[Firebase] Redirect result error:', err);
      showToast('Google sign-in redirect error: ' + (err.message || 'Unknown'), 'error');
    }
    return null;
  },

  // ── EMAIL / PASSWORD AUTH VIA FIREBASE ─────────────────────
  async signUpEmail(email, password) {
    if (!this.isConfigured() || !this.init()) return null;
    try {
      const cred = await this.auth.createUserWithEmailAndPassword(email, password);
      return cred.user;
    } catch (err) {
      console.error('[Firebase] Email signup error:', err);
      throw err;
    }
  },

  async signInEmail(email, password) {
    if (!this.isConfigured() || !this.init()) return null;
    try {
      const cred = await this.auth.signInWithEmailAndPassword(email, password);
      return cred.user;
    } catch (err) {
      console.error('[Firebase] Email signin error:', err);
      throw err;
    }
  },

  async signOut() {
    if (this.auth) {
      try {
        await this.auth.signOut();
      } catch (e) {
        console.warn('[Firebase] SignOut warning:', e);
      }
    }
  },

  // ── SAVE USER WORKSPACE TO FIRESTORE ────────────────────────
  async saveUserWorkspace(uid, workspaceData) {
    if (!this.isConfigured() || !this.init()) {
      console.log('[Firebase] Operating in local/offline storage mode');
      return { success: true, mode: 'local' };
    }
    if (!this.db) {
      console.log('[Firebase] Firestore not initialized, data saved locally');
      return { success: true, mode: 'local' };
    }

    const userId = uid || (this.auth && this.auth.currentUser ? this.auth.currentUser.uid : '');
    if (!userId) {
      console.warn('[Firebase] No authenticated UID provided for cloud save');
      return { success: true, mode: 'local_no_uid' };
    }

    try {
      const now = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();

      // 1. Profile document under /users/{userId}
      await this.db.collection('users').doc(userId).set({
        uid: userId,
        email: (this.auth && this.auth.currentUser ? this.auth.currentUser.email : '') || '',
        name: workspaceData.ownerName || '',
        role: 'owner',
        onboarded: true,
        updatedAt: now
      }, { merge: true });

      // 2. Property document under /users/{userId}/property/main
      await this.db.collection('users').doc(userId).collection('property').doc('main').set({
        name: workspaceData.propName || '',
        owner: workspaceData.ownerName || '',
        phone: workspaceData.phone || '',
        address: workspaceData.address || '',
        tagline: workspaceData.tagline || '',
        defaultBedPrice: workspaceData.defaultBedPrice || 6000,
        defaultCapacity: workspaceData.defaultCapacity || 2,
        bankId: workspaceData.bankId || '',
        upiId: workspaceData.bankId || '',
        logo: workspaceData.logo || '',
        currency: '₹',
        updatedAt: now
      }, { merge: true });

      console.log('[Firebase] Cloud workspace saved to Firestore for UID:', userId);
      return { success: true, mode: 'firestore' };
    } catch (err) {
      console.error('[Firebase] saveUserWorkspace Firestore write failed:', err);
      throw err;
    }
  },

  // ── HELPFUL MODAL: FIREBASE SETUP GUIDE ─────────────────────
  showConfigModal() {
    const existingModal = document.getElementById('firebase-setup-modal');
    if (existingModal) existingModal.remove();

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isFileProto = window.location.protocol === 'file:';

    const modal = document.createElement('div');
    modal.id = 'firebase-setup-modal';
    modal.className = 'modal-overlay open';
    modal.style.zIndex = '999999';

    modal.innerHTML = `
      <div class="modal-sheet" style="max-width:520px; max-height:90vh; overflow-y:auto; border-radius:var(--radius-2xl)">
        <div class="modal-handle"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px">
          <div style="display:flex; align-items:center; gap:8px">
            <span style="font-size:24px">🔥</span>
            <div>
              <h3 style="font-size:17px; font-weight:800; color:var(--text-primary); margin:0">Connect Firebase for Real Google Auth</h3>
              <p style="font-size:12px; color:var(--text-secondary); margin:2px 0 0">Official Google Firebase Spark Plan (100% Free)</p>
            </div>
          </div>
          <button type="button" class="btn-ghost" onclick="document.getElementById('firebase-setup-modal').remove()" style="font-size:18px; border:none; background:none; cursor:pointer">✕</button>
        </div>

        ${isFileProto ? `
          <div style="background:rgba(239, 68, 68, 0.12); border:1px solid rgba(239, 68, 68, 0.3); border-radius:var(--radius-md); padding:10px 12px; margin-bottom:14px; font-size:12px; color:var(--accent-red)">
            ⚠️ <strong>Notice:</strong> You are currently viewing via <code>file:///</code> protocol. Google OAuth requires HTTP/HTTPS (e.g. <code>http://localhost:3000</code>). Run <code>start-app.bat</code> to launch via local server!
          </div>
        ` : ''}

        <p style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:16px">
          Rentora uses Google Firebase for production authentication. To activate real Google Sign-In, paste your Firebase web app keys below or configure <code>firebase-config.js</code>:
        </p>

        <form onsubmit="event.preventDefault(); FirebaseGateway.handleConfigFormSubmit();">
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label" style="font-size:12px">Firebase API Key *</label>
            <input class="form-input" id="cfg-fb-key" placeholder="AIzaSy..." value="${this.config.apiKey !== 'YOUR_FIREBASE_API_KEY' ? this.config.apiKey : ''}" required>
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label" style="font-size:12px">Project ID *</label>
            <input class="form-input" id="cfg-fb-proj" placeholder="my-rentora-pg" value="${this.config.projectId !== 'rentora-pg' ? this.config.projectId : ''}" required>
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label" style="font-size:12px">Auth Domain</label>
            <input class="form-input" id="cfg-fb-auth-dom" placeholder="my-rentora-pg.firebaseapp.com" value="${this.config.authDomain}">
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label" style="font-size:12px">App ID</label>
            <input class="form-input" id="cfg-fb-app-id" placeholder="1:123456789:web:abcdef..." value="${this.config.appId}">
          </div>

          <div style="display:flex; gap:8px">
            <button type="submit" class="btn btn-primary" style="flex:1">
              💾 Save &amp; Connect Google Auth
            </button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('firebase-setup-modal').remove()">
              Cancel
            </button>
          </div>
        </form>

        <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border); font-size:11.5px; color:var(--text-muted); line-height:1.4">
          💡 <em>Tip: You can also create an account immediately using <strong>Email / Unique ID &amp; Password</strong> below without Firebase setup!</em>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  handleConfigFormSubmit() {
    const key = document.getElementById('cfg-fb-key').value.trim();
    const proj = document.getElementById('cfg-fb-proj').value.trim();
    const dom = document.getElementById('cfg-fb-auth-dom').value.trim() || `${proj}.firebaseapp.com`;
    const appId = document.getElementById('cfg-fb-app-id').value.trim();

    if (!key || !proj) {
      showToast('Please fill in both API Key and Project ID', 'error');
      return;
    }

    const saved = this.saveCustomConfig({
      apiKey: key,
      projectId: proj,
      authDomain: dom,
      appId: appId || `1:000000000:web:${proj}`
    });

    const modal = document.getElementById('firebase-setup-modal');
    if (modal) modal.remove();

    if (saved) {
      showToast('✅ Firebase connected! Launching Google Sign-In...', 'success');
      setTimeout(() => {
        Auth.loginWithGoogle();
      }, 500);
    } else {
      showToast('Firebase configuration saved.', 'info');
    }
  }
};

window.FirebaseGateway = FirebaseGateway;
