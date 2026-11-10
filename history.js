// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — PAYMENT HISTORY TAB
// Standalone top-level tab (opened from the ⋮ menu).
// Shows each tenant's lifetime payment ledger.
// Reuses Rent's collect / invoice / share actions.
// ============================================================

const PaymentHistory = {
  selectedTenantId: null,
  searchQuery: '',

  // Full tab render (search box + results)
  render() {
    const container = document.getElementById('tab-history');
    if (!container) return;

    container.innerHTML = `
      <div class="scroll-area" style="padding-bottom:100px;">
        <div class="card" style="padding:12px 14px; margin-bottom:12px;">
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">
            <div class="search-bar" style="flex:1; margin:0;">
              <span class="search-icon">🔍</span>
              <input type="text" id="ph-search" placeholder="Search tenant by name or phone..."
                value="${this._esc(this.searchQuery)}"
                oninput="PaymentHistory.onSearch(this.value)">
            </div>
            <button class="btn btn-ghost btn-sm" style="padding:8px 12px; min-height:40px;" onclick="PaymentHistory.clearSearch()" title="Clear search">↺</button>
          </div>
          <div id="ph-tenant-chips" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling:touch;"></div>
        </div>

        <div id="ph-ledger"></div>
      </div>
    `;

    this.renderResults();
  },

  // Re-renders only the chips + ledger (keeps search input focus while typing)
  renderResults() {
    const chipsEl = document.getElementById('ph-tenant-chips');
    const ledgerEl = document.getElementById('ph-ledger');
    if (!chipsEl || !ledgerEl) return;

    const cur = (DB.getProperty() || {}).currency || '₹';
    const tenants = DB.getTenants(); // active tenants only
    const q = (this.searchQuery || '').toLowerCase().trim();
    const filtered = tenants.filter(t =>
      !q || (t.name || '').toLowerCase().includes(q) || (t.phone || '').includes(q)
    );

    // Keep selection valid within the filtered list
    if (!filtered.some(t => t.id === this.selectedTenantId)) {
      this.selectedTenantId = filtered.length ? filtered[0].id : null;
    }

    chipsEl.innerHTML = filtered.length
      ? filtered.map(t => {
          const sel = t.id === this.selectedTenantId;
          return `
            <button type="button" class="btn btn-sm ${sel ? 'btn-primary' : 'btn-ghost'}"
              style="white-space:nowrap; border-radius:20px; padding:6px 14px; font-size:12px; flex-shrink:0;"
              onclick="PaymentHistory.selectTenant('${t.id}')">
              ${this._esc(t.name)}
            </button>`;
        }).join('')
      : `<div class="color-muted fs-13" style="padding:4px 2px;">No matching tenants</div>`;

    const tenant = tenants.find(t => t.id === this.selectedTenantId);
    ledgerEl.innerHTML = tenant ? this.renderLedger(tenant, cur) : `
      <div class="empty-state" style="padding:24px">
        <div class="empty-icon">👥</div>
        <div class="empty-title">${tenants.length ? 'No tenant selected' : 'No tenants yet'}</div>
        <div class="empty-sub">${tenants.length ? 'Pick a tenant above to view their payment history.' : 'Add tenants to track their payment history.'}</div>
      </div>`;
  },

  renderLedger(t, cur) {
    const months = DB.getTenantMonthList(t.id);
    const payments = DB.getPaymentsByTenant(t.id);
    const info = DB.getBedInfo(t.bedId);
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const deposit = t.depositGiven !== undefined ? (parseFloat(t.depositGiven) || 0) : (t.deposit || 0);
    const paidThisMonth = DB.isPaid(t.id, getCurrentMonth());

    const rows = months.length
      ? months.map(m => {
          const isPaid = DB.isPaid(t.id, m);
          if (isPaid) {
            const p = payments.find(pay => pay.month === m) || { month: m, amount: t.rent, date: '', method: 'UPI' };
            const icon = p.method === 'UPI' ? '📱' : (p.method === 'Cash' ? '💵' : '🏦');
            return `
              <div class="ph-item">
                <div class="ph-item-top">
                  <div class="ph-item-header">
                    <div class="ph-item-icon" style="background:var(--accent-green-light); color:var(--accent-green);">${icon}</div>
                    <div style="min-width:0;">
                      <div class="ph-item-title">${getMonthLabel(m)}</div>
                      <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">📅 ${formatDateDisplay(p.date)} · ${p.method || 'Payment'}</div>
                    </div>
                  </div>
                  <div style="text-align:right; flex-shrink:0;">
                    <div class="ph-item-amount" style="color:var(--accent-green);">${formatCurrency(p.amount || t.rent, cur)}</div>
                    <span class="badge green" style="font-weight:700; font-size:10.5px; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:3px; margin-top:3px;">✓ Collected</span>
                  </div>
                </div>

                <div class="ph-item-actions">
                  <button class="btn btn-ghost ph-btn-action" onclick="Rent.previewInvoice('${t.id}','${p.id || m}')" title="Preview Invoice">
                    <span>👁️</span> <span>Preview</span>
                  </button>
                  <button class="btn btn-ghost ph-btn-action" onclick="Rent.shareInvoice('${t.id}','${p.id || m}')" title="Share invoice & image on WhatsApp">
                    <span>📲</span> <span>WhatsApp</span>
                  </button>
                  <button class="btn btn-ghost ph-btn-action" onclick="Rent.downloadInvoice('${t.id}','${p.id || m}')" title="Download PDF">
                    <span>📄</span> <span>PDF</span>
                  </button>
                </div>
              </div>`;
          } else {
            return `
              <div class="ph-item pending">
                <div class="ph-item-top">
                  <div class="ph-item-header">
                    <div class="ph-item-icon" style="background:var(--accent-red-light); color:var(--accent-red);">⏳</div>
                    <div style="min-width:0;">
                      <div class="ph-item-title">${getMonthLabel(m)}</div>
                      <div style="font-size:12px; color:var(--accent-red); margin-top:2px;">❌ Rent Pending</div>
                    </div>
                  </div>
                  <div style="text-align:right; flex-shrink:0;">
                    <div class="ph-item-amount" style="color:var(--text-primary);">${formatCurrency(t.rent, cur)}</div>
                    <span class="badge red" style="font-weight:700; font-size:10.5px; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:3px; margin-top:3px;">Pending</span>
                  </div>
                </div>

                <div class="ph-item-actions">
                  <button class="btn btn-primary ph-btn-action" style="flex:1;" onclick="Rent.collectRent('${t.id}', '${m}')">
                    <span>💳</span> <span>Collect Rent</span>
                  </button>
                </div>
              </div>`;
          }
        }).join('')
      : `
        <div class="empty-state" style="padding:20px; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border);">
          <div class="empty-icon">⏳</div>
          <div class="empty-title">No history records</div>
          <div class="empty-sub">Rent history for ${this._esc(t.name)} will appear here.</div>
        </div>`;

    return `
      <div class="card" style="margin-bottom:14px; background:linear-gradient(135deg, rgba(14,165,233,0.06), rgba(99,102,241,0.06));">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div class="tenant-avatar" style="background:${getAvatarColor(t.name)}; width:52px; height:52px; font-size:20px; flex-shrink:0;">${getInitials(t.name)}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:17px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this._esc(t.name)}</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">📍 ${info?.room?.name || 'Room'} · Bed ${info?.bed?.number || ''}${info?.floor?.name ? ' (' + info.floor.name + ')' : ''}</div>
            <div style="font-size:11.5px; color:var(--accent-blue); margin-top:2px;">📱 ${t.phone || ''}</div>
          </div>
          <span class="badge ${paidThisMonth ? 'green' : 'red'}" style="flex-shrink:0;">${paidThisMonth ? '✅ Paid' : '❌ Due'}</span>
        </div>
        <div class="ph-summary-grid">
          <div>
            <div class="ph-summary-label">Monthly Rent</div>
            <div class="ph-summary-val">${formatCurrency(t.rent, cur)}</div>
          </div>
          <div>
            <div class="ph-summary-label">Deposit</div>
            <div class="ph-summary-val" style="color:var(--accent-blue);">${formatCurrency(deposit, cur)}</div>
          </div>
          <div>
            <div class="ph-summary-label">Total Paid</div>
            <div class="ph-summary-val" style="color:var(--accent-green);">${formatCurrency(totalPaid, cur)}</div>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div class="section-title" style="margin:0;">📜 Rent History (${months.length} Months)</div>
      </div>
      ${rows}
    `;
  },

  selectTenant(id) {
    this.selectedTenantId = id;
    this.renderResults();
  },

  onSearch(q) {
    this.searchQuery = q;
    this.renderResults();
  },

  clearSearch() {
    this.searchQuery = '';
    const input = document.getElementById('ph-search');
    if (input) input.value = '';
    this.renderResults();
  },

  // Uses the existing Rent collect modal for the current month
  collectCurrentMonth(tenantId) {
    Rent.activeMonth = getCurrentMonth();
    Rent.collectRent(tenantId);
  },

  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};

window.PaymentHistory = PaymentHistory;
