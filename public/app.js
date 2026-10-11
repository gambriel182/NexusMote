const WS_URL = `ws://${location.host}/ws`;
const API_BASE = '/api';

let ws = null;
let clientId = null;
let authenticated = false;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;
let touchStart = { x: 0, y: 0 };
let lastTouchTime = 0;
let isDragging = false;
let touchpadRect = null;

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const deckGrid = document.getElementById('deckGrid');
const actionModal = document.getElementById('actionModal');
const actionForm = document.getElementById('actionForm');
const modalClose = document.getElementById('modalClose');
const cancelBtn = document.getElementById('cancelBtn');
const actionType = document.getElementById('actionType');
const actionParams = document.getElementById('actionParams');
const toast = document.getElementById('toast');
const touchpad = document.getElementById('touchpad');
const mouseBtns = document.querySelectorAll('.mouse-btn');
const arrowBtns = document.querySelectorAll('.arrow-btn');
const keyboardToggle = document.getElementById('keyboardToggle');
const keyboardModal = document.getElementById('keyboardModal');
const keyboardClose = document.getElementById('keyboardClose');
const keyboardKeys = document.querySelectorAll('.key');

const metrics = {
  cpuUsage: document.getElementById('cpuUsage'),
  cpuBar: document.getElementById('cpuBar'),
  ramUsage: document.getElementById('ramUsage'),
  ramBar: document.getElementById('ramBar'),
  gpuUsage: document.getElementById('gpuUsage'),
  gpuBar: document.getElementById('gpuBar'),
  netUsage: document.getElementById('netUsage'),
  netBar: document.getElementById('netBar'),
  uptime: document.getElementById('uptime'),
  cpuCores: document.getElementById('cpuCores'),
  memTotal: document.getElementById('memTotal'),
  memUsed: document.getElementById('memUsed'),
  memAvailable: document.getElementById('memAvailable'),
  gpuDetail: document.getElementById('gpuDetail'),
  gpuName: document.getElementById('gpuName'),
  gpuMem: document.getElementById('gpuMem'),
  gpuTemp: document.getElementById('gpuTemp'),
};

let storedActions = JSON.parse(localStorage.getItem('nexusmote_actions') || '[]');
let sensitivity = 1.5;

function connect() {
  ws = new WebSocket(WS_URL);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    console.log('WebSocket connected');
    setStatus('connecting', 'Authenticating...');
    ws.send(JSON.stringify({ type: 'auth', deviceId: getDeviceId(), token: '' }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    } catch (e) {
      console.error('Parse error:', e);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket closed');
    setStatus('disconnected', 'Disconnected');
    authenticated = false;
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    showToast('Connection error');
  };
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    showToast('Max reconnect attempts reached');
    return;
  }
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
  reconnectAttempts++;
  setTimeout(connect, delay);
}

function getDeviceId() {
  let id = localStorage.getItem('nexusmote_device_id');
  if (!id) {
    id = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('nexusmote_device_id', id);
  }
  return id;
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'welcome':
      clientId = msg.clientId;
      break;
    case 'auth_success':
      authenticated = true;
      reconnectAttempts = 0;
      setStatus('connected', 'Connected');
      showToast('Connected to NexusMote');
      loadActions();
      break;
    case 'auth_failed':
      showToast('Authentication failed: ' + msg.message);
      break;
    case 'metrics':
      updateMetrics(msg.data);
      break;
    case 'action_result':
      showToast(`${msg.action}: ${msg.result?.output || 'OK'}`);
      break;
    case 'action_error':
      showToast(`Error: ${msg.error}`);
      break;
    case 'input_result':
      break;
    case 'input_error':
      showToast(`Input error: ${msg.error}`);
      break;
    case 'pong':
      break;
  }
}

