// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — WHATSAPP AUTOMATION
// ============================================================

const WhatsApp = {

  // In-memory session tracking for WhatsApp reminders modal status indicators
  _sessionSent: new Set(),

  resetSessionIndicators() {
    this._sessionSent = new Set();
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.includes('_wa_sent_')) localStorage.removeItem(k);
      });
    } catch (e) {}
  },

  // Check if today is reminder day and show banner
  checkAndPromptReminder() {
    const cfg = DB.getWAConfig();
    if (!cfg.enabled) return;

    const today = new Date().getDate();
    if (today !== cfg.reminderDay) return;

    const currentMonth = getCurrentMonth();
    const remindedMonth = DB.getRemindedMonth();
    if (remindedMonth === currentMonth) return; // Already reminded this month

    const stats = DB.getStats();
    const unpaid = stats.unpaidTenants;
    if (unpaid.length === 0) return;

    // Show banner
    this.showReminderBanner(unpaid.length, currentMonth);

    // Fire browser notification
    this.fireNotification(unpaid.length, currentMonth);
  },

  showReminderBanner(count, month) {
    const existing = document.getElementById('wa-reminder-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'wa-reminder-banner';
    banner.className = 'whatsapp-banner';
    banner.style.margin = '0 16px';
    banner.innerHTML = `
      <span class="whatsapp-banner-icon">📲</span>
      <div class="whatsapp-banner-content">
        <div class="whatsapp-banner-title">Rent Reminder Day!</div>
        <div class="whatsapp-banner-sub">${count} tenants haven't paid for ${getMonthLabel(month)}</div>
      </div>
      <button class="whatsapp-banner-btn" onclick="WhatsApp.openReminderModal()">Send Now</button>
    `;

    const dashScroll = document.getElementById('dash-scroll');
    if (dashScroll) dashScroll.prepend(banner);
  },

  fireNotification(count, month) {
    if (!('Notification' in window)) return;
    const prop = DB.getProperty();
    const send = () => {
      if (Notification.permission === 'granted') {
        new Notification(`🔔 ${prop.name} — Rent Reminder`, {
          body: `${count} tenants haven't paid rent for ${getMonthLabel(month)}. Tap to send WhatsApp reminders.`,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏠</text></svg>',
          tag: 'rent-reminder',
        });
      }
    };

    if (Notification.permission === 'default') {
      Notification.requestPermission().then(send);
    } else {
      send();
    }
  },

  buildMessage(tenant, month) {
    const cfg = DB.getWAConfig();
    const prop = DB.getProperty();
    const upiId = (DB.getBankId() || '').trim();
    const amountStr = Number(tenant.rent).toLocaleString('en-IN');
    const cur = prop.currency || '₹';
    const monthLabel = getMonthLabel(month);

    let baseMsg = cfg.template
      .replace(/{name}/g, tenant.name)
      .replace(/{amount}/g, amountStr)
      .replace(/{currency}/g, cur)
      .replace(/{month}/g, monthLabel)
      .replace(/{property}/g, prop.name)
      .replace(/{owner}/g, prop.owner);

    // Append payment instructions with exact required wording
    if (upiId) {
      baseMsg += `\n\n━━━━━━━━━━━━━━━━━━\n💳 *PAYMENT INSTRUCTIONS:*\n👉 *Pay on the below given QR code*\n📱 *Bank UPI ID:* ${upiId}\n\n*(Please share a screenshot or transaction reference after payment)*`;
    }

    return baseMsg;
  },

  buildWALink(phone, message, allowChooser = false) {
    const cfg = DB.getWAConfig();
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone && !allowChooser) {
      const fullPhone = cleanPhone.startsWith(cfg.countryCode) ? cleanPhone : cfg.countryCode + cleanPhone;
      return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    }
    // No phone provided or contact chooser requested: open WhatsApp contact picker
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  },

  async generateReminderQRCard(tenant, month) {
    const prop = DB.getProperty();
    const upiId = (DB.getBankId() || '').trim();
    if (!upiId) return null;
    const amountStr = Number(tenant.rent).toLocaleString('en-IN');
    const cur = prop.currency || '₹';
    const monthLabel = getMonthLabel(month);
    const info = DB.getBedInfo ? DB.getBedInfo(tenant.bedId) : null;
    const roomText = info ? `${info.room?.name || 'Room'}, Bed ${info.bed?.number || ''}` : 'Accommodation';

    const width = 600;
    const height = 820;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Helper: roundRect
    const roundRect = (c, x, y, w, h, r) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };

    // 1. Background (Premium clean white card with subtle gradient header)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Top Brand Gradient Bar
    const grad = ctx.createLinearGradient(0, 0, width, 140);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#0284C7');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, width, 130, 0);
    ctx.fill();

    // Subtle Outer Border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // 2. PG Logo & Header inside top bar
    let logoDrawn = false;
    const activeLogo = DB.getLogo();
    if (activeLogo && typeof ImageUtils !== 'undefined' && ImageUtils.loadCleanImage) {
      try {
        const lImg = await ImageUtils.loadCleanImage(activeLogo);
        if (lImg && lImg.naturalWidth > 0) {
          ctx.save();
          roundRect(ctx, 32, 28, 74, 74, 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.clip();
          ctx.drawImage(lImg, 32, 28, 74, 74);
          ctx.restore();
          logoDrawn = true;
        }
      } catch (e) {}
    }

    const textLeft = logoDrawn ? 122 : 36;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(prop.name, textLeft, 58);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Official Rent Payment QR · ${monthLabel}`, textLeft, 82);

    // 3. Distinctive Banner: "👉 PAY ON THIS QR CODE"
    const bannerY = 148;
    const bGrad = ctx.createLinearGradient(36, bannerY, width - 36, bannerY);
    bGrad.addColorStop(0, '#16A34A');
    bGrad.addColorStop(1, '#059669');
    ctx.fillStyle = bGrad;
    roundRect(ctx, 36, bannerY, width - 72, 46, 12);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👉 PAY ON THIS QR CODE', width / 2, bannerY + 29);

    // 4. White QR Container
    const qrBoxY = 210;
    const qrBoxSize = 310;
    const qrBoxX = (width - qrBoxSize) / 2;

    ctx.fillStyle = '#F8FAFC';
    roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
    ctx.stroke();

    // 5. Fetch & Draw QR Code
    const cleanProp = encodeURIComponent(prop.name);
    const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${cleanProp}&am=${tenant.rent}&cu=INR&tn=Rent+Payment`;

    let qrDrawn = false;
    // Primary: Instant, 100% offline pure-JS vector QR drawing (100% origin-clean, never taints canvas)
    if (typeof QRCode !== 'undefined' && QRCode.drawToCanvas) {
      try {
        QRCode.drawToCanvas(ctx, upiPayload, qrBoxX + 20, qrBoxY + 20, 270, 8);
        qrDrawn = true;
      } catch (err) {
        console.warn('Offline QRCode draw failed, falling back to clean loader:', err);
      }
    }

    // Secondary fallback: external QR API with clean loader if QRCode library unavailable
    if (!qrDrawn) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiPayload)}&size=270x270&margin=8`;
      if (typeof ImageUtils !== 'undefined' && ImageUtils.loadCleanImage) {
        try {
          const qrImg = await ImageUtils.loadCleanImage(qrUrl);
          if (qrImg && qrImg.naturalWidth > 0) {
            ctx.drawImage(qrImg, qrBoxX + 20, qrBoxY + 20, 270, 270);
            qrDrawn = true;
          }
        } catch (e) {}
      }
    }

    if (!qrDrawn) {
      // Offline fallback: draw a clean placeholder message
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan with GPay / PhonePe / Paytm', width / 2, qrBoxY + 140);
      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(upiId, width / 2, qrBoxY + 175);
    }

    // 6. Tenant & Rent Info Section
    const infoY = 540;
    ctx.fillStyle = '#F1F5F9';
    roundRect(ctx, 36, infoY, width - 72, 180, 16);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    roundRect(ctx, 36, infoY, width - 72, 180, 16);
    ctx.stroke();

    // Tenant info row
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('TENANT & ROOM', 56, infoY + 28);
    ctx.fillText('RENT DUE AMOUNT', width - 220, infoY + 28);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(tenant.name, 56, infoY + 54);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${cur}${amountStr}`, width - 56, infoY + 56);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`📍 ${roomText}`, 56, infoY + 78);

    // Divider line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, infoY + 98);
    ctx.lineTo(width - 56, infoY + 98);
    ctx.stroke();

    // Bank UPI ID badge
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Bank UPI ID:', 56, infoY + 128);

    // Pill for UPI ID
    ctx.fillStyle = '#E0F2FE';
    roundRect(ctx, 160, infoY + 110, 240, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#0369A1';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(upiId, 172, infoY + 129);

    ctx.fillStyle = '#64748B';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Beneficiary: ${prop.name}`, 56, infoY + 158);

    // 7. Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓ Accepted on Google Pay · PhonePe · Paytm · BHIM & Any UPI App', width / 2, height - 36);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Please verify the payee name before completing the payment.', width / 2, height - 18);

    return canvas;
  },

  async generateReminderQRCardBlob(tenant, month) {
    const canvas = await this.generateReminderQRCard(tenant, month);
    if (!canvas) return null;
    return new Promise((resolve) => {
      try {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 0.95);
      } catch (err) {
        console.error('Error exporting QR canvas to blob:', err);
        resolve(null);
      }
    });
  },

  async sendReminder(tenant, month, options = {}) {
    if (!DB.hasBankId()) {
      showToast('⚠️ Please set your Bank UPI ID first to generate payment QR reminders.', 'warning');
      if (typeof Settings !== 'undefined' && Settings.showPaymentSetupModal) {
        Settings.showPaymentSetupModal();
      }
      return;
    }

    const msg = this.buildMessage(tenant, month);
    this.markReminded(tenant.id, month);

    try {
      showToast(`⏳ Preparing payment QR reminder for ${tenant.name}...`, 'info');
      const blob = await this.generateReminderQRCardBlob(tenant, month);

      if (blob) {
        const fileName = `${tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Rent_Payment_QR.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        let canShare = false;
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            canShare = true;
          }
        } catch (e) {
          canShare = false;
        }

        if (canShare) {
          try {
            await navigator.share({
              title: `${DB.getProperty().name} — Rent Reminder`,
              text: msg,
              files: [file]
            });
            showToast(`✅ Payment QR reminder shared to ${tenant.name}!`, 'success');
            return;
          } catch (err) {
            if (err.name === 'AbortError') return; // User closed native share picker
            console.warn('Native share failed, falling back:', err);
          }
        }

        // Direct file share not supported (e.g. desktop):
        // Automatically download the QR card image and open WhatsApp with pre-filled message
        try {
          const a = document.createElement('a');
          a.download = fileName;
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        } catch (e) {}

        const waLink = this.buildWALink(options.chooseContact ? '' : tenant.phone, msg);
        window.open(waLink, '_blank');
        showToast('📥 Payment QR downloaded & WhatsApp opened! Please attach the QR image to your chat.', 'info');
        return;
      }

      // If blob generation failed, open WhatsApp with text
      const fallbackLink = this.buildWALink(options.chooseContact ? '' : tenant.phone, msg);
      window.open(fallbackLink, '_blank');
    } catch (e) {
      console.error('Error generating reminder QR:', e);
      const link = this.buildWALink(options.chooseContact ? '' : tenant.phone, msg);
      window.open(link, '_blank');
    }
  },

  markReminded(tenantId, month) {
    if (!this._sessionSent) this._sessionSent = new Set();
    this._sessionSent.add(`${tenantId}_${month}`);
    DB.setRemindedMonth(month);
  },

  isReminded(tenantId, month) {
    if (!this._sessionSent) return false;
    return this._sessionSent.has(`${tenantId}_${month}`);
  },

  async sendAllReminders(tenants, month, onProgress) {
    for (let i = 0; i < tenants.length; i++) {
      await this.sendReminder(tenants[i], month);
      if (onProgress) onProgress(i + 1, tenants.length);
      if (i < tenants.length - 1) {
        await new Promise(r => setTimeout(r, 1800));
      }
    }
    DB.setRemindedMonth(month);
    showToast('✅ All reminders sent!', 'success');
  },

  openReminderModal() {
    const currentMonth = getCurrentMonth();
    const tenants = DB.getTenants().filter(t => !DB.isPaid(t.id, currentMonth));

    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.textContent = '📲 WhatsApp Rent Reminders';

    if (tenants.length === 0) {
      body.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">All tenants have paid!</div><div class="empty-sub">No reminders needed this month.</div></div>`;
      openModal();
      return;
    }

    const rows = tenants.map(t => {
      const reminded = this.isReminded(t.id, currentMonth);
      return `
        <div class="reminder-item" id="ri-${t.id}">
          <div class="tenant-avatar" style="background:${getAvatarColor(t.name)};width:40px;height:40px;font-size:15px">${getInitials(t.name)}</div>
          <div class="reminder-info">
            <div class="reminder-name">${t.name}</div>
            <div class="reminder-meta">📱 ${t.phone} · Due: ${formatCurrency(t.rent, DB.getProperty().currency)}</div>
          </div>
          <div>
            <span class="reminder-status ${reminded ? 'sent' : 'pending'}" id="rs-${t.id}">${reminded ? '✓ Sent' : 'Pending'}</span>
          </div>
          <div style="display:flex; align-items:center;">
            <button class="btn btn-whatsapp btn-sm" onclick="WhatsApp._sendOne('${t.id}')" title="Share Payment QR reminder on WhatsApp">📲 Share</button>
          </div>
        </div>`;
    }).join('');

    body.innerHTML = `
      <div style="background:var(--bg-input);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;border:1px solid var(--border)">
        <span style="font-size:18px">💡</span>
        <span style="font-size:12px;color:var(--text-secondary);line-height:1.4">
          Tap <strong>📲 Share</strong> to share the official Payment QR reminder with the tenant.
        </span>
      </div>
      ${DB.hasBankId() ? `
      <div style="background:var(--bg-input);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;border:1px solid var(--border)">
        <span style="font-size:20px">💳</span>
        <span style="font-size:12px;color:var(--text-secondary);line-height:1.4">
          Each reminder includes your official <strong>Payment QR Card</strong> (Bank UPI: <strong>${(DB.getBankId() || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>).
        </span>
      </div>` : `
      <div style="background:rgba(239,68,68,0.08);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(239,68,68,0.3)">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">⚠️</span>
          <span style="font-size:12px;color:var(--danger, #ef4444);line-height:1.4;font-weight:600">
            Bank UPI ID is compulsory! Please add your Bank UPI ID to attach your payment QR code.
          </span>
        </div>
        <button class="btn btn-primary btn-xs" style="white-space:nowrap;padding:4px 10px;font-size:11px" onclick="Settings.showPaymentSetupModal()">+ Add Bank ID</button>
      </div>`}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div class="card-title" style="font-size:14px;font-weight:700; margin:0">Unpaid Tenants (${tenants.length})</div>
        <button class="btn btn-outline btn-xs" onclick="WhatsApp.shareReminderChooser()" style="display:inline-flex; align-items:center; gap:4px; font-weight:600;">
          <span>📲 Share to Any Contact</span>
        </button>
      </div>
      ${rows}
    `;

    openModal();
  },

  async shareReminderChooser(tenantId) {
    if (!DB.hasBankId()) {
      showToast('⚠️ Please set your Bank UPI ID first to generate payment QR reminders.', 'warning');
      if (typeof Settings !== 'undefined' && Settings.showPaymentSetupModal) {
        Settings.showPaymentSetupModal();
      }
      return;
    }
    const currentMonth = getCurrentMonth();
    let tenant = tenantId ? DB.getTenantById(tenantId) : null;
    if (!tenant) {
      const unpaid = DB.getTenants().filter(t => !DB.isPaid(t.id, currentMonth));
      tenant = unpaid[0] || DB.getTenants()[0];
    }
    if (!tenant) return showToast('No tenant found to share reminder.', 'warning');
    await this.sendReminder(tenant, currentMonth, { chooseContact: true });
  },

  async _sendOne(tenantId) {
    if (!DB.hasBankId()) {
      showToast('⚠️ Please set your Bank UPI ID first to generate payment QR reminders.', 'warning');
      if (typeof Settings !== 'undefined' && Settings.showPaymentSetupModal) {
        Settings.showPaymentSetupModal();
      }
      return;
    }
    const tenant = DB.getTenantById(tenantId);
    if (!tenant) return;
    const month = getCurrentMonth();
    await this.sendReminder(tenant, month);
    const statusEl = document.getElementById(`rs-${tenantId}`);
    if (statusEl) { statusEl.textContent = '✓ Sent'; statusEl.className = 'reminder-status sent'; }
    showToast(`📲 Reminder sent to ${tenant.name}`, 'success');
  },

  async _sendAll() {
    if (!DB.hasBankId()) {
      showToast('⚠️ Please set your Bank UPI ID first to generate payment QR reminders.', 'warning');
      if (typeof Settings !== 'undefined' && Settings.showPaymentSetupModal) {
        Settings.showPaymentSetupModal();
      }
      return;
    }
    const btn = document.getElementById('send-all-btn');
    if (btn) btn.disabled = true;
    const currentMonth = getCurrentMonth();
    const tenants = DB.getTenants().filter(t => !DB.isPaid(t.id, currentMonth));

    await this.sendAllReminders(tenants, currentMonth, (done, total) => {
      if (btn) btn.textContent = `📲 Sending... (${done}/${total})`;
      const t = tenants[done - 1];
      const statusEl = document.getElementById(`rs-${t.id}`);
      if (statusEl) { statusEl.textContent = '✓ Sent'; statusEl.className = 'reminder-status sent'; }
    });

    if (btn) { btn.textContent = '✅ All Sent!'; btn.disabled = false; }
  },
};
