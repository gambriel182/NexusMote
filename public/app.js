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

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const deckGrid = document.getElementById('deckGrid');
const addActionBtn = document.getElementById('addActionBtn');
const actionModal = document.getElementById('actionModal');
const actionForm = document.getElementById('actionForm');
const modalClose = document.getElementById('modalClose');
const cancelBtn = document.getElementById('cancelBtn');
const actionType = document.getElementById('actionType');
const actionParams = document.getElementById('actionParams');
const toast = document.getElementById('toast');
const touchpad = document.getElementById('touchpad');
const mouseBtns = document.querySelectorAll('.mouse-btn');

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
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add</span>';
  addBtn.addEventListener('click', openActionModal);
  deckGrid.appendChild(addBtn);
}

function createActionButton(action, index) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.dataset.index = index;
  const icons = {
    launch: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    volume: '<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>',
    mute: '<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    media: '<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    workspace: '<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
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
  if (type === 'launch') params.app = document.getElementById('paramApp').value.trim();
  else if (type === 'volume') params.level = parseInt(document.getElementById('paramLevel').value, 10);
  else if (type === 'media') params.action = document.getElementById('paramMedia').value;
  else if (type === 'workspace') params.target = document.getElementById('paramWorkspace').value;

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

let touchpadRect = null;
function updateTouchpadRect() {
  touchpadRect = touchpad.getBoundingClientRect();
}

function handleTouchStart(e) {
  if (!authenticated) return;
  const touch = e.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
  lastTouchTime = Date.now();
  isDragging = false;
  updateTouchpadRect();
}

function handleTouchMove(e) {
  if (!authenticated || !touchpadRect) return;
  e.preventDefault();
  const touch = e.touches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    isDragging = true;
    sendMouseMove(dx * 2, dy * 2);
    touchStart = { x: touch.clientX, y: touch.clientY };
  }
}

function handleTouchEnd(e) {
  if (!isDragging && Date.now() - lastTouchTime < 300) {
    sendMouseClick('left', true);
    setTimeout(() => sendMouseClick('left', false), 50);
  }
  isDragging = false;
}

function sendMouseMove(dx, dy) {
  send('input', { inputType: 'mouse_move', data: { x: dx, y: dy, relative: true } });
}

function sendMouseClick(button, down) {
  send('input', { inputType: 'mouse_click', data: { button, down } });
}

function sendMouseScroll(dx, dy) {
  send('input', { inputType: 'mouse_scroll', data: { deltaX: dx, deltaY: dy } });
}

touchpad.addEventListener('touchstart', handleTouchStart, { passive: false });
touchpad.addEventListener('touchmove', handleTouchMove, { passive: false });
touchpad.addEventListener('touchend', handleTouchEnd);

mouseBtns.forEach(btn => {
  const button = btn.dataset.button;
  btn.addEventListener('touchstart', () => sendMouseClick(button, true));
  btn.addEventListener('touchend', () => sendMouseClick(button, false));
  btn.addEventListener('mousedown', () => sendMouseClick(button, true));
  btn.addEventListener('mouseup', () => sendMouseClick(button, false));
  btn.addEventListener('mouseleave', () => sendMouseClick(button, false));
});

touchpad.addEventListener('wheel', (e) => {
  if (!authenticated) return;
  e.preventDefault();
  sendMouseScroll(e.deltaX, -e.deltaY);
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
}

document.addEventListener('DOMContentLoaded', init);