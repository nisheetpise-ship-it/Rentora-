// ============================================================
// RENTORA — SUBSCRIPTION, 10-DAY TRIAL & FAMGATEWAY PAYMENT ENGINE
// 10-Day Trial, ₹1,500/30-Day Manual Renewal, Real-Time UPI Verification
// Powered by Rentora & FamGateway
// ============================================================

const Subscription = {
  activeOrder: null,
  pollTimer: null,
  countdownInterval: null,
  remainingSeconds: 600, // 10 minutes standard expiry

  getBaseUrl() {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return 'http://localhost:3000';
    }
    return '';
  },

  // ── INITIALIZE ON APP LOAD ─────────────────────────────────
  async init() {
    try {
      const sub = await DB.syncSubscriptionWithServer();
      this.updateUI(sub);

      if (sub && sub.isExpired) {
        console.warn('[Subscription] Subscription expired for user:', sub.userId);
      }
    } catch (e) {
      console.warn('[Subscription] Init warning:', e);
      this.updateUI(DB.getSubscription());
    }
  },

  // ── UPDATE UI ACROSS SCREENS ───────────────────────────────
  updateUI(sub) {
    const data = sub || DB.getSubscription();
    this.renderDashboardCard(data);
    this.updateHeaderBadge(data);
  },

  // ── HEADER BADGE INDICATOR ─────────────────────────────────
  updateHeaderBadge(sub) {
    const existing = document.getElementById('header-sub-badge');
    if (existing) existing.remove();

    const titleEl = document.getElementById('header-title');
    if (!titleEl || !titleEl.parentNode) return;

    const badge = document.createElement('div');
    badge.id = 'header-sub-badge';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '4px';
    badge.style.fontSize = '10.5px';
    badge.style.fontWeight = '700';
    badge.style.padding = '2px 8px';
    badge.style.borderRadius = 'var(--radius-full)';
    badge.style.marginLeft = '8px';
    badge.style.cursor = 'pointer';
    badge.onclick = () => Subscription.openPaywallModal();

    if (sub.status === 'active' && !sub.isExpired) {
      badge.style.background = 'rgba(34, 197, 94, 0.15)';
      badge.style.color = 'var(--accent-green)';
      badge.style.border = '1px solid rgba(34, 197, 94, 0.3)';
      badge.innerHTML = `<span>👑 Premium</span> · <span>${sub.daysRemaining}d</span>`;
    } else if (sub.status === 'trial' && !sub.isExpired) {
      badge.style.background = 'rgba(56, 189, 248, 0.15)';
      badge.style.color = 'var(--accent-blue)';
      badge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      badge.innerHTML = sub.daysRemaining > 0 
        ? `<span>⭐ Trial</span> · <span>${sub.daysRemaining}d left</span>`
        : `<span>⏳ Trial</span> · <span>${sub.hoursRemaining}h left</span>`;
    } else {
      badge.style.background = 'rgba(239, 68, 68, 0.15)';
      badge.style.color = 'var(--accent-red)';
      badge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      badge.innerHTML = `<span>⚠️ Expired</span> · <span>Renew</span>`;
    }

    titleEl.parentNode.insertBefore(badge, titleEl.nextSibling);
  },

  // ── DASHBOARD COUNTDOWN CARD ───────────────────────────────
  renderDashboardCard(sub) {
    const slot = document.getElementById('dash-subscription-slot');
    if (!slot) return;

    const data = sub || DB.getSubscription();
    const isTrial = data.status === 'trial';
    const isActive = data.status === 'active' && !data.isExpired;
    const isExpired = data.isExpired || data.status === 'expired';

    const startDate = data.trialStartedAt ? new Date(data.trialStartedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active';
    const expDate = data.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '10 Days';

    let countdownText = '';
    if (data.daysRemaining > 1) {
      countdownText = `ends in <strong>${data.daysRemaining} days</strong>`;
    } else if (data.daysRemaining === 1) {
      countdownText = `ends in <strong>1 day (${data.hoursRemaining}h remaining)</strong>`;
    } else {
      countdownText = `ends in <strong style="color:var(--accent-red)">${data.hoursRemaining}h ${data.minutesRemaining}m</strong>`;
    }

    let cardHtml = '';

    if (isTrial && !isExpired) {
      cardHtml = `
        <div class="card" style="background:linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%); border:1.5px solid rgba(56, 189, 248, 0.35); border-radius:var(--radius-xl); padding:16px; margin-bottom:14px; position:relative; overflow:hidden">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
            <span class="badge" style="background:rgba(56, 189, 248, 0.2); color:var(--accent-blue); font-weight:800; font-size:11px; padding:3px 9px; border-radius:var(--radius-full); border:1px solid rgba(56, 189, 248, 0.4)">
              ⭐ 10-DAY FREE TRIAL ACTIVE
            </span>
          </div>

          <div style="font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:4px">
            Your free trial ${countdownText}
          </div>

          <div style="font-size:12px; color:var(--text-secondary); line-height:1.4; margin-bottom:12px">
            Enjoy unlimited rooms, tenant management, automated WhatsApp rent reminders, and invoices.
            <div style="font-size:11px; color:var(--text-muted); margin-top:3px">
              Started: <strong>${startDate}</strong> · Expiry: <strong>${expDate}</strong>
            </div>
          </div>

          <div>
            <button type="button" class="btn btn-primary btn-full" onclick="Subscription.openPaywallModal()" style="padding:10px 14px; font-size:13px; font-weight:700">
              ⚡ Upgrade to Premium — ₹1 / 30 Days
            </button>
          </div>
        </div>
      `;
    } else if (isActive) {
      cardHtml = `
        <div class="card" style="background:linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%); border:1.5px solid rgba(34, 197, 94, 0.35); border-radius:var(--radius-xl); padding:16px; margin-bottom:14px">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
            <span class="badge" style="background:rgba(34, 197, 94, 0.2); color:var(--accent-green); font-weight:800; font-size:11px; padding:3px 9px; border-radius:var(--radius-full); border:1px solid rgba(34, 197, 94, 0.4)">
              👑 RENTORA PREMIUM ACTIVE
            </span>
          </div>

          <div style="font-size:15px; font-weight:800; color:var(--text-primary); margin-bottom:3px">
            Premium access valid until <strong style="color:var(--accent-green)">${expDate}</strong>
          </div>

          <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px">
            You have <strong>${data.daysRemaining} days remaining</strong>. Renew anytime to add +30 days seamlessly.
          </div>

          <div>
            <button type="button" class="btn btn-secondary btn-full" onclick="Subscription.openPaywallModal()" style="padding:9px 12px; font-size:12.5px; font-weight:700">
              🔄 Extend Subscription (+30 Days for ₹1)
            </button>
          </div>
        </div>
      `;
    } else {
      cardHtml = `
        <div class="card" style="background:linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%); border:2px solid var(--accent-red); border-radius:var(--radius-xl); padding:16px; margin-bottom:14px">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
            <span class="badge" style="background:rgba(239, 68, 68, 0.2); color:var(--accent-red); font-weight:800; font-size:11px; padding:3px 9px; border-radius:var(--radius-full); border:1px solid rgba(239, 68, 68, 0.4)">
              ⚠️ SUBSCRIPTION EXPIRED
            </span>
          </div>

          <div style="font-size:16px; font-weight:800; color:var(--accent-red); margin-bottom:4px">
            Your 10-Day Free Trial Has Ended
          </div>

          <div style="font-size:12px; color:var(--text-secondary); line-height:1.4; margin-bottom:12px">
            Your commercial PG data, rooms, and tenant records are 100% safe. Activate Rentora Premium to restore full feature access.
          </div>

          <div>
            <button type="button" class="btn btn-primary btn-full" onclick="Subscription.openPaywallModal()" style="padding:10px 14px; font-size:13px; font-weight:700">
              🚀 Activate Premium — ₹1 / 30 Days
            </button>
          </div>
        </div>
      `;
    }

    slot.innerHTML = cardHtml;
  },

  // ── PREMIUM PAYWALL MODAL ──────────────────────────────────
  openPaywallModal(reason = '') {
    const existing = document.getElementById('modal-paywall');
    if (existing) existing.remove();

    const sub = DB.getSubscription();
    const isExpired = sub.isExpired || sub.status === 'expired';

    const modal = document.createElement('div');
    modal.id = 'modal-paywall';
    modal.className = 'modal-overlay open';
    modal.style.zIndex = '99999';

    modal.innerHTML = `
      <div class="modal-sheet" style="max-width:480px; max-height:92vh; overflow-y:auto; border-radius:var(--radius-2xl)">
        <div class="modal-handle"></div>

        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px">
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:46px; height:46px; border-radius:var(--radius-lg); background:linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%); display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 4px 14px rgba(56, 189, 248, 0.3)">
              👑
            </div>
            <div>
              <h2 style="font-size:18px; font-weight:800; color:var(--text-primary); margin:0">
                ${isExpired ? 'Your 10-Day Free Trial Has Ended' : 'Rentora Premium Subscription'}
              </h2>
              <p style="font-size:12px; color:var(--text-secondary); margin:2px 0 0">
                ${isExpired ? 'Continue using Rentora Premium by activating your subscription.' : 'Commercial PG & Coliving Cloud Platform'}
              </p>
            </div>
          </div>
          <button type="button" class="btn-ghost" onclick="document.getElementById('modal-paywall').remove()" style="font-size:18px; padding:4px 8px; border:none; background:none; cursor:pointer">✕</button>
        </div>

        ${reason ? `
          <div style="background:rgba(239, 68, 68, 0.12); border:1px solid rgba(239, 68, 68, 0.3); border-radius:var(--radius-md); padding:10px 12px; margin-bottom:14px; font-size:12px; color:var(--accent-red)">
            ⚠️ <strong>Premium Feature:</strong> ${reason}
          </div>
        ` : ''}

        <!-- Pricing Card -->
        <div style="background:var(--bg-input); border:2px solid var(--accent-blue); border-radius:var(--radius-xl); padding:16px; margin-bottom:16px; position:relative">
          <div style="position:absolute; right:14px; top:14px; background:var(--accent-blue); color:#fff; font-size:10px; font-weight:800; padding:2px 8px; border-radius:var(--radius-full)">
            TRIAL TESTING MODE
          </div>
          <div style="font-size:13px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px">Rentora Premium</div>
          <div style="display:flex; align-items:baseline; gap:6px; margin:4px 0 8px">
            <span style="font-size:32px; font-weight:800; color:var(--text-primary)">₹1</span>
            <span style="font-size:14px; color:var(--text-secondary); font-weight:600">/ 30 Days</span>
          </div>
          <div style="font-size:12px; color:var(--text-secondary); line-height:1.4">
            Trial test rate. Manual renewal via official UPI.
          </div>
        </div>

        <!-- Benefits List -->
        <div style="margin-bottom:18px; font-size:12.5px; color:var(--text-primary); line-height:1.8">
          <div style="display:flex; align-items:center; gap:8px"><span>✅</span> <strong>Unlimited Rooms, Beds &amp; Tenant Profiles</strong></div>
          <div style="display:flex; align-items:center; gap:8px"><span>✅</span> <strong>Automated 1-Click WhatsApp Rent Reminders &amp; Receipts</strong></div>
          <div style="display:flex; align-items:center; gap:8px"><span>✅</span> <strong>Govt-Compliant Police Verification &amp; Rent Agreements</strong></div>
          <div style="display:flex; align-items:center; gap:8px"><span>✅</span> <strong>Real-time Payment QR Code with 0% Gateway Commission</strong></div>
          <div style="display:flex; align-items:center; gap:8px"><span>✅</span> <strong>Secure Cloud Partition &amp; Automated Financial Bookkeeping</strong></div>
        </div>

        <!-- Safe Data Reassurance Note -->
        <div style="background:rgba(34, 197, 94, 0.1); border:1px solid rgba(34, 197, 94, 0.3); border-radius:var(--radius-md); padding:10px 12px; margin-bottom:16px; font-size:12px; color:var(--accent-green)">
          🛡️ <strong>Your Data is 100% Safe:</strong> Your tenant records, bed configs, and payment history remain securely preserved.
        </div>

        <!-- Action Button -->
        <button type="button" class="btn btn-primary btn-full btn-lg" onclick="Subscription.startCheckout()" style="font-size:15px; font-weight:800; padding:12px 16px; box-shadow:0 4px 16px rgba(56, 189, 248, 0.35)">
          ⚡ Activate Premium — ₹1
        </button>

        <div style="text-align:center; margin-top:12px; font-size:11.5px; color:var(--text-muted)">
          Powered by FamGateway Official Instant UPI Verification
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  // ── START CHECKOUT & GENERATE FAMGATEWAY ORDER ──────────────
  async startCheckout() {
    const paywallModal = document.getElementById('modal-paywall');
    if (paywallModal) paywallModal.remove();

    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    const userId = user ? user.uid : (typeof Auth !== 'undefined' && Auth.getUserId ? Auth.getUserId() : 'default_owner');
    const customerName = user ? (user.name || 'Rentora PG Owner') : 'Rentora PG Owner';
    const customerEmail = user ? (user.email || 'owner@rentora.com') : 'owner@rentora.com';

    this.openCheckoutModal({
      state: 'loading',
      title: 'Connecting to FamGateway...',
      amount: 1.00
    });

    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/subscription/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          workspaceId: 'ws_' + userId,
          customerName,
          customerEmail
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Payment provider rejected session creation.');
      }

      this.activeOrder = data;
      this.remainingSeconds = data.validitySeconds || 600; // 10 minutes

      this.renderActiveCheckoutSheet(data);
      this.startCountdownTimer();
      this.startVerificationPolling(data.providerOrderId, userId);

    } catch (err) {
      console.error('[Subscription] startCheckout error:', err);
      const isNetworkErr = err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('Network');
      
      this.openCheckoutModal({
        state: 'error',
        title: isNetworkErr ? 'Server Offline / Not Running' : 'Payment Session Error',
        message: isNetworkErr
          ? 'Real-time UPI payment generation requires the Rentora backend server.<br><br>Please double-click <strong>start-app.bat</strong> in your rentora folder to start the server at <code>http://localhost:3000</code>, then click Retry below.'
          : err.message,
        canRetry: isNetworkErr
      });
    }
  },

  // ── RENDER ACTIVE CHECKOUT SHEET ───────────────────────────
  renderActiveCheckoutSheet(order) {
    const modal = document.getElementById('modal-checkout');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-sheet" style="max-width:440px; max-height:92vh; overflow-y:auto; border-radius:var(--radius-2xl); text-align:center">
        <div class="modal-handle"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <div style="font-size:12px; font-weight:800; color:var(--accent-blue); text-transform:uppercase; letter-spacing:0.5px">
            Official UPI Checkout
          </div>
          <button type="button" class="btn-ghost" onclick="Subscription.closeCheckout()" style="font-size:18px; padding:2px 8px; border:none; background:none; cursor:pointer">✕</button>
        </div>

        <div style="margin-bottom:12px">
          <div style="font-size:28px; font-weight:900; color:var(--text-primary)">₹${order.amount.toLocaleString('en-IN')}</div>
          <div style="font-size:12px; color:var(--text-secondary)">Rentora Premium · 30 Days Access</div>
        </div>

        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(245, 158, 11, 0.12); border:1px solid rgba(245, 158, 11, 0.35); border-radius:var(--radius-full); padding:4px 14px; margin-bottom:14px; font-size:12px; font-weight:700; color:#d97706">
          <span>⏳ Session Expires In:</span>
          <span id="chk-timer-display" style="font-family:monospace; font-size:13px; font-weight:800">10:00</span>
        </div>

        <div style="background:#FFFFFF; border:2px solid var(--border); border-radius:var(--radius-xl); padding:16px; margin:0 auto 14px; display:inline-block; box-shadow:0 8px 24px rgba(0,0,0,0.08)">
          <div id="chk-qr-holder" style="width:190px; height:190px; margin:0 auto; display:flex; align-items:center; justify-content:center">
            ${order.qrUrl 
              ? `<img src="${order.qrUrl}" alt="UPI QR" style="width:100%; height:100%; object-fit:contain" onerror="Subscription.renderQrFallback('${order.upiIntent}')">`
              : `<div id="chk-qr-canvas"></div>`
            }
          </div>
          <div style="font-size:11px; font-weight:700; color:#475569; margin-top:8px">
            Scan with any UPI App (GPay, PhonePe, Paytm)
          </div>
        </div>

        <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-lg); padding:10px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center">
          <div style="text-align:left">
            <span style="font-size:10px; color:var(--text-muted); display:block; text-transform:uppercase">Receiving UPI ID</span>
            <strong style="font-size:13.5px; color:var(--text-primary)">${order.upiId || 'richnisheet@fam'}</strong>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="Subscription.copyUpi('${order.upiId || 'richnisheet@fam'}')" id="btn-copy-upi" style="font-size:11px; padding:4px 10px">
            📋 Copy
          </button>
        </div>

        ${(order.upiIntent || true) ? `
          <a href="${order.upiIntent || 'upi://pay?pa=richnisheet@fam&pn=Rentora%20Subscription&am=1.00&cu=INR&tn=Rentora%20Subscription%2030%20Days'}" class="btn btn-primary btn-full" style="margin-bottom:12px; font-weight:800; font-size:13.5px; padding:11px; text-decoration:none; display:block">
            📲 Pay via UPI App (PhonePe / GPay / Paytm)
          </a>
        ` : ''}

        <div id="chk-poll-status-box" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:10px 12px; font-size:12px; color:var(--text-secondary); display:flex; align-items:center; justify-content:center; gap:8px">
          <div class="ob-launch-spinner" style="width:14px; height:14px; border-width:2px"></div>
          <span id="chk-poll-msg">Awaiting payment confirmation from bank...</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:6px; line-height:1.4">
          ℹ️ <em>Once approved in your UPI app, bank verification reflects in approx. 30–60 seconds. Please keep this screen open.</em>
        </div>

        <!-- Manual 12-Digit UTR Fallback -->
        <div style="margin-top:14px; border-top:1px dashed var(--border); padding-top:12px; text-align:left">
          <div style="font-size:11.5px; font-weight:700; color:var(--text-secondary); margin-bottom:6px">
            Already paid? Enter 12-digit UTR for instant activation:
          </div>
          <div style="display:flex; gap:6px">
            <input type="text" id="chk-utr-input" placeholder="e.g. 630723042227" maxlength="16" class="form-input" style="font-size:12px; padding:7px 10px; font-family:monospace; flex:1" />
            <button type="button" class="btn btn-primary btn-sm" onclick="Subscription.submitManualUtr()" id="btn-submit-utr" style="font-size:11.5px; padding:7px 12px; font-weight:800; white-space:nowrap">
              Verify UTR
            </button>
          </div>
          <div id="chk-utr-err" style="font-size:11px; color:var(--accent-red); margin-top:4px; display:none"></div>
        </div>

        <div style="margin-top:14px; font-size:11px; color:var(--text-muted)">
          Order ID: <code style="color:var(--text-primary)">${order.providerOrderId}</code> · Ref: <code>${order.internalPaymentId}</code>
        </div>
      </div>
    `;

    if (!order.qrUrl && typeof QRCode !== 'undefined') {
      const holder = document.getElementById('chk-qr-holder');
      if (holder) {
        holder.innerHTML = '';
        new QRCode(holder, {
          text: order.upiIntent,
          width: 190,
          height: 190,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }
  },

  renderQrFallback(intentStr) {
    const holder = document.getElementById('chk-qr-holder');
    if (!holder || typeof QRCode === 'undefined') return;
    holder.innerHTML = '';
    const safeIntent = intentStr || 'upi://pay?pa=richnisheet@fam&pn=Rentora%20Subscription&am=1.00&cu=INR&tn=Rentora%20Subscription%2030%20Days';
    new QRCode(holder, {
      text: safeIntent,
      width: 190,
      height: 190,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  },

  // ── COUNTDOWN TIMER (10 MINUTES) ───────────────────────────
  startCountdownTimer() {
    clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.remainingSeconds--;

      if (this.remainingSeconds <= 0) {
        clearInterval(this.countdownInterval);
        clearInterval(this.pollTimer);
        this.renderExpiredSheet();
        return;
      }

      const m = Math.floor(this.remainingSeconds / 60);
      const s = this.remainingSeconds % 60;
      const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      const el = document.getElementById('chk-timer-display');
      if (el) el.innerText = formatted;
    }, 1000);
  },

  // ── AUTOMATIC VERIFICATION POLLER ──────────────────────────
  startVerificationPolling(orderId, userId) {
    clearInterval(this.pollTimer);

    this.pollTimer = setInterval(async () => {
      try {
        const baseUrl = this.getBaseUrl();
        const res = await fetch(`${baseUrl}/api/subscription/verify-order?orderId=${encodeURIComponent(orderId)}&userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.success && data.verified && data.status === 'success') {
          clearInterval(this.pollTimer);
          clearInterval(this.countdownInterval);
          this.handlePaymentSuccess(data);
        } else {
          const msgEl = document.getElementById('chk-poll-msg');
          if (msgEl && data.message) {
            msgEl.innerText = data.message;
          }
        }
      } catch (e) {
        console.warn('[Polling] Check note:', e.message);
      }
    }, 3500);
  },

  handlePaymentSuccess(res) {
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();

    const modal = document.getElementById('modal-checkout');
    if (modal) {
      modal.innerHTML = `
        <div class="modal-sheet" style="max-width:420px; border-radius:var(--radius-2xl); text-align:center; padding:32px 20px">
          <div style="width:68px; height:68px; border-radius:50%; background:rgba(34, 197, 94, 0.15); border:2px solid var(--accent-green); display:inline-flex; align-items:center; justify-content:center; font-size:32px; margin-bottom:16px; animation:ob-pulse 1.2s infinite">
            ✨
          </div>
          <h2 style="font-size:22px; font-weight:800; color:var(--text-primary); margin-bottom:6px">Payment Verified!</h2>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:18px">
            Rentora Premium activated for <strong>30 days</strong>. All commercial features are active.
          </p>
          <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-lg); padding:12px; margin-bottom:20px; font-size:12px; text-align:left">
            <div>Amount Paid: <strong style="color:var(--text-primary)">₹${(res.order?.amount || 1).toFixed(2)}</strong></div>
            <div>Bank Reference (UTR): <strong style="color:var(--accent-blue)">${res.utr || 'CONFIRMED'}</strong></div>
            <div>New Expiry: <strong style="color:var(--accent-green)">${new Date(res.newExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
          </div>
          <button type="button" class="btn btn-primary btn-full btn-lg" onclick="Subscription.closeCheckoutAndRefresh()" style="font-weight:800">
            Continue to Dashboard →
          </button>
        </div>
      `;
    }

    if (res.subscription) {
      DB.setSubscription(res.subscription);
    }

    showToast('🎉 Rentora Premium Activated! Extended by 30 days.', 'success');
  },

  renderExpiredSheet() {
    const modal = document.getElementById('modal-checkout');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-sheet" style="max-width:400px; border-radius:var(--radius-2xl); text-align:center; padding:30px 20px">
        <div style="font-size:44px; margin-bottom:12px">⌛</div>
        <h3 style="font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:6px">Payment Session Expired</h3>
        <p style="font-size:12.5px; color:var(--text-secondary); line-height:1.4; margin-bottom:20px">
          The 10-minute UPI checkout window for this order has elapsed. If you have already paid, our reconciliation engine will automatically credit your account.
        </p>
        <div style="display:flex; gap:10px">
          <button type="button" class="btn btn-secondary" onclick="Subscription.closeCheckout()" style="flex:1">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="Subscription.startCheckout()" style="flex:2">Generate New QR</button>
        </div>
      </div>
    `;
  },

  closeCheckoutAndRefresh() {
    this.closeCheckout();
    if (typeof Dashboard !== 'undefined' && Dashboard.render) {
      Dashboard.render();
    }
  },

  closeCheckout() {
    clearInterval(this.pollTimer);
    clearInterval(this.countdownInterval);
    const modal = document.getElementById('modal-checkout');
    if (modal) modal.remove();
    this.init();
  },

  copyUpi(val) {
    navigator.clipboard.writeText(val).then(() => {
      const btn = document.getElementById('btn-copy-upi');
      if (btn) {
        btn.innerText = '✅ Copied!';
        setTimeout(() => { btn.innerText = '📋 Copy'; }, 2000);
      }
      showToast('UPI ID copied to clipboard', 'success');
    });
  },

  async submitManualUtr() {
    const utrInput = document.getElementById('chk-utr-input');
    const errEl = document.getElementById('chk-utr-err');
    const btn = document.getElementById('btn-submit-utr');
    if (!utrInput || !this.activeOrder) return;

    const utrVal = utrInput.value.trim();
    if (!utrVal || utrVal.length < 10) {
      if (errEl) {
        errEl.innerText = 'Please enter a valid 12-digit UTR / UPI reference number from your payment receipt.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    if (btn) {
      btn.innerText = 'Verifying...';
      btn.disabled = true;
    }

    try {
      const baseUrl = this.getBaseUrl();
      const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
      const userId = user ? user.uid : (typeof Auth !== 'undefined' && Auth.getUserId ? Auth.getUserId() : 'default_owner');

      const res = await fetch(`${baseUrl}/api/subscription/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: this.activeOrder.providerOrderId,
          userId,
          utr: utrVal
        })
      });

      const data = await res.json();
      if (data.success && data.status === 'success') {
        clearInterval(this.pollTimer);
        clearInterval(this.countdownInterval);
        this.handlePaymentSuccess(data);
      } else {
        if (errEl) {
          errEl.innerText = data.message || 'Could not verify UTR. Please wait a moment and try again.';
          errEl.style.display = 'block';
        }
        if (btn) {
          btn.innerText = 'Verify UTR';
          btn.disabled = false;
        }
      }
    } catch (e) {
      if (errEl) {
        errEl.innerText = 'Network error verifying UTR: ' + e.message;
        errEl.style.display = 'block';
      }
      if (btn) {
        btn.innerText = 'Verify UTR';
        btn.disabled = false;
      }
    }
  },

  openCheckoutModal({ state, title, message, canRetry }) {
    let modal = document.getElementById('modal-checkout');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-checkout';
      modal.className = 'modal-overlay open';
      modal.style.zIndex = '999999';
      document.body.appendChild(modal);
    }

    if (state === 'loading') {
      modal.innerHTML = `
        <div class="modal-sheet" style="max-width:380px; text-align:center; padding:32px 20px; border-radius:var(--radius-2xl)">
          <div class="ob-launch-spinner" style="width:36px; height:36px; border-width:3px; margin-bottom:16px"></div>
          <h3 style="font-size:17px; font-weight:800; color:var(--text-primary); margin-bottom:4px">${title}</h3>
          <p style="font-size:12.5px; color:var(--text-secondary)">Connecting with FamGateway secure UPI server...</p>
        </div>
      `;
    } else if (state === 'error') {
      modal.innerHTML = `
        <div class="modal-sheet" style="max-width:440px; text-align:center; padding:30px 22px; border-radius:var(--radius-2xl)">
          <div style="font-size:42px; margin-bottom:12px">⚡</div>
          <h3 style="font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:8px">${title}</h3>
          <div style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:20px">${message}</div>
          <div style="display:flex; gap:10px">
            <button type="button" class="btn btn-secondary" onclick="Subscription.closeCheckout()" style="flex:1">Cancel</button>
            ${canRetry ? `
              <button type="button" class="btn btn-primary" onclick="Subscription.startCheckout()" style="flex:2">🔄 Retry Connection</button>
            ` : ''}
          </div>
        </div>
      `;
    }
  },

  // ── SUBSCRIPTION HISTORY MODAL ─────────────────────────────
  async openHistoryModal() {
    const existing = document.getElementById('modal-sub-history');
    if (existing) existing.remove();

    const user = typeof Auth !== 'undefined' ? Auth.currentUser : null;
    const userId = user ? user.uid : (typeof Auth !== 'undefined' && Auth.getUserId ? Auth.getUserId() : 'default_owner');

    const modal = document.createElement('div');
    modal.id = 'modal-sub-history';
    modal.className = 'modal-overlay open';
    modal.style.zIndex = '99999';

    modal.innerHTML = `
      <div class="modal-sheet" style="max-width:520px; max-height:90vh; overflow-y:auto; border-radius:var(--radius-2xl)">
        <div class="modal-handle"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px">
          <div style="display:flex; align-items:center; gap:8px">
            <span style="font-size:22px">📜</span>
            <h3 style="font-size:17px; font-weight:800; color:var(--text-primary); margin:0">Subscription &amp; Payment History</h3>
          </div>
          <button type="button" class="btn-ghost" onclick="document.getElementById('modal-sub-history').remove()" style="font-size:18px; border:none; background:none; cursor:pointer">✕</button>
        </div>
        <div id="sub-history-content" style="font-size:12.5px; color:var(--text-secondary); text-align:center; padding:20px 0">
          <div class="ob-launch-spinner" style="width:20px; height:20px; margin-bottom:8px"></div>
          Loading payment receipts...
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    let historyList = [];
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/subscription/history?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.history) historyList = data.history;
      }
    } catch (e) {
      console.warn('[History] Server unreachable, using local history');
    }

    const contentEl = document.getElementById('sub-history-content');
    if (!contentEl) return;

    if (historyList.length === 0) {
      contentEl.innerHTML = `
        <div style="padding:24px 10px; color:var(--text-muted)">
          <div style="font-size:32px; margin-bottom:8px">💳</div>
          <div>No paid subscription renewals recorded yet.</div>
          <div style="font-size:11px; margin-top:4px">Your account is currently on the 10-Day Free Trial.</div>
        </div>
      `;
      return;
    }

    contentEl.innerHTML = historyList.map(item => `
      <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-lg); padding:12px 14px; margin-bottom:10px; text-align:left">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
          <strong style="color:var(--text-primary); font-size:13.5px">${item.plan || 'Rentora Premium'}</strong>
          <span class="badge" style="background:rgba(34,197,94,0.15); color:var(--accent-green); font-weight:800; font-size:10px; padding:2px 7px; border-radius:var(--radius-full)">
            ${item.status || 'Verified'}
          </span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); margin-bottom:4px">
          <span>Amount: <strong>₹${item.amount}</strong></span>
          <span>Date: ${new Date(item.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between">
          <span>UTR: <code style="color:var(--accent-blue)">${item.utr || 'N/A'}</code></span>
          <span>Order: <code>${item.orderId || ''}</code></span>
        </div>
      </div>
    `).join('');
  },

  // ── ADMINISTRATOR REVENUE & SUBSCRIPTION PANEL ─────────────
  async openAdminModal() {
    const pin = prompt('Enter Rentora Administrator Security PIN:');
    if (!pin) return;

    let adminData = null;
    let isServerLive = false;

    // 1. Try to query server if available
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/api/admin/subscriptions?pin=${encodeURIComponent(pin)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          adminData = data;
          isServerLive = true;
        } else {
          return alert(data.message || 'Unauthorized: Incorrect PIN');
        }
      } else if (res.status === 401) {
        return alert('Unauthorized: Incorrect Administrator PIN');
      }
    } catch (e) {
      console.warn('[Admin] Server connection note, verifying locally:', e.message);
    }

    // 2. Local Fallback Authentication if server not currently reachable
    if (!adminData) {
      if (pin !== '8899') {
        return alert('Incorrect Administrator Security PIN. (Default PIN: 8899)');
      }

      // Read local database partition data
      const sub = DB.getSubscription();
      const localHistory = [];

      adminData = {
        success: true,
        stats: {
          totalUsers: 1,
          totalTrial: sub.status === 'trial' ? 1 : 0,
          totalActive: sub.status === 'active' ? 1 : 0,
          totalExpired: sub.status === 'expired' ? 1 : 0,
          successfulPayments: 0,
          pendingPayments: 0,
          totalRevenue: 0
        },
        orders: [],
        history: [],
        localMode: true
      };
    }

    // 3. Render Administrator Modal
    const existing = document.getElementById('modal-admin-subs');
    if (existing) existing.remove();

    const stats = adminData.stats;
    const modal = document.createElement('div');
    modal.id = 'modal-admin-subs';
    modal.className = 'modal-overlay open';
    modal.style.zIndex = '99999';

    modal.innerHTML = `
      <div class="modal-sheet" style="max-width:640px; max-height:92vh; overflow-y:auto; border-radius:var(--radius-2xl)">
        <div class="modal-handle"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px">
          <div style="display:flex; align-items:center; gap:8px">
            <span style="font-size:24px">📊</span>
            <div>
              <h3 style="font-size:18px; font-weight:800; color:var(--text-primary); margin:0">Administrator Subscription Monitor</h3>
              <p style="font-size:11.5px; color:var(--text-secondary); margin:2px 0 0">FamGateway Verified Merchant Reconciliation</p>
            </div>
          </div>
          <button type="button" class="btn-ghost" onclick="document.getElementById('modal-admin-subs').remove()" style="font-size:18px; border:none; background:none; cursor:pointer">✕</button>
        </div>

        ${adminData.localMode ? `
          <div style="background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.35); border-radius:var(--radius-md); padding:10px 12px; margin-bottom:14px; font-size:12px; color:var(--text-secondary); line-height:1.4">
            🟢 <strong>Local Administrator Mode:</strong> PIN verified (8899). Showing local database records. Run <code>start-app.bat</code> to connect to live FamGateway payment server on port 3000.
          </div>
        ` : ''}

        <!-- Stats Grid -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:16px">
          <div style="background:var(--bg-input); padding:12px; border-radius:var(--radius-lg); border:1px solid var(--border)">
            <div style="font-size:11px; color:var(--text-muted)">Total Trial Users</div>
            <div style="font-size:20px; font-weight:800; color:var(--accent-blue)">${stats.totalTrial}</div>
          </div>
          <div style="background:var(--bg-input); padding:12px; border-radius:var(--radius-lg); border:1px solid var(--border)">
            <div style="font-size:11px; color:var(--text-muted)">Active Subscribers</div>
            <div style="font-size:20px; font-weight:800; color:var(--accent-green)">${stats.totalActive}</div>
          </div>
          <div style="background:var(--bg-input); padding:12px; border-radius:var(--radius-lg); border:1px solid var(--border)">
            <div style="font-size:11px; color:var(--text-muted)">Total Verified Revenue</div>
            <div style="font-size:20px; font-weight:800; color:var(--text-primary)">₹${stats.totalRevenue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- Orders Table -->
        <h4 style="font-size:13px; font-weight:800; color:var(--text-primary); margin-bottom:8px">FamGateway Orders &amp; Audit Trail</h4>
        <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-lg); overflow-x:auto; margin-bottom:16px">
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; text-align:left">
            <thead>
              <tr style="border-bottom:1px solid var(--border); background:var(--bg-card)">
                <th style="padding:8px 10px">Order ID</th>
                <th style="padding:8px 10px">Amount</th>
                <th style="padding:8px 10px">Status</th>
                <th style="padding:8px 10px">UTR / Reference</th>
                <th style="padding:8px 10px">Created</th>
              </tr>
            </thead>
            <tbody>
              ${adminData.orders && adminData.orders.length > 0 ? adminData.orders.map(o => `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px 10px; font-family:monospace">${o.providerOrderId || o.internalPaymentId}</td>
                  <td style="padding:8px 10px; font-weight:700">₹${o.amount}</td>
                  <td style="padding:8px 10px">
                    <span class="badge" style="background:${o.status === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)'}; color:${o.status === 'success' ? 'var(--accent-green)' : '#d97706'}; font-size:10px; padding:2px 6px; border-radius:var(--radius-full)">
                      ${o.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:8px 10px; font-family:monospace">${o.utr || 'Pending'}</td>
                  <td style="padding:8px 10px; color:var(--text-muted)">${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="5" style="padding:16px; text-align:center; color:var(--text-muted)">No orders generated yet</td></tr>
              `}
            </tbody>
          </table>
        </div>

        <div style="font-size:11px; color:var(--text-muted); text-align:center">
          FamGateway VPA: <code>richnisheet@fam</code> · Standard Rate: ₹1,500/order
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }
};

window.Subscription = Subscription;
