// ============================================================
// RENTORA — SMART PG & HOSTEL MANAGEMENT — MAP VIEW TAB
// ============================================================

const MapView = {
  render() {
    const floors = DB.getFloors();

    if (floors.length === 0) {
      document.getElementById('tab-map').innerHTML = `
        <div class="scroll-area">
          <div class="empty-state" style="padding:60px 24px">
            <div class="empty-icon">🗺️</div>
            <div class="empty-title">No Floors Yet</div>
            <div class="empty-sub">Add floors and rooms to see the visual map.</div>
            <button class="btn btn-primary mt-16" onclick="App.navigate('settings')">⚙️ Go to Settings</button>
          </div>
        </div>`;
      return;
    }

    const prop = DB.getProperty();
    const cur = prop.currency;

    const beds = DB.getBeds();
    const occupied = beds.filter(b => b.tenantId).length;
    const vacant = beds.length - occupied;

    const floorMaps = floors.map(f => this.renderFloor(f, cur)).join('');

    document.getElementById('tab-map').innerHTML = `
      <div class="scroll-area">
        <!-- Legend -->
        <div class="card" style="padding:12px 16px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div style="display:flex;gap:16px">
              <span style="display:flex;align-items:center;gap:6px;font-size:13px">
                <span style="width:14px;height:14px;border-radius:4px;background:var(--accent-green);display:inline-block"></span> Vacant (${vacant})
              </span>
              <span style="display:flex;align-items:center;gap:6px;font-size:13px">
                <span style="width:14px;height:14px;border-radius:4px;background:var(--accent-red);display:inline-block"></span> Occupied (${occupied})
              </span>
            </div>
            <span class="badge blue">Total: ${beds.length} beds</span>
          </div>
        </div>

        <!-- Floor Maps -->
        ${floorMaps}
      </div>
    `;
  },

  renderFloor(floor, cur) {
    const rooms = DB.getRoomsByFloor(floor.id);
    const fs = DB.getFloorStats(floor.id);

    const roomGrids = rooms.map(r => this.renderRoom(r, cur)).join('') ||
      `<div class="empty-state" style="padding:20px;grid-column:1/-1">
        <div class="empty-icon" style="font-size:32px">🚪</div>
        <div class="empty-title" style="font-size:14px">No rooms</div>
      </div>`;

    return `
      <div class="map-floor">
        <div class="map-floor-header" onclick="this.parentElement.querySelector('.map-rooms').classList.toggle('hidden')">
          <div>
            <div class="map-floor-name">🏢 ${floor.name}</div>
            <div class="map-floor-stats">${fs.rooms} rooms · ${fs.total} beds · ${fs.occupied} occupied · ${fs.vacant} vacant</div>
          </div>
          <div style="display:flex;gap:8px">
            <span class="badge green" style="font-size:11px">🟢 ${fs.vacant}</span>
            <span class="badge red" style="font-size:11px">🔴 ${fs.occupied}</span>
          </div>
        </div>
        <div class="map-rooms">${roomGrids}</div>
      </div>`;
  },

  renderRoom(room, cur) {
    const beds = DB.getBedsByRoom(room.id);
    const occupied = beds.filter(b => b.tenantId).length;
    const vacant = beds.length - occupied;

    const bedTiles = beds.map(b => {
      const tenant = b.tenantId ? DB.getTenantById(b.tenantId) : null;
      const title = tenant ? `${tenant.name} · ${b.number}` : `Bed ${b.number} (Vacant)`;
      return `<div class="map-bed ${tenant ? 'occupied' : 'vacant'}"
        onclick="MapView.openBedDetail('${b.id}')"
        title="${title}">${b.number}</div>`;
    }).join('');

    return `
      <div class="map-room" onclick="MapView.openRoomDetail('${room.id}')">
        <div class="map-room-name">${room.name}
          <span class="color-secondary" style="font-size:10px;font-weight:400"> · ${vacant}V/${occupied}O</span>
        </div>
        <div class="map-beds">${bedTiles}</div>
      </div>`;
  },

  openRoomDetail(roomId) {
    const room = DB.getRooms().find(r => r.id === roomId);
    if (!room) return;
    const beds = DB.getBedsByRoom(roomId);
    const prop = DB.getProperty();
    const cur = prop.currency;
    const floor = DB.getFloors().find(f => f.id === room.floorId);
    const currentMonth = getCurrentMonth();

    const bedList = beds.map(b => {
      const tenant = b.tenantId ? DB.getTenantById(b.tenantId) : null;
      const paid = tenant ? DB.isPaid(tenant.id, currentMonth) : false;
      return `
        <div class="payment-item" style="cursor:pointer" onclick="MapView.openBedDetail('${b.id}')">
          <div class="map-bed ${tenant ? 'occupied' : 'vacant'}" style="width:36px;height:36px;border-radius:10px;font-size:13px;flex-shrink:0">${b.number}</div>
          <div style="flex:1">
            <div class="payment-name">${tenant ? tenant.name : 'Vacant'}</div>
            <div class="payment-meta">${tenant ? `📱 ${tenant.phone}` : `Price: ${formatCurrency(b.price, cur)}/mo`}</div>
          </div>
          ${tenant ? `<span class="badge ${paid ? 'green' : 'red'}">${paid ? '✅' : '❌'}</span>` : ''}
        </div>`;
    }).join('');

    const occupied = beds.filter(b => b.tenantId).length;

    showModal(`🚪 ${room.name}`, `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <span class="badge blue">🏢 ${floor?.name || ''}</span>
        <span class="badge green">🟢 ${beds.length - occupied} Vacant</span>
        <span class="badge red">🔴 ${occupied} Occupied</span>
        <span class="badge gray">📦 ${beds.length} Total</span>
      </div>
      <div class="card-title mb-8">Beds</div>
      ${bedList || '<div class="color-muted fs-13">No beds in this room</div>'}
      <div class="flex gap-8 mt-16">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
        <button class="btn btn-primary btn-full" onclick="Rooms.showAddBedModal('${roomId}');closeModal()">➕ Add Bed</button>
      </div>
    `);
  },

  openBedDetail(bedId) {
    Rooms.openBedModal(bedId);
  },
};
