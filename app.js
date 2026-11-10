// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — MAIN CONTROLLER
// Powered by Rentora
// ============================================================

const DocUploadManager = {
  currentDocs: { front: null, back: null, extra: [] }, // Stores base64 payloads before saving
  currentTenantId: null,
  currentTenantName: '',
  pendingDeletions: [],
  _confirmAction: null,

  reset() {
    this.currentDocs = { front: null, back: null, extra: [] };
    this.currentTenantId = null;
    this.currentTenantName = '';
    this.pendingDeletions = [];
    this.closeConfirmPrompt();
  },

  async loadFromTenant(tenantId) {
    this.reset();
    this.currentTenantId = tenantId;
    this.pendingDeletions = [];
    const t = DB.getTenantById(tenantId);
    this.currentTenantName = t ? t.name : '';
    if (!t || !t.docs || !Array.isArray(t.docs)) return;

    for (let i = 0; i < t.docs.length; i++) {
      const docId = t.docs[i];
      try {
        const data = await ImageDB.get(docId);
        if (data) {
          const docObj = {
            id: docId,
            name: `Document ${i + 1}`,
            size: ImageUtils.formatSize(Math.round(data.length * 0.75)),
            data: data
          };

          if (i === 0) {
            docObj.type = 'front';
            this.currentDocs.front = docObj;
          } else if (i === 1) {
            docObj.type = 'back';
            this.currentDocs.back = docObj;
          } else {
            docObj.type = 'extra';
            this.currentDocs.extra.push(docObj);
          }
        }
      } catch (err) {
        console.error('Failed to load document:', docId, err);
      }
    }
  },

  handleFileSelect: async function(type, inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Please upload an image file', 'error');

    try {
      const base64 = await ImageUtils.compressImage(file);
      const doc = {
        id: generateId('doc'),
        type: type,
        name: file.name,
        size: ImageUtils.formatSize(file.size),
        data: base64
      };

      if (type === 'front') this.currentDocs.front = doc;
      else if (type === 'back') this.currentDocs.back = doc;
      else this.currentDocs.extra.push(doc);

      this.renderUI();
    } catch (e) {
      showToast('Error processing image', 'error');
    }
  },

  confirmRemoveDoc(type, id, title) {
    const tenantName = this.currentTenantName || (this.currentTenantId ? DB.getTenantById(this.currentTenantId)?.name : '') || 'the tenant';
    const docLabel = title || (type === 'front' ? 'Front Side' : (type === 'back' ? 'Back Side' : 'Identity Document'));

    this.showFormalDeletePrompt({
      tenantName: tenantName,
      docLabel: docLabel,
      onConfirm: () => {
        if (id && !this.pendingDeletions.includes(id)) {
          this.pendingDeletions.push(id);
        }
        this.removeDoc(type, id);
        try { SoundFX.error(); } catch (e) {}
        showToast(`🗑️ Identity document (${docLabel}) for ${tenantName} removed`, 'info');
      }
    });
  },

  showFormalDeletePrompt({ tenantName, docLabel, onConfirm }) {
    this.closeConfirmPrompt();
    this._confirmAction = onConfirm;

    const overlay = document.createElement('div');
    overlay.id = 'doc-confirm-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:10050; display:flex; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(3px);';

    overlay.innerHTML = `
      <div style="background:var(--bg-card, #ffffff); border:1px solid var(--border); border-radius:18px; max-width:380px; width:100%; padding:22px; box-shadow:0 20px 40px rgba(0,0,0,0.3); text-align:center; box-sizing:border-box;">
        <div style="width:52px; height:52px; border-radius:50%; background:rgba(239,68,68,0.12); color:#ef4444; font-size:26px; display:flex; align-items:center; justify-content:center; margin:0 auto 14px;">
          🗑️
        </div>
        <div style="font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">
          Delete Identity Document?
        </div>
        <div style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:20px;">
          Are you sure you want to delete the <strong>${docLabel}</strong> identity document of tenant <strong>${tenantName}</strong>?
          <div style="margin-top:8px; color:#ef4444; font-weight:600; font-size:12px;">
            ⚠️ This document will be permanently deleted.
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-outline" style="flex:1; padding:10px 14px; border-radius:10px; font-weight:600;" onclick="DocUploadManager.closeConfirmPrompt()">
            Cancel
          </button>
          <button type="button" class="btn btn-danger" style="flex:1; padding:10px 14px; border-radius:10px; font-weight:700; background:#ef4444; color:#fff;" onclick="DocUploadManager.executeConfirmedDelete()">
            Delete Permanently
          </button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeConfirmPrompt();
    });

    document.body.appendChild(overlay);
  },

  executeConfirmedDelete() {
    const action = this._confirmAction;
    this.closeConfirmPrompt();
    if (typeof action === 'function') {
      action();
    }
  },

  closeConfirmPrompt() {
    this._confirmAction = null;
    const el = document.getElementById('doc-confirm-overlay');
    if (el) el.remove();
  },

  removeDoc(type, id) {
    if (type === 'front') this.currentDocs.front = null;
    else if (type === 'back') this.currentDocs.back = null;
    else this.currentDocs.extra = this.currentDocs.extra.filter(d => d.id !== id);
    this.renderUI();
  },

  async saveAllToDB() {
    const savedDocs = [];
    const all = [];
    if (this.currentDocs.front) all.push(this.currentDocs.front);
    if (this.currentDocs.back) all.push(this.currentDocs.back);
    all.push(...this.currentDocs.extra);

    for (const doc of all) {
      await ImageDB.save(doc.id, doc.data);
      savedDocs.push({ id: doc.id, type: doc.type, name: doc.name, size: doc.size });
    }
    return savedDocs;
  },

  renderUI() {
    const container = document.getElementById('doc-upload-container');
    if (!container) return;

    const renderCard = (type, title, doc) => {
      if (doc) {
        return `
          <div class="doc-card">
            <img src="${doc.data}" class="doc-thumb" onclick="DocUploadManager.viewFullscreen('${doc.data}')">
            <div class="doc-info">
              <div class="doc-name">${title}</div>
              <div class="doc-size">Uploaded • ${doc.size}</div>
            </div>
            <div class="doc-actions">
              <button class="btn btn-ghost" onclick="document.getElementById('file-upload-${type}').click()">🔄</button>
              <button type="button" class="btn btn-ghost" style="color:var(--danger); cursor:pointer;" onclick="DocUploadManager.confirmRemoveDoc('${type}', '${doc.id}', '${title}')" title="Delete document">🗑️</button>
            </div>
            <input type="file" id="file-upload-${type}" accept="image/*" style="display:none" onchange="DocUploadManager.handleFileSelect('${type}', this)">
          </div>
        `;
      } else {
        return `
          <div class="doc-upload-btn" onclick="document.getElementById('file-upload-${type}').click()">
            <div class="doc-upload-icon">📄</div>
            <div class="doc-upload-text">Upload ${title}</div>
          </div>
          <input type="file" id="file-upload-${type}" accept="image/*" style="display:none" onchange="DocUploadManager.handleFileSelect('${type}', this)">
        `;
      }
    };

    let extraHtml = '';
    this.currentDocs.extra.forEach((doc, idx) => {
      extraHtml += `
        <div class="doc-card mt-8">
          <img src="${doc.data}" class="doc-thumb" onclick="DocUploadManager.viewFullscreen('${doc.data}')">
          <div class="doc-info">
            <div class="doc-name">Extra Image ${idx + 1}</div>
            <div class="doc-size">Uploaded • ${doc.size}</div>
          </div>
          <div class="doc-actions">
            <button type="button" class="btn btn-ghost" style="color:var(--danger); cursor:pointer;" onclick="DocUploadManager.confirmRemoveDoc('extra', '${doc.id}', 'Extra Image ${idx + 1}')" title="Delete document">🗑️</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="form-label" style="margin-bottom:8px">Identity Documents (Optional)</div>
      <div class="doc-grid">
        ${renderCard('front', 'Front Side', this.currentDocs.front)}
        ${renderCard('back', 'Back Side', this.currentDocs.back)}
      </div>
      ${extraHtml}
      <button class="btn btn-outline btn-full mt-8" onclick="document.getElementById('file-upload-extra').click()">+ Add More Images</button>
      <input type="file" id="file-upload-extra" accept="image/*" style="display:none" onchange="DocUploadManager.handleFileSelect('extra', this)">
    `;
  },

  viewFullscreen(src) {
    let viewer = document.getElementById('image-viewer-modal');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'image-viewer-modal';
      viewer.className = 'image-viewer-modal';
      viewer.innerHTML = `
        <div class="viewer-controls" style="display:flex; gap:12px">
          <a id="viewer-download" href="" download="Document.jpg" class="btn btn-ghost viewer-close" style="text-decoration:none; display:flex;">📥</a>
          <button class="btn btn-ghost viewer-close" onclick="document.getElementById('image-viewer-modal').style.display='none'">✕</button>
        </div>
        <div class="viewer-content">
          <img id="viewer-img" src="">
        </div>
      `;
      document.body.appendChild(viewer);
    }
    document.getElementById('viewer-img').src = src;
    document.getElementById('viewer-download').href = src;
    viewer.style.display = 'flex';
  }
};

const App = {
  currentTab: 'dashboard',
  pinBuffer: '',
  authGatewayMode: 'signin',

  async init() {
    // Reset WhatsApp reminder session indicators on reload
    if (typeof WhatsApp !== 'undefined' && WhatsApp.resetSessionIndicators) {
      WhatsApp.resetSessionIndicators();
    }

    // Initialize Commercial Cloud Authentication session
    if (typeof Auth !== 'undefined' && Auth.init) {
      Auth.init();
    }

    // Synchronize branding and saved logo across all components
    this.syncGlobalBranding();

    // Start cinematic logo reveal & splash screen
    this.initSplash();

    // Apply dark mode immediately
    if (DB.getDarkMode()) document.documentElement.setAttribute('data-theme', 'dark');

    // Update Drawer with active user info
    this.updateDrawerUserInfo();

    // Route startup based on Authentication & Onboarding status
    this.routeStartup();

    // Initialize Subscription & 10-Day Free Trial Monitor
    if (typeof Subscription !== 'undefined' && Subscription.init) {
      Subscription.init();
    }
  },

  routeStartup() {
    const authGateway = document.getElementById('auth-gateway-screen');
    const wizardEl = document.getElementById('onboarding-wizard-screen');
    const authPinEl = document.getElementById('auth-screen');
    const appEl = document.getElementById('app');

    // 1. Authentication Gate: If unauthenticated, show Commercial Auth Gateway
    if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
      if (wizardEl) wizardEl.style.display = 'none';
      if (authPinEl) authPinEl.style.display = 'none';
      if (appEl) appEl.style.display = 'none';
      if (authGateway) {
        authGateway.style.display = 'flex';
        authGateway.style.opacity = '1';
      }
      return;
    }

    // Authenticated -> hide login gateway
    if (authGateway) authGateway.style.display = 'none';
    this.updateDrawerUserInfo();

    // 2. Multi-Step Onboarding Setup Gate (First-time PG setup)
    if (typeof DB !== 'undefined' && !DB.hasCompletedOnboarding()) {
      if (authPinEl) authPinEl.style.display = 'none';
      if (appEl) appEl.style.display = 'none';
      if (wizardEl) {
        wizardEl.style.display = 'flex';
        wizardEl.style.opacity = '1';
        wizardEl.style.transform = 'none';
      }
      if (typeof Onboarding !== 'undefined' && Onboarding.init) {
        Onboarding.init();
      }
      return;
    }

    // Setup completed -> hide wizard
    if (wizardEl) wizardEl.style.display = 'none';

    // 3. App Lock PIN Gate
    // Only show PIN screen if user explicitly enabled App Lock AND has a PIN saved.
    // If no PIN is configured (!DB.isInitialized()), skip straight to dashboard.
    if (typeof DB !== 'undefined' && DB.isAppLockEnabled() && DB.isInitialized()) {
      if (appEl) appEl.style.display = 'none';
      if (authPinEl) authPinEl.style.display = 'flex';
      this.showAuthPin();
    } else {
      this.bypassAuth();
    }
  },

  onAuthStateChanged(user) {
    this.updateDrawerUserInfo();
    this.syncGlobalBranding();
    this.routeStartup();
  },

  handleSignOut() {
    this.closeNavDrawer();
    if (typeof Auth !== 'undefined') {
      Auth.logout();
    }
  },

  launchDashboardAfterOnboarding() {
    this.syncGlobalBranding();
    this.updateDrawerUserInfo();

    // 1. Hide onboarding wizard completely
    const wizardEl = document.getElementById('onboarding-wizard-screen');
    if (wizardEl) wizardEl.style.display = 'none';

    // 2. Hide auth gateway completely
    const authGateway = document.getElementById('auth-gateway-screen');
    if (authGateway) authGateway.style.display = 'none';

    // 3. Hide PIN screen completely
    const authPinEl = document.getElementById('auth-screen');
    if (authPinEl) authPinEl.style.display = 'none';

    // 4. Remove splash screen if still in DOM
    const splash = document.getElementById('splash-screen');
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);

    // 5. Open Dashboard directly
    this.bypassAuth();
  },

  setAuthGatewayMode(mode) {
    this.authGatewayMode = mode;
    const tabSignIn = document.getElementById('tab-gw-signin');
    const tabSignUp = document.getElementById('tab-gw-signup');
    const grpName = document.getElementById('grp-gw-name');
    const grpConfirm = document.getElementById('grp-gw-confirm');
    const lblIdent = document.getElementById('lbl-gw-ident');
    const btnSubmit = document.getElementById('btn-gw-submit');

    if (tabSignIn) tabSignIn.classList.toggle('active', mode === 'signin');
    if (tabSignUp) tabSignUp.classList.toggle('active', mode === 'signup');

    if (mode === 'signup') {
      if (grpName) grpName.style.display = 'block';
      if (grpConfirm) grpConfirm.style.display = 'block';
      if (lblIdent) lblIdent.textContent = 'Email Address *';
      if (btnSubmit) btnSubmit.textContent = 'Create Account & Continue →';
    } else {
      if (grpName) grpName.style.display = 'none';
      if (grpConfirm) grpConfirm.style.display = 'none';
      if (lblIdent) lblIdent.textContent = 'Email Address or Unique ID *';
      if (btnSubmit) btnSubmit.textContent = 'Sign In to Workspace →';
    }
  },

  togglePasswordVisibility(inputId) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  },

  async handleAuthGatewaySubmit() {
    const identInp = document.getElementById('inp-gw-ident');
    const passInp = document.getElementById('inp-gw-pass');
    const nameInp = document.getElementById('inp-gw-name');
    const confirmInp = document.getElementById('inp-gw-confirm');

    const ident = identInp ? identInp.value.trim() : '';
    const pass = passInp ? passInp.value.trim() : '';
    const name = nameInp ? nameInp.value.trim() : '';
    const confirmPass = confirmInp ? confirmInp.value.trim() : '';

    if (this.authGatewayMode === 'signup') {
      if (!name) return showToast('Please enter your full name', 'error');
      if (!ident || !ident.includes('@')) return showToast('Please enter a valid email address', 'error');
      if (!pass || pass.length < 6) return showToast('Password must be at least 6 characters', 'error');
      if (pass !== confirmPass) return showToast('Passwords do not match', 'error');

      await Auth.signupWithEmail(ident, pass, name);
    } else {
      if (!ident) return showToast('Please enter your email or Unique ID', 'error');
      if (!pass) return showToast('Please enter your password', 'error');

      await Auth.loginWithEmail(ident, pass);
    }
  },

  updateDrawerUserInfo() {
    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    const nameEl = document.getElementById('drawer-user-name');
    const emailEl = document.getElementById('drawer-user-email');
    const uidEl = document.getElementById('drawer-user-uid');
    if (nameEl) nameEl.textContent = user ? (user.name || 'Owner') : 'Guest';
    if (emailEl) emailEl.textContent = user ? (user.email || 'guest@rentora.app') : '';
    if (uidEl) uidEl.textContent = user ? (user.uniqueId || (user.uid ? `UID-${user.uid.slice(-6).toUpperCase()}` : '')) : '';
  },

  initSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    // Platform Logo: Always use the fixed Rentora platform logo
    const splashImg = splash.querySelector('.splash-logo-img');
    if (splashImg) {
      splashImg.src = typeof DB !== 'undefined' && DB.getPlatformLogo ? DB.getPlatformLogo() : 'assets/rentora-logo.jpg';
    }

    const MIN_SPLASH_TIME = 1500;
    const startTime = Date.now();

    const dismissSplash = () => {
      if (splash.dataset.dismissed) return;
      splash.dataset.dismissed = 'true';
      splash.classList.add('splash-fade-out');
      setTimeout(() => {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 400);
    };

    // Allow user to click splash to dismiss immediately
    splash.addEventListener('click', dismissSplash);

    // Calculate delay so full cinematic animation completes smoothly
    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, MIN_SPLASH_TIME - elapsed);
    setTimeout(dismissSplash, delay);

    // Failsafe timeout to prevent any possibility of screen lockup
    setTimeout(dismissSplash, 2000);
  },

  // ── CENTRALIZED GLOBAL BRANDING SYNCHRONIZER ─────────────
  syncGlobalBranding() {
    const prop = typeof DB !== 'undefined' && DB.getProperty ? DB.getProperty() : {};
    const hasCustom = typeof DB !== 'undefined' && DB.hasCustomLogo ? DB.hasCustomLogo() : false;
    const activeLogo = typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '';
    const platformLogo = typeof DB !== 'undefined' && DB.getPlatformLogo ? DB.getPlatformLogo() : 'assets/rentora-logo.jpg';

    // 1. Fixed Rentora Platform Logo on Animated Splash Screen
    const splashImg = document.querySelector('.splash-logo-img');
    if (splashImg) {
      splashImg.src = platformLogo;
    }

    // 2. Fixed Rentora Platform Logo on Auth / Numeric PIN Screen
    const authImgs = document.querySelectorAll('.rentora-auth-logo-img');
    authImgs.forEach(img => {
      img.src = platformLogo;
    });

    // 3. Fixed Rentora Platform Logo on Navigation Drawer Brand Header
    const drawerImgs = document.querySelectorAll('.drawer-brand-logo img');
    drawerImgs.forEach(img => {
      img.src = platformLogo;
    });

    // 4. Invalidate Image & Business Card Caches and synchronize saved Business Card
    if (typeof ImageUtils !== 'undefined' && ImageUtils.clearImageCache) {
      ImageUtils.clearImageCache();
    }
    if (typeof BusinessCard !== 'undefined' && BusinessCard._logoImageCache) {
      BusinessCard._logoImageCache.clear();
    }
    if (typeof DB !== 'undefined' && typeof DB.getBusinessCardCustom === 'function') {
      const bcCustom = DB.getBusinessCardCustom();
      if (bcCustom && bcCustom.logoType !== 'none') {
        bcCustom.logo = activeLogo || '';
        DB.saveBusinessCardCustom(bcCustom);
      }
    }
    if (typeof BusinessCard !== 'undefined' && typeof BusinessCard.updateCardView === 'function') {
      if (document.getElementById('bc-hero-card') || document.getElementById('bc-container')) {
        BusinessCard.updateCardView();
      }
    }

    // 5. Update Home Dashboard Property Hero with PG Owner's Business Logo
    const heroImg = document.getElementById('dash-prop-hero-logo');
    if (heroImg) {
      if (activeLogo) {
        if (heroImg.tagName === 'IMG') {
          heroImg.src = activeLogo;
        } else {
          heroImg.outerHTML = `<img src="${activeLogo}" alt="PG Logo" class="dash-hero-logo-img" id="dash-prop-hero-logo" style="width:48px;height:48px;border-radius:12px;object-fit:cover;border:1.5px solid rgba(255,255,255,0.25)">`;
        }
      }
    }

    // 6. Dynamically update or dismiss Home Page Setup Reminder Bar
    const reminderBar = document.getElementById('dash-logo-reminder-bar');
    if (hasCustom) {
      if (reminderBar) {
        reminderBar.style.transition = 'all 0.3s ease';
        reminderBar.style.opacity = '0';
        reminderBar.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          if (reminderBar && reminderBar.parentNode) {
            reminderBar.parentNode.removeChild(reminderBar);
          }
        }, 300);
      }
    } else {
      if (!reminderBar && this.currentTab === 'dashboard' && typeof Dashboard !== 'undefined') {
        Dashboard.render();
      }
    }

    // 7. Refresh Settings UI if open
    if (this.currentTab === 'settings' && typeof Settings !== 'undefined' && Settings.render) {
      Settings.render();
    }
  },

  updateAuthLogo() {
    this.syncGlobalBranding();
  },

  // ── AUTH: SETUP PIN ──────────────────────────────────────
  showSetupPin() {
    document.getElementById('auth-title').textContent = 'Welcome to Rentora';
    document.getElementById('auth-subtitle').textContent = 'Create your 4-digit security PIN';
    this.pinBuffer = '';
    this._pinStep = 'setup1';
    this._setupPin1 = '';
    this.updatePinDots();
  },

  // ── AUTH: ENTER PIN ──────────────────────────────────────
  showAuthPin() {
    if (typeof WhatsApp !== 'undefined' && WhatsApp.resetSessionIndicators) {
      WhatsApp.resetSessionIndicators();
    }
    document.getElementById('auth-title').textContent = 'Rentora';
    document.getElementById('auth-subtitle').textContent = 'Enter your PIN to continue';
    this.pinBuffer = '';
    this._pinStep = 'auth';
    this.updatePinDots();
  },

  // ── PIN KEY PRESS ────────────────────────────────────────
  async pressKey(key) {
    if (key === '⌫') {
      this.pinBuffer = this.pinBuffer.slice(0, -1);
      try { SoundFX.pinDelete(); } catch (e) {}
    } else if (this.pinBuffer.length < 4) {
      this.pinBuffer += key;
      try { SoundFX.pinKey(key); } catch (e) {}
    }
    this.updatePinDots();
    if (this.pinBuffer.length === 4) {
      await this.handlePinComplete();
    }
  },

  updatePinDots() {
    [0,1,2,3].forEach(i => {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) dot.className = 'pin-dot' + (i < this.pinBuffer.length ? ' filled' : '');
    });
  },

  async handlePinComplete() {
    const pin = this.pinBuffer;
    const step = this._pinStep;

    if (step === 'auth') {
      const hash = await hashPin(pin);
      if (hash === DB.getPassword()) {
        try { SoundFX.pinSuccess(); } catch (e) {}
        this.unlockApp();
      } else {
        try { SoundFX.pinError(); } catch (e) {}
        this.showPinError('Wrong PIN. Try again.');
      }
    } else if (step === 'setup1') {
      this._setupPin1 = pin;
      this._pinStep = 'setup2';
      this.pinBuffer = '';
      this.updatePinDots();
      document.getElementById('auth-subtitle').textContent = 'Confirm your PIN';
    } else if (step === 'setup2') {
      if (pin !== this._setupPin1) {
        try { SoundFX.pinError(); } catch (e) {}
        this.showPinError("PINs don't match. Start over.");
        setTimeout(() => {
          this._pinStep = 'setup1';
          this._setupPin1 = '';
          document.getElementById('auth-subtitle').textContent = 'Create your 4-digit security PIN';
          clearPinError();
        }, 1000);
      } else {
        const hash = await hashPin(pin);
        DB.setPassword(hash);
        DB.setInitialized();
        DB.setAppLockEnabled(true);
        try { SoundFX.pinSuccess(); } catch (e) {}
        this.unlockApp();
      }
    }
  },

  showPinError(msg) {
    [0,1,2,3].forEach(i => {
      const d = document.getElementById(`dot-${i}`);
      if (d) d.className = 'pin-dot error';
    });
    document.getElementById('auth-error').textContent = msg;
    setTimeout(() => {
      this.pinBuffer = '';
      this.updatePinDots();
    }, 600);
  },

  bypassAuth() {
    if (typeof WhatsApp !== 'undefined' && WhatsApp.resetSessionIndicators) {
      WhatsApp.resetSessionIndicators();
    }
    // Remove splash if still present
    const splash = document.getElementById('splash-screen');
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);

    // Hide all overlay screens
    const authGateway = document.getElementById('auth-gateway-screen');
    if (authGateway) authGateway.style.display = 'none';

    const wizardEl = document.getElementById('onboarding-wizard-screen');
    if (wizardEl) wizardEl.style.display = 'none';

    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.style.display = 'none';

    // Show main app
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.style.display = 'block';
      appEl.style.opacity = '1';
    }

    this.navigate('dashboard');
    if (typeof Dashboard !== 'undefined' && Dashboard.render) {
      try { Dashboard.render(); } catch (e) { console.warn('Dashboard render warning:', e); }
    }
    if (typeof Chatbot !== 'undefined') Chatbot.init();
    if (typeof Subscription !== 'undefined' && Subscription.init) Subscription.init();
  },

  unlockApp() {
    if (typeof WhatsApp !== 'undefined' && WhatsApp.resetSessionIndicators) {
      WhatsApp.resetSessionIndicators();
    }
    try { SoundFX.appUnlock(); } catch (e) {}
    document.getElementById('auth-screen').style.opacity = '0';
    document.getElementById('auth-screen').style.transform = 'scale(1.05)';
    document.getElementById('auth-screen').style.transition = 'all 0.3s ease';
    setTimeout(() => {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      this.navigate('dashboard');
      if (typeof Chatbot !== 'undefined') Chatbot.init();
    }, 300);
  },

  // ── NAVIGATION ───────────────────────────────────────────
  navigate(tab) {
    // Paywall Gate for expired subscriptions on premium modules
    if (tab !== 'dashboard' && tab !== 'settings') {
      if (typeof DB !== 'undefined' && !DB.isSubscriptionActive()) {
        if (typeof Subscription !== 'undefined' && Subscription.openPaywallModal) {
          Subscription.openPaywallModal('Access to ' + tab.toUpperCase() + ' requires an active Rentora Premium subscription');
          return;
        }
      }
    }

    if (this.currentTab !== tab) {
      try { SoundFX.navTab(); } catch (e) {}
    }
    this.currentTab = tab;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    // Sync drawer active state
    document.querySelectorAll('.drawer-item[data-drawer-tab]').forEach(el => {
      el.classList.toggle('active', el.dataset.drawerTab === tab);
    });

    renderActiveTab();
  },

  // ── TOP RIGHT THREE-DOTS DRAWER MENU ───────────────────────
  toggleNavDrawer() {
    const overlay = document.getElementById('app-nav-drawer-overlay');
    const drawer = document.querySelector('.app-nav-drawer');
    if (!overlay || !drawer) return;

    if (overlay.classList.contains('open')) {
      this.closeNavDrawer();
    } else {
      this.openNavDrawer();
    }
  },

  openNavDrawer() {
    const overlay = document.getElementById('app-nav-drawer-overlay');
    const drawer = document.querySelector('.app-nav-drawer');
    if (!overlay || !drawer) return;

    this.updateDrawerUserInfo();

    try { SoundFX.dropdown(); } catch (e) {}
    overlay.classList.add('open');
    drawer.classList.add('open');

    // Highlight current active tab in drawer
    document.querySelectorAll('.drawer-item[data-drawer-tab]').forEach(el => {
      el.classList.toggle('active', el.dataset.drawerTab === this.currentTab);
    });
  },

  closeNavDrawer() {
    const overlay = document.getElementById('app-nav-drawer-overlay');
    const drawer = document.querySelector('.app-nav-drawer');
    if (!overlay || !drawer) return;

    overlay.classList.remove('open');
    drawer.classList.remove('open');
  },

  navigateFromDrawer(tab) {
    this.closeNavDrawer();
    this.navigate(tab);
  },

  openPaymentHistoryTab() {
    this.closeNavDrawer();
    this.navigate('history');
  },

  openRentView(view) {
    this.closeNavDrawer();
    if (typeof Rent !== 'undefined' && typeof Rent.setView === 'function') {
      Rent.setView(view);
    }
    this.navigate('rent');
  },
};

window.App = App;

function renderActiveTab() {
  const tab = App.currentTab;
  const titles = {
    dashboard: '🏠 Dashboard',
    rooms: '🏠 Rooms',
    tenants: '👥 Tenants',
    rent: '💰 Rent',
    history: '📜 Payment History',
    expenses: '💸 Expenses',
    settings: '⚙️ Settings'
  };
  document.getElementById('header-title').textContent = titles[tab] || '';

  switch (tab) {
    case 'dashboard': Dashboard.render(); break;
    case 'rooms': Rooms.render(); break;
    case 'tenants': Tenants.render(); break;
    case 'rent': Rent.render(); break;
    case 'history': if (typeof PaymentHistory !== 'undefined') PaymentHistory.render(); break;
    case 'expenses': Expenses.render(); break;
    case 'settings': Settings.render(); break;
  }
}

// ── MODAL SYSTEM ────────────────────────────────────────────
function showModal(title, bodyHtml) {
  SoundFX.modalOpen();
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.add('open');
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  SoundFX.modalClose();
  document.getElementById('modal-overlay').classList.remove('open');
  if (typeof window._modalOnClose === 'function') {
    const cb = window._modalOnClose;
    window._modalOnClose = null;
    cb();
  }
}

// ── TOAST SYSTEM ────────────────────────────────────────────
function showToast(msg, type = 'info') {
  SoundFX.toast(type);
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function clearPinError() {
  document.getElementById('auth-error').textContent = '';
}

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  App.init();
});
