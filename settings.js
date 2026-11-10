// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — SETTINGS
// Powered by Rentora
// ============================================================

const Settings = {
  render() {
    const prop = DB.getProperty();
    const waCfg = DB.getWAConfig();
    const isDark = DB.getDarkMode();

    document.getElementById('tab-settings').innerHTML = `
      <div class="scroll-area">

        <!-- Property Info -->
        <div class="settings-section">
          <div class="settings-label">🏠 Property Information</div>
          <div class="settings-item" onclick="Settings.editProperty()">
            <div class="settings-item-icon" style="background:var(--accent-blue-light)">🏠</div>
            <div class="settings-item-info">
              <div class="settings-item-title">${prop.name}</div>
              <div class="settings-item-sub">${prop.owner || 'Tap to set owner'} · ${prop.phone || 'No phone'}</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="Settings.editProperty()">
            <div class="settings-item-icon" style="background:var(--accent-purple-light)">📍</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Address</div>
              <div class="settings-item-sub">${prop.address || 'Tap to set address'}</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
        </div>

        <!-- Defaults -->
        <div class="settings-section">
          <div class="settings-label">🛏️ Room & Bed Defaults</div>
          <div class="settings-item" onclick="Settings.editDefaults()">
            <div class="settings-item-icon" style="background:var(--accent-green-light)">💰</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Default Bed Price</div>
              <div class="settings-item-sub">${formatCurrency(prop.defaultBedPrice, prop.currency)} per month</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="Settings.editDefaults()">
            <div class="settings-item-icon" style="background:var(--accent-amber-light)">🛏️</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Default Room Capacity</div>
              <div class="settings-item-sub">${prop.defaultCapacity} beds per room</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="Settings.editDefaults()">
            <div class="settings-item-icon" style="background:var(--accent-blue-light)">⚡</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Electricity Rate</div>
              <div class="settings-item-sub">${prop.currency}${prop.electricityRate} per unit</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
        </div>

        <!-- WhatsApp Settings -->
        <div class="settings-section">
          <div class="settings-label">📲 WhatsApp Automation</div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:var(--accent-green-light)">📲</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Auto Reminders</div>
              <div class="settings-item-sub">Send on day ${waCfg.reminderDay} of each month</div>
            </div>
            <label class="toggle">
              <input type="checkbox" ${waCfg.enabled ? 'checked' : ''} onchange="Settings.toggleWA(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-item" onclick="Settings.editWAConfig()">
            <div class="settings-item-icon" style="background:var(--accent-green-light)">⚙️</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Configure Reminder</div>
              <div class="settings-item-sub">Day, country code, message template</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="WhatsApp.openReminderModal()">
            <div class="settings-item-icon" style="background:var(--accent-green-light)">📱</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Send Reminders Now</div>
              <div class="settings-item-sub">Manually trigger for current month</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
        </div>

        <!-- Documents & Agreements -->
        <div class="settings-section">
          <div class="settings-label">📄 Documents &amp; Agreements</div>
          <div class="settings-item" onclick="Agreements.openMainScreen()">
            <div class="settings-item-icon" style="background:var(--accent-blue-light)">📄</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Rent Agreements</div>
              <div class="settings-item-sub">Create, sign and manage tenant agreements</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="Agreements.openOwnerSignatureSettings()">
            <div class="settings-item-icon" style="background:var(--accent-purple-light)">✍️</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Owner Digital Signature</div>
              <div class="settings-item-sub">${DB.getOwnerSignature() ? 'Saved signature active (Click to view/change)' : 'Not set — add saved signature'}</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
        </div>

        <!-- Mobile Verification -->
        <div class="settings-section">
          <div class="settings-label">📱 Tenant Verification</div>
          <div class="settings-item" onclick="Settings.showVerificationInfo()">
            <div class="settings-item-icon" style="background:var(--accent-green-light)">📱</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Mobile WhatsApp OTP Verification</div>
              <div class="settings-item-sub">Free · Verify tenants via WhatsApp OTP</div>
            </div>
            <span class="settings-item-value">ℹ️</span>
          </div>
        </div>

        <!-- AI Assistant -->
        <div class="settings-section">
          <div class="settings-label">🤖 AI Assistant</div>
          <div class="settings-item" onclick="Chatbot.toggle()">
            <div class="settings-item-icon" style="background:var(--accent-purple-light)">🤖</div>
            <div class="settings-item-info">
              <div class="settings-item-title">AI Assistant</div>
              <div class="settings-item-sub">Instant answers &amp; PG analytics with live data</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
        </div>

        <!-- Appearance & Customization -->
        <div class="settings-section">
          <div class="settings-label">🎨 Appearance &amp; Customization</div>
          <div class="settings-item" onclick="BusinessCard.openShareModal()">
            <div class="settings-item-icon" style="background:var(--accent-blue-light)">🪪</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Share Your Business Card</div>
              <div class="settings-item-sub">Official digital business card · WhatsApp ready</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="Settings.showLogoUploadModal()">
            <div class="settings-item-icon" style="background:var(--accent-blue-light)">🖼️</div>
            <div class="settings-item-info">
              <div class="settings-item-title">PG Logo / Business Identity</div>
              <div class="settings-item-sub">${DB.hasCustomLogo() ? 'Official PG business logo active (used on invoices, agreements, business cards & QR codes)' : '<strong style="color:var(--accent-orange, #f59e0b)">⚠️ No PG logo uploaded yet (needed for invoices & agreements)</strong>'}</div>
            </div>
            ${DB.hasCustomLogo() && prop.logo ? `<img src="${prop.logo}" style="width:36px;height:36px;border-radius:var(--radius-md);object-fit:cover;border:1px solid var(--border)">` : `<span class="badge" style="background:#FEF3C7; color:#D97706; font-size:11px; font-weight:700">Upload</span>`}
          </div>
          <div class="settings-item" onclick="Settings.showPaymentSetupModal()">
            <div class="settings-item-icon" style="background:var(--accent-green-light)">💳</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Bank UPI ID &amp; Payment QR</div>
              <div class="settings-item-sub">${DB.hasBankId() ? `Active: <strong>${DB.getBankId()}</strong> (Tap to view QR / edit)` : '<strong style="color:var(--accent-orange, #f59e0b)">⚠️ Required: No Bank UPI ID set</strong>'}</div>
            </div>
            ${DB.hasBankId() ? `<span class="badge green" style="font-size:11px;font-weight:700">QR Active</span>` : `<span class="badge" style="background:#FEF3C7; color:#D97706; font-size:11px; font-weight:700">Set ID</span>`}
          </div>
          <div class="settings-item">
            <div class="settings-item-icon" style="background:var(--accent-purple-light)">🌙</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Dark Mode</div>
              <div class="settings-item-sub">${isDark ? 'Dark theme active' : 'Light theme active'}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="dark-toggle" ${isDark ? 'checked' : ''} onchange="Settings.toggleDark(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Security -->
        <div class="settings-section">
          <div class="settings-label">🔐 Security</div>

          <div class="settings-item">
            <div class="settings-item-icon" style="background:var(--accent-green-light, rgba(16,185,129,0.12))">🛡️</div>
            <div class="settings-item-info">
              <div class="settings-item-title">App Lock (PIN/Password)</div>
              <div class="settings-item-sub">Require your PIN or password when opening Rentora</div>
            </div>
            <label class="toggle" style="flex-shrink:0;">
              <input type="checkbox" id="app-lock-toggle" ${DB.isAppLockEnabled() ? 'checked' : ''} onchange="Settings.toggleAppLock(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-item" onclick="Settings.changePassword()">
            <div class="settings-item-icon" style="background:var(--accent-red-light)">🔐</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Change PIN</div>
              <div class="settings-item-sub">Update your 4-digit PIN</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
        </div>

        <!-- Data -->
        <div class="settings-section">
          <div class="settings-label">💾 Data Management</div>
          <div class="settings-item" onclick="Settings.exportData()">
            <div class="settings-item-icon" style="background:var(--accent-blue-light)">📤</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Export Data</div>
              <div class="settings-item-sub">Download backup as JSON</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="Settings.importData()">
            <div class="settings-item-icon" style="background:var(--accent-amber-light)">📥</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Import Data</div>
              <div class="settings-item-sub">Restore from backup JSON</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
          <div class="settings-item" onclick="Settings.loadDemo()">
            <div class="settings-item-icon" style="background:var(--accent-green-light)">🧪</div>
            <div class="settings-item-info">
              <div class="settings-item-title">Load Demo Data</div>
              <div class="settings-item-sub">Populate with sample property data</div>
            </div>
            <span class="settings-item-value">›</span>
          </div>
        </div>

        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">
          Rentora — Smart PG & Hostel Management v1.0<br>
          All data stored locally on your device
        </div>
      </div>
    `;
  },

  // ── PROPERTY EDIT ──────────────────────────────────────────
  editProperty() {
    const p = DB.getProperty();
    showModal('🏠 Property Information', `
      <div class="form-group"><label class="form-label">Property Name *</label>
        <input class="form-input" id="inp-prop-name" value="${p.name}"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Owner Name</label>
          <input class="form-input" id="inp-prop-owner" value="${p.owner || ''}"></div>
        <div class="form-group"><label class="form-label">Phone</label>
          <input class="form-input" id="inp-prop-phone" value="${p.phone || ''}" type="tel"></div>
      </div>
      <div class="form-group"><label class="form-label">Professional Tagline (Optional)</label>
        <input class="form-input" id="inp-prop-tagline" value="${p.tagline || ''}" placeholder="e.g. Your trusted home away from home"></div>
      <div class="form-group"><label class="form-label">Address</label>
        <textarea class="form-textarea" id="inp-prop-address">${p.address || ''}</textarea></div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Settings.saveProperty()">Save</button>
      </div>
    `);
  },

  saveProperty() {
    const p = DB.getProperty();
    DB.saveProperty({
      ...p,
      name: document.getElementById('inp-prop-name').value.trim() || p.name,
      owner: document.getElementById('inp-prop-owner').value.trim(),
      phone: document.getElementById('inp-prop-phone').value.trim(),
      tagline: (document.getElementById('inp-prop-tagline') ? document.getElementById('inp-prop-tagline').value.trim() : (p.tagline || '')),
      address: document.getElementById('inp-prop-address').value.trim(),
    });
    closeModal();
    if (typeof App !== 'undefined' && typeof App.syncGlobalBranding === 'function') {
      App.syncGlobalBranding();
    }
    this.render();
    showToast('✅ Property updated!', 'success');
  },

  // ── DEFAULTS EDIT ──────────────────────────────────────────
  editDefaults() {
    const p = DB.getProperty();
    showModal('🛏️ Room & Bed Defaults', `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Default Bed Price</label>
          <input class="form-input" id="inp-def-price" type="number" value="${p.defaultBedPrice}"></div>
        <div class="form-group"><label class="form-label">Default Capacity</label>
          <input class="form-input" id="inp-def-cap" type="number" value="${p.defaultCapacity}" min="1"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Currency Symbol</label>
          <input class="form-input" id="inp-def-cur" value="${p.currency}"></div>
        <div class="form-group"><label class="form-label">Electricity Rate (/unit)</label>
          <input class="form-input" id="inp-def-elec" type="number" value="${p.electricityRate}"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Settings.saveDefaults()">Save</button>
      </div>
    `);
  },

  saveDefaults() {
    const p = DB.getProperty();
    DB.saveProperty({
      ...p,
      defaultBedPrice: parseFloat(document.getElementById('inp-def-price').value) || p.defaultBedPrice,
      defaultCapacity: parseInt(document.getElementById('inp-def-cap').value) || p.defaultCapacity,
      currency: document.getElementById('inp-def-cur').value.trim() || p.currency,
      electricityRate: parseFloat(document.getElementById('inp-def-elec').value) || p.electricityRate,
    });
    closeModal();
    this.render();
    showToast('✅ Defaults updated!', 'success');
  },

  // ── FLOORS (MANAGED IN ROOMS TAB) ─────────────────────────
  addFloor() {
    if (typeof App !== 'undefined' && App.navigate) App.navigate('rooms');
    if (typeof Rooms !== 'undefined' && Rooms.showAddFloorModal) Rooms.showAddFloorModal();
  },

  editFloor(floorId) {
    if (typeof App !== 'undefined' && App.navigate) App.navigate('rooms');
    if (typeof Rooms !== 'undefined' && Rooms.showEditFloorModal) Rooms.showEditFloorModal(floorId);
  },

  deleteFloor(floorId) {
    if (typeof App !== 'undefined' && App.navigate) App.navigate('rooms');
    if (typeof Rooms !== 'undefined' && Rooms.deleteFloor) Rooms.deleteFloor(floorId);
  },

  // ── WHATSAPP CONFIG ────────────────────────────────────────
  toggleWA(val) {
    const cfg = DB.getWAConfig();
    DB.saveWAConfig({ ...cfg, enabled: val });
    showToast(val ? '📲 Reminders enabled' : '🔕 Reminders disabled', 'info');
  },

  editWAConfig() {
    const cfg = DB.getWAConfig();
    showModal('📲 WhatsApp Reminder Config', `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Reminder Day (1-28)</label>
          <input class="form-input" id="inp-wa-day" type="number" min="1" max="28" value="${cfg.reminderDay}"></div>
        <div class="form-group"><label class="form-label">Country Code</label>
          <input class="form-input" id="inp-wa-cc" value="${cfg.countryCode}" placeholder="91"></div>
      </div>
      <div class="form-group"><label class="form-label">Message Template</label>
        <textarea class="form-textarea" id="inp-wa-tmpl" style="min-height:120px">${cfg.template}</textarea>
        <div class="color-muted fs-12 mt-8">Variables: {name} {amount} {currency} {month} {property} {owner}</div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Settings.saveWAConfig()">Save</button>
      </div>
    `);
  },

  saveWAConfig() {
    const cfg = DB.getWAConfig();
    DB.saveWAConfig({
      ...cfg,
      reminderDay: parseInt(document.getElementById('inp-wa-day').value) || 2,
      countryCode: document.getElementById('inp-wa-cc').value.trim() || '91',
      template: document.getElementById('inp-wa-tmpl').value.trim() || cfg.template,
    });
    closeModal();
    this.render();
    showToast('✅ WhatsApp config saved!', 'success');
  },

  // ── APPEARANCE ─────────────────────────────────────────────
  toggleDark(val) {
    DB.setDarkMode(val);
    document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
    if (Rent.chartInstance) { Rent.chartInstance.destroy(); Rent.chartInstance = null; }
    showToast(val ? '🌙 Dark mode on' : '☀️ Light mode on', 'info');
  },

  // ── SECURITY ───────────────────────────────────────────────
  changePassword() {
    let step = 1;
    let newPin = '';
    showModal('🔐 Change PIN', `
      <div id="cp-content">
        <div style="text-align:center;padding:8px 0 20px">
          <div style="font-size:14px;font-weight:600;color:var(--text-secondary)">Enter your current PIN</div>
          <div class="pin-display" id="cp-dots" style="justify-content:center;margin-top:16px">
            ${[0,1,2,3].map(i => `<div class="pin-dot" id="cpd-${i}"></div>`).join('')}
          </div>
          <div id="cp-error" class="auth-error"></div>
        </div>
        <div class="pin-pad" style="margin:0 auto">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
            k === '' ? `<div></div>` :
            `<button class="pin-btn ${k==='⌫'?'delete':''}" onclick="Settings._cpKey('${k}')">${k}</button>`
          ).join('')}
        </div>
        <button class="btn btn-ghost btn-full mt-16" onclick="closeModal()">Cancel</button>
      </div>
    `);

    let cpBuf = '';
    Settings._cpKey = async (k) => {
      if (k === '⌫') { cpBuf = cpBuf.slice(0, -1); }
      else if (cpBuf.length < 4) { cpBuf += k; }
      [0,1,2,3].forEach(i => {
        const d = document.getElementById(`cpd-${i}`);
        if (d) d.className = 'pin-dot' + (i < cpBuf.length ? ' filled' : '');
      });
      if (cpBuf.length === 4) {
        if (step === 1) {
          const hash = await hashPin(cpBuf);
          if (hash !== DB.getPassword()) {
            document.getElementById('cp-error').textContent = 'Wrong PIN';
            [0,1,2,3].forEach(i => { const d = document.getElementById(`cpd-${i}`); if (d) d.className = 'pin-dot error'; });
            setTimeout(() => { cpBuf = ''; [0,1,2,3].forEach(i => { const d = document.getElementById(`cpd-${i}`); if (d) d.className = 'pin-dot'; }); document.getElementById('cp-error').textContent = ''; }, 700);
            return;
          }
          step = 2; cpBuf = ''; newPin = '';
          document.querySelector('#cp-content > div > div').textContent = 'Enter new PIN';
          [0,1,2,3].forEach(i => { const d = document.getElementById(`cpd-${i}`); if (d) d.className = 'pin-dot'; });
        } else if (step === 2) {
          newPin = cpBuf; step = 3; cpBuf = '';
          document.querySelector('#cp-content > div > div').textContent = 'Confirm new PIN';
          [0,1,2,3].forEach(i => { const d = document.getElementById(`cpd-${i}`); if (d) d.className = 'pin-dot'; });
        } else {
          if (cpBuf !== newPin) {
            document.getElementById('cp-error').textContent = "PINs don't match";
            [0,1,2,3].forEach(i => { const d = document.getElementById(`cpd-${i}`); if (d) d.className = 'pin-dot error'; });
            setTimeout(() => { cpBuf = ''; step = 2; newPin = ''; document.querySelector('#cp-content > div > div').textContent = 'Enter new PIN'; [0,1,2,3].forEach(i => { const d = document.getElementById(`cpd-${i}`); if (d) d.className = 'pin-dot'; }); document.getElementById('cp-error').textContent = ''; }, 700);
            return;
          }
          const hash = await hashPin(newPin);
          DB.setPassword(hash);
          closeModal();
          showToast('✅ PIN changed!', 'success');
        }
      }
    };
  },

  // ── APP LOCK (PIN / PASSWORD) ─────────────────────────────
  toggleAppLock(enabled) {
    if (enabled) {
      if (!DB.isInitialized() || !DB.getPassword()) {
        showToast('Please create your PIN first', 'warning');
        this.changePassword();
        return;
      }
      DB.setAppLockEnabled(true);
      showToast('🔒 App Lock enabled! PIN required on app start.', 'success');
      this.render();
    } else {
      // Disabling requires current PIN verification
      if (!DB.isInitialized() || !DB.getPassword()) {
        DB.setAppLockEnabled(false);
        this.render();
        return;
      }
      this.verifyPinToDisableLock();
    }
  },

  verifyPinToDisableLock() {
    // If modal is closed without entering the right PIN, revert the toggle UI to ON
    window._modalOnClose = () => {
      const toggle = document.getElementById('app-lock-toggle');
      if (toggle) toggle.checked = true;
      if (typeof App !== 'undefined' && App.currentTab === 'settings') Settings.render();
    };

    let vlBuf = '';
    showModal('🔐 Disable App Lock', `
      <div id="vl-content">
        <div style="text-align:center;padding:8px 0 20px">
          <div style="font-size:14px;font-weight:600;color:var(--text-secondary)">Enter your 4-digit PIN to disable App Lock</div>
          <div class="pin-display" id="vl-dots" style="justify-content:center;margin-top:16px">
            ${[0,1,2,3].map(i => `<div class="pin-dot" id="vld-${i}"></div>`).join('')}
          </div>
          <div id="vl-error" class="auth-error"></div>
        </div>
        <div class="pin-pad" style="margin:0 auto">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
            k === '' ? `<div></div>` :
            `<button type="button" class="pin-btn ${k==='⌫'?'delete':''}" onclick="Settings._vlKey('${k}')">${k}</button>`
          ).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-full mt-16" onclick="closeModal()">Cancel</button>
      </div>
    `);

    Settings._vlKey = async (k) => {
      if (k === '⌫') {
        vlBuf = vlBuf.slice(0, -1);
        try { SoundFX.pinDelete(); } catch (e) {}
      } else if (vlBuf.length < 4) {
        vlBuf += k;
        try { SoundFX.pinKey(k); } catch (e) {}
      }
      [0,1,2,3].forEach(i => {
        const d = document.getElementById(`vld-${i}`);
        if (d) d.className = 'pin-dot' + (i < vlBuf.length ? ' filled' : '');
      });
      if (vlBuf.length === 4) {
        const hash = await hashPin(vlBuf);
        if (hash === DB.getPassword()) {
          try { SoundFX.pinSuccess(); } catch (e) {}
          window._modalOnClose = null; // Clean exit without revert
          DB.setAppLockEnabled(false);
          closeModal();
          showToast('🔓 App Lock disabled. Rentora will open directly.', 'info');
          Settings.render();
        } else {
          try { SoundFX.pinError(); } catch (e) {}
          const errEl = document.getElementById('vl-error');
          if (errEl) errEl.textContent = 'Wrong PIN. Try again.';
          [0,1,2,3].forEach(i => {
            const d = document.getElementById(`vld-${i}`);
            if (d) d.className = 'pin-dot error';
          });
          setTimeout(() => {
            vlBuf = '';
            [0,1,2,3].forEach(i => {
              const d = document.getElementById(`vld-${i}`);
              if (d) d.className = 'pin-dot';
            });
            if (errEl) errEl.textContent = '';
          }, 700);
        }
      }
    };
  },

  // ── DATA MANAGEMENT ────────────────────────────────────────
  async exportData() {
    showToast('⏳ Preparing complete backup including all invoices, sheets, logo, bank QR & photos...', 'info');
    try {
      const data = await DB.exportAll();
      const parsed = JSON.parse(data);
      const imgCount = parsed.images ? Object.keys(parsed.images).length : 0;
      const invCount = parsed.invoicesSummary ? parsed.invoicesSummary.length : (parsed.payments ? parsed.payments.length : 0);
      const tenantCount = parsed.tenants ? parsed.tenants.length : 0;

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (parsed._appName || 'rentora-pg').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      a.download = `${safeName}-full-backup-${formatDate(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      SoundFX.success();
      showToast(`✅ Full backup downloaded! (${tenantCount} Tenants, ${invCount} Invoices, ${imgCount} Photos, Bank & Logo)`, 'success');
    } catch (err) {
      console.error('Export failed:', err);
      SoundFX.error();
      showToast('❌ Backup export failed: ' + (err.message || 'Unknown error'), 'error');
    }
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      showToast('⏳ Restoring complete PG data, logo, bank QR & photos...', 'info');
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const stats = await DB.importAll(ev.target.result);
          closeModal();
          SoundFX.success();
          showToast(`✅ Restore complete! (${stats.tenantsCount} Tenants, ${stats.paymentsCount} Invoices, ${stats.imagesCount} Photos). Reloading...`, 'success');
          setTimeout(() => location.reload(), 1400);
        } catch (err) {
          console.error('Import failed:', err);
          SoundFX.error();
          showToast('❌ Failed to import backup: ' + (err.message || 'Invalid file'), 'error');
        }
      };
      reader.onerror = () => {
        SoundFX.error();
        showToast('❌ Failed to read backup file', 'error');
      };
      reader.readAsText(file);
    };
    input.click();
  },

  loadDemo() {
    if (!confirm('This will populate sample rooms, beds, tenants, and a demo UPI ID for previewing features. Continue?')) return;
    const demoInfo = DB.seedDemo();
    if (typeof App !== 'undefined' && typeof App.syncGlobalBranding === 'function') {
      App.syncGlobalBranding();
    }
    renderActiveTab();
    this.render();
    const upiDisplay = demoInfo?.upiId || 'randomuser@paytm';
    SoundFX.success();
    showToast(`🧪 Demo data loaded! Logo updated & UPI: ${upiDisplay}`, 'success');
  },

  // ── MOBILE VERIFICATION INFO ────────────────────────────────
  showVerificationInfo() {
    showModal('📱 Mobile Verification', `
      <div style="text-align:center; padding:10px 0 16px">
        <div style="font-size:48px; margin-bottom:10px">📱 📲</div>
        <div style="font-size:16px; font-weight:800; color:var(--accent-green-dark)">100% Free WhatsApp OTP Verification</div>
        <div class="color-secondary fs-13 mt-8" style="line-height:1.5">
          Verify tenant identity via mobile number when assigning or replacing tenants:
        </div>
      </div>

      <div class="card" style="background:var(--bg-input); border:1px solid var(--border); margin-bottom:12px; font-size:13px; line-height:1.6">
        <div style="font-weight:700; margin-bottom:6px; color:var(--text-primary)">📲 How It Works</div>
        <div>1️⃣ Enter tenant's 10-digit mobile number (+91 India)</div>
        <div>2️⃣ Click "Verify via WhatsApp OTP" — WhatsApp opens with a pre-filled verification code</div>
        <div>3️⃣ Send the message to the tenant on WhatsApp</div>
        <div>4️⃣ Tenant shares the 6-digit code with you</div>
        <div>5️⃣ Enter the code in the app to verify & register the tenant</div>
      </div>

      <div class="card" style="background:var(--bg-input); border:1px solid var(--border); margin-bottom:16px; font-size:13px; line-height:1.6">
        <div style="font-weight:700; margin-bottom:6px; color:var(--text-primary)">✅ Benefits</div>
        <div>• <strong>Free:</strong> No paid APIs or subscriptions required</div>
        <div>• <strong>Instant:</strong> Verification completes in seconds</div>
        <div>• <strong>Secure:</strong> Only the tenant with access to the phone can provide the OTP</div>
      <div class="form-actions">
        <button class="btn btn-primary btn-full" onclick="closeModal()">Got it!</button>
      </div>
    `);
  },

  // ── PG LOGO / IMAGE CUSTOMIZATION ─────────────────────────
  showLogoUploadModal() {
    const prop = DB.getProperty();
    const hasCustom = DB.hasCustomLogo();
    showModal('🖼️ PG Business Logo', `
      <div style="text-align:center; padding:10px 0 16px">
        <div id="logo-preview-box" style="margin-bottom:14px">
          ${hasCustom && prop.logo ? `
            <img src="${prop.logo}" style="width:104px; height:104px; border-radius:var(--radius-xl); object-fit:cover; border:2px solid var(--accent-blue); box-shadow:var(--shadow-md); margin-bottom:8px">
            <div class="color-secondary fs-13" style="font-weight:700; color:var(--accent-green, #10b981)">✓ Official PG Logo Active</div>
          ` : `
            <div style="width:104px; height:104px; border-radius:var(--radius-xl); background:var(--bg-input); border:2px dashed var(--border); display:inline-flex; align-items:center; justify-content:center; font-size:44px; margin-bottom:8px">
              🏠
            </div>
            <div class="color-secondary fs-13" style="font-weight:700; color:var(--accent-orange, #f59e0b)">⚠️ No PG Logo Uploaded (Required)</div>
          `}
        </div>
        <div class="color-secondary fs-13" style="line-height:1.5; margin-bottom:16px">
          Upload your official PG business logo to brand your invoices, rent receipts, rent agreements, digital business cards, payment QR codes, and WhatsApp reminders.<br><span style="font-size:11.5px;color:var(--text-muted);display:block;margin-top:6px;">Platform identity is powered by <strong>Rentora</strong>.</span>
        </div>
      </div>

      <div class="card" style="background:var(--bg-input); border:1px solid var(--border); margin-bottom:16px; padding:14px; text-align:center">
        <input type="file" id="inp-pg-logo-file" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none" onchange="Settings.handleLogoFileSelect(this)">
        <button type="button" class="btn btn-primary btn-full" onclick="document.getElementById('inp-pg-logo-file').click()">
          <span>📁</span> <span>Choose Image from Device</span>
        </button>
        ${hasCustom ? `
          <button type="button" class="btn btn-ghost btn-full mt-8" style="color:var(--accent-red)" onclick="Settings.removeLogo()">
            <span>🗑️</span> <span>Remove Saved Logo</span>
          </button>
        ` : ''}
      </div>

      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
      </div>
    `);
  },

  async handleLogoFileSelect(input) {
    const file = input.files[0];
    if (!file) return;
    
    // File validation
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      return showToast('Please select a valid image file (PNG, JPG, or WEBP)', 'error');
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return showToast('Image file too large. Please select an image under 10MB.', 'error');
    }

    try {
      showToast('⏳ Processing & optimizing logo...', 'info');
      const base64 = await ImageUtils.compressImage(file, 600, 0.85);
      if (!base64 || !base64.startsWith('data:image/')) {
        throw new Error('Image conversion failed');
      }

      const prop = DB.getProperty();
      prop.logo = base64;
      prop.logoUploaded = true;
      prop.logoUpdatedAt = new Date().toISOString();
      DB.saveProperty(prop);

      closeModal();
      
      // Global synchronization across all app screens & caches
      if (typeof App !== 'undefined' && typeof App.syncGlobalBranding === 'function') {
        App.syncGlobalBranding();
      } else {
        this.render();
        if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
      }

      if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
      showToast('✅ PG Logo saved & synchronized everywhere!', 'success');
    } catch (e) {
      console.error('Logo upload error:', e);
      showToast('Failed to process image. Please try another image.', 'error');
    }
  },

  removeLogo() {
    if (!confirm('Are you sure you want to remove your business logo? Your PG profile will be marked incomplete and the setup reminder will reappear.')) {
      return;
    }

    const prop = DB.getProperty();
    prop.logo = '';
    prop.logoUploaded = false;
    DB.saveProperty(prop);

    closeModal();
    
    // Global synchronization across all app screens & caches
    if (typeof App !== 'undefined' && typeof App.syncGlobalBranding === 'function') {
      App.syncGlobalBranding();
    } else {
      this.render();
      if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
    }

    if (typeof SoundFX !== 'undefined' && SoundFX.trash) SoundFX.trash();
    showToast('🗑️ PG Logo removed. Profile setup is now incomplete.', 'info');
  },

  showPaymentSetupModal(presetVal = '') {
    const prop = DB.getProperty();
    const savedId = DB.getBankId();
    const upiId = presetVal || savedId || '';
    const cleanProp = encodeURIComponent(prop.name);
    const hasId = upiId.trim().length > 0;
    const upiPayload = hasId ? `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${cleanProp}&cu=INR&tn=PG+Rent+Payment` : '';
    let qrUrl = '';
    if (hasId) {
      if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
        try { qrUrl = QRCode.toDataURL(upiPayload, 260, 8); } catch (e) {}
      }
      if (!qrUrl) {
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiPayload)}&size=240x240&margin=8`;
      }
    }

    showModal('💳 Bank UPI ID & Payment QR', `
      <div style="text-align:center; margin-bottom:14px">
        <div style="width:52px; height:52px; border-radius:50%; background:var(--accent-green-light); display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 8px">💳</div>
        <div style="font-weight:700; font-size:16px; color:var(--text-primary)">Add Your Bank Account UPI ID</div>
        <div class="color-secondary fs-13" style="line-height:1.45; margin-top:4px">
          This is mandatory so the app can generate your official payment QR code for WhatsApp reminders.
        </div>
      </div>

      <!-- Short Educational Message -->
      <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:10px; padding:11px 13px; margin-bottom:14px; font-size:12.5px; line-height:1.5">
        <strong style="color:var(--text-primary)">ℹ️ What is a Bank Account UPI ID?</strong><br>
        It is your virtual payment address (VPA) linked to your bank account (from Google Pay, PhonePe, Paytm, or BHIM). Adding your own ID allows tenants to transfer rent money directly into your bank account with zero fees.
      </div>

      <!-- Live QR Code Preview Card -->
      <div class="card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:14px; text-align:center; margin-bottom:14px; box-shadow:var(--shadow-sm)">
        <div style="font-size:11px; font-weight:800; color:var(--accent-green); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px">Live Payment QR Preview</div>
        <div style="background:#FFFFFF; padding:10px; border-radius:12px; display:inline-block; border:1px solid #E2E8F0; box-shadow:0 4px 12px rgba(0,0,0,0.06); min-width:180px; min-height:180px; display:inline-flex; align-items:center; justify-content:center">
          <img id="payment-qr-preview-img" src="${qrUrl}" alt="Payment QR Code" style="width:170px; height:170px; border-radius:6px; object-fit:contain; display:${hasId ? 'block' : 'none'}">
          <div id="payment-qr-placeholder" style="display:${hasId ? 'none' : 'block'}; color:var(--text-secondary); font-size:12px; padding:20px 10px; text-align:center">
            📱 Enter your Bank UPI ID below to preview your live payment QR
          </div>
        </div>
        <div style="margin-top:8px; font-size:12px; color:var(--text-secondary)">
          Payee: <strong>${prop.name}</strong>
        </div>
      </div>

      <!-- Input Field -->
      <div class="form-group mb-12">
        <label class="form-label" style="font-weight:700">Your Bank UPI ID (VPA) <span style="color:var(--accent-red)">*</span></label>
        <input type="text" class="form-input" id="inp-bank-upi-id" value="${upiId}" placeholder="e.g. 9876543210@paytm or yourname@okhdfcbank" 
          oninput="Settings.updateQrPreview(this.value)" style="font-size:14px; font-weight:600; letter-spacing:0.5px">
      </div>

      <!-- Random Example IDs for Users Who Don't Know -->
      <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:10px; padding:10px 12px; margin-bottom:16px">
        <div style="font-size:11.5px; font-weight:700; color:var(--text-primary); margin-bottom:5px">
          💡 Don't know your Bank UPI ID? Tap an example below to see the format:
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap">
          <button type="button" class="chip" style="font-size:11px; padding:3px 8px; font-family:monospace; cursor:pointer" onclick="Settings.useExampleId('9876543210@paytm')">9876543210@paytm</button>
          <button type="button" class="chip" style="font-size:11px; padding:3px 8px; font-family:monospace; cursor:pointer" onclick="Settings.useExampleId('yourname@okhdfcbank')">yourname@okhdfcbank</button>
          <button type="button" class="chip" style="font-size:11px; padding:3px 8px; font-family:monospace; cursor:pointer" onclick="Settings.useExampleId('yourmobile@ybl')">yourmobile@ybl</button>
          <button type="button" class="chip" style="font-size:11px; padding:3px 8px; font-family:monospace; cursor:pointer" onclick="Settings.useExampleId('pgowner@fam')">pgowner@fam</button>
          <button type="button" class="chip" style="font-size:11px; padding:3px 8px; font-family:monospace; cursor:pointer" onclick="Settings.useExampleId('business@sbi')">business@sbi</button>
        </div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:6px; line-height:1.4">
          🔍 <strong>Where to find it:</strong> Open your Google Pay, PhonePe, or Paytm app ➔ tap your Profile icon ➔ your UPI ID is written right below your name/number.
        </div>
      </div>

      <!-- Optional UPI at PG API Key -->
      <div style="margin-bottom:16px">
        <details style="font-size:12px; color:var(--text-secondary); cursor:pointer">
          <summary style="font-weight:600; color:var(--text-primary)">⚡ Advanced: UPI at PG / Merchant API Key (Optional)</summary>
          <div style="margin-top:8px; padding:8px 10px; background:var(--bg-input); border-radius:8px; border:1px solid var(--border)">
            <label class="form-label" style="font-size:11px">Merchant / Gateway API Key (Cashfree, Razorpay, Decentro)</label>
            <input type="text" class="form-input" id="inp-upi-api-key" value="${prop.upiApiKey || ''}" placeholder="Optional: Enter Merchant API Key" style="font-size:12px">
            <div style="font-size:10.5px; color:var(--text-secondary); margin-top:3px">Standard peer-to-peer UPI ID above already provides 100% free direct bank settlement without an API key.</div>
          </div>
        </details>
      </div>

      <div class="form-actions" style="display:flex; gap:10px">
        <button type="button" class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" style="flex:2" onclick="Settings.savePaymentSetup()">
          <span>💾 Save Bank ID &amp; Activate QR</span>
        </button>
      </div>
    `);
  },

  useExampleId(example) {
    const inp = document.getElementById('inp-bank-upi-id');
    if (inp) {
      inp.value = example;
      this.updateQrPreview(example);
    }
  },

  updateQrPreview(val) {
    const id = (val || '').trim();
    const img = document.getElementById('payment-qr-preview-img');
    const placeholder = document.getElementById('payment-qr-placeholder');
    if (!id) {
      if (img) img.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
      return;
    }
    const prop = DB.getProperty();
    const cleanProp = encodeURIComponent(prop.name);
    const upiPayload = `upi://pay?pa=${encodeURIComponent(id)}&pn=${cleanProp}&cu=INR&tn=PG+Rent+Payment`;
    let qrUrl = '';
    if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
      try { qrUrl = QRCode.toDataURL(upiPayload, 260, 8); } catch (e) {}
    }
    if (!qrUrl) {
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiPayload)}&size=240x240&margin=8`;
    }
    if (img) {
      img.src = qrUrl;
      img.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
  },

  savePaymentSetup() {
    const inp = document.getElementById('inp-bank-upi-id');
    const apiKeyInp = document.getElementById('inp-upi-api-key');
    const val = (inp?.value || '').trim();
    
    if (!val) {
      return showToast('Please enter your Bank Account UPI ID (e.g. 9876543210@paytm or yourname@okhdfcbank)', 'error');
    }
    if (!val.includes('@') || val.length < 4) {
      return showToast('Invalid UPI ID format. A valid UPI ID contains "@" (e.g. yourname@bank)', 'error');
    }

    DB.setBankId(val);

    // Save optional API key if provided
    if (apiKeyInp) {
      const prop = DB.getProperty();
      prop.upiApiKey = (apiKeyInp.value || '').trim();
      DB.saveProperty(prop);
    }

    closeModal();

    if (typeof App !== 'undefined' && typeof App.syncGlobalBranding === 'function') {
      App.syncGlobalBranding();
    }
    this.render();
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') {
      Dashboard.render();
    }

    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ Bank Account UPI ID saved: ${val}! Official Payment QR is now active.`, 'success');
  },

  showProfileSetupModal() {
    const hasLogo = DB.hasCustomLogo();
    const hasBank = DB.hasBankId();

    if (!hasLogo && !hasBank) {
      showModal('⚙️ Complete Your PG Profile', `
        <div style="text-align:center; margin-bottom:16px">
          <div style="width:54px; height:54px; border-radius:50%; background:linear-gradient(135deg, #1E3A8A, #0284C7); color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 10px; box-shadow:0 4px 14px rgba(2,132,199,0.3)">⚙️</div>
          <div style="font-weight:700; font-size:16px">Complete Profile Setup</div>
          <div class="color-secondary fs-13" style="line-height:1.4; margin-top:4px">
            Two quick steps are required to unlock all features, customize documents, and enable 1-tap WhatsApp QR rent reminders.
          </div>
        </div>

        <div class="card" style="background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:10px">
            <span style="font-size:24px">🖼️</span>
            <div>
              <div style="font-weight:700; font-size:13.5px">Step 1: Upload PG Logo</div>
              <div style="font-size:11.5px; color:var(--text-secondary)">Personalize invoices, cards &amp; splash screen</div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="closeModal(); Settings.showLogoUploadModal();">Upload Logo</button>
        </div>

        <div class="card" style="background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between">
          <div style="display:flex; align-items:center; gap:10px">
            <span style="font-size:24px">💳</span>
            <div>
              <div style="font-weight:700; font-size:13.5px">Step 2: Set Bank UPI ID</div>
              <div style="font-size:11.5px; color:var(--text-secondary)">Generate QR code for WhatsApp reminders</div>
            </div>
          </div>
          <button class="btn btn-success btn-sm" onclick="closeModal(); Settings.showPaymentSetupModal();">Set Bank ID</button>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
        </div>
      `);
    } else if (!hasLogo) {
      this.showLogoUploadModal();
    } else {
      this.showPaymentSetupModal();
    }
  },
};