function send(type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

function setStatus(state, text) {
  statusText.textContent = text;
  statusDot.className = 'status-dot ' + state;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function updateMetrics(data) {
  if (!data || data.error) return;

  if (data.cpu) {
    metrics.cpuUsage.textContent = data.cpu.usage + '%';
    metrics.cpuBar.style.width = data.cpu.usage + '%';
  }
  if (data.memory) {
    metrics.ramUsage.textContent = data.memory.usage + '%';
    metrics.ramBar.style.width = data.memory.usage + '%';
    metrics.memTotal.textContent = formatBytes(data.memory.total);
    metrics.memUsed.textContent = formatBytes(data.memory.used);
    metrics.memAvailable.textContent = formatBytes(data.memory.available);
  }
  if (data.gpu) {
    metrics.gpuUsage.textContent = data.gpu.utilization + '%';
    metrics.gpuBar.style.width = data.gpu.utilization + '%';
    metrics.gpuDetail.style.display = 'grid';
    metrics.gpuName.textContent = data.gpu.name;
    metrics.gpuMem.textContent = formatBytes(data.gpu.memoryUsed) + ' / ' + formatBytes(data.gpu.memoryTotal);
    metrics.gpuTemp.textContent = data.gpu.temperature + '°C';
  } else {
    metrics.gpuUsage.textContent = 'N/A';
    metrics.gpuBar.style.width = '0%';
    metrics.gpuDetail.style.display = 'none';
  }
  if (data.network) {
    const totalRx = data.network.interfaces.reduce((a, i) => a + i.rxBytes, 0);
    const totalTx = data.network.interfaces.reduce((a, i) => a + i.txBytes, 0);
    metrics.netUsage.textContent = `↓${formatBytes(totalRx)} ↑${formatBytes(totalTx)}`;
    const maxSpeed = 125000000;
    const usage = Math.min(100, ((totalRx + totalTx) / maxSpeed) * 100);
    metrics.netBar.style.width = usage + '%';
  }
  if (data.uptime) {
    metrics.uptime.textContent = formatUptime(data.uptime);
  }
  if (data.cpu?.cores) {
    metrics.cpuCores.textContent = data.cpu.cores;
  }
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(tab + 'Panel').classList.add('active');
  });
});

function renderActions() {
  deckGrid.innerHTML = '';
  storedActions.forEach((action, index) => {
    const btn = createActionButton(action, index);
    deckGrid.appendChild(btn);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'action-btn empty';
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add</span>';
  addBtn.addEventListener('click', openActionModal);
  deckGrid.appendChild(addBtn);
}

function createActionButton(action, index) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.dataset.index = index;
  const icons = {
    launch: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    volume: '<svg viewBox="0 0 24 24" width="26" height="26"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>',
    mute: '<svg viewBox="0 0 24 24" width="26" height="26"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    media: '<svg viewBox="0 0 24 24" width="26" height="26"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    workspace: '<svg viewBox="0 0 24 24" width="26" height="26"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  };
  btn.innerHTML = icons[action.type] + '<span>' + action.name + '</span>';
  btn.addEventListener('click', () => executeAction(action));
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (confirm('Delete this action?')) {
      storedActions.splice(index, 1);
      saveActions();
      renderActions();
    }
  });
  return btn;
}

function openActionModal() {
  actionForm.reset();
  actionParams.innerHTML = '';
  actionModal.classList.add('active');
  loadActionParams(actionType.value);
}

