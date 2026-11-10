// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — DASHBOARD TAB
// ============================================================

const Dashboard = {
  render() {
    const stats = DB.getStats();
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const currentMonth = getCurrentMonth();
    const floors = DB.getFloors();
    const hasCustomLogo = DB.hasCustomLogo();
    const hasBankId = DB.hasBankId();
    const isProfileIncomplete = !hasCustomLogo || !hasBankId;
    const activeLogo = hasCustomLogo && prop.logo ? prop.logo : (prop.logo || '');

    let html = `
      <!-- Property Hero -->
      <div class="property-hero">
        <div style="display:flex; align-items:center; gap:14px">
          ${activeLogo ? `
            <img src="${activeLogo}" alt="PG Logo" id="dash-prop-hero-logo" style="width:52px; height:52px; border-radius:var(--radius-xl); object-fit:cover; border:2px solid rgba(255,255,255,0.4); box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0">
          ` : `
            <div id="dash-prop-hero-logo" style="width:52px; height:52px; border-radius:var(--radius-xl); background:rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0">
              🏠
            </div>
          `}
          <div>
            <div class="property-name" style="margin-bottom:2px">${prop.name}</div>
            <div class="property-address">📍 ${prop.address || 'Set address in Settings'}</div>
          </div>
        </div>
      </div>

      <div class="scroll-area" id="dash-scroll">
        <!-- 0. Dynamic 10-Day Free Trial & Subscription Countdown Card -->
        <div id="dash-subscription-slot"></div>

        <!-- 1. Mandatory Bank UPI ID Notification (100% Phone Compatible & Fully Visible) -->
        ${!hasBankId ? `
          <div class="card" onclick="Settings.showPaymentSetupModal()" style="background:var(--bg-card); border:1.5px solid var(--accent-green); border-radius:var(--radius-lg, 16px); padding:14px; margin-bottom:14px; box-shadow:0 4px 16px -2px rgba(22,163,74,0.18); cursor:pointer; position:relative; overflow:hidden; box-sizing:border-box; width:100%; max-width:100%;">
            <div style="display:flex; align-items:flex-start; gap:10px; width:100%; box-sizing:border-box;">
              <div style="width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg, #16A34A 0%, #059669 100%); color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; box-shadow:0 3px 8px rgba(22,163,74,0.3)">
                ⚡
              </div>
              <div style="flex:1; min-width:0; box-sizing:border-box;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:4px; flex-wrap:wrap;">
                  <div style="font-weight:800; font-size:14px; color:var(--text-primary); line-height:1.3; min-width:0; word-break:break-word;">
                    Receive Rent Directly Into Your Bank
                  </div>
                  <span class="badge" style="background:#DCFCE7; color:#15803D; font-weight:800; font-size:10px; padding:2px 7px; border-radius:10px; border:1px solid #86EFAC; flex-shrink:0;">✨ 0% COMMISSION</span>
                </div>
                
                <!-- Short Educational Explanation -->
                <div style="font-size:12px; color:var(--text-secondary); line-height:1.45; margin-bottom:10px; word-break:break-word;">
                  Setting your Bank UPI ID is required so tenants can transfer rent directly into your bank account with zero middleman deductions. Your official Payment QR code is generated automatically on WhatsApp reminders.
                </div>

                <!-- Examples for users who don't know their ID -->
                <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:10px; padding:8px 10px; margin-bottom:10px; box-sizing:border-box; width:100%; overflow:hidden;">
                  <div style="font-size:11px; font-weight:700; color:var(--text-primary); margin-bottom:6px;">
                    💡 Examples of Bank UPI IDs (Tap any to use format):
                  </div>
                  <div style="display:flex; gap:5px; flex-wrap:wrap; width:100%; box-sizing:border-box;">
                    <span class="chip" style="font-size:10.5px; padding:3px 7px; font-family:monospace; background:var(--bg-card); cursor:pointer; max-width:100%; overflow:hidden; text-overflow:ellipsis;" onclick="event.stopPropagation(); Settings.showPaymentSetupModal('9876543210@paytm')">9876543210@paytm</span>
                    <span class="chip" style="font-size:10.5px; padding:3px 7px; font-family:monospace; background:var(--bg-card); cursor:pointer; max-width:100%; overflow:hidden; text-overflow:ellipsis;" onclick="event.stopPropagation(); Settings.showPaymentSetupModal('yourname@okhdfcbank')">yourname@okhdfcbank</span>
                    <span class="chip" style="font-size:10.5px; padding:3px 7px; font-family:monospace; background:var(--bg-card); cursor:pointer; max-width:100%; overflow:hidden; text-overflow:ellipsis;" onclick="event.stopPropagation(); Settings.showPaymentSetupModal('yourmobile@ybl')">yourmobile@ybl</span>
                    <span class="chip" style="font-size:10.5px; padding:3px 7px; font-family:monospace; background:var(--bg-card); cursor:pointer; max-width:100%; overflow:hidden; text-overflow:ellipsis;" onclick="event.stopPropagation(); Settings.showPaymentSetupModal('pgowner@fam')">pgowner@fam</span>
                    <span class="chip" style="font-size:10.5px; padding:3px 7px; font-family:monospace; background:var(--bg-card); cursor:pointer; max-width:100%; overflow:hidden; text-overflow:ellipsis;" onclick="event.stopPropagation(); Settings.showPaymentSetupModal('business@sbi')">business@sbi</span>
                  </div>
                </div>

                <div style="width:100%; box-sizing:border-box;">
                  <button type="button" class="btn btn-success" onclick="event.stopPropagation(); Settings.showPaymentSetupModal()" style="width:100%; padding:10px 14px; font-weight:700; font-size:12.5px; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:6px; box-sizing:border-box; white-space:normal; text-align:center;">
                    <span>⚡ Add Bank ID &amp; Collect Rent →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 2. Mandatory Logo Setup Reminder Banner -->
        ${!hasCustomLogo ? `
          <div class="dash-logo-reminder-bar" id="dash-logo-reminder-bar" onclick="Settings.showLogoUploadModal()" title="Upload PG Business Logo">
            <div class="dash-logo-icon-wrap">
              <span style="font-size:22px; line-height:1">🖼️</span>
            </div>
            <div class="dash-logo-content">
              <div class="dash-logo-title">
                <span>Upload PG Business Logo</span>
                <span class="dash-logo-badge">ACTION REQUIRED</span>
              </div>
              <div class="dash-logo-sub">Upload your PG business logo to personalize your application, business cards, invoices, rent agreements, and shared documents.</div>
            </div>
            <button type="button" class="dash-logo-btn" onclick="event.stopPropagation(); Settings.showLogoUploadModal();">
              <span>Upload Logo</span>
              <span style="font-size:14px">→</span>
            </button>
          </div>
        ` : ''}

        <!-- WhatsApp Reminders Quick Action Bar -->
        <div class="dash-wa-reminder-bar" onclick="WhatsApp.openReminderModal()" title="Open WhatsApp Rent Reminders">
          <div class="dash-wa-icon-wrap">
            <span style="font-size:20px; line-height:1">📲</span>
          </div>
          <div class="dash-wa-content">
            <div class="dash-wa-title">
              <span>WhatsApp Rent Reminders</span>
              ${stats.unpaidTenants.length > 0 ? `<span style="background:rgba(255,255,255,0.25); border:1px solid rgba(255,255,255,0.4); padding:2px 8px; border-radius:12px; font-size:11px; font-weight:800;">${stats.unpaidTenants.length} Pending</span>` : `<span style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:12px; font-size:11px;">All Clear ✓</span>`}
            </div>
            <div class="dash-wa-sub">${stats.unpaidTenants.length > 0 ? `Send 1-tap reminders to ${stats.unpaidTenants.length} unpaid tenant${stats.unpaidTenants.length > 1 ? 's' : ''}` : `Send custom notices or rent reminders via WhatsApp`}</div>
          </div>
          <div class="dash-wa-arrow">›</div>
        </div>

        <!-- Summary Grid -->
        <div class="summary-grid">
          <div class="stat-card blue">
            <span class="stat-icon">🛏️</span>
            <div class="stat-value">${stats.totalBeds}</div>
            <div class="stat-label">Total Beds</div>
          </div>
          <div class="stat-card green">
            <span class="stat-icon">✅</span>
            <div class="stat-value">${stats.vacantBeds}</div>
            <div class="stat-label">Vacant Beds</div>
          </div>
          <div class="stat-card red">
            <span class="stat-icon">👤</span>
            <div class="stat-value">${stats.occupiedBeds}</div>
            <div class="stat-label">Occupied Beds</div>
          </div>
          <div class="stat-card purple">
            <span class="stat-icon">👥</span>
            <div class="stat-value">${stats.tenants.length}</div>
            <div class="stat-label">Active Tenants</div>
          </div>
        </div>

        <!-- Net Profit Card -->
        ${(function(){
          const sum = DB.getFinancialSummary(currentMonth);
          const isProfit = sum.netProfit >= 0;
          return `
          <div class="dash-profit-card ${isProfit ? 'profit' : 'loss'}" onclick="App.navigate('expenses')" style="margin-bottom:16px">
            <div class="dpc-header">${isProfit ? '📈 Net Profit' : '📉 Net Loss'} — ${getMonthLabel(currentMonth)}</div>
            <div class="dpc-amount">${formatCurrency(Math.abs(sum.netProfit), cur)}</div>
            <div class="dpc-row">
              <span>Income: ${formatCurrency(sum.rentCollected + sum.otherIncome, cur)}</span>
              <span>Expenses: ${formatCurrency(sum.totalExpenses, cur)}</span>
            </div>
          </div>
          `;
        })()}

        <!-- Revenue Cards -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💰 Revenue — ${getMonthLabel(currentMonth)}</div>
          </div>
          <div class="summary-grid">
            <div class="stat-card blue">
              <span class="stat-icon">📊</span>
              <div class="stat-value currency">${formatCurrency(stats.totalRevenue, cur)}</div>
              <div class="stat-label">Total Expected</div>
            </div>
            <div class="stat-card green">
              <span class="stat-icon">💵</span>
              <div class="stat-value currency">${formatCurrency(stats.collectedRevenue, cur)}</div>
              <div class="stat-label">Collected</div>
            </div>
          </div>
          <div style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span class="fs-12 color-secondary">Collection Rate</span>
              <span class="fs-12 fw-700 color-green">${stats.totalRevenue > 0 ? Math.round((stats.collectedRevenue / stats.totalRevenue) * 100) : 0}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${stats.totalRevenue > 0 ? Math.min(100, Math.round((stats.collectedRevenue / stats.totalRevenue) * 100)) : 0}%"></div>
            </div>
            <div style="margin-top:8px;display:flex;justify-content:space-between">
              <span class="fs-12 color-secondary">Pending: <strong class="color-red">${formatCurrency(Math.max(0, stats.totalRevenue - stats.collectedRevenue), cur)}</strong></span>
              <button class="btn btn-ghost btn-sm" onclick="Dashboard.render();renderActiveTab()">🔄 Refresh</button>
            </div>
          </div>
        </div>

        <!-- Smart Alerts -->
        ${this.renderAlerts(stats, cur)}

        <!-- Floor Summary -->
        ${floors.length > 0 ? this.renderFloorSummary(floors) : ''}

        <!-- Recent Payments -->
        ${this.renderRecentPayments(cur)}

      </div>
    `;

    document.getElementById('tab-dashboard').innerHTML = html;

    // Render Subscription / 10-Day Trial Status Card
    if (typeof Subscription !== 'undefined' && Subscription.renderDashboardCard) {
      try { Subscription.renderDashboardCard(); } catch (e) { console.warn(e); }
    }

    // Check WhatsApp reminder after render
    setTimeout(() => WhatsApp.checkAndPromptReminder(), 300);
  },

  renderAlerts(stats, cur) {
    const alerts = [];
    const currentMonth = getCurrentMonth();

    if (stats.vacantBeds > 0) {
      alerts.push(`<div class="alert-item warning">🏠 <span>${stats.vacantBeds} bed${stats.vacantBeds > 1 ? 's are' : ' is'} vacant — fill them up!</span></div>`);
    }
    if (stats.unpaidTenants.length > 0) {
      alerts.push(`<div class="alert-item danger" onclick="WhatsApp.openReminderModal()" style="cursor:pointer">💸 <span>${stats.unpaidTenants.length} tenant${stats.unpaidTenants.length > 1 ? 's have' : ' has'} not paid rent · <strong>Tap to remind</strong></span></div>`);
    }
    if (stats.totalRevenue > 0 && stats.collectedRevenue >= stats.totalRevenue) {
      alerts.push(`<div class="alert-item success">🎉 <span>All rents collected for ${getMonthLabel(currentMonth)}!</span></div>`);
    }
    if (stats.tenants.length === 0) {
      alerts.push(`<div class="alert-item info">👋 <span>No tenants yet. Go to Rooms to add tenants.</span></div>`);
    }

    if (alerts.length === 0) return '';
    return `<div class="card">
      <div class="card-header"><div class="card-title">⚡ Smart Alerts</div></div>
      <div class="alert-list">${alerts.join('')}</div>
    </div>`;
  },

  renderFloorSummary(floors) {
    const rows = floors.map(f => {
      const fs = DB.getFloorStats(f.id);
      return `<tr>
        <td><strong>${f.name}</strong></td>
        <td>${fs.rooms}</td>
        <td>${fs.total}</td>
        <td><span class="badge red">🔴 ${fs.occupied}</span></td>
        <td><span class="badge green">🟢 ${fs.vacant}</span></td>
      </tr>`;
    }).join('');

    return `<div class="card">
      <div class="card-header"><div class="card-title">🏢 Floor Summary</div></div>
      <table class="floor-table">
        <thead><tr><th>Floor</th><th>Rooms</th><th>Beds</th><th>Occupied</th><th>Vacant</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  },

  renderRecentPayments(cur) {
    const currentMonth = getCurrentMonth();
    const payments = DB.getPaymentsByMonth(currentMonth).slice(-10).reverse();

    if (payments.length === 0) {
      return `<div class="card">
        <div class="card-header"><div class="card-title">💳 Recent Payments</div></div>
        <div class="empty-state" style="padding:24px"><div class="empty-icon">💳</div><div class="empty-title">No payments yet</div></div>
      </div>`;
    }

    const items = payments.map(p => {
      const tenant = DB.getTenantById(p.tenantId);
      if (!tenant) return '';
      const initials = getInitials(tenant.name);
      const methodIcon = p.method === 'UPI' ? '📱' : p.method === 'Cash' ? '💵' : '🏦';
      return `<div class="payment-item">
        <div class="payment-avatar" style="background:${getAvatarColor(tenant.name)}">${initials}</div>
        <div class="payment-info">
          <div class="payment-name">${tenant.name}</div>
          <div class="payment-meta">${methodIcon} ${p.method} · ${formatDateDisplay(p.date)}</div>
        </div>
        <div class="payment-amount">${formatCurrency(p.amount, cur)}</div>
      </div>`;
    }).join('');

    return `<div class="card">
      <div class="card-header">
        <div class="card-title">💳 Recent Payments</div>
        <button class="btn btn-ghost btn-sm" onclick="App.navigate('rent')">View All</button>
      </div>
      ${items}
    </div>`;
  },
};
