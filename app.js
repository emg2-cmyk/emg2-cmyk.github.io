/* ================================================================
   HANGOUT HQ — app.js
   Main application logic: Firebase sync, RSVP, Rides, Map
   ================================================================ */

// ─────────────────────────────────────────────
// Firebase config — auto-configured for hangout-hq
// ─────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3_DQxg91x9qEt2x0VOoCSfNeUzCSEskM",
  authDomain: "hangout-hq.firebaseapp.com",
  databaseURL: "https://hangout-hq-default-rtdb.firebaseio.com",
  projectId: "hangout-hq",
  storageBucket: "hangout-hq.firebasestorage.app",
  messagingSenderId: "795264488712",
  appId: "1:795264488712:web:58e85797a58b0c3194c8bd"
};
// ─────────────────────────────────────────────

'use strict';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const STATE = {
  user: null,          // { id, name }
  db: null,            // Firebase db ref
  demoMode: false,     // local-only fallback
  demoData: {          // in-memory store for demo mode
    users: {},
    events: {},
    rsvps: {},
    rides: {}
  },
  currentView: 'events',
  currentEventId: null,
  profileMapPicker: null,
  profilePickerMarker: null,
  leafletMap: null,
  leafletMarkers: [],
  listeners: [],       // Firebase listeners to detach on cleanup
  pendingRequestCount: 0,
};

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso) {
  if (!iso) return '';
  // datetime-local gives "YYYY-MM-DDTHH:MM" — parse parts manually to avoid UTC shift
  const [datePart, timePart] = iso.split('T');
  if (!datePart) return '';
  const [year, month, day] = datePart.split('-').map(Number);
  let d;
  if (timePart) {
    const [hour, minute] = timePart.split(':').map(Number);
    d = new Date(year, month - 1, day, hour, minute);
  } else {
    d = new Date(year, month - 1, day);
  }
  if (isNaN(d)) return iso; // fallback to raw string
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function showToast(msg, type = 'info') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  t.innerHTML = `<span>${icons[type] || ''}</span> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(60px)';
    t.style.transition = '0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ─────────────────────────────────────────────
// FIREBASE / DEMO DATA ABSTRACTION
// ─────────────────────────────────────────────

// Read once
function dbGet(path) {
  if (STATE.demoMode) {
    const parts = path.split('/').filter(Boolean);
    let cur = STATE.demoData;
    for (const p of parts) cur = cur?.[p];
    return Promise.resolve(cur ?? null);
  }
  return STATE.db.ref(path).get().then(snap => snap.val());
}

// Set value
function dbSet(path, value) {
  if (STATE.demoMode) {
    const parts = path.split('/').filter(Boolean);
    let cur = STATE.demoData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    broadcastDemoChange(path);
    return Promise.resolve();
  }
  return STATE.db.ref(path).set(value);
}

// Update (merge)
function dbUpdate(path, updates) {
  if (STATE.demoMode) {
    const parts = path.split('/').filter(Boolean);
    let cur = STATE.demoData;
    for (let i = 0; i < parts.length; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      if (i < parts.length - 1) cur = cur[parts[i]];
      else Object.assign(cur[parts[i]], updates);
    }
    if (parts.length === 0) Object.assign(STATE.demoData, updates);
    broadcastDemoChange(path);
    return Promise.resolve();
  }
  return STATE.db.ref(path).update(updates);
}

// Remove key
function dbRemove(path) {
  if (STATE.demoMode) {
    const parts = path.split('/').filter(Boolean);
    let cur = STATE.demoData;
    for (let i = 0; i < parts.length - 1; i++) cur = cur?.[parts[i]];
    if (cur) delete cur[parts[parts.length - 1]];
    broadcastDemoChange(path);
    return Promise.resolve();
  }
  return STATE.db.ref(path).remove();
}

// Listen (real-time)
function dbListen(path, cb) {
  if (STATE.demoMode) {
    // Demo: call cb once with current value; changes are driven by broadcastDemoChange
    const data = dbGetSync(path);
    cb(data);
    const key = `listener:${path}:${uid()}`;
    STATE.listeners.push({ key, path, cb, isDemo: true });
    return key;
  }
  const ref = STATE.db.ref(path);
  const handler = snap => cb(snap.val());
  ref.on('value', handler);
  STATE.listeners.push({ ref, handler });
}

function dbGetSync(path) {
  const parts = path.split('/').filter(Boolean);
  let cur = STATE.demoData;
  for (const p of parts) cur = cur?.[p];
  return cur ?? null;
}

// In demo mode: after any write, re-fire all matching listeners
function broadcastDemoChange(changedPath) {
  for (const l of STATE.listeners) {
    if (l.isDemo) {
      // fire listener if path overlaps
      if (changedPath.startsWith(l.path) || l.path.startsWith(changedPath.split('/').slice(0, 2).join('/'))) {
        l.cb(dbGetSync(l.path));
      }
    }
  }
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check saved user
  const savedUser = JSON.parse(localStorage.getItem('hq_user') || 'null');
  const savedFirebaseConfig = localStorage.getItem('hq_firebase_config');

  if (savedUser) {
    STATE.user = savedUser;
    // Setup firebase or demo
    if (savedFirebaseConfig) {
      initFirebase(JSON.parse(savedFirebaseConfig));
    } else {
      // Check if we have a baked-in config
      if (typeof FIREBASE_CONFIG !== 'undefined') {
        initFirebase(FIREBASE_CONFIG);
      } else {
        showFirebaseConfigOverlay(savedUser);
        return;
      }
    }
  } else {
    showNicknameOverlay();
  }

  bindNavigation();
  bindEventHandlers();
  bindProfileHandlers();
  bindNotifHandlers();
});

function showNicknameOverlay() {
  document.getElementById('nickname-overlay').classList.remove('hidden');
  document.getElementById('firebase-config-overlay').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');

  document.getElementById('join-btn').onclick = () => {
    const name = document.getElementById('nickname-input').value.trim();
    if (!name) { showToast('Please enter a nickname!', 'warning'); return; }
    const user = { id: uid(), name };
    localStorage.setItem('hq_user', JSON.stringify(user));
    STATE.user = user;
    document.getElementById('nickname-overlay').classList.add('hidden');

    const savedConfig = localStorage.getItem('hq_firebase_config');
    if (savedConfig) {
      initFirebase(JSON.parse(savedConfig));
    } else if (typeof FIREBASE_CONFIG !== 'undefined') {
      initFirebase(FIREBASE_CONFIG);
    } else {
      showFirebaseConfigOverlay(user);
    }
  };

  document.getElementById('nickname-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('join-btn').click();
  });
}

function showFirebaseConfigOverlay(user) {
  document.getElementById('nickname-overlay').classList.add('hidden');
  document.getElementById('firebase-config-overlay').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');

  document.getElementById('firebase-save-btn').onclick = () => {
    const raw = document.getElementById('firebase-config-input').value.trim();
    try {
      const cfg = JSON.parse(raw);
      localStorage.setItem('hq_firebase_config', JSON.stringify(cfg));
      document.getElementById('firebase-config-overlay').classList.add('hidden');
      initFirebase(cfg);
    } catch (e) {
      showToast('Invalid JSON — check your config format.', 'error');
    }
  };

  document.getElementById('firebase-demo-btn').onclick = () => {
    document.getElementById('firebase-config-overlay').classList.add('hidden');
    initDemoMode();
  };
}

function initFirebase(config) {
  try {
    // Avoid re-initializing if already done
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    STATE.db = firebase.database();
    STATE.demoMode = false;
    onAppReady();
  } catch (e) {
    console.error('Firebase init failed:', e);
    showToast('Firebase connection failed. Switching to demo mode.', 'warning');
    initDemoMode();
  }
}

function initDemoMode() {
  STATE.demoMode = true;
  STATE.db = null;
  showToast('Running in demo mode — data only saved locally.', 'info');
  onAppReady();
}

function onAppReady() {
  document.getElementById('app').classList.remove('hidden');

  // Update nav user chip
  const u = STATE.user;
  document.getElementById('user-name-nav').textContent = u.name;
  document.getElementById('user-avatar-nav').textContent = initials(u.name);
  document.getElementById('user-avatar-nav').title = u.name;

  // Save/update user profile in db
  dbGet(`users/${u.id}`).then(existing => {
    const profile = { name: u.name, ...(existing || {}) };
    dbSet(`users/${u.id}`, profile);
  });

  // Load initial view
  navigateTo('events');

  // Start listening for incoming ride requests to this user (as a driver)
  startRideRequestListener();
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
function bindNavigation() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });
}

function navigateTo(view) {
  STATE.currentView = view;

  // Top nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

  // Views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });

  const views = {
    events: 'view-events',
    rides: 'view-rides',
    map: 'view-map',
    profile: 'view-profile',
    detail: 'view-event-detail',
  };

  const el = document.getElementById(views[view]);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
  }

  if (view === 'events') loadEvents();
  if (view === 'rides') loadRides();
  if (view === 'map') loadMap();
  if (view === 'profile') loadProfile();
}

// ─────────────────────────────────────────────
// EVENTS VIEW
// ─────────────────────────────────────────────
function bindEventHandlers() {
  document.getElementById('create-event-btn').onclick = () => {
    const form = document.getElementById('create-event-form');
    form.classList.toggle('hidden');
  };

  document.getElementById('cancel-event-btn').onclick = () => {
    document.getElementById('create-event-form').classList.add('hidden');
  };

  document.getElementById('submit-event-btn').onclick = createEvent;
  document.getElementById('back-to-events').onclick = () => navigateTo('events');
}

function loadEvents() {
  const list = document.getElementById('events-list');
  list.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Loading events…</p></div>';

  dbGet('events').then(eventsObj => {
    renderEventsList(eventsObj);
  });

  // Real-time listener
  dbListen('events', eventsObj => {
    if (STATE.currentView === 'events') renderEventsList(eventsObj);
    updateRideEventSelector(eventsObj);
    updateMapEventSelector(eventsObj);
  });
}

function renderEventsList(eventsObj) {
  const list = document.getElementById('events-list');
  if (!eventsObj) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">📅</span><p>No events yet. Create the first hangout!</p></div>`;
    return;
  }

  const events = Object.entries(eventsObj).sort((a, b) => new Date(a[1].date) - new Date(b[1].date));

  list.innerHTML = '';
  events.forEach(([id, ev]) => {
    const card = createEventCard(id, ev);
    list.appendChild(card);
  });
}

