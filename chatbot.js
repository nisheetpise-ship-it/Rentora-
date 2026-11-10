// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — AI CHATBOT
// Powered by Rentora
// No keyboard, no typing — only preset questions with
// instant answers powered by live PG data
// ============================================================

const Chatbot = {
  isOpen: false,
  currentAnswer: null,

  // ═══════════════════════════════════════════════════════════
  // 15 FIXED QUESTIONS — organized by category
  // ═══════════════════════════════════════════════════════════
  QUESTIONS: [
    { id: 'unpaid', emoji: '💸', label: "Who hasn't paid rent?", category: 'rent' },
    { id: 'paid', emoji: '✅', label: "Who has paid this month?", category: 'rent' },
    { id: 'collected', emoji: '💰', label: "Total rent collected", category: 'rent' },
    { id: 'pending', emoji: '⏳', label: "Pending rent amount", category: 'rent' },

    { id: 'vacant', emoji: '🛏️', label: "Vacant beds & rooms", category: 'rooms' },
    { id: 'occupancy', emoji: '📊', label: "Occupancy rate", category: 'rooms' },
    { id: 'floor_map', emoji: '🏢', label: "Floor-wise breakdown", category: 'rooms' },

    { id: 'all_tenants', emoji: '👥', label: "All tenants list", category: 'tenants' },
    { id: 'tenant_count', emoji: '📋', label: "Tenant summary", category: 'tenants' },
    { id: 'new_tenants', emoji: '🆕', label: "Recently joined tenants", category: 'tenants' },
    { id: 'deposits', emoji: '🔒', label: "Security deposits held", category: 'tenants' },

    { id: 'profit', emoji: '📈', label: "This month's profit/loss", category: 'finance' },
    { id: 'expenses', emoji: '📤', label: "Expenses breakdown", category: 'finance' },
    { id: 'last_month', emoji: '📅', label: "Last month vs this month", category: 'finance' },

    { id: 'property', emoji: '🏠', label: "My PG details", category: 'property' },
  ],

  CAT_EMOJIS: { wifi: '📶', water: '💧', gas: '🔥', electricity: '⚡', repairs: '🔧', food: '🍱', other: '📦' },

  init() {
    this.renderShell();
  },

  renderShell() {
    const container = document.getElementById('chatbot-container');
    if (!container) return;
    container.innerHTML = `
      <button class="chatbot-fab" id="chatbot-fab" onclick="Chatbot.toggle()" title="Ask Rentora AI">
        <span class="chatbot-fab-icon">🤖</span>
        <span class="chatbot-pulse"></span>
      </button>
      <div class="chatbot-panel" id="chatbot-panel">
        <div class="chatbot-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="chatbot-avatar-wrap">🤖</div>
            <div>
              <div class="chatbot-name">Rentora AI</div>
              <div class="chatbot-status"><span class="chatbot-dot"></span>Instant answers</div>
            </div>
          </div>
          <button class="chatbot-close-btn" onclick="Chatbot.toggle()">✕</button>
        </div>
        <div class="chatbot-body" id="chatbot-body"></div>
      </div>
    `;
    this._renderQuestions();
  },

  toggle() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('chatbot-panel');
    const fab = document.getElementById('chatbot-fab');
    if (panel) panel.classList.toggle('open', this.isOpen);
    if (fab) fab.classList.toggle('active', this.isOpen);
    if (this.isOpen) {
      SoundFX.chatbotOpen();
      this.currentAnswer = null;
      this._renderQuestions();
    } else {
      SoundFX.chatbotClose();
    }
  },

  _renderQuestions() {
    const body = document.getElementById('chatbot-body');
    if (!body) return;
    const categories = [
      { key: 'rent', label: '💸 Rent & Payments' },
      { key: 'rooms', label: '🛏️ Rooms & Beds' },
      { key: 'tenants', label: '👥 Tenants' },
      { key: 'finance', label: '📊 Finances' },
      { key: 'property', label: '🏠 Property' },
    ];
    let html = `
      <div class="chatbot-welcome">
        <div class="chatbot-welcome-text">Tap a question to get <strong>instant answers</strong> from your PG data</div>
      </div>
      <div class="chatbot-questions-scroll">
    `;
    categories.forEach(cat => {
      const questions = this.QUESTIONS.filter(q => q.category === cat.key);
      html += `
        <div class="chatbot-cat-group">
          <div class="chatbot-cat-label">${cat.label}</div>
          <div class="chatbot-q-list">
            ${questions.map(q => `
              <button class="chatbot-q-btn" onclick="Chatbot.askQuestion('${q.id}')" data-category="${cat.key}">
                <span class="chatbot-q-emoji">${q.emoji}</span>
                <span class="chatbot-q-text">${q.label}</span>
                <span class="chatbot-q-arrow">›</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    });
    html += '</div>';
    body.innerHTML = html;
  },

  _renderAnswer(questionId, answer) {
    const body = document.getElementById('chatbot-body');
    if (!body) return;
    const question = this.QUESTIONS.find(q => q.id === questionId);
    body.innerHTML = `
      <div class="chatbot-answer-view">
        <button class="chatbot-back-btn" onclick="Chatbot.goBack()">
          <span class="chatbot-back-arrow">‹</span>
          <span>All Questions</span>
        </button>
        <div class="chatbot-answer-header">
          <span class="chatbot-answer-emoji">${question?.emoji || '🤖'}</span>
          <span class="chatbot-answer-q">${question?.label || 'Answer'}</span>
        </div>
        <div class="chatbot-answer-body">
          <div class="chatbot-answer-content">${this._fmt(answer)}</div>
        </div>
        <div class="chatbot-answer-footer">
          <span class="chatbot-answer-time">Updated just now · Live data</span>
        </div>
      </div>
    `;
    SoundFX.chatbotAnswer();
  },

  _savedScrollTop: 0,

  goBack() {
    SoundFX.buttonClick();
    this.currentAnswer = null;
    this._renderQuestions();
    const scrollEl = document.querySelector('.chatbot-questions-scroll');
    if (scrollEl && this._savedScrollTop) {
      scrollEl.scrollTop = this._savedScrollTop;
    }
  },

  askQuestion(id) {
    SoundFX.chatbotQuestion();
    const scrollEl = document.querySelector('.chatbot-questions-scroll');
    if (scrollEl) this._savedScrollTop = scrollEl.scrollTop;

    const answer = this._computeAnswer(id);
    this.currentAnswer = id;
    this._renderAnswer(id, answer);

    setTimeout(() => {
      const answerScroll = document.querySelector('.chatbot-answer-body');
      if (answerScroll) answerScroll.scrollTop = 0;
    }, 10);
  },

  _getProgressBar(pct) {
    return `<div class="cb-progress-wrapper"><div class="cb-progress-bar"><div class="cb-progress-fill" style="width: ${pct}%"></div></div><div class="cb-progress-label">${pct}%</div></div>`;
  },

  _computeAnswer(id) {
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const currentMonth = getCurrentMonth();
    const monthLabel = getMonthLabel(currentMonth);
    const lastMonth = getMonthOffset(currentMonth, -1);
    const lastLabel = getMonthLabel(lastMonth);
    const tenants = DB.getTenants();

    switch (id) {
      case 'unpaid': {
        const unpaid = tenants.filter(t => !DB.isPaid(t.id, currentMonth));
        if (unpaid.length === 0) {
          return `🎉 **All ${tenants.length} tenant(s) have paid!**\n\nEveryone's rent for **${monthLabel}** is collected. Great job! 🙌`;
        }
        const total = unpaid.reduce((s, t) => s + t.rent, 0);
        const list = unpaid.map(t => {
          const info = DB.getBedInfo(t.bedId);
          return `• **${t.name}** — ${info?.room?.name || '?'}, Bed ${info?.bed?.number || '?'}\n  📞 ${t.phone || 'No phone'} · ${formatCurrency(t.rent, cur)}`;
        }).join('\n');
        return `❌ **${unpaid.length} tenant(s) unpaid** for ${monthLabel}:\n\n${list}\n\n━━━━━━━━━━\n💰 Total pending: **${formatCurrency(total, cur)}**`;
      }

      case 'paid': {
        const paid = tenants.filter(t => DB.isPaid(t.id, currentMonth));
        if (paid.length === 0) return `😔 No payments received yet for **${monthLabel}**.`;
        const total = paid.reduce((s, t) => {
          const p = DB.getPaymentsByTenant(t.id).find(p => p.month === currentMonth);
          return s + (p?.amount || 0);
        }, 0);
        const list = paid.map(t => {
          const p = DB.getPaymentsByTenant(t.id).find(p => p.month === currentMonth);
          const icon = p?.method === 'UPI' ? '📱' : p?.method === 'Cash' ? '💵' : '🏦';
          return `• **${t.name}** — ${icon} ${p?.method || '?'} — **${formatCurrency(p?.amount || t.rent, cur)}**${p?.date ? ` (${formatDateDisplay(p.date)})` : ''}`;
        }).join('\n');
        return `✅ **${paid.length}/${tenants.length} paid** for ${monthLabel}:\n\n${list}\n\n━━━━━━━━━━\n💰 Collected: **${formatCurrency(total, cur)}**`;
      }

      case 'collected': {
        const payments = DB.getPaymentsByMonth(currentMonth);
        const collected = payments.reduce((s, p) => s + p.amount, 0);
        const expected = tenants.reduce((s, t) => s + t.rent, 0);
        const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
        return `💰 **Rent Collection — ${monthLabel}**\n\n${this._getProgressBar(pct)}\n\n✅ Collected: **${formatCurrency(collected, cur)}**\n📋 Expected: **${formatCurrency(expected, cur)}**\n📤 Payments: **${payments.length}** received\n👥 Tenants Paid: **${tenants.filter(t => DB.isPaid(t.id, currentMonth)).length}/${tenants.length}**`;
      }

      case 'pending': {
        const unpaid = tenants.filter(t => !DB.isPaid(t.id, currentMonth));
        const pendingAmount = unpaid.reduce((s, t) => s + t.rent, 0);
        const collected = DB.getPaymentsByMonth(currentMonth).reduce((s, p) => s + p.amount, 0);
        const expected = tenants.reduce((s, t) => s + t.rent, 0);
        if (unpaid.length === 0) {
          return `🎉 **No pending rent!**\n\nAll **${formatCurrency(expected, cur)}** has been collected for ${monthLabel}.`;
        }
        return `⏳ **Pending Rent — ${monthLabel}**\n\n💸 Amount Due: **${formatCurrency(pendingAmount, cur)}**\n👥 Tenants Unpaid: **${unpaid.length}**\n\n**Who owes:**\n${unpaid.map(t => {
          const info = DB.getBedInfo(t.bedId);
          return `• **${t.name}** — ${formatCurrency(t.rent, cur)} — ${info?.room?.name || '?'}`;
        }).join('\n')}\n\n━━━━━━━━━━\n📊 ${formatCurrency(collected, cur)} of ${formatCurrency(expected, cur)} collected`;
      }

      case 'vacant': {
        const beds = DB.getBeds().filter(b => !b.tenantId);
        const totalBeds = DB.getBeds().length;
        if (beds.length === 0) {
          return `🏠 **Fully Occupied!**\n\nAll **${totalBeds}** beds are taken in **${prop.name}**.\nNo vacancies! 🎉`;
        }
        const list = beds.map(b => {
          const room = DB.getRooms().find(r => r.id === b.roomId);
          const floor = room ? DB.getFloors().find(f => f.id === room.floorId) : null;
          return `• **${room?.name || '?'}**, Bed ${b.number}\n  ${floor?.name || ''} · ${formatCurrency(b.price, cur)}/mo`;
        }).join('\n');
        return `🛏️ **${beds.length} vacant bed(s)** of ${totalBeds} total:\n\n${list}`;
      }

      case 'occupancy': {
        const stats = DB.getStats();
        const rate = stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0;
        const emoji = rate >= 90 ? '🔥' : rate >= 70 ? '📈' : rate >= 50 ? '📊' : '📉';
        return `${emoji} **Occupancy — ${prop.name}**\n\n${this._getProgressBar(rate)}\n\n🛏️ Total Beds: **${stats.totalBeds}**\n✅ Occupied: **${stats.occupiedBeds}**\n🟢 Vacant: **${stats.vacantBeds}**\n👥 Tenants: **${tenants.length}**\n\n${rate >= 90 ? '🎉 Excellent occupancy!' : rate >= 70 ? '👍 Good. Room to grow!' : '⚠️ Consider marketing to fill beds.'}`;
      }

      case 'floor_map': {
        const floors = DB.getFloors();
        if (floors.length === 0) return `🏢 No floors configured. Set up your PG in the **Rooms** tab.`;
        const list = floors.sort((a, b) => (a.order || 0) - (b.order || 0)).map(f => {
          const stats = DB.getFloorStats(f.id);
          const rooms = DB.getRoomsByFloor(f.id);
          const pct = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
          return `**${f.name}** \n${this._getProgressBar(pct)}\n  ${stats.rooms} room(s) · ${stats.occupied}/${stats.total} beds filled\n  Rooms: ${rooms.map(r => r.name).join(', ')}`;
        }).join('\n\n');
        return `🏢 **Floor Breakdown:**\n\n${list}`;
      }

      case 'all_tenants': {
        if (tenants.length === 0) return `😔 No active tenants. Add tenants in the **Rooms** tab.`;
        const list = tenants.map((t, i) => {
          const info = DB.getBedInfo(t.bedId);
          const paid = DB.isPaid(t.id, currentMonth);
          return `**${i + 1}. ${t.name}** ${paid ? '✅' : '❌'}\n  📞 ${t.phone || '—'} · ${info?.room?.name || '?'}, Bed ${info?.bed?.number || '?'}\n  💰 ${formatCurrency(t.rent, cur)}/mo`;
        }).join('\n\n');
        return `👥 **All ${tenants.length} Tenants:**\n\n${list}\n\n*(✅ Paid · ❌ Unpaid for ${monthLabel})*`;
      }

      case 'tenant_count': {
        const paid = tenants.filter(t => DB.isPaid(t.id, currentMonth)).length;
        const totalRent = tenants.reduce((s, t) => s + t.rent, 0);
        const avgRent = tenants.length > 0 ? Math.round(totalRent / tenants.length) : 0;
        return `📋 **Tenant Summary — ${monthLabel}**\n\n👥 Total Active: **${tenants.length}**\n✅ Paid: **${paid}**\n❌ Unpaid: **${tenants.length - paid}**\n\n💰 Total Monthly Rent: **${formatCurrency(totalRent, cur)}**\n📊 Average Rent: **${formatCurrency(avgRent, cur)}**`;
      }

      case 'new_tenants': {
        const sorted = [...tenants].filter(t => t.moveInDate).sort((a, b) => new Date(b.moveInDate) - new Date(a.moveInDate));
        if (sorted.length === 0) return `📋 No move-in dates recorded for tenants.`;
        const recent = sorted.slice(0, 5);
        const list = recent.map(t => {
          const info = DB.getBedInfo(t.bedId);
          const days = Math.floor((Date.now() - new Date(t.moveInDate).getTime()) / 86400000);
          return `• **${t.name}** — ${formatDateDisplay(t.moveInDate)}\n  ${info?.room?.name || '?'} · ${days} day(s) ago`;
        }).join('\n');
        return `🆕 **Most Recent Tenants:**\n\n${list}`;
      }

      case 'deposits': {
        const totalDeposit = tenants.reduce((s, t) => s + (t.depositGiven !== undefined ? parseFloat(t.depositGiven) : (t.deposit || 0)), 0);
        const list = tenants.map(t => `• **${t.name}**: ${formatCurrency(t.depositGiven !== undefined ? parseFloat(t.depositGiven) : (t.deposit || 0), cur)}`).join('\n');
        return `🔒 **Security Deposits Held:**\n\n${list}\n\n━━━━━━━━━━\n💰 Total: **${formatCurrency(totalDeposit, cur)}**`;
      }

      case 'profit': {
        const summary = DB.getFinancialSummary(currentMonth);
        const isProfit = summary.netProfit >= 0;
        const totalIncome = summary.rentCollected + summary.otherIncome;
        const pct = totalIncome > 0 ? Math.round((summary.netProfit / totalIncome) * 100) : 0;
        return `${isProfit ? '📈' : '📉'} **P&L — ${monthLabel}**\n\n💵 Rent Collected: **${formatCurrency(summary.rentCollected, cur)}**\n➕ Other Income: **${formatCurrency(summary.otherIncome, cur)}**\n📤 Expenses: **${formatCurrency(summary.totalExpenses, cur)}**\n\n━━━━━━━━━━\n${isProfit ? '📈 Net Profit' : '📉 Net Loss'}: **${formatCurrency(Math.abs(summary.netProfit), cur)}**${isProfit && pct ? ` (${pct}% margin)` : ''}\n\n${isProfit ? '🎉 Profitable month!' : '⚠️ Expenses exceeded income.'}`;
      }

      case 'expenses': {
        const expenses = DB.getExpensesByMonth(currentMonth);
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        if (expenses.length === 0) return `📭 No expenses recorded for **${monthLabel}** yet.\n\nAdd them in the **Expenses** tab.`;
        const grouped = {};
        expenses.forEach(e => { grouped[e.category] = (grouped[e.category] || 0) + e.amount; });
        const breakdown = Object.entries(grouped)
          .sort(([, a], [, b]) => b - a)
          .map(([cat, amt]) => {
            const pct = Math.round((amt / total) * 100);
            return `${this.CAT_EMOJIS[cat] || '📦'} **${cat.charAt(0).toUpperCase() + cat.slice(1)}**: ${formatCurrency(amt, cur)} *(${pct}%)*`;
          }).join('\n');
        return `📤 **Expenses — ${monthLabel}**\n\n${breakdown}\n\n━━━━━━━━━━\n💸 Total: **${formatCurrency(total, cur)}** across **${expenses.length}** item(s)`;
      }

      case 'last_month': {
        const thisSummary = DB.getFinancialSummary(currentMonth);
        const prevSummary = DB.getFinancialSummary(lastMonth);
        const thisIncome = thisSummary.rentCollected + thisSummary.otherIncome;
        const prevIncome = prevSummary.rentCollected + prevSummary.otherIncome;
        const incDiff = thisIncome - prevIncome;
        const expDiff = thisSummary.totalExpenses - prevSummary.totalExpenses;
        const profitDiff = thisSummary.netProfit - prevSummary.netProfit;
        const arrow = (v) => v > 0 ? '🔺' : v < 0 ? '🔻' : '➖';
        return `📅 **Month Comparison**\n\n💵 Income:\n  ${formatCurrency(prevIncome, cur)} → **${formatCurrency(thisIncome, cur)}** ${arrow(incDiff)} ${formatCurrency(Math.abs(incDiff), cur)}\n\n📤 Expenses:\n  ${formatCurrency(prevSummary.totalExpenses, cur)} → **${formatCurrency(thisSummary.totalExpenses, cur)}** ${arrow(expDiff)} ${formatCurrency(Math.abs(expDiff), cur)}\n\n📈 Profit:\n  ${formatCurrency(prevSummary.netProfit, cur)} → **${formatCurrency(thisSummary.netProfit, cur)}** ${arrow(profitDiff)} ${formatCurrency(Math.abs(profitDiff), cur)}`;
      }

      case 'property': {
        const stats = DB.getStats();
        const rate = stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0;
        return `🏠 **${prop.name}**\n\n👤 Owner: **${prop.owner || 'Not set'}**\n📍 Address: **${prop.address || 'Not set'}**\n📞 Phone: **${prop.phone || 'Not set'}**\n⚡ Electricity Rate: **${cur}${prop.electricityRate || 0}/unit**\n\n━━━━━━━━━━\n🛏️ Beds: **${stats.occupiedBeds}/${stats.totalBeds}** occupied <span class="cb-percent-badge">${rate}%</span>\n🏢 Floors: **${DB.getFloors().length}**\n🚪 Rooms: **${DB.getRooms().length}**\n👥 Tenants: **${tenants.length}**`;
      }

      default:
        return `🤖 I don't have an answer for that yet. Try another question!`;
    }
  },

  _fmt(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/━+/g, '<hr class="chatbot-hr">')
      .replace(/\n/g, '<br>');
  },
};
