// ============================================================
// RENTORA — EXECUTIVE 4-STEP ONBOARDING & SETUP WIZARD
// Step 1: Bank & UPI  →  Step 2: Business Logo  →  Step 3: Property Info  →  Step 4: Workspace Ready & Launch
// Powered by Rentora
// ============================================================

const Onboarding = {
  currentStep: 1,
  isSubmitting: false,
  lastError: null,
  data: {
    bankId: '',
    payeeName: '',
    logo: '',
    tagline: '',
    propName: '',
    ownerName: '',
    phone: '',
    address: '',
    defaultBedPrice: 6000,
    defaultCapacity: 2
  },

  getDraftStorageKey() {
    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    const uid = user ? user.uid : (typeof Auth !== 'undefined' && Auth.getUserId ? Auth.getUserId() : '');
    return uid ? `rentora_onboarding_draft_${uid}` : 'rentora_onboarding_draft';
  },

  saveDraft() {
    try {
      const key = this.getDraftStorageKey();
      localStorage.setItem(key, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[Onboarding] saveDraft error:', e);
    }
  },

  loadDraft() {
    try {
      const key = this.getDraftStorageKey();
      let saved = localStorage.getItem(key);
      if (!saved && key !== 'rentora_onboarding_draft') {
        saved = localStorage.getItem('rentora_onboarding_draft');
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.data = Object.assign({}, this.data, parsed);
        }
      }
    } catch (e) {
      console.warn('[Onboarding] loadDraft error:', e);
    }
  },

  clearDraft() {
    try {
      localStorage.removeItem(this.getDraftStorageKey());
      localStorage.removeItem('rentora_onboarding_draft');
    } catch (e) {}
  },

  handleFieldInput(field, val) {
    if (!this.data) return;
    this.data[field] = val;
    this.saveDraft();
  },

  goToStep(step) {
    if (step >= 1 && step <= 4) {
      this.currentStep = step;
      this.lastError = null;
      if (typeof DB !== 'undefined' && DB.setOnboardingStep) {
        DB.setOnboardingStep(step);
      }
      if (typeof SoundFX !== 'undefined' && SoundFX.navTab) SoundFX.navTab();
      this.render();
    }
  },

  init() {
    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    if (user) {
      if (user.name && user.name !== 'Google PG Owner') {
        this.data.ownerName = this.data.ownerName || user.name;
      }
      // Resume from saved step if user was midway
      if (typeof DB !== 'undefined' && DB.getOnboardingStep) {
        this.currentStep = DB.getOnboardingStep(user.uid);
      }
    } else {
      this.currentStep = 1;
    }

    // Load persistent draft if saved previously
    this.loadDraft();

    // Load any existing property draft from DB
    if (typeof DB !== 'undefined') {
      const existing = DB.getProperty();
      if (existing) {
        if (!this.data.propName && existing.name && existing.name !== 'Rentora PG') this.data.propName = existing.name;
        if (!this.data.ownerName && existing.owner) this.data.ownerName = existing.owner;
        if (!this.data.phone && existing.phone) this.data.phone = existing.phone;
        if (!this.data.address && existing.address) this.data.address = existing.address;
        if (!this.data.bankId && (existing.upiId || existing.bankId)) this.data.bankId = existing.upiId || existing.bankId;
        if (!this.data.logo && existing.logo) this.data.logo = existing.logo;
        if (!this.data.tagline && existing.tagline) this.data.tagline = existing.tagline;
      }
    }

    this.render();
  },

  render() {
    const wizardEl = document.getElementById('onboarding-wizard-screen');
    if (!wizardEl) return;

    // Step 5 is celebration screen
    if (this.currentStep === 5) {
      wizardEl.innerHTML = this.renderCelebration();
      return;
    }

    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    const userEmail = user ? (user.email || 'Cloud Account') : 'Cloud Account';

    const stepPct = {
      1: '25%',
      2: '50%',
      3: '75%',
      4: '100%'
    }[this.currentStep] || '25%';

    wizardEl.innerHTML = `
      <div class="ob-wrapper">
        <!-- Brand Header with Account Switching -->
        <div class="ob-brand-header">
          <div class="ob-logo-badge">
            <img src="${typeof DB !== 'undefined' && DB.getPlatformLogo ? DB.getPlatformLogo() : 'assets/rentora-logo.jpg'}" alt="Rentora" class="ob-brand-img">
          </div>
          <div class="ob-brand-name">Rentora</div>
          <div class="ob-brand-sub">Commercial Property Cloud Setup</div>

          <!-- Account Badge & Sign Out Button -->
          <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; background:var(--bg-card); padding:5px 12px; border-radius:var(--radius-full); border:1px solid var(--border); font-size:11.5px">
            <span style="color:var(--text-secondary)">Signed in as <strong style="color:var(--text-primary)">${userEmail}</strong></span>
            <span style="color:var(--border)">|</span>
            <button type="button" onclick="Auth.logout(true)" style="background:none; border:none; color:var(--accent-red); font-size:11.5px; font-weight:700; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:3px" title="Sign out or switch account">
              <span>🚪</span> Switch Account
            </button>
          </div>
        </div>

        <!-- 4-Step Progress Container -->
        <div class="ob-progress-container">
          <div class="ob-progress-track">
            <div class="ob-progress-fill" style="width: ${stepPct}"></div>
          </div>
          <div class="ob-step-labels" style="display:grid; grid-template-columns: repeat(4, 1fr); text-align:center">
            <span class="ob-step-label ${this.currentStep >= 1 ? 'active' : ''}" onclick="Onboarding.goToStep(1)" style="cursor:pointer">1. Bank &amp; UPI</span>
            <span class="ob-step-label ${this.currentStep >= 2 ? 'active' : ''}" onclick="Onboarding.goToStep(2)" style="cursor:pointer">2. Logo &amp; Brand</span>
            <span class="ob-step-label ${this.currentStep >= 3 ? 'active' : ''}" onclick="Onboarding.goToStep(3)" style="cursor:pointer">3. Property Info</span>
            <span class="ob-step-label ${this.currentStep >= 4 ? 'active' : ''}">4. Ready &amp; Launch</span>
          </div>
        </div>

        <!-- Wizard Card -->
        <div class="ob-card">
          ${this.renderStepContent()}
        </div>

        <div class="ob-footer-note" style="text-align:center; margin-top:14px; font-size:11px; color:var(--text-muted)">
          🔒 Encrypted Cloud Partition · UID: <strong>${typeof Auth !== 'undefined' ? Auth.getUniqueAccountId() : 'UID-XXXXXX'}</strong>
        </div>
      </div>
    `;

    // Post-render attachments (e.g. live QR generation on Step 1)
    if (this.currentStep === 1) {
      this.updateLiveQrPreview();
    }
  },

  renderStepContent() {
    // ── STEP 1: BANK & UPI ──────────────────────────────────────
    if (this.currentStep === 1) {
      return `
        <div class="ob-step-header">
          <div class="ob-step-badge">Step 1 of 4</div>
          <h2 class="ob-step-title">💳 Bank Account &amp; UPI ID</h2>
          <p class="ob-step-desc">Configure your digital payment handle so tenants can pay rent via QR code.</p>
        </div>

        <div class="form-group">
          <label class="form-label">UPI ID or Virtual Payment Address (VPA) *</label>
          <input class="form-input" id="inp-ob-upi" value="${this.data.bankId || ''}" 
            placeholder="e.g. rudrapg@okaxis or 9876543210@paytm" 
            oninput="Onboarding.handleUpiInput(this.value)" autocomplete="off">
          <div class="fs-11 color-muted mt-4">This UPI ID will appear on tenant rent reminder slips and payment receipts.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Account Holder / Business Payee Name</label>
          <input class="form-input" id="inp-ob-payee" value="${this.data.payeeName || ''}" 
            placeholder="e.g. Rudra PG Management" 
            oninput="Onboarding.handleFieldInput('payeeName', this.value)" autocomplete="off">
        </div>

        <!-- Live QR Code Card Preview -->
        <div class="ob-qr-preview-card" id="ob-qr-card-container">
          <div class="ob-qr-label">Live Payment QR Preview</div>
          <div id="ob-live-qr-holder" class="ob-live-qr-box"></div>
          <div class="ob-qr-handle-text" id="ob-qr-handle-display">${this.data.bankId || 'Enter your UPI ID above'}</div>
        </div>

        <div class="form-actions mt-16">
          <button type="button" class="btn btn-primary btn-full btn-lg" onclick="Onboarding.nextFromStep1()">
            Next: Upload Logo &amp; Branding (Step 2) →
          </button>
        </div>
      `;
    }

    // ── STEP 2: BUSINESS LOGO & BRANDING ────────────────────────
    if (this.currentStep === 2) {
      const hasLogo = !!this.data.logo;
      return `
        <div class="ob-step-header">
          <div class="ob-step-badge">Step 2 of 4</div>
          <h2 class="ob-step-title">🎨 Business Logo &amp; Branding</h2>
          <p class="ob-step-desc">Upload your PG logo to generate branded invoices, business cards, and payment receipts.</p>
        </div>

        <!-- Logo Upload Area -->
        <div class="ob-logo-dropzone" id="ob-logo-dropzone" onclick="document.getElementById('inp-ob-logo-file').click()">
          <input type="file" id="inp-ob-logo-file" accept="image/*" style="display:none" onchange="Onboarding.handleLogoUpload(event)">
          ${hasLogo ? `
            <div class="ob-logo-preview-wrap">
              <img src="${this.data.logo}" alt="Logo Preview" class="ob-logo-img-preview">
              <div class="ob-logo-replace-badge">Click to change</div>
            </div>
          ` : `
            <div class="ob-dropzone-inner">
              <div class="ob-drop-icon">📷</div>
              <div class="ob-drop-title">Click to upload your PG Logo</div>
              <div class="ob-drop-hint">Supports PNG, JPG, or SVG (Square recommended)</div>
            </div>
          `}
        </div>

        <div class="form-group mt-12">
          <label class="form-label">Brand Tagline or Subtitle (Optional)</label>
          <input class="form-input" id="inp-ob-tagline" value="${this.data.tagline || ''}" 
            placeholder="e.g. Premium Coliving &amp; Student Residence" 
            oninput="Onboarding.handleFieldInput('tagline', this.value)" autocomplete="off">
        </div>

        <div class="form-actions mt-16" style="display:flex; gap:10px">
          <button type="button" class="btn btn-ghost" onclick="Onboarding.prevStep()" style="flex:1">← Back</button>
          <button type="button" class="btn btn-primary btn-lg" onclick="Onboarding.nextFromStep2()" style="flex:2">
            Next: Property Details (Step 3) →
          </button>
        </div>
      `;
    }

    // ── STEP 3: PROPERTY & OWNER DETAILS ────────────────────────
    if (this.currentStep === 3) {
      return `
        <div class="ob-step-header">
          <div class="ob-step-badge">Step 3 of 4</div>
          <h2 class="ob-step-title">🏠 Property &amp; Owner Details</h2>
          <p class="ob-step-desc">Enter your primary property location, owner credentials, and default rates.</p>
        </div>

        <div class="form-group">
          <label class="form-label">Property / PG Name *</label>
          <input class="form-input" id="inp-ob-prop-name" value="${this.data.propName || ''}" 
            placeholder="e.g. Rudra Luxury Living" 
            oninput="Onboarding.handleFieldInput('propName', this.value)" autocomplete="off">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Owner / Manager Name *</label>
            <input class="form-input" id="inp-ob-owner-name" value="${this.data.ownerName || ''}" 
              placeholder="Full Name" 
              oninput="Onboarding.handleFieldInput('ownerName', this.value)" autocomplete="name">
          </div>
          <div class="form-group">
            <label class="form-label">Contact / WhatsApp Phone *</label>
            <div style="display:flex; align-items:center; gap:6px">
              <span style="background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:11px 10px; font-weight:700; font-size:13px; color:var(--text-primary)">🇮🇳 +91</span>
              <input class="form-input" id="inp-ob-phone" value="${this.data.phone || ''}" 
                placeholder="10-digit number" type="tel" maxlength="10" style="flex:1" 
                oninput="Onboarding.handleFieldInput('phone', this.value.replace(/[^0-9]/g, '').slice(0, 10))" autocomplete="tel-national">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Full Property Address *</label>
          <textarea class="form-input" id="inp-ob-address" rows="2" 
            placeholder="Street address, landmark, city, and state" 
            oninput="Onboarding.handleFieldInput('address', this.value)" 
            style="resize:vertical" autocomplete="street-address">${this.data.address || ''}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Default Bed Rent (₹/mo)</label>
            <input class="form-input" id="inp-ob-bed-price" type="number" value="${this.data.defaultBedPrice || 6000}"
              oninput="Onboarding.handleFieldInput('defaultBedPrice', parseFloat(this.value) || 0)">
          </div>
          <div class="form-group">
            <label class="form-label">Default Room Capacity</label>
            <input class="form-input" id="inp-ob-capacity" type="number" min="1" max="10" value="${this.data.defaultCapacity || 2}"
              oninput="Onboarding.handleFieldInput('defaultCapacity', parseInt(this.value) || 1)">
          </div>
        </div>

        <div class="form-actions mt-16" style="display:flex; gap:10px">
          <button type="button" class="btn btn-ghost" onclick="Onboarding.prevStep()" style="flex:1">← Back</button>
          <button type="button" class="btn btn-primary btn-lg" onclick="Onboarding.nextFromStep3()" style="flex:2">
            Next: Review Workspace (Step 4) →
          </button>
        </div>
      `;
    }

    // ── STEP 4: WORKSPACE READY & LAUNCH ────────────────────────
    if (this.currentStep === 4) {
      const hasLogo = !!this.data.logo;
      const isMissingCritical = !this.data.propName || !this.data.phone || this.data.phone.length < 10 || !this.data.ownerName || !this.data.address;

      return `
        <div class="ob-step-header">
          <div class="ob-step-badge" style="background:rgba(34, 197, 94, 0.15); color:var(--accent-green)">Step 4 of 4</div>
          <h2 class="ob-step-title">🚀 Workspace Ready</h2>
          <p class="ob-step-desc">Confirm your PG configuration. Your isolated cloud partition is ready to launch.</p>
        </div>

        ${this.lastError ? `
          <div style="background:rgba(239, 68, 68, 0.12); border:1.5px solid rgba(239, 68, 68, 0.4); border-radius:var(--radius-lg); padding:12px 14px; margin-bottom:16px; color:var(--accent-red); font-size:12.5px; line-height:1.4">
            <strong>⚠️ Launch Error:</strong> ${this.lastError}
          </div>
        ` : ''}

        ${isMissingCritical ? `
          <div style="background:rgba(245, 158, 11, 0.12); border:1.5px solid rgba(245, 158, 11, 0.4); border-radius:var(--radius-lg); padding:14px; margin-bottom:16px; color:#d97706; font-size:12.5px">
            <strong>⚠️ Incomplete Property Information:</strong>
            <div style="margin:4px 0 8px">Property Name, Owner Name, 10-digit Contact Phone, and Address are required before launch.</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="Onboarding.goToStep(3)">
              ← Return to Step 3 to Enter Details
            </button>
          </div>
        ` : ''}

        <!-- Executive Summary Review Card -->
        <div style="background:var(--bg-input); border-radius:var(--radius-lg); padding:16px; border:1px solid var(--border); margin-bottom:18px">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--border)">
            <div style="width:52px; height:52px; border-radius:var(--radius-md); overflow:hidden; border:1.5px solid var(--border); background:var(--bg-card); display:flex; align-items:center; justify-content:center; flex-shrink:0">
              ${hasLogo 
                ? `<img src="${this.data.logo}" alt="Logo" style="width:100%; height:100%; object-fit:cover">`
                : `<span style="font-size:26px">🏢</span>`
              }
            </div>
            <div style="flex:1; min-width:0">
              <div style="font-size:17px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                ${this.data.propName ? this.data.propName : '<span style="color:var(--accent-red)">Missing Property Name</span>'}
              </div>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:2px">
                ${this.data.tagline || 'Commercial PG & Hostel Management'}
              </div>
            </div>
            <button type="button" class="btn-ghost" onclick="Onboarding.goToStep(3)" style="font-size:11.5px; padding:4px 8px; border-radius:var(--radius-sm); border:1px solid var(--border)">
              ✏️ Edit
            </button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px">
            <div>
              <span class="color-muted" style="display:block; font-size:11px">Owner / Manager:</span>
              <strong style="color:var(--text-primary)">${this.data.ownerName || 'Not configured'}</strong>
            </div>
            <div>
              <span class="color-muted" style="display:block; font-size:11px">Contact Phone:</span>
              <strong style="color:var(--text-primary)">${this.data.phone ? `+91 ${this.data.phone}` : '<span style="color:var(--accent-red)">+91 N/A</span>'}</strong>
            </div>
            <div style="grid-column:1 / -1">
              <span class="color-muted" style="display:block; font-size:11px">Address:</span>
              <span style="color:var(--text-secondary); word-break:break-word">${this.data.address || 'Address not provided'}</span>
            </div>
            <div>
              <span class="color-muted" style="display:block; font-size:11px">Payment UPI ID:</span>
              <strong style="color:var(--accent-blue)">${this.data.bankId || 'Configured via QR'}</strong>
            </div>
            <div>
              <span class="color-muted" style="display:block; font-size:11px">Default Rent:</span>
              <strong style="color:var(--accent-green)">₹${this.data.defaultBedPrice || 6000}/mo</strong>
            </div>
          </div>
        </div>

        <div class="form-actions mt-16" style="display:flex; gap:10px">
          <button type="button" class="btn btn-ghost" onclick="Onboarding.prevStep()" style="flex:1" ${this.isSubmitting ? 'disabled' : ''}>← Back</button>
          <button type="button" class="btn btn-primary btn-lg" id="btn-ob-launch" onclick="Onboarding.completeSetupAndLaunch()" ${this.isSubmitting ? 'disabled' : ''} style="flex:2; position:relative">
            ${this.isSubmitting 
              ? `<div style="display:inline-flex; align-items:center; gap:8px"><div class="ob-launch-spinner"></div><span>Creating your Rentora workspace...</span></div>`
              : (this.lastError ? `<span>🔄 Retry Launching Workspace</span>` : `<span>🚀 Complete Setup &amp; Launch Rentora</span>`)
            }
          </button>
        </div>
      `;
    }

    return '';
  },

  // ── STEP 5: CELEBRATION SCREEN ─────────────────────────────
  renderCelebration() {
    return `
      <div class="ob-wrapper" style="text-align:center; padding:40px 20px">
        <div style="width:72px; height:72px; border-radius:var(--radius-full); background:rgba(34, 197, 94, 0.15); border:2px solid var(--accent-green); display:inline-flex; align-items:center; justify-content:center; font-size:36px; margin-bottom:20px; animation:ob-pulse 1.2s infinite">
          ✨
        </div>
        <h2 style="font-size:24px; font-weight:800; color:var(--text-primary); margin-bottom:8px">Rentora Workspace Created!</h2>
        <p style="font-size:13.5px; color:var(--text-secondary); max-width:380px; margin:0 auto 24px; line-height:1.5">
          Your commercial property cloud workspace for <strong style="color:var(--text-primary)">${this.data.propName || 'your property'}</strong> is ready.
        </p>
        <div style="display:inline-flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700; color:var(--accent-blue)">
          <div class="ob-launch-spinner" style="width:18px; height:18px; border-width:2.5px"></div>
          <span>Opening your Dashboard...</span>
        </div>
      </div>
    `;
  },

  // ── LIVE QR HANDLER ────────────────────────────────────────
  handleUpiInput(val) {
    this.handleFieldInput('bankId', val.trim());
    this.updateLiveQrPreview();
  },

  updateLiveQrPreview() {
    const handleEl = document.getElementById('ob-qr-handle-display');
    const qrHolder = document.getElementById('ob-live-qr-holder');
    if (handleEl) {
      handleEl.innerText = this.data.bankId || 'Enter your UPI ID above';
    }
    if (qrHolder) {
      qrHolder.innerHTML = '';
      if (this.data.bankId && typeof QRCode !== 'undefined') {
        const upiString = `upi://pay?pa=${encodeURIComponent(this.data.bankId)}&pn=${encodeURIComponent(this.data.payeeName || 'Rentora PG')}&cu=INR`;
        new QRCode(qrHolder, {
          text: upiString,
          width: 140,
          height: 140,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        qrHolder.innerHTML = '<div style="font-size:36px; opacity:0.35">📱</div>';
      }
    }
  },

  // ── LOGO UPLOADER ──────────────────────────────────────────
  handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast('Logo image must be smaller than 2MB', 'error');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.data.logo = e.target.result;
      this.saveDraft();
      if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
      showToast('Logo uploaded successfully!', 'success');
      this.render();
    };
    reader.readAsDataURL(file);
  },

  // ── STEP TRANSITIONS ───────────────────────────────────────
  nextFromStep1() {
    const upiInp = document.getElementById('inp-ob-upi');
    const payeeInp = document.getElementById('inp-ob-payee');

    const upiVal = upiInp ? upiInp.value.trim() : (this.data.bankId || '');
    const payeeVal = payeeInp ? payeeInp.value.trim() : (this.data.payeeName || '');

    if (!upiVal) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      if (upiInp) upiInp.focus();
      return showToast('Please enter your UPI ID or VPA handle to continue', 'error');
    }

    if (!upiVal.includes('@')) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      if (upiInp) upiInp.focus();
      return showToast('Please enter a valid UPI ID format (e.g. name@bank)', 'error');
    }

    this.data.bankId = upiVal;
    this.data.payeeName = payeeVal;
    this.saveDraft();

    this.currentStep = 2;
    if (typeof DB !== 'undefined' && DB.setOnboardingStep) {
      DB.setOnboardingStep(2);
    }
    if (typeof SoundFX !== 'undefined' && SoundFX.navTab) SoundFX.navTab();
    this.render();
  },

  nextFromStep2() {
    const taglineInp = document.getElementById('inp-ob-tagline');
    if (taglineInp) this.data.tagline = taglineInp.value.trim();
    this.saveDraft();

    this.currentStep = 3;
    if (typeof DB !== 'undefined' && DB.setOnboardingStep) {
      DB.setOnboardingStep(3);
    }
    if (typeof SoundFX !== 'undefined' && SoundFX.navTab) SoundFX.navTab();
    this.render();
  },

  nextFromStep3() {
    const nameInp = document.getElementById('inp-ob-prop-name');
    const ownerInp = document.getElementById('inp-ob-owner-name');
    const phoneInp = document.getElementById('inp-ob-phone');
    const addrInp = document.getElementById('inp-ob-address');
    const priceInp = document.getElementById('inp-ob-bed-price');
    const capInp = document.getElementById('inp-ob-capacity');

    const propName = (nameInp ? nameInp.value.trim() : (this.data.propName || ''));
    const ownerName = (ownerInp ? ownerInp.value.trim() : (this.data.ownerName || ''));
    const phone = (phoneInp ? phoneInp.value.trim() : (this.data.phone || ''));
    const address = (addrInp ? addrInp.value.trim() : (this.data.address || ''));
    const bedPrice = priceInp ? (parseFloat(priceInp.value) || 6000) : (this.data.defaultBedPrice || 6000);
    const capacity = capInp ? (parseInt(capInp.value) || 2) : (this.data.defaultCapacity || 2);

    if (!propName) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      if (nameInp) nameInp.focus();
      return showToast('Please enter Property / PG Name', 'error');
    }

    if (!ownerName) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      if (ownerInp) ownerInp.focus();
      return showToast('Please enter Owner / Manager Name', 'error');
    }

    if (!phone || phone.length < 10) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      if (phoneInp) phoneInp.focus();
      return showToast('Please enter a valid 10-digit contact phone number', 'error');
    }

    if (!address) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      if (addrInp) addrInp.focus();
      return showToast('Please enter the property address', 'error');
    }

    this.data.propName = propName;
    this.data.ownerName = ownerName;
    this.data.phone = phone;
    this.data.address = address;
    this.data.defaultBedPrice = bedPrice;
    this.data.defaultCapacity = capacity;
    this.lastError = null;

    // Save draft persistently so Step 4 and reload retain all data
    this.saveDraft();

    // Advance to Step 4 (Workspace Ready review & Launch)
    this.currentStep = 4;
    if (typeof DB !== 'undefined' && DB.setOnboardingStep) {
      DB.setOnboardingStep(4);
    }
    if (typeof SoundFX !== 'undefined' && SoundFX.navTab) SoundFX.navTab();
    this.render();
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.lastError = null;
      if (typeof DB !== 'undefined' && DB.setOnboardingStep) {
        DB.setOnboardingStep(this.currentStep);
      }
      if (typeof SoundFX !== 'undefined' && SoundFX.navTab) SoundFX.navTab();
      this.render();
    }
  },

  // ── STEP 4 SUBMISSION HANDLER ──────────────────────────────
  async completeSetupAndLaunch() {
    if (this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      this.lastError = null;
      this.render();

      // 1. Validate mandatory fields
      if (!this.data.propName || !this.data.ownerName || !this.data.phone || !this.data.address) {
        throw new Error('Mandatory property details are missing. Please return to Step 3.');
      }

      const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
      const uid = user ? user.uid : (typeof Auth !== 'undefined' && Auth.getUserId ? Auth.getUserId() : '');

      // 2. Save Bank UPI ID
      if (this.data.bankId) {
        DB.setBankId(this.data.bankId);
      }

      // 3. Save Business Logo
      if (this.data.logo) {
        DB.setLogo(this.data.logo);
      }

      // 4. Save Property Information to partitioned DB
      const existingProp = DB.getProperty();
      DB.saveProperty({
        ...existingProp,
        name: this.data.propName,
        owner: this.data.ownerName,
        phone: this.data.phone,
        address: this.data.address,
        tagline: this.data.tagline || existingProp.tagline || '',
        defaultBedPrice: this.data.defaultBedPrice,
        defaultCapacity: this.data.defaultCapacity,
        currency: '₹',
        electricityRate: existingProp.electricityRate || 8,
        upiId: this.data.bankId,
        bankId: this.data.bankId,
        bankIdUploaded: !!this.data.bankId,
        bankIdManuallySaved: !!this.data.bankId
      });

      // 5. Cloud Firestore persistence if Firebase active
      if (typeof FirebaseGateway !== 'undefined' && FirebaseGateway.isConfigured && FirebaseGateway.isConfigured()) {
        try {
          await FirebaseGateway.saveUserWorkspace(uid, this.data);
        } catch (cloudErr) {
          console.warn('[Onboarding] Cloud save warning (proceeding with local):', cloudErr);
        }
      }

      // 6. Mark Onboarding Complete
      DB.setOnboardingComplete(true, uid);

      // Verify write succeeded
      if (!DB.hasCompletedOnboarding(uid)) {
        throw new Error('Onboarding status persistence failed. Please retry.');
      }

      // 6b. Activate 10-Day Free Trial (begins only after onboarding confirmed)
      try {
        await DB.initTrialIfEligible(uid, 'ws_' + uid);
      } catch (trialErr) {
        console.warn('[Onboarding] Trial activation note:', trialErr);
      }

      // 7. Clear temporary onboarding draft
      this.clearDraft();

      // 8. Show Celebration Screen (Step 5)
      this.currentStep = 5;
      this.isSubmitting = false;
      this.render();
      if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();

      // 9. Transition cleanly to Dashboard
      setTimeout(() => {
        const wizardEl = document.getElementById('onboarding-wizard-screen');
        if (wizardEl) {
          wizardEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          wizardEl.style.opacity = '0';
          wizardEl.style.transform = 'scale(0.98)';
          setTimeout(() => {
            wizardEl.style.display = 'none';
            if (typeof App !== 'undefined') {
              App.launchDashboardAfterOnboarding();
            }
          }, 350);
        } else {
          if (typeof App !== 'undefined') {
            App.launchDashboardAfterOnboarding();
          }
        }
      }, 1200);

    } catch (err) {
      console.error('[Onboarding] completeSetup error:', err);
      this.isSubmitting = false;
      this.currentStep = 4;
      this.lastError = err.message || 'Unknown error occurred during workspace launch.';
      this.render();
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      showToast('Error completing setup: ' + this.lastError, 'error');
    }
  },

  // Alias for backward compatibility
  completeSetup() {
    this.nextFromStep3();
  }
};

window.Onboarding = Onboarding;
