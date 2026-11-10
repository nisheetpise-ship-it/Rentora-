// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — RENT TAB
// Powered by Rentora
// ============================================================

const Rent = {
  activeMonth: getCurrentMonth(),
  activeView: 'overview', // 'overview' | 'invoices' | 'analytics' | 'deposits'
  chartInstance: null,

  render() {
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const tenants = DB.getTenants();
    const payments = DB.getPaymentsByMonth(this.activeMonth);
    const eligibleTenants = tenants.filter(t => DB.getTenantJoiningMonth(t) <= this.activeMonth);
    const totalExpected = eligibleTenants.reduce((s, t) => s + (t.rent || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const pending = Math.max(0, totalExpected - totalCollected);
    const rate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    const paidTenants = tenants.filter(t => DB.isPaid(t.id, this.activeMonth));
    const unpaidTenants = eligibleTenants.filter(t => !DB.isPaid(t.id, this.activeMonth));

    document.getElementById('tab-rent').innerHTML = `
      <div class="scroll-area">
        <!-- Month Selector -->
        <div class="card">
          <div class="month-selector">
            <button class="month-nav-btn" onclick="Rent.changeMonth(-1)">‹</button>
            <div style="text-align:center">
              <div class="month-name">${getMonthLabel(this.activeMonth)}</div>
              ${this.activeMonth === getCurrentMonth() ? '<div class="fs-12 color-secondary">Current Month</div>' : ''}
            </div>
            <button class="month-nav-btn" onclick="Rent.changeMonth(1)" ${this.activeMonth >= getCurrentMonth() ? 'disabled style="opacity:0.3"' : ''}>›</button>
          </div>
        </div>

        <!-- Revenue Stats -->
        <div class="revenue-stats">
          <div class="rev-stat"><div class="rev-stat-label">Expected</div><div class="rev-stat-value blue">${formatCurrency(totalExpected, cur)}</div></div>
          <div class="rev-stat"><div class="rev-stat-label">Collected</div><div class="rev-stat-value green">${formatCurrency(totalCollected, cur)}</div></div>
          <div class="rev-stat"><div class="rev-stat-label">Pending</div><div class="rev-stat-value red">${formatCurrency(pending, cur)}</div></div>
          <div class="rev-stat"><div class="rev-stat-label">Collection Rate</div><div class="rev-stat-value ${rate >= 80 ? 'green' : rate >= 50 ? 'blue' : 'red'}">${rate}%</div></div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>

        <!-- Sub Tabs -->
        <div class="sub-tabs">
          <button class="sub-tab ${this.activeView === 'overview' ? 'active' : ''}" onclick="Rent.setView('overview')">💰 Payments</button>
          <button class="sub-tab ${this.activeView === 'invoices' ? 'active' : ''}" onclick="Rent.setView('invoices')">🧾 Invoices</button>
          <button class="sub-tab ${this.activeView === 'excel' ? 'active' : ''}" onclick="Rent.setView('excel')">📊 Excel Export</button>
          <button class="sub-tab ${this.activeView === 'analytics' ? 'active' : ''}" onclick="Rent.setView('analytics')">📈 Analytics</button>
          <button class="sub-tab ${this.activeView === 'deposits' ? 'active' : ''}" onclick="Rent.setView('deposits')">🛡️ Deposits</button>
        </div>

        ${this.activeView === 'overview' ? this.renderOverview(paidTenants, unpaidTenants, cur) : ''}
        ${this.activeView === 'invoices' ? this.renderInvoices(paidTenants, cur) : ''}
        ${this.activeView === 'excel' ? this.renderExcelExport(cur) : ''}
        ${this.activeView === 'analytics' ? this.renderAnalytics(cur) : ''}
        ${this.activeView === 'deposits' ? this.renderDeposits(cur) : ''}
      </div>
    `;

    if (this.activeView === 'analytics') {
      setTimeout(() => this.drawChart(cur), 100);
    }
  },

  setView(view) {
    this.activeView = view;
    this.render();
  },

  changeMonth(dir) {
    this.activeMonth = getMonthOffset(this.activeMonth, dir);
    this.render();
  },

  renderOverview(paidTenants, unpaidTenants, cur) {
    const month = this.activeMonth;
    const unpaidRows = unpaidTenants.map(t => {
      const info = DB.getBedInfo(t.bedId);
      return `<div class="tenant-card">
        <div class="tenant-avatar" style="background:${getAvatarColor(t.name)}">${getInitials(t.name)}</div>
        <div class="tenant-info">
          <div class="tenant-name">${t.name}</div>
          <div class="tenant-meta">📍 ${info?.room?.name || ''} · Bed ${info?.bed?.number || ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <span class="color-red fw-700 fs-13">${formatCurrency(t.rent, cur)}</span>
          <button class="btn btn-primary btn-sm" onclick="Rent.collectRent('${t.id}')">Collect</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-icon">🎉</div><div class="empty-title">All paid!</div></div>';

    const paidRows = paidTenants.map(t => {
      const payment = DB.getPaymentsByTenant(t.id).find(p => p.month === month);
      const info = DB.getBedInfo(t.bedId);
      const methodIcon = payment?.method === 'UPI' ? '📱' : payment?.method === 'Cash' ? '💵' : '🏦';
      return `<div class="tenant-card">
        <div class="tenant-avatar" style="background:${getAvatarColor(t.name)}">${getInitials(t.name)}</div>
        <div class="tenant-info">
          <div class="tenant-name">${t.name}</div>
          <div class="tenant-meta">${methodIcon} ${payment?.method || ''} · ${formatDateDisplay(payment?.date)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <span class="color-green fw-700 fs-13">${formatCurrency(payment?.amount || t.rent, cur)}</span>
          <button class="btn btn-ghost btn-sm" onclick="Rent.undoPayment('${payment?.id}')">↩️ Undo</button>
        </div>
      </div>`;
    }).join('') || '<div class="color-muted fs-13 text-center" style="padding:12px">No paid tenants yet</div>';

    return `
      ${unpaidTenants.length > 0 ? `
        <div class="section-title">
          ❌ Unpaid (${unpaidTenants.length})
          <button class="btn btn-whatsapp btn-sm" onclick="WhatsApp.openReminderModal()">📲 Remind All</button>
        </div>
        ${unpaidRows}
      ` : ''}

      ${paidTenants.length > 0 ? `
        <div class="section-title" style="margin-top:8px">✅ Paid (${paidTenants.length})</div>
        ${paidRows}
      ` : ''}
    `;
  },

  collectRent(tenantId, targetMonth = null) {
    const tenant = DB.getTenantById(tenantId);
    if (!tenant) return;
    const monthToCollect = targetMonth || this.activeMonth;

    const joiningMonth = DB.getTenantJoiningMonth(tenant);
    if (monthToCollect < joiningMonth && !DB.isPaid(tenantId, monthToCollect)) {
      showToast(`⚠️ Cannot collect rent for ${getMonthLabel(monthToCollect)}: Tenant joined in ${getMonthLabel(joiningMonth)}`, 'error');
      return;
    }

    if (DB.isPaid(tenantId, monthToCollect)) {
      showToast(`⚠️ Rent for ${getMonthLabel(monthToCollect)} has already been collected`, 'info');
      return;
    }

    const prop = DB.getProperty();
    const cur = prop.currency;

    showModal('💰 Collect Rent', `
      <div style="text-align:center;margin-bottom:20px">
        <div class="tenant-avatar" style="background:${getAvatarColor(tenant.name)};width:60px;height:60px;font-size:22px;margin:0 auto 10px">${getInitials(tenant.name)}</div>
        <div style="font-size:17px;font-weight:700">${tenant.name}</div>
        <div class="color-secondary fs-13">${getMonthLabel(monthToCollect)}</div>
      </div>
      <div class="form-group"><label class="form-label">Amount (${cur}) *</label>
        <input class="form-input" id="inp-cr-amount" type="number" value="${tenant.rent}" style="font-size:20px;font-weight:700;text-align:center"></div>
      <div class="form-group"><label class="form-label">Payment Method</label>
        <div class="chip-group" id="method-chips">
          <button class="chip active" onclick="Rent.selectMethod(this,'UPI')">📱 UPI</button>
          <button class="chip" onclick="Rent.selectMethod(this,'Cash')">💵 Cash</button>
          <button class="chip" onclick="Rent.selectMethod(this,'Bank')">🏦 Bank Transfer</button>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Date</label>
        <input class="form-input" id="inp-cr-date" type="date" value="${formatDate(new Date())}"></div>
      <input type="hidden" id="inp-cr-method" value="UPI">
      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-success btn-full" id="btn-save-rent-payment" onclick="Rent.savePayment('${tenantId}', '${monthToCollect}')">✅ Mark as Paid</button>
      </div>
    `);
  },

  selectMethod(btn, method) {
    document.querySelectorAll('#method-chips .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('inp-cr-method').value = method;
  },

  savePayment(tenantId, targetMonth = null) {
    const monthToCollect = targetMonth || this.activeMonth;

    if (DB.isPaid(tenantId, monthToCollect)) {
      closeModal();
      showToast(`⚠️ Rent for ${getMonthLabel(monthToCollect)} is already collected`, 'info');
      return;
    }

    const btn = document.getElementById('btn-save-rent-payment');
    if (btn) {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Collecting...';
    }

    const amount = parseFloat(document.getElementById('inp-cr-amount').value) || 0;
    const method = document.getElementById('inp-cr-method').value;
    const date = document.getElementById('inp-cr-date').value;
    if (!amount) {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Mark as Paid'; }
      return showToast('Enter valid amount', 'error');
    }

    const added = DB.addPayment({
      id: generateId('p'),
      tenantId,
      month: monthToCollect,
      amount,
      method,
      date,
      invoiceGenerated: false,
    });

    closeModal();

    if (added !== false) {
      if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
      const tenant = DB.getTenantById(tenantId);
      showToast(`🟢 Rent collected for ${getMonthLabel(monthToCollect)} (${formatCurrency(amount, DB.getProperty().currency)})`, 'success');
    } else {
      showToast(`⚠️ Rent for ${getMonthLabel(monthToCollect)} was already collected`, 'warning');
    }

    if (typeof Rent !== 'undefined' && App.currentTab === 'rent') Rent.render();
    if (typeof PaymentHistory !== 'undefined') PaymentHistory.renderResults();
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
    if (typeof Tenants !== 'undefined' && Tenants.showProfile && tenantId) {
      const modalEl = document.getElementById('modal-overlay');
      if (modalEl && modalEl.classList.contains('active')) {
        Tenants.showProfile(tenantId);
      }
    }
  },

  undoPayment(paymentId) {
    if (!paymentId) return;
    if (!confirm('Undo this payment?')) return;
    DB.deletePayment(paymentId);
    this.render();
    showToast('↩️ Payment removed', 'info');
  },

  // ── INVOICES ───────────────────────────────────────────────
  renderInvoices(paidTenants, cur) {
    if (paidTenants.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-title">No invoices yet</div><div class="empty-sub">Collect rent first to generate invoices.</div></div>`;
    }

    const month = this.activeMonth;
    const prop = DB.getProperty();

    return paidTenants.map(t => {
      const payment = DB.getPaymentsByTenant(t.id).find(p => p.month === month);
      const info = DB.getBedInfo(t.bedId);
      const methodIcon = payment?.method === 'UPI' ? '📱' : payment?.method === 'Cash' ? '💵' : '🏦';

      return `
        <div class="invoice-card" style="margin-bottom:12px">
          <div style="position:relative;z-index:1">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
              <div>
                <div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:1px">INVOICE</div>
                <div style="font-size:19px;font-weight:800">${t.name}</div>
                <div style="font-size:12px;opacity:0.8">📍 ${info?.room?.name || ''}, Bed ${info?.bed?.number || ''}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:22px;font-weight:900">${formatCurrency(payment?.amount || 0, cur)}</div>
                <div style="font-size:11px;opacity:0.8">${getMonthLabel(month)}</div>
              </div>
            </div>
            <div style="display:flex;gap:16px;font-size:12px;opacity:0.85;margin-bottom:16px">
              <span>${methodIcon} ${payment?.method || ''}</span>
              <span>📅 ${formatDateDisplay(payment?.date)}</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-sm" style="background:rgba(255,255,255,0.28);color:white;border:1px solid rgba(255,255,255,0.4)"
                onclick="Rent.previewInvoice('${t.id}','${payment?.id}')">👁️ Preview</button>
              <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3)"
                onclick="Rent.downloadInvoice('${t.id}','${payment?.id}')">📄 PDF</button>
              <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3)"
                onclick="Rent.shareInvoice('${t.id}','${payment?.id}')" title="Share invoice on WhatsApp">📲 Share</button>
              <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3)"
                onclick="Rent.shareInvoice('${t.id}','${payment?.id}', { chooseContact: true })" title="Choose contact in WhatsApp">👥</button>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  getPaymentRecord(tenantId, paymentIdOrMonth) {
    const payments = DB.getPaymentsByTenant(tenantId);
    let payment = payments.find(p => p.id === paymentIdOrMonth || p.month === paymentIdOrMonth);
    if (!payment && payments.length > 0) {
      payment = payments[0];
    }
    if (payment && !payment.invoiceNumber) {
      payment.invoiceNumber = `INV-${(payment.month || '').replace('-','')}-${tenantId.slice(-3).toUpperCase()}`;
    }
    return payment;
  },

  async generateInvoiceImageBlob(tenant, payment, prop, info) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    const cur = prop.currency || '₹';
    const invoiceNum = payment.invoiceNumber || `INV-${(payment.month || '').replace('-','')}-${tenant.id.slice(-3).toUpperCase()}`;

    const roundRect = (c, x, y, w, h, r) => {
      c.beginPath();
      if (c.roundRect) {
        c.roundRect(x, y, w, h, r);
      } else {
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
      }
      c.closePath();
    };

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 800, 1000);

    // Top Header Banner (Royal Blue gradient)
    const grad = ctx.createLinearGradient(0, 0, 800, 0);
    grad.addColorStop(0, '#0EA5E9');
    grad.addColorStop(1, '#6366F1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 160);

    // Embed PG Logo Container (Clean white card to guarantee contrast & clarity)
    const lSize = 108;
    const lx = 40;
    const ly = 26;
    const logoRadius = 16;

    // Draw white container base for the logo
    ctx.save();
    roundRect(ctx, lx, ly, lSize, lSize, logoRadius);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fill();
    ctx.restore();

    let logoDrawn = false;
    const logoSrc = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';
    if (logoSrc && typeof ImageUtils !== 'undefined' && ImageUtils.loadCleanImage) {
      try {
        const logoImg = await ImageUtils.loadCleanImage(logoSrc);
        if (logoImg && logoImg.naturalWidth > 0) {
          ctx.save();
          roundRect(ctx, lx, ly, lSize, lSize, logoRadius);
          ctx.clip();

          // Calculate aspect ratio contain with padding
          const pad = 8;
          const maxW = lSize - (pad * 2);
          const maxH = lSize - (pad * 2);
          const nw = logoImg.naturalWidth;
          const nh = logoImg.naturalHeight;
          const scale = Math.min(maxW / nw, maxH / nh);
          const drawW = nw * scale;
          const drawH = nh * scale;
          const drawX = lx + (lSize - drawW) / 2;
          const drawY = ly + (lSize - drawH) / 2;

          ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
          ctx.restore();
          logoDrawn = true;
        }
      } catch (e) {
        console.warn('Rent: Error drawing invoice logo onto canvas:', e);
      }
    }

    if (!logoDrawn) {
      // Intentional clean fallback icon inside the container
      ctx.save();
      ctx.font = '46px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', lx + lSize / 2, ly + lSize / 2);
      ctx.restore();
    }

    // Border around logo container
    ctx.save();
    roundRect(ctx, lx, ly, lSize, lSize, logoRadius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    const textStartX = lx + lSize + 22; // 170

    // Property Header Text with adaptive scaling
    const pgTitle = prop.name || 'PG Management';
    let titleFontSize = 26;
    ctx.font = `bold ${titleFontSize}px Inter, Arial, sans-serif`;
    while (ctx.measureText(pgTitle).width > 440 && titleFontSize > 18) {
      titleFontSize -= 2;
      ctx.font = `bold ${titleFontSize}px Inter, Arial, sans-serif`;
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(pgTitle, textStartX, 62);

    let addrText = prop.address || 'Premium PG Accommodation';
    ctx.font = '14px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    if (ctx.measureText(addrText).width > 440) {
      while (ctx.measureText(addrText + '...').width > 440 && addrText.length > 10) {
        addrText = addrText.slice(0, -1);
      }
      addrText += '...';
    }
    ctx.fillText(addrText, textStartX, 95);
    ctx.fillText(`Phone: +91 ${prop.phone || ''}`, textStartX, 122);

    // Invoice Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('RENT RECEIPT', 760, 60);

    // Green PAID Badge
    ctx.fillStyle = '#22C55E';
    roundRect(ctx, 640, 85, 120, 40, 20);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓ PAID', 700, 111);

    ctx.textAlign = 'left';

    // Invoice Details Box
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 40, 190, 720, 100, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '13px Inter, Arial, sans-serif';
    ctx.fillText('INVOICE NUMBER', 65, 225);
    ctx.fillText('RENT MONTH', 315, 225);
    ctx.fillText('PAYMENT DATE', 565, 225);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Inter, Arial, sans-serif';
    ctx.fillText(invoiceNum, 65, 255);
    ctx.fillText(getMonthLabel(payment.month), 315, 255);
    ctx.fillText(formatDateDisplay(payment.date), 565, 255);

    // Billed To Section
    ctx.fillStyle = '#0EA5E9';
    ctx.font = 'bold 14px Inter, Arial, sans-serif';
    ctx.fillText('BILLED TO (TENANT)', 40, 335);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px Inter, Arial, sans-serif';
    ctx.fillText(tenant.name, 40, 370);

    ctx.fillStyle = '#475569';
    ctx.font = '15px Inter, Arial, sans-serif';
    ctx.fillText(`Phone: +91 ${tenant.phone}`, 40, 400);
    const roomText = `${info?.room?.name || 'Room'}, Bed ${info?.bed?.number || ''}${info?.floor?.name ? ' (' + info.floor.name + ')' : ''}`;
    ctx.fillText(`Location: ${roomText}`, 40, 430);

    // Table Header
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(40, 480, 720, 45);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px Inter, Arial, sans-serif';
    ctx.fillText('DESCRIPTION', 60, 508);
    ctx.textAlign = 'right';
    ctx.fillText('PAYMENT METHOD', 540, 508);
    ctx.fillText('AMOUNT', 740, 508);
    ctx.textAlign = 'left';

    // Table Row
    ctx.fillStyle = '#0F172A';
    ctx.font = '500 16px Inter, Arial, sans-serif';
    ctx.fillText(`Monthly Rent - ${getMonthLabel(payment.month)}`, 60, 560);
    ctx.textAlign = 'right';
    ctx.fillText(payment.method || 'UPI', 540, 560);
    ctx.font = 'bold 18px Inter, Arial, sans-serif';
    ctx.fillText(formatCurrency(payment.amount, cur), 740, 560);
    ctx.textAlign = 'left';

    // Table Divider
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 595);
    ctx.lineTo(760, 595);
    ctx.stroke();

    // Total Summary Box
    ctx.fillStyle = '#DCFCE7';
    ctx.strokeStyle = '#86EFAC';
    roundRect(ctx, 420, 620, 340, 80, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#166534';
    ctx.font = 'bold 15px Inter, Arial, sans-serif';
    ctx.fillText('TOTAL AMOUNT PAID', 440, 652);

    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 28px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(payment.amount, cur), 740, 672);
    ctx.textAlign = 'left';

    // Terms / Notes
    ctx.fillStyle = '#64748B';
    ctx.font = '13px Inter, Arial, sans-serif';
    ctx.fillText('• This is a computer-generated rent receipt and requires no physical signature.', 40, 760);
    ctx.fillText('• Thank you for your prompt payment!', 40, 785);

    // Footer
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(40, 920);
    ctx.lineTo(760, 920);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${prop.name || 'PG Management'} · Powered by Rentora`, 400, 955);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 0.95);
    });
  },

  previewInvoice(tenantId, paymentIdOrMonth) {
    const tenant = DB.getTenantById(tenantId);
    if (!tenant) return showToast('Tenant not found', 'error');
    const payment = this.getPaymentRecord(tenantId, paymentIdOrMonth);
    if (!payment) return showToast('Payment record not found', 'error');
    const prop = DB.getProperty();
    const info = DB.getBedInfo(tenant.bedId);
    const cur = prop.currency || '₹';
    const activeLogo = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';
    const invoiceNum = payment.invoiceNumber || `INV-${(payment.month || '').replace('-','')}-${tenant.id.slice(-3).toUpperCase()}`;
    const roomText = `${info?.room?.name || 'Room'}, Bed ${info?.bed?.number || ''}${info?.floor?.name ? ' (' + info.floor.name + ')' : ''}`;

    showModal('🧾 Rent Invoice Preview', `
      <div style="background:var(--bg-card); border-radius:12px; border:1px solid var(--border); overflow:hidden; max-width:540px; margin:0 auto; box-shadow:var(--shadow-lg);">
        <div style="background:linear-gradient(135deg, #0EA5E9, #6366F1); padding:20px; color:#ffffff; display:flex; gap:16px; align-items:center;">
          <div style="width:72px; height:72px; border-radius:14px; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; flex-shrink:0; padding:4px; overflow:hidden;">
            ${activeLogo ? `<img src="${activeLogo}" style="max-width:100%; max-height:100%; object-fit:contain; display:block;">` : `<span style="font-size:36px">🏠</span>`}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:11px; letter-spacing:1px; text-transform:uppercase; opacity:0.85; font-weight:700;">RENT RECEIPT</div>
            <div style="font-size:20px; font-weight:800; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${prop.name || 'PG Management'}</div>
            <div style="font-size:12px; opacity:0.9; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${prop.address || ''}</div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <span style="background:#22C55E; color:#ffffff; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:800; display:inline-block;">✓ PAID</span>
          </div>
        </div>

        <div style="padding:18px 20px;">
          <div style="background:var(--bg-input, #F8FAFC); border:1px solid var(--border); border-radius:8px; padding:12px 14px; display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; font-size:12px;">
            <div><span style="color:var(--text-secondary); display:block; font-size:11px;">Invoice No:</span><strong>${invoiceNum}</strong></div>
            <div><span style="color:var(--text-secondary); display:block; font-size:11px;">Rent Month:</span><strong>${getMonthLabel(payment.month)}</strong></div>
            <div><span style="color:var(--text-secondary); display:block; font-size:11px;">Payment Date:</span><strong>${formatDateDisplay(payment.date)}</strong></div>
            <div><span style="color:var(--text-secondary); display:block; font-size:11px;">Method:</span><strong>${payment.method || 'UPI'}</strong></div>
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-size:11px; font-weight:700; color:var(--accent-blue); text-transform:uppercase; margin-bottom:4px;">Billed To</div>
            <div style="font-size:16px; font-weight:800;">${tenant.name}</div>
            <div style="font-size:13px; color:var(--text-secondary);">Phone: +91 ${tenant.phone}</div>
            <div style="font-size:13px; color:var(--text-secondary);">Room: ${roomText}</div>
          </div>

          <div style="background:#DCFCE7; border:1px solid #86EFAC; border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <span style="color:#166534; font-weight:700; font-size:13px;">Total Amount Paid</span>
            <span style="color:#15803D; font-weight:900; font-size:22px;">${formatCurrency(payment.amount, cur)}</span>
          </div>

          <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
            <button class="btn btn-outline" onclick="closeModal()">Close</button>
            <button class="btn btn-outline" onclick="Rent.downloadInvoice('${tenant.id}','${payment.id}')">📄 PDF</button>
            <button class="btn btn-whatsapp" onclick="Rent.shareInvoice('${tenant.id}','${payment.id}')">📲 WhatsApp Share</button>
            <button class="btn btn-outline" onclick="Rent.shareInvoice('${tenant.id}','${payment.id}', { chooseContact: true })" title="Choose contact in WhatsApp">👥 Choose Contact</button>
          </div>
        </div>
      </div>
    `);
  },

  downloadInvoice(tenantId, paymentIdOrMonth) {
    const tenant = DB.getTenantById(tenantId);
    const payment = this.getPaymentRecord(tenantId, paymentIdOrMonth);
    if (!tenant || !payment) return showToast('Unable to prepare invoice', 'error');
    const prop = DB.getProperty();
    const info = DB.getBedInfo(tenant.bedId);
    const cur = prop.currency || '₹';
    const invoiceNum = payment.invoiceNumber || `INV-${(payment.month || '').replace('-','')}-${tenant.id.slice(-3).toUpperCase()}`;
    const roomText = `${info?.room?.name || 'Room'}, Bed ${info?.bed?.number || ''}${info?.floor?.name ? ' (' + info.floor.name + ')' : ''}`;
    const activeLogo = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';

    const invoiceHtml = `
      <!DOCTYPE html><html><head><title>Invoice - ${tenant.name}</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { box-sizing: border-box; }
        body { font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #0F172A; border: 1px solid #E2E8F0; border-radius: 12px; }
        .header { text-align: center; border-bottom: 2px solid #0EA5E9; padding-bottom: 20px; margin-bottom: 20px; }
        .logo-box { width: 76px; height: 76px; border-radius: 16px; background: #FFFFFF; border: 2px solid #0EA5E9; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 4px; }
        .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
        .logo-fallback { font-size: 36px; }
        .title { font-size: 26px; font-weight: bold; color: #0EA5E9; letter-spacing: 1px; }
        .badge { display: inline-block; background: #DCFCE7; color: #16A34A; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 6px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .total { font-size: 18px; font-weight: bold; color: #16A34A; background: #F0FDF4; padding: 12px; border-radius: 8px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #94A3B8; font-size: 12px; }
      </style>
      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 300);
        });
      </script>
      </head><body>
      <div class="header">
        <div class="logo-box">
          ${activeLogo ? `<img src="${activeLogo}" alt="Logo">` : `<span class="logo-fallback">🏠</span>`}
        </div>
        <div class="title">RENT PAYMENT RECEIPT</div>
        <div class="badge">✓ PAID</div>
        <div style="font-size:18px; font-weight:bold; margin-top:8px">${prop.name || 'PG Management'}</div>
        <div style="font-size:12px; color:#64748B">${prop.address || ''} · 📞 ${prop.phone || ''}</div>
      </div>
      <div class="row"><span><strong>Invoice Number:</strong></span><span>${invoiceNum}</span></div>
      <div class="row"><span><strong>Tenant Name:</strong></span><span>${tenant.name}</span></div>
      <div class="row"><span><strong>Phone:</strong></span><span>+91 ${tenant.phone}</span></div>
      <div class="row"><span><strong>Room / Location:</strong></span><span>${roomText}</span></div>
      <div class="row"><span><strong>Rent Month:</strong></span><span>${getMonthLabel(payment.month)}</span></div>
      <div class="row"><span><strong>Payment Date:</strong></span><span>${formatDateDisplay(payment.date)}</span></div>
      <div class="row"><span><strong>Payment Method:</strong></span><span>${payment.method || 'UPI'}</span></div>
      <div class="row total"><span>Amount Paid:</span><span>${formatCurrency(payment.amount, cur)}</span></div>
      <div class="footer">Powered by Rentora · ${new Date().toLocaleDateString('en-IN')}</div>
      </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(invoiceHtml);
      win.document.close();
      showToast('📄 Invoice PDF opened for printing/saving', 'success');
    }
  },

  async shareInvoice(tenantId, paymentIdOrMonth, options = {}) {
    const tenant = DB.getTenantById(tenantId);
    if (!tenant) return showToast('Tenant not found', 'error');

    const payment = this.getPaymentRecord(tenantId, paymentIdOrMonth);
    if (!payment) {
      return showToast('Unable to prepare the invoice. Please try again.', 'error');
    }

    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const info = DB.getBedInfo(tenant.bedId);
    const invoiceNum = payment.invoiceNumber || `INV-${(payment.month || '').replace('-','')}-${tenant.id.slice(-3).toUpperCase()}`;
    const roomText = `${info?.room?.name || 'Room'}, Bed ${info?.bed?.number || ''}${info?.floor?.name ? ' (' + info.floor.name + ')' : ''}`;

    const messageText = `🧾 *RENT PAYMENT RECEIPT*\n\n*${prop.name || 'PG Management'}*\n\nDear ${tenant.name},\n\nYour rent payment has been received successfully.\n\n📋 *Invoice No:* ${invoiceNum}\n📅 *Rent Month:* ${getMonthLabel(payment.month)}\n💰 *Amount Paid:* ${formatCurrency(payment.amount, cur)}\n💳 *Payment Method:* ${payment.method || 'UPI'}\n🗓️ *Payment Date:* ${formatDateDisplay(payment.date)}\n📍 *Room:* ${roomText}\n\nThank you!\n${prop.owner || 'PG Manager'}\n${prop.name || 'PG Management'}\n\n_Powered by Rentora_`;

    const cleanPhone = (tenant.phone || '').replace(/\D/g, '');
    const cfg = DB.getWAConfig ? DB.getWAConfig() : { countryCode: '91' };
    const fullPhone = cleanPhone ? (cleanPhone.startsWith(cfg.countryCode) ? cleanPhone : cfg.countryCode + cleanPhone) : '';

    try {
      showToast('⏳ Preparing invoice image...', 'info');
      const imageBlob = await this.generateInvoiceImageBlob(tenant, payment, prop, info);
      const fileName = `Rent_Invoice_${invoiceNum}.png`;
      const file = new File([imageBlob], fileName, { type: 'image/png' });

      // 1. Native Web Share API (Mobile Android & iOS):
      // Opens system share dialog, lets user choose WhatsApp and pick ANY contact!
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Rent Invoice - ${getMonthLabel(payment.month)}`,
            text: messageText,
            files: [file]
          });
          showToast('🟢 Invoice image and receipt shared via WhatsApp!', 'success');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('Native share failed, using fallback:', err);
        }
      }

      // 2. Fallback: auto-download PNG invoice + open WhatsApp
      const url = URL.createObjectURL(imageBlob);
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
      showToast('📲 WhatsApp opened! Invoice PNG saved to downloads. Please attach the invoice image to your chat.', 'success');

    } catch (e) {
      console.error('Invoice share error:', e);
      const waUrl = (!options.chooseContact && fullPhone)
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
      showToast('📲 Opening WhatsApp with receipt text...', 'success');
    }
  },

  // ── DEPOSITS ──────────────────────────────────────────────
  renderDeposits(cur) {
    const tenants = DB.getTenants();
    let totalExpected = 0;
    let totalGiven = 0;

    tenants.forEach(t => {
      totalExpected += (t.deposit || 0);
      const given = t.depositGiven !== undefined ? parseFloat(t.depositGiven) : (t.deposit || 0);
      totalGiven += given;
    });

    const pending = Math.max(0, totalExpected - totalGiven);

    let html = `
      <div class="revenue-stats mb-12">
        <div class="rev-stat"><div class="rev-stat-label">Total Expected</div><div class="rev-stat-value blue">${formatCurrency(totalExpected, cur)}</div></div>
        <div class="rev-stat"><div class="rev-stat-label">Total Given</div><div class="rev-stat-value green">${formatCurrency(totalGiven, cur)}</div></div>
        <div class="rev-stat"><div class="rev-stat-label">Total Pending</div><div class="rev-stat-value red">${formatCurrency(pending, cur)}</div></div>
      </div>
      
      <div class="card-title mb-8">Tenant Deposits</div>
      <div class="card" style="padding:0">
    `;

    if (tenants.length === 0) {
      html += `<div class="color-muted fs-13 text-center" style="padding:16px">No active tenants</div>`;
    } else {
      tenants.forEach(t => {
        const expected = t.deposit || 0;
        const given = t.depositGiven !== undefined ? parseFloat(t.depositGiven) : expected;
        const info = DB.getBedInfo(t.bedId);
        
        html += `
          <div class="tenant-card" style="align-items:center">
            <div class="tenant-avatar" style="background:${getAvatarColor(t.name)}">${getInitials(t.name)}</div>
            <div class="tenant-info">
              <div class="tenant-name">${t.name}</div>
              <div class="tenant-meta">📍 ${info?.room?.name || ''}, Bed ${info?.bed?.number || ''}</div>
              <div class="tenant-meta">Expected: ${formatCurrency(expected, cur)}</div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
              <div style="display:flex; align-items:center; gap:6px">
                <span class="fs-12 color-secondary">Given:</span>
                <div style="position:relative">
                  <input type="number" class="form-input" style="width:90px; padding:4px 8px; font-weight:600; text-align:center; height:32px" 
                    value="${given}" 
                    onchange="Rent.updateDepositGiven('${t.id}', this.value)">
                </div>
              </div>
              ${given < expected ? `<span class="badge red" style="font-size:10px; padding:2px 6px">Due: ${formatCurrency(expected - given, cur)}</span>` : `<span class="badge green" style="font-size:10px; padding:2px 6px">✅ Fully Paid</span>`}
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  },

  updateDepositGiven(tenantId, value) {
    const amount = parseFloat(value) || 0;
    DB.updateTenant(tenantId, { depositGiven: amount });
    showToast('Deposit updated', 'success');
    this.render();
  },

  // ── ANALYTICS ─────────────────────────────────────────────
  renderAnalytics(cur) {
    const months = getLast12Months();
    const data = months.map(m => {
      const payments = DB.getPaymentsByMonth(m);
      return payments.reduce((s, p) => s + p.amount, 0);
    });
    const total = data.reduce((s, v) => s + v, 0);
    const avg = data.filter(v => v > 0).length > 0
      ? Math.round(total / data.filter(v => v > 0).length) : 0;
    const maxVal = Math.max(...data);
    const maxMonth = maxVal > 0 ? getMonthLabel(months[data.indexOf(maxVal)]) : '—';

    return `
      <div class="card">
        <div class="analytics-header">
          <div class="analytics-total">${formatCurrency(total, cur)}</div>
          <div class="analytics-label">Total Revenue (Last 12 Months)</div>
        </div>
        <div class="revenue-stats" style="margin-top:12px">
          <div class="rev-stat"><div class="rev-stat-label">Monthly Avg</div><div class="rev-stat-value blue">${formatCurrency(avg, cur)}</div></div>
          <div class="rev-stat"><div class="rev-stat-label">Best Month</div><div class="rev-stat-value green" style="font-size:12px">${maxMonth}</div></div>
        </div>
        <div class="chart-container"><canvas id="revenue-chart"></canvas></div>
      </div>`;
  },

  drawChart(cur) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }

    const months = getLast12Months();
    const data = months.map(m => DB.getPaymentsByMonth(m).reduce((s, p) => s + p.amount, 0));
    const labels = months.map(m => {
      const [y, mo] = m.split('-').map(Number);
      return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((v, i) => months[i] === getCurrentMonth()
            ? 'rgba(34,197,94,0.8)' : 'rgba(14,165,233,0.6)'),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed.y, cur)}` }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 },
            callback: v => v >= 1000 ? (v/1000) + 'k' : v } },
        },
      },
    });
  },

  renderExcelExport(cur) {
    const month = this.activeMonth;
    const tenants = DB.getTenants();
    const payments = DB.getPaymentsByMonth(month);
    const eligibleTenants = tenants.filter(t => DB.getTenantJoiningMonth(t) <= month);
    const totalExpected = eligibleTenants.reduce((s, t) => s + (t.rent || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalPending = Math.max(0, totalExpected - totalCollected);

    return `
      <div class="card" style="margin-bottom:16px; background:linear-gradient(135deg, rgba(34,197,94,0.06), rgba(14,165,233,0.06)); border:1px solid rgba(34,197,94,0.3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <div style="font-size:17px; font-weight:800; color:var(--text-primary);">📊 Rent Collection Sheet (.xlsx)</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">Collection Ledger for ${getMonthLabel(month)}</div>
          </div>
          <button class="btn btn-success" style="padding:8px 16px; font-size:13px; font-weight:700;" onclick="Rent.exportExcel()">
            📥 Download Excel
          </button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; background:var(--bg-card); padding:10px; border-radius:var(--radius-md); border:1px solid var(--border); text-align:center;">
          <div>
            <div style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Expected</div>
            <div style="font-size:14px; font-weight:700; color:var(--accent-blue); margin-top:2px;">${formatCurrency(totalExpected, cur)}</div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Collected</div>
            <div style="font-size:14px; font-weight:800; color:var(--accent-green); margin-top:2px;">${formatCurrency(totalCollected, cur)}</div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Pending</div>
            <div style="font-size:14px; font-weight:700; color:var(--accent-red); margin-top:2px;">${formatCurrency(totalPending, cur)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div class="card-title" style="margin:0;">Sheet Preview (${eligibleTenants.length} Tenants)</div>
          <button class="btn btn-ghost btn-sm" onclick="Rent.exportExcel()">📥 Export CSV/Excel</button>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:12.5px; text-align:left;">
            <thead>
              <tr style="border-bottom:2px solid var(--border); background:var(--bg-input);">
                <th style="padding:8px;">Tenant</th>
                <th style="padding:8px;">Room & Bed</th>
                <th style="padding:8px;">Rent</th>
                <th style="padding:8px;">Paid</th>
                <th style="padding:8px;">Status</th>
                <th style="padding:8px;">Method</th>
              </tr>
            </thead>
            <tbody>
              ${eligibleTenants.map(t => {
                const isPaid = DB.isPaid(t.id, month);
                const p = payments.find(pay => pay.month === month);
                const info = DB.getBedInfo(t.bedId);
                const roomText = `${info?.room?.name || 'Room'}, Bed ${info?.bed?.number || ''}`;
                return `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px; font-weight:600;">${t.name}</td>
                    <td style="padding:8px; color:var(--text-secondary);">${roomText}</td>
                    <td style="padding:8px;">${formatCurrency(t.rent, cur)}</td>
                    <td style="padding:8px; color:${isPaid ? 'var(--accent-green)' : 'var(--text-muted)'}; font-weight:700;">${formatCurrency(isPaid ? (p?.amount || t.rent) : 0, cur)}</td>
                    <td style="padding:8px;"><span class="badge ${isPaid ? 'green' : 'red'}" style="font-size:10px;">${isPaid ? '✓ Paid' : '❌ Due'}</span></td>
                    <td style="padding:8px; color:var(--text-secondary);">${isPaid ? (p?.method || 'UPI') : '-'}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  exportExcel() {
    const month = this.activeMonth;
    const prop = DB.getProperty() || {};
    const tenants = DB.getTenants();
    const payments = DB.getPaymentsByMonth(month);
    const eligibleTenants = tenants.filter(t => DB.getTenantJoiningMonth(t) <= month);

    if (eligibleTenants.length === 0) {
      showToast('No eligible tenants for ' + getMonthLabel(month), 'info');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `PROPERTY RENT COLLECTION SHEET - ${getMonthLabel(month).toUpperCase()}\n`;
    csv += `Property:,"${(prop.name || 'PG Management').replace(/"/g, '""')}"\n`;
    csv += `Owner/Manager:,"${(prop.owner || 'Manager').replace(/"/g, '""')}"\n`;
    csv += `Exported On:,"${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}"\n\n`;

    csv += `"S.No","Tenant Name","Phone Number","Room & Bed","Monthly Rent","Amount Paid","Status","Payment Date","Payment Method","Invoice Number"\n`;

    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;

    eligibleTenants.forEach((t, index) => {
      const isPaid = DB.isPaid(t.id, month);
      const p = payments.find(pay => pay.month === month);
      const info = DB.getBedInfo(t.bedId);
      const roomText = `${info?.room?.name || 'Room'}, Bed ${info?.bed?.number || ''}${info?.floor?.name ? ' (' + info.floor.name + ')' : ''}`;
      const amountPaid = isPaid ? (p?.amount || t.rent) : 0;
      const invoiceNum = isPaid ? (p?.invoiceNumber || `INV-${month.replace('-','')}-${t.id.slice(-3).toUpperCase()}`) : '-';

      totalExpected += t.rent || 0;
      totalCollected += amountPaid;
      if (!isPaid) totalPending += (t.rent || 0);

      const status = isPaid ? 'PAID' : 'PENDING';
      const payDate = isPaid ? formatDateDisplay(p?.date) : '-';
      const payMethod = isPaid ? (p?.method || 'UPI') : '-';

      csv += `"${index + 1}","${(t.name || '').replace(/"/g, '""')}","${t.phone || ''}","${roomText.replace(/"/g, '""')}","${t.rent || 0}","${amountPaid}","${status}","${payDate}","${payMethod}","${invoiceNum}"\n`;
    });

    csv += `\n"","TOTAL EXPECTED","","","${totalExpected}","","","","",""\n`;
    csv += `"","TOTAL COLLECTED","","","${totalCollected}","","","","",""\n`;
    csv += `"","TOTAL PENDING","","","${totalPending}","","","","",""\n`;

    const fileName = `Rent_Collection_Sheet_${month}_${(prop.name || 'PG').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`📊 Rent Collection Sheet for ${getMonthLabel(month)} exported!`, 'success');
  },
};
