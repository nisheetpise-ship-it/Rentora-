// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — CUSTOM DATE RANGE PICKER
// Powered by Rentora
// Apple / Samsung inspired two-column smooth scrolling wheel picker
// ============================================================

const CustomDateRangePicker = {
  activeTab: 'start', // 'start' or 'end'
  tempStartYear: 2026,
  tempStartMonth: 10,
  tempEndYear: 2026,
  tempEndMonth: 10,

  yearsList: [],
  monthsList: [
    { value: 1,  name: 'January',   short: 'Jan', emoji: '❄️', color: '#38BDF8' },
    { value: 2,  name: 'February',  short: 'Feb', emoji: '💖', color: '#F472B6' },
    { value: 3,  name: 'March',     short: 'Mar', emoji: '☀️', color: '#FBBF24' },
    { value: 4,  name: 'April',     short: 'Apr', emoji: '🌸', color: '#FB7185' },
    { value: 5,  name: 'May',       short: 'May', emoji: '🔥', color: '#F97316' },
    { value: 6,  name: 'June',      short: 'Jun', emoji: '🌧️', color: '#0EA5E9' },
    { value: 7,  name: 'July',      short: 'Jul', emoji: '⛈️', color: '#6366F1' },
    { value: 8,  name: 'August',    short: 'Aug', emoji: '🌈', color: '#10B981' },
    { value: 9,  name: 'September', short: 'Sep', emoji: '🍃', color: '#14B8A6' },
    { value: 10, name: 'October',   short: 'Oct', emoji: '✨', color: '#EAB308' },
    { value: 11, name: 'November',  short: 'Nov', emoji: '🍁', color: '#D97706' },
    { value: 12, name: 'December',  short: 'Dec', emoji: '🎄', color: '#22C55E' },
  ],

  isOpen: false,
  _listenersAttached: false,
  _scrollDebounceTimer: null,
  _isProgrammaticScroll: false,

  initYears() {
    const currentYear = new Date().getFullYear(); // e.g. 2026
    let maxYear = currentYear + 1; // Base: 2026, 2027

    // If rent is collected for a future year (e.g., 2028), automatically detect and include it
    if (typeof getLatestDataMonth === 'function') {
      const latestMonthStr = getLatestDataMonth();
      const latestYear = parseInt(latestMonthStr.split('-')[0]);
      if (latestYear && latestYear > maxYear) {
        maxYear = latestYear;
      }
    }

    const list = [];
    for (let y = currentYear; y <= maxYear; y++) {
      list.push(y);
    }
    this.yearsList = list;
  },

  open(currentStart, currentEnd) {
    this.initYears();

    const curDate = new Date();
    const curYear = curDate.getFullYear();
    const curMonth = curDate.getMonth() + 1; // 1-12
    const curMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const defaultStart = currentStart || curMonthStr;
    const defaultEnd = currentEnd || curMonthStr;

    let [sY, sM] = defaultStart.split('-').map(Number);
    let [eY, eM] = defaultEnd.split('-').map(Number);

    // Ensure selected years fall within the valid available years
    if (!this.yearsList.includes(sY)) sY = curYear;
    if (!this.yearsList.includes(eY)) eY = curYear;

    this.tempStartYear = sY || curYear;
    this.tempStartMonth = sM || curMonth;
    this.tempEndYear = eY || curYear;
    this.tempEndMonth = eM || curMonth;

    this.activeTab = 'start';
    this.renderModal();

    const overlay = document.getElementById('pdp-custom-overlay');
    if (overlay) {
      overlay.classList.add('open');
      this.isOpen = true;
    }

    if (typeof SoundFX !== 'undefined' && SoundFX.modalOpen) {
      SoundFX.modalOpen();
    }

    setTimeout(() => {
      this.scrollToSelected(true);
      this.attachScrollListeners();
    }, 60);
  },

  close() {
    const overlay = document.getElementById('pdp-custom-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
    this.isOpen = false;
    if (typeof SoundFX !== 'undefined' && SoundFX.modalClose) {
      SoundFX.modalClose();
    }
  },

  switchTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    if (typeof SoundFX !== 'undefined' && SoundFX.cardTap) {
      SoundFX.cardTap();
    }

    // Update tab visual states
    document.querySelectorAll('.pdp-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    this.updatePreviewStrip();
    this.scrollToSelected(true);
  },

  renderModal() {
    let overlay = document.getElementById('pdp-custom-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pdp-custom-overlay';
      overlay.className = 'pdp-overlay';
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }

    const startLabel = `${this.getMonthName(this.tempStartMonth, true)} ${this.tempStartYear}`;
    const endLabel = `${this.getMonthName(this.tempEndMonth, true)} ${this.tempEndYear}`;

    overlay.innerHTML = `
      <div class="pdp-modal" role="dialog" aria-modal="true" aria-labelledby="pdp-modal-title">
        <!-- Header -->
        <div class="pdp-header">
          <div class="pdp-header-left">
            <div class="pdp-badge-icon">📅</div>
            <div>
              <div class="pdp-title" id="pdp-modal-title">Custom Date Range</div>
              <div class="pdp-subtitle">Scroll month &amp; year smoothly</div>
            </div>
          </div>
          <button class="pdp-close-btn" onclick="CustomDateRangePicker.close()" aria-label="Close picker">✕</button>
        </div>

        <!-- Range Selection Segment Tabs -->
        <div class="pdp-tabs" role="tablist">
          <button class="pdp-tab ${this.activeTab === 'start' ? 'active' : ''}" data-tab="start" onclick="CustomDateRangePicker.switchTab('start')" role="tab" aria-selected="${this.activeTab === 'start'}">
            <span class="pdp-tab-dot"></span>
            <span>From (Start):</span>
            <span class="pdp-tab-val" id="pdp-tab-val-start">${startLabel}</span>
          </button>
          <button class="pdp-tab ${this.activeTab === 'end' ? 'active' : ''}" data-tab="end" onclick="CustomDateRangePicker.switchTab('end')" role="tab" aria-selected="${this.activeTab === 'end'}">
            <span class="pdp-tab-dot"></span>
            <span>To (End):</span>
            <span class="pdp-tab-val" id="pdp-tab-val-end">${endLabel}</span>
          </button>
        </div>

        <!-- Two-Column Side-by-Side Scrolling Picker -->
        <div class="pdp-wheel-viewport">
          <!-- Selection Glass Indicator Bar -->
          <div class="pdp-selection-bar" aria-hidden="true">
            <span class="pdp-indicator-pointer">►</span>
            <span class="pdp-indicator-pointer">◄</span>
          </div>

          <!-- Top & Bottom Gradient Vignettes -->
          <div class="pdp-fade-top" aria-hidden="true"></div>
          <div class="pdp-fade-bottom" aria-hidden="true"></div>

          <!-- Side-by-Side Columns -->
          <div class="pdp-columns-grid">
            <!-- Left Column: Month -->
            <div class="pdp-col-wrapper">
              <span class="pdp-col-label">Month</span>
              <div class="pdp-scroll-list" id="pdp-wheel-month" tabindex="0" role="listbox" aria-label="Select Month">
                ${this.monthsList.map(m => `
                  <div class="pdp-item pdp-month-item" data-value="${m.value}" role="option" aria-selected="false" onclick="CustomDateRangePicker.selectMonthItem(${m.value})">
                    <span class="pdp-month-indicator" data-emoji="${m.emoji}" style="--dot-color:${m.color}">
                      <span class="pdp-dot"></span>
                      <span class="pdp-emoji">${m.emoji}</span>
                    </span>
                    <span class="pdp-month-text">${m.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Right Column: Year -->
            <div class="pdp-col-wrapper">
              <span class="pdp-col-label">Year</span>
              <div class="pdp-scroll-list" id="pdp-wheel-year" tabindex="0" role="listbox" aria-label="Select Year">
                ${this.yearsList.map(y => `
                  <div class="pdp-item" data-value="${y}" role="option" aria-selected="false" onclick="CustomDateRangePicker.selectYearItem(${y})">
                    ${y}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Live Summary Range Strip -->
        <div class="pdp-summary-strip">
          <div class="pdp-summary-label">
            <span>📊 Selected Trend:</span>
          </div>
          <div class="pdp-summary-value" id="pdp-summary-text">
            <span>${startLabel}</span>
            <span class="pdp-summary-arrow">→</span>
            <span>${endLabel}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="pdp-actions">
          <button class="pdp-btn-cancel" onclick="CustomDateRangePicker.close()">Cancel</button>
          <button class="pdp-btn-apply" onclick="CustomDateRangePicker.apply()">
            <span>✨ Apply Range</span>
          </button>
        </div>
      </div>
    `;
  },

  attachScrollListeners() {
    const monthEl = document.getElementById('pdp-wheel-month');
    const yearEl = document.getElementById('pdp-wheel-year');
    if (!monthEl || !yearEl) return;

    const setupColumnScroll = (el, type) => {
      let scrollTimer = null;
      el.addEventListener('scroll', () => {
        if (this._isProgrammaticScroll) return;

        // Real-time highlight closest item
        this.updateWheelHighlight(el);

        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          this.onScrollStop(el, type);
        }, 110);
      }, { passive: true });

      // Keyboard navigation support
      el.addEventListener('keydown', (e) => {
        const itemHeight = 44;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          el.scrollBy({ top: -itemHeight, behavior: 'smooth' });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          el.scrollBy({ top: itemHeight, behavior: 'smooth' });
        }
      });
    };

    setupColumnScroll(monthEl, 'month');
    setupColumnScroll(yearEl, 'year');
  },

  updateWheelHighlight(container) {
    const items = container.querySelectorAll('.pdp-item');
    const containerCenter = container.scrollTop + (container.clientHeight / 2);

    let closestItem = null;
    let minDistance = Infinity;

    items.forEach(item => {
      const itemCenter = item.offsetTop + (item.offsetHeight / 2);
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestItem = item;
      }
    });

    if (closestItem && container._lastClosestItem !== closestItem) {
      if (container._lastClosestItem && !this._isProgrammaticScroll) {
        this.playTickSound();
      }
      container._lastClosestItem = closestItem;
    }

    items.forEach(item => {
      const isSelected = item === closestItem;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  },

  onScrollStop(container, type) {
    const items = container.querySelectorAll('.pdp-item');
    const containerCenter = container.scrollTop + (container.clientHeight / 2);

    let closestItem = null;
    let minDistance = Infinity;

    items.forEach(item => {
      const itemCenter = item.offsetTop + (item.offsetHeight / 2);
      const distance = Math.abs(containerCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestItem = item;
      }
    });

    if (closestItem) {
      const val = parseInt(closestItem.dataset.value);
      if (type === 'month') {
        if (this.activeTab === 'start') {
          this.tempStartMonth = val;
        } else {
          this.tempEndMonth = val;
        }
      } else if (type === 'year') {
        if (this.activeTab === 'start') {
          this.tempStartYear = val;
        } else {
          this.tempEndYear = val;
        }
      }
      this.updatePreviewStrip();
    }
  },

  playTickSound() {
    if (typeof SoundFX !== 'undefined' && SoundFX.wheelTick) {
      SoundFX.wheelTick();
    }
  },

  scrollToSelected(smooth = true) {
    const curMonth = (this.activeTab === 'start') ? this.tempStartMonth : this.tempEndMonth;
    const curYear = (this.activeTab === 'start') ? this.tempStartYear : this.tempEndYear;

    const monthEl = document.getElementById('pdp-wheel-month');
    const yearEl = document.getElementById('pdp-wheel-year');
    if (!monthEl || !yearEl) return;

    this._isProgrammaticScroll = true;

    const scrollContainerTo = (container, val) => {
      const item = container.querySelector(`.pdp-item[data-value="${val}"]`);
      if (item) {
        const targetScroll = item.offsetTop - (container.clientHeight / 2) + (item.offsetHeight / 2);
        container.scrollTo({
          top: targetScroll,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
      this.updateWheelHighlight(container);
    };

    scrollContainerTo(monthEl, curMonth);
    scrollContainerTo(yearEl, curYear);

    setTimeout(() => {
      this._isProgrammaticScroll = false;
      this.updateWheelHighlight(monthEl);
      this.updateWheelHighlight(yearEl);
    }, smooth ? 300 : 50);
  },

  selectMonthItem(val) {
    const monthEl = document.getElementById('pdp-wheel-month');
    if (!monthEl) return;
    if (this.activeTab === 'start') this.tempStartMonth = val;
    else this.tempEndMonth = val;

    const item = monthEl.querySelector(`.pdp-item[data-value="${val}"]`);
    if (item) {
      const targetScroll = item.offsetTop - (monthEl.clientHeight / 2) + (item.offsetHeight / 2);
      monthEl.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
    this.updatePreviewStrip();
  },

  selectYearItem(val) {
    const yearEl = document.getElementById('pdp-wheel-year');
    if (!yearEl) return;
    if (this.activeTab === 'start') this.tempStartYear = val;
    else this.tempEndYear = val;

    const item = yearEl.querySelector(`.pdp-item[data-value="${val}"]`);
    if (item) {
      const targetScroll = item.offsetTop - (yearEl.clientHeight / 2) + (item.offsetHeight / 2);
      yearEl.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
    this.updatePreviewStrip();
  },

  getMonthInfo(monthNum) {
    return this.monthsList.find(m => m.value === monthNum) || { name: '', short: '', emoji: '📅', color: '#0EA5E9' };
  },

  getMonthName(monthNum, isShort = false) {
    const found = this.getMonthInfo(monthNum);
    return isShort ? found.short : found.name;
  },

  updatePreviewStrip() {
    const startInfo = this.getMonthInfo(this.tempStartMonth);
    const endInfo = this.getMonthInfo(this.tempEndMonth);

    const startLabel = `${startInfo.emoji} ${startInfo.short} ${this.tempStartYear}`;
    const endLabel = `${endInfo.emoji} ${endInfo.short} ${this.tempEndYear}`;

    const startValEl = document.getElementById('pdp-tab-val-start');
    const endValEl = document.getElementById('pdp-tab-val-end');
    const summaryText = document.getElementById('pdp-summary-text');

    if (startValEl) startValEl.innerHTML = `<span>${startLabel}</span>`;
    if (endValEl) endValEl.innerHTML = `<span>${endLabel}</span>`;
    if (summaryText) {
      summaryText.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:4px">${startLabel}</span>
        <span class="pdp-summary-arrow">→</span>
        <span style="display:inline-flex;align-items:center;gap:4px">${endLabel}</span>
      `;
    }
  },

  apply() {
    let startStr = `${this.tempStartYear}-${String(this.tempStartMonth).padStart(2, '0')}`;
    let endStr = `${this.tempEndYear}-${String(this.tempEndMonth).padStart(2, '0')}`;

    // Ensure start <= end automatically
    if (startStr > endStr) {
      const swap = startStr;
      startStr = endStr;
      endStr = swap;
    }

    if (typeof SoundFX !== 'undefined' && SoundFX.success) {
      SoundFX.success();
    }

    this.close();

    if (typeof Expenses !== 'undefined' && typeof Expenses.setCustomRangeFromPicker === 'function') {
      Expenses.setCustomRangeFromPicker(startStr, endStr);
    }
  }
};