function createEventCard(id, ev) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.id = `event-card-${id}`;

  card.innerHTML = `
    <div class="event-card-header">
      <div class="event-card-title">${escHtml(ev.title)}</div>
      <div class="event-card-date">
        <span class="date-badge">${formatDate(ev.date)}</span>
      </div>
    </div>
    <div class="event-card-dest">📍 ${escHtml(ev.destination || 'Location TBD')}</div>
    <div class="event-card-stats" id="event-stats-${id}">
      <span class="stat-pill">⏳ Loading…</span>
    </div>
    <div class="rsvp-bar" id="rsvp-bar-${id}"></div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.rsvp-btn')) return;
    openEventDetail(id, ev);
  });

  loadEventCardStats(id);
  renderRsvpBar(id);
  return card;
}

function loadEventCardStats(eventId) {
  dbGet(`rsvps/${eventId}`).then(rsvpData => {
    const statsEl = document.getElementById(`event-stats-${eventId}`);
    if (!statsEl) return;
    const counts = countRsvps(rsvpData);
    statsEl.innerHTML = `
      <span class="stat-pill">✅ ${counts.yes} going</span>
      <span class="stat-pill">🤔 ${counts.maybe} maybe</span>
      <span class="stat-pill">❌ ${counts.no} can't make it</span>
    `;
  });
}

function countRsvps(rsvpData) {
  const counts = { yes: 0, maybe: 0, no: 0 };
  if (!rsvpData) return counts;
  Object.values(rsvpData).forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
  return counts;
}

function renderRsvpBar(eventId) {
  const bar = document.getElementById(`rsvp-bar-${eventId}`);
  if (!bar) return;

  dbGet(`rsvps/${eventId}/${STATE.user.id}`).then(myRsvp => {
    const status = myRsvp?.status || null;
    bar.innerHTML = `
      <button class="btn rsvp-btn yes ${status === 'yes' ? 'active' : ''}" data-event="${eventId}" data-status="yes">✅ Going</button>
      <button class="btn rsvp-btn maybe ${status === 'maybe' ? 'active' : ''}" data-event="${eventId}" data-status="maybe">🤔 Maybe</button>
      <button class="btn rsvp-btn no ${status === 'no' ? 'active' : ''}" data-event="${eventId}" data-status="no">❌ Can't</button>
    `;
    bar.querySelectorAll('.rsvp-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        submitRsvp(btn.dataset.event, btn.dataset.status);
      };
    });
  });
}

function submitRsvp(eventId, status) {
  const userId = STATE.user.id;
  dbSet(`rsvps/${eventId}/${userId}`, { status, name: STATE.user.name, updatedAt: Date.now() })
    .then(() => {
      showToast(`RSVP updated: ${status === 'yes' ? 'Going! 🎉' : status === 'maybe' ? 'Maybe 🤔' : 'Can\'t make it ❌'}`, 'success');
      renderRsvpBar(eventId);
      loadEventCardStats(eventId);
    });
}

function createEvent() {
  const title = document.getElementById('event-title').value.trim();
  const date = document.getElementById('event-date').value;
  const destination = document.getElementById('event-destination').value.trim();
  const destLat = parseFloat(document.getElementById('event-dest-lat').value);
  const destLng = parseFloat(document.getElementById('event-dest-lng').value);

  if (!title || !date) { showToast('Please fill in the event name and date.', 'warning'); return; }

  const eventId = uid();
  const ev = {
    id: eventId,
    title,
    date,
    destination: destination || 'TBD',
    createdBy: STATE.user.id,
    createdByName: STATE.user.name,
    createdAt: Date.now(),
  };
  if (!isNaN(destLat) && !isNaN(destLng)) {
    ev.destLat = destLat;
    ev.destLng = destLng;
  }

  dbSet(`events/${eventId}`, ev).then(() => {
    showToast('Event created! 🎉', 'success');
    document.getElementById('create-event-form').classList.add('hidden');
    document.getElementById('event-title').value = '';
    document.getElementById('event-date').value = '';
    document.getElementById('event-destination').value = '';
    document.getElementById('event-dest-lat').value = '';
    document.getElementById('event-dest-lng').value = '';
    loadEvents();
  });
}

// ─────────────────────────────────────────────
// EVENT DETAIL VIEW
// ─────────────────────────────────────────────
function openEventDetail(eventId, ev) {
  STATE.currentEventId = eventId;
  navigateTo('detail');

  const content = document.getElementById('event-detail-content');
  content.innerHTML = `<div class="empty-state"><span class="empty-icon">⏳</span><p>Loading…</p></div>`;

  Promise.all([
    dbGet(`rsvps/${eventId}`),
    dbGet(`rides/${eventId}`),
    dbGet('users'),
  ]).then(([rsvps, rides, users]) => {
    renderEventDetail(eventId, ev, rsvps || {}, rides || {}, users || {});
  });
}

function renderEventDetail(eventId, ev, rsvps, rides, users) {
  const content = document.getElementById('event-detail-content');
  const counts = countRsvps(rsvps);
  const myRsvp = rsvps[STATE.user.id]?.status || null;

  // Build attendee lists
  const going = Object.entries(rsvps).filter(([, r]) => r.status === 'yes');
  const maybe = Object.entries(rsvps).filter(([, r]) => r.status === 'maybe');
  const notGoing = Object.entries(rsvps).filter(([, r]) => r.status === 'no');

  const myRide = rides[STATE.user.id];
  const amDriver = !!myRide;

  // Find which car I'm in (as passenger)
  let myDriverId = null;
  Object.entries(rides).forEach(([driverId, ride]) => {
    if (ride.passengers && ride.passengers[STATE.user.id]) myDriverId = driverId;
  });
  const amPassenger = !!myDriverId;

  content.innerHTML = `
    <div class="event-detail-title">${escHtml(ev.title)}</div>
    <div class="event-detail-meta">📅 ${formatDate(ev.date)} &nbsp;·&nbsp; 📍 ${escHtml(ev.destination || 'TBD')} &nbsp;·&nbsp; Created by ${escHtml(ev.createdByName || 'someone')}</div>

    <!-- RSVP -->
    <div class="detail-section">
      <div class="detail-section-title">Your RSVP</div>
      <div class="rsvp-bar" id="detail-rsvp-bar">
        <button class="btn rsvp-btn yes ${myRsvp === 'yes' ? 'active' : ''}" data-event="${eventId}" data-status="yes">✅ Going</button>
        <button class="btn rsvp-btn maybe ${myRsvp === 'maybe' ? 'active' : ''}" data-event="${eventId}" data-status="maybe">🤔 Maybe</button>
        <button class="btn rsvp-btn no ${myRsvp === 'no' ? 'active' : ''}" data-event="${eventId}" data-status="no">❌ Can't</button>
      </div>
    </div>

    <!-- Attendees -->
    <div class="detail-section">
      <div class="detail-section-title">✅ Going (${counts.yes})</div>
      <div class="attendee-grid" id="detail-going-grid">${renderAttendeeChips(going, users)}</div>
    </div>
    ${maybe.length ? `<div class="detail-section">
      <div class="detail-section-title">🤔 Maybe (${counts.maybe})</div>
      <div class="attendee-grid">${renderAttendeeChips(maybe, users)}</div>
    </div>` : ''}
    ${notGoing.length ? `<div class="detail-section">
      <div class="detail-section-title">❌ Can't Make It (${counts.no})</div>
      <div class="attendee-grid">${renderAttendeeChips(notGoing, users)}</div>
    </div>` : ''}

    <!-- Rides Section -->
    <div class="detail-section">
      <div class="detail-section-title">🚗 Rides</div>
      <div id="detail-ride-section"></div>
    </div>
  `;

  // RSVP handlers
  content.querySelectorAll('.rsvp-btn').forEach(btn => {
    btn.onclick = () => {
      submitRsvp(btn.dataset.event, btn.dataset.status);
      // Refresh detail
      setTimeout(() => openEventDetail(eventId, ev), 500);
    };
  });

  // Render rides section
  renderDetailRideSection(eventId, rides, users, amDriver, amPassenger, myDriverId);
}

function renderAttendeeChips(list, users) {
  if (!list.length) return '<p class="muted">No one yet.</p>';
  return list.map(([uid, r]) => {
    const name = r.name || users[uid]?.name || uid;
    return `<div class="attendee-chip"><span class="attendee-status">${r.status === 'yes' ? '✅' : r.status === 'maybe' ? '🤔' : '❌'}</span><span>${escHtml(name)}</span></div>`;
  }).join('');
}

function renderDetailRideSection(eventId, rides, users, amDriver, amPassenger, myDriverId) {
  const section = document.getElementById('detail-ride-section');
  if (!section) return;

  let html = '';

  // My ride controls
  if (!amPassenger) {
    const myRide = rides[STATE.user.id];
    if (!amDriver) {
      html += `
        <div class="your-ride-section card" style="margin-bottom:20px">
          <strong style="display:block;margin-bottom:12px;font-size:0.9rem;">Are you driving?</strong>
          <div class="offer-ride-form">
            <div class="form-group">
              <label for="detail-seats">Open Seats in your car</label>
              <input type="number" id="detail-seats" min="1" max="8" value="3" style="width:100px" />
            </div>
            <button class="btn btn-success" id="detail-offer-ride-btn">🚗 I'm Driving!</button>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="your-ride-section card" style="margin-bottom:20px">
          <strong style="display:block;margin-bottom:8px;font-size:0.9rem;">You're driving! 🚗</strong>
          <p class="muted" style="margin-bottom:12px;">${myRide.seats} seat(s) offered</p>
          <button class="btn btn-danger small" id="detail-stop-driving-btn">Stop Driving</button>
        </div>
      `;
    }
  } else {
    const driver = users[myDriverId];
    html += `
      <div class="your-ride-section card" style="margin-bottom:20px;border-color:rgba(52,211,153,0.3)">
        <strong style="display:block;margin-bottom:8px;font-size:0.9rem;">🎉 You have a ride!</strong>
        <p class="muted">You're riding with <strong>${escHtml(driver?.name || myDriverId)}</strong></p>
      </div>
    `;
  }

  // Drivers list
  const driverEntries = Object.entries(rides);
  if (driverEntries.length === 0) {
    html += '<p class="muted">No drivers yet for this event.</p>';
  } else {
    html += '<div style="display:grid;gap:12px;">';
    driverEntries.forEach(([driverId, ride]) => {
      const driverName = users[driverId]?.name || ride.driverName || driverId;
      const passengers = ride.passengers || {};
      const pending = ride.pendingRequests || {};
      const filledSeats = Object.keys(passengers).length;
      const openSeats = Math.max(0, (ride.seats || 1) - filledSeats);
      const isMe = driverId === STATE.user.id;
      const myRequestPending = pending[STATE.user.id];
      const imPassengerHere = passengers[STATE.user.id];

      // Seat indicators
      let seatsHtml = '';
      for (let i = 0; i < (ride.seats || 1); i++) {
        const passengerIds = Object.keys(passengers);
        if (i < passengerIds.length) {
          const pName = users[passengerIds[i]]?.name || passengerIds[i];
          seatsHtml += `<div class="seat filled" title="${escHtml(pName)}">🙋</div>`;
        } else {
          // Check if there's a pending request filling this visual slot
          const pendingIds = Object.keys(pending);
          const pendingIdx = i - passengerIds.length;
          if (pendingIdx >= 0 && pendingIdx < pendingIds.length) {
            const pName = users[pendingIds[pendingIdx]]?.name || pendingIds[pendingIdx];
            seatsHtml += `<div class="seat pending" title="${escHtml(pName)} (pending)">⏳</div>`;
          } else {
            seatsHtml += `<div class="seat open">🪑</div>`;
          }
        }
      }

      // Passengers list
      let passengerListHtml = '';
      Object.entries(passengers).forEach(([pid, pInfo]) => {
        const pName = users[pid]?.name || pInfo.name || pid;
        passengerListHtml += `<div class="passenger-item"><span>🙋 ${escHtml(pName)}</span><span class="passenger-status confirmed">Confirmed</span></div>`;
      });

      // Pending requests (only visible to driver)
      if (isMe) {
        Object.entries(pending).forEach(([pid, pInfo]) => {
          const pName = users[pid]?.name || pInfo.name || pid;
          passengerListHtml += `
            <div class="passenger-item">
              <span>⏳ ${escHtml(pName)} <em style="color:var(--text-muted);font-size:0.78rem;">(wants a ride)</em></span>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-success small" data-pid="${pid}" data-pname="${escHtml(pName)}" data-eid="${eventId}" onclick="acceptRideRequest('${eventId}','${driverId}','${pid}')">Accept</button>
                <button class="btn btn-danger small" onclick="declineRideRequest('${eventId}','${driverId}','${pid}')">Decline</button>
              </div>
            </div>`;
        });
      }

      let actionBtn = '';
      if (!isMe && !amPassenger && !amDriver) {
        if (imPassengerHere) {
          actionBtn = `<button class="btn btn-ghost small" onclick="leaveRide('${eventId}','${driverId}')">Leave Car</button>`;
        } else if (myRequestPending) {
          actionBtn = `<button class="btn btn-amber small" disabled>⏳ Requested</button>`;
        } else if (openSeats > 0) {
          actionBtn = `<button class="btn btn-violet small" onclick="requestRide('${eventId}','${driverId}')">🙋 Request Ride</button>`;
        } else {
          actionBtn = `<span class="muted small">Car full</span>`;
        }
      }

      html += `
        <div class="driver-card ${isMe ? 'border-accent' : ''}">
          <div class="driver-card-header">
            <div class="driver-avatar">${initials(driverName)}</div>
            <div class="driver-info">
              <div class="driver-name">${escHtml(driverName)}${isMe ? ' <span style="color:var(--accent-teal);font-size:0.75rem;">(You)</span>' : ''}</div>
              <div class="driver-seats">${openSeats} of ${ride.seats} seat${ride.seats !== 1 ? 's' : ''} open</div>
            </div>
            ${actionBtn}
          </div>
          <div class="seat-indicators">${seatsHtml}</div>
          ${passengerListHtml ? `<div class="passengers-list">${passengerListHtml}</div>` : ''}
          ${isMe ? `<button class="btn btn-danger small" style="margin-top:8px" id="detail-stop-driving-btn-2">Stop Driving</button>` : ''}
        </div>
      `;
    });
    html += '</div>';
  }

  section.innerHTML = html;

  // Bind offer ride
  const offerBtn = document.getElementById('detail-offer-ride-btn');
  if (offerBtn) {
    offerBtn.onclick = () => {
      const seats = parseInt(document.getElementById('detail-seats').value) || 3;
      offerRide(eventId, seats);
    };
  }

  // Bind stop driving
  ['detail-stop-driving-btn', 'detail-stop-driving-btn-2'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = () => stopDriving(eventId);
  });
}

// ─────────────────────────────────────────────
// RIDES
// ─────────────────────────────────────────────
function offerRide(eventId, seats) {
  const ride = {
    driverName: STATE.user.name,
    driverId: STATE.user.id,
    seats,
    passengers: {},
    pendingRequests: {},
    createdAt: Date.now(),
  };
  dbSet(`rides/${eventId}/${STATE.user.id}`, ride).then(() => {
    showToast('You\'re driving! 🚗', 'success');
    dbGet(`events/${eventId}`).then(ev => openEventDetail(eventId, ev));
  });
}

function stopDriving(eventId) {
  dbRemove(`rides/${eventId}/${STATE.user.id}`).then(() => {
    showToast('Removed from driver list.', 'info');
    dbGet(`events/${eventId}`).then(ev => openEventDetail(eventId, ev));
  });
}

function requestRide(eventId, driverId) {
  const userId = STATE.user.id;
  dbSet(`rides/${eventId}/${driverId}/pendingRequests/${userId}`, {
    name: STATE.user.name,
    requestedAt: Date.now()
  }).then(() => {
    showToast('Ride requested! Waiting for driver to accept. 🙋', 'info');
    dbGet(`events/${eventId}`).then(ev => openEventDetail(eventId, ev));
  });
}

function acceptRideRequest(eventId, driverId, passengerId) {
  Promise.all([
    dbGet(`rides/${eventId}/${driverId}/pendingRequests/${passengerId}`),
    dbGet(`users/${passengerId}`),
  ]).then(([pendingInfo, userInfo]) => {
    const name = userInfo?.name || pendingInfo?.name || passengerId;
    return Promise.all([
      dbSet(`rides/${eventId}/${driverId}/passengers/${passengerId}`, { name, confirmedAt: Date.now() }),
      dbRemove(`rides/${eventId}/${driverId}/pendingRequests/${passengerId}`),
    ]);
  }).then(() => {
    showToast('Passenger accepted! 🎉', 'success');
    updateNotifBadge();
    dbGet(`events/${eventId}`).then(ev => openEventDetail(eventId, ev));
  });
}

function declineRideRequest(eventId, driverId, passengerId) {
  dbRemove(`rides/${eventId}/${driverId}/pendingRequests/${passengerId}`).then(() => {
    showToast('Request declined.', 'info');
    updateNotifBadge();
    dbGet(`events/${eventId}`).then(ev => openEventDetail(eventId, ev));
  });
}

function leaveRide(eventId, driverId) {
  dbRemove(`rides/${eventId}/${driverId}/passengers/${STATE.user.id}`).then(() => {
    showToast('Left the car. 👋', 'info');
    dbGet(`events/${eventId}`).then(ev => openEventDetail(eventId, ev));
  });
}

// ─────────────────────────────────────────────
// RIDES VIEW
// ─────────────────────────────────────────────
function loadRides() {
  dbGet('events').then(eventsObj => {
    updateRideEventSelector(eventsObj);
  });

  document.getElementById('rides-event-select').onchange = function () {
    const eventId = this.value;
    if (!eventId) {
      document.getElementById('rides-content').innerHTML = `<div class="empty-state"><span class="empty-icon">🚗</span><p>Select an event to see the ride board.</p></div>`;
      return;
    }
    renderRideBoard(eventId);
  };
}

function updateRideEventSelector(eventsObj) {
  const sel = document.getElementById('rides-event-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">— Pick an event —</option>';
  if (eventsObj) {
    Object.entries(eventsObj).forEach(([id, ev]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${ev.title} — ${formatDate(ev.date)}`;
      if (id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }
}

function renderRideBoard(eventId) {
  const content = document.getElementById('rides-content');
  content.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Loading rides…</p></div>';

  Promise.all([dbGet(`rides/${eventId}`), dbGet('users'), dbGet(`rsvps/${eventId}`)]).then(([rides, users, rsvps]) => {
    rides = rides || {};
    users = users || {};
    rsvps = rsvps || {};

    // Who said yes but has no ride arrangement
    const passengerIds = new Set();
    Object.values(rides).forEach(r => {
      Object.keys(r.passengers || {}).forEach(id => passengerIds.add(id));
      Object.keys(r.pendingRequests || {}).forEach(id => passengerIds.add(id));
    });
    const driverIds = new Set(Object.keys(rides));

    const needsRide = Object.entries(rsvps)
      .filter(([id, r]) => r.status === 'yes' && !driverIds.has(id) && !passengerIds.has(id));

    let html = '<div class="rides-board">';

    // ── Drivers column ──
    html += '<div>';
    html += '<div class="rides-column-title">🚗 Drivers</div>';
    if (Object.keys(rides).length === 0) {
      html += '<p class="muted">No drivers yet.</p>';
    } else {
      Object.entries(rides).forEach(([driverId, ride]) => {
        const name = users[driverId]?.name || ride.driverName || driverId;
        const passengers = ride.passengers || {};
        const pending = ride.pendingRequests || {};
        const filledSeats = Object.keys(passengers).length;
        const openSeats = Math.max(0, (ride.seats || 1) - filledSeats);
        const isMe = driverId === STATE.user.id;
        const myRequestPending = !!pending[STATE.user.id];
        const imPassenger = !!passengers[STATE.user.id];

        let actionBtn = '';
        if (!isMe) {
          if (imPassenger) {
            actionBtn = `<button class="btn btn-ghost small" onclick="leaveRide('${eventId}','${driverId}')">Leave Car</button>`;
          } else if (myRequestPending) {
            actionBtn = `<button class="btn btn-amber small" disabled>⏳ Requested</button>`;
          } else if (openSeats > 0) {
            actionBtn = `<button class="btn btn-violet small" onclick="requestRide('${eventId}','${driverId}')">🙋 Request Ride</button>`;
          } else {
            actionBtn = `<span class="muted small">Full</span>`;
          }
        }

        html += `
          <div class="driver-card">
            <div class="driver-card-header">
              <div class="driver-avatar">${initials(name)}</div>
              <div class="driver-info">
                <div class="driver-name">${escHtml(name)}${isMe ? ' (You)' : ''}</div>
                <div class="driver-seats">${openSeats}/${ride.seats} seats open</div>
              </div>
              ${actionBtn}
            </div>
            ${Object.entries(passengers).map(([pid, p]) => `<div class="passenger-item"><span>🙋 ${escHtml(users[pid]?.name || p.name || pid)}</span><span class="passenger-status confirmed">In</span></div>`).join('')}
            ${Object.entries(pending).map(([pid, p]) => `<div class="passenger-item"><span>⏳ ${escHtml(users[pid]?.name || p.name || pid)}</span><span class="passenger-status pending">Pending</span></div>`).join('')}
          </div>
        `;
      });
    }
    html += '</div>';

    // ── Needs Ride column ──
    html += '<div>';
    html += '<div class="rides-column-title">🙋 Needs a Ride</div>';
    if (needsRide.length === 0) {
      html += '<p class="muted">Everyone\'s sorted! 🎉</p>';
    } else {
      needsRide.forEach(([id, r]) => {
        const name = r.name || users[id]?.name || id;
        const isMe = id === STATE.user.id;
        html += `
          <div class="needs-ride-card">
            <div class="needs-ride-name">
              <div class="driver-avatar" style="width:30px;height:30px;font-size:0.75rem;">${initials(name)}</div>
              ${escHtml(name)}${isMe ? ' (You)' : ''}
            </div>
          </div>
        `;
      });
    }

    // My driving controls
    if (!driverIds.has(STATE.user.id)) {
      html += `
        <div class="card" style="margin-top:20px">
          <p style="font-weight:700;margin-bottom:12px;font-size:0.9rem;">Offer to drive?</p>
          <div class="offer-ride-form">
            <div class="form-group">
              <label for="board-seats">Seats</label>
              <input type="number" id="board-seats" min="1" max="8" value="3" style="width:90px" />
            </div>
            <button class="btn btn-success" id="board-offer-btn">🚗 I'm Driving!</button>
          </div>
        </div>
      `;
    }
    html += '</div>';
    html += '</div>'; // end .rides-board

    content.innerHTML = html;

    const boardOfferBtn = document.getElementById('board-offer-btn');
    if (boardOfferBtn) {
      boardOfferBtn.onclick = () => {
        const seats = parseInt(document.getElementById('board-seats').value) || 3;
        offerRide(eventId, seats).then(() => renderRideBoard(eventId));
      };
    }
  });
}

