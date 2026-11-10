// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — TENANTS TAB
// ============================================================

const Tenants = {
  searchQuery: '',
  activeView: 'all', // 'all' | 'portal'

  render() {
    const tenants = DB.getTenants();
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const currentMonth = getCurrentMonth();

    const filtered = tenants.filter(t => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      const info = DB.getBedInfo(t.bedId);
      const roomName = info?.room?.name?.toLowerCase() || '';
      return t.name.toLowerCase().includes(q) ||
             t.phone.includes(q) ||
             roomName.includes(q);
    });

    const cards = filtered.map(t => {
      const paid = DB.isPaid(t.id, currentMonth);
      const info = DB.getBedInfo(t.bedId);
      const location = info ? `${info.room?.name || ''} · Bed ${info.bed?.number || ''}` : 'Unknown';
      const kycTag = t.mobileVerified 
        ? `<span style="color:var(--accent-green);font-size:11px;font-weight:700">✅ Mobile Verified</span>` 
        : (t.aadhaarVerified 
          ? `<span style="color:var(--accent-green);font-size:11px;font-weight:700">${t.aadhaarMethod === 'DIGILOCKER' ? '🏛️ DigiLocker Verified' : '✓ UIDAI QR Verified'}</span>` 
          : '');

      return `
        <div class="tenant-card" onclick="Tenants.showProfile('${t.id}')">
          <div class="tenant-avatar" style="background:${getAvatarColor(t.name)}">${getInitials(t.name)}</div>
          <div class="tenant-info">
            <div class="tenant-name">${t.name}</div>
            <div class="tenant-meta">📍 ${location} · 📱 ${t.phone}</div>
            ${kycTag ? `<div class="tenant-meta">${kycTag}</div>` : ''}
          </div>
          <div class="tenant-status">
            <span class="badge ${paid ? 'green' : 'red'}">${paid ? '✅ Paid' : '❌ Due'}</span>
            <span class="tenant-amount ${paid ? 'paid' : 'unpaid'}">${formatCurrency(t.rent, cur)}</span>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No tenants found</div></div>`;

    const html = `
      <div class="scroll-area">
        <!-- Sub Tabs -->
        <div class="sub-tabs">
          <button class="sub-tab ${this.activeView === 'all' ? 'active' : ''}" onclick="Tenants.setView('all')">👥 All Tenants</button>
          <button class="sub-tab ${this.activeView === 'portal' ? 'active' : ''}" onclick="Tenants.setView('portal')">🔍 Tenant Portal</button>
        </div>

        ${this.activeView === 'portal' ? this.renderPortal() : `
          <!-- Search -->
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Search by name, phone, room..." id="tenant-search"
              value="${this.searchQuery}" oninput="Tenants.search(this.value)">
          </div>

          <!-- Summary -->
          <div style="display:flex;gap:8px;align-items:center;padding:4px 0">
            <span class="badge blue">${tenants.length} Total</span>
            <span class="badge green">${tenants.filter(t => DB.isPaid(t.id, currentMonth)).length} Paid</span>
            <span class="badge red">${tenants.filter(t => !DB.isPaid(t.id, currentMonth)).length} Unpaid</span>
          </div>

          <!-- Tenant List -->
          <div id="tenant-list">${cards}</div>
        `}
      </div>
    `;
    document.getElementById('tab-tenants').innerHTML = html;
  },

  setView(view) {
    this.activeView = view;
    this.render();
  },

  search(q) {
    this.searchQuery = q;
    const tenants = DB.getTenants();
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const currentMonth = getCurrentMonth();
    const filtered = tenants.filter(t => {
      if (!q) return true;
      const query = q.toLowerCase();
      const info = DB.getBedInfo(t.bedId);
      const roomName = info?.room?.name?.toLowerCase() || '';
      return t.name.toLowerCase().includes(query) || 
             t.phone.includes(query) || 
             roomName.includes(query);
    });
    const cards = filtered.map(t => {
      const paid = DB.isPaid(t.id, currentMonth);
      const info = DB.getBedInfo(t.bedId);
      const location = info ? `${info.room?.name || ''} · Bed ${info.bed?.number || ''}` : '';
      const kycTag = t.mobileVerified 
        ? `<span style="color:var(--accent-green);font-size:11px;font-weight:700">✅ Mobile Verified</span>` 
        : (t.aadhaarVerified 
          ? `<span style="color:var(--accent-green);font-size:11px;font-weight:700">${t.aadhaarMethod === 'DIGILOCKER' ? '🏛️ DigiLocker Verified' : '✓ UIDAI QR Verified'}</span>` 
          : '');

      return `<div class="tenant-card" onclick="Tenants.showProfile('${t.id}')">
        <div class="tenant-avatar" style="background:${getAvatarColor(t.name)}">${getInitials(t.name)}</div>
        <div class="tenant-info">
          <div class="tenant-name">${t.name}</div>
          <div class="tenant-meta">📍 ${location} · 📱 ${t.phone}</div>
          ${kycTag ? `<div class="tenant-meta">${kycTag}</div>` : ''}
        </div>
        <div class="tenant-status">
          <span class="badge ${paid ? 'green' : 'red'}">${paid ? '✅ Paid' : '❌ Due'}</span>
          <span class="tenant-amount ${paid ? 'paid' : 'unpaid'}">${formatCurrency(t.rent, cur)}</span>
        </div>
      </div>`;
    }).join('') || `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No tenants found</div></div>`;
    document.getElementById('tenant-list').innerHTML = cards;
  },

  renderPortal() {
    return `
      <div class="card">
        <div style="text-align:center;padding:12px 0 20px">
          <div style="font-size:40px;margin-bottom:8px">🔍</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:4px">Tenant Self-Search Portal</div>
          <div class="color-secondary fs-13">Tenants can check their own payment status</div>
        </div>
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Enter tenant name or phone..." id="portal-search" oninput="Tenants.portalSearch(this.value)">
        </div>
        <div id="portal-result" style="margin-top:16px"></div>
      </div>`;
  },

  portalSearch(q) {
    const result = document.getElementById('portal-result');
    if (!q || q.length < 2) { result.innerHTML = ''; return; }
    const tenants = DB.getAllTenants();
    const found = tenants.filter(t => t.active !== false &&
      (t.name.toLowerCase().includes(q.toLowerCase()) || t.phone.includes(q)));

    if (found.length === 0) {
      result.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-icon">😔</div><div class="empty-title">Tenant not found</div></div>`;
      return;
    }

    const prop = DB.getProperty();
    const cur = prop.currency;
    result.innerHTML = found.map(t => {
      const info = DB.getBedInfo(t.bedId);
      const payments = DB.getPaymentsByTenant(t.id);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const currentMonth = getCurrentMonth();
      const paid = DB.isPaid(t.id, currentMonth);

      return `<div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div class="tenant-avatar" style="background:${getAvatarColor(t.name)};width:52px;height:52px;font-size:20px">${getInitials(t.name)}</div>
          <div>
            <div style="font-size:17px;font-weight:700">${t.name}</div>
            <div class="color-secondary fs-13">📍 ${info?.room?.name || ''}, Bed ${info?.bed?.number || ''} · ${info?.floor?.name || ''}</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="payment-item" style="padding:8px 0;border:none"><span class="color-secondary">Phone</span><strong>📱 ${t.phone}</strong></div>
        <div class="payment-item" style="padding:8px 0;border:none"><span class="color-secondary">Monthly Rent</span><strong>${formatCurrency(t.rent, cur)}</strong></div>
        <div class="payment-item" style="padding:8px 0;border:none"><span class="color-secondary">Security Deposit</span><strong>${formatCurrency(t.deposit, cur)}</strong></div>
        <div class="payment-item" style="padding:8px 0;border:none"><span class="color-secondary">Total Paid</span><strong class="color-green">${formatCurrency(totalPaid, cur)}</strong></div>
        <div class="payment-item" style="padding:8px 0;border:none"><span class="color-secondary">This Month</span><span class="badge ${paid ? 'green' : 'red'}">${paid ? '✅ Paid' : '❌ Pending'}</span></div>
        ${payments.length > 0 ? `
          <div class="divider"></div>
          <div class="card-title mb-8">Payment History</div>
          ${payments.slice(-5).reverse().map(p => `
            <div class="payment-item" style="padding:8px 0">
              <div><div class="fs-13 fw-700">${getMonthLabel(p.month)}</div><div class="fs-12 color-muted">${formatDateDisplay(p.date)} · ${p.method}</div></div>
              <div class="payment-amount">${formatCurrency(p.amount, cur)}</div>
            </div>`).join('')}
        ` : ''}
      </div>`;
    }).join('');
  },

  showProfile(tenantId) {
    const t = DB.getTenantById(tenantId);
    if (!t) return;
    const prop = DB.getProperty();
    const cur = prop.currency;
    const info = DB.getBedInfo(t.bedId);
    const payments = DB.getPaymentsByTenant(t.id);
    const currentMonth = getCurrentMonth();
    const paid = DB.isPaid(t.id, currentMonth);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    const profileMonths = DB.getTenantMonthList(t.id);
    let historyHtml = '';
    if (profileMonths.length === 0) {
      historyHtml = `<div class="color-muted fs-13 text-center" style="padding:12px">No payment history</div>`;
    } else {
      const renderPaymentRow = m => {
        const isPaid = DB.isPaid(t.id, m);
        if (isPaid) {
          const p = payments.find(pay => pay.month === m) || { month: m, amount: t.rent, date: '', method: 'UPI' };
          return `
            <div class="payment-item" style="padding:10px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div class="payment-name" style="display:flex; align-items:center; gap:6px; font-weight:700;">
                  ${getMonthLabel(m)}
                  <span class="badge green" style="font-size:10px; padding:2px 6px; border-radius:10px; font-weight:700;">✓ Collected</span>
                </div>
                <div class="payment-meta" style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${formatDateDisplay(p.date)} · ${p.method || 'Payment'}</div>
              </div>
              <div style="text-align:right;">
                <div class="payment-amount" style="color:var(--accent-green); font-weight:800; font-size:14px;">${formatCurrency(p.amount || t.rent, cur)}</div>
                <div style="display:flex; gap:4px; margin-top:4px; justify-content:flex-end;">
                  <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="Rent.shareInvoice('${t.id}','${p.id || m}')" title="Share invoice on WhatsApp">📲</button>
                  <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="Rent.downloadInvoice('${t.id}','${p.id || m}')" title="Download PDF">📄</button>
                </div>
              </div>
            </div>`;
        } else {
          return `
            <div class="payment-item" style="padding:10px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div class="payment-name" style="display:flex; align-items:center; gap:6px; font-weight:700;">
                  ${getMonthLabel(m)}
                  <span class="badge red" style="font-size:10px; padding:2px 6px; border-radius:10px;">❌ Pending</span>
                </div>
                <div class="payment-meta" style="font-size:11.5px; color:var(--accent-red); margin-top:2px;">Rent pending</div>
              </div>
              <div style="text-align:right;">
                <button class="btn btn-primary btn-sm" style="padding:3px 10px; font-size:11px; font-weight:600;" onclick="Rent.collectRent('${t.id}', '${m}')">Collect Rent</button>
              </div>
            </div>`;
        }
      };

      const MAX_PREVIEW = 3;
      const initialMonths = profileMonths.slice(0, MAX_PREVIEW);
      const remainingMonths = profileMonths.slice(MAX_PREVIEW);

      historyHtml = initialMonths.map(renderPaymentRow).join('');

      if (remainingMonths.length > 0) {
        historyHtml += `
          <div id="tenant-extra-payments" style="display:none">
            ${remainingMonths.map(renderPaymentRow).join('')}
          </div>
          <div style="padding:8px 0 2px 0; text-align:center;">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-toggle-payments" onclick="Tenants.toggleAllPayments()" style="width:100%; font-size:12px; font-weight:700; color:var(--accent-blue, #2563eb); border:1px dashed var(--border); border-radius:8px; padding:8px 12px; cursor:pointer;">
              ▼ Show all payments (${remainingMonths.length} more)
            </button>
          </div>`;
      }
    }

    // Build verification badge — supports both old Aadhaar tenants and new mobile-verified tenants
    let verificationRow = '';
    if (t.mobileVerified) {
      verificationRow = `
      <div class="card" style="margin-bottom:16px; background:var(--accent-green-light); border:1px solid rgba(34, 197, 94, 0.3); padding:12px 14px">
        <div style="display:flex; justify-content:space-between; align-items:flex-start">
          <div style="display:flex; align-items:center; gap:8px">
            <span style="font-size:22px">📱</span>
            <div>
              <div style="font-weight:700; font-size:13px; color:var(--accent-green-dark)">Mobile OTP Verified</div>
              <div style="font-size:11px; color:var(--text-secondary)">Phone: <strong>+91 ${t.phone}</strong></div>
              ${t.mobileVerifiedAt ? `<div style="font-size:10px; color:var(--text-secondary); margin-top:2px">Verified: ${new Date(t.mobileVerifiedAt).toLocaleDateString('en-IN')}</div>` : ''}
            </div>
          </div>
          <span class="badge green" style="font-size:10px">✅ Verified</span>
        </div>
      </div>`;
    } else if (t.aadhaarVerified) {
      // Backward compatibility with old Aadhaar-verified tenants
      const isDl = t.aadhaarMethod === 'DIGILOCKER';
      const methodIcon = isDl ? '🏛️' : '🛡️';
      const methodTitle = isDl ? 'DigiLocker Verified' : 'UIDAI QR Verified';
      verificationRow = `
      <div class="card" style="margin-bottom:16px; background:var(--accent-green-light); border:1px solid rgba(34, 197, 94, 0.3); padding:12px 14px">
        <div style="display:flex; justify-content:space-between; align-items:flex-start">
          <div style="display:flex; align-items:center; gap:8px">
            <span style="font-size:22px">${methodIcon}</span>
            <div>
              <div style="font-weight:700; font-size:13px; color:var(--accent-green-dark)">${methodTitle}</div>
              <div style="font-size:11px; color:var(--text-secondary)">Aadhaar: <strong>${t.aadhaarNumber || 'Verified'}</strong></div>
            </div>
          </div>
          <span class="badge green" style="font-size:10px">✅ ${isDl ? 'DigiLocker' : 'UIDAI'}</span>
        </div>
      </div>`;
    } else {
      verificationRow = `
      <div class="card" style="margin-bottom:16px; background:var(--bg-input); border:1px solid var(--border); padding:12px 14px">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <div style="font-size:12px; color:var(--text-secondary)">ID / Proof: <strong>${t.idProof || 'Not verified'}</strong></div>
        </div>
      </div>`;
    }

    // Verification badge for header area
    let headerBadge = '';
    if (t.mobileVerified) {
      headerBadge = `<span class="badge green" style="display:inline-flex">📱 Mobile Verified</span>`;
    } else if (t.aadhaarVerified) {
      const isDl = t.aadhaarMethod === 'DIGILOCKER';
      headerBadge = `<span class="badge green" style="display:inline-flex">${isDl ? '🏛️ DigiLocker' : '🛡️ UIDAI QR'}</span>`;
    }

    showModal(t.name, `
      <div style="text-align:center;margin-bottom:16px">
        <div class="tenant-avatar" style="background:${getAvatarColor(t.name)};width:72px;height:72px;font-size:28px;margin:0 auto 12px">${getInitials(t.name)}</div>
        <div class="color-secondary fs-13">📱 ${t.phone}</div>
        <div class="color-secondary fs-13">📍 ${info?.room?.name || ''}, Bed ${info?.bed?.number || ''}, ${info?.floor?.name || ''}</div>
        <div style="display:flex; justify-content:center; gap:6px; margin-top:8px">
          <span class="badge ${paid ? 'green' : 'red'}" style="display:inline-flex">${paid ? '✅ Paid this month' : '❌ Payment due'}</span>
          ${headerBadge}
        </div>
      </div>

      ${verificationRow}

      <div class="summary-grid" style="margin-bottom:16px">
        <div class="rev-stat"><div class="rev-stat-label">Monthly Rent</div><div class="rev-stat-value">${formatCurrency(t.rent, cur)}</div></div>
        <div class="rev-stat"><div class="rev-stat-label">Security Deposit</div><div class="rev-stat-value">${formatCurrency(t.deposit, cur)}</div></div>
        <div class="rev-stat"><div class="rev-stat-label">Total Paid</div><div class="rev-stat-value green">${formatCurrency(totalPaid, cur)}</div></div>
        <div class="rev-stat"><div class="rev-stat-label">Move-in Date</div><div class="rev-stat-value" style="font-size:13px">${formatDateDisplay(t.moveInDate)}</div></div>
      </div>

      <div class="card-title mb-8">Rent Agreement</div>
      <div id="tenant-agreement-section" style="margin-bottom:16px"></div>

      <div class="card-title mb-8">Uploaded Documents</div>
      <div class="card" id="tenant-docs-viewer" style="margin-bottom:16px;padding:12px;display:flex;gap:8px;overflow-x:auto;">
        <div class="color-muted fs-13">Loading documents...</div>
      </div>

      <div class="card-title mb-8">Payment History</div>
      <div class="card" style="margin-bottom:16px">${historyHtml}</div>

      <div class="flex gap-8">
        <button class="btn btn-outline btn-full" onclick="Tenants.showEditModal('${t.id}')">✏️ Edit</button>
        <button class="btn btn-whatsapp btn-full" onclick="WhatsApp._sendOne('${t.id}')">📲 Remind</button>
      </div>
      <div class="flex gap-8 mt-8">
        <button class="btn btn-ghost btn-full" onclick="App.navigate('rent')" style="font-size:13px">💰 Collect Rent</button>
        <button class="btn btn-danger btn-full" onclick="Tenants.deleteTenant('${t.id}')">🗑️ Remove</button>
      </div>
    `);

    setTimeout(async () => {
      // Load Rent Agreement for this tenant if available
      const agrContainer = document.getElementById('tenant-agreement-section');
      if (agrContainer && typeof Agreements !== 'undefined') {
        const agrs = DB.getAgreementsByTenant(t.id);
        if (agrs.length > 0) {
          const latestAgr = agrs[0];
          const statusBadge = Agreements.getStatusBadge(latestAgr.status);
          agrContainer.innerHTML = `
            <div class="card" style="padding:12px 14px;background:var(--bg-input);border:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-weight:700;font-size:13px">📄 ${latestAgr.id} (v${latestAgr.version || 1})</div>
                ${statusBadge}
              </div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
                Rent: <strong>${formatCurrency(latestAgr.financial.monthlyRent, prop.currency)}</strong> · Start: ${formatDateDisplay(latestAgr.stayTerms.startDate)}
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-outline btn-sm" onclick="Agreements.previewAgreement('${latestAgr.id}')">👁️ View / Download</button>
                <button class="btn btn-primary btn-sm" onclick="Agreements.downloadAgreementPDF('${latestAgr.id}')">📥 PDF</button>
              </div>
            </div>`;
        } else {
          agrContainer.innerHTML = `
            <div class="card" style="padding:12px 14px;background:var(--bg-input);border:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:12px;color:var(--text-muted)">No agreement created yet</div>
              <button class="btn btn-primary btn-sm" onclick="closeModal();Agreements.openCreateModal('${t.id}')">+ Create</button>
            </div>`;
        }
      }

      const viewer = document.getElementById('tenant-docs-viewer');
      if (!t.docs || t.docs.length === 0) {
        viewer.innerHTML = `<div class="color-muted fs-13">${t.idProof || 'No documents uploaded'}</div>`;
        return;
      }
      let html = '';
      for (const docId of t.docs) {
        const data = await ImageDB.get(docId);
        if (data) {
          html += `<img src="${data}" class="doc-thumb" style="width:80px;height:60px;object-fit:cover;border-radius:8px;cursor:pointer" onclick="DocUploadManager.viewFullscreen('${data}')">`;
        }
      }
      viewer.innerHTML = html || `<div class="color-muted fs-13">${t.idProof || 'No documents found'}</div>`;
    }, 50);
  },

  showEditModal(tenantId) {
    const t = DB.getTenantById(tenantId);
    if (!t) return;
    const prop = DB.getProperty();

    // Build verification notice — supports both old and new tenants
    let verificationNotice = '';
    if (t.mobileVerified) {
      verificationNotice = `<div style="display:flex; align-items:center; justify-content:space-between; background:var(--accent-green-light); padding:8px 12px; border-radius:var(--radius-md); margin-bottom:12px; font-size:12px; color:var(--accent-green-dark)">
           <span>📱 Mobile Verified: <strong>+91 ${t.phone}</strong></span>
           <span class="badge green" style="font-size:10px">Verified</span>
         </div>`;
    } else if (t.aadhaarVerified) {
      const isDl = t.aadhaarMethod === 'DIGILOCKER';
      verificationNotice = `<div style="display:flex; align-items:center; justify-content:space-between; background:var(--accent-green-light); padding:8px 12px; border-radius:var(--radius-md); margin-bottom:12px; font-size:12px; color:var(--accent-green-dark)">
           <span>${isDl ? '🏛️ DigiLocker' : '🛡️ UIDAI QR'} Verified: <strong>${t.aadhaarNumber}</strong></span>
           <span class="badge green" style="font-size:10px">Verified</span>
         </div>`;
    }

    showModal('✏️ Edit Tenant', `
      ${verificationNotice}
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input class="form-input" id="inp-et-name" value="${t.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Country & Mobile Number *</label>
        <div style="display:flex; align-items:center; gap:8px">
          <span style="background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:11px 12px; font-weight:700; font-size:14px; color:var(--text-primary); white-space:nowrap">🇮🇳 +91</span>
          <input class="form-input" id="inp-et-phone" value="${t.phone}" type="tel" maxlength="10" style="flex:1">
        </div>
      </div>
      <div id="doc-upload-container"></div>
      <div class="form-row mt-8">
        <div class="form-group"><label class="form-label">Rent (${prop.currency}/mo)</label>
          <input class="form-input" id="inp-et-rent" type="number" value="${t.rent}"></div>
        <div class="form-group"><label class="form-label">Deposit</label>
          <input class="form-input" id="inp-et-deposit" type="number" value="${t.deposit}"></div>
      </div>
      <div class="form-group"><label class="form-label">Move-in Date</label>
        <input class="form-input" id="inp-et-movein" type="date" value="${t.moveInDate}"></div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Tenants.saveEdit('${t.id}')">💾 Save Changes</button>
      </div>
    `);

    setTimeout(async () => {
      await DocUploadManager.loadFromTenant(tenantId);
      DocUploadManager.renderUI();
    }, 20);
  },

  toggleAllPayments() {
    const extra = document.getElementById('tenant-extra-payments');
    const btn = document.getElementById('btn-toggle-payments');
    if (!extra || !btn) return;
    const isHidden = extra.style.display === 'none';
    if (isHidden) {
      extra.style.display = 'block';
      btn.innerHTML = '▲ Show less payments';
    } else {
      extra.style.display = 'none';
      const count = extra.querySelectorAll('.payment-item').length;
      btn.innerHTML = `▼ Show all payments (${count} more)`;
    }
  },

  async saveEdit(tenantId) {
    const existing = DB.getTenantById(tenantId) || {};
    const name = document.getElementById('inp-et-name').value.trim();
    const phone = document.getElementById('inp-et-phone').value.trim();
    const rent = parseFloat(document.getElementById('inp-et-rent').value) || 0;
    const deposit = parseFloat(document.getElementById('inp-et-deposit').value) || 0;
    const moveInDate = document.getElementById('inp-et-movein').value;
    if (!name || !phone) return showToast('Fill required fields', 'error');

    const savedDocs = await DocUploadManager.saveAllToDB();
    const docIds = savedDocs.map(d => d.id);

    // Clean up permanently deleted doc IDs from ImageDB
    if (DocUploadManager.pendingDeletions && DocUploadManager.pendingDeletions.length > 0) {
      for (const delId of DocUploadManager.pendingDeletions) {
        try { await ImageDB.delete(delId); } catch (e) {}
      }
      DocUploadManager.pendingDeletions = [];
    }

    DB.updateTenant(tenantId, {
      ...existing,
      name, phone,
      rent, deposit, moveInDate,
      docs: docIds,
      idProof: docIds.length > 0 ? (existing.idProof || 'Identity Documents Uploaded') : 'No documents'
    });
    closeModal();
    if (App.currentTab === 'rooms') {
      Rooms.render();
    } else {
      this.render();
    }
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
    SoundFX.success();
    showToast('✅ Tenant updated successfully!', 'success');
  },

  deleteTenant(tenantId) {
    const t = DB.getTenantById(tenantId);
    if (!confirm(`Remove ${t?.name} from the system?`)) return;
    DB.deleteTenant(tenantId);
    closeModal();
    this.render();
    showToast('🗑️ Tenant removed', 'info');
  },
};
