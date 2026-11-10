// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — BUSINESS CARD SHARING & CUSTOMIZATION
// Powered by Rentora
// Full support for preset templates, custom fields, line-by-line editing,
// logo customization, live preview, exact canvas export, WhatsApp sharing,
// PNG download, and copy details.
// ============================================================

const BusinessCard = {
  currentStyleIndex: 0,
  touchStartX: 0,
  touchEndX: 0,
  editorDraft: null, // Temporary editing state

  // 5 Premium Styles with distinct visual designs
  STYLES: [
    {
      id: 'modern-navy',
      name: 'Executive Sapphire',
      badge: 'PRO',
      bgGradient: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0284C7 100%)',
      accentColor: '#38BDF8',
      textColor: '#FFFFFF',
      subColor: 'rgba(255, 255, 255, 0.78)',
      metaBg: 'rgba(255, 255, 255, 0.10)',
      metaBorder: 'rgba(255, 255, 255, 0.16)',
      cardShadow: '0 20px 48px -10px rgba(15, 23, 42, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.12)',
      meshA: 'radial-gradient(circle at 85% 15%, rgba(56, 189, 248, 0.35) 0%, transparent 60%)',
      meshB: 'radial-gradient(circle at 15% 85%, rgba(139, 92, 246, 0.25) 0%, transparent 55%)'
    },
    {
      id: 'luxury-emerald',
      name: 'Luxury Emerald',
      badge: 'ELITE',
      bgGradient: 'linear-gradient(135deg, #064E3B 0%, #065F46 45%, #059669 100%)',
      accentColor: '#34D399',
      textColor: '#FFFFFF',
      subColor: 'rgba(255, 255, 255, 0.80)',
      metaBg: 'rgba(255, 255, 255, 0.12)',
      metaBorder: 'rgba(255, 255, 255, 0.18)',
      cardShadow: '0 20px 48px -10px rgba(6, 78, 59, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.12)',
      meshA: 'radial-gradient(circle at 80% 20%, rgba(52, 211, 153, 0.35) 0%, transparent 60%)',
      meshB: 'radial-gradient(circle at 10% 90%, rgba(16, 185, 129, 0.30) 0%, transparent 50%)'
    },
    {
      id: 'regal-gold',
      name: 'Royal Obsidian & Gold',
      badge: 'ROYAL',
      bgGradient: 'linear-gradient(135deg, #18181B 0%, #27272A 50%, #09090B 100%)',
      accentColor: '#F59E0B',
      textColor: '#FFFFFF',
      subColor: 'rgba(255, 255, 255, 0.78)',
      metaBg: 'rgba(245, 158, 11, 0.08)',
      metaBorder: 'rgba(245, 158, 11, 0.28)',
      cardShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(245, 158, 11, 0.3)',
      meshA: 'radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.28) 0%, transparent 60%)',
      meshB: 'radial-gradient(circle at 10% 85%, rgba(217, 119, 6, 0.20) 0%, transparent 55%)'
    },
    {
      id: 'amethyst-purple',
      name: 'Amethyst Velvet',
      badge: 'PREMIUM',
      bgGradient: 'linear-gradient(135deg, #2E1065 0%, #4C1D95 50%, #7C3AED 100%)',
      accentColor: '#C4B5FD',
      textColor: '#FFFFFF',
      subColor: 'rgba(255, 255, 255, 0.82)',
      metaBg: 'rgba(255, 255, 255, 0.12)',
      metaBorder: 'rgba(255, 255, 255, 0.18)',
      cardShadow: '0 20px 48px -10px rgba(76, 29, 149, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.14)',
      meshA: 'radial-gradient(circle at 85% 15%, rgba(196, 181, 253, 0.35) 0%, transparent 60%)',
      meshB: 'radial-gradient(circle at 15% 85%, rgba(236, 72, 153, 0.22) 0%, transparent 55%)'
    },
    {
      id: 'clean-frost',
      name: 'Minimal Clean Pearl',
      badge: 'CLEAN',
      bgGradient: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 55%, #E2E8F0 100%)',
      accentColor: '#0284C7',
      textColor: '#0F172A',
      subColor: '#475569',
      metaBg: 'rgba(255, 255, 255, 0.85)',
      metaBorder: 'rgba(14, 165, 233, 0.25)',
      cardShadow: '0 20px 48px -10px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.08)',
      meshA: 'radial-gradient(circle at 85% 15%, rgba(14, 165, 233, 0.18) 0%, transparent 60%)',
      meshB: 'radial-gradient(circle at 15% 85%, rgba(99, 102, 241, 0.12) 0%, transparent 55%)'
    }
  ],

  // Returns active customization merged with base business profile
  getCardData() {
    const prop = (typeof DB !== 'undefined' && DB.getProperty) ? (DB.getProperty() || {}) : {};
    let custom = null;
    if (typeof DB !== 'undefined' && typeof DB.getBusinessCardCustom === 'function') {
      try { custom = DB.getBusinessCardCustom(); } catch (e) {}
    }
    if (!custom) {
      const storageKey = (typeof DB !== 'undefined' && DB.KEYS && DB.KEYS.BUSINESS_CARD) ? DB.KEYS.BUSINESS_CARD : 'rentora_business_card_custom';
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) custom = JSON.parse(stored);
      } catch (e) {}
    }
    custom = custom || {};

    const fallbackName = prop.name ? prop.name.trim() : 'PG Management';
    const pgName = (custom.pgName !== undefined && custom.pgName !== null && custom.pgName.trim() !== '')
      ? custom.pgName.trim()
      : fallbackName;

    const tagline = (custom.tagline !== undefined && custom.tagline !== null && custom.tagline.trim() !== '')
      ? custom.tagline.trim()
      : (prop.tagline ? prop.tagline.trim() : 'Your trusted home away from home');

    const ownerName = (custom.ownerName !== undefined && custom.ownerName !== null && custom.ownerName.trim() !== '')
      ? custom.ownerName.trim()
      : (prop.owner ? prop.owner.trim() : 'PG Management');

    const phone = (custom.phone !== undefined && custom.phone !== null && custom.phone.trim() !== '')
      ? custom.phone.trim()
      : (prop.phone ? prop.phone.trim() : '');

    const whatsapp = (custom.whatsapp !== undefined && custom.whatsapp !== null && custom.whatsapp.trim() !== '')
      ? custom.whatsapp.trim()
      : (prop.whatsapp ? prop.whatsapp.trim() : phone);

    const email = (custom.email !== undefined && custom.email !== null && custom.email.trim() !== '')
      ? custom.email.trim()
      : (prop.email ? prop.email.trim() : '');

    const address = (custom.address !== undefined && custom.address !== null && custom.address.trim() !== '')
      ? custom.address.trim()
      : (prop.address ? prop.address.trim() : 'Sant tukaram Nagar, DY Patil Medical College');

    const website = (custom.website !== undefined && custom.website !== null)
      ? custom.website.trim()
      : (prop.website ? prop.website.trim() : '');

    const businessId = (custom.businessId !== undefined && custom.businessId !== null)
      ? custom.businessId.trim()
      : '';

    const amenitiesLine = (custom.amenitiesLine !== undefined && custom.amenitiesLine !== null && custom.amenitiesLine.trim() !== '')
      ? custom.amenitiesLine.trim()
      : (prop.amenitiesLine ? prop.amenitiesLine.trim() : 'Wi-Fi · AC/Geyser · Food · Daily Cleaning · Power Backup');

    // Logo resolution: Authoritative source is active PG business logo
    const activeLogo = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || prop.logo || '';
    let logo = '';
    if (custom.logoType === 'none') {
      logo = '';
    } else if (custom.logoType === 'custom' && custom.logo) {
      logo = custom.logo;
    } else {
      logo = activeLogo || custom.logo || '';
    }

    const logoPosition = custom.logoPosition || 'top-left'; // 'top-left' | 'top-center' | 'top-right'
    const templateIndex = (typeof custom.templateIndex === 'number' && custom.templateIndex >= 0 && custom.templateIndex < this.STYLES.length)
      ? custom.templateIndex
      : 0;

    // Field visibility flags - all essential details visible, registration/businessId removed from default
    const visibleFields = Object.assign({
      tagline: true,
      owner: true,
      phone: true,
      whatsapp: true,
      email: true,
      address: true,
      website: false,
      businessId: false,
      amenities: true
    }, custom.visibleFields || {});

    // Ensure businessId is strictly hidden by default unless explicitly set to true
    if (custom.visibleFields && custom.visibleFields.businessId === undefined) {
      visibleFields.businessId = false;
    }

    // Custom lines array: [{ id, text, visible }]
    let customLines = [];
    if (Array.isArray(custom.customLines)) {
      customLines = custom.customLines;
    }

    return {
      pgName: pgName || fallbackName,
      tagline,
      ownerName,
      phone,
      whatsapp,
      email,
      address,
      website,
      businessId,
      amenitiesLine,
      logo,
      logoType: custom.logoType || (activeLogo ? 'default' : 'none'),
      logoPosition,
      templateIndex,
      visibleFields,
      customLines
    };
  },

  // Open the Business Card Sharing modal screen (Hero View with G3 image & actions)
  openShareModal() {
    const data = this.getCardData();
    this.currentStyleIndex = data.templateIndex;

    showModal('🪪 Share Your Business Card', `
      <div class="bc-container" id="bc-container">
        <!-- Professional Introduction -->
        <div class="bc-intro">
          <div class="bc-intro-badge">OFFICIAL BUSINESS CARD</div>
          <div class="bc-intro-line">Your official digital business card for <strong>${data.pgName}</strong></div>
        </div>

        <!-- Swipeable Hero Card Carousel Container -->
        <div class="bc-carousel-wrapper" id="bc-carousel-wrapper">
          <div class="bc-hero-card" id="bc-hero-card">
            ${this.renderCardHTML(this.currentStyleIndex, data)}
          </div>
        </div>

        <!-- Pagination Dots -->
        <div class="bc-pagination" id="bc-pagination">
          ${this.STYLES.map((st, i) => `
            <button class="bc-dot ${i === this.currentStyleIndex ? 'active' : ''}" onclick="BusinessCard.selectStyle(${i})" title="${st.name}"></button>
          `).join('')}
        </div>

        <!-- Style Name Display & Tag -->
        <div class="bc-style-info" id="bc-style-info">
          <span class="bc-style-tag">${this.STYLES[this.currentStyleIndex].badge}</span>
          <span class="bc-style-name">${this.STYLES[this.currentStyleIndex].name}</span>
          <span class="bc-swipe-hint">👈 Swipe left or right 👉</span>
        </div>

        <!-- Action Area (Customize, Share, Download, Copy) -->
        <div class="bc-actions">
          <button class="btn btn-primary" style="width:100%; padding:13px 18px; font-size:14.5px; font-weight:700; border-radius:14px; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="BusinessCard.openCustomizeModal()">
            <span>✏️</span>
            <span>Customize Business Card</span>
          </button>
          
          <button class="btn btn-whatsapp bc-share-btn" style="width:100%; padding:13px 18px; font-size:14.5px; font-weight:700; border-radius:14px; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="BusinessCard.shareOnWhatsApp()">
            <span style="font-size:18px">📲</span>
            <span>Share on WhatsApp</span>
          </button>
          
          <div class="bc-secondary-actions" style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:6px; width:100%; box-sizing:border-box;">
            <button class="btn btn-ghost bc-btn-sm" style="min-width:0; padding:10px 4px; font-size:11.5px; font-weight:600; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:4px; box-sizing:border-box; white-space:nowrap; overflow:hidden;" onclick="BusinessCard.viewFullCardModal()" title="View large high-resolution card">
              <span style="font-size:13px; flex-shrink:0;">🔍</span> <span style="overflow:hidden; text-overflow:ellipsis;">Full Preview</span>
            </button>
            <button class="btn btn-ghost bc-btn-sm" style="min-width:0; padding:10px 4px; font-size:11.5px; font-weight:600; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:4px; box-sizing:border-box; white-space:nowrap; overflow:hidden;" onclick="BusinessCard.downloadCardImage()" title="Download as PNG image">
              <span style="font-size:13px; flex-shrink:0;">📥</span> <span style="overflow:hidden; text-overflow:ellipsis;">Download</span>
            </button>
            <button class="btn btn-ghost bc-btn-sm" style="min-width:0; padding:10px 4px; font-size:11.5px; font-weight:600; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:4px; box-sizing:border-box; white-space:nowrap; overflow:hidden;" onclick="BusinessCard.copyDetails()" title="Copy text info">
              <span style="font-size:13px; flex-shrink:0;">📋</span> <span style="overflow:hidden; text-overflow:ellipsis;">Copy Info</span>
            </button>
          </div>
        </div>
      </div>
    `);

    // Attach touch & swipe listeners
    setTimeout(() => {
      this.initSwipeListeners();
    }, 50);
  },

  // Generates the crisp, high-hierarchy Business Card HTML
  renderCardHTML(index, cardData = null) {
    const data = cardData || (this.editorDraft ? this.editorDraft : this.getCardData());
    const style = this.STYLES[index] || this.STYLES[0];
    const { pgName, tagline, ownerName, phone, whatsapp, email, address, website, businessId, amenitiesLine, logo, logoPosition, visibleFields, customLines } = data;

    // Logo rendering markup
    let logoMarkup = '';
    if (logo) {
      logoMarkup = `<img src="${logo}" alt="Logo" class="bc-card-img-logo">`;
    } else {
      logoMarkup = `<div class="bc-card-default-logo">🏠</div>`;
    }

    // Align logo & header based on logoPosition ('top-left', 'top-center', 'top-right')
    let headerFlexAlign = 'space-between';
    let headerDirection = 'row';
    let textAlign = 'left';
    if (logoPosition === 'top-center') {
      headerDirection = 'column';
      headerFlexAlign = 'center';
      textAlign = 'center';
    } else if (logoPosition === 'top-right') {
      headerDirection = 'row-reverse';
      textAlign = 'right';
    }

    // Build visible contact / detail items
    const detailItems = [];
    if (visibleFields.phone && phone) {
      detailItems.push(`
        <div class="bc-detail-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">📞</span>
          <span class="bc-detail-val" style="color:${style.textColor}">${phone}</span>
        </div>
      `);
    }
    if (visibleFields.whatsapp && whatsapp) {
      detailItems.push(`
        <div class="bc-detail-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">💬</span>
          <span class="bc-detail-val" style="color:${style.textColor}">${whatsapp}</span>
        </div>
      `);
    }
    if (visibleFields.email && email) {
      detailItems.push(`
        <div class="bc-detail-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">✉️</span>
          <span class="bc-detail-val" style="color:${style.textColor}">${email}</span>
        </div>
      `);
    }
    if (visibleFields.address && address) {
      detailItems.push(`
        <div class="bc-detail-item address-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">📍</span>
          <span class="bc-detail-val bc-address-text" style="color:${style.textColor}">${address}</span>
        </div>
      `);
    }
    if (visibleFields.website && website) {
      detailItems.push(`
        <div class="bc-detail-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">🌐</span>
          <span class="bc-detail-val" style="color:${style.textColor}">${website}</span>
        </div>
      `);
    }
    if (visibleFields.businessId && businessId) {
      detailItems.push(`
        <div class="bc-detail-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">🆔</span>
          <span class="bc-detail-val" style="color:${style.textColor}">${businessId}</span>
        </div>
      `);
    }

    // Dedicated Amenities Line
    if (visibleFields.amenities !== false && amenitiesLine) {
      detailItems.push(`
        <div class="bc-detail-item bc-amenities-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">✨</span>
          <span class="bc-detail-val bc-amenities-val" style="color:${style.textColor}"><strong>Amenities:</strong> ${amenitiesLine}</span>
        </div>
      `);
    }

    // Custom dynamic lines
    if (Array.isArray(customLines)) {
      customLines.forEach(line => {
        if (line && line.visible !== false && line.text && line.text.trim()) {
          detailItems.push(`
            <div class="bc-detail-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
              <span class="bc-detail-icon">🔹</span>
              <span class="bc-detail-val" style="color:${style.textColor}">${line.text.trim()}</span>
            </div>
          `);
        }
      });
    }

    // Fallback if no contact details enabled
    if (detailItems.length === 0) {
      detailItems.push(`
        <div class="bc-detail-item" style="background:${style.metaBg};border-color:${style.metaBorder}">
          <span class="bc-detail-icon">📞</span>
          <span class="bc-detail-val" style="color:${style.subColor}">Contact via WhatsApp</span>
        </div>
      `);
    }

    return `
      <div class="bc-card-surface" style="
        background: ${style.bgGradient};
        box-shadow: ${style.cardShadow};
        color: ${style.textColor};
        text-align: ${textAlign};
      ">
        <!-- Ambient Decorative Meshes -->
        <div class="bc-mesh bc-mesh-a" style="background: ${style.meshA}"></div>
        <div class="bc-mesh bc-mesh-b" style="background: ${style.meshB}"></div>

        <!-- Top Header: Logo + Brand Tagline -->
        <div class="bc-card-header" style="flex-direction:${headerDirection}; justify-content:${headerFlexAlign};">
          <div class="bc-logo-wrap" style="${logoPosition === 'top-center' ? 'margin:0 auto;' : ''}">
            ${logoMarkup}
          </div>
          <div class="bc-header-text" style="${logoPosition === 'top-center' ? 'align-items:center;text-align:center;' : ''}">
            <div class="bc-category-chip" style="color:${style.accentColor};border-color:${style.metaBorder}">
              VERIFIED ACCOMMODATION
            </div>
            ${visibleFields.tagline && tagline ? `<div class="bc-tagline" style="color:${style.subColor}">${tagline}</div>` : ''}
          </div>
        </div>

        <!-- Center: Prominent PG Business Name -->
        <div class="bc-card-title-section" style="${logoPosition === 'top-center' ? 'text-align:center;' : ''}">
          <h2 class="bc-pg-name">${pgName}</h2>
          ${visibleFields.owner && ownerName ? `<div class="bc-owner-title" style="color:${style.subColor}">Managed by <strong>${ownerName}</strong></div>` : ''}
        </div>

        <!-- Divider Line -->
        <div class="bc-divider" style="background: linear-gradient(90deg, ${style.accentColor} 0%, rgba(255,255,255,0.15) 100%)"></div>

        <!-- Contact & Location Information List -->
        <div class="bc-card-details">
          ${detailItems.join('')}
        </div>

        <!-- Bottom Footer: Powered by PG -->
        <div class="bc-card-footer" style="border-top-color:${style.metaBorder}">
          <div class="bc-amenities">
            <span>🏠 Premium PG Accommodation</span>
          </div>
          <div class="bc-powered" style="color:${style.subColor}">
            Powered by <strong>${pgName}</strong>
          </div>
        </div>
      </div>
    `;
  },

  // Updates card display and pagination in main share modal
  updateCardView(direction) {
    const cardEl = document.getElementById('bc-hero-card');
    if (!cardEl) return;

    if (typeof SoundFX !== 'undefined' && SoundFX.wheelTick) {
      SoundFX.wheelTick();
    }

    cardEl.style.opacity = '0.5';
    cardEl.style.transform = direction === 'next' ? 'translateX(16px) scale(0.98)' : 'translateX(-16px) scale(0.98)';
    cardEl.style.transition = 'all 0.15s ease';

    setTimeout(() => {
      cardEl.innerHTML = this.renderCardHTML(this.currentStyleIndex);
      cardEl.style.opacity = '1';
      cardEl.style.transform = 'translateX(0) scale(1)';

      const dots = document.querySelectorAll('.bc-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === this.currentStyleIndex);
      });

      const infoEl = document.getElementById('bc-style-info');
      const cur = this.STYLES[this.currentStyleIndex];
      if (infoEl && cur) {
        infoEl.innerHTML = `
          <span class="bc-style-tag">${cur.badge}</span>
          <span class="bc-style-name">${cur.name}</span>
          <span class="bc-swipe-hint">Swipe left/right to change style</span>
        `;
      }
    }, 120);
  },

  selectStyle(index) {
    if (index === this.currentStyleIndex) return;
    const dir = index > this.currentStyleIndex ? 'next' : 'prev';
    this.currentStyleIndex = index;
    this.updateCardView(dir);
  },

  nextStyle() {
    this.currentStyleIndex = (this.currentStyleIndex + 1) % this.STYLES.length;
    this.updateCardView('next');
  },

  prevStyle() {
    this.currentStyleIndex = (this.currentStyleIndex - 1 + this.STYLES.length) % this.STYLES.length;
    this.updateCardView('prev');
  },

  initSwipeListeners() {
    const wrapper = document.getElementById('bc-carousel-wrapper');
    if (!wrapper) return;

    let isPointerDown = false;
    let startX = 0;

    wrapper.addEventListener('pointerdown', (e) => {
      isPointerDown = true;
      startX = e.clientX;
    }, { passive: true });

    wrapper.addEventListener('pointerup', (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      const diff = e.clientX - startX;
      if (diff < -35) {
        this.nextStyle();
      } else if (diff > 35) {
        this.prevStyle();
      }
    }, { passive: true });

    wrapper.addEventListener('pointercancel', () => {
      isPointerDown = false;
    }, { passive: true });
  },

  // ══════════════════════════════════════════════════════════════
  // CUSTOMIZE BUSINESS CARD MODAL & EDITOR
  // ══════════════════════════════════════════════════════════════
  openCustomizeModal() {
    // Clone saved data into editor draft
    const base = this.getCardData();
    this.editorDraft = JSON.parse(JSON.stringify(base));

    showModal('✏️ Customize Business Card', `
      <div class="bc-editor-wrap">
        <div class="bc-editor-desktop">
          <!-- Left/Top Controls -->
          <div class="bc-editor-controls">

            <!-- Section 1: Template & Appearance -->
            <div class="bc-section-acc">
              <div class="bc-section-acc-header" onclick="BusinessCard._toggleAccordion('acc-template')">
                <span>🎨 1. Card Template &amp; Theme</span>
                <span id="acc-template-icon">▾</span>
              </div>
              <div class="bc-section-acc-body" id="acc-template">
                <div class="bc-template-chips">
                  ${this.STYLES.map((st, i) => `
                    <button type="button" class="bc-template-chip ${i === this.editorDraft.templateIndex ? 'active' : ''}" onclick="BusinessCard.editorSetTemplate(${i})">
                      <span>${st.badge}</span>
                      <span>${st.name}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Section 2: Logo & Placement -->
            <div class="bc-section-acc">
              <div class="bc-section-acc-header" onclick="BusinessCard._toggleAccordion('acc-logo')">
                <span>🖼️ 2. Logo &amp; Placement</span>
                <span id="acc-logo-icon">▾</span>
              </div>
              <div class="bc-section-acc-body" id="acc-logo">
                <div class="bc-logo-editor">
                  <div class="bc-logo-preview-thumb" id="bc-editor-logo-thumb">
                    ${this.editorDraft.logo ? `<img src="${this.editorDraft.logo}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;">` : '🏠'}
                  </div>
                  <div style="flex:1">
                    <input type="file" id="inp-bc-custom-logo" accept="image/*" style="display:none" onchange="BusinessCard.handleCustomLogoUpload(this)">
                    <div class="bc-logo-btn-group">
                      <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('inp-bc-custom-logo').click()">📁 Change Logo</button>
                      <button type="button" class="btn btn-ghost btn-sm" onclick="BusinessCard.editorRestoreDefaultLogo()">Default</button>
                      <button type="button" class="btn btn-ghost btn-sm" style="color:var(--accent-red)" onclick="BusinessCard.editorRemoveLogo()">Remove</button>
                    </div>
                  </div>
                </div>

                <div class="bc-field-row" style="margin-top:10px">
                  <label class="bc-field-label">Logo Placement</label>
                  <div class="bc-pos-selector">
                    <button type="button" class="bc-pos-btn ${this.editorDraft.logoPosition === 'top-left' ? 'active' : ''}" onclick="BusinessCard.editorSetLogoPos('top-left')">Left</button>
                    <button type="button" class="bc-pos-btn ${this.editorDraft.logoPosition === 'top-center' ? 'active' : ''}" onclick="BusinessCard.editorSetLogoPos('top-center')">Center</button>
                    <button type="button" class="bc-pos-btn ${this.editorDraft.logoPosition === 'top-right' ? 'active' : ''}" onclick="BusinessCard.editorSetLogoPos('top-right')">Right</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 3: Business Information & Visibility -->
            <div class="bc-section-acc">
              <div class="bc-section-acc-header" onclick="BusinessCard._toggleAccordion('acc-info')">
                <span>🏢 3. Business Information</span>
                <span id="acc-info-icon">▾</span>
              </div>
              <div class="bc-section-acc-body" id="acc-info">
                <!-- PG Name -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>PG / Business Name *</span>
                  </label>
                  <input class="form-input" id="ed-bc-name" value="${this._escapeHtml(this.editorDraft.pgName)}" oninput="BusinessCard.editorUpdateLive()" placeholder="e.g. PG Management">
                </div>

                <!-- Tagline -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>Tagline</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-tagline" ${this.editorDraft.visibleFields.tagline ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <input class="form-input" id="ed-bc-tagline" value="${this._escapeHtml(this.editorDraft.tagline)}" oninput="BusinessCard.editorUpdateLive()" placeholder="e.g. Your Home Away From Home">
                </div>

                <!-- Owner / Manager -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>Manager / Owner Name</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-owner" ${this.editorDraft.visibleFields.owner ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <input class="form-input" id="ed-bc-owner" value="${this._escapeHtml(this.editorDraft.ownerName)}" oninput="BusinessCard.editorUpdateLive()" placeholder="e.g. Rahul Sharma">
                </div>

                <!-- Phone -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>Primary Phone</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-phone" ${this.editorDraft.visibleFields.phone ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <input class="form-input" id="ed-bc-phone" value="${this._escapeHtml(this.editorDraft.phone)}" oninput="BusinessCard.editorUpdateLive()" placeholder="+91 98765 43210">
                </div>

                <!-- WhatsApp -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>WhatsApp Number</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-whatsapp" ${this.editorDraft.visibleFields.whatsapp ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <input class="form-input" id="ed-bc-whatsapp" value="${this._escapeHtml(this.editorDraft.whatsapp)}" oninput="BusinessCard.editorUpdateLive()" placeholder="+91 98765 43210">
                </div>

                <!-- Email -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>Email Address</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-email" ${this.editorDraft.visibleFields.email ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <input class="form-input" id="ed-bc-email" value="${this._escapeHtml(this.editorDraft.email)}" oninput="BusinessCard.editorUpdateLive()" placeholder="contact@myrentora.com">
                </div>

                <!-- Address -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>Location / Address</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-address" ${this.editorDraft.visibleFields.address ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <textarea class="form-textarea" id="ed-bc-address" rows="2" oninput="BusinessCard.editorUpdateLive()" placeholder="Sant tukaram Nagar, DY Patil Medical College">${this._escapeHtml(this.editorDraft.address)}</textarea>
                </div>

                <!-- Website -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>Website</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-website" ${this.editorDraft.visibleFields.website ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <input class="form-input" id="ed-bc-website" value="${this._escapeHtml(this.editorDraft.website)}" oninput="BusinessCard.editorUpdateLive()" placeholder="https://myrentora.com">
                </div>

                <!-- Amenities Line -->
                <div class="bc-field-row">
                  <label class="bc-field-label">
                    <span>Amenities Line</span>
                    <label class="bc-toggle-label">
                      <input type="checkbox" id="chk-bc-amenities" ${this.editorDraft.visibleFields.amenities !== false ? 'checked' : ''} onchange="BusinessCard.editorUpdateLive()"> Show
                    </label>
                  </label>
                  <input class="form-input" id="ed-bc-amenities" value="${this._escapeHtml(this.editorDraft.amenitiesLine || 'Wi-Fi · AC/Geyser · Food · Daily Cleaning · Power Backup')}" oninput="BusinessCard.editorUpdateLive()" placeholder="e.g. Wi-Fi · AC · Food · Power Backup">
                </div>
              </div>
            </div>

            <!-- Section 4: Line-by-Line Custom Text Lines -->
            <div class="bc-section-acc">
              <div class="bc-section-acc-header" onclick="BusinessCard._toggleAccordion('acc-custom')">
                <span>📝 4. Custom Information Lines (${this.editorDraft.customLines.length})</span>
                <span id="acc-custom-icon">▾</span>
              </div>
              <div class="bc-section-acc-body" id="acc-custom">
                <div id="bc-custom-lines-container">
                  ${this.renderCustomLineRows()}
                </div>
                <button type="button" class="btn btn-outline btn-full mt-8" onclick="BusinessCard.addCustomLine()">
                  <span>➕ Add Custom Line</span>
                </button>
              </div>
            </div>

            <!-- Action buttons: Save, Reset, Discard -->
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px">
              <button type="button" class="btn btn-primary btn-full" style="padding:14px; font-size:15px; font-weight:700" onclick="BusinessCard.saveCustomization()">
                <span>💾 Save Changes</span>
              </button>
              
              <div style="display:flex; gap:8px">
                <button type="button" class="btn btn-ghost btn-full" style="color:var(--text-secondary)" onclick="BusinessCard.discardChangesPrompt()">
                  <span>Cancel / Discard</span>
                </button>
                <button type="button" class="btn btn-ghost btn-full" style="color:var(--accent-red)" onclick="BusinessCard.resetToDefaultPrompt()">
                  <span>↺ Reset to Default</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right/Bottom: Real-time Live Preview -->
          <div class="bc-preview-sticky">
            <div class="bc-preview-header">
              <span>LIVE CARD PREVIEW</span>
              <span style="font-size:10px; color:var(--accent-blue); font-weight:700">UPDATES IN REAL-TIME</span>
            </div>
            <div class="bc-hero-card" id="bc-editor-live-preview">
              ${this.renderCardHTML(this.editorDraft.templateIndex, this.editorDraft)}
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:4px;">
              Downloaded card and WhatsApp card will look exactly like this preview.
            </div>
          </div>
        </div>
      </div>
    `);
  },

  _toggleAccordion(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    if (!el) return;
    if (el.style.display === 'none') {
      el.style.display = 'block';
      if (icon) icon.textContent = '▾';
    } else {
      el.style.display = 'none';
      if (icon) icon.textContent = '▸';
    }
  },

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  renderCustomLineRows() {
    if (!this.editorDraft || !Array.isArray(this.editorDraft.customLines) || this.editorDraft.customLines.length === 0) {
      return `<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">No extra custom lines added yet. Tap "+ Add Custom Line" to insert custom text lines like "Ac / Non-Ac Available", "Girls & Boys Separate", etc.</div>`;
    }

    return this.editorDraft.customLines.map((line, idx) => `
      <div class="bc-custom-line-item">
        <span style="font-size:12px; font-weight:700; color:var(--text-muted); min-width:20px;">#${idx + 1}</span>
        <div class="bc-line-inputs">
          <input class="form-input" style="padding:6px 10px; font-size:12.5px" value="${this._escapeHtml(line.text)}" placeholder="Custom line content..." oninput="BusinessCard.updateCustomLineText(${idx}, this.value)">
        </div>
        <div class="bc-line-actions">
          <label class="bc-toggle-label" title="Show or Hide Line">
            <input type="checkbox" ${line.visible !== false ? 'checked' : ''} onchange="BusinessCard.toggleCustomLineVisibility(${idx}, this.checked)">
          </label>
          <button type="button" class="btn btn-ghost btn-sm" style="color:var(--accent-red); padding:4px 8px" onclick="BusinessCard.removeCustomLine(${idx})" title="Delete Line">✕</button>
        </div>
      </div>
    `).join('');
  },

  addCustomLine() {
    if (!this.editorDraft) return;
    if (!Array.isArray(this.editorDraft.customLines)) this.editorDraft.customLines = [];
    this.editorDraft.customLines.push({
      id: 'line_' + Date.now(),
      text: 'New Highlight / Notice',
      visible: true
    });
    this.refreshCustomLineRows();
    this.editorUpdateLive();
  },

  updateCustomLineText(idx, text) {
    if (!this.editorDraft || !this.editorDraft.customLines[idx]) return;
    this.editorDraft.customLines[idx].text = text;
    this.editorUpdateLive();
  },

  toggleCustomLineVisibility(idx, isChecked) {
    if (!this.editorDraft || !this.editorDraft.customLines[idx]) return;
    this.editorDraft.customLines[idx].visible = isChecked;
    this.editorUpdateLive();
  },

  removeCustomLine(idx) {
    if (!this.editorDraft || !this.editorDraft.customLines[idx]) return;
    this.editorDraft.customLines.splice(idx, 1);
    this.refreshCustomLineRows();
    this.editorUpdateLive();
  },

  refreshCustomLineRows() {
    const container = document.getElementById('bc-custom-lines-container');
    if (container) {
      container.innerHTML = this.renderCustomLineRows();
    }
  },

  editorSetTemplate(idx) {
    if (!this.editorDraft) return;
    this.editorDraft.templateIndex = idx;
    document.querySelectorAll('.bc-template-chip').forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
    });
    this.editorUpdateLive();
  },

  editorSetLogoPos(pos) {
    if (!this.editorDraft) return;
    this.editorDraft.logoPosition = pos;
    document.querySelectorAll('.bc-pos-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase() === pos.replace('top-', ''));
    });
    this.editorUpdateLive();
  },

  async handleCustomLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return showToast('Please select a valid image file', 'error');
    }

    try {
      showToast('Compressing logo...', 'info');
      const base64 = await ImageUtils.compressImage(file, 600, 0.8);
      if (this.editorDraft) {
        this.editorDraft.logo = base64;
        this.editorDraft.logoType = 'custom';
        const thumb = document.getElementById('bc-editor-logo-thumb');
        if (thumb) {
          thumb.innerHTML = `<img src="${base64}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;">`;
        }
        this.editorUpdateLive();
        showToast('✅ Logo updated in preview!', 'success');
      }
    } catch (e) {
      showToast('Failed to load image file', 'error');
    }
  },

  editorRestoreDefaultLogo() {
    if (!this.editorDraft) return;
    const prop = DB.getProperty() || {};
    this.editorDraft.logo = prop.logo || '';
    this.editorDraft.logoType = prop.logo ? 'default' : 'none';
    const thumb = document.getElementById('bc-editor-logo-thumb');
    if (thumb) {
      thumb.innerHTML = this.editorDraft.logo ? `<img src="${this.editorDraft.logo}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;">` : '🏠';
    }
    this.editorUpdateLive();
    showToast('Restored default business logo', 'info');
  },

  editorRemoveLogo() {
    if (!this.editorDraft) return;
    this.editorDraft.logo = '';
    this.editorDraft.logoType = 'none';
    const thumb = document.getElementById('bc-editor-logo-thumb');
    if (thumb) thumb.innerHTML = '🏠';
    this.editorUpdateLive();
    showToast('Logo removed from card', 'info');
  },

  // Reads current form inputs and re-renders live preview
  editorUpdateLive() {
    if (!this.editorDraft) return;

    const nameInp = document.getElementById('ed-bc-name');
    const tagInp = document.getElementById('ed-bc-tagline');
    const ownerInp = document.getElementById('ed-bc-owner');
    const phoneInp = document.getElementById('ed-bc-phone');
    const waInp = document.getElementById('ed-bc-whatsapp');
    const emailInp = document.getElementById('ed-bc-email');
    const addrInp = document.getElementById('ed-bc-address');
    const webInp = document.getElementById('ed-bc-website');
    const amenInp = document.getElementById('ed-bc-amenities');

    if (nameInp) this.editorDraft.pgName = nameInp.value;
    if (tagInp) this.editorDraft.tagline = tagInp.value;
    if (ownerInp) this.editorDraft.ownerName = ownerInp.value;
    if (phoneInp) this.editorDraft.phone = phoneInp.value;
    if (waInp) this.editorDraft.whatsapp = waInp.value;
    if (emailInp) this.editorDraft.email = emailInp.value;
    if (addrInp) this.editorDraft.address = addrInp.value;
    if (webInp) this.editorDraft.website = webInp.value;
    if (amenInp) this.editorDraft.amenitiesLine = amenInp.value;

    const chkTag = document.getElementById('chk-bc-tagline');
    const chkOwner = document.getElementById('chk-bc-owner');
    const chkPhone = document.getElementById('chk-bc-phone');
    const chkWa = document.getElementById('chk-bc-whatsapp');
    const chkEmail = document.getElementById('chk-bc-email');
    const chkAddr = document.getElementById('chk-bc-address');
    const chkWeb = document.getElementById('chk-bc-website');
    const chkAmen = document.getElementById('chk-bc-amenities');

    if (chkTag) this.editorDraft.visibleFields.tagline = chkTag.checked;
    if (chkOwner) this.editorDraft.visibleFields.owner = chkOwner.checked;
    if (chkPhone) this.editorDraft.visibleFields.phone = chkPhone.checked;
    if (chkWa) this.editorDraft.visibleFields.whatsapp = chkWa.checked;
    if (chkEmail) this.editorDraft.visibleFields.email = chkEmail.checked;
    if (chkAddr) this.editorDraft.visibleFields.address = chkAddr.checked;
    if (chkWeb) this.editorDraft.visibleFields.website = chkWeb.checked;
    if (chkAmen) this.editorDraft.visibleFields.amenities = chkAmen.checked;
    this.editorDraft.visibleFields.businessId = false;

    const previewEl = document.getElementById('bc-editor-live-preview');
    if (previewEl) {
      previewEl.innerHTML = this.renderCardHTML(this.editorDraft.templateIndex, this.editorDraft);
    }
  },

  // Save customization permanently
  saveCustomization() {
    this.editorUpdateLive();
    if (!this.editorDraft.pgName || !this.editorDraft.pgName.trim()) {
      return showToast('Please enter a PG / Business Name', 'error');
    }

    // Keep logo synchronized with authoritative PG logo unless explicitly removed
    const activeLogo = (typeof DB !== 'undefined' && DB.getLogo ? DB.getLogo() : '') || (DB.getProperty() || {}).logo || '';
    if (this.editorDraft.logoType !== 'none') {
      this.editorDraft.logo = activeLogo || this.editorDraft.logo || '';
    }

    if (typeof DB.saveBusinessCardCustom === 'function') {
      DB.saveBusinessCardCustom(this.editorDraft);
    } else {
      localStorage.setItem('rentora_business_card_custom', JSON.stringify(this.editorDraft));
    }

    this.currentStyleIndex = this.editorDraft.templateIndex;
    this.editorDraft = null;

    if (typeof SoundFX !== 'undefined' && SoundFX.success) {
      SoundFX.success();
    }
    showToast('✅ Business Card customization saved!', 'success');

    // Return to main Share screen
    this.openShareModal();
  },

  // Discard changes with confirmation if changed
  discardChangesPrompt() {
    if (confirm('Discard your changes and return to the business card?')) {
      this.editorDraft = null;
      this.openShareModal();
    }
  },

  // Reset to default preset
  resetToDefaultPrompt() {
    if (confirm('Reset your business card to default application information and template?')) {
      if (typeof DB.saveBusinessCardCustom === 'function') {
        DB.saveBusinessCardCustom(null);
      } else {
        localStorage.removeItem('rentora_business_card_custom');
      }
      this.editorDraft = null;
      this.currentStyleIndex = 0;
      if (typeof SoundFX !== 'undefined' && SoundFX.trash) {
        SoundFX.trash();
      }
      showToast('↺ Business Card reset to default preset!', 'info');
      this.openShareModal();
    }
  },

  clearCache() {
    if (this._logoImageCache) {
      this._logoImageCache.clear();
    }
  },

  // ══════════════════════════════════════════════════════════════
  // BULLETPROOF LOGO LOADER FOR CANVAS EXPORT
  // ══════════════════════════════════════════════════════════════
  async loadCardLogo(logoSrc) {
    if (!logoSrc || typeof logoSrc !== 'string' || !logoSrc.trim()) return null;
    let cleanSrc = logoSrc.trim();

    if (typeof DEFAULT_APP_LOGO_BASE64 !== 'undefined' && DEFAULT_APP_LOGO_BASE64) {
      if (!cleanSrc.startsWith('data:') && !cleanSrc.startsWith('blob:')) {
        cleanSrc = DEFAULT_APP_LOGO_BASE64;
      }
    }

    if (!this._logoImageCache) this._logoImageCache = new Map();
    if (this._logoImageCache.has(cleanSrc)) {
      const cached = this._logoImageCache.get(cleanSrc);
      if (cached && cached.naturalWidth > 0) return cached;
    }

    const waitImg = async (img) => {
      try {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 3000);
          });
        }
        if (img.decode) {
          try { await img.decode(); } catch (e) {}
        }
        return (img.naturalWidth > 0 && img.naturalHeight > 0) ? img : null;
      } catch (e) {
        return null;
      }
    };

    // 1. Data URL or Blob URL (100% origin-clean)
    if (cleanSrc.startsWith('data:') || cleanSrc.startsWith('blob:')) {
      try {
        const img = new Image();
        img.src = cleanSrc;
        const res = await waitImg(img);
        if (res) {
          this._logoImageCache.set(cleanSrc, res);
          return res;
        }
      } catch (e) {}
    }

    // 2. Fetch with cache-buster -> blob -> base64 Data URL (bypasses browser no-cors cached response)
    try {
      const cacheBustUrl = cleanSrc.includes('?') 
        ? `${cleanSrc}&_bc=${Date.now()}` 
        : `${cleanSrc}?_bc=${Date.now()}`;
      const resp = await fetch(cacheBustUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const dataUrl = await new Promise((resData) => {
          const reader = new FileReader();
          reader.onloadend = () => resData(reader.result);
          reader.onerror = () => resData(null);
          reader.readAsDataURL(blob);
        });
        if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
          const img = new Image();
          img.src = dataUrl;
          const res = await waitImg(img);
          if (res) {
            this._logoImageCache.set(cleanSrc, res);
            return res;
          }
        }
      }
    } catch (e) {}

    // 3. Fetch without cache-buster -> blob -> base64 Data URL
    try {
      const resp = await fetch(cleanSrc);
      if (resp.ok) {
        const blob = await resp.blob();
        const dataUrl = await new Promise((resData) => {
          const reader = new FileReader();
          reader.onloadend = () => resData(reader.result);
          reader.onerror = () => resData(null);
          reader.readAsDataURL(blob);
        });
        if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
          const img = new Image();
          img.src = dataUrl;
          const res = await waitImg(img);
          if (res) {
            this._logoImageCache.set(cleanSrc, res);
            return res;
          }
        }
      }
    } catch (e) {}

    // 4. Try copying from rendered DOM preview img via offscreen canvas
    try {
      const domImgs = document.querySelectorAll('img.bc-card-img-logo');
      for (const domImg of domImgs) {
        if (domImg && domImg.complete && domImg.naturalWidth > 0) {
          try {
            const off = document.createElement('canvas');
            off.width = domImg.naturalWidth;
            off.height = domImg.naturalHeight;
            const offCtx = off.getContext('2d');
            offCtx.drawImage(domImg, 0, 0);
            const offDataUrl = off.toDataURL('image/png');
            if (offDataUrl && offDataUrl.length > 50) {
              const img = new Image();
              img.src = offDataUrl;
              const res = await waitImg(img);
              if (res) {
                this._logoImageCache.set(cleanSrc, res);
                return res;
              }
            }
          } catch (taintErr) {}
        }
      }
    } catch (e) {}

    // 5. Direct Image load with crossOrigin = 'anonymous' (with cache-buster)
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = cleanSrc.includes('?') ? `${cleanSrc}&_bc=${Date.now()}` : `${cleanSrc}?_bc=${Date.now()}`;
      const res = await waitImg(img);
      if (res) {
        this._logoImageCache.set(cleanSrc, res);
        return res;
      }
    } catch (e) {}

    // 6. Direct Image load without crossOrigin (same-origin standard)
    try {
      const img = new Image();
      img.src = cleanSrc;
      const res = await waitImg(img);
      if (res) {
        this._logoImageCache.set(cleanSrc, res);
        return res;
      }
    } catch (e) {}

    return null;
  },

  // ══════════════════════════════════════════════════════════════
  // HIGH-RESOLUTION CANVAS EXPORT & DOWNLOAD
  // ══════════════════════════════════════════════════════════════
  async generateCardCanvas() {
    const data = this.getCardData();
    const style = this.STYLES[this.currentStyleIndex] || this.STYLES[0];
    const { pgName, tagline, ownerName, phone, whatsapp, email, address, website, businessId, amenitiesLine, logo, logoPosition, visibleFields, customLines } = data;

    const canvas = document.createElement('canvas');
    const scale = 2; // High-DPI Sharpness
    const w = 600 * scale;
    const h = 360 * scale;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    // Clip card with rounded corners
    ctx.save();
    roundRect(ctx, 0, 0, w, h, 28 * scale);
    ctx.clip();

    // Background Gradient based on selected style
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    if (style.id === 'modern-navy') {
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(0.55, '#1E3A8A');
      bgGrad.addColorStop(1, '#0284C7');
    } else if (style.id === 'luxury-emerald') {
      bgGrad.addColorStop(0, '#064E3B');
      bgGrad.addColorStop(0.5, '#065F46');
      bgGrad.addColorStop(1, '#059669');
    } else if (style.id === 'regal-gold') {
      bgGrad.addColorStop(0, '#18181B');
      bgGrad.addColorStop(0.5, '#27272A');
      bgGrad.addColorStop(1, '#09090B');
    } else if (style.id === 'amethyst-purple') {
      bgGrad.addColorStop(0, '#2E1065');
      bgGrad.addColorStop(0.5, '#4C1D95');
      bgGrad.addColorStop(1, '#7C3AED');
    } else {
      bgGrad.addColorStop(0, '#FFFFFF');
      bgGrad.addColorStop(0.6, '#F1F5F9');
      bgGrad.addColorStop(1, '#E2E8F0');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Decorative Ambient Highlights
    const rad1 = ctx.createRadialGradient(w * 0.85, h * 0.15, 10, w * 0.85, h * 0.15, w * 0.5);
    rad1.addColorStop(0, style.id === 'clean-frost' ? 'rgba(14, 165, 233, 0.20)' : 'rgba(255, 255, 255, 0.14)');
    rad1.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, w, h);

    // Card Border Stroke
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = style.id === 'clean-frost' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.18)';
    roundRect(ctx, 1 * scale, 1 * scale, w - 2 * scale, h - 2 * scale, 28 * scale);
    ctx.stroke();

    // 1. LOGO & HEADER
    const pad = 36 * scale;
    const logoSize = 54 * scale;
    let logoDrawn = false;

    let logoX = pad;
    let textX = pad + logoSize + 16 * scale;
    let headerTextAlign = 'left';

    if (logoPosition === 'top-center') {
      logoX = (w - logoSize) / 2;
      textX = w / 2;
      headerTextAlign = 'center';
    } else if (logoPosition === 'top-right') {
      logoX = w - pad - logoSize;
      textX = pad;
      headerTextAlign = 'left';
    }

    // Wait for fonts to be ready
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }

    if (logo) {
      try {
        const img = await this.loadCardLogo(logo);
        if (img && img.naturalWidth > 0) {
          ctx.save();
          roundRect(ctx, logoX, pad, logoSize, logoSize, 14 * scale);
          ctx.clip();
          
          // Draw with aspect ratio preservation (object-fit: cover)
          const nw = img.naturalWidth;
          const nh = img.naturalHeight;
          let drawW = logoSize;
          let drawH = logoSize;
          let drawX = logoX;
          let drawY = pad;
          if (nw > 0 && nh > 0) {
            const aspect = nw / nh;
            if (aspect > 1) {
              drawW = logoSize * aspect;
              drawX = logoX - (drawW - logoSize) / 2;
            } else if (aspect < 1) {
              drawH = logoSize / aspect;
              drawY = pad - (drawH - logoSize) / 2;
            }
          }

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();
          logoDrawn = true;
        }
      } catch (err) {
        console.warn('BusinessCard: Logo render error:', err);
      }
    }

    if (!logoDrawn) {
      ctx.save();
      roundRect(ctx, logoX, pad, logoSize, logoSize, 14 * scale);
      ctx.fillStyle = style.id === 'clean-frost' ? '#E0F2FE' : 'rgba(255, 255, 255, 0.16)';
      ctx.fill();
      ctx.font = `${28 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', logoX + logoSize / 2, pad + logoSize / 2);
      ctx.restore();
    }

    // Top Category Badge & Tagline
    ctx.textAlign = headerTextAlign;
    ctx.font = `bold ${10 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillStyle = style.accentColor;
    const badgeY = logoPosition === 'top-center' ? pad + logoSize + 16 * scale : pad + 18 * scale;
    ctx.fillText('VERIFIED ACCOMMODATION', textX, badgeY);

    if (visibleFields.tagline && tagline) {
      ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
      ctx.fillStyle = style.subColor;
      const tagY = logoPosition === 'top-center' ? badgeY + 18 * scale : pad + 38 * scale;
      const tagDisplay = tagline.length > 50 ? tagline.substring(0, 48) + '...' : tagline;
      ctx.fillText(tagDisplay, textX, tagY);
    }

    // 2. PROMINENT PG NAME
    const titleY = logoPosition === 'top-center' ? pad + logoSize + 56 * scale : pad + logoSize + 46 * scale;
    ctx.font = `800 ${26 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillStyle = style.textColor;
    ctx.textAlign = logoPosition === 'top-center' ? 'center' : 'left';
    const titleX = logoPosition === 'top-center' ? w / 2 : pad;
    ctx.fillText(pgName, titleX, titleY);

    // Owner name subtitle
    let curY = titleY;
    if (visibleFields.owner && ownerName) {
      curY += 20 * scale;
      ctx.font = `500 ${12.5 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
      ctx.fillStyle = style.subColor;
      ctx.fillText(`Managed by ${ownerName}`, titleX, curY);
    }

    // 3. DIVIDER ACCENT LINE
    curY += 16 * scale;
    const divGrad = ctx.createLinearGradient(pad, curY, w - pad, curY);
    divGrad.addColorStop(0, style.accentColor);
    divGrad.addColorStop(1, style.id === 'clean-frost' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(pad, curY);
    ctx.lineTo(w - pad, curY);
    ctx.stroke();

    // 4. CONTACT & LOCATION INFO LIST (Draw all visible details + amenities)
    curY += 16 * scale;
    ctx.textAlign = 'left';

    const infoLines = [];
    if (visibleFields.phone && phone) infoLines.push(`📞 ${phone}`);
    if (visibleFields.whatsapp && whatsapp) infoLines.push(`💬 ${whatsapp}`);
    if (visibleFields.email && email) infoLines.push(`✉️ ${email}`);
    if (visibleFields.address && address) {
      const addrShort = address.length > 55 ? address.substring(0, 52) + '...' : address;
      infoLines.push(`📍 ${addrShort}`);
    }
    if (visibleFields.website && website) infoLines.push(`🌐 ${website}`);
    if (visibleFields.businessId && businessId) infoLines.push(`🆔 ${businessId}`);

    // Dedicated Amenities Line in Canvas
    if (visibleFields.amenities !== false && amenitiesLine) {
      const amenShort = amenitiesLine.length > 58 ? amenitiesLine.substring(0, 55) + '...' : amenitiesLine;
      infoLines.push(`✨ Amenities: ${amenShort}`);
    }

    if (Array.isArray(customLines)) {
      customLines.forEach(l => {
        if (l && l.visible !== false && l.text && l.text.trim()) {
          infoLines.push(`🔹 ${l.text.trim()}`);
        }
      });
    }

    if (infoLines.length === 0) {
      infoLines.push('📞 Contact via WhatsApp');
    }

    // Dynamic row spacing based on count so all details are completely visible
    const numRows = infoLines.length;
    const rowStep = numRows > 4 ? 16 * scale : (numRows > 3 ? 18 * scale : 20 * scale);
    const fontSize = numRows > 4 ? 11 * scale : 12 * scale;

    for (let r = 0; r < numRows; r++) {
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
      ctx.fillStyle = style.textColor;
      ctx.fillText(infoLines[r], pad, curY + (r * rowStep));
    }

    // 5. FOOTER
    const footerY = h - 18 * scale;
    ctx.font = `500 ${10 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillStyle = style.subColor;
    ctx.textAlign = 'left';
    ctx.fillText('🏠 Premium PG Accommodation', pad, footerY);

    ctx.textAlign = 'right';
    ctx.font = `600 ${10 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillText('Powered by ' + pgName, w - pad, footerY);

    ctx.restore();

    // Verify canvas is not tainted before returning
    try {
      canvas.toDataURL('image/png'); // throws SecurityError if canvas is tainted
    } catch (taintErr) {
      // Canvas is tainted (cross-origin image) — re-render without logo
      console.warn('BusinessCard: Canvas tainted, re-rendering without logo');
      return this._generateCardCanvasNoLogo(data, style);
    }

    return canvas;
  },

  // Fallback canvas renderer without logo (avoids taint from cross-origin images)
  _generateCardCanvasNoLogo(data, style) {
    const { pgName, tagline, ownerName, phone, whatsapp, email, address, website, businessId, logoPosition, visibleFields, customLines } = data;
    const amenitiesLine = data.amenitiesLine || '';

    const canvas = document.createElement('canvas');
    const scale = 2;
    const w = 600 * scale;
    const h = 360 * scale;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    ctx.save();
    roundRect(ctx, 0, 0, w, h, 28 * scale);
    ctx.clip();

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    if (style.id === 'modern-navy') {
      bgGrad.addColorStop(0, '#0F172A'); bgGrad.addColorStop(0.55, '#1E3A8A'); bgGrad.addColorStop(1, '#0284C7');
    } else if (style.id === 'luxury-emerald') {
      bgGrad.addColorStop(0, '#064E3B'); bgGrad.addColorStop(0.5, '#065F46'); bgGrad.addColorStop(1, '#059669');
    } else if (style.id === 'regal-gold') {
      bgGrad.addColorStop(0, '#18181B'); bgGrad.addColorStop(0.5, '#27272A'); bgGrad.addColorStop(1, '#09090B');
    } else if (style.id === 'amethyst-purple') {
      bgGrad.addColorStop(0, '#2E1065'); bgGrad.addColorStop(0.5, '#4C1D95'); bgGrad.addColorStop(1, '#7C3AED');
    } else {
      bgGrad.addColorStop(0, '#FFFFFF'); bgGrad.addColorStop(0.6, '#F1F5F9'); bgGrad.addColorStop(1, '#E2E8F0');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const pad = 36 * scale;
    const logoSize = 54 * scale;
    const logoX = pad;
    const textX = pad + logoSize + 16 * scale;

    // Draw placeholder logo
    roundRect(ctx, logoX, pad, logoSize, logoSize, 14 * scale);
    ctx.fillStyle = style.id === 'clean-frost' ? '#E0F2FE' : 'rgba(255,255,255,0.16)';
    ctx.fill();
    ctx.font = `${28 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏠', logoX + logoSize / 2, pad + logoSize / 2);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = `bold ${10 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillStyle = style.accentColor;
    ctx.fillText('VERIFIED ACCOMMODATION', textX, pad + 18 * scale);

    if (visibleFields.tagline && tagline) {
      ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
      ctx.fillStyle = style.subColor;
      const tagDisplay = tagline.length > 50 ? tagline.substring(0, 48) + '...' : tagline;
      ctx.fillText(tagDisplay, textX, pad + 38 * scale);
    }

    const titleY = pad + logoSize + 46 * scale;
    ctx.font = `800 ${26 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillStyle = style.textColor;
    ctx.textAlign = 'left';
    ctx.fillText(pgName, pad, titleY);

    let curY = titleY;
    if (visibleFields.owner && ownerName) {
      curY += 20 * scale;
      ctx.font = `500 ${12.5 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
      ctx.fillStyle = style.subColor;
      ctx.fillText(`Managed by ${ownerName}`, pad, curY);
    }

    curY += 16 * scale;
    const divGrad = ctx.createLinearGradient(pad, curY, w - pad, curY);
    divGrad.addColorStop(0, style.accentColor);
    divGrad.addColorStop(1, style.id === 'clean-frost' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath(); ctx.moveTo(pad, curY); ctx.lineTo(w - pad, curY); ctx.stroke();

    curY += 16 * scale;
    ctx.textAlign = 'left';

    const infoLines = [];
    if (visibleFields.phone && phone) infoLines.push(`📞 ${phone}`);
    if (visibleFields.whatsapp && whatsapp) infoLines.push(`💬 ${whatsapp}`);
    if (visibleFields.email && email) infoLines.push(`✉️ ${email}`);
    if (visibleFields.address && address) {
      const addrShort = address.length > 55 ? address.substring(0, 52) + '...' : address;
      infoLines.push(`📍 ${addrShort}`);
    }
    if (visibleFields.website && website) infoLines.push(`🌐 ${website}`);
    if (visibleFields.businessId && businessId) infoLines.push(`🆔 ${businessId}`);
    if (visibleFields.amenities !== false && amenitiesLine) {
      const amenShort = amenitiesLine.length > 58 ? amenitiesLine.substring(0, 55) + '...' : amenitiesLine;
      infoLines.push(`✨ Amenities: ${amenShort}`);
    }
    if (Array.isArray(customLines)) {
      customLines.forEach(l => { if (l && l.visible !== false && l.text && l.text.trim()) infoLines.push(`🔹 ${l.text.trim()}`); });
    }
    if (infoLines.length === 0) infoLines.push('📞 Contact via WhatsApp');

    const numRows = infoLines.length;
    const rowStep = numRows > 4 ? 16 * scale : (numRows > 3 ? 18 * scale : 20 * scale);
    const fontSize = numRows > 4 ? 11 * scale : 12 * scale;

    for (let r = 0; r < numRows; r++) {
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
      ctx.fillStyle = style.textColor;
      ctx.fillText(infoLines[r], pad, curY + (r * rowStep));
    }

    const footerY = h - 18 * scale;
    ctx.font = `500 ${10 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillStyle = style.subColor;
    ctx.textAlign = 'left';
    ctx.fillText('🏠 Premium PG Accommodation', pad, footerY);
    ctx.textAlign = 'right';
    ctx.font = `600 ${10 * scale}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.fillText('Powered by ' + pgName, w - pad, footerY);

    ctx.restore();
    return canvas;
  },

  // ══════════════════════════════════════════════════════════════
  // ACTIONS: SHARE ON WHATSAPP, DOWNLOAD IMAGE, FULL PREVIEW
  // ══════════════════════════════════════════════════════════════
  async shareOnWhatsApp(options = {}) {
    if (this._isSharing) return;
    this._isSharing = true;

    try {
      const data = this.getCardData();
      const { pgName, tagline, ownerName, phone, whatsapp, email, address, website, businessId, amenitiesLine, visibleFields, customLines } = data;

      // Professional WhatsApp message with configured fields
      const lines = [
        `*Welcome to ${pgName}!*`,
        `━━━━━━━━━━━━━━━━━━`,
        `🏠 *${pgName}*`
      ];

      if (visibleFields.tagline && tagline) lines.push(`✨ _${tagline}_`);
      lines.push('');

      if (visibleFields.owner && ownerName) lines.push(`👤 *Manager:* ${ownerName}`);
      if (visibleFields.phone && phone) lines.push(`📞 *Contact:* ${phone}`);
      if (visibleFields.whatsapp && whatsapp && whatsapp !== phone) lines.push(`💬 *WhatsApp:* ${whatsapp}`);
      if (visibleFields.email && email) lines.push(`✉️ *Email:* ${email}`);
      if (visibleFields.address && address) lines.push(`📍 *Address:* ${address}`);
      if (visibleFields.website && website) lines.push(`🌐 *Website:* ${website}`);
      if (visibleFields.businessId && businessId) lines.push(`🆔 *ID:* ${businessId}`);

      const prop = (typeof DB !== 'undefined' && DB.getProperty) ? (DB.getProperty() || {}) : {};
      const defRent = prop.defaultBedPrice || prop.rent;
      if (defRent) {
        const cur = prop.currency || '₹';
        lines.push(`💰 *Rent:* Starting from ${cur}${defRent}/month`);
      }

      if (visibleFields.amenities !== false && amenitiesLine) {
        lines.push(`✨ *Facilities:* ${amenitiesLine}`);
      }

      if (Array.isArray(customLines)) {
        const activeCustom = customLines.filter(l => l && l.visible !== false && l.text && l.text.trim());
        if (activeCustom.length > 0) {
          lines.push('');
          activeCustom.forEach(l => lines.push(`• ${l.text.trim()}`));
        }
      }

      lines.push('');
      lines.push(`Please contact us for room availability, pricing, and further details.`);
      lines.push(`━━━━━━━━━━━━━━━━━━`);
      lines.push(`📲 *Powered by ${pgName}*`);

      const shareText = lines.join('\n');

      if (typeof SoundFX !== 'undefined' && SoundFX.whatsappSend) {
        SoundFX.whatsappSend();
      }

      showToast('⏳ Preparing business card image for sharing…', 'info');
      const canvas = await this.generateCardCanvas();

      let dataUrl;
      try {
        dataUrl = canvas.toDataURL('image/png');
      } catch (taintErr) {
        console.warn('BusinessCard share: canvas tainted, using origin-clean fallback');
        const style = this.STYLES[this.currentStyleIndex] || this.STYLES[0];
        const fallbackCanvas = this._generateCardCanvasNoLogo(data, style);
        dataUrl = fallbackCanvas.toDataURL('image/png');
      }

      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const cleanName = (pgName || 'PG').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
      const fileName = `${cleanName}-Business-Card.png`;

      // Check if Web Share API with File sharing is supported
      let canShareFiles = false;
      let file = null;
      if (blob && typeof File !== 'undefined') {
        try {
          file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            canShareFiles = true;
          }
        } catch (e) {
          canShareFiles = false;
        }
      }

      if (canShareFiles && file) {
        try {
          await navigator.share({
            title: `${pgName} — Digital Business Card`,
            text: shareText,
            files: [file]
          });
          showToast('✅ Business card and details shared successfully!', 'success');
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            // User cancelled native share sheet
            return;
          }
          console.warn('Native share failed, falling back:', shareErr);
        }
      }

      // Fallback for unsupported platforms (e.g. Desktop browsers)
      this.fallbackWhatsAppWithDownload(shareText, blob, fileName);

    } catch (e) {
      console.error('Business card share error:', e);
      showToast('❌ Failed to share business card: ' + (e.message || ''), 'error');
    } finally {
      this._isSharing = false;
    }
  },

  fallbackWhatsAppWithDownload(shareText, blob, fileName) {
    if (blob) {
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }, 3000);
      } catch (e) {
        console.warn('Fallback download failed:', e);
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).catch(() => {});
      }
    } catch (e) {}

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    let newWin = null;
    try {
      newWin = window.open(waUrl, '_blank');
    } catch (e) {}

    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      showModal('📲 WhatsApp Ready', `
        <div style="text-align:center; padding:16px;">
          <div style="font-size:36px; margin-bottom:12px;">📲</div>
          <div style="font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">Card Image Downloaded!</div>
          <div style="font-size:13px; color:var(--text-secondary); margin-bottom:16px; line-height:1.5;">
            Your business card image (<strong>${fileName}</strong>) has been downloaded to your device.<br>
            Click below to open WhatsApp and attach the card image to your chat.
          </div>
          <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
            <a href="${waUrl}" target="_blank" class="btn btn-whatsapp" style="text-decoration:none; padding:10px 24px; font-weight:700;">
              <span>📲 Open WhatsApp Now</span>
            </a>
            <button class="btn btn-ghost" onclick="closeModal()" style="padding:10px 18px;">Close</button>
          </div>
        </div>
      `);
    } else {
      showToast('📥 Card image downloaded & WhatsApp opened! Please attach the downloaded card to your chat.', 'info');
    }
  },

  async downloadCardImage() {
    if (this._isDownloading) return;
    this._isDownloading = true;

    try {
      showToast('⏳ Generating high-resolution business card image…', 'info');
      const data = this.getCardData();
      const canvas = await this.generateCardCanvas();

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas rendering produced an invalid image size');
      }

      let dataUrl;
      try {
        dataUrl = canvas.toDataURL('image/png');
      } catch (taintErr) {
        console.warn('BusinessCard download: canvas tainted, using origin-clean fallback');
        const style = this.STYLES[this.currentStyleIndex] || this.STYLES[0];
        const fallbackCanvas = this._generateCardCanvasNoLogo(data, style);
        dataUrl = fallbackCanvas.toDataURL('image/png');
      }

      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      if (!blob || blob.size < 200) {
        throw new Error('Generated image is incomplete or corrupted');
      }

      const cleanName = (data.pgName || 'PG').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
      const fileName = `${cleanName}-Business-Card.png`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 3000);

      if (typeof SoundFX !== 'undefined' && SoundFX.buttonClick) {
        SoundFX.buttonClick();
      }
      showToast('📥 Business Card downloaded successfully!', 'success');
    } catch (e) {
      console.error('BusinessCard download error:', e);
      showToast('❌ Failed to generate business card image: ' + (e.message || ''), 'error');
    } finally {
      this._isDownloading = false;
    }
  },

  async viewFullCardModal() {
    if (this._isPreviewing) return;
    this._isPreviewing = true;

    const data = this.getCardData();
    showModal(`🔍 ${data.pgName || 'Business Card'} — Preview`, `
      <div id="bc-preview-modal-body" style="text-align:center; padding:32px 16px;">
        <div style="width:36px; height:36px; border:3px solid var(--border, #e2e8f0); border-top-color:var(--accent-blue, #0284c7); border-radius:50%; animation:bc-spin 0.8s linear infinite; margin:0 auto 14px;"></div>
        <style>@keyframes bc-spin { to { transform: rotate(360deg); } }</style>
        <div style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Preparing Full Preview…</div>
        <div style="font-size:12.5px; color:var(--text-muted);">Generating high-resolution card with latest PG details &amp; logo…</div>
      </div>
    `);

    try {
      const canvas = await this.generateCardCanvas();
      let imgUrl;
      try {
        imgUrl = canvas.toDataURL('image/png');
      } catch (taintErr) {
        console.warn('BusinessCard preview: canvas tainted, using origin-clean fallback');
        const style = this.STYLES[this.currentStyleIndex] || this.STYLES[0];
        const fallbackCanvas = this._generateCardCanvasNoLogo(data, style);
        imgUrl = fallbackCanvas.toDataURL('image/png');
      }

      showModal(`🔍 ${data.pgName} — Business Card`, `
        <div style="text-align:center; padding:4px 0;">
          <div style="margin-bottom:12px; font-size:12px; color:var(--text-muted); font-weight:500;">
            High-Resolution 1:1 Scaled Preview · Ready for WhatsApp &amp; Sharing
          </div>
          <div style="background:rgba(0,0,0,0.04); padding:10px; border-radius:20px; display:inline-block; max-width:100%; box-sizing:border-box;">
            <img src="${imgUrl}" alt="${data.pgName} Business Card" style="width:100%; max-width:580px; height:auto; border-radius:16px; box-shadow:0 12px 36px rgba(0,0,0,0.18); display:block; margin:0 auto;">
          </div>
          <div style="display:flex; justify-content:center; gap:8px; margin-top:16px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="BusinessCard.downloadCardImage()" style="min-height:44px; padding:8px 18px; font-weight:600;">
              <span>📥</span> <span>Download Image</span>
            </button>
            <button class="btn btn-whatsapp" onclick="BusinessCard.shareOnWhatsApp()" style="min-height:44px; padding:8px 18px; font-weight:600;">
              <span>📲</span> <span>Share on WhatsApp</span>
            </button>
            <button class="btn btn-ghost" onclick="closeModal()" style="min-height:44px; padding:8px 16px;">
              <span>✕ Close Preview</span>
            </button>
          </div>
        </div>
      `);
    } catch (e) {
      console.error('BusinessCard full preview error:', e);
      showModal(`🔍 Preview Error`, `
        <div style="text-align:center; padding:24px 16px;">
          <div style="font-size:36px; margin-bottom:10px;">⚠️</div>
          <div style="font-size:16px; font-weight:700; color:var(--accent-red, #ef4444); margin-bottom:8px;">Unable to render full preview</div>
          <div style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">${e.message || 'An unexpected rendering error occurred. Please try again.'}</div>
          <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="BusinessCard.viewFullCardModal()" style="min-height:42px; padding:8px 20px;">🔄 Retry</button>
            <button class="btn btn-ghost" onclick="closeModal()" style="min-height:42px; padding:8px 18px;">✕ Close</button>
          </div>
        </div>
      `);
    } finally {
      this._isPreviewing = false;
    }
  },

  copyDetails() {
    const data = this.getCardData();
    const { pgName, tagline, ownerName, phone, whatsapp, email, address, website, businessId, amenitiesLine, visibleFields, customLines } = data;

    const parts = [pgName];
    if (visibleFields.tagline && tagline) parts.push(tagline);
    parts.push('');

    if (visibleFields.owner && ownerName) parts.push(`Manager: ${ownerName}`);
    if (visibleFields.phone && phone) parts.push(`Phone: ${phone}`);
    if (visibleFields.whatsapp && whatsapp) parts.push(`WhatsApp: ${whatsapp}`);
    if (visibleFields.email && email) parts.push(`Email: ${email}`);
    if (visibleFields.address && address) parts.push(`Address: ${address}`);
    if (visibleFields.website && website) parts.push(`Website: ${website}`);
    if (visibleFields.businessId && businessId) parts.push(`ID: ${businessId}`);
    if (visibleFields.amenities !== false && amenitiesLine) parts.push(`Amenities: ${amenitiesLine}`);

    if (Array.isArray(customLines)) {
      customLines.forEach(l => {
        if (l && l.visible !== false && l.text && l.text.trim()) {
          parts.push(`- ${l.text.trim()}`);
        }
      });
    }

    const text = parts.filter(p => p !== null && p !== undefined).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      if (typeof SoundFX !== 'undefined' && SoundFX.buttonClick) {
        SoundFX.buttonClick();
      }
      showToast('📋 Business Card info copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy info to clipboard', 'error');
    });
  }
};
