// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — RENT AGREEMENTS & DIGITAL SIGNATURE SYSTEM
// Powered by Rentora
// Complete Policy Builder, Dual Signatures (Draw & Upload), PDF & High-Res PNG Page Downloads
// ============================================================

const Agreements = {
  // Temporary state for wizard / editor / signature canvas
  currentFilter: 'ALL',
  searchQuery: '',
  activeDraft: null,
  tenantSigMode: 'DRAW', // 'DRAW' or 'UPLOAD'
  uploadedTenantSig: null, // Temporary preview data for signature upload
  tenantSigCanvas: null,
  ownerSigCanvas: null,
  tenantSigPad: null,
  ownerSigPad: null,

  // ═══════════════════════════════════════════════════════════
  // 1. MAIN SCREEN — DASHBOARD & CARDS
  // ═══════════════════════════════════════════════════════════
  openMainScreen() {
    if (!['ALL', 'ACTIVE', 'DRAFT'].includes(this.currentFilter)) {
      this.currentFilter = 'ALL';
    }
    const agrs = DB.getAgreements();
    const prop = DB.getProperty();

    // Auto-update expiry status for agreements based on endDate
    this.refreshExpiryStatuses(agrs);

    const filtered = this.getFilteredAgreements(agrs);

    showModal('📄 Rent Agreements', `
      <div class="agr-container">
        <!-- Header Actions -->
        <div class="agr-top-bar">
          <div class="agr-header-info">
            <div class="agr-sub">Create, sign and manage your PG rental agreements</div>
          </div>
          <div class="agr-top-actions">
            <button class="btn btn-primary" onclick="Agreements.openCreateModal()" style="font-size:13px;padding:9px 14px">
              <span>➕</span> <span>Create Agreement</span>
            </button>
            <button class="btn btn-outline" onclick="Agreements.openPolicyBuilder()" style="font-size:13px;padding:9px 14px">
              <span>⚙️</span> <span>Policy Builder</span>
            </button>
          </div>
        </div>

        <!-- Search & Status Filters -->
        <div class="agr-search-wrap">
          <input type="text" class="form-input" id="agr-search-input" placeholder="🔍 Search tenant, room or ID..." 
            value="${this.searchQuery}" oninput="Agreements.onSearchInput(this.value)">
        </div>

        <div class="agr-filter-chips" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          ${['ALL', 'ACTIVE', 'DRAFT'].map(f => `
            <button class="chip ${this.currentFilter === f ? 'active' : ''}" onclick="Agreements.setFilter('${f}')">
              ${this.formatFilterLabel(f)}
            </button>
          `).join('')}
        </div>

        <!-- Agreement List -->
        <div class="agr-list" id="agr-list">
          ${this.renderAgreementCards(filtered)}
        </div>
      </div>
    `);
  },

  formatFilterLabel(f) {
    const labels = {
      ALL: 'All',
      ACTIVE: 'Active',
      SIGNED: 'Signed',
      PENDING: 'Pending',
      DRAFT: 'Draft',
      EXPIRING_SOON: 'Expiring Soon',
      EXPIRED: 'Expired',
      ARCHIVED: 'Archived'
    };
    return labels[f] || f;
  },

  setFilter(f) {
    this.currentFilter = f;
    const agrs = DB.getAgreements();
    const filtered = this.getFilteredAgreements(agrs);
    const listEl = document.getElementById('agr-list');
    if (listEl) listEl.innerHTML = this.renderAgreementCards(filtered);

    document.querySelectorAll('.agr-filter-chips .chip').forEach(c => {
      c.classList.toggle('active', c.textContent.trim() === this.formatFilterLabel(f));
    });
  },

  onSearchInput(val) {
    this.searchQuery = (val || '').toLowerCase().trim();
    const agrs = DB.getAgreements();
    const filtered = this.getFilteredAgreements(agrs);
    const listEl = document.getElementById('agr-list');
    if (listEl) listEl.innerHTML = this.renderAgreementCards(filtered);
  },

  getFilteredAgreements(agrs) {
    return agrs.filter(a => {
      // Filter status match
      let matchStatus = true;
      if (this.currentFilter === 'ACTIVE') matchStatus = a.status === 'ACTIVE';
      else if (this.currentFilter === 'SIGNED') matchStatus = a.status === 'SIGNED';
      else if (this.currentFilter === 'PENDING') matchStatus = a.status.startsWith('PENDING');
      else if (this.currentFilter === 'DRAFT') matchStatus = a.status === 'DRAFT';
      else if (this.currentFilter === 'EXPIRING_SOON') matchStatus = a.status === 'EXPIRING_SOON';
      else if (this.currentFilter === 'EXPIRED') matchStatus = a.status === 'EXPIRED';
      else if (this.currentFilter === 'ARCHIVED') matchStatus = a.status === 'ARCHIVED';

      if (!matchStatus) return false;

      // Search match
      if (!this.searchQuery) return true;
      const tName = (a.tenant?.name || '').toLowerCase();
      const rName = (a.room?.name || '').toLowerCase();
      const idStr = (a.id || '').toLowerCase();
      return tName.includes(this.searchQuery) || rName.includes(this.searchQuery) || idStr.includes(this.searchQuery);
    });
  },

  refreshExpiryStatuses(agrs) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let changed = false;
    agrs.forEach(a => {
      if (a.status === 'ACTIVE' || a.status === 'EXPIRING_SOON') {
        if (a.stayTerms?.endDate) {
          const end = new Date(a.stayTerms.endDate);
          end.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

          if (diffDays < 0 && a.status !== 'EXPIRED') {
            a.status = 'EXPIRED';
            changed = true;
          } else if (diffDays >= 0 && diffDays <= 15 && a.status !== 'EXPIRING_SOON') {
            a.status = 'EXPIRING_SOON';
            changed = true;
          }
        }
      }
    });

    if (changed) DB.saveAgreements(agrs);
  },

  getStatusBadge(status) {
    const map = {
      ACTIVE: { label: 'ACTIVE', cls: 'badge-active' },
      SIGNED: { label: 'SIGNED', cls: 'badge-signed' },
      PENDING_TENANT_SIGNATURE: { label: 'PENDING TENANT SIGN', cls: 'badge-pending' },
      PENDING_OWNER_SIGNATURE: { label: 'PENDING OWNER SIGN', cls: 'badge-pending' },
      DRAFT: { label: 'DRAFT', cls: 'badge-draft' },
      EXPIRING_SOON: { label: 'EXPIRING SOON', cls: 'badge-expiring' },
      EXPIRED: { label: 'EXPIRED', cls: 'badge-expired' },
      CANCELLED: { label: 'CANCELLED', cls: 'badge-draft' },
      ARCHIVED: { label: 'ARCHIVED', cls: 'badge-draft' }
    };
    const b = map[status] || { label: status, cls: 'badge-draft' };
    return `<span class="agr-badge ${b.cls}">${b.label}</span>`;
  },

  renderAgreementCards(agrs) {
    if (!agrs || agrs.length === 0) {
      return `
        <div class="empty-state" style="padding:32px 16px">
          <div class="empty-icon" style="font-size:36px">📄</div>
          <div class="empty-title">No rent agreements found</div>
          <div class="empty-sub">Tap "+ Create Agreement" to draft an agreement with customizable PG rules.</div>
        </div>
      `;
    }

    const prop = DB.getProperty();
    return agrs.map(a => {
      const cur = prop.currency || '₹';
      const rentAmt = formatCurrency(a.financial?.monthlyRent || 0, cur);
      const depAmt = formatCurrency(a.financial?.securityDeposit || 0, cur);
      const roomStr = a.room?.name ? `${a.room.name}${a.bed?.number ? ` · Bed ${a.bed.number}` : ''}` : 'Room assigned';
      const startStr = a.stayTerms?.startDate ? formatDateDisplay(a.stayTerms.startDate) : 'Not set';
      const endStr = a.stayTerms?.endDate ? ` to ${formatDateDisplay(a.stayTerms.endDate)}` : ' (Ongoing)';

      const tenantSigned = !!a.signatures?.tenantSignature;
      const ownerSigned = !!a.signatures?.ownerSignature;

      return `
        <div class="agr-card">
          <div class="agr-card-head">
            <div>
              <div class="agr-card-title">${a.tenant?.name || 'Unnamed Tenant'}</div>
              <div class="agr-card-sub">📍 ${roomStr}</div>
            </div>
            ${this.getStatusBadge(a.status)}
          </div>

          <div class="agr-card-meta-grid">
            <div class="agr-meta-cell">
              <span class="agr-meta-lbl">Rent</span>
              <span class="agr-meta-val">${rentAmt}/mo</span>
            </div>
            <div class="agr-meta-cell">
              <span class="agr-meta-lbl">Deposit</span>
              <span class="agr-meta-val">${depAmt}</span>
            </div>
            <div class="agr-meta-cell">
              <span class="agr-meta-lbl">Term</span>
              <span class="agr-meta-val">${startStr}${endStr}</span>
            </div>
            <div class="agr-meta-cell">
              <span class="agr-meta-lbl">Agreement ID</span>
              <span class="agr-meta-val">${a.id} (v${a.version || 1})</span>
            </div>
          </div>

          <div class="agr-sig-status-row">
            <span class="agr-sig-pill ${tenantSigned ? 'signed' : 'pending'}">
              ${tenantSigned ? '✓ Tenant Signed' : '⏳ Tenant Pending'}
            </span>
            <span class="agr-sig-pill ${ownerSigned ? 'signed' : 'pending'}">
              ${ownerSigned ? '✓ Owner Signed' : '⏳ Owner Pending'}
            </span>
          </div>

          <div class="agr-card-actions">
            <button class="btn btn-outline btn-sm" onclick="Agreements.previewAgreement('${a.id}')">
              <span>👁️</span> <span>View</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="Agreements.downloadAgreementPDF('${a.id}')">
              <span>📥</span> <span>PDF</span>
            </button>
            <button class="btn btn-whatsapp btn-sm" onclick="Agreements.shareAgreement('${a.id}')" title="Share Agreement on WhatsApp">
              <span>📲</span> <span>Share</span>
            </button>
            <button class="btn btn-outline btn-sm" onclick="Agreements.shareAgreement('${a.id}', { chooseContact: true })" title="Choose contact in WhatsApp">
              <span>👥</span>
            </button>
            ${a.status === 'DRAFT' || a.status.startsWith('PENDING') ? `
              <button class="btn btn-primary btn-sm" onclick="Agreements.openSignWorkflow('${a.id}')">
                <span>✍️</span> <span>Sign</span>
              </button>
            ` : `
              <button class="btn btn-ghost btn-sm" onclick="Agreements.createRevision('${a.id}')" title="Create Revision">
                <span>🔄</span> <span>Revise</span>
              </button>
            `}
            <button class="btn btn-ghost btn-sm" style="color:var(--accent-red)" onclick="Agreements.confirmDelete('${a.id}')" title="Delete / Archive">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ═══════════════════════════════════════════════════════════
  // 2. CREATE AGREEMENT WIZARD — SELECT TENANT & LOAD DATA
  // ═══════════════════════════════════════════════════════════
  openCreateModal(preselectedTenantId) {
    const tenants = DB.getTenants();
    if (!tenants || tenants.length === 0) {
      showToast('Please add at least one tenant first', 'error');
      return;
    }

    if (preselectedTenantId) {
      this.initNewAgreement(preselectedTenantId);
      return;
    }

    showModal('Select Tenant for Agreement', `
      <div class="agr-tenant-picker">
        <input type="text" class="form-input mb-8" id="agr-t-search" placeholder="🔍 Search existing tenant..." 
          oninput="Agreements.filterTenantPicker(this.value)">
        <div class="agr-tenant-list" id="agr-tenant-list">
          ${this.renderTenantPickerItems(tenants)}
        </div>
        <div class="form-actions mt-12">
          <button class="btn btn-ghost btn-full" onclick="Agreements.openMainScreen()">Back</button>
        </div>
      </div>
    `);
  },

  renderTenantPickerItems(tenants) {
    return tenants.map(t => {
      const info = DB.getBedInfo(t.bedId);
      const roomStr = info?.room?.name ? `${info.room.name}, Bed ${info.bed?.number || ''}` : 'Unassigned';
      return `
        <div class="agr-tenant-item" onclick="Agreements.initNewAgreement('${t.id}')">
          <div class="tenant-avatar" style="background:${getAvatarColor(t.name)};width:38px;height:38px;font-size:14px">
            ${getInitials(t.name)}
          </div>
          <div class="agr-tenant-item-info">
            <div class="agr-tenant-item-name">${t.name}</div>
            <div class="agr-tenant-item-meta">📱 ${t.phone} · 📍 ${roomStr}</div>
          </div>
          <button class="btn btn-primary btn-sm">Select ›</button>
        </div>
      `;
    }).join('');
  },

  filterTenantPicker(val) {
    const q = (val || '').toLowerCase().trim();
    const tenants = DB.getTenants().filter(t => {
      return t.name.toLowerCase().includes(q) || t.phone.includes(q);
    });
    const el = document.getElementById('agr-tenant-list');
    if (el) el.innerHTML = this.renderTenantPickerItems(tenants);
  },

  // Initialize draft data merging tenant info, PG info, and default policies
  initNewAgreement(tenantId) {
    const t = DB.getTenantById(tenantId);
    if (!t) return;
    const prop = DB.getProperty();
    const info = DB.getBedInfo(t.bedId);
    const policy = DB.getAgreementPolicy() || this.getDefaultPolicyBlueprint();

    // Stable Unique Agreement ID: RA-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = (DB.getAgreements().length + 1).toString().padStart(4, '0');
    const agrId = `RA-${year}-${count}`;

    this.activeDraft = {
      id: agrId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'DRAFT',
      tenantId: t.id,
      tenant: {
        id: t.id,
        name: t.name,
        phone: t.phone,
        email: t.email || '',
        permanentAddress: t.address || t.permanentAddress || '',
        idProof: t.idProof || (t.aadhaarNumber ? `Aadhaar: ${t.aadhaarNumber}` : '')
      },
      pg: {
        name: prop.name || 'PG Management',
        owner: prop.owner || 'Owner',
        phone: prop.phone || '',
        address: prop.address || '',
        tagline: prop.tagline || ''
      },
      accommodation: {
        roomName: info?.room?.name || 'Room 101',
        bedNumber: info?.bed?.number || 'A',
        floorName: info?.floor?.name || 'Ground Floor',
        capacity: info?.room?.capacity || 2
      },
      financial: {
        monthlyRent: t.rent || policy.financial?.monthlyRent || 6000,
        securityDeposit: t.deposit || policy.financial?.securityDeposit || 12000,
        dueDay: policy.financial?.dueDay || 5,
        gracePeriodDays: policy.financial?.gracePeriodDays || 3,
        latePenaltyEnabled: policy.financial?.latePenaltyEnabled || false,
        latePenaltyAmount: policy.financial?.latePenaltyAmount || 100,
        electricityIncluded: policy.financial?.electricityIncluded !== undefined ? policy.financial.electricityIncluded : false,
        electricityRate: policy.financial?.electricityRate || prop.electricityRate || 8,
        waterIncluded: policy.financial?.waterIncluded !== undefined ? policy.financial.waterIncluded : true,
        wifiIncluded: policy.financial?.wifiIncluded !== undefined ? policy.financial.wifiIncluded : true,
        maintenanceIncluded: policy.financial?.maintenanceIncluded !== undefined ? policy.financial.maintenanceIncluded : true,
        maintenanceAmount: policy.financial?.maintenanceAmount || 0
      },
      stayTerms: {
        startDate: t.moveInDate || formatDate(new Date()),
        endDate: '',
        lockInMonths: policy.stayTerms?.lockInMonths !== undefined ? policy.stayTerms.lockInMonths : 3,
        noticeDaysTenant: policy.stayTerms?.noticeDaysTenant || 30,
        noticeDaysOwner: policy.stayTerms?.noticeDaysOwner || 30,
        checkInTimeEnabled: policy.stayTerms?.checkInTimeEnabled || false,
        checkInTime: policy.stayTerms?.checkInTime || '12:00',
        checkOutTimeEnabled: policy.stayTerms?.checkOutTimeEnabled || false,
        checkOutTime: policy.stayTerms?.checkOutTime || '10:00'
      },
      rules: JSON.parse(JSON.stringify(policy.rules || this.getDefaultPolicyBlueprint().rules)),
      customRules: JSON.parse(JSON.stringify(policy.customRules || [])),
      signatures: {
        tenantSignature: null,
        tenantSignedAt: null,
        ownerSignature: null,
        ownerSignedAt: null
      }
    };

    this.openEditAgreementForm(this.activeDraft);
  },

  // ═══════════════════════════════════════════════════════════
  // 3. EDIT AGREEMENT FORM — FINANCIAL, DATES, POLICY TOGGLES
  // ═══════════════════════════════════════════════════════════
  openEditAgreementForm(agr) {
    this.activeDraft = agr;
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';

    showModal(`Edit Agreement: ${agr.id}`, `
      <div class="agr-form-scroller">
        <!-- Section 1: Tenant & Accommodation Overview -->
        <div class="agr-section-card">
          <div class="agr-sec-title">👤 Tenant &amp; Accommodation</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tenant Full Name</label>
              <input type="text" class="form-input" id="ed-tenant-name" value="${agr.tenant.name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Mobile Number</label>
              <input type="tel" class="form-input" id="ed-tenant-phone" value="${agr.tenant.phone || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Room / Floor</label>
              <input type="text" class="form-input" id="ed-room-name" value="${agr.accommodation.roomName || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Bed Number</label>
              <input type="text" class="form-input" id="ed-bed-num" value="${agr.accommodation.bedNumber || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tenant Permanent Address</label>
            <input type="text" class="form-input" id="ed-tenant-addr" value="${agr.tenant.permanentAddress || ''}" placeholder="H.No, Street, City, State">
          </div>
        </div>

        <!-- Section 2: Financial Terms -->
        <div class="agr-section-card">
          <div class="agr-sec-title">💰 Financial Terms</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Monthly Rent (${cur}) *</label>
              <input type="number" class="form-input" id="ed-rent" value="${agr.financial.monthlyRent}">
            </div>
            <div class="form-group">
              <label class="form-label">Security Deposit (${cur}) *</label>
              <input type="number" class="form-input" id="ed-deposit" value="${agr.financial.securityDeposit}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Rent Due Day (1-28)</label>
              <input type="number" class="form-input" id="ed-due-day" value="${agr.financial.dueDay || 5}" min="1" max="28">
            </div>
            <div class="form-group">
              <label class="form-label">Grace Period (Days)</label>
              <input type="number" class="form-input" id="ed-grace-days" value="${agr.financial.gracePeriodDays || 3}" min="0">
            </div>
          </div>
          <div class="agr-toggle-row">
            <div>
              <div class="agr-toggle-title">Electricity Charges</div>
              <div class="agr-toggle-sub">Toggle whether electricity is included or charged per unit</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="ed-elec-inc" ${agr.financial.electricityIncluded ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="form-group mt-8" id="ed-elec-rate-box">
            <label class="form-label">Electricity Unit Rate (${cur}/unit if separate)</label>
            <input type="number" class="form-input" id="ed-elec-rate" value="${agr.financial.electricityRate || 8}">
          </div>
        </div>

        <!-- Section 3: Stay & Notice Terms -->
        <div class="agr-section-card">
          <div class="agr-sec-title">📅 Stay Duration &amp; Notice</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Agreement Start Date *</label>
              <input type="date" class="form-input" id="ed-start-date" value="${agr.stayTerms.startDate}">
            </div>
            <div class="form-group">
              <label class="form-label">End Date (Leave blank if ongoing)</label>
              <input type="date" class="form-input" id="ed-end-date" value="${agr.stayTerms.endDate || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Lock-in Period (Months)</label>
              <select class="form-input" id="ed-lockin">
                <option value="0" ${agr.stayTerms.lockInMonths == 0 ? 'selected' : ''}>No lock-in period</option>
                <option value="1" ${agr.stayTerms.lockInMonths == 1 ? 'selected' : ''}>1 Month</option>
                <option value="2" ${agr.stayTerms.lockInMonths == 2 ? 'selected' : ''}>2 Months</option>
                <option value="3" ${agr.stayTerms.lockInMonths == 3 ? 'selected' : ''}>3 Months</option>
                <option value="6" ${agr.stayTerms.lockInMonths == 6 ? 'selected' : ''}>6 Months</option>
                <option value="12" ${agr.stayTerms.lockInMonths == 12 ? 'selected' : ''}>12 Months</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Notice Period (Days)</label>
              <select class="form-input" id="ed-notice">
                <option value="7" ${agr.stayTerms.noticeDaysTenant == 7 ? 'selected' : ''}>7 Days</option>
                <option value="15" ${agr.stayTerms.noticeDaysTenant == 15 ? 'selected' : ''}>15 Days</option>
                <option value="30" ${agr.stayTerms.noticeDaysTenant == 30 ? 'selected' : ''}>30 Days</option>
                <option value="60" ${agr.stayTerms.noticeDaysTenant == 60 ? 'selected' : ''}>60 Days</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 4: PG Rules & Policies (Interactive Toggles) -->
        <div class="agr-section-card">
          <div class="agr-sec-title">📋 PG House Rules &amp; Restrictions</div>
          ${this.renderRuleToggles(agr.rules)}
        </div>

        <!-- Section 5: Custom PG Rules -->
        <div class="agr-section-card">
          <div class="agr-sec-title">✨ Custom PG Rules</div>
          <div id="ed-custom-rules-container">
            ${this.renderCustomRuleInputs(agr.customRules)}
          </div>
          <button type="button" class="btn btn-outline btn-full mt-8" onclick="Agreements.addCustomRuleInput()">
            + Add Another Custom Rule
          </button>
        </div>

        <!-- Form Actions -->
        <div class="form-actions mt-16">
          <button type="button" class="btn btn-ghost btn-full" onclick="Agreements.openMainScreen()">Cancel</button>
          <button type="button" class="btn btn-primary btn-full" onclick="Agreements.saveDraftAndPreview()">
            <span>Review &amp; Sign</span> <span>›</span>
          </button>
        </div>
      </div>
    `);
  },

  renderRuleToggles(rules) {
    const definitions = [
      { key: 'visitorsAllowed', title: 'Visitors Allowed', sub: 'Permit general daytime visitors in common areas' },
      { key: 'friendsInRoom', title: 'Friends in Room', sub: 'Allow friends inside tenant rooms (if OFF, restricted to common areas)' },
      { key: 'overnightGuests', title: 'Overnight Guests', sub: 'Permit guests to stay overnight (prior approval required)' },
      { key: 'quietHours', title: 'Quiet Hours (10:00 PM – 7:00 AM)', sub: 'Strict noise restriction during nighttime' },
      { key: 'smokingProhibited', title: 'No Smoking Policy', sub: 'Smoking strictly prohibited in all rooms & premises' },
      { key: 'alcoholProhibited', title: 'No Alcohol Policy', sub: 'Alcohol consumption prohibited inside the accommodation' },
      { key: 'petsAllowed', title: 'Pets Allowed', sub: 'Allow tenant to keep pets with management consent' },
      { key: 'cookingAllowed', title: 'Cooking in Rooms Allowed', sub: 'Allow personal appliances like hotplates / induction in rooms' },
      { key: 'gateTimings', title: 'Night Gate Curfew', sub: 'Main entry gate closed between 10:30 PM and 6:00 AM' },
      { key: 'cleanlinessAudit', title: 'Hygiene & Cleanliness Inspection', sub: 'Routine hygiene maintenance and scheduled room inspection' },
      { key: 'securityDepositDeductions', title: 'Damage Deductions Clause', sub: 'Repair cost of any tenant-caused damage deducted from deposit' }
    ];

    return definitions.map(def => {
      const isChecked = rules[def.key] !== false; // default true if not strictly false
      return `
        <div class="agr-toggle-row">
          <div>
            <div class="agr-toggle-title">${def.title}</div>
            <div class="agr-toggle-sub">${def.sub}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="rule-${def.key}" ${isChecked ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;
    }).join('');
  },

  renderCustomRuleInputs(customList) {
    if (!customList || customList.length === 0) {
      return `<div class="color-muted fs-12 mb-8" id="no-custom-rules-hint">No custom rules added. Tap button below to add one.</div>`;
    }
    return customList.map((r, i) => `
      <div class="agr-custom-rule-row" id="cr-row-${i}">
        <div style="flex:1">
          <input type="text" class="form-input mb-4" placeholder="Rule Name (e.g. Terrace Timing)" value="${r.name || ''}" id="cr-name-${i}">
          <input type="text" class="form-input" placeholder="Rule Details" value="${r.description || ''}" id="cr-desc-${i}">
        </div>
        <button type="button" class="btn btn-ghost" style="color:var(--accent-red);padding:6px 10px" onclick="Agreements.removeCustomRuleInput(${i})">🗑️</button>
      </div>
    `).join('');
  },

  addCustomRuleInput() {
    const hint = document.getElementById('no-custom-rules-hint');
    if (hint) hint.remove();
    const container = document.getElementById('ed-custom-rules-container');
    if (!container) return;
    const count = container.querySelectorAll('.agr-custom-rule-row').length;
    const div = document.createElement('div');
    div.className = 'agr-custom-rule-row';
    div.id = `cr-row-${count}`;
    div.innerHTML = `
      <div style="flex:1">
        <input type="text" class="form-input mb-4" placeholder="Rule Name (e.g. Terrace Timing)" id="cr-name-${count}">
        <input type="text" class="form-input" placeholder="Rule Details" id="cr-desc-${count}">
      </div>
      <button type="button" class="btn btn-ghost" style="color:var(--accent-red);padding:6px 10px" onclick="Agreements.removeCustomRuleInput(${count})">🗑️</button>
    `;
    container.appendChild(div);
  },

  removeCustomRuleInput(index) {
    const el = document.getElementById(`cr-row-${index}`);
    if (el) el.remove();
  },

  saveDraftAndPreview() {
    if (!this.activeDraft) return;

    // Collect values from the form
    const draft = this.activeDraft;
    draft.tenant.name = document.getElementById('ed-tenant-name')?.value.trim() || draft.tenant.name;
    draft.tenant.phone = document.getElementById('ed-tenant-phone')?.value.trim() || draft.tenant.phone;
    draft.tenant.permanentAddress = document.getElementById('ed-tenant-addr')?.value.trim() || '';
    draft.accommodation.roomName = document.getElementById('ed-room-name')?.value.trim() || draft.accommodation.roomName;
    draft.accommodation.bedNumber = document.getElementById('ed-bed-num')?.value.trim() || draft.accommodation.bedNumber;

    draft.financial.monthlyRent = parseFloat(document.getElementById('ed-rent')?.value) || draft.financial.monthlyRent;
    draft.financial.securityDeposit = parseFloat(document.getElementById('ed-deposit')?.value) || draft.financial.securityDeposit;
    draft.financial.dueDay = parseInt(document.getElementById('ed-due-day')?.value) || 5;
    draft.financial.gracePeriodDays = parseInt(document.getElementById('ed-grace-days')?.value) || 3;
    draft.financial.electricityIncluded = document.getElementById('ed-elec-inc')?.checked || false;
    draft.financial.electricityRate = parseFloat(document.getElementById('ed-elec-rate')?.value) || 8;

    draft.stayTerms.startDate = document.getElementById('ed-start-date')?.value || draft.stayTerms.startDate;
    draft.stayTerms.endDate = document.getElementById('ed-end-date')?.value || '';
    draft.stayTerms.lockInMonths = parseInt(document.getElementById('ed-lockin')?.value) || 0;
    draft.stayTerms.noticeDaysTenant = parseInt(document.getElementById('ed-notice')?.value) || 30;

    // Collect rule toggles
    const keys = [
      'visitorsAllowed', 'friendsInRoom', 'overnightGuests', 'quietHours',
      'smokingProhibited', 'alcoholProhibited', 'petsAllowed', 'cookingAllowed',
      'gateTimings', 'cleanlinessAudit', 'securityDepositDeductions'
    ];
    keys.forEach(k => {
      const chk = document.getElementById(`rule-${k}`);
      if (chk) draft.rules[k] = chk.checked;
    });

    // Collect custom rules
    const customRules = [];
    const rows = document.querySelectorAll('.agr-custom-rule-row');
    rows.forEach(r => {
      const nameInp = r.querySelector('input[id^="cr-name-"]');
      const descInp = r.querySelector('input[id^="cr-desc-"]');
      if (nameInp && nameInp.value.trim()) {
        customRules.push({
          name: nameInp.value.trim(),
          description: descInp ? descInp.value.trim() : ''
        });
      }
    });
    draft.customRules = customRules;
    draft.updatedAt = new Date().toISOString();

    // Persist draft
    DB.saveAgreement(draft);

    // Proceed to Review / Sign screen
    this.openSignWorkflow(draft.id);
  },

  // ═══════════════════════════════════════════════════════════
  // 4. SIGNATURE WORKFLOW — TENANT & OWNER CANVASES
  // ═══════════════════════════════════════════════════════════
  openSignWorkflow(agrId) {
    const agr = DB.getAgreementById(agrId);
    if (!agr) return;
    this.activeDraft = agr;

    showModal(`Sign Agreement: ${agr.id}`, `
      <div class="agr-sign-flow">
        <!-- Agreement Mini Summary Strip -->
        <div class="agr-review-strip">
          <div>
            <div class="agr-rs-name">${agr.tenant.name}</div>
            <div class="agr-rs-meta">Room ${agr.accommodation.roomName} · ${formatCurrency(agr.financial.monthlyRent, DB.getProperty().currency)}/mo</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="Agreements.openEditAgreementForm(Agreements.activeDraft)">
            ✏️ Edit Terms
          </button>
        </div>

        <!-- 1. Tenant Digital Signature -->
        <div class="agr-sig-card">
          <div class="agr-sig-card-head">
            <div>
              <div class="agr-sig-title">1. Tenant Signature</div>
              <div class="agr-sig-sub">Capture signature physically on screen or upload a signed image.</div>
            </div>
            ${agr.signatures?.tenantSignature ? '<span class="badge green">✓ Captured</span>' : '<span class="badge amber">Pending</span>'}
          </div>

          ${agr.signatures?.tenantSignature ? `
            <div class="agr-sig-preview-box">
              <div class="fs-11 fw-600 color-secondary mb-4">${agr.signatures.tenantSignatureMethod === 'UPLOADED' ? '📁 Uploaded Signature Document' : '✍️ Drawn Digital Signature'}</div>
              <img src="${agr.signatures.tenantSignature}" class="agr-sig-preview-img">
              <div class="fs-11 color-muted mt-4">Captured on ${new Date(agr.signatures.tenantSignedAt).toLocaleString('en-IN')}</div>
              <button class="btn btn-ghost btn-sm mt-4" style="color:var(--accent-red)" onclick="Agreements.clearTenantSignature()">
                Reset Signature
              </button>
            </div>
          ` : `
            <!-- Mode Segmented Tabs -->
            <div class="agr-sig-mode-tabs">
              <button type="button" class="agr-sig-mode-btn ${this.tenantSigMode === 'DRAW' ? 'active' : ''}" onclick="Agreements.setTenantSigMode('DRAW')">
                ✍️ Sign Now (Draw)
              </button>
              <button type="button" class="agr-sig-mode-btn ${this.tenantSigMode === 'UPLOAD' ? 'active' : ''}" onclick="Agreements.setTenantSigMode('UPLOAD')">
                📁 Upload Signature Image
              </button>
            </div>

            ${this.tenantSigMode === 'DRAW' ? `
              <div class="agr-canvas-wrapper">
                <canvas id="tenant-sig-canvas" class="agr-canvas" width="400" height="160"></canvas>
              </div>
              <div class="agr-canvas-actions">
                <button type="button" class="btn btn-ghost btn-sm" onclick="Agreements.clearCanvas('tenant-sig-canvas')">Clear</button>
                <button type="button" class="btn btn-primary btn-sm" onclick="Agreements.confirmTenantSignature()">Confirm Tenant Signature</button>
              </div>
            ` : `
              <div class="agr-upload-section">
                <label class="agr-upload-dropzone" for="agr-tenant-sig-file">
                  <input type="file" id="agr-tenant-sig-file" accept="image/*" onchange="Agreements.handleSignatureUpload(this)">
                  <div style="font-size:28px;margin-bottom:6px">📤</div>
                  <div style="font-size:13px;font-weight:600;color:var(--accent-blue)">Click to select or capture signature image</div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Supports JPG, PNG, WEBP (Max 5MB)</div>
                </label>

                ${this.uploadedTenantSig ? `
                  <div style="text-align:center;margin-top:12px">
                    <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Selected Signature Preview:</div>
                    <div class="agr-upload-preview-frame">
                      <img src="${this.uploadedTenantSig}" id="uploaded-sig-preview">
                    </div>
                    <div style="display:flex;justify-content:center;gap:8px;margin-top:10px">
                      <button type="button" class="btn btn-ghost btn-sm" onclick="Agreements.clearUploadedSig()">Remove</button>
                      <button type="button" class="btn btn-primary btn-sm" onclick="Agreements.confirmUploadedTenantSignature()">✓ Confirm Uploaded Signature</button>
                    </div>
                  </div>
                ` : ''}
              </div>
            `}
          `}
        </div>

        <!-- 2. Owner / Authorized Signature -->
        <div class="agr-sig-card">
          <div class="agr-sig-card-head">
            <div>
              <div class="agr-sig-title">2. PG Owner / Manager Signature</div>
              <div class="agr-sig-sub">Signed by ${agr.pg.owner || 'Owner'} on behalf of ${agr.pg.name}</div>
            </div>
            ${agr.signatures?.ownerSignature ? '<span class="badge green">✓ Captured</span>' : '<span class="badge amber">Pending</span>'}
          </div>

          ${agr.signatures?.ownerSignature ? `
            <div class="agr-sig-preview-box">
              <img src="${agr.signatures.ownerSignature}" class="agr-sig-preview-img">
              <div class="fs-11 color-muted mt-4">Signed on ${new Date(agr.signatures.ownerSignedAt).toLocaleString('en-IN')}</div>
              <button class="btn btn-ghost btn-sm mt-4" style="color:var(--accent-red)" onclick="Agreements.clearOwnerSignature()">
                Redraw Signature
              </button>
            </div>
          ` : `
            ${DB.getOwnerSignature() ? `
              <div class="agr-saved-sig-prompt">
                <div class="fs-13 fw-600 mb-4">Saved Owner Signature Available</div>
                <img src="${DB.getOwnerSignature()}" style="height:48px;object-fit:contain;background:rgba(255,255,255,0.85);border-radius:6px;padding:4px;border:1px solid var(--border)">
                <div class="mt-8">
                  <button type="button" class="btn btn-success btn-sm" onclick="Agreements.applySavedOwnerSignature()">
                    ✓ Use Saved Owner Signature
                  </button>
                </div>
              </div>
              <div class="fs-12 color-muted my-8 text-center">— OR DRAW NEW SIGNATURE —</div>
            ` : ''}

            <div class="agr-canvas-wrapper">
              <canvas id="owner-sig-canvas" class="agr-canvas" width="400" height="160"></canvas>
            </div>
            <div class="agr-canvas-actions">
              <button type="button" class="btn btn-ghost btn-sm" onclick="Agreements.clearCanvas('owner-sig-canvas')">Clear</button>
              <button type="button" class="btn btn-primary btn-sm" onclick="Agreements.confirmOwnerSignature()">Confirm Owner Signature</button>
            </div>
          `}
        </div>

        <!-- 3. Finalize & Preview Agreement Actions -->
        <div class="agr-finalize-box">
          <div class="fs-12 color-muted mb-8 text-center">
            ${(agr.signatures?.tenantSignature && agr.signatures?.ownerSignature)
              ? '✅ Both signatures captured! Ready to finalize and generate the signed agreement.'
              : '⚠️ Signatures pending. Both tenant and owner signatures can be confirmed independently.'}
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-primary btn-full" id="btn-finalize-agr" onclick="Agreements.finalizeAgreement()"
              ${(!agr.signatures?.tenantSignature || !agr.signatures?.ownerSignature) ? 'disabled style="opacity:0.55"' : ''}>
              <span>🔒 Finalize &amp; Download Signed PDF</span>
            </button>
            <button class="btn btn-outline btn-full" onclick="Agreements.previewAgreement('${agr.id}')">
              <span>👁️ Preview Agreement (Current Draft)</span>
            </button>
            <button class="btn btn-ghost btn-full" onclick="Agreements.openMainScreen()">Back to Agreements</button>
          </div>
        </div>
      </div>
    `);

    // Attach drawing listeners to active signature canvases immediately and after sheet animation
    setTimeout(() => {
      this.initSignatureCanvas('tenant-sig-canvas');
      this.initSignatureCanvas('owner-sig-canvas');
    }, 60);
    setTimeout(() => {
      this.initSignatureCanvas('tenant-sig-canvas');
      this.initSignatureCanvas('owner-sig-canvas');
    }, 380);
  },

  initSignatureCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width > 50 ? rect.width : 400;
    const h = rect.height > 50 ? rect.height : 160;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false;
    let hasDrawn = false;

    function getCoords(e) {
      const r = canvas.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return {
        x: clientX - r.left,
        y: clientY - r.top
      };
    }

    const startDraw = (e) => {
      e.preventDefault();
      isDrawing = true;
      hasDrawn = true;
      const pt = getCoords(e);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.25, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      if (e.pointerId !== undefined && canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
    };

    const drawMove = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      hasDrawn = true;
      const pt = getCoords(e);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    };

    const endDraw = (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      if (e.pointerId !== undefined && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };

    if (window.PointerEvent) {
      canvas.addEventListener('pointerdown', startDraw);
      canvas.addEventListener('pointermove', drawMove);
      canvas.addEventListener('pointerup', endDraw);
      canvas.addEventListener('pointercancel', endDraw);
    } else {
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', drawMove, { passive: false });
      canvas.addEventListener('touchend', endDraw, { passive: false });
      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', drawMove);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('mouseleave', endDraw);
    }

    canvas._hasDrawn = () => hasDrawn;
  },

  isCanvasBlank(canvas) {
    if (!canvas) return true;
    try {
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 15) return false;
      }
      return true;
    } catch (e) {
      return !canvas._hasDrawn || !canvas._hasDrawn();
    }
  },

  clearCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas._hasDrawn = () => false;
  },

  setTenantSigMode(mode) {
    this.tenantSigMode = mode;
    this.openSignWorkflow(this.activeDraft.id);
  },

  handleSignatureUpload(input) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedTenantSig = e.target.result;
      this.openSignWorkflow(this.activeDraft.id);
      showToast('Signature image loaded! Please review and confirm.', 'info');
    };
    reader.onerror = () => {
      showToast('Failed to load image file', 'error');
    };
    reader.readAsDataURL(file);
  },

  clearUploadedSig() {
    this.uploadedTenantSig = null;
    this.openSignWorkflow(this.activeDraft.id);
  },

  confirmUploadedTenantSignature() {
    if (!this.activeDraft) return;
    if (!this.uploadedTenantSig) {
      showToast('Please select or upload a signature image first', 'error');
      return;
    }
    this.activeDraft.signatures.tenantSignature = this.uploadedTenantSig;
    this.activeDraft.signatures.tenantSignatureMethod = 'UPLOADED';
    this.activeDraft.signatures.tenantSignedAt = new Date().toISOString();
    this.activeDraft.status = this.activeDraft.signatures.ownerSignature ? 'SIGNED' : 'PENDING_OWNER_SIGNATURE';
    DB.saveAgreement(this.activeDraft);
    this.uploadedTenantSig = null;
    showToast('✅ Tenant signature confirmed (Uploaded)!', 'success');
    this.openSignWorkflow(this.activeDraft.id);
  },

  confirmTenantSignature() {
    if (!this.activeDraft) return;

    // In UPLOAD mode, confirm the uploaded image
    if (this.tenantSigMode === 'UPLOAD') {
      if (!this.uploadedTenantSig) {
        showToast('Please select or upload a signature image first', 'error');
        return;
      }
      this.confirmUploadedTenantSignature();
      return;
    }

    // DRAW mode validation
    const canvas = document.getElementById('tenant-sig-canvas');
    if (!canvas || this.isCanvasBlank(canvas)) {
      showToast('Please draw your signature before confirming', 'error');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    this.activeDraft.signatures.tenantSignature = dataUrl;
    this.activeDraft.signatures.tenantSignatureMethod = 'DRAWN';
    this.activeDraft.signatures.tenantSignedAt = new Date().toISOString();
    this.activeDraft.status = this.activeDraft.signatures.ownerSignature ? 'SIGNED' : 'PENDING_OWNER_SIGNATURE';
    DB.saveAgreement(this.activeDraft);
    showToast('✅ Tenant signature confirmed!', 'success');
    this.openSignWorkflow(this.activeDraft.id);
  },

  clearTenantSignature() {
    if (!this.activeDraft) return;
    this.activeDraft.signatures.tenantSignature = null;
    this.activeDraft.signatures.tenantSignatureMethod = null;
    this.activeDraft.signatures.tenantSignedAt = null;
    this.activeDraft.status = this.activeDraft.signatures.ownerSignature ? 'PENDING_TENANT_SIGNATURE' : 'DRAFT';
    this.uploadedTenantSig = null;
    DB.saveAgreement(this.activeDraft);
    showToast('Tenant signature reset', 'info');
    this.openSignWorkflow(this.activeDraft.id);
  },

  confirmOwnerSignature() {
    if (!this.activeDraft) return;
    const canvas = document.getElementById('owner-sig-canvas');
    if (!canvas || this.isCanvasBlank(canvas)) {
      showToast('Please draw an owner signature before confirming', 'error');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    this.activeDraft.signatures.ownerSignature = dataUrl;
    this.activeDraft.signatures.ownerSignedAt = new Date().toISOString();
    this.activeDraft.status = this.activeDraft.signatures.tenantSignature ? 'SIGNED' : 'PENDING_TENANT_SIGNATURE';
    DB.saveAgreement(this.activeDraft);
    showToast('✅ PG Owner signature confirmed!', 'success');
    this.openSignWorkflow(this.activeDraft.id);
  },

  applySavedOwnerSignature() {
    if (!this.activeDraft) return;
    const saved = DB.getOwnerSignature();
    if (!saved) return;
    if (!confirm('Apply saved PG owner signature to this agreement?')) return;
    this.activeDraft.signatures.ownerSignature = saved;
    this.activeDraft.signatures.ownerSignedAt = new Date().toISOString();
    this.activeDraft.status = this.activeDraft.signatures.tenantSignature ? 'SIGNED' : 'PENDING_TENANT_SIGNATURE';
    DB.saveAgreement(this.activeDraft);
    showToast('✅ Saved PG Owner signature confirmed & applied!', 'success');
    this.openSignWorkflow(this.activeDraft.id);
  },

  clearOwnerSignature() {
    if (!this.activeDraft) return;
    this.activeDraft.signatures.ownerSignature = null;
    this.activeDraft.signatures.ownerSignedAt = null;
    this.activeDraft.status = this.activeDraft.signatures.tenantSignature ? 'PENDING_OWNER_SIGNATURE' : 'DRAFT';
    DB.saveAgreement(this.activeDraft);
    showToast('Owner signature reset', 'info');
    this.openSignWorkflow(this.activeDraft.id);
  },

  // Finalize agreement and transition status to ACTIVE
  finalizeAgreement() {
    if (!this.activeDraft) return;
    if (!this.activeDraft.signatures?.tenantSignature || !this.activeDraft.signatures?.ownerSignature) {
      showToast('Both tenant and owner signatures are required to finalize', 'error');
      return;
    }

    this.activeDraft.status = 'ACTIVE';
    this.activeDraft.finalizedAt = new Date().toISOString();
    DB.saveAgreement(this.activeDraft);

    if (typeof SoundFX !== 'undefined' && SoundFX.success) {
      SoundFX.success();
    }
    showToast('🎉 Rent Agreement successfully finalized!', 'success');

    // Open view modal with PDF and PNG downloads
    this.previewAgreement(this.activeDraft.id);
  },

  // Create new revision from existing agreement
  createRevision(agrId) {
    const orig = DB.getAgreementById(agrId);
    if (!orig) return;

    const revision = JSON.parse(JSON.stringify(orig));
    revision.version = (orig.version || 1) + 1;
    revision.status = 'DRAFT';
    revision.createdAt = new Date().toISOString();
    revision.updatedAt = new Date().toISOString();
    revision.finalizedAt = null;
    revision.signatures = {
      tenantSignature: null,
      tenantSignedAt: null,
      ownerSignature: null,
      ownerSignedAt: null
    };

    // Save as updated version
    DB.saveAgreement(revision);
    showToast(`Created Revision v${revision.version}`, 'info');
    this.openEditAgreementForm(revision);
  },

  confirmDelete(agrId) {
    if (confirm('Are you sure you want to delete this agreement record?')) {
      DB.deleteAgreement(agrId);
      showToast('🗑️ Agreement deleted', 'info');
      this.openMainScreen();
    }
  },

  // ═══════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  // 5. AGREEMENT PREVIEW & DOWNLOAD SYSTEM (PDF & PER-PAGE PNG)
  // ═══════════════════════════════════════════════════════════
  previewAgreement(agrId) {
    const agr = DB.getAgreementById(agrId);
    if (!agr) return;
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';

    const page1Html = this.renderDocumentPage1HTML(agr, prop, cur);
    const page2Html = this.renderDocumentPage2HTML(agr, prop, cur);

    showModal(`Agreement: ${agr.id}`, `
      <div class="agr-preview-wrapper">
        <!-- Top Toolbar with Document-Level Actions -->
        <div class="agr-preview-toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-primary)">📄 ${agr.id} (v${agr.version || 1})</div>
            <div style="font-size:11px;color:var(--text-muted)">${agr.status} · 2 Pages Document</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-whatsapp btn-sm" onclick="Agreements.shareAgreement('${agr.id}')">
              <span>📲</span> <span>Share on WhatsApp</span>
            </button>
            <button class="btn btn-outline btn-sm" onclick="Agreements.shareAgreement('${agr.id}', { chooseContact: true })" title="Choose contact in WhatsApp">
              <span>👥 Choose Contact</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="Agreements.downloadAgreementPDF('${agr.id}')">
              <span>📥</span> <span>Download Agreement (PDF)</span>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Agreements.openMainScreen()">
              <span>✕</span> <span>Close</span>
            </button>
          </div>
        </div>

        <!-- Distinct Paginated Cards -->
        <div class="agr-pages-container">
          <!-- Page 1 Card -->
          <div class="agr-page-card" id="agr-page-card-1">
            <div class="agr-page-header-bar">
              <span>PAGE 1 OF 2 — PARTIES, ACCOMMODATION &amp; FINANCIAL TERMS</span>
              <div style="display:flex;gap:6px">
                <button class="btn btn-outline btn-sm" style="padding:4px 10px;font-size:11px" onclick="Agreements.shareAgreement('${agr.id}', { page: 1 })" title="Share Page 1 on WhatsApp">
                  <span>📲 Share</span>
                </button>
                <button class="btn btn-outline btn-sm" style="padding:4px 10px;font-size:11px" onclick="Agreements.downloadPagePNG('${agr.id}', 1)">
                  <span>📥</span> <span>Download Page 1 (PNG)</span>
                </button>
              </div>
            </div>
            <div class="agr-page-content" id="agr-page-content-1">
              ${page1Html}
            </div>
          </div>

          <!-- Page 2 Card -->
          <div class="agr-page-card" id="agr-page-card-2">
            <div class="agr-page-header-bar">
              <span>PAGE 2 OF 2 — PG RULES, DECLARATION &amp; DIGITAL SIGNATURES</span>
              <div style="display:flex;gap:6px">
                <button class="btn btn-outline btn-sm" style="padding:4px 10px;font-size:11px" onclick="Agreements.shareAgreement('${agr.id}', { page: 2 })" title="Share Page 2 on WhatsApp">
                  <span>📲 Share</span>
                </button>
                <button class="btn btn-outline btn-sm" style="padding:4px 10px;font-size:11px" onclick="Agreements.downloadPagePNG('${agr.id}', 2)">
                  <span>📥</span> <span>Download Page 2 (PNG)</span>
                </button>
              </div>
            </div>
            <div class="agr-page-content" id="agr-page-content-2">
              ${page2Html}
            </div>
          </div>
        </div>
      </div>
    `);
  },

  renderDocumentPage1HTML(agr, prop, cur) {
    const activeLogo = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';
    return `
      <!-- Document Header -->
      <div class="doc-header">
        <div class="logo-box" style="width:72px; height:72px; border-radius:16px; background:#FFFFFF; border:2px solid #0284C7; box-shadow:0 4px 12px rgba(0,0,0,0.08); margin:0 auto 12px; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:4px;">
          ${activeLogo ? `<img src="${activeLogo}" alt="Logo" style="max-width:100%; max-height:100%; object-fit:contain; display:block;">` : `<span style="font-size:36px">🏠</span>`}
        </div>
        <div class="doc-badge">OFFICIAL RESIDENTIAL RENTAL AGREEMENT</div>
        <h1 class="doc-main-title">${agr.pg.name || prop.name}</h1>
        <div class="doc-sub-title">${agr.pg.tagline || 'Professional PG Accommodation'} · ${agr.pg.address || prop.address}</div>
        <div class="doc-id-pill">AGREEMENT ID: <strong>${agr.id}</strong> (Version ${agr.version || 1}) · Date: ${formatDateDisplay(agr.createdAt)}</div>
      </div>

      <!-- Parties Involved -->
      <div class="doc-section">
        <div class="doc-sec-heading">1. CONTRACTING PARTIES &amp; PREMISES</div>
        <p class="doc-paragraph">
          This PG Rental Agreement is executed on <strong>${formatDateDisplay(agr.createdAt)}</strong> by and between:
        </p>
        <div class="doc-grid-two">
          <div class="doc-party-box">
            <div class="doc-party-role">FIRST PARTY (PG OWNER / MANAGEMENT)</div>
            <div class="doc-party-name"><strong>${agr.pg.owner || prop.owner}</strong></div>
            <div class="doc-party-detail">Business: ${agr.pg.name || prop.name}</div>
            <div class="doc-party-detail">Phone: +91 ${agr.pg.phone || prop.phone || 'N/A'}</div>
            <div class="doc-party-detail">Address: ${agr.pg.address || prop.address}</div>
          </div>
          <div class="doc-party-box">
            <div class="doc-party-role">SECOND PARTY (TENANT / RESIDENT)</div>
            <div class="doc-party-name"><strong>${agr.tenant.name}</strong></div>
            <div class="doc-party-detail">Phone: +91 ${agr.tenant.phone}</div>
            <div class="doc-party-detail">ID: ${agr.tenant.idProof || 'Verified Resident'}</div>
            <div class="doc-party-detail">Permanent Address: ${agr.tenant.permanentAddress || 'As per record'}</div>
          </div>
        </div>
        <p class="doc-paragraph mt-8">
          <strong>Allotted Accommodation:</strong> Room No. <strong>${agr.accommodation.roomName}</strong>, Bed <strong>${agr.accommodation.bedNumber}</strong> (${agr.accommodation.floorName || 'Floor'}, ${agr.accommodation.capacity || 2}-Sharing Basis).
        </p>
      </div>

      <!-- Financial Terms -->
      <div class="doc-section">
        <div class="doc-sec-heading">2. FINANCIAL CONSIDERATIONS &amp; DUES</div>
        <table class="doc-table">
          <tr>
            <td><strong>Monthly Rent:</strong></td>
            <td><strong>${formatCurrency(agr.financial.monthlyRent, cur)}</strong> payable on or before the <strong>${agr.financial.dueDay || 5}th</strong> of every calendar month.</td>
          </tr>
          <tr>
            <td><strong>Security Deposit:</strong></td>
            <td><strong>${formatCurrency(agr.financial.securityDeposit, cur)}</strong> (Refundable at vacating, subject to notice period and damage assessments).</td>
          </tr>
          <tr>
            <td><strong>Electricity Charges:</strong></td>
            <td>${agr.financial.electricityIncluded ? 'Included in monthly rent.' : `Separate metered charge at ${cur}${agr.financial.electricityRate || 8} per unit.`}</td>
          </tr>
          <tr>
            <td><strong>Water &amp; Wi-Fi Amenities:</strong></td>
            <td>Included as part of the PG amenities.</td>
          </tr>
          <tr>
            <td><strong>Grace Period &amp; Late Fee:</strong></td>
            <td>${agr.financial.gracePeriodDays || 3} days grace period. Late fee applies for delayed payments.</td>
          </tr>
        </table>
      </div>

      <!-- Stay Terms & Lock-in -->
      <div class="doc-section">
        <div class="doc-sec-heading">3. PERIOD OF STAY, LOCK-IN &amp; NOTICE</div>
        <ul class="doc-bullets">
          <li><strong>Commencement Date:</strong> The tenancy commences on <strong>${formatDateDisplay(agr.stayTerms.startDate)}</strong>${agr.stayTerms.endDate ? ` and valid until <strong>${formatDateDisplay(agr.stayTerms.endDate)}</strong>.` : ' on an ongoing monthly renewal basis.'}</li>
          <li><strong>Lock-in Period:</strong> ${agr.stayTerms.lockInMonths > 0 ? `A contractual lock-in period of <strong>${agr.stayTerms.lockInMonths} months</strong> applies to this accommodation.` : 'No mandatory lock-in period applies.'}</li>
          <li><strong>Notice Period for Vacating:</strong> The tenant must provide at least <strong>${agr.stayTerms.noticeDaysTenant || 30} days</strong> prior written notice before vacating the premises.</li>
        </ul>
      </div>

      <div class="doc-page-footer">
        <span>Powered by Rentora · Agreement ID: ${agr.id} (v${agr.version || 1})</span>
        <span>Page 1 of 2</span>
      </div>
    `;
  },

  renderDocumentPage2HTML(agr, prop, cur) {
    const activeLogo = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';
    return `
      <!-- Document Mini Header on Page 2 -->
      <div class="doc-header" style="padding-bottom:8px;margin-bottom:12px;border-bottom:1px solid #CBD5E1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:8px;background:#FFFFFF;border:1.5px solid #0284C7;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:2px">
              ${activeLogo ? `<img src="${activeLogo}" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain;display:block">` : `<span style="font-size:18px">🏠</span>`}
            </div>
            <div style="font-size:12px;font-weight:700;color:#0F172A">${agr.pg.name || prop.name} — RENT AGREEMENT</div>
          </div>
          <div style="font-size:11px;color:#0284C7;font-weight:600">ID: ${agr.id} (v${agr.version || 1})</div>
        </div>
      </div>

      <!-- House Rules & PG Policies -->
      <div class="doc-section">
        <div class="doc-sec-heading">4. PG POLICIES, CODE OF CONDUCT &amp; DISCIPLINE</div>
        <ul class="doc-bullets">
          <li><strong>Visitors &amp; Friends:</strong> ${agr.rules?.visitorsAllowed ? (agr.rules?.friendsInRoom ? 'Daytime visitors & friends are allowed in rooms during permissible hours.' : 'Visitors are allowed only in designated common areas; not inside private rooms.') : 'Outside visitors are strictly prohibited inside the premises.'}</li>
          <li><strong>Overnight Guests:</strong> ${agr.rules?.overnightGuests ? 'Overnight guests require prior approval from PG management.' : 'Overnight guests are strictly prohibited.'}</li>
          <li><strong>Quiet Hours:</strong> ${agr.rules?.quietHours ? 'Quiet hours are observed strictly between 10:00 PM and 7:00 AM. Loud music and disturbance are disallowed.' : 'Residents are requested to maintain general discipline.'}</li>
          <li><strong>Substance Policy:</strong> ${agr.rules?.smokingProhibited ? 'Smoking is strictly prohibited throughout the property.' : 'Smoking restricted to designated open areas.'} ${agr.rules?.alcoholProhibited ? 'Alcohol consumption or storage is strictly prohibited.' : ''}</li>
          <li><strong>Room Cooking:</strong> ${agr.rules?.cookingAllowed ? 'Light cooking permitted in rooms with designated appliances.' : 'Cooking inside rooms is strictly prohibited for electrical safety.'}</li>
          <li><strong>Gate Curfew:</strong> ${agr.rules?.gateTimings ? 'Main entry gate is locked between 10:30 PM and 6:00 AM.' : 'Late entry permitted subject to register sign-in.'}</li>
          <li><strong>Cleanliness &amp; Inspection:</strong> ${agr.rules?.cleanlinessAudit ? 'Periodic cleanliness checks and maintenance inspections are conducted with reasonable notice.' : 'Tenant must keep accommodation in hygienic condition.'}</li>
          <li><strong>Deposit Settlement:</strong> ${agr.rules?.securityDepositDeductions ? 'Repair costs for any damages to room furniture, walls, or keys will be adjusted from the security deposit.' : 'Standard deposit refund procedure applies upon vacating.'}</li>
          ${agr.customRules && agr.customRules.length > 0 ? agr.customRules.map(cr => `
            <li><strong>${cr.name}:</strong> ${cr.description}</li>
          `).join('') : ''}
        </ul>
      </div>

      <!-- Signatures Section -->
      <div class="doc-section doc-signatures-section" style="margin-top:20px">
        <div class="doc-sec-heading">5. ACKNOWLEDGEMENT &amp; DIGITAL SIGNATURES</div>
        <p class="doc-paragraph fs-11" style="color:#475569">
          Both parties have read, understood, and agreed to all the terms, policies, financial schedule, and code of conduct stated in this Agreement.
        </p>
        <div class="doc-signatures-grid" style="margin-top:16px">
          <div class="doc-sig-box" style="${agr.signatures?.tenantSignature ? 'border-color:#86EFAC;background:#F0FDF4;' : 'border-style:dashed;'}">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;color:${agr.signatures?.tenantSignature ? '#16A34A' : '#94A3B8'};">
              ${agr.signatures?.tenantSignature ? '✓ CONFIRMED SIGNATURE' : '⏳ PENDING TENANT SIGNATURE'}
            </div>
            <div class="doc-sig-img-wrap">
              ${agr.signatures?.tenantSignature ? `<img src="${agr.signatures.tenantSignature}" class="doc-sig-image" alt="Tenant Signature">` : '<div class="doc-sig-placeholder" style="color:#94A3B8;font-style:italic;padding:8px;">Awaiting Tenant Signature</div>'}
            </div>
            <div class="doc-sig-line"></div>
            <div class="doc-sig-name"><strong>${agr.tenant.name}</strong></div>
            <div class="doc-sig-title">Tenant (Resident) · ${agr.signatures?.tenantSignatureMethod === 'UPLOADED' ? 'Uploaded Signature' : 'Digital Sign'}</div>
            <div class="doc-sig-date">${agr.signatures?.tenantSignedAt ? formatDateDisplay(agr.signatures.tenantSignedAt) : 'Pending Confirmation'}</div>
          </div>
          <div class="doc-sig-box" style="${agr.signatures?.ownerSignature ? 'border-color:#86EFAC;background:#F0FDF4;' : 'border-style:dashed;'}">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;color:${agr.signatures?.ownerSignature ? '#16A34A' : '#94A3B8'};">
              ${agr.signatures?.ownerSignature ? '✓ CONFIRMED SIGNATURE' : '⏳ PENDING OWNER SIGNATURE'}
            </div>
            <div class="doc-sig-img-wrap">
              ${agr.signatures?.ownerSignature ? `<img src="${agr.signatures.ownerSignature}" class="doc-sig-image" alt="Owner Signature">` : '<div class="doc-sig-placeholder" style="color:#94A3B8;font-style:italic;padding:8px;">Awaiting Owner Signature</div>'}
            </div>
            <div class="doc-sig-line"></div>
            <div class="doc-sig-name"><strong>${agr.pg.owner || prop.owner}</strong></div>
            <div class="doc-sig-title">PG Management (${agr.pg.name || prop.name})</div>
            <div class="doc-sig-date">${agr.signatures?.ownerSignedAt ? formatDateDisplay(agr.signatures.ownerSignedAt) : 'Pending Confirmation'}</div>
          </div>
        </div>
      </div>

      <div class="doc-page-footer">
        <span>Powered by Rentora · Agreement ID: ${agr.id} (v${agr.version || 1})</span>
        <span>Page 2 of 2</span>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════
  // HIGH-RESOLUTION A4 CANVAS RENDERER (PAGE 1 & PAGE 2)
  // ═══════════════════════════════════════════════════════════
  async renderPageCanvas(agr, pageNum) {
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';

    // Standard High-Resolution A4 (1240 x 1754 px at ~150 DPI)
    const canvas = document.createElement('canvas');
    const width = 1240;
    const height = 1754;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Fill Page Background (Crisp White)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Decorative page border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    const pad = 60;
    let y = 70;

    function drawText(text, x, curY, font, color, align = 'left') {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(text, x, curY);
    }

    function drawLine(x1, y1, x2, y2, color, lw = 1) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    function drawWrappedText(text, x, startY, maxWidth, lineHeight, font, color) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      const words = (text || '').split(' ');
      let line = '';
      let curY = startY;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), x, curY);
          line = words[n] + ' ';
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), x, curY);
      return curY + lineHeight;
    }

    if (pageNum === 1) {
      // ════════ PAGE 1 RENDERING ════════
      // Header Logo
      const logoSrc = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';
      let logoDrawn = false;
      const lSize = 72;
      const lx = (width - lSize) / 2;
      if (logoSrc && typeof ImageUtils !== 'undefined' && ImageUtils.loadCleanImage) {
        try {
          const lImg = await ImageUtils.loadCleanImage(logoSrc);
          if (lImg && lImg.naturalWidth > 0) {
            ctx.save();
            if (ctx.roundRect) ctx.roundRect(lx, y, lSize, lSize, 14);
            else ctx.rect(lx, y, lSize, lSize);
            ctx.clip();
            ctx.drawImage(lImg, lx, y, lSize, lSize);
            ctx.restore();

            // Accent border
            ctx.save();
            ctx.strokeStyle = '#0284C7';
            ctx.lineWidth = 2;
            if (ctx.roundRect) ctx.roundRect(lx, y, lSize, lSize, 14);
            else ctx.rect(lx, y, lSize, lSize);
            ctx.stroke();
            ctx.restore();

            logoDrawn = true;
          }
        } catch (e) {}
      }
      if (!logoDrawn) {
        ctx.save();
        ctx.fillStyle = '#E0F2FE';
        if (ctx.roundRect) ctx.roundRect(lx, y, lSize, lSize, 14);
        else ctx.fillRect(lx, y, lSize, lSize);
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        if (ctx.roundRect) ctx.roundRect(lx, y, lSize, lSize, 14);
        else ctx.strokeRect(lx, y, lSize, lSize);
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏠', lx + lSize / 2, y + lSize / 2);
        ctx.restore();
      }
      y += lSize + 14;

      // Header Badge
      ctx.fillStyle = '#E0F2FE';
      const badgeW = 340;
      const badgeH = 30;
      ctx.fillRect((width - badgeW) / 2, y, badgeW, badgeH);
      drawText('OFFICIAL RESIDENTIAL RENTAL AGREEMENT', width / 2, y + 20, 'bold 13px sans-serif', '#0284C7', 'center');
      y += 50;

      // Title & Subtitle
      drawText(agr.pg.name || prop.name || 'PG Management', width / 2, y, '800 36px sans-serif', '#0F172A', 'center');
      y += 34;
      const subtitle = `${agr.pg.tagline || 'Professional PG Accommodation'} · ${agr.pg.address || prop.address || ''}`;
      drawText(subtitle, width / 2, y, '16px sans-serif', '#64748B', 'center');
      y += 30;

      // Agreement ID Pill
      drawText(`AGREEMENT ID: ${agr.id} (Version ${agr.version || 1}) · Date: ${formatDateDisplay(agr.createdAt)}`, width / 2, y, 'bold 15px sans-serif', '#0284C7', 'center');
      y += 24;
      drawLine(pad, y, width - pad, y, '#0284C7', 3);
      y += 36;

      // Section 1: Parties & Premises
      drawText('1. CONTRACTING PARTIES & PREMISES', pad, y, '800 18px sans-serif', '#0F172A');
      y += 12;
      drawLine(pad, y, width - pad, y, '#CBD5E1', 1.5);
      y += 26;

      drawText(`This PG Rental Agreement is executed on ${formatDateDisplay(agr.createdAt)} by and between:`, pad, y, '15px sans-serif', '#334155');
      y += 30;

      // Two Column Cards for Parties
      const boxW = (width - pad * 2 - 30) / 2;
      const boxH = 170;

      // Owner Box
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(pad, y, boxW, boxH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad, y, boxW, boxH);

      drawText('FIRST PARTY (PG OWNER / MANAGEMENT)', pad + 18, y + 30, 'bold 13px sans-serif', '#0284C7');
      drawText(agr.pg.owner || prop.owner || 'Owner', pad + 18, y + 60, 'bold 18px sans-serif', '#0F172A');
      drawText(`Business: ${agr.pg.name || prop.name}`, pad + 18, y + 90, '14px sans-serif', '#475569');
      drawText(`Phone: +91 ${agr.pg.phone || prop.phone || 'N/A'}`, pad + 18, y + 115, '14px sans-serif', '#475569');
      drawText(`Address: ${agr.pg.address || prop.address || ''}`, pad + 18, y + 140, '14px sans-serif', '#475569');

      // Tenant Box
      const tenantX = pad + boxW + 30;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(tenantX, y, boxW, boxH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tenantX, y, boxW, boxH);

      drawText('SECOND PARTY (TENANT / RESIDENT)', tenantX + 18, y + 30, 'bold 13px sans-serif', '#0284C7');
      drawText(agr.tenant.name, tenantX + 18, y + 60, 'bold 18px sans-serif', '#0F172A');
      drawText(`Phone: +91 ${agr.tenant.phone}`, tenantX + 18, y + 90, '14px sans-serif', '#475569');
      drawText(`ID: ${agr.tenant.idProof || 'Verified Resident'}`, tenantX + 18, y + 115, '14px sans-serif', '#475569');
      drawText(`Address: ${agr.tenant.permanentAddress || 'As per record'}`, tenantX + 18, y + 140, '14px sans-serif', '#475569');

      y += boxH + 28;

      // Accommodation Summary
      const accomText = `Allotted Accommodation: Room No. ${agr.accommodation.roomName}, Bed ${agr.accommodation.bedNumber} (${agr.accommodation.floorName || 'Floor'}, ${agr.accommodation.capacity || 2}-Sharing Basis).`;
      drawText(`• ${accomText}`, pad, y, 'bold 15px sans-serif', '#0F172A');
      y += 44;

      // Section 2: Financial Considerations
      drawText('2. FINANCIAL CONSIDERATIONS & DUES', pad, y, '800 18px sans-serif', '#0F172A');
      y += 12;
      drawLine(pad, y, width - pad, y, '#CBD5E1', 1.5);
      y += 30;

      const financeRows = [
        ['Monthly Rent:', `${formatCurrency(agr.financial.monthlyRent, cur)} payable on or before the ${agr.financial.dueDay || 5}th of every calendar month.`],
        ['Security Deposit:', `${formatCurrency(agr.financial.securityDeposit, cur)} (Refundable at vacating, subject to notice period and damage assessments).`],
        ['Electricity:', agr.financial.electricityIncluded ? 'Included in monthly rent.' : `Separate metered charge at ${cur}${agr.financial.electricityRate || 8} per unit.`],
        ['Water & Wi-Fi:', 'Included as part of the PG amenities.'],
        ['Grace Period:', `${agr.financial.gracePeriodDays || 3} days grace period. Late fee applies for delayed payments.`]
      ];

      financeRows.forEach(([lbl, val]) => {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(pad, y - 18, width - pad * 2, 34);
        drawLine(pad, y + 16, width - pad * 2 + pad, y + 16, '#F1F5F9', 1);
        drawText(lbl, pad + 12, y + 4, 'bold 15px sans-serif', '#334155');
        drawText(val, pad + 240, y + 4, '15px sans-serif', '#0F172A');
        y += 40;
      });
      y += 24;

      // Section 3: Period of Stay & Notice
      drawText('3. PERIOD OF STAY, LOCK-IN & NOTICE', pad, y, '800 18px sans-serif', '#0F172A');
      y += 12;
      drawLine(pad, y, width - pad, y, '#CBD5E1', 1.5);
      y += 30;

      const stayTerms = [
        `Commencement Date: Tenancy commences on ${formatDateDisplay(agr.stayTerms.startDate)}${agr.stayTerms.endDate ? ` and valid until ${formatDateDisplay(agr.stayTerms.endDate)}.` : ' on an ongoing monthly renewal basis.'}`,
        `Lock-in Period: ${agr.stayTerms.lockInMonths > 0 ? `Contractual lock-in period of ${agr.stayTerms.lockInMonths} months applies.` : 'No mandatory lock-in period applies.'}`,
        `Notice Period: Minimum ${agr.stayTerms.noticeDaysTenant || 30} days prior written notice required before vacating.`
      ];

      stayTerms.forEach(t => {
        y = drawWrappedText(`•  ${t}`, pad + 10, y, width - pad * 2 - 20, 24, '15px sans-serif', '#334155');
        y += 6;
      });

      // Page 1 Footer
      const footerY = height - 50;
      drawLine(pad, footerY - 16, width - pad, footerY - 16, '#E2E8F0', 1);
      drawText(`Powered by Rentora · Agreement ID: ${agr.id} (v${agr.version || 1})`, pad, footerY, '13px sans-serif', '#94A3B8');
      drawText('Page 1 of 2', width - pad, footerY, 'bold 13px sans-serif', '#94A3B8', 'right');

    } else {
      // ════════ PAGE 2 RENDERING ════════
      // Mini Header
      const logoSrc2 = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';
      const lSize2 = 30;
      let logoDrawn2 = false;
      let miniTextX = pad;
      if (logoSrc2 && typeof ImageUtils !== 'undefined' && ImageUtils.loadCleanImage) {
        try {
          const lImg2 = await ImageUtils.loadCleanImage(logoSrc2);
          if (lImg2 && lImg2.naturalWidth > 0) {
            ctx.save();
            if (ctx.roundRect) ctx.roundRect(pad, y - 6, lSize2, lSize2, 6);
            else ctx.rect(pad, y - 6, lSize2, lSize2);
            ctx.clip();
            ctx.drawImage(lImg2, pad, y - 6, lSize2, lSize2);
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = '#0284C7';
            ctx.lineWidth = 1.5;
            if (ctx.roundRect) ctx.roundRect(pad, y - 6, lSize2, lSize2, 6);
            else ctx.rect(pad, y - 6, lSize2, lSize2);
            ctx.stroke();
            ctx.restore();

            miniTextX = pad + lSize2 + 10;
            logoDrawn2 = true;
          }
        } catch (e) {}
      }
      if (!logoDrawn2) {
        ctx.save();
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🏠', pad, y + 16);
        ctx.restore();
        miniTextX = pad + 32;
      }
      drawText(`${agr.pg.name || prop.name || 'PG Management'} — RENT AGREEMENT`, miniTextX, y + 14, 'bold 16px sans-serif', '#0F172A');
      drawText(`ID: ${agr.id} (v${agr.version || 1})`, width - pad, y + 14, 'bold 14px sans-serif', '#0284C7', 'right');
      y += 24;
      drawLine(pad, y, width - pad, y, '#CBD5E1', 1.5);
      y += 36;

      // Section 4: House Rules & Code of Conduct
      drawText('4. PG POLICIES, CODE OF CONDUCT & DISCIPLINE', pad, y, '800 18px sans-serif', '#0F172A');
      y += 12;
      drawLine(pad, y, width - pad, y, '#CBD5E1', 1.5);
      y += 30;

      const rulesList = [
        `Visitors & Friends: ${agr.rules?.visitorsAllowed ? (agr.rules?.friendsInRoom ? 'Daytime visitors & friends are allowed in rooms during permissible hours.' : 'Visitors are allowed only in designated common areas; not inside private rooms.') : 'Outside visitors are strictly prohibited inside the premises.'}`,
        `Overnight Guests: ${agr.rules?.overnightGuests ? 'Overnight guests require prior approval from PG management.' : 'Overnight guests are strictly prohibited.'}`,
        `Quiet Hours: ${agr.rules?.quietHours ? 'Quiet hours are observed strictly between 10:00 PM and 7:00 AM. Loud music and disturbance are disallowed.' : 'Residents are requested to maintain general discipline.'}`,
        `Substance Policy: ${agr.rules?.smokingProhibited ? 'Smoking is strictly prohibited throughout the property.' : 'Smoking restricted to designated open areas.'} ${agr.rules?.alcoholProhibited ? 'Alcohol consumption or storage is strictly prohibited.' : ''}`,
        `Room Cooking: ${agr.rules?.cookingAllowed ? 'Light cooking permitted in rooms with designated appliances.' : 'Cooking inside rooms is strictly prohibited for electrical safety.'}`,
        `Gate Curfew: ${agr.rules?.gateTimings ? 'Main entry gate is locked between 10:30 PM and 6:00 AM.' : 'Late entry permitted subject to register sign-in.'}`,
        `Cleanliness & Inspection: ${agr.rules?.cleanlinessAudit ? 'Periodic cleanliness checks and maintenance inspections are conducted with reasonable notice.' : 'Tenant must keep accommodation in hygienic condition.'}`,
        `Deposit Settlement: ${agr.rules?.securityDepositDeductions ? 'Repair costs for any damages to room furniture, walls, or keys will be adjusted from the security deposit.' : 'Standard deposit refund procedure applies upon vacating.'}`
      ];

      if (agr.customRules && agr.customRules.length > 0) {
        agr.customRules.forEach(cr => {
          rulesList.push(`${cr.name}: ${cr.description}`);
        });
      }

      rulesList.forEach(r => {
        y = drawWrappedText(`•  ${r}`, pad + 10, y, width - pad * 2 - 20, 24, '15px sans-serif', '#334155');
        y += 8;
      });

      y += 24;

      // Section 5: Acknowledgement & Signatures
      drawText('5. ACKNOWLEDGEMENT & DIGITAL SIGNATURES', pad, y, '800 18px sans-serif', '#0F172A');
      y += 12;
      drawLine(pad, y, width - pad, y, '#CBD5E1', 1.5);
      y += 26;

      drawText('Both parties have read, understood, and agreed to all the terms, policies, financial schedule, and code of conduct stated in this Agreement.', pad, y, '14px sans-serif', '#475569');
      y += 36;

      // Signature Boxes
      const sigBoxW = (width - pad * 2 - 40) / 2;
      const sigBoxH = 210;

      // Load Signatures as Images
      async function loadImage(src) {
        if (!src) return null;
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      }

      const tenantImg = await loadImage(agr.signatures?.tenantSignature);
      const ownerImg = await loadImage(agr.signatures?.ownerSignature);

      // Tenant Signature Box
      ctx.fillStyle = agr.signatures?.tenantSignature ? '#F0FDF4' : '#F8FAFC';
      ctx.fillRect(pad, y, sigBoxW, sigBoxH);
      ctx.strokeStyle = agr.signatures?.tenantSignature ? '#86EFAC' : '#CBD5E1';
      ctx.lineWidth = 1.5;
      if (!agr.signatures?.tenantSignature) {
        ctx.setLineDash([6, 4]);
      }
      ctx.strokeRect(pad, y, sigBoxW, sigBoxH);
      ctx.setLineDash([]);

      if (tenantImg) {
        drawText('✓ CONFIRMED SIGNATURE', pad + sigBoxW / 2, y + 20, 'bold 11px sans-serif', '#16A34A', 'center');
        const aspect = tenantImg.width / tenantImg.height;
        let imgW = 160;
        let imgH = imgW / aspect;
        if (imgH > 60) {
          imgH = 60;
          imgW = imgH * aspect;
        }
        ctx.drawImage(tenantImg, pad + (sigBoxW - imgW) / 2, y + 28, imgW, imgH);
      } else {
        drawText('⏳ Pending Tenant Signature', pad + sigBoxW / 2, y + 60, 'italic 14px sans-serif', '#94A3B8', 'center');
      }

      drawLine(pad + 30, y + 105, pad + sigBoxW - 30, y + 105, '#CBD5E1', 1);
      drawText(agr.tenant.name, pad + sigBoxW / 2, y + 130, 'bold 16px sans-serif', '#0F172A', 'center');
      const tenantSigMethodText = agr.signatures?.tenantSignatureMethod === 'UPLOADED' ? 'Uploaded Signature' : 'Digital Sign';
      drawText(`Tenant (Resident) · ${tenantSigMethodText}`, pad + sigBoxW / 2, y + 155, '13px sans-serif', '#64748B', 'center');
      drawText(agr.signatures?.tenantSignedAt ? formatDateDisplay(agr.signatures.tenantSignedAt) : 'Pending Confirmation', pad + sigBoxW / 2, y + 178, '12px sans-serif', '#94A3B8', 'center');

      // Owner Signature Box
      const ownerX = pad + sigBoxW + 40;
      ctx.fillStyle = agr.signatures?.ownerSignature ? '#F0FDF4' : '#F8FAFC';
      ctx.fillRect(ownerX, y, sigBoxW, sigBoxH);
      ctx.strokeStyle = agr.signatures?.ownerSignature ? '#86EFAC' : '#CBD5E1';
      ctx.lineWidth = 1.5;
      if (!agr.signatures?.ownerSignature) {
        ctx.setLineDash([6, 4]);
      }
      ctx.strokeRect(ownerX, y, sigBoxW, sigBoxH);
      ctx.setLineDash([]);

      if (ownerImg) {
        drawText('✓ CONFIRMED SIGNATURE', ownerX + sigBoxW / 2, y + 20, 'bold 11px sans-serif', '#16A34A', 'center');
        const aspect = ownerImg.width / ownerImg.height;
        let imgW = 160;
        let imgH = imgW / aspect;
        if (imgH > 60) {
          imgH = 60;
          imgW = imgH * aspect;
        }
        ctx.drawImage(ownerImg, ownerX + (sigBoxW - imgW) / 2, y + 28, imgW, imgH);
      } else {
        drawText('⏳ Pending PG Management Signature', ownerX + sigBoxW / 2, y + 60, 'italic 14px sans-serif', '#94A3B8', 'center');
      }

      drawLine(ownerX + 30, y + 105, ownerX + sigBoxW - 30, y + 105, '#CBD5E1', 1);
      drawText(agr.pg.owner || prop.owner || 'Owner', ownerX + sigBoxW / 2, y + 130, 'bold 16px sans-serif', '#0F172A', 'center');
      drawText(`PG Management (${agr.pg.name || prop.name})`, ownerX + sigBoxW / 2, y + 155, '13px sans-serif', '#64748B', 'center');
      drawText(agr.signatures?.ownerSignedAt ? formatDateDisplay(agr.signatures.ownerSignedAt) : 'Pending Confirmation', ownerX + sigBoxW / 2, y + 178, '12px sans-serif', '#94A3B8', 'center');

      // Page 2 Footer
      const footerY = height - 50;
      drawLine(pad, footerY - 16, width - pad, footerY - 16, '#E2E8F0', 1);
      drawText(`Powered by Rentora · Agreement ID: ${agr.id} (v${agr.version || 1})`, pad, footerY, '13px sans-serif', '#94A3B8');
      drawText('Page 2 of 2', width - pad, footerY, 'bold 13px sans-serif', '#94A3B8', 'right');
    }

    return canvas;
  },

  // Converts canvas to JPEG bytes Uint8Array
  _canvasToJpegBytes(canvas, quality = 0.92) {
    return new Promise((resolve) => {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(this._dataUrlToUint8Array(canvas.toDataURL('image/jpeg', quality)));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(new Uint8Array(reader.result));
          };
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', quality);
      } else {
        resolve(this._dataUrlToUint8Array(canvas.toDataURL('image/jpeg', quality)));
      }
    });
  },

  _dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  // Generates genuine binary 2-page A4 PDF file directly in pure JS (standard ISO 32000-1 compatible)
  _buildPdfFromJpegs(jpegByteArrays, imgW, imgH) {
    const parts = [];
    const offsets = [];
    let currentOffset = 0;
    const enc = new TextEncoder();

    function addString(str) {
      const bytes = enc.encode(str);
      parts.push(bytes);
      currentOffset += bytes.length;
    }

    function addBytes(bytes) {
      parts.push(bytes);
      currentOffset += bytes.length;
    }

    // Header
    addString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    // Object 1: Catalog
    offsets[1] = currentOffset;
    addString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Object 2: Pages
    offsets[2] = currentOffset;
    const numPages = jpegByteArrays.length;
    const pageRefs = [];
    for (let i = 0; i < numPages; i++) {
      pageRefs.push((3 + i * 3) + ' 0 R');
    }
    addString('2 0 obj\n<< /Type /Pages /Kids [' + pageRefs.join(' ') + '] /Count ' + numPages + ' >>\nendobj\n');

    const a4W = 595.28;
    const a4H = 841.89;

    for (let i = 0; i < numPages; i++) {
      const pageObjNum = 3 + i * 3;
      const contentObjNum = 4 + i * 3;
      const imgObjNum = 5 + i * 3;
      const imgName = 'Im' + (i + 1);

      // Page object
      offsets[pageObjNum] = currentOffset;
      addString(pageObjNum + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + a4W + ' ' + a4H + '] /Contents ' + contentObjNum + ' 0 R /Resources << /XObject << /' + imgName + ' ' + imgObjNum + ' 0 R >> >> >>\nendobj\n');

      // Content stream
      const contentStream = 'q\n' + a4W.toFixed(2) + ' 0 0 ' + a4H.toFixed(2) + ' 0 0 cm\n/' + imgName + ' Do\nQ\n';
      offsets[contentObjNum] = currentOffset;
      addString(contentObjNum + ' 0 obj\n<< /Length ' + contentStream.length + ' >>\nstream\n' + contentStream + 'endstream\nendobj\n');

      // Image XObject
      const jpegBytes = jpegByteArrays[i];
      offsets[imgObjNum] = currentOffset;
      addString(imgObjNum + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + imgW + ' /Height ' + imgH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + ' >>\nstream\n');
      addBytes(jpegBytes);
      addString('\nendstream\nendobj\n');
    }

    // Xref table
    const totalObjs = 2 + numPages * 3;
    const xrefOffset = currentOffset;
    addString('xref\n0 ' + (totalObjs + 1) + '\n');
    addString('0000000000 65535 f \n');
    for (let i = 1; i <= totalObjs; i++) {
      const offStr = String(offsets[i]).padStart(10, '0');
      addString(offStr + ' 00000 n \n');
    }

    // Trailer
    addString('trailer\n<< /Size ' + (totalObjs + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n');

    return new Blob(parts, { type: 'application/pdf' });
  },

  // Generates genuine binary 2-page A4 PDF file
  async downloadAgreementPDF(agrId) {
    const agr = DB.getAgreementById(agrId);
    if (!agr) return;

    showToast('⏳ Generating official 2-page PDF agreement...', 'info');

    try {
      const canvas1 = await this.renderPageCanvas(agr, 1);
      const canvas2 = await this.renderPageCanvas(agr, 2);

      const jpeg1 = await this._canvasToJpegBytes(canvas1, 0.92);
      const jpeg2 = await this._canvasToJpegBytes(canvas2, 0.92);

      const pdfBlob = this._buildPdfFromJpegs([jpeg1, jpeg2], canvas1.width, canvas1.height);

      const safeTenantName = (agr.tenant?.name || 'Tenant').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Rent_Agreement_${safeTenantName}_${agr.id}.pdf`;

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      if (typeof SoundFX !== 'undefined' && SoundFX.buttonClick) {
        SoundFX.buttonClick();
      }
      showToast(`📥 PDF Agreement downloaded: ${fileName}`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('❌ Failed to generate PDF agreement. Please try again.', 'error');
    }
  },

  // Backward-compatible alias
  downloadPDF(agrId) {
    this.downloadAgreementPDF(agrId);
  },

  // High-Resolution PNG Generator for Individual Pages (Page 1 or Page 2)
  async downloadPagePNG(agrId, pageNum) {
    const agr = DB.getAgreementById(agrId);
    if (!agr) return;

    showToast(`⏳ Generating high-resolution image for Page ${pageNum}...`, 'info');

    try {
      const canvas = await this.renderPageCanvas(agr, pageNum);
      const safeTenantName = (agr.tenant?.name || 'Tenant').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Rent_Agreement_${safeTenantName}_${agr.id}_Page-${pageNum}.png`;

      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (typeof SoundFX !== 'undefined' && SoundFX.buttonClick) {
        SoundFX.buttonClick();
      }
      showToast(`📥 Downloaded: ${fileName}`, 'success');
    } catch (err) {
      console.error('PNG generation error:', err);
      showToast(`❌ Failed to generate Page ${pageNum} image`, 'error');
    }
  },

  generateAgreementBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  },

  async shareAgreement(agrId, options = {}) {
    const agr = DB.getAgreementById(agrId);
    if (!agr) return showToast('Agreement not found', 'error');

    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const rentAmt = formatCurrency(agr.financial?.monthlyRent || 0, cur);
    const depAmt = formatCurrency(agr.financial?.securityDeposit || 0, cur);
    const roomStr = agr.accommodation?.roomName ? `${agr.accommodation.roomName}${agr.accommodation.bedNumber ? ` · Bed ${agr.accommodation.bedNumber}` : ''}` : 'Room assigned';
    const startStr = agr.stayTerms?.startDate ? formatDateDisplay(agr.stayTerms.startDate) : 'N/A';

    const messageText = `📄 *RESIDENTIAL RENTAL AGREEMENT*\n\n*${agr.pg.name || prop.name || 'PG Management'}*\n\nDear ${agr.tenant.name},\n\nHere is your official PG Rental Agreement.\n\n📋 *Agreement ID:* ${agr.id} (v${agr.version || 1})\n📍 *Accommodation:* ${roomStr}\n💰 *Monthly Rent:* ${rentAmt}\n🛡️ *Security Deposit:* ${depAmt}\n📅 *Start Date:* ${startStr}\n📊 *Status:* ${agr.status}\n\nThank you!\n${agr.pg.owner || prop.owner || 'PG Management'}\n${agr.pg.name || prop.name || 'PG Management'}\n\n_Powered by Rentora_`;

    const cleanPhone = (agr.tenant?.phone || '').replace(/\D/g, '');
    const cfg = (typeof DB !== 'undefined' && DB.getWAConfig) ? DB.getWAConfig() : { countryCode: '91' };
    const fullPhone = cleanPhone ? (cleanPhone.startsWith(cfg.countryCode) ? cleanPhone : cfg.countryCode + cleanPhone) : '';

    const pageNum = options.page || 1;

    if (typeof SoundFX !== 'undefined' && SoundFX.whatsappSend) {
      SoundFX.whatsappSend();
    }

    try {
      showToast(`⏳ Preparing agreement image (Page ${pageNum})...`, 'info');
      const canvas = await this.renderPageCanvas(agr, pageNum);
      const blob = await this.generateAgreementBlob(canvas);
      if (!blob) {
        throw new Error('Canvas blob generation failed');
      }

      const safeTenantName = (agr.tenant?.name || 'Tenant').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Rent_Agreement_${safeTenantName}_${agr.id}_Page-${pageNum}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 1. Native Web Share API (Mobile Android & iOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Rent Agreement - ${agr.tenant.name}`,
            text: messageText,
            files: [file]
          });
          showToast('🟢 Agreement image & details shared via WhatsApp!', 'success');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('Native share failed, using fallback:', err);
        }
      }

      // 2. Fallback: auto-download PNG + open WhatsApp
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      const waUrl = (!options.chooseContact && fullPhone)
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
      showToast('📲 WhatsApp opened! Agreement image saved to downloads. Please attach the image to your chat.', 'success');

    } catch (e) {
      console.error('Agreement share error:', e);
      const waUrl = (!options.chooseContact && fullPhone)
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
      showToast('📲 Opening WhatsApp with agreement details...', 'success');
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 6. PG POLICY BUILDER (AGREEMENT SETTINGS)
  // ═══════════════════════════════════════════════════════════
  openPolicyBuilder() {
    const policy = DB.getAgreementPolicy() || this.getDefaultPolicyBlueprint();
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';

    showModal('⚙️ PG Agreement Policy Builder', `
      <div class="agr-form-scroller">
        <div class="fs-13 color-secondary mb-12">
          Configure default rules and financial terms once. These defaults are automatically loaded whenever creating a new tenant agreement.
        </div>

        <!-- Financial Defaults -->
        <div class="agr-section-card">
          <div class="agr-sec-title">💰 Financial Defaults</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Default Rent (${cur})</label>
              <input type="number" class="form-input" id="pb-rent" value="${policy.financial?.monthlyRent || prop.defaultBedPrice || 6000}">
            </div>
            <div class="form-group">
              <label class="form-label">Default Deposit (${cur})</label>
              <input type="number" class="form-input" id="pb-deposit" value="${policy.financial?.securityDeposit || 12000}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Rent Due Day (1-28)</label>
              <input type="number" class="form-input" id="pb-due-day" value="${policy.financial?.dueDay || 5}">
            </div>
            <div class="form-group">
              <label class="form-label">Grace Period (Days)</label>
              <input type="number" class="form-input" id="pb-grace-days" value="${policy.financial?.gracePeriodDays || 3}">
            </div>
          </div>
        </div>

        <!-- Stay Terms Defaults -->
        <div class="agr-section-card">
          <div class="agr-sec-title">📅 Stay Duration Defaults</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Default Lock-in</label>
              <select class="form-input" id="pb-lockin">
                <option value="0" ${policy.stayTerms?.lockInMonths == 0 ? 'selected' : ''}>No lock-in</option>
                <option value="1" ${policy.stayTerms?.lockInMonths == 1 ? 'selected' : ''}>1 Month</option>
                <option value="2" ${policy.stayTerms?.lockInMonths == 2 ? 'selected' : ''}>2 Months</option>
                <option value="3" ${policy.stayTerms?.lockInMonths == 3 ? 'selected' : ''}>3 Months</option>
                <option value="6" ${policy.stayTerms?.lockInMonths == 6 ? 'selected' : ''}>6 Months</option>
                <option value="12" ${policy.stayTerms?.lockInMonths == 12 ? 'selected' : ''}>12 Months</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Default Notice Period</label>
              <select class="form-input" id="pb-notice">
                <option value="7" ${policy.stayTerms?.noticeDaysTenant == 7 ? 'selected' : ''}>7 Days</option>
                <option value="15" ${policy.stayTerms?.noticeDaysTenant == 15 ? 'selected' : ''}>15 Days</option>
                <option value="30" ${policy.stayTerms?.noticeDaysTenant == 30 ? 'selected' : ''}>30 Days</option>
                <option value="60" ${policy.stayTerms?.noticeDaysTenant == 60 ? 'selected' : ''}>60 Days</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Rules Toggles -->
        <div class="agr-section-card">
          <div class="agr-sec-title">📋 Default House Rules</div>
          ${this.renderRuleToggles(policy.rules || this.getDefaultPolicyBlueprint().rules)}
        </div>

        <div class="form-actions mt-16">
          <button type="button" class="btn btn-ghost btn-full" onclick="Agreements.openMainScreen()">Back</button>
          <button type="button" class="btn btn-primary btn-full" onclick="Agreements.savePolicyBuilder()">Save Default Policy</button>
        </div>
      </div>
    `);
  },

  savePolicyBuilder() {
    const policy = {
      financial: {
        monthlyRent: parseFloat(document.getElementById('pb-rent')?.value) || 6000,
        securityDeposit: parseFloat(document.getElementById('pb-deposit')?.value) || 12000,
        dueDay: parseInt(document.getElementById('pb-due-day')?.value) || 5,
        gracePeriodDays: parseInt(document.getElementById('pb-grace-days')?.value) || 3,
        electricityIncluded: false,
        electricityRate: 8,
        waterIncluded: true,
        wifiIncluded: true
      },
      stayTerms: {
        lockInMonths: parseInt(document.getElementById('pb-lockin')?.value) || 3,
        noticeDaysTenant: parseInt(document.getElementById('pb-notice')?.value) || 30,
        noticeDaysOwner: 30
      },
      rules: {},
      customRules: []
    };

    const keys = [
      'visitorsAllowed', 'friendsInRoom', 'overnightGuests', 'quietHours',
      'smokingProhibited', 'alcoholProhibited', 'petsAllowed', 'cookingAllowed',
      'gateTimings', 'cleanlinessAudit', 'securityDepositDeductions'
    ];
    keys.forEach(k => {
      const chk = document.getElementById(`rule-${k}`);
      if (chk) policy.rules[k] = chk.checked;
    });

    DB.saveAgreementPolicy(policy);
    showToast('✅ Default PG Policy saved successfully!', 'success');
    this.openMainScreen();
  },

  getDefaultPolicyBlueprint() {
    const prop = DB.getProperty();
    return {
      financial: {
        monthlyRent: prop.defaultBedPrice || 6000,
        securityDeposit: (prop.defaultBedPrice || 6000) * 2,
        dueDay: 5,
        gracePeriodDays: 3,
        electricityIncluded: false,
        electricityRate: prop.electricityRate || 8,
        waterIncluded: true,
        wifiIncluded: true
      },
      stayTerms: {
        lockInMonths: 3,
        noticeDaysTenant: 30,
        noticeDaysOwner: 30
      },
      rules: {
        visitorsAllowed: true,
        friendsInRoom: false,
        overnightGuests: false,
        quietHours: true,
        smokingProhibited: true,
        alcoholProhibited: true,
        petsAllowed: false,
        cookingAllowed: false,
        gateTimings: true,
        cleanlinessAudit: true,
        securityDepositDeductions: true
      },
      customRules: []
    };
  },

  // ═══════════════════════════════════════════════════════════
  // 7. OWNER SAVED SIGNATURE SETTINGS
  // ═══════════════════════════════════════════════════════════
  openOwnerSignatureSettings() {
    const saved = DB.getOwnerSignature();

    showModal('✍️ Owner Digital Signature', `
      <div class="agr-sig-settings">
        <div class="fs-13 color-secondary mb-12">
          Save your official signature once. When preparing rental agreements, you can apply it with a single tap after confirmation.
        </div>

        ${saved ? `
          <div class="card mb-12 text-center" style="padding:16px;background:var(--bg-input)">
            <div class="fs-12 color-muted mb-8">CURRENT SAVED SIGNATURE</div>
            <img src="${saved}" style="max-height:80px;object-fit:contain;background:white;padding:6px;border-radius:8px;border:1px solid var(--border)">
            <div class="mt-12">
              <button class="btn btn-ghost btn-sm" style="color:var(--accent-red)" onclick="Agreements.deleteSavedOwnerSignature()">
                🗑️ Remove Saved Signature
              </button>
            </div>
          </div>
        ` : `
          <div class="color-muted fs-12 mb-8">Draw your signature in the box below:</div>
          <div class="agr-canvas-wrapper">
            <canvas id="saved-owner-canvas" class="agr-canvas" width="400" height="160"></canvas>
          </div>
          <div class="agr-canvas-actions">
            <button type="button" class="btn btn-ghost btn-sm" onclick="Agreements.clearCanvas('saved-owner-canvas')">Clear</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="Agreements.saveOwnerSignatureFromSettings()">Save Signature</button>
          </div>
        `}

        <div class="form-actions mt-12">
          <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
        </div>
      </div>
    `);

    if (!saved) {
      setTimeout(() => {
        this.initSignatureCanvas('saved-owner-canvas');
      }, 60);
    }
  },

  saveOwnerSignatureFromSettings() {
    const canvas = document.getElementById('saved-owner-canvas');
    if (!canvas || !canvas._hasDrawn || !canvas._hasDrawn()) {
      showToast('Please draw your signature before saving', 'error');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    DB.saveOwnerSignature(dataUrl);
    showToast('✅ Owner signature saved successfully!', 'success');
    this.openOwnerSignatureSettings();
  },

  deleteSavedOwnerSignature() {
    DB.saveOwnerSignature(null);
    showToast('🗑️ Saved signature removed', 'info');
    this.openOwnerSignatureSettings();
  }
};
