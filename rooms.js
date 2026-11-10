// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — ROOMS & FLOORS TAB
// Hierarchy: Property → Floors → Rooms → Beds → Tenants
// Powered by Rentora
// ============================================================

const Rooms = {
  activeFloor: 'all', // 'all' or specific floorId
  expandedFloors: new Set(),
  expandedRooms: new Set(),
  _collapsedRooms: new Set(),

  render() {
    const floors = DB.getFloors();
    const allRooms = DB.getRooms();
    const allBeds = DB.getBeds();
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';

    const totalRooms = allRooms.length;
    const totalBeds = allBeds.length;
    const occupiedBeds = allBeds.filter(b => b.tenantId).length;
    const vacantBeds = totalBeds - occupiedBeds;

    // ── EMPTY STATE: NO FLOORS ───────────────────────────────
    if (floors.length === 0) {
      document.getElementById('tab-rooms').innerHTML = `
        <div class="scroll-area">
          <div class="rooms-header-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding:4px 0">
            <div>
              <h2 class="rooms-section-title" style="margin:0; font-size:22px; font-weight:800">Rooms &amp; Floors</h2>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:2px">Manage your entire property hierarchy</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="Rooms.showAddFloorModal()" style="display:inline-flex; align-items:center; gap:6px; font-weight:700">
              <span>🏢</span> <span>+ Add Floor</span>
            </button>
          </div>

          <div class="empty-state" style="padding:60px 20px; text-align:center">
            <div class="empty-icon" style="font-size:56px; margin-bottom:14px">🏢</div>
            <div class="empty-title" style="font-size:19px; font-weight:800; color:var(--text-primary)">No Floors Added Yet</div>
            <div class="empty-sub" style="font-size:13px; max-width:360px; margin:8px auto 20px; line-height:1.5">
              Start building your property structure here: <strong>Property → Floors → Rooms → Beds → Tenants</strong>.
            </div>
            <button class="btn btn-primary btn-lg" onclick="Rooms.showAddFloorModal()" style="display:inline-flex; align-items:center; gap:8px; font-weight:700">
              <span>➕</span> <span>Add First Floor</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    // By default, initialize all floors to expanded
    if (this.expandedFloors.size === 0) {
      floors.forEach(f => this.expandedFloors.add(f.id));
    }

    // Build Floor Filter Tabs
    const floorTabs = `
      <button class="floor-tab ${this.activeFloor === 'all' ? 'active' : ''}" onclick="Rooms.setFloor('all')">
        🏢 All Floors (${floors.length})
      </button>
      ${floors.map(f => `
        <button class="floor-tab ${this.activeFloor === f.id ? 'active' : ''}" onclick="Rooms.setFloor('${f.id}')">
          ${f.name}
        </button>
      `).join('')}
      <button class="floor-tab" onclick="Rooms.showAddFloorModal()" style="border-style:dashed; color:var(--accent-blue); border-color:var(--accent-blue); background:transparent">
        ➕ Add Floor
      </button>
    `;

    // Filter displayed floors
    const visibleFloors = this.activeFloor === 'all' 
      ? floors 
      : floors.filter(f => f.id === this.activeFloor);

    const floorCardsHtml = visibleFloors.map(f => this.renderFloorCard(f, prop, cur)).join('');

    document.getElementById('tab-rooms').innerHTML = `
      <div class="scroll-area">
        <!-- Top Action Bar -->
        <div class="rooms-header-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:2px 0">
          <div>
            <h2 class="rooms-section-title" style="margin:0; font-size:20px; font-weight:800; letter-spacing:-0.3px">Rooms &amp; Floors</h2>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:3px; display:flex; align-items:center; gap:6px; flex-wrap:wrap">
              <span>🏢 ${floors.length} Floors</span> · 
              <span>🚪 ${totalRooms} Rooms</span> · 
              <span>🛏️ ${totalBeds} Beds</span>
              <span class="badge green" style="font-size:10px; padding:1px 6px">🟢 ${vacantBeds} Vacant</span>
              <span class="badge red" style="font-size:10px; padding:1px 6px">🔴 ${occupiedBeds} Occupied</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Rooms.showAddFloorModal()" style="display:inline-flex; align-items:center; gap:6px; font-weight:700; border-radius:var(--radius-full); padding:7px 14px; box-shadow:var(--shadow-sm)">
            <span>🏢</span> <span>+ Add Floor</span>
          </button>
        </div>

        <!-- Floor Filter Tabs -->
        <div class="floor-tabs" style="margin-bottom:16px">${floorTabs}</div>

        <!-- Floors & Rooms Container -->
        <div id="floors-container">
          ${floorCardsHtml}
        </div>
      </div>

      <!-- Quick Action FAB -->
      <button class="room-fab-left" id="fab-add-room" onclick="Rooms.triggerFabAction()" 
        title="Add Floor or Room" aria-label="Add Floor or Room"
        style="position:fixed !important; bottom:calc(var(--nav-height) + var(--safe-bottom) + 16px) !important; left:20px !important; right:auto !important; width:56px !important; height:56px !important; border-radius:50% !important; background:linear-gradient(135deg, #6366F1, #8B5CF6) !important; color:#FFFFFF !important; border:none !important; cursor:pointer !important; box-shadow:0 6px 24px rgba(99, 102, 241, 0.45) !important; display:flex !important; align-items:center !important; justify-content:center !important; z-index:180 !important; -webkit-tap-highlight-color:transparent !important; user-select:none !important;">
        <span class="room-fab-icon" style="display:inline-flex; align-items:center; justify-content:center; line-height:1;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </span>
        <span class="room-fab-pulse" style="position:absolute; top:2px; right:2px; width:12px; height:12px; background:#38BDF8; border-radius:50%; border:2px solid white;"></span>
      </button>
    `;
  },

  // ── RENDER FLOOR CARD ──────────────────────────────────────
  renderFloorCard(floor, prop, cur) {
    const isExpanded = this.expandedFloors.has(floor.id);
    const stats = DB.getFloorStats(floor.id);
    const rooms = DB.getRoomsByFloor(floor.id);

    const roomsContent = rooms.length === 0
      ? `
        <div class="empty-state" style="padding:28px 16px; background:var(--bg-card); border-radius:var(--radius-lg); border:1px dashed var(--border); text-align:center">
          <div class="empty-icon" style="font-size:32px; margin-bottom:8px">🚪</div>
          <div class="empty-title" style="font-size:14px; font-weight:700">No rooms on ${floor.name} yet</div>
          <div class="empty-sub" style="font-size:12px; margin:4px 0 12px">Click "+ Add Room" to create a room on this floor.</div>
          <button class="btn btn-primary btn-sm" onclick="Rooms.showAddRoomModal('${floor.id}')" style="display:inline-flex; align-items:center; gap:6px">
            <span>➕</span> <span>Add Room to ${floor.name}</span>
          </button>
        </div>
      `
      : `
        <div class="rooms-grid-container">
          ${rooms.map(r => this.renderRoomCard(r, floor, cur)).join('')}
        </div>
      `;

    return `
      <div class="floor-card ${isExpanded ? 'expanded' : ''}" id="fc-${floor.id}">
        <!-- Floor Header -->
        <div class="floor-card-header" onclick="Rooms.toggleFloor('${floor.id}')">
          <div class="floor-card-title-wrap">
            <div class="floor-icon">🏢</div>
            <div class="floor-title-info">
              <div class="floor-name">${floor.name}</div>
              <div class="floor-summary-pills">
                <span style="font-size:11px; font-weight:600; color:var(--text-secondary)">${stats.rooms} ${stats.rooms === 1 ? 'Room' : 'Rooms'} · ${stats.total} Beds</span>
                <span class="badge green" style="font-size:10px; padding:1px 6px">🟢 ${stats.vacant} Vacant</span>
                <span class="badge red" style="font-size:10px; padding:1px 6px">🔴 ${stats.occupied} Occupied</span>
              </div>
            </div>
          </div>

          <!-- Floor Action Buttons -->
          <div class="floor-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); Rooms.showAddRoomModal('${floor.id}')" 
              title="Add Room to ${floor.name}" style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; padding:6px 12px; border-radius:var(--radius-full)">
              <span>➕</span> <span>Add Room</span>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Rooms.showEditFloorModal('${floor.id}')" title="Edit Floor Name" style="padding:6px 8px">
              ✏️
            </button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Rooms.deleteFloor('${floor.id}')" title="Delete Floor" style="padding:6px 8px; color:var(--accent-red)">
              🗑️
            </button>
            <span class="floor-card-chevron">›</span>
          </div>
        </div>

        <!-- Floor Body (Rooms) -->
        <div class="floor-card-body">
          ${roomsContent}
        </div>
      </div>
    `;
  },

  // ── RENDER ROOM CARD ───────────────────────────────────────
  renderRoomCard(room, floor, cur) {
    const beds = DB.getBedsByRoom(room.id);
    const occupied = beds.filter(b => b.tenantId).length;
    const vacant = beds.length - occupied;
    const isExpanded = !this._collapsedRooms.has(room.id);

    const bedChips = beds.map(b => {
      const tenant = b.tenantId ? DB.getTenantById(b.tenantId) : null;
      if (tenant) {
        return `
          <button class="bed-chip occupied" onclick="Rooms.openBedModal('${b.id}')" title="Bed ${b.number} — ${tenant.name} (Occupied)">
            <span class="bed-chip-icon">👤</span>
            <span class="bed-chip-number">Bed ${b.number}</span>
            <span class="bed-chip-name">${tenant.name.split(' ')[0]}</span>
            <span style="font-size:9px; opacity:0.85; font-weight:600">🔴 Occupied</span>
          </button>
        `;
      } else {
        return `
          <button class="bed-chip vacant" onclick="Rooms.openBedModal('${b.id}')" title="Bed ${b.number} — Vacant (${cur}${b.price})">
            <span class="bed-chip-icon">🛏️</span>
            <span class="bed-chip-number">Bed ${b.number}</span>
            <span class="bed-chip-name" style="color:var(--accent-green); font-weight:700">Vacant</span>
            <span style="font-size:9px; opacity:0.85">${cur}${b.price}</span>
          </button>
        `;
      }
    }).join('');

    return `
      <div class="room-card ${isExpanded ? 'expanded' : ''}" id="rc-${room.id}">
        <div class="room-card-header" onclick="Rooms.toggleRoom('${room.id}')">
          <div class="room-icon">🚪</div>
          <div class="room-info">
            <div class="room-name">Room ${room.name}</div>
            <div class="room-meta">
              <span class="badge green" style="font-size:10px">🟢 ${vacant} Vacant</span>
              <span class="badge red" style="font-size:10px">🔴 ${occupied} Occupied</span>
              <span style="font-size:11px; color:var(--text-muted)">· ${beds.length} ${beds.length === 1 ? 'Bed' : 'Beds'}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Rooms.showEditRoomModal('${room.id}')" title="Edit Room" style="padding:4px 8px">
              ✏️
            </button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Rooms.deleteRoom('${room.id}')" title="Delete Room" style="padding:4px 8px; color:var(--accent-red)">
              🗑️
            </button>
            <span class="room-chevron">›</span>
          </div>
        </div>

        <div class="beds-grid">
          ${bedChips}
          <button class="bed-chip add-bed-chip" onclick="Rooms.showAddBedModal('${room.id}')" title="Add another bed to Room ${room.name}">
            <span class="bed-chip-icon">➕</span>
            <span class="bed-chip-number" style="color:var(--accent-blue)">New Bed</span>
            <span class="bed-chip-name" style="color:var(--accent-blue)">+ Add</span>
          </button>
        </div>
      </div>
    `;
  },

  // ── TOGGLE EXPANSION ───────────────────────────────────────
  toggleFloor(floorId) {
    if (this.expandedFloors.has(floorId)) {
      this.expandedFloors.delete(floorId);
    } else {
      this.expandedFloors.add(floorId);
    }
    const card = document.getElementById(`fc-${floorId}`);
    if (card) {
      card.classList.toggle('expanded', this.expandedFloors.has(floorId));
    } else {
      this.render();
    }
  },

  toggleRoom(roomId) {
    if (this._collapsedRooms.has(roomId)) {
      this._collapsedRooms.delete(roomId);
    } else {
      this._collapsedRooms.add(roomId);
    }
    const card = document.getElementById(`rc-${roomId}`);
    if (card) {
      card.classList.toggle('expanded', !this._collapsedRooms.has(roomId));
    } else {
      this.render();
    }
  },

  setFloor(floorId) {
    this.activeFloor = floorId;
    if (floorId !== 'all') {
      this.expandedFloors.add(floorId);
    }
    this.render();
  },

  triggerFabAction() {
    const floors = DB.getFloors();
    if (floors.length === 0) {
      this.showAddFloorModal();
    } else if (this.activeFloor && this.activeFloor !== 'all') {
      this.showAddRoomModal(this.activeFloor);
    } else {
      this.showAddRoomModal();
    }
  },

  // ── FLOOR MANAGEMENT MODALS ────────────────────────────────
  showAddFloorModal() {
    const existing = DB.getFloors();
    const suggestions = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor', 'Basement', 'Terrace'];
    const nextSuggestion = suggestions[existing.length] || `Floor ${existing.length}`;

    showModal('🏢 Add New Floor', `
      <div class="form-group">
        <label class="form-label">Floor Name or Number *</label>
        <input class="form-input" id="inp-new-floor-name" value="${nextSuggestion}" placeholder="e.g. Ground Floor, First Floor, Floor 2" autocomplete="off">
        <div style="font-size:11px; color:var(--text-muted); margin-top:6px">
          Quick Suggestions:
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px">
            ${['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Basement'].map(s => `
              <button type="button" class="btn btn-ghost btn-sm" style="padding:3px 8px; font-size:11px; border:1px solid var(--border)" onclick="document.getElementById('inp-new-floor-name').value='${s}'">${s}</button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Rooms.saveFloor()">➕ Add Floor</button>
      </div>
    `);

    const inp = document.getElementById('inp-new-floor-name');
    if (inp) {
      inp.focus();
      inp.select();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') Rooms.saveFloor();
      });
    }
  },

  saveFloor() {
    const inp = document.getElementById('inp-new-floor-name');
    const name = inp ? inp.value.trim() : '';
    if (!name) return showToast('Please enter a floor name', 'error');

    const existing = DB.getFloors();
    if (existing.some(f => f.name.trim().toLowerCase() === name.toLowerCase())) {
      return showToast(`Floor "${name}" already exists`, 'error');
    }

    const floorId = generateId('f');
    DB.addFloor({ id: floorId, name, order: existing.length });
    closeModal();
    this.expandedFloors.add(floorId);
    this.render();
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ Floor "${name}" created!`, 'success');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  showEditFloorModal(floorId) {
    const floor = DB.getFloors().find(f => f.id === floorId);
    if (!floor) return;
    showModal(`✏️ Edit Floor — ${floor.name}`, `
      <div class="form-group">
        <label class="form-label">Floor Name *</label>
        <input class="form-input" id="inp-edit-floor-name" value="${floor.name}" autocomplete="off">
      </div>
      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Rooms.updateFloor('${floorId}')">💾 Save Changes</button>
      </div>
    `);
    const inp = document.getElementById('inp-edit-floor-name');
    if (inp) {
      inp.focus();
      inp.select();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') Rooms.updateFloor(floorId);
      });
    }
  },

  updateFloor(floorId) {
    const inp = document.getElementById('inp-edit-floor-name');
    const name = inp ? inp.value.trim() : '';
    if (!name) return showToast('Enter floor name', 'error');
    DB.updateFloor(floorId, { name });
    closeModal();
    this.render();
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast('✅ Floor updated!', 'success');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  deleteFloor(floorId) {
    const floor = DB.getFloors().find(f => f.id === floorId);
    if (!floor) return;
    const stats = DB.getFloorStats(floorId);

    // Validation 1: Prevent deleting a floor with active tenants
    if (stats.occupied > 0) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast(`⚠️ Cannot delete "${floor.name}". It contains ${stats.occupied} active tenant(s). Vacate or reassign tenants first.`, 'error');
    }

    // Validation 2: Confirm if floor contains empty rooms
    if (stats.rooms > 0) {
      if (!confirm(`"${floor.name}" contains ${stats.rooms} empty room(s). Delete floor and all its empty rooms?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete floor "${floor.name}"?`)) return;
    }

    DB.deleteFloor(floorId);
    this.expandedFloors.delete(floorId);
    if (this.activeFloor === floorId) this.activeFloor = 'all';
    this.render();
    showToast(`🗑️ Floor "${floor.name}" deleted`, 'info');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  // ── ROOM MANAGEMENT MODALS ─────────────────────────────────
  showAddRoomModal(floorId = null) {
    const floors = DB.getFloors();
    if (!floors || floors.length === 0) {
      showToast('Please add a floor first', 'error');
      this.showAddFloorModal();
      return;
    }

    let targetFloor = null;
    if (floorId) {
      targetFloor = floors.find(f => f.id === floorId);
    }
    if (!targetFloor) {
      targetFloor = floors.find(f => f.id === this.activeFloor) || floors[0];
    }

    const prop = DB.getProperty();
    const cur = prop.currency || '₹';

    showModal(`🚪 Add Room to ${targetFloor.name}`, `
      <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; border:1px solid var(--border)">
        <div>
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase">Target Floor</div>
          <div style="font-size:15px; font-weight:800; color:var(--text-primary)">🏢 ${targetFloor.name}</div>
        </div>
        <span class="badge blue">Assigned Floor</span>
      </div>
      <input type="hidden" id="inp-room-floor" value="${targetFloor.id}">

      <div class="form-group">
        <label class="form-label">Room Number or Name *</label>
        <input class="form-input" id="inp-room-name" placeholder="e.g. 101, 201, Room A" autocomplete="off">
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px">Enter a unique identifier for this room</div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Number of Beds *</label>
          <input class="form-input" id="inp-room-beds" type="number" min="1" max="20" value="${prop.defaultCapacity || 2}">
        </div>
        <div class="form-group">
          <label class="form-label">Default Bed Price (${cur}/mo)</label>
          <input class="form-input" id="inp-room-price" type="number" value="${prop.defaultBedPrice || 6000}">
        </div>
      </div>

      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Rooms.saveRoom()">🚪 Add Room</button>
      </div>
    `);

    const inp = document.getElementById('inp-room-name');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') Rooms.saveRoom();
      });
    }
  },

  saveRoom() {
    const nameInp = document.getElementById('inp-room-name');
    const name = nameInp ? nameInp.value.trim() : '';
    const floorId = document.getElementById('inp-room-floor') ? document.getElementById('inp-room-floor').value : this.activeFloor;
    const numBeds = parseInt(document.getElementById('inp-room-beds')?.value) || 1;
    const price = parseFloat(document.getElementById('inp-room-price')?.value) || (DB.getProperty().defaultBedPrice || 6000);

    if (!name) return showToast('Please enter a room number or name', 'error');
    if (!floorId) return showToast('Please select a floor', 'error');

    const floors = DB.getFloors();
    const floorObj = floors.find(f => f.id === floorId) || { name: 'this floor' };

    // Duplicate room protection: Prevent duplicate room identifiers on this floor
    const existingRoomsOnFloor = DB.getRoomsByFloor(floorId);
    const isDuplicate = existingRoomsOnFloor.some(r => r.name.trim().toLowerCase() === name.toLowerCase());

    if (isDuplicate) {
      return showToast(`Room "${name}" already exists on ${floorObj.name}.`, 'error');
    }

    const roomId = generateId('r');
    DB.addRoom({ id: roomId, floorId, name, capacity: numBeds });

    // Auto-generate beds: Bed 1, Bed 2, Bed 3...
    for (let i = 1; i <= numBeds; i++) {
      DB.addBed({ id: generateId('b'), roomId, number: `${i}`, price, tenantId: null });
    }

    closeModal();
    this.expandedFloors.add(floorId);
    this._collapsedRooms.delete(roomId);
    this.render();
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ Room ${name} added to ${floorObj.name}!`, 'success');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  showEditRoomModal(roomId) {
    const room = DB.getRooms().find(r => r.id === roomId);
    if (!room) return;
    const floors = DB.getFloors();
    const floorOptions = floors.map(f => `<option value="${f.id}" ${f.id === room.floorId ? 'selected' : ''}>${f.name}</option>`).join('');

    showModal(`✏️ Edit Room ${room.name}`, `
      <div class="form-group">
        <label class="form-label">Room Number / Name *</label>
        <input class="form-input" id="inp-edit-room-name" value="${room.name}" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">Assigned Floor</label>
        <select class="form-select" id="inp-edit-room-floor">${floorOptions}</select>
      </div>
      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Rooms.updateRoom('${roomId}')">💾 Save Changes</button>
      </div>
    `);
  },

  updateRoom(roomId) {
    const name = document.getElementById('inp-edit-room-name').value.trim();
    const floorId = document.getElementById('inp-edit-room-floor').value;
    if (!name) return showToast('Enter a room name', 'error');

    // Duplicate check on target floor
    const existing = DB.getRoomsByFloor(floorId);
    if (existing.some(r => r.id !== roomId && r.name.trim().toLowerCase() === name.toLowerCase())) {
      return showToast(`Room "${name}" already exists on selected floor`, 'error');
    }

    DB.updateRoom(roomId, { name, floorId });
    closeModal();
    this.expandedFloors.add(floorId);
    this.render();
    showToast('✅ Room updated!', 'success');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  deleteRoom(roomId) {
    const room = DB.getRooms().find(r => r.id === roomId);
    if (!room) return;
    const beds = DB.getBedsByRoom(roomId);
    const occupied = beds.filter(b => b.tenantId).length;

    if (occupied > 0) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast(`⚠️ Cannot delete Room "${room.name}". It contains ${occupied} active tenant(s). Vacate tenants first.`, 'error');
    }

    if (!confirm(`Delete Room "${room.name}" and all its beds?`)) return;
    DB.deleteRoom(roomId);
    closeModal();
    this.render();
    showToast(`🗑️ Room "${room.name}" deleted`, 'info');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  // ── BED MANAGEMENT MODALS ──────────────────────────────────
  showAddBedModal(roomId) {
    const room = DB.getRooms().find(r => r.id === roomId);
    const prop = DB.getProperty();
    const beds = DB.getBedsByRoom(roomId);
    const nextNum = beds.length + 1;

    showModal(`➕ Add Bed to Room ${room?.name || ''}`, `
      <div class="form-group">
        <label class="form-label">Room</label>
        <input class="form-input" value="Room ${room?.name}" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Bed Number or Label *</label>
        <input class="form-input" id="inp-bed-num" value="${nextNum}" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">Monthly Rent (${prop.currency || '₹'})</label>
        <input class="form-input" id="inp-bed-price" type="number" value="${prop.defaultBedPrice || 6000}">
      </div>
      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Rooms.saveBed('${roomId}')">➕ Add Bed</button>
      </div>
    `);
  },

  saveBed(roomId) {
    const number = document.getElementById('inp-bed-num').value.trim();
    const price = parseFloat(document.getElementById('inp-bed-price').value) || (DB.getProperty().defaultBedPrice || 6000);
    if (!number) return showToast('Enter bed number', 'error');

    DB.addBed({ id: generateId('b'), roomId, number, price, tenantId: null });
    this._collapsedRooms.delete(roomId);
    closeModal();
    this.render();
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ Bed ${number} added!`, 'success');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  showEditBedModal(bedId) {
    const bed = DB.getBeds().find(b => b.id === bedId);
    if (!bed) return;
    const prop = DB.getProperty();

    showModal(`✏️ Edit Bed ${bed.number}`, `
      <div class="form-group">
        <label class="form-label">Bed Number or Label *</label>
        <input class="form-input" id="inp-eb-num" value="${bed.number}" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">Monthly Rent (${prop.currency || '₹'})</label>
        <input class="form-input" id="inp-eb-price" type="number" value="${bed.price}">
      </div>
      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="Rooms.saveBedEdit('${bedId}')">💾 Save Changes</button>
      </div>
    `);
  },

  saveBedEdit(bedId) {
    const number = document.getElementById('inp-eb-num').value.trim();
    const price = parseFloat(document.getElementById('inp-eb-price').value) || 0;
    if (!number) return showToast('Enter bed number', 'error');
    DB.updateBed(bedId, { number, price });
    closeModal();
    this.render();
    showToast('✅ Bed updated!', 'success');
  },

  deleteBedConfirm(bedId) {
    const bed = DB.getBeds().find(b => b.id === bedId);
    if (!bed) return;
    if (bed.tenantId) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast('⚠️ Cannot delete bed with active tenant. Vacate tenant first.', 'error');
    }
    if (!confirm(`Delete Bed ${bed.number}?`)) return;
    DB.deleteBed(bedId);
    closeModal();
    this.render();
    showToast(`🗑️ Bed ${bed.number} deleted`, 'info');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  // ── BED DETAIL & TENANT ASSIGNMENT (CORE WORKFLOW) ──────────
  openBedModal(bedId) {
    const bed = DB.getBeds().find(b => b.id === bedId);
    if (!bed) return;
    const room = DB.getRooms().find(r => r.id === bed.roomId);
    const floor = room ? DB.getFloors().find(f => f.id === room.floorId) : null;
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';
    const tenant = bed.tenantId ? DB.getTenantById(bed.tenantId) : null;

    if (tenant) {
      // ── OCCUPIED BED MODAL ────────────────────────────────
      const currentMonth = getCurrentMonth();
      const paid = DB.isPaid(tenant.id, currentMonth);
      const verificationBadge = tenant.mobileVerified 
        ? `<span class="badge green" style="display:inline-flex; align-items:center; gap:4px">📱 Mobile Verified</span>`
        : (tenant.aadhaarVerified 
          ? `<span class="badge green" style="display:inline-flex; align-items:center; gap:4px">${tenant.aadhaarMethod === 'DIGILOCKER' ? '🏛️ DigiLocker' : '🛡️ Aadhaar QR'} Verified</span>` 
          : '');

      showModal(`🛏️ Bed ${bed.number} — ${room?.name || 'Room'}`, `
        <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:16px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase">Assigned Accommodation</div>
            <div style="font-size:13px; font-weight:800; color:var(--text-primary)">🏢 ${floor?.name || 'Floor'} → 🚪 Room ${room?.name || 'Room'} → 🛏️ Bed ${bed.number}</div>
          </div>
          <span class="badge red">🔴 Occupied</span>
        </div>

        <div style="text-align:center; margin-bottom:16px">
          <div class="tenant-avatar" style="background:${getAvatarColor(tenant.name)}; width:64px; height:64px; font-size:24px; margin:0 auto 10px; box-shadow:0 4px 12px rgba(0,0,0,0.1)">${getInitials(tenant.name)}</div>
          <div style="font-size:18px; font-weight:800; color:var(--text-primary)">${tenant.name}</div>
          <div class="color-secondary fs-13" style="margin-top:2px">📱 +91 ${tenant.phone}</div>
          <div style="display:flex; justify-content:center; gap:6px; margin-top:8px">
            <span class="badge ${paid ? 'green' : 'red'}">${paid ? '✅ Rent Paid' : '❌ Rent Due'}</span>
            ${verificationBadge}
          </div>
        </div>

        <div class="card" style="margin-bottom:16px; background:var(--bg-input); border:1px solid var(--border); padding:8px 14px">
          <div class="payment-item" style="padding:8px 0; border-bottom:1px dashed var(--border)"><span class="color-secondary">Monthly Rent</span><strong>${formatCurrency(tenant.rent || bed.price, cur)}/mo</strong></div>
          <div class="payment-item" style="padding:8px 0; border-bottom:1px dashed var(--border)"><span class="color-secondary">Security Deposit</span><strong>${formatCurrency(tenant.deposit || 0, cur)}</strong></div>
          <div class="payment-item" style="padding:8px 0; border-bottom:1px dashed var(--border)"><span class="color-secondary">Move-in Date</span><strong>${formatDateDisplay(tenant.moveInDate)}</strong></div>
          <div class="payment-item" style="padding:8px 0; border:none"><span class="color-secondary">ID / Verification</span><strong>${tenant.idProof || 'Verified'}</strong></div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px">
          <button class="btn btn-ghost" onclick="Tenants.showEditModal('${tenant.id}')">✏️ Edit Details</button>
          <button class="btn btn-whatsapp" onclick="WhatsApp._sendOne('${tenant.id}')">📲 WhatsApp</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px">
          <button class="btn btn-outline" onclick="Rooms.showReplaceTenantModal('${bed.id}','${tenant.id}')">🔄 Replace</button>
          <button class="btn btn-danger" onclick="Rooms.vacateBed('${bed.id}','${tenant.id}')">🚪 Vacate Bed</button>
        </div>
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
      `);
    } else {
      // ── VACANT BED MODAL ──────────────────────────────────
      showModal(`🛏️ Bed ${bed.number} — ${room?.name || 'Room'}`, `
        <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:16px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase">Accommodation</div>
            <div style="font-size:13px; font-weight:800; color:var(--text-primary)">🏢 ${floor?.name || 'Floor'} → 🚪 Room ${room?.name || 'Room'} → 🛏️ Bed ${bed.number}</div>
          </div>
          <span class="badge green">🟢 Vacant</span>
        </div>

        <div style="text-align:center; padding:20px 0 16px">
          <div style="width:68px; height:68px; border-radius:50%; background:var(--accent-green-light); color:var(--accent-green); display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 12px; box-shadow:0 4px 16px rgba(16,185,129,0.15)">🛏️</div>
          <div style="font-size:18px; font-weight:800; color:var(--text-primary)">Bed ${bed.number} is Available</div>
          <div class="color-secondary fs-14" style="margin-top:4px">Monthly Rent: <strong style="color:var(--text-primary)">${formatCurrency(bed.price, cur)}/month</strong></div>
        </div>

        <button class="btn btn-primary btn-full btn-lg" onclick="Rooms.showAssignTenantModal('${bed.id}')" style="display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; margin-bottom:10px">
          <span>👤</span> <span>Assign Tenant to Bed ${bed.number}</span>
        </button>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px">
          <button class="btn btn-ghost" onclick="Rooms.showEditBedModal('${bed.id}')">✏️ Edit Bed Price</button>
          <button class="btn btn-danger" onclick="Rooms.deleteBedConfirm('${bed.id}')">🗑️ Delete Bed</button>
        </div>
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
      `);
    }
  },

  // ── ASSIGN TENANT MODAL (INTEGRATED WORKFLOW) ───────────────
  showAssignTenantModal(bedId, initialMode = null) {
    const bed = DB.getBeds().find(b => b.id === bedId);
    if (!bed) return;
    const room = DB.getRooms().find(r => r.id === bed.roomId);
    const floor = room ? DB.getFloors().find(f => f.id === room.floorId) : null;
    const prop = DB.getProperty();
    const cur = prop.currency || '₹';

    const existingTenants = DB.getTenants();
    // Default to 'existing' if existing tenants exist, otherwise 'new'
    const mode = initialMode || (existingTenants.length > 0 ? 'existing' : 'new');

    showModal(`👤 Assign Tenant — Bed ${bed.number}`, `
      <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
        <div>
          <div style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase">Target Accommodation</div>
          <div style="font-size:13px; font-weight:800; color:var(--text-primary)">🏢 ${floor?.name || 'Floor'} → 🚪 Room ${room?.name || 'Room'} → 🛏️ Bed ${bed.number}</div>
        </div>
        <span class="badge blue">${formatCurrency(bed.price, cur)}/mo</span>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="sub-tabs" style="margin-bottom:16px">
        <button class="sub-tab ${mode === 'existing' ? 'active' : ''}" onclick="Rooms.showAssignTenantModal('${bedId}', 'existing')">
          👥 Select Existing (${existingTenants.length})
        </button>
        <button class="sub-tab ${mode === 'new' ? 'active' : ''}" onclick="Rooms.showAssignTenantModal('${bedId}', 'new')">
          ➕ Register New Tenant
        </button>
      </div>

      <div id="assign-tenant-content">
        ${mode === 'existing' ? this.renderExistingTenantSelector(bed, existingTenants, cur) : this.renderNewTenantForm(bed, prop)}
      </div>
    `);

    if (mode === 'new') {
      TenantKYC.reset();
      DocUploadManager.reset();
      DocUploadManager.renderUI();
      const inp = document.getElementById('inp-t-name');
      if (inp) inp.focus();
    }
  },

  renderExistingTenantSelector(bed, existingTenants, cur) {
    if (!existingTenants || existingTenants.length === 0) {
      return `
        <div class="empty-state" style="padding:28px 16px; text-align:center">
          <div class="empty-icon" style="font-size:36px">👥</div>
          <div class="empty-title" style="font-size:15px; font-weight:700">No existing tenants found</div>
          <div class="empty-sub" style="font-size:13px; margin:6px 0 14px">Register a new tenant to assign them to Bed ${bed.number}.</div>
          <button class="btn btn-primary" onclick="Rooms.showAssignTenantModal('${bed.id}', 'new')">➕ Register New Tenant</button>
        </div>
      `;
    }

    // Sort: unassigned tenants first, then by name
    const sorted = [...existingTenants].sort((a, b) => {
      const aAssigned = a.bedId ? 1 : 0;
      const bAssigned = b.bedId ? 1 : 0;
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      return a.name.localeCompare(b.name);
    });

    return `
      <div>
        <div class="search-bar" style="margin-bottom:12px">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search tenant by name or phone..." id="inp-assign-search"
            oninput="Rooms.filterExistingTenants(this.value, '${bed.id}')" autocomplete="off">
        </div>

        <div id="assign-tenants-list" style="max-height:300px; overflow-y:auto; padding-right:2px; display:flex; flex-direction:column; gap:8px">
          ${this.renderTenantListItems(sorted, bed.id, cur)}
        </div>

        <button class="btn btn-ghost btn-full mt-16" onclick="closeModal()">Cancel</button>
      </div>
    `;
  },

  renderTenantListItems(tenants, bedId, cur) {
    if (tenants.length === 0) {
      return `<div class="empty-state" style="padding:20px; font-size:13px; color:var(--text-muted)">No matching tenants found</div>`;
    }

    return tenants.map(t => {
      const isAlreadyInThisBed = t.bedId === bedId;
      const currentBedInfo = t.bedId ? DB.getBedInfo(t.bedId) : null;
      const locationText = currentBedInfo 
        ? `${currentBedInfo.room?.name || 'Room'} · Bed ${currentBedInfo.bed?.number || ''}`
        : 'Unassigned';

      return `
        <div class="tenant-select-row" style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border); gap:10px">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1">
            <div class="tenant-avatar" style="background:${getAvatarColor(t.name)}; width:36px; height:36px; font-size:14px; flex-shrink:0">${getInitials(t.name)}</div>
            <div style="min-width:0; flex:1">
              <div style="font-size:14px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${t.name}</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:1px">📱 +91 ${t.phone} · <span style="color:${t.bedId ? 'var(--text-muted)' : 'var(--accent-green)'}; font-weight:600">${t.bedId ? '📍 ' + locationText : '🟢 Unassigned'}</span></div>
            </div>
          </div>
          <div>
            ${isAlreadyInThisBed ? `
              <span class="badge green">Assigned Here</span>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="Rooms.confirmAssignExistingTenant('${bedId}', '${t.id}')">
                ${t.bedId ? 'Transfer' : 'Assign'}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  filterExistingTenants(q, bedId) {
    const listEl = document.getElementById('assign-tenants-list');
    if (!listEl) return;
    const query = (q || '').trim().toLowerCase();
    const all = DB.getTenants();
    const filtered = all.filter(t => {
      if (!query) return true;
      return t.name.toLowerCase().includes(query) || t.phone.includes(query);
    });
    const prop = DB.getProperty();
    listEl.innerHTML = this.renderTenantListItems(filtered, bedId, prop.currency || '₹');
  },

  confirmAssignExistingTenant(bedId, tenantId) {
    const tenant = DB.getTenantById(tenantId);
    const targetBed = DB.getBeds().find(b => b.id === bedId);
    if (!tenant || !targetBed) return;
    const targetRoom = DB.getRooms().find(r => r.id === targetBed.roomId);

    if (tenant.bedId && tenant.bedId !== bedId) {
      const oldInfo = DB.getBedInfo(tenant.bedId);
      const oldLocation = oldInfo ? `Room ${oldInfo.room?.name || ''} Bed ${oldInfo.bed?.number || ''}` : 'current bed';
      if (!confirm(`Move ${tenant.name} from ${oldLocation} to Room ${targetRoom?.name || ''} Bed ${targetBed.number}?`)) {
        return;
      }
      // Vacate old bed
      DB.updateBed(tenant.bedId, { tenantId: null });
    }

    // Assign to new bed
    DB.updateBed(bedId, { tenantId: tenant.id });
    DB.updateTenant(tenant.id, { 
      bedId: bedId,
      active: true,
      rent: tenant.rent || targetBed.price
    });

    closeModal();
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ ${tenant.name} assigned to Bed ${targetBed.number}!`, 'success');
    this.render();
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  renderNewTenantForm(bed, prop) {
    return `
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input class="form-input" id="inp-t-name" placeholder="Tenant Full Name" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">Country &amp; Mobile Number *</label>
        <div style="display:flex; align-items:center; gap:8px">
          <span style="background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:11px 12px; font-weight:700; font-size:14px; color:var(--text-primary); white-space:nowrap">🇮🇳 +91</span>
          <input class="form-input" id="inp-t-phone" placeholder="10-digit number" type="tel" maxlength="10" style="flex:1">
        </div>
      </div>

      <!-- Mobile OTP Verification Section -->
      <div class="card" style="margin-bottom:16px; background:var(--bg-input); border:1.5px solid var(--border); padding:14px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
          <label class="form-label" style="margin-bottom:0">📱 WhatsApp Mobile Verification *</label>
          <span id="aadhaar-status-badge" class="badge amber" style="font-size:11px">⚠️ Verification Required</span>
        </div>

        <div class="color-secondary fs-12 mb-8" id="aadhaar-help-text">
          Country code is preset to <strong>+91 (India only)</strong>. Verification code will be sent to the tenant via WhatsApp.
        </div>

        <div id="kyc-buttons-row">
          <button type="button" class="btn btn-whatsapp btn-full" id="btn-kyc-mobile" onclick="Rooms.triggerMobileVerify('assign')" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:12px">
            <span>📲</span> <span>Send Verification Code on WhatsApp</span>
          </button>
        </div>

        <!-- Inline OTP Entry -->
        <div id="inline-otp-container" style="display:none; margin-top:14px; padding-top:14px; border-top:1px dashed var(--border)">
          <div style="text-align:center; margin-bottom:10px">
            <span class="badge green" style="font-size:11px" id="otp-sent-banner">✅ Code sent via WhatsApp to +91 <span id="target-phone-display"></span></span>
            <div class="color-secondary fs-12 mt-4" id="otp-timer-display">Resend available in: <strong id="otp-countdown">60</strong>s</div>
          </div>

          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label" style="text-align:center">Enter 6-Digit WhatsApp Code *</label>
            <input class="form-input" id="inp-otp-code" placeholder="• • • • • •" maxlength="6" type="text" style="text-align:center; font-size:22px; font-weight:700; letter-spacing:8px; padding:10px">
          </div>

          <div style="display:flex; gap:8px">
            <button type="button" class="btn btn-ghost" id="btn-resend-inline-otp" onclick="Rooms.triggerMobileVerify('assign')" style="display:none; flex:1">🔁 Resend Code</button>
            <button type="button" class="btn btn-success" id="btn-confirm-inline-otp" onclick="Rooms.verifyInlineOtp('assign')" style="flex:2">✅ Verify &amp; Unlock Registration</button>
          </div>
        </div>
      </div>

      <!-- Document Upload -->
      <div id="doc-upload-container"></div>

      <div class="form-row mt-8">
        <div class="form-group">
          <label class="form-label">Rent (${prop.currency || '₹'}/mo) *</label>
          <input class="form-input" id="inp-t-rent" type="number" value="${bed?.price || prop.defaultBedPrice || 6000}">
        </div>
        <div class="form-group">
          <label class="form-label">Security Deposit</label>
          <input class="form-input" id="inp-t-deposit" type="number" value="${(bed?.price || prop.defaultBedPrice || 6000) * 2}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Move-in Date</label>
        <input class="form-input" id="inp-t-movein" type="date" value="${formatDate(new Date())}">
      </div>

      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" id="btn-assign-tenant-submit" onclick="Rooms.assignTenant('${bed.id}')" disabled style="opacity:0.55; cursor:not-allowed">
          🔒 Verify Mobile to Assign
        </button>
      </div>
    `;
  },

  // ── MOBILE KYC VERIFICATION HELPERS ────────────────────────
  triggerMobileVerify(context = 'assign') {
    const phoneInput = document.getElementById(context === 'replace' ? 'inp-rt-phone' : 'inp-t-phone');
    const rawPhone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';

    if (!rawPhone || rawPhone.length !== 10) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast('📱 Please enter a valid 10-digit mobile number', 'error');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    MobileVerification._currentOTP = otp;
    MobileVerification._currentPhone = rawPhone;

    const message = `🏠 Rentora - Tenant Verification\n\nYour verification code is: ${otp}\n\nPlease share this code with your PG owner to complete registration.`;
    const whatsappUrl = `https://wa.me/91${rawPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    const inlineContainer = document.getElementById('inline-otp-container');
    const targetDisplay = document.getElementById('target-phone-display');
    const sendBtn = document.getElementById('btn-kyc-mobile');
    const otpInput = document.getElementById('inp-otp-code');
    const countdownEl = document.getElementById('otp-countdown');
    const timerDisplay = document.getElementById('otp-timer-display');
    const resendBtn = document.getElementById('btn-resend-inline-otp');

    if (targetDisplay) targetDisplay.textContent = rawPhone;
    if (inlineContainer) inlineContainer.style.display = 'block';
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
      sendBtn.innerHTML = `<span>⏳</span> <span>Code Sent via WhatsApp (+91 ${rawPhone})</span>`;
    }
    if (phoneInput) phoneInput.disabled = true;

    if (MobileVerification._timerInterval) clearInterval(MobileVerification._timerInterval);
    let secondsLeft = 60;
    if (countdownEl) countdownEl.textContent = secondsLeft;
    if (timerDisplay) timerDisplay.style.display = 'block';
    if (resendBtn) resendBtn.style.display = 'none';

    MobileVerification._timerInterval = setInterval(() => {
      secondsLeft--;
      if (countdownEl) countdownEl.textContent = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(MobileVerification._timerInterval);
        if (timerDisplay) timerDisplay.style.display = 'none';
        if (resendBtn) resendBtn.style.display = 'block';
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.style.opacity = '1';
        }
        if (phoneInput) phoneInput.disabled = false;
      }
    }, 1000);

    if (otpInput) {
      otpInput.value = '';
      setTimeout(() => otpInput.focus(), 300);
    }

    if (typeof SoundFX !== 'undefined' && SoundFX.toast) SoundFX.toast('info');
    showToast(`📲 Verification code sent to +91 ${rawPhone} on WhatsApp!`, 'success');
  },

  verifyInlineOtp(context = 'assign') {
    const otpInput = document.getElementById('inp-otp-code');
    const enteredOtp = otpInput ? otpInput.value.trim() : '';
    const phoneInput = document.getElementById(context === 'replace' ? 'inp-rt-phone' : 'inp-t-phone');
    const rawPhone = MobileVerification._currentPhone || (phoneInput ? phoneInput.value.replace(/\D/g, '') : '');

    if (!MobileVerification._currentOTP) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast('Please click "Send Verification Code on WhatsApp" first', 'error');
    }

    if (!enteredOtp || enteredOtp.length !== 6) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast('Please enter the full 6-digit verification code', 'error');
    }

    if (enteredOtp !== MobileVerification._currentOTP) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
      }
      return showToast('❌ Invalid code! Please check WhatsApp and try again.', 'error');
    }

    if (MobileVerification._timerInterval) clearInterval(MobileVerification._timerInterval);

    const kycData = {
      method: 'MOBILE_OTP',
      phone: `91${rawPhone}`,
      maskedPhone: `XXXXXX${rawPhone.slice(-4)}`,
      verified: true,
      verifiedAt: new Date().toISOString()
    };

    TenantKYC.setData(kycData);

    const badge = document.getElementById('aadhaar-status-badge');
    if (badge) {
      badge.className = 'badge green';
      badge.innerHTML = `✅ Mobile Verified (+91 ${rawPhone})`;
    }

    const helpText = document.getElementById('aadhaar-help-text');
    if (helpText) {
      helpText.className = 'color-green fs-12 mb-8';
      helpText.innerHTML = `✅ Tenant mobile number +91 ${rawPhone} successfully verified via WhatsApp!`;
    }

    const inlineContainer = document.getElementById('inline-otp-container');
    if (inlineContainer) {
      inlineContainer.innerHTML = `
        <div style="background:var(--accent-green-light); border:1px solid rgba(34,197,94,0.3); border-radius:var(--radius-md); padding:10px; text-align:center; color:var(--accent-green-dark); font-weight:700; font-size:13px">
          🎉 WhatsApp Mobile Verification Complete! You can now register this tenant.
        </div>
      `;
    }

    const sendBtn = document.getElementById('btn-kyc-mobile');
    if (sendBtn) {
      sendBtn.className = 'btn btn-success btn-full';
      sendBtn.innerHTML = `<span>✅</span> <span>Mobile Verified ✓</span>`;
      sendBtn.disabled = true;
    }

    const assignBtn = document.getElementById('btn-assign-tenant-submit');
    if (assignBtn) {
      assignBtn.disabled = false;
      assignBtn.style.opacity = '1';
      assignBtn.style.cursor = 'pointer';
      assignBtn.className = 'btn btn-success btn-full';
      assignBtn.textContent = context === 'replace' ? '✅ Register & Replace Tenant' : '✅ Register Tenant';
    }

    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast('✅ Mobile number verified! Registration is now unlocked.', 'success');
  },

  async assignTenant(bedId) {
    const targetBed = DB.getBeds().find(b => b.id === bedId);
    if (!targetBed) return showToast('Bed not found', 'error');

    const name = document.getElementById('inp-t-name').value.trim();
    const phone = document.getElementById('inp-t-phone').value.trim();
    const rent = parseFloat(document.getElementById('inp-t-rent').value) || targetBed.price || 0;
    const deposit = parseFloat(document.getElementById('inp-t-deposit').value) || 0;
    const moveInDate = document.getElementById('inp-t-movein').value;

    if (!name) return showToast('Enter tenant name', 'error');
    if (!phone || phone.length < 10) return showToast('Enter valid phone number', 'error');

    // Strict Verification Gate (Mobile OTP)
    if (!TenantKYC.isVerified()) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast('⚠️ Please verify tenant mobile number via WhatsApp OTP first', 'error');
    }

    const kyc = TenantKYC.getData();

    // Save images to IndexedDB if uploaded
    let docIds = [];
    if (typeof DocUploadManager !== 'undefined' && (DocUploadManager.currentDocs.front || DocUploadManager.currentDocs.back)) {
      const savedDocs = await DocUploadManager.saveAllToDB();
      docIds = savedDocs.map(d => d.id);
    }

    const tenant = { 
      id: generateId('t'),
      bedId,
      name,
      phone, 
      idProof: `Mobile: +91 ${phone} (WhatsApp OTP Verified ✅)`,
      mobileVerified: true,
      mobileVerifiedPhone: kyc.phone,
      mobileVerifiedAt: kyc.verifiedAt,
      docs: docIds, 
      rent,
      deposit,
      moveInDate,
      active: true 
    };

    DB.addTenant(tenant);
    closeModal();
    this.render();
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ ${name} verified & assigned to Bed ${targetBed.number}!`, 'success');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  // ── REPLACE TENANT WITH MOBILE OTP VERIFICATION ──────────────
  showReplaceTenantModal(bedId, oldTenantId) {
    const prop = DB.getProperty();
    const bed = DB.getBeds().find(b => b.id === bedId);
    TenantKYC.reset();

    showModal('🔄 Replace Tenant', `
      <div class="alert-item warning mb-12">⚠️ <span>Old tenant will be marked as moved out. History is preserved.</span></div>
      <div class="form-group">
        <label class="form-label">New Tenant Name *</label>
        <input class="form-input" id="inp-rt-name" placeholder="Full Name">
      </div>
      <div class="form-group">
        <label class="form-label">Country &amp; Mobile Number *</label>
        <div style="display:flex; align-items:center; gap:8px">
          <span style="background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:11px 12px; font-weight:700; font-size:14px; color:var(--text-primary); white-space:nowrap">🇮🇳 +91</span>
          <input class="form-input" id="inp-rt-phone" placeholder="10-digit number" type="tel" maxlength="10" style="flex:1">
        </div>
      </div>

      <!-- Mobile OTP Verification Section -->
      <div class="card" style="margin-bottom:16px; background:var(--bg-input); border:1.5px solid var(--border); padding:14px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
          <label class="form-label" style="margin-bottom:0">📱 WhatsApp Mobile Verification *</label>
          <span id="aadhaar-status-badge" class="badge amber" style="font-size:11px">⚠️ Verification Required</span>
        </div>

        <div class="color-secondary fs-12 mb-8" id="aadhaar-help-text">
          Country code is preset to <strong>+91 (India only)</strong>. Verification code will be sent to the tenant via WhatsApp.
        </div>

        <div id="kyc-buttons-row">
          <button type="button" class="btn btn-whatsapp btn-full" id="btn-kyc-mobile" onclick="Rooms.triggerMobileVerify('replace')" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:12px">
            <span>📲</span> <span>Send Verification Code on WhatsApp</span>
          </button>
        </div>

        <!-- Inline OTP Entry (shown after code sent) -->
        <div id="inline-otp-container" style="display:none; margin-top:14px; padding-top:14px; border-top:1px dashed var(--border)">
          <div style="text-align:center; margin-bottom:10px">
            <span class="badge green" style="font-size:11px" id="otp-sent-banner">✅ Code sent via WhatsApp to +91 <span id="target-phone-display"></span></span>
            <div class="color-secondary fs-12 mt-4" id="otp-timer-display">Resend available in: <strong id="otp-countdown">60</strong>s</div>
          </div>

          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label" style="text-align:center">Enter 6-Digit WhatsApp Code *</label>
            <input class="form-input" id="inp-otp-code" placeholder="• • • • • •" maxlength="6" type="text" style="text-align:center; font-size:22px; font-weight:700; letter-spacing:8px; padding:10px">
          </div>

          <div style="display:flex; gap:8px">
            <button type="button" class="btn btn-ghost" id="btn-resend-inline-otp" onclick="Rooms.triggerMobileVerify('replace')" style="display:none; flex:1">🔁 Resend Code</button>
            <button type="button" class="btn btn-success" id="btn-confirm-inline-otp" onclick="Rooms.verifyInlineOtp('replace')" style="flex:2">✅ Verify &amp; Unlock Registration</button>
          </div>
        </div>
      </div>

      <div id="doc-upload-container"></div>
      
      <div class="form-row mt-8">
        <div class="form-group">
          <label class="form-label">Rent (${prop.currency || '₹'}/mo)</label>
          <input class="form-input" id="inp-rt-rent" type="number" value="${bed?.price || prop.defaultBedPrice || 6000}">
        </div>
        <div class="form-group">
          <label class="form-label">Deposit</label>
          <input class="form-input" id="inp-rt-deposit" type="number" value="${(bed?.price || prop.defaultBedPrice || 6000) * 2}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Move-in Date</label>
        <input class="form-input" id="inp-rt-movein" type="date" value="${formatDate(new Date())}">
      </div>
      <div class="form-actions mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" id="btn-assign-tenant-submit" onclick="Rooms.replaceTenant('${oldTenantId}')" disabled style="opacity:0.55; cursor:not-allowed">
          🔒 Verify Mobile to Replace
        </button>
      </div>
    `);

    document.getElementById('inp-rt-name').focus();
    DocUploadManager.reset();
    DocUploadManager.renderUI();
  },

  async replaceTenant(oldId) {
    const name = document.getElementById('inp-rt-name').value.trim();
    const phone = document.getElementById('inp-rt-phone').value.trim();
    const rent = parseFloat(document.getElementById('inp-rt-rent').value) || 0;
    const deposit = parseFloat(document.getElementById('inp-rt-deposit').value) || 0;
    const moveInDate = document.getElementById('inp-rt-movein').value;

    if (!name || !phone) return showToast('Fill required fields', 'error');

    // Strict Verification Gate (Mobile OTP)
    if (!TenantKYC.isVerified()) {
      if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
      return showToast('⚠️ Please verify tenant mobile number via WhatsApp OTP first', 'error');
    }

    const kyc = TenantKYC.getData();

    // Save images to IndexedDB if uploaded
    let docIds = [];
    if (typeof DocUploadManager !== 'undefined' && (DocUploadManager.currentDocs.front || DocUploadManager.currentDocs.back)) {
      const savedDocs = await DocUploadManager.saveAllToDB();
      docIds = savedDocs.map(d => d.id);
    }

    const newTenant = { 
      id: generateId('t'),
      bedId: '',
      name,
      phone, 
      idProof: `Mobile: +91 ${phone} (WhatsApp OTP Verified ✅)`,
      mobileVerified: true,
      mobileVerifiedPhone: kyc.phone,
      mobileVerifiedAt: kyc.verifiedAt,
      docs: docIds, 
      rent,
      deposit,
      moveInDate,
      active: true 
    };

    DB.replaceTenant(oldId, newTenant);
    closeModal();
    this.render();
    if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
    showToast(`✅ Tenant replaced with verified mobile OTP!`, 'success');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },

  vacateBed(bedId, tenantId) {
    const tenant = DB.getTenantById(tenantId);
    if (!confirm(`Mark ${tenant?.name || 'tenant'} as moved out and vacate this bed?`)) return;
    DB.deleteTenant(tenantId);
    closeModal();
    this.render();
    showToast('🚪 Bed vacated', 'info');
    if (typeof Dashboard !== 'undefined' && App.currentTab === 'dashboard') Dashboard.render();
  },
};