async function loadActionParams(type) {
  if (type === 'launch') {
    try {
      const res = await fetch(`${API_BASE}/actions/applications`);
      const data = await res.json();
      if (data.success) {
        const apps = JSON.parse(data.output);
        const options = apps.map(app => `<option value="${escapeHtml(app.exec)}">${escapeHtml(app.name)}</option>`).join('');
        actionParams.innerHTML = `
          <div class="form-group">
            <label for="paramApp">Application</label>
            <select id="paramApp" required>
              <option value="">Select an application</option>
              ${options}
            </select>
          </div>
          <div class="form-group">
            <label for="paramAppCustom">Or custom command</label>
            <input type="text" id="paramAppCustom" placeholder="firefox, code, etc.">
          </div>
        `;
      }
    } catch {
      actionParams.innerHTML = paramTemplates.launch;
    }
  } else if (type === 'media') {
    try {
      const res = await fetch(`${API_BASE}/actions/media-players`);
      const data = await res.json();
      let playerOptions = '<option value="">Auto-detect</option>';
      if (data.success) {
        const players = JSON.parse(data.output);
        playerOptions += players.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
      }
      actionParams.innerHTML = `
        <div class="form-group">
          <label for="paramPlayer">Media Player (optional)</label>
          <select id="paramPlayer">
            ${playerOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="paramMedia">Action</label>
          <select id="paramMedia" required>
            <option value="play-pause">Play/Pause</option>
            <option value="next">Next</option>
            <option value="previous">Previous</option>
            <option value="stop">Stop</option>
          </select>
        </div>
      `;
    } catch {
      actionParams.innerHTML = paramTemplates.media;
    }
  } else {
    actionParams.innerHTML = paramTemplates[type] || '';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function closeActionModal() {
  actionModal.classList.remove('active');
}

modalClose.addEventListener('click', closeActionModal);
cancelBtn.addEventListener('click', closeActionModal);
actionModal.addEventListener('click', (e) => {
  if (e.target === actionModal) closeActionModal();
});

const paramTemplates = {
  launch: '<div class="form-group"><label for="paramApp">App Command</label><input type="text" id="paramApp" required placeholder="firefox, code, etc."></div>',
  volume: '<div class="form-group"><label for="paramLevel">Volume Level (0-100)</label><input type="number" id="paramLevel" min="0" max="100" value="50" required></div>',
  mute: '',
  media: '<div class="form-group"><label for="paramMedia">Action</label><select id="paramMedia" required><option value="play-pause">Play/Pause</option><option value="next">Next</option><option value="previous">Previous</option><option value="stop">Stop</option></select></div>',
  workspace: '<div class="form-group"><label for="paramWorkspace">Target</label><select id="paramWorkspace" required><option value="next">Next</option><option value="previous">Previous</option><option value="1">Workspace 1</option><option value="2">Workspace 2</option><option value="3">Workspace 3</option><option value="4">Workspace 4</option></select></div>',
};

actionType.addEventListener('change', () => {
  actionParams.innerHTML = paramTemplates[actionType.value] || '';
});

actionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('actionName').value.trim();
  const type = actionType.value;
  if (!name) return;

  const params = {};
  if (type === 'launch') {
    const custom = document.getElementById('paramAppCustom')?.value.trim();
    const selected = document.getElementById('paramApp')?.value;
    params.app = custom || selected;
  } else if (type === 'volume') {
    params.level = parseInt(document.getElementById('paramLevel').value, 10);
  } else if (type === 'media') {
    params.action = document.getElementById('paramMedia').value;
    const player = document.getElementById('paramPlayer')?.value;
    if (player) params.player = player;
  } else if (type === 'workspace') {
    params.target = document.getElementById('paramWorkspace').value;
  }

  if (type === 'launch' && !params.app) {
    showToast('Select an app or enter custom command');
    return;
  }

  storedActions.push({ name, type, params });
  saveActions();
  renderActions();
  closeActionModal();
  showToast('Action saved');
});

function saveActions() {
  localStorage.setItem('nexusmote_actions', JSON.stringify(storedActions));
}