// ─────────────────────────────────────────────
// NOTIFICATION BELL (ride requests for driver)
// ─────────────────────────────────────────────
function bindNotifHandlers() {
  document.getElementById('notif-bell').onclick = openNotifModal;
  document.getElementById('notif-modal-close').onclick = closeNotifModal;
  document.getElementById('notif-modal-backdrop').onclick = closeNotifModal;
}

function startRideRequestListener() {
  // Listen to all events' rides for pending requests directed at ME (as driver)
  dbListen('events', async (eventsObj) => {
    if (!eventsObj) return;
    let totalPending = 0;

    for (const eventId of Object.keys(eventsObj)) {
      const myRide = await dbGet(`rides/${eventId}/${STATE.user.id}`);
      if (myRide?.pendingRequests) {
        totalPending += Object.keys(myRide.pendingRequests).length;
      }
    }

    STATE.pendingRequestCount = totalPending;
    updateNotifBadge();
  });
}

function updateNotifBadge() {
  // Recalculate from DB
  dbGet('events').then(async (eventsObj) => {
    if (!eventsObj) { setNotifCount(0); return; }
    let total = 0;
    for (const eventId of Object.keys(eventsObj)) {
      const myRide = await dbGet(`rides/${eventId}/${STATE.user.id}`);
      if (myRide?.pendingRequests) total += Object.keys(myRide.pendingRequests).length;
    }
    setNotifCount(total);
  });
}

function setNotifCount(n) {
  STATE.pendingRequestCount = n;
  const bell = document.getElementById('notif-bell');
  const badge = document.getElementById('notif-badge');
  badge.textContent = n;
  if (n > 0) bell.classList.remove('hidden');
  else bell.classList.add('hidden');
}

function openNotifModal() {
  const modal = document.getElementById('notif-modal');
  const modalContent = document.getElementById('notif-modal-content');
  modal.classList.remove('hidden');
  modalContent.innerHTML = '<p class="muted">Loading requests…</p>';

  dbGet('events').then(async eventsObj => {
    if (!eventsObj) { modalContent.innerHTML = '<p class="muted">No events found.</p>'; return; }

    let html = '';
    for (const [eventId, ev] of Object.entries(eventsObj)) {
      const myRide = await dbGet(`rides/${eventId}/${STATE.user.id}`);
      if (myRide?.pendingRequests) {
        const pending = myRide.pendingRequests;
        for (const [pid, pInfo] of Object.entries(pending)) {
          const pName = pInfo.name || pid;
          html += `
            <div class="ride-request-item">
              <div>
                <strong>${escHtml(pName)}</strong>
                <div class="muted" style="font-size:0.78rem;">${escHtml(ev.title)} · ${formatDate(ev.date)}</div>
              </div>
              <div class="request-actions">
                <button class="btn btn-success small" onclick="acceptRideRequest('${eventId}','${STATE.user.id}','${pid}');closeNotifModal()">Accept</button>
                <button class="btn btn-danger small" onclick="declineRideRequest('${eventId}','${STATE.user.id}','${pid}');closeNotifModal()">Decline</button>
              </div>
            </div>
          `;
        }
      }
    }

    modalContent.innerHTML = html || '<p class="muted" style="text-align:center;padding:20px;">No pending ride requests! 🎉</p>';
  });
}

