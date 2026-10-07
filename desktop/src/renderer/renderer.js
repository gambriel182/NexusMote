const { toCanvas } = require('qrcode');

const statusText = document.getElementById('statusText');
const dot = document.getElementById('dot');
const deviceName = document.getElementById('deviceName');
const pairSection = document.getElementById('pairSection');
const serverAddr = document.getElementById('serverAddr');
const serverPort = document.getElementById('serverPort');
const qrCanvas = document.getElementById('qrCanvas');
const quitBtn = document.getElementById('quitBtn');

function setStatus(text, color) {
  statusText.textContent = text;
  dot.style.background = color;
}

function setConnected(name) {
  setStatus('🟢 Connected', '#22c55e');
  deviceName.textContent = '📱 ' + name;
  deviceName.style.display = 'block';
}

function setDisconnected() {
  setStatus('🔴 Disconnected', '#ef4444');
  deviceName.style.display = 'none';
}

function setListening(addr, port) {
  setStatus('🟢 Listening', '#3b82f6');
  serverAddr.textContent = `${addr}:${port}`;
  serverPort.textContent = String(port);
  pairSection.style.display = 'block';
  renderQR(`${addr}:${port}`);
}

async function renderQR(text) {
  try {
    await toCanvas(qrCanvas, text, { width: 220, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } });
  } catch (err) {
    console.error('[qr] render failed', err);
  }
}

window.nexusmote.onServerStart((info) => {
  setListening(info.ip, info.port);
});

window.nexusmote.onServerStatus((status) => {
  if (status.state === 'connected') {
    setConnected(status.deviceName);
  } else if (status.state === 'disconnected') {
    setDisconnected();
  } else if (status.state === 'listening') {
    setStatus('🟢 Listening', '#3b82f6');
  }
});

quitBtn.addEventListener('click', () => window.nexusmote.quit());