async function executeAction(action) {
  if (!authenticated) { showToast('Not connected'); return; }
  try {
    const res = await fetch(`${API_BASE}/actions/${getActionEndpoint(action.type)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.params),
    });
    const data = await res.json();
    if (data.success) showToast(action.name + ': ' + data.output);
    else showToast('Error: ' + data.error);
  } catch (err) {
    showToast('Request failed');
  }
}

function getActionEndpoint(type) {
  const map = { launch: 'launch', volume: 'volume', mute: 'volume/mute', media: 'media', workspace: 'workspace' };
  return map[type];
}

function loadActions() {
  renderActions();
}

function updateTouchpadRect() {
  touchpadRect = touchpad.getBoundingClientRect();
}

let lastMoveTime = 0;
function handleTouchStart(e) {
  if (!authenticated) return;
  const touch = e.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
  lastTouchTime = Date.now();
  lastMoveTime = 0;
  isDragging = false;
  updateTouchpadRect();
}

function handleTouchMove(e) {
  if (!authenticated || !touchpadRect) return;
  e.preventDefault();
  const touch = e.touches[0];
  const dx = (touch.clientX - touchStart.x) * sensitivity;
  const dy = (touch.clientY - touchStart.y) * sensitivity;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    isDragging = true;
    const now = Date.now();
    if (now - lastMoveTime > 16) { // ~60fps throttle
      sendMouseMove(dx, dy);
      touchStart = { x: touch.clientX, y: touch.clientY };
      lastMoveTime = now;
    }
  }
}

function handleTouchEnd(e) {
  if (!isDragging && Date.now() - lastTouchTime < 250) {
    sendMouseClick('left', true);
    setTimeout(() => sendMouseClick('left', false), 50);
  }
  isDragging = false;
}

function sendMouseMove(dx, dy) {
  send('input', { inputType: 'mouse_move', data: { x: Math.round(dx), y: Math.round(dy), relative: true } });
}

function sendMouseClick(button, down) {
  send('input', { inputType: 'mouse_click', data: { button, down } });
}

function sendMouseScroll(dx, dy) {
  send('input', { inputType: 'mouse_scroll', data: { deltaX: Math.round(dx), deltaY: Math.round(dy) } });
}

touchpad.addEventListener('touchstart', handleTouchStart, { passive: false });
touchpad.addEventListener('touchmove', handleTouchMove, { passive: false });
touchpad.addEventListener('touchend', handleTouchEnd);

mouseBtns.forEach(btn => {
  const button = btn.dataset.button;
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); sendMouseClick(button, true); }, { passive: false });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); sendMouseClick(button, false); });
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); sendMouseClick(button, true); });
  btn.addEventListener('mouseup', (e) => { e.preventDefault(); sendMouseClick(button, false); });
  btn.addEventListener('mouseleave', (e) => { sendMouseClick(button, false); });
});

touchpad.addEventListener('wheel', (e) => {
  if (!authenticated) return;
  e.preventDefault();
  sendMouseScroll(e.deltaX * 0.5, -e.deltaY * 0.5);
}, { passive: false });

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

let deferredPrompt = null;

function init() {
  connect();
  loadActions();
  setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) send('ping');
  }, 30000);
  
  window.addEventListener('resize', updateTouchpadRect);
  updateTouchpadRect();
  
  // Arrow keys for PowerPoint
  arrowBtns.forEach(btn => {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey(btn.dataset.key, true); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); sendKey(btn.dataset.key, false); });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); sendKey(btn.dataset.key, true); });
    btn.addEventListener('mouseup', (e) => { e.preventDefault(); sendKey(btn.dataset.key, false); });
    btn.addEventListener('mouseleave', (e) => { sendKey(btn.dataset.key, false); });
  });
  
  // Virtual keyboard toggle
  keyboardToggle.addEventListener('click', () => {
    keyboardModal.classList.add('active');
    keyboardToggle.classList.add('active');
  });
  
  keyboardClose.addEventListener('click', closeKeyboard);
  keyboardModal.addEventListener('click', (e) => {
    if (e.target === keyboardModal) closeKeyboard();
  });
  
  // Virtual keyboard keys
  keyboardKeys.forEach(key => {
    key.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey(key.dataset.key, true); key.classList.add('active'); }, { passive: false });
    key.addEventListener('touchend', (e) => { e.preventDefault(); sendKey(key.dataset.key, false); key.classList.remove('active'); });
    key.addEventListener('mousedown', (e) => { e.preventDefault(); sendKey(key.dataset.key, true); key.classList.add('active'); });
    key.addEventListener('mouseup', (e) => { e.preventDefault(); sendKey(key.dataset.key, false); key.classList.remove('active'); });
    key.addEventListener('mouseleave', (e) => { sendKey(key.dataset.key, false); key.classList.remove('active'); });
  });
}

function closeKeyboard() {
  keyboardModal.classList.remove('active');
  keyboardToggle.classList.remove('active');
  keyboardKeys.forEach(k => k.classList.remove('active'));
}

function sendKey(key, down) {
  if (!authenticated) return;
  send('input', { inputType: 'keyboard_key', data: { key, down } });
}

document.addEventListener('DOMContentLoaded', init);