function closeNotifModal() {
  document.getElementById('notif-modal').classList.add('hidden');
}

// ─────────────────────────────────────────────
// MAP VIEW
// ─────────────────────────────────────────────
function loadMap() {
  if (!STATE.leafletMap) {
    initLeafletMap();
  }

  const eventId = document.getElementById('map-event-select').value;
  refreshMapPins(eventId || null);

  document.getElementById('map-event-select').onchange = function () {
    refreshMapPins(this.value || null);
  };
}

function initLeafletMap() {
  STATE.leafletMap = L.map('leaflet-map', { zoomControl: true }).setView([39.5, -98.35], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(STATE.leafletMap);
}

function refreshMapPins(eventId) {
  if (!STATE.leafletMap) return;

  // Clear existing markers
  STATE.leafletMarkers.forEach(m => STATE.leafletMap.removeLayer(m));
  STATE.leafletMarkers = [];

  Promise.all([
    dbGet('users'),
    dbGet(`rsvps/${eventId}`),
    dbGet(`rides/${eventId}`),
    dbGet(`events/${eventId}`),
  ]).then(([users, rsvps, rides, ev]) => {
    users = users || {};
    rsvps = rsvps || {};
    rides = rides || {};

    const driverIds = new Set(Object.keys(rides));
    const passengerIds = new Set();
    Object.values(rides).forEach(r => Object.keys(r.passengers || {}).forEach(id => passengerIds.add(id)));

    // Add destination pin
    if (ev?.destLat && ev?.destLng) {
      addPin(ev.destLat, ev.destLng, '📍', `<strong>${escHtml(ev.title)}</strong><br/>${escHtml(ev.destination || 'Destination')}`);
    }

    // Add user pins
    Object.entries(users).forEach(([userId, user]) => {
      if (!user.lat || !user.lng) return;

      const rsvp = rsvps[userId]?.status;
      // Only show people who are going (or all if no event filter)
      if (eventId && rsvp !== 'yes' && rsvp !== 'maybe') return;

      let icon = '📍';
      if (driverIds.has(userId)) icon = '🚗';
      else if (passengerIds.has(userId)) icon = '✅';
      else if (rsvp === 'yes') icon = '🙋';

      const isMe = userId === STATE.user.id;
      const label = `<strong>${escHtml(user.name)}${isMe ? ' (You)' : ''}</strong>
        ${rsvp ? `<br/><span style="color:var(--text-muted)">${rsvp === 'yes' ? '✅ Going' : '🤔 Maybe'}</span>` : ''}
        ${driverIds.has(userId) ? '<br/><span style="color:#2dd4bf">🚗 Driving</span>' : ''}
        ${passengerIds.has(userId) ? '<br/><span style="color:#34d399">🎉 Has a ride</span>' : ''}`;

      addPin(user.lat, user.lng, icon, label);
    });

    // Fit bounds if we have markers
    if (STATE.leafletMarkers.length > 0) {
      const group = L.featureGroup(STATE.leafletMarkers);
      STATE.leafletMap.fitBounds(group.getBounds().pad(0.2));
    }
  });
}

function addPin(lat, lng, emojiIcon, popupContent) {
  const icon = L.divIcon({
    html: `<div style="font-size:1.8rem;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${emojiIcon}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: '',
  });

  const marker = L.marker([lat, lng], { icon }).addTo(STATE.leafletMap);
  marker.bindPopup(popupContent);
  STATE.leafletMarkers.push(marker);
}

function updateMapEventSelector(eventsObj) {
  const sel = document.getElementById('map-event-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">All Members</option>';
  if (eventsObj) {
    Object.entries(eventsObj).forEach(([id, ev]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${ev.title} — ${formatDate(ev.date)}`;
      if (id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }
}

// ─────────────────────────────────────────────
// PROFILE VIEW
// ─────────────────────────────────────────────
function loadProfile() {
  const u = STATE.user;
  document.getElementById('profile-nickname').value = u.name;
  document.getElementById('profile-name-display').textContent = u.name;
  document.getElementById('profile-avatar-display').textContent = initials(u.name);

  dbGet(`users/${u.id}`).then(profile => {
    if (profile?.address) document.getElementById('profile-address').value = profile.address;
    if (profile?.lat && profile?.lng) {
      document.getElementById('profile-coords-display').textContent = `📍 ${profile.lat.toFixed(5)}, ${profile.lng.toFixed(5)}`;
      initProfileMap(profile.lat, profile.lng);
    } else {
      initProfileMap(39.5, -98.35);
    }
  });
}

function initProfileMap(lat, lng) {
  if (STATE.profileMapPicker) {
    STATE.profileMapPicker.remove();
    STATE.profileMapPicker = null;
    STATE.profilePickerMarker = null;
  }

  STATE.profileMapPicker = L.map('profile-map-picker', { zoomControl: true }).setView([lat, lng], lat === 39.5 ? 4 : 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18,
  }).addTo(STATE.profileMapPicker);

  // If we have a location, drop a pin
  if (lat !== 39.5) {
    const icon = L.divIcon({ html: '📍', iconSize: [28,28], iconAnchor: [14,28], className: '' });
    STATE.profilePickerMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(STATE.profileMapPicker);
    STATE.profilePickerMarker.on('dragend', updatePickerCoords);
  }

  STATE.profileMapPicker.on('click', (e) => {
    const { lat, lng } = e.latlng;
    if (STATE.profilePickerMarker) {
      STATE.profilePickerMarker.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({ html: '📍', iconSize: [28,28], iconAnchor: [14,28], className: '' });
      STATE.profilePickerMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(STATE.profileMapPicker);
      STATE.profilePickerMarker.on('dragend', updatePickerCoords);
    }
    updatePickerCoords();
  });
}

function updatePickerCoords() {
  if (!STATE.profilePickerMarker) return;
  const { lat, lng } = STATE.profilePickerMarker.getLatLng();
  document.getElementById('profile-coords-display').textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  STATE._pickedLat = lat;
  STATE._pickedLng = lng;
}

function bindProfileHandlers() {
  document.getElementById('profile-save-btn').onclick = saveProfile;

  document.getElementById('profile-geolocate-btn').onclick = () => {
    if (!navigator.geolocation) { showToast('Geolocation not available.', 'error'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      STATE._pickedLat = latitude;
      STATE._pickedLng = longitude;
      document.getElementById('profile-coords-display').textContent = `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      if (STATE.profileMapPicker) {
        STATE.profileMapPicker.setView([latitude, longitude], 13);
        if (STATE.profilePickerMarker) {
          STATE.profilePickerMarker.setLatLng([latitude, longitude]);
        } else {
          const icon = L.divIcon({ html: '📍', iconSize: [28,28], iconAnchor: [14,28], className: '' });
          STATE.profilePickerMarker = L.marker([latitude, longitude], { icon, draggable: true }).addTo(STATE.profileMapPicker);
          STATE.profilePickerMarker.on('dragend', updatePickerCoords);
        }
      }
      showToast('Location set! 📍', 'success');
    }, () => showToast('Could not get your location.', 'error'));
  };

  document.getElementById('profile-clear-btn').onclick = () => {
    if (confirm('Clear all your data and start over?')) {
      localStorage.removeItem('hq_user');
      localStorage.removeItem('hq_firebase_config');
      location.reload();
    }
  };

  document.getElementById('user-chip').onclick = () => navigateTo('profile');
}

function saveProfile() {
  const name = document.getElementById('profile-nickname').value.trim();
  if (!name) { showToast('Nickname can\'t be empty.', 'warning'); return; }

  const address = document.getElementById('profile-address').value.trim();
  const lat = STATE._pickedLat || null;
  const lng = STATE._pickedLng || null;

  const profile = { name, address, updatedAt: Date.now() };
  if (lat && lng) { profile.lat = lat; profile.lng = lng; }

  // Update local state
  STATE.user.name = name;
  localStorage.setItem('hq_user', JSON.stringify(STATE.user));

  // Save to DB
  dbSet(`users/${STATE.user.id}`, profile).then(() => {
    showToast('Profile saved! ✅', 'success');
    document.getElementById('user-name-nav').textContent = name;
    document.getElementById('user-avatar-nav').textContent = initials(name);
    document.getElementById('profile-name-display').textContent = name;
    document.getElementById('profile-avatar-display').textContent = initials(name);
  });
}

// ─────────────────────────────────────────────
// XSS SAFETY
// ─────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────
// EXPOSE GLOBAL FUNCTIONS (used in onclick attrs)
// ─────────────────────────────────────────────
window.requestRide = requestRide;
window.acceptRideRequest = acceptRideRequest;
window.declineRideRequest = declineRideRequest;
window.leaveRide = leaveRide;
window.closeNotifModal = closeNotifModal;
window.openNotifModal = openNotifModal;
