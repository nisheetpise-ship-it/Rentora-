// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — EXPENSES TAB
// ============================================================

const Expenses = {
  activeMonth: getCurrentMonth(),
  chartInstance: null,
  chartRange: '1Y', // '1M', '2M', '3M', '5M', '1Y', '2Y', 'custom'
  customStartMonth: '',
  customEndMonth: '',

  CATEGORIES: [
    { id: 'wifi',        label: 'Wi-Fi',       icon: '📶', color: '#0EA5E9' },
    { id: 'water',       label: 'Water',        icon: '💧', color: '#06B6D4' },
    { id: 'gas',         label: 'Gas',          icon: '🔥', color: '#F97316' },
    { id: 'electricity', label: 'Electricity',  icon: '⚡', color: '#EAB308' },
    { id: 'repairs',     label: 'Repairs',      icon: '🔧', color: '#8B5CF6' },
    { id: 'food',        label: 'Food',         icon: '🍱', color: '#22C55E' },
    { id: 'other',       label: 'Other',        icon: '📦', color: '#94A3B8' },
  ],

  getCatInfo(catId) {
    return this.CATEGORIES.find(c => c.id === catId) || { id: catId, label: catId, icon: '📦', color: '#94A3B8' };
  },

  render() {
    const prop    = DB.getProperty();
    const cur     = prop.currency || '₹';
    const summary = DB.getFinancialSummary(this.activeMonth);
    const expenses = DB.getExpensesByMonth(this.activeMonth);
    const isProfit = summary.netProfit >= 0;
    const payments = DB.getPaymentsByMonth(this.activeMonth);

    document.getElementById('tab-expenses').innerHTML = `
      <div class="scroll-area">

        <!-- Month Selector -->
        <div class="card">
          <div class="month-selector">
            <button class="month-nav-btn" onclick="Expenses.changeMonth(-1)">‹</button>
            <div style="text-align:center">
              <div class="month-name">${getMonthLabel(this.activeMonth)}</div>
              ${this.activeMonth === getCurrentMonth() ? '<div class="fs-12 color-secondary">Current Month</div>' : ''}
            </div>
            <button class="month-nav-btn" onclick="Expenses.changeMonth(1)"
              ${this.activeMonth >= getCurrentMonth() ? 'disabled style="opacity:0.3"' : ''}>›</button>
          </div>
        </div>

        <!-- Net P&L Hero Card -->
        <div class="net-profit-card ${isProfit ? 'profit' : 'loss'}">
          <div class="npc-label">${isProfit ? '📈 Net Profit' : '📉 Net Loss'}</div>
          <div class="npc-amount">${formatCurrency(Math.abs(summary.netProfit), cur)}</div>
          <div class="npc-month">${getMonthLabel(this.activeMonth)}</div>
          <div class="npc-breakdown">
            <div class="npc-item">
              <span class="npc-item-label">Rent Income</span>
              <span class="npc-item-val npc-pos">+${formatCurrency(summary.rentCollected, cur)}</span>
            </div>
            ${summary.otherIncome > 0 ? `
            <div class="npc-item">
              <span class="npc-item-label">Other Income</span>
              <span class="npc-item-val npc-pos">+${formatCurrency(summary.otherIncome, cur)}</span>
            </div>` : ''}
            <div class="npc-item">
              <span class="npc-item-label">Total Expenses</span>
              <span class="npc-item-val npc-neg">−${formatCurrency(summary.totalExpenses, cur)}</span>
            </div>
          </div>
        </div>

        <!-- Income Section -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💰 Income</div>
          </div>
          <div class="ei-row" style="margin-top:4px">
            <div class="ei-item">
              <div class="ei-icon-wrap" style="background:var(--accent-green-light)">💵</div>
              <div class="ei-info">
                <div class="ei-label">Rent Collected</div>
                <div class="ei-sub">${payments.length} payment(s) this month</div>
              </div>
              <div class="ei-amount ei-green">${formatCurrency(summary.rentCollected, cur)}</div>
            </div>
            <div class="ei-item ei-clickable" onclick="Expenses.editOtherIncome()">
              <div class="ei-icon-wrap" style="background:var(--accent-purple-light)">➕</div>
              <div class="ei-info">
                <div class="ei-label">Other Income</div>
                <div class="ei-sub">Laundry, parking, extras…</div>
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <div class="ei-amount ${summary.otherIncome > 0 ? 'ei-green' : 'ei-muted'}">
                  ${summary.otherIncome > 0 ? formatCurrency(summary.otherIncome, cur) : '+ Add'}
                </div>
                <span style="color:var(--text-muted)">›</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Expenses Section -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📤 Expenses</div>
            <button class="btn btn-primary btn-sm" id="btn-add-expense" onclick="Expenses.showAddModal()">+ Add</button>
          </div>
          ${expenses.length === 0 ? `
            <div class="empty-state" style="padding:24px 0">
              <div class="empty-icon">💸</div>
              <div class="empty-title">No expenses yet</div>
              <div class="empty-sub">Track your WiFi, water, gas, repairs & more</div>
            </div>
          ` : this.renderExpenseList(expenses, cur)}
        </div>

        <!-- P&L Trend Chart with Timeframe Selector -->
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:8px;align-items:center">
            <div class="card-title">📊 ${this.getChartTitle()}</div>
            <div class="chip-group" style="gap:5px;margin-left:auto">
              ${[
                { id: '1M', label: '1M' },
                { id: '2M', label: '2M' },
                { id: '3M', label: '3M' },
                { id: '6M', label: '6M' },
                { id: '1Y', label: '1Y' },
                { id: '2Y', label: '2Y' },
                { id: 'custom', label: '📅 Custom' },
              ].map(p => `
                <button class="chip ${this.chartRange === p.id ? 'active' : ''}" 
                  style="padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer"
                  onclick="Expenses.setChartRange('${p.id}')">
                  ${p.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Custom Date Range Bar (shown when custom is selected) -->
          <div id="chart-custom-bar" style="${this.chartRange === 'custom' ? 'display:flex;' : 'display:none;'}gap:8px;align-items:center;background:var(--bg-input);padding:10px 14px;border-radius:var(--radius-md);margin-bottom:12px;flex-wrap:wrap;border:1px solid var(--border);justify-content:space-between">
            <div style="display:flex;align-items:center;gap:8px;font-size:12px">
              <span style="font-weight:700;color:var(--text-secondary)">Custom Range:</span>
              <span style="font-weight:600;color:var(--accent-blue)">
                ${this.customStartMonth ? getMonthLabel(this.customStartMonth) : 'Start'} → ${this.customEndMonth ? getMonthLabel(this.customEndMonth) : 'End'}
              </span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn-primary btn-sm" style="padding:6px 14px;font-size:12px;border-radius:10px;display:flex;align-items:center;gap:6px" onclick="Expenses.openCustomRangePicker()">
                <span>📅 Change Date Range</span>
              </button>
              <button class="btn btn-danger btn-sm" style="padding:6px 10px;font-size:13px;border-radius:10px;display:flex;align-items:center;justify-content:center;min-width:34px;height:32px" onclick="Expenses.resetCustomRange()" title="Reset to 6-Month Graph" aria-label="Reset to 6-Month Graph">
                <span>🔄</span>
              </button>
            </div>
          </div>

          <div style="margin-bottom:8px;display:flex;gap:16px;flex-wrap:wrap">
            ${this.renderChartLegend()}
          </div>
          <div class="chart-container"><canvas id="profit-chart"></canvas></div>
        </div>

      </div>

      <!-- FAB -->
      <button class="fab fab-left" id="fab-add-expense" onclick="Expenses.showAddModal()" title="Add Expense">💸</button>
    `;

    setTimeout(() => this.drawChart(cur), 120);
  },

  renderChartLegend() {
    return [
      { color: '#22C55E', label: 'Net Profit' },
      { color: '#0EA5E9', label: 'Income' },
      { color: '#EF4444', label: 'Expenses' },
    ].map(l => `<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-secondary)">
      <span style="width:12px;height:3px;border-radius:2px;background:${l.color};display:inline-block"></span>${l.label}
    </span>`).join('');
  },

  renderExpenseList(expenses, cur) {
    const grouped = {};
    expenses.forEach(e => {
      if (!grouped[e.category]) grouped[e.category] = [];
      grouped[e.category].push(e);
    });

    return Object.entries(grouped).map(([catId, items]) => {
      const cat = this.getCatInfo(catId);
      const catTotal = items.reduce((s, e) => s + e.amount, 0);
      return `
        <div class="exp-group">
          <div class="exp-group-header">
            <span class="exp-group-icon" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</span>
            <span class="exp-group-label">${cat.label}</span>
            <span class="exp-group-total">${formatCurrency(catTotal, cur)}</span>
          </div>
          ${items.map(e => `
            <div class="exp-item" onclick="Expenses.showEditModal('${e.id}')">
              <div class="exp-item-info">
                <div class="exp-item-desc">${e.description || cat.label}</div>
                <div class="exp-item-date">📅 ${formatDateDisplay(e.date)}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="exp-item-amount">${formatCurrency(e.amount, cur)}</div>
                <button class="btn btn-ghost btn-sm btn-icon"
                  onclick="event.stopPropagation();Expenses.deleteExpense('${e.id}')">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  },

  changeMonth(dir) {
    this.activeMonth = getMonthOffset(this.activeMonth, dir);
    this.render();
  },

  // ── OTHER INCOME MODAL ──────────────────────────────────────
  editOtherIncome() {
    const prop = DB.getProperty();
    const cur  = prop.currency || '₹';
    const cur_val = DB.getOtherIncome(this.activeMonth);
    showModal('➕ Other Income', `
      <div style="text-align:center;padding:8px 0 20px">
        <div style="font-size:48px;margin-bottom:8px">💰</div>
        <div class="color-secondary fs-13">Extra income for ${getMonthLabel(this.activeMonth)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Amount (${cur})</label>
        <input class="form-input" id="inp-oi-amount" type="number" value="${cur_val}"
          style="font-size:22px;font-weight:700;text-align:center" placeholder="0">
      </div>
      <div style="background:var(--bg-input);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;font-size:12px;color:var(--text-secondary)">
        💡 Include: laundry charges, parking fees, guest charges, or any other income not from rent.
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-success btn-full" onclick="Expenses.saveOtherIncome()">✅ Save Income</button>
      </div>
    `);
    setTimeout(() => document.getElementById('inp-oi-amount')?.focus(), 100);
  },

  saveOtherIncome() {
    const amount = parseFloat(document.getElementById('inp-oi-amount').value) || 0;
    DB.setOtherIncome(this.activeMonth, amount);
    closeModal();
    this.render();
    showToast('✅ Other income updated!', 'success');
  },

  // ── ADD EXPENSE MODAL ───────────────────────────────────────
  showAddModal() {
    const prop = DB.getProperty();
    const cur  = prop.currency || '₹';
    const catChips = this.CATEGORIES.map((c, i) => `
      <button class="chip ${i === 0 ? 'active' : ''}" onclick="Expenses._selectCat(this,'${c.id}')" id="exp-chip-${c.id}">
        ${c.icon} ${c.label}
      </button>
    `).join('');

    showModal('💸 Add Expense', `
      <div class="form-group">
        <label class="form-label">Category *</label>
        <div class="chip-group" id="exp-cat-chips" style="flex-wrap:wrap;gap:8px">${catChips}</div>
        <input type="hidden" id="inp-exp-cat" value="${this.CATEGORIES[0].id}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-input" id="inp-exp-desc" placeholder="e.g. JioFiber monthly bill, Water tanker">
      </div>
      <div class="form-group">
        <label class="form-label">Amount (${cur}) *</label>
        <input class="form-input" id="inp-exp-amount" type="number" min="0" placeholder="0"
          style="font-size:22px;font-weight:700;text-align:center">
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" id="inp-exp-date" type="date" value="${formatDate(new Date())}">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger btn-full" onclick="Expenses.saveExpense()">💸 Add Expense</button>
      </div>
    `);
    setTimeout(() => document.getElementById('inp-exp-amount')?.focus(), 100);
  },

  _selectCat(btn, catId) {
    document.querySelectorAll('#exp-cat-chips .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('inp-exp-cat').value = catId;
  },

  saveExpense() {
    const category    = document.getElementById('inp-exp-cat').value;
    const description = document.getElementById('inp-exp-desc').value.trim();
    const amount      = parseFloat(document.getElementById('inp-exp-amount').value) || 0;
    const date        = document.getElementById('inp-exp-date').value;
    if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');

    DB.addExpense({
      id: generateId('exp'),
      month: this.activeMonth,
      category, description, amount, date,
    });
    closeModal();
    this.render();
    showToast(`✅ Expense added!`, 'success');
  },

  // ── EDIT EXPENSE MODAL ──────────────────────────────────────
  showEditModal(expId) {
    const exp  = DB.getExpenses().find(e => e.id === expId);
    if (!exp) return;
    const prop = DB.getProperty();
    const cur  = prop.currency || '₹';
    const cat  = this.getCatInfo(exp.category);

    const catChips = this.CATEGORIES.map(c => `
      <button class="chip ${c.id === exp.category ? 'active' : ''}" onclick="Expenses._selectCatEdit(this,'${c.id}')">
        ${c.icon} ${c.label}
      </button>
    `).join('');

    showModal(`✏️ Edit ${cat.icon} Expense`, `
      <div class="form-group">
        <label class="form-label">Category</label>
        <div class="chip-group" id="exp-cat-chips-edit" style="flex-wrap:wrap;gap:8px">${catChips}</div>
        <input type="hidden" id="inp-exp-cat-edit" value="${exp.category}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-input" id="inp-exp-desc-edit" value="${exp.description || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Amount (${cur}) *</label>
        <input class="form-input" id="inp-exp-amount-edit" type="number" value="${exp.amount}"
          style="font-size:22px;font-weight:700;text-align:center">
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" id="inp-exp-date-edit" type="date" value="${exp.date}">
      </div>
      <div class="form-actions" style="display:flex;gap:8px">
        <button class="btn btn-ghost" style="flex:0 0 auto;padding:12px 14px" onclick="Expenses.deleteExpense('${expId}')">🗑️</button>
        <button class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" style="flex:1" onclick="Expenses.updateExpense('${expId}')">Save</button>
      </div>
    `);
  },

  _selectCatEdit(btn, catId) {
    document.querySelectorAll('#exp-cat-chips-edit .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('inp-exp-cat-edit').value = catId;
  },

  updateExpense(expId) {
    const category    = document.getElementById('inp-exp-cat-edit').value;
    const description = document.getElementById('inp-exp-desc-edit').value.trim();
    const amount      = parseFloat(document.getElementById('inp-exp-amount-edit').value) || 0;
    const date        = document.getElementById('inp-exp-date-edit').value;
    if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');

    DB.updateExpense(expId, { category, description, amount, date });
    closeModal();
    this.render();
    showToast('✅ Expense updated!', 'success');
  },

  deleteExpense(expId) {
    if (!confirm('Delete this expense?')) return;
    DB.deleteExpense(expId);
    closeModal();
    this.render();
    showToast('🗑️ Expense deleted', 'info');
  },

  // ── CHART TIMEFRAME METHODS ───────────────────────────────
  getChartTitle() {
    switch (this.chartRange) {
      case '1M': return '1-Month P&L Trend';
      case '2M': return '2-Month P&L Trend';
      case '3M': return '3-Month P&L Trend';
      case '6M': return '6-Month P&L Trend';
      case '1Y': return '12-Month P&L Trend';
      case '2Y': return '2-Year P&L Trend';
      case 'custom':
        if (this.customStartMonth && this.customEndMonth) {
          return `P&L Trend (${getMonthLabel(this.customStartMonth)} – ${getMonthLabel(this.customEndMonth)})`;
        }
        return 'Custom P&L Trend';
      default:
        return '12-Month P&L Trend';
    }
  },

  setChartRange(range) {
    if (range === 'custom') {
      this.openCustomRangePicker();
      return;
    }
    this.chartRange = range;
    const prop = DB.getProperty();
    const cur  = prop.currency || '₹';
    this.render();
  },

  resetCustomRange() {
    this.customStartMonth = '';
    this.customEndMonth = '';
    this.chartRange = '6M';
    if (typeof SoundFX !== 'undefined' && SoundFX.toast) {
      SoundFX.toast('info');
    }
    const prop = DB.getProperty();
    const cur  = prop.currency || '₹';
    this.render();
    showToast('🔄 Reset chart to 6-Month P&L trend', 'info');
  },

  openCustomRangePicker() {
    const curMonth = getCurrentMonth();
    const start = this.customStartMonth || getEarliestDataMonth();
    const end = this.customEndMonth || curMonth;
    if (typeof CustomDateRangePicker !== 'undefined') {
      CustomDateRangePicker.open(start, end);
    }
  },

  setCustomRangeFromPicker(startMonth, endMonth) {
    this.customStartMonth = startMonth;
    this.customEndMonth = endMonth;
    this.chartRange = 'custom';
    const prop = DB.getProperty();
    const cur  = prop.currency || '₹';
    this.render();
    showToast(`📊 Chart updated: ${getMonthLabel(startMonth)} to ${getMonthLabel(endMonth)}`, 'success');
  },

  getChartMonths() {
    switch (this.chartRange) {
      case '1M': return getMonthsRange(1);
      case '2M': return getMonthsRange(2);
      case '3M': return getMonthsRange(3);
      case '6M': return getMonthsRange(6);
      case '1Y': return getMonthsRange(12);
      case '2Y': return getMonthsRange(24);
      case 'custom': {
        const start = this.customStartMonth || getEarliestDataMonth();
        const end = this.customEndMonth || getCurrentMonth();
        return getMonthsBetween(start, end);
      }
      default:
        return getLast12Months();
    }
  },

  // ── CHART ───────────────────────────────────────────────────
  drawChart(cur) {
    const canvas = document.getElementById('profit-chart');
    if (!canvas) return;
    if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }

    const months = this.getChartMonths();
    const labels = months.map(m => {
      const [y, mo] = m.split('-').map(Number);
      return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    const incomeData  = months.map(m => {
      const s = DB.getFinancialSummary(m);
      return s.rentCollected + s.otherIncome;
    });
    const expenseData = months.map(m => DB.getFinancialSummary(m).totalExpenses);
    const profitData  = months.map((m, i) => incomeData[i] - expenseData[i]);

    const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

    this.chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Profit',
            data: profitData,
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34,197,94,0.08)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: profitData.map(v => v >= 0 ? '#22C55E' : '#EF4444'),
            pointRadius: months.length > 24 ? 2 : (months.length > 12 ? 3 : 5),
            pointHoverRadius: 7,
            borderWidth: 2.5,
          },
          {
            label: 'Income',
            data: incomeData,
            borderColor: '#0EA5E9',
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: months.length > 24 ? 1 : 3,
            borderWidth: 1.5,
            borderDash: [5, 4],
          },
          {
            label: 'Expenses',
            data: expenseData,
            borderColor: '#EF4444',
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: months.length > 24 ? 1 : 3,
            borderWidth: 1.5,
            borderDash: [5, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, cur)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v,
            },
          },
        },
      },
    });
  },
};
