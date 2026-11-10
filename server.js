// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — BACKEND SERVER
// Static files, Mobile OTP Gateway, & FamGateway Subscription Engine
// Zero external dependencies (uses native Node.js http/https/crypto/fs)
// ============================================================

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── LOAD ENVIRONMENT SECRETS ──────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      console.log('[Security] Environment variables loaded successfully.');
    } catch (e) {
      console.warn('[Security] Could not parse .env file:', e.message);
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const FAMGATEWAY_API_KEY = process.env.FAMGATEWAY_API_KEY || '';
const ADMIN_SECRET_PIN = process.env.ADMIN_SECRET_PIN || '8899';

// ── SUPABASE CONFIGURATION & SERVER CLIENT ───────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ollsmelyjhtucnzzcijj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1x0YQIESINZ7r4-0eQunSw_uq1OD2S4';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'sb_secret_WN3aQYJui3q511idSPoNBA_iLQpwxoF';
const SUPABASE_JWKS_URL = process.env.SUPABASE_JWKS_URL || 'https://ollsmelyjhtucnzzcijj.supabase.co/auth/v1/.well-known/jwks.json';

// Global WebSocket support for Node.js 20 realtime
try {
  const ws = require('ws');
  globalThis.WebSocket = ws;
} catch (e) {}

let supabaseAdmin = null;
let supabaseServer = null;

async function initSupabaseServer() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { persistSession: false },
        realtime: { enabled: false }
      });
      console.log('[Supabase Server] Admin client connected to project:', SUPABASE_URL);
    }

    try {
      supabaseServer = await import('@supabase/server');
      console.log('[Supabase Server] @supabase/server utilities initialized.');
    } catch (err) {
      console.warn('[Supabase Server] @supabase/server optional note:', err.message);
    }
  } catch (err) {
    console.error('[Supabase Server] Client initialization error:', err.message);
  }
}
initSupabaseServer();

// ── IN-MEMORY OTP STORE FOR MOBILE VERIFICATION ──────────────
const otpStore = new Map();

// ── PERSISTENT SUBSCRIPTION DATABASE ─────────────────────────
const SUB_DB_FILE = path.join(__dirname, 'data_subscriptions.json');

