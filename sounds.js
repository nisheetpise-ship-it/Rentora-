// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — HAPTIC SOUND ENGINE
// Professional Gen-Z sound design using Web Audio API
// No external files — all sounds are synthesized
// ============================================================

const SoundFX = {
  ctx: null,
  enabled: true,
  _initialized: false,

  // Initialize AudioContext on first user interaction
  _ensureContext() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
      return this.ctx;
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  },

  // ── VIBRATION HAPTIC (mobile devices) ─────────────────────
  _vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  },

  // ── CORE SYNTH HELPER ─────────────────────────────────────
  _playTone({ freq = 800, freq2 = null, type = 'sine', duration = 0.08, volume = 0.15, attack = 0.005, release = 0.05, delay = 0 } = {}) {
    const ctx = this._ensureContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2) {
      osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.setValueAtTime(volume, now + duration - release);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  },

  // Play a noise burst (click/tap feel)
  _playNoiseBurst({ duration = 0.03, volume = 0.06, filterFreq = 4000 } = {}) {
    const ctx = this._ensureContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  },

  // ═══════════════════════════════════════════════════════════
  //   SOUND EFFECTS — mapped to UI interactions
  // ═══════════════════════════════════════════════════════════

  // ── PIN KEY PRESS (subtle click + tone per digit) ─────────
  pinKey(digit) {
    this._vibrate(8);
    const baseFreq = 520;
    const step = digit === '⌫' ? -3 : parseInt(digit) || 0;
    const freq = baseFreq + (step * 55);

    this._playNoiseBurst({ duration: 0.02, volume: 0.04, filterFreq: 6000 });
    this._playTone({
      freq: freq,
      type: 'sine',
      duration: 0.08,
      volume: 0.10,
      attack: 0.003,
      release: 0.04,
    });
  },

  // ── PIN BACKSPACE ─────────────────────────────────────────
  pinDelete() {
    this._vibrate(12);
    this._playTone({
      freq: 380,
      freq2: 260,
      type: 'triangle',
      duration: 0.10,
      volume: 0.10,
      attack: 0.005,
      release: 0.06,
    });
  },

  // ── PIN SUCCESS (unlock) — rising arpeggio ────────────────
  pinSuccess() {
    this._vibrate([20, 50, 20]);
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      this._playTone({
        freq,
        type: 'sine',
        duration: 0.12,
        volume: 0.12,
        attack: 0.005,
        release: 0.06,
        delay: i * 0.08,
      });
    });
  },

  // ── PIN ERROR — descending buzz ───────────────────────────
  pinError() {
    this._vibrate([50, 40, 50]);
    this._playTone({ freq: 280, freq2: 180, type: 'sawtooth', duration: 0.18, volume: 0.08, attack: 0.005, release: 0.10 });
    this._playTone({ freq: 260, freq2: 160, type: 'sawtooth', duration: 0.18, volume: 0.06, attack: 0.005, release: 0.10, delay: 0.12 });
  },

  // ── APP UNLOCK — elegant whoosh chime ─────────────────────
  appUnlock() {
    this._vibrate([15, 40, 15, 40, 25]);
    [523, 659, 784, 988, 1318].forEach((freq, i) => {
      this._playTone({
        freq,
        type: 'sine',
        duration: 0.35 - i * 0.03,
        volume: 0.08 - i * 0.01,
        attack: 0.01,
        release: 0.20,
        delay: i * 0.05,
      });
    });
    this._playNoiseBurst({ duration: 0.05, volume: 0.03, filterFreq: 8000 });
  },

  // ── NAV TAB SWITCH — quick pop ────────────────────────────
  navTab() {
    this._vibrate(6);
    this._playNoiseBurst({ duration: 0.015, volume: 0.04, filterFreq: 5000 });
    this._playTone({
      freq: 880,
      freq2: 1100,
      type: 'sine',
      duration: 0.06,
      volume: 0.07,
      attack: 0.003,
      release: 0.03,
    });
  },

  // ── BUTTON CLICK (general) — soft pop ─────────────────────
  buttonClick() {
    this._vibrate(5);
    this._playNoiseBurst({ duration: 0.012, volume: 0.03, filterFreq: 5500 });
    this._playTone({
      freq: 700,
      type: 'triangle',
      duration: 0.05,
      volume: 0.07,
      attack: 0.003,
      release: 0.03,
    });
  },

  // ── CARD TAP (rooms, tenants, etc.) — deeper touch ────────
  cardTap() {
    this._vibrate(6);
    this._playTone({
      freq: 440,
      freq2: 520,
      type: 'sine',
      duration: 0.07,
      volume: 0.06,
      attack: 0.003,
      release: 0.04,
    });
  },

  // ── MODAL OPEN — sheet slide up ───────────────────────────
  modalOpen() {
    this._vibrate(10);
    this._playTone({
      freq: 400,
      freq2: 700,
      type: 'sine',
      duration: 0.12,
      volume: 0.08,
      attack: 0.005,
      release: 0.06,
    });
    this._playNoiseBurst({ duration: 0.02, volume: 0.02, filterFreq: 3000 });
  },

  // ── MODAL CLOSE — sheet slide down ────────────────────────
  modalClose() {
    this._vibrate(8);
    this._playTone({
      freq: 600,
      freq2: 350,
      type: 'sine',
      duration: 0.10,
      volume: 0.06,
      attack: 0.003,
      release: 0.06,
    });
  },

  // ── TOGGLE SWITCH (dark mode, etc.) ───────────────────────
  toggle() {
    this._vibrate(8);
    this._playTone({
      freq: 660,
      freq2: 990,
      type: 'sine',
      duration: 0.08,
      volume: 0.08,
      attack: 0.003,
      release: 0.04,
    });
  },

  // ── SUCCESS ACTION (payment recorded, tenant added) ───────
  success() {
    this._vibrate([10, 30, 15]);
    this._playTone({ freq: 660, type: 'sine', duration: 0.10, volume: 0.10, attack: 0.005, release: 0.05 });
    this._playTone({ freq: 880, type: 'sine', duration: 0.14, volume: 0.10, attack: 0.005, release: 0.08, delay: 0.08 });
    this._playTone({ freq: 1100, type: 'sine', duration: 0.18, volume: 0.08, attack: 0.005, release: 0.12, delay: 0.16 });
  },

  // ── ERROR / WARNING ───────────────────────────────────────
  error() {
    this._vibrate([30, 50, 30]);
    this._playTone({ freq: 250, type: 'square', duration: 0.12, volume: 0.06, attack: 0.005, release: 0.08 });
    this._playTone({ freq: 200, type: 'square', duration: 0.15, volume: 0.05, attack: 0.005, release: 0.10, delay: 0.10 });
  },

  // ── DELETE / DESTRUCTIVE ACTION ───────────────────────────
  deleteAction() {
    this._vibrate([15, 30, 40]);
    this._playTone({ freq: 440, freq2: 220, type: 'triangle', duration: 0.15, volume: 0.08, attack: 0.005, release: 0.10 });
    this._playNoiseBurst({ duration: 0.04, volume: 0.04, filterFreq: 2000 });
  },

  // ── CHATBOT OPEN — playful pop ────────────────────────────
  chatbotOpen() {
    this._vibrate(10);
    this._playTone({ freq: 523, type: 'sine', duration: 0.08, volume: 0.10, attack: 0.003, release: 0.04 });
    this._playTone({ freq: 784, type: 'sine', duration: 0.10, volume: 0.08, attack: 0.003, release: 0.05, delay: 0.06 });
  },

  // ── CHATBOT CLOSE ─────────────────────────────────────────
  chatbotClose() {
    this._vibrate(8);
    this._playTone({ freq: 700, freq2: 440, type: 'sine', duration: 0.10, volume: 0.07, attack: 0.003, release: 0.06 });
  },

  // ── CHATBOT QUESTION TAP ──────────────────────────────────
  chatbotQuestion() {
    this._vibrate(6);
    this._playTone({
      freq: 600,
      freq2: 800,
      type: 'sine',
      duration: 0.06,
      volume: 0.07,
      attack: 0.003,
      release: 0.03,
    });
  },

  // ── CHATBOT ANSWER RECEIVED ───────────────────────────────
  chatbotAnswer() {
    this._vibrate(5);
    this._playTone({ freq: 880, type: 'sine', duration: 0.05, volume: 0.06, attack: 0.003, release: 0.03 });
    this._playTone({ freq: 1100, type: 'sine', duration: 0.07, volume: 0.05, attack: 0.003, release: 0.04, delay: 0.04 });
  },

  // ── TOAST NOTIFICATION ────────────────────────────────────
  toast(type = 'info') {
    this._vibrate(type === 'error' ? [20, 30, 20] : 8);
    if (type === 'success') {
      this._playTone({ freq: 880, type: 'sine', duration: 0.08, volume: 0.07, attack: 0.003, release: 0.04 });
    } else if (type === 'error') {
      this._playTone({ freq: 300, type: 'triangle', duration: 0.12, volume: 0.07, attack: 0.005, release: 0.06 });
    } else {
      this._playTone({ freq: 660, type: 'sine', duration: 0.06, volume: 0.06, attack: 0.003, release: 0.03 });
    }
  },

  // ── WHATSAPP SEND ─────────────────────────────────────────
  whatsappSend() {
    this._vibrate([8, 30, 12]);
    this._playTone({ freq: 600, type: 'sine', duration: 0.06, volume: 0.08, attack: 0.003, release: 0.03 });
    this._playTone({ freq: 900, type: 'sine', duration: 0.08, volume: 0.07, attack: 0.003, release: 0.04, delay: 0.05 });
    this._playTone({ freq: 1200, type: 'sine', duration: 0.10, volume: 0.06, attack: 0.003, release: 0.06, delay: 0.10 });
  },

  // ── DROPDOWN / SELECT ─────────────────────────────────────
  dropdown() {
    this._vibrate(5);
    this._playTone({ freq: 500, freq2: 700, type: 'sine', duration: 0.05, volume: 0.06, attack: 0.003, release: 0.03 });
  },

  // ── WHEEL TICK (satisfying, premium tactile click for wheel picker) ───
  wheelTick() {
    this._vibrate(5);
    const ctx = this._ensureContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime;

    // 1. High-precision tactile acoustic click (organic wood/ceramic tooth click)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    // Rapid micro pitch drop creates the tactile "tock" transient sensation
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.015);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.016);

    // 2. Crisp subtle mechanical tooth texture
    this._playNoiseBurst({ duration: 0.004, volume: 0.025, filterFreq: 4500 });
  },

  // ── SCROLL SNAP (subtle for lists) ────────────────────────
  scrollSnap() {
    this.wheelTick();
  },
};