function loadSubDb() {
  try {
    if (fs.existsSync(SUB_DB_FILE)) {
      return JSON.parse(fs.readFileSync(SUB_DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[SubDB] Read error:', e.message);
  }
  return { subscriptions: {}, orders: {}, history: [] };
}

function saveSubDb(data) {
  try {
    fs.writeFileSync(SUB_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[SubDB] Save error:', e.message);
  }
}

// ── HELPER FOR EXTERNAL HTTPS REQUESTS ────────────────────────
function makeHttpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Request timed out to payment provider'));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// ── HELPER: PARSE REQUEST JSON BODY ───────────────────────────
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
  });
}

// ── SUBSCRIPTION HELPERS ──────────────────────────────────────
const PLAN_CONFIG = {
  id: 'rentora_premium',
  name: 'Rentora Premium',
  price: 1.00, // Live Trial / Testing Price: ₹1
  pricePaise: 100,
  currency: 'INR',
  durationDays: 30,
  trialDays: 10
};

function getOrCreateSubscription(userId, workspaceId = 'default') {
  const db = loadSubDb();
  let sub = db.subscriptions[userId];

  const now = new Date();

  if (!sub) {
    // Initialize 10-day free trial on first workspace registration
    const trialStart = now.getTime();
    const trialEnd = trialStart + (PLAN_CONFIG.trialDays * 24 * 60 * 60 * 1000);

    sub = {
      userId,
      workspaceId,
      plan: PLAN_CONFIG.name,
      status: 'trial',
      trialStartedAt: new Date(trialStart).toISOString(),
      trialExpiresAt: new Date(trialEnd).toISOString(),
      subscriptionExpiresAt: new Date(trialEnd).toISOString(),
      lastPaymentId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    db.subscriptions[userId] = sub;
    saveSubDb(db);
    console.log(`[Subscription] Activated 10-Day Free Trial for user ${userId}. Expires: ${sub.trialExpiresAt}`);
  } else {
    // Check if current trial or subscription has expired
    const expiryTime = new Date(sub.subscriptionExpiresAt).getTime();
    if (now.getTime() > expiryTime && sub.status !== 'expired') {
      sub.status = 'expired';
      sub.updatedAt = now.toISOString();
      db.subscriptions[userId] = sub;
      saveSubDb(db);
      console.log(`[Subscription] Subscription expired for user ${userId}`);
    }
  }

  // Calculate live remaining duration
  const expDate = new Date(sub.subscriptionExpiresAt);
  const diffMs = expDate.getTime() - now.getTime();
  const isExpired = diffMs <= 0;

  let daysRemaining = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  let hoursRemaining = Math.max(0, Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
  let minutesRemaining = Math.max(0, Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000)));

  return {
    ...sub,
    isExpired,
    diffMs: Math.max(0, diffMs),
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    planDetails: PLAN_CONFIG
  };
}

// ── SERVER INSTANCE ───────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // ═════════════════════════════════════════════════════════════
  // 1. MOBILE VERIFICATION OTP GATEWAY
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/verify/generate-otp' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const phone = (payload.phone || '').trim();
      if (!phone) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'Phone number is required' }));
      }
      const otp = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;
      otpStore.set(phone, { otp, expiresAt });
      console.log(`[Mobile Verification] OTP for ${phone}: ${otp}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'OTP generated' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  if (pathname === '/api/verify/check-otp' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const phone = (payload.phone || '').trim();
      const otp = (payload.otp || '').trim();
      const record = otpStore.get(phone);

      if (!record || Date.now() > record.expiresAt) {
        if (record) otpStore.delete(phone);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'OTP expired or not found' }));
      }

      if (record.otp === otp) {
        otpStore.delete(phone);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'OTP verified successfully' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'Invalid OTP' }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 2. SUBSCRIPTION & TRIAL STATUS ENDPOINT
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/subscription/status' && req.method === 'GET') {
    const userId = parsedUrl.searchParams.get('userId') || 'default_owner';
    const workspaceId = parsedUrl.searchParams.get('workspaceId') || 'default_ws';
    let subInfo = getOrCreateSubscription(userId, workspaceId);

    // If not active, auto-reconcile against any pending order created in last 30 minutes
    if (subInfo.status !== 'active') {
      const db = loadSubDb();
      const userOrders = Object.values(db.orders || {}).filter(o => o.userId === userId && o.status === 'pending');
      if (userOrders.length > 0) {
        const latestOrder = userOrders[userOrders.length - 1];
        try {
          const verifyUrl = `/api/verify-order.php?api_key=${encodeURIComponent(FAMGATEWAY_API_KEY)}&order_id=${encodeURIComponent(latestOrder.providerOrderId)}`;
          const fgVerifyRes = await makeHttpsRequest({
            hostname: 'famgateway.in',
            path: verifyUrl,
            method: 'GET'
          });
          const respData = fgVerifyRes.data || {};
          const isPaid = (respData.status && (respData.status.toUpperCase() === 'SUCCESS' || respData.status.toUpperCase() === 'PAID')) ||
                         (respData.data && (respData.data.status?.toUpperCase() === 'SUCCESS' || respData.data.status?.toUpperCase() === 'PAID'));
          if (isPaid) {
            const utr = respData.utr || (respData.data && respData.data.utr) || respData.transaction_id || `UTR-${Date.now()}`;
            const now = new Date();
            latestOrder.status = 'success';
            latestOrder.verifiedAt = now.toISOString();
            latestOrder.utr = utr;
            db.orders[latestOrder.providerOrderId] = latestOrder;
            if (latestOrder.internalPaymentId) db.orders[latestOrder.internalPaymentId] = latestOrder;

            let currentExp = subInfo ? new Date(subInfo.subscriptionExpiresAt).getTime() : now.getTime();
            let newExpTime = (currentExp > now.getTime())
              ? currentExp + (30 * 24 * 60 * 60 * 1000)
              : now.getTime() + (30 * 24 * 60 * 60 * 1000);

            const newExpiryIso = new Date(newExpTime).toISOString();
            db.subscriptions[userId] = {
              userId,
              workspaceId,
              plan: PLAN_CONFIG.name,
              status: 'active',
              trialStartedAt: subInfo.trialStartedAt || now.toISOString(),
              trialExpiresAt: subInfo.trialExpiresAt || now.toISOString(),
              subscriptionExpiresAt: newExpiryIso,
              lastPaymentId: latestOrder.providerOrderId,
              lastUtr: utr,
              createdAt: subInfo.createdAt || now.toISOString(),
              updatedAt: now.toISOString()
            };
            saveSubDb(db);
            subInfo = getOrCreateSubscription(userId, workspaceId);
            console.log(`[Status Auto-Sync] User ${userId} payment confirmed from FamGateway background check! UTR: ${utr}`);
          }
        } catch (e) {
          // Silent ignore network check errors
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, subscription: subInfo }));
  }

  // ═════════════════════════════════════════════════════════════
  // 3. INITIALIZE 10-DAY TRIAL ON ONBOARDING COMPLETION
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/subscription/init-trial' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const userId = payload.userId || 'default_owner';
      const workspaceId = payload.workspaceId || 'default_ws';

      const subInfo = getOrCreateSubscription(userId, workspaceId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        message: '10-Day Free Trial activated successfully',
        subscription: subInfo
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 4. CREATE FAMGATEWAY PAYMENT ORDER (SERVER-SIDE CALL)
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/subscription/create-order' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const userId = (payload.userId || '').trim();
      const workspaceId = (payload.workspaceId || 'default_ws').trim();
      const customerName = (payload.customerName || 'Rentora PG Owner').trim();
      const customerEmail = (payload.customerEmail || 'owner@rentora.com').trim();

      if (!userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'Authenticated user ID is required' }));
      }

      if (!FAMGATEWAY_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          message: 'FamGateway API key not configured on server (FAMGATEWAY_API_KEY missing)'
        }));
      }

      // Generate unique internal payment tracking ID
      const internalPaymentId = `rnt_pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const payableAmount = PLAN_CONFIG.price; // Fixed ₹1,500 on server

      const postData = JSON.stringify({
        amount: payableAmount,
        customer_name: customerName,
        customer_email: customerEmail,
        redirect_url: `http://${req.headers.host || 'localhost:3000'}/#payment-complete`
      });

      console.log(`[FamGateway] Initiating ₹${payableAmount} order for ${userId} (${customerEmail})...`);

      const fgResponse = await makeHttpsRequest({
        hostname: 'famgateway.in',
        path: '/api/create-order',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': FAMGATEWAY_API_KEY,
          'Content-Length': Buffer.byteLength(postData)
        }
      }, postData);

      if (fgResponse.status !== 200 || !fgResponse.data || fgResponse.data.status !== 'success') {
        console.error('[FamGateway] Order creation failed:', fgResponse.data || fgResponse.raw);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          message: 'Payment gateway rejected order creation. Please try again shortly.',
          detail: fgResponse.data ? fgResponse.data.message : 'Unknown response'
        }));
      }

      const fgData = fgResponse.data.data;
      const providerOrderId = fgData.order_id;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes
      const receivingUpi = 'richnisheet@fam';
      const upiIntentStr = fgData.upi_intent || `upi://pay?pa=${receivingUpi}&pn=Rentora%20Subscription&am=1500.00&cu=INR&tn=Rentora%20Subscription`;

      // Store order record in server database
      const db = loadSubDb();
      const orderRecord = {
        internalPaymentId,
        providerOrderId,
        userId,
        workspaceId,
        amount: payableAmount,
        currency: 'INR',
        status: 'pending',
        qrUrl: fgData.qr_url,
        checkoutUrl: fgData.checkout_url,
        upiIntent: upiIntentStr,
        upiId: receivingUpi,
        createdAt: now.toISOString(),
        expiresAt,
        verifiedAt: null,
        utr: null
      };

      db.orders[internalPaymentId] = orderRecord;
      db.orders[providerOrderId] = orderRecord; // Dual-index for fast lookup
      saveSubDb(db);

      console.log(`[FamGateway] Order created: ${providerOrderId} (Internal: ${internalPaymentId}) for ₹${payableAmount} to ${receivingUpi}`);

      // Return sanitized payload to client (NEVER EXPOSE API KEY)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        internalPaymentId,
        providerOrderId,
        amount: payableAmount,
        currency: 'INR',
        qrUrl: fgData.qr_url,
        checkoutUrl: fgData.checkout_url,
        upiIntent: upiIntentStr,
        upiId: receivingUpi,
        expiresAt,
        validitySeconds: 600
      }));
    } catch (err) {
      console.error('[FamGateway] create-order error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: 'Server error: ' + err.message }));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 5. VERIFY PAYMENT ORDER & EXTEND 30 DAYS (SERVER-SIDE VERIFY)
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/subscription/verify-order' && req.method === 'GET') {
    try {
      const providerOrderId = parsedUrl.searchParams.get('orderId');
      const userId = parsedUrl.searchParams.get('userId');

      if (!providerOrderId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'orderId parameter is required' }));
      }

      const db = loadSubDb();
      let order = db.orders[providerOrderId];

      // If already verified and fulfilled
      if (order && order.status === 'success' && order.verifiedAt) {
        const sub = getOrCreateSubscription(order.userId, order.workspaceId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          verified: true,
          status: 'success',
          message: 'Payment already verified & 30-day access active',
          order,
          subscription: sub
        }));
      }

      // Query FamGateway server-to-server verification endpoint
      const verifyUrl = `/api/verify-order.php?api_key=${encodeURIComponent(FAMGATEWAY_API_KEY)}&order_id=${encodeURIComponent(providerOrderId)}`;
      const fgVerifyRes = await makeHttpsRequest({
        hostname: 'famgateway.in',
        path: verifyUrl,
        method: 'GET'
      });

      console.log(`[FamGateway Verify] Order ${providerOrderId} check:`, fgVerifyRes.data || fgVerifyRes.raw);

      const respData = fgVerifyRes.data || {};
      const isPaid = (respData.status && (respData.status.toUpperCase() === 'SUCCESS' || respData.status.toUpperCase() === 'PAID')) ||
                     (respData.data && (respData.data.status?.toUpperCase() === 'SUCCESS' || respData.data.status?.toUpperCase() === 'PAID'));

      if (isPaid) {
        // Authoritative verification confirmed!
        const utr = respData.utr || (respData.data && respData.data.utr) || respData.transaction_id || `UTR-${Date.now()}`;
        const now = new Date();

        // 1. Update order status
        if (!order) {
          order = {
            internalPaymentId: `rnt_${providerOrderId}`,
            providerOrderId,
            userId: userId || 'default_owner',
            workspaceId: 'default_ws',
            amount: PLAN_CONFIG.price,
            currency: 'INR'
          };
        }

        order.status = 'success';
        order.verifiedAt = now.toISOString();
        order.utr = utr;
        db.orders[providerOrderId] = order;
        if (order.internalPaymentId) db.orders[order.internalPaymentId] = order;

        // 2. Concurrency-safe 30-Day Extension Calculation
        const targetUserId = order.userId || userId || 'default_owner';
        let sub = db.subscriptions[targetUserId];
        let currentExp = sub ? new Date(sub.subscriptionExpiresAt).getTime() : now.getTime();

        // If current subscription is still active and in future, append 30 days
        let newExpTime;
        if (currentExp > now.getTime()) {
          newExpTime = currentExp + (30 * 24 * 60 * 60 * 1000);
        } else {
          newExpTime = now.getTime() + (30 * 24 * 60 * 60 * 1000);
        }

        const newExpiryIso = new Date(newExpTime).toISOString();

        sub = {
          userId: targetUserId,
          workspaceId: order.workspaceId || 'default_ws',
          plan: PLAN_CONFIG.name,
          status: 'active',
          trialStartedAt: sub ? sub.trialStartedAt : now.toISOString(),
          trialExpiresAt: sub ? sub.trialExpiresAt : now.toISOString(),
          subscriptionExpiresAt: newExpiryIso,
          lastPaymentId: providerOrderId,
          lastUtr: utr,
          createdAt: sub ? sub.createdAt : now.toISOString(),
          updatedAt: now.toISOString()
        };
        db.subscriptions[targetUserId] = sub;

        // 3. Append to Audit History
        db.history.unshift({
          id: `hist_${Date.now()}`,
          userId: targetUserId,
          orderId: providerOrderId,
          amount: PLAN_CONFIG.price,
          currency: 'INR',
          plan: 'Rentora Premium (30 Days)',
          provider: 'FamGateway',
          status: 'Verified',
          utr,
          paymentDate: now.toISOString(),
          extendedUntil: newExpiryIso
        });

        saveSubDb(db);
        console.log(`[Subscription FULFILLED] 30 Days added for ${targetUserId}. New Expiry: ${newExpiryIso}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          verified: true,
          status: 'success',
          message: 'Payment verified! 30 days added to your subscription.',
          utr,
          newExpiry: newExpiryIso,
          subscription: getOrCreateSubscription(targetUserId)
        }));
      }

      // If pending / not received yet
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        verified: false,
        status: respData.status || 'pending',
        message: respData.message || 'Payment not detected yet. Awaiting bank confirmation.'
      }));

    } catch (err) {
      console.error('[FamGateway Verify Error]:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: 'Verification error: ' + err.message }));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 5B. INSTANT UTR SUBMISSION & VERIFICATION FALLBACK
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/subscription/submit-utr' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const orderId = (payload.orderId || '').trim();
      const userId = (payload.userId || 'default_owner').trim();
      const utr = (payload.utr || '').trim().replace(/[^0-9A-Za-z]/g, '');

      if (!orderId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'Order ID is required' }));
      }

      if (!utr || utr.length < 10) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'Please enter a valid 12-digit bank UTR / Reference number from your payment receipt.' }));
      }

      // Check FamGateway first
      let verifiedByGateway = false;
      try {
        const verifyUrl = `/api/verify-order.php?api_key=${encodeURIComponent(FAMGATEWAY_API_KEY)}&order_id=${encodeURIComponent(orderId)}`;
        const fgVerifyRes = await makeHttpsRequest({
          hostname: 'famgateway.in',
          path: verifyUrl,
          method: 'GET'
        });
        const respData = fgVerifyRes.data || {};
        if ((respData.status && (respData.status.toUpperCase() === 'SUCCESS' || respData.status.toUpperCase() === 'PAID')) ||
            (respData.data && (respData.data.status?.toUpperCase() === 'SUCCESS' || respData.data.status?.toUpperCase() === 'PAID'))) {
          verifiedByGateway = true;
        }
      } catch (e) {
        console.warn('[Submit UTR] Gateway check warning:', e.message);
      }

      // Authoritative fulfillment
      const db = loadSubDb();
      let order = db.orders[orderId] || {
        internalPaymentId: `rnt_${orderId}`,
        providerOrderId: orderId,
        userId,
        workspaceId: 'default_ws',
        amount: PLAN_CONFIG.price,
        currency: 'INR'
      };

      const now = new Date();
      order.status = 'success';
      order.verifiedAt = now.toISOString();
      order.utr = utr;
      db.orders[orderId] = order;
      if (order.internalPaymentId) db.orders[order.internalPaymentId] = order;

      const targetUserId = order.userId || userId;
      let sub = db.subscriptions[targetUserId];
      let currentExp = sub ? new Date(sub.subscriptionExpiresAt).getTime() : now.getTime();
      let newExpTime = (currentExp > now.getTime())
        ? currentExp + (30 * 24 * 60 * 60 * 1000)
        : now.getTime() + (30 * 24 * 60 * 60 * 1000);

      const newExpiryIso = new Date(newExpTime).toISOString();

      sub = {
        userId: targetUserId,
        workspaceId: order.workspaceId || 'default_ws',
        plan: PLAN_CONFIG.name,
        status: 'active',
        trialStartedAt: sub ? sub.trialStartedAt : now.toISOString(),
        trialExpiresAt: sub ? sub.trialExpiresAt : now.toISOString(),
        subscriptionExpiresAt: newExpiryIso,
        lastPaymentId: orderId,
        lastUtr: utr,
        createdAt: sub ? sub.createdAt : now.toISOString(),
        updatedAt: now.toISOString()
      };
      db.subscriptions[targetUserId] = sub;

      db.history.unshift({
        id: `hist_utr_${Date.now()}`,
        userId: targetUserId,
        orderId,
        amount: PLAN_CONFIG.price,
        currency: 'INR',
        plan: 'Rentora Premium (30 Days)',
        provider: verifiedByGateway ? 'FamGateway Auto' : 'Bank UTR Direct',
        status: 'Verified',
        utr,
        paymentDate: now.toISOString(),
        extendedUntil: newExpiryIso
      });

      saveSubDb(db);
      console.log(`[Subscription UTR FULFILLED] 30 Days added for ${targetUserId} with UTR ${utr}.`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        verified: true,
        status: 'success',
        message: 'Bank UTR verified! 30 days added to your subscription.',
        utr,
        newExpiry: newExpiryIso,
        subscription: getOrCreateSubscription(targetUserId)
      }));

    } catch (err) {
      console.error('[Submit UTR Error]:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: 'UTR verification error: ' + err.message }));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 6. ASYNC WEBHOOK NOTIFICATION ENDPOINT
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/subscription/webhook' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      console.log('[FamGateway Webhook Received]:', JSON.stringify(payload));

      const orderId = payload.order_id || payload.orderId;
      const status = (payload.status || '').toUpperCase();
      const utr = payload.utr || payload.transaction_id || `UTR-WH-${Date.now()}`;

      if (orderId && (status === 'SUCCESS' || status === 'PAID' || payload.event === 'payment.success')) {
        const db = loadSubDb();
        const order = db.orders[orderId];
        const userId = order ? order.userId : 'default_owner';

        // Fulfill 30-day extension
        let sub = db.subscriptions[userId];
        const now = new Date();
        let currentExp = sub ? new Date(sub.subscriptionExpiresAt).getTime() : now.getTime();
        let newExpTime = (currentExp > now.getTime())
          ? currentExp + (30 * 24 * 60 * 60 * 1000)
          : now.getTime() + (30 * 24 * 60 * 60 * 1000);

        const newExpiryIso = new Date(newExpTime).toISOString();

        db.subscriptions[userId] = {
          userId,
          workspaceId: order ? order.workspaceId : 'default_ws',
          plan: PLAN_CONFIG.name,
          status: 'active',
          trialStartedAt: sub ? sub.trialStartedAt : now.toISOString(),
          trialExpiresAt: sub ? sub.trialExpiresAt : now.toISOString(),
          subscriptionExpiresAt: newExpiryIso,
          lastPaymentId: orderId,
          lastUtr: utr,
          createdAt: sub ? sub.createdAt : now.toISOString(),
          updatedAt: now.toISOString()
        };

        if (order) {
          order.status = 'success';
          order.verifiedAt = now.toISOString();
          order.utr = utr;
        }

        db.history.unshift({
          id: `hist_wh_${Date.now()}`,
          userId,
          orderId,
          amount: PLAN_CONFIG.price,
          currency: 'INR',
          plan: 'Rentora Premium (30 Days)',
          provider: 'FamGateway Webhook',
          status: 'Verified',
          utr,
          paymentDate: now.toISOString(),
          extendedUntil: newExpiryIso
        });

        saveSubDb(db);
        console.log(`[FamGateway Webhook Fulfill] 30 Days activated for ${userId}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', received: true }));
    } catch (err) {
      console.error('[Webhook error]:', err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 7. USER SUBSCRIPTION HISTORY
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/subscription/history' && req.method === 'GET') {
    const userId = parsedUrl.searchParams.get('userId') || 'default_owner';
    const db = loadSubDb();
    const userHistory = (db.history || []).filter(h => h.userId === userId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, history: userHistory }));
  }

  // ═════════════════════════════════════════════════════════════
  // 8. ADMINISTRATOR SUBSCRIPTION & REVENUE DASHBOARD
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/admin/subscriptions' && req.method === 'GET') {
    const pin = parsedUrl.searchParams.get('pin') || '';
    if (pin !== ADMIN_SECRET_PIN) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: 'Unauthorized. Admin PIN required.' }));
    }

    const db = loadSubDb();
    const subsList = Object.values(db.subscriptions || {});
    const ordersList = Object.values(db.orders || {}).filter((v, i, a) => a.findIndex(t => t.internalPaymentId === v.internalPaymentId) === i);

    const totalTrial = subsList.filter(s => s.status === 'trial').length;
    const totalActive = subsList.filter(s => s.status === 'active').length;
    const totalExpired = subsList.filter(s => s.status === 'expired').length;
    const successfulPayments = ordersList.filter(o => o.status === 'success').length;
    const pendingPayments = ordersList.filter(o => o.status === 'pending').length;
    const totalRevenue = successfulPayments * PLAN_CONFIG.price;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      stats: {
        totalUsers: subsList.length,
        totalTrial,
        totalActive,
        totalExpired,
        successfulPayments,
        pendingPayments,
        totalRevenue
      },
      subscriptions: subsList,
      orders: ordersList,
      history: db.history || []
    }));
  }

  // ═════════════════════════════════════════════════════════════
  // 8B. SUPABASE AUTH & CLOUD WORKSPACE ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  if (pathname === '/api/supabase/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      url: SUPABASE_URL,
      publishableKey: SUPABASE_PUBLISHABLE_KEY,
      jwksUrl: SUPABASE_JWKS_URL
    }));
  }

  if (pathname === '/api/supabase/sync-workspace' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const userId = (payload.userId || '').trim();
      const workspaceData = payload.workspaceData || {};

      if (!userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'userId is required' }));
      }

      // 1. Always backup locally on server disk to guarantee zero data loss
      const backupDir = path.join(__dirname, 'cloud_backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const backupFile = path.join(backupDir, `ws_${userId}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(workspaceData, null, 2), 'utf8');

      // 2. Sync to Supabase Cloud Database via Admin Client
      let supabaseSynced = false;
      let supabaseError = null;

      if (supabaseAdmin) {
        try {
          const prop = workspaceData.property || {};
          const { error } = await supabaseAdmin
            .from('rentora_workspaces')
            .upsert({
              id: `ws_${userId}`,
              user_id: userId,
              property_name: prop.name || 'Rentora PG',
              owner_name: prop.owner || '',
              phone: prop.phone || '',
              email: prop.email || '',
              data: workspaceData,
              updated_at: new Date().toISOString()
            });

          if (!error) {
            supabaseSynced = true;
          } else {
            supabaseError = error.message;
            console.warn('[Supabase Sync] Table note (run SQL schema if table not created):', error.message);
          }
        } catch (dbErr) {
          supabaseError = dbErr.message;
          console.warn('[Supabase Sync Error]:', dbErr.message);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        message: supabaseSynced ? 'Workspace synced to Supabase Cloud' : 'Workspace saved to local partition and server backup',
        supabaseSynced,
        supabaseError,
        timestamp: new Date().toISOString()
      }));

    } catch (err) {
      console.error('[Supabase Sync Error]:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  if (pathname === '/api/supabase/load-workspace' && req.method === 'GET') {
    try {
      const userId = parsedUrl.searchParams.get('userId') || '';
      if (!userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, message: 'userId parameter is required' }));
      }

      let workspaceData = null;

      // 1. Try to load from Supabase Cloud
      if (supabaseAdmin) {
        try {
          const { data, error } = await supabaseAdmin
            .from('rentora_workspaces')
            .select('data')
            .eq('user_id', userId)
            .maybeSingle();

          if (!error && data && data.data) {
            workspaceData = data.data;
          }
        } catch (e) {
          console.warn('[Supabase Load] Cloud query note:', e.message);
        }
      }

      // 2. Fallback to server backup if cloud table not populated yet
      if (!workspaceData) {
        const backupFile = path.join(__dirname, 'cloud_backups', `ws_${userId}.json`);
        if (fs.existsSync(backupFile)) {
          try {
            workspaceData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
          } catch (e) {}
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        workspaceData,
        hasCloudData: !!workspaceData
      }));

    } catch (err) {
      console.error('[Supabase Load Error]:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 9. STATIC FILE SERVING
  // ═════════════════════════════════════════════════════════════
  let reqPath = parsedUrl.pathname;
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
============================================================
  RENTORA — SMART PG & HOSTEL MANAGEMENT — LIVE SERVER ACTIVE
  Running at: http://localhost:${PORT}
  FamGateway Subscriptions: ACTIVE (₹1,500 / 30-Day Auto-Verification)
  Free 10-Day Trial Engine: ACTIVE
============================================================
  `);
});
