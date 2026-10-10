import Fastify from 'fastify';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { registerActions } from './actions.js';
import { registerMetrics } from './metrics.js';
import { registerInput } from './input.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ClientInfo {
  ws: WebSocket;
  authenticated: boolean;
  deviceId?: string;
}

const clients = new Map<string, ClientInfo>();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({ logger: true });

fastify.register(import('@fastify/static'), {
  root: join(__dirname, '../public'),
  prefix: '/',
});

fastify.get('/health', async () => ({ status: 'ok' }));

fastify.get('/api/info', async () => ({
  name: 'NexusMote',
  version: '0.1.0',
  features: ['actions', 'metrics', 'input'],
}));

function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function broadcastToAuthenticated(message: object) {
  const data = JSON.stringify(message);
  for (const [, client] of clients) {
    if (client.authenticated && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function handleWebSocketConnection(ws: WebSocket, req: any) {
  const clientId = generateDeviceId();
  const clientInfo: ClientInfo = { ws, authenticated: false };
  clients.set(clientId, clientInfo);

  console.log(`Client connected: ${clientId}`);

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (err) {
      console.error('Invalid message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${clientId}:`, err);
  });

  ws.send(JSON.stringify({ type: 'welcome', clientId }));
}

function handleMessage(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'auth': {
      const { deviceId, token } = message;
      if (token === process.env.AUTH_TOKEN || !process.env.AUTH_TOKEN) {
        client.authenticated = true;
        client.deviceId = deviceId || clientId;
        client.ws.send(JSON.stringify({ type: 'auth_success', clientId }));
        console.log(`Client authenticated: ${clientId}`);
      } else {
        client.ws.send(JSON.stringify({ type: 'auth_failed', message: 'Invalid token' }));
      }
      break;
    }

    case 'action': {
      if (!client.authenticated) {
        client.ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }
      handleAction(clientId, message);
      break;
    }

    case 'input': {
      if (!client.authenticated) {
        client.ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }
      handleInput(clientId, message);
      break;
    }

    case 'ping': {
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;
    }

    default:
      client.ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

async function handleAction(clientId: string, message: any) {
  const { action, params } = message;
  try {
    const result = await executeAction(action, params);
    const client = clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({ type: 'action_result', action, result }));
    }
  } catch (err: any) {
    const client = clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({ type: 'action_error', action, error: err.message }));
    }
  }
}

async function executeAction(action: string, params: any): Promise<any> {
  switch (action) {
    case 'launch_app':
      return launchApp(params.app);
    case 'audio_volume':
      return setAudioVolume(params.level);
    case 'audio_mute':
      return toggleAudioMute();
    case 'media_play_pause':
      return mediaControl('play-pause');
    case 'media_next':
      return mediaControl('next');
    case 'media_previous':
      return mediaControl('previous');
    case 'workspace_switch':
      return switchWorkspace(params.index);
    case 'workspace_next':
      return switchWorkspace('next');
    case 'workspace_previous':
      return switchWorkspace('previous');
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function handleInput(clientId: string, message: any) {
  const { inputType, data } = message;
  try {
    const result = await executeInput(inputType, data);
    const client = clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({ type: 'input_result', inputType, result }));
    }
  } catch (err: any) {
    const client = clients.get(clientId);
    if (client) {
      client.ws.send(JSON.stringify({ type: 'input_error', inputType, error: err.message }));
    }
  }
}

async function executeInput(inputType: string, data: any): Promise<any> {
  const { spawn } = await import('child_process');
  const { promisify } = await import('util');
  const execFile = promisify(spawn);

  switch (inputType) {
    case 'mouse_move':
      return sendMouseMove(data.x, data.y);
    case 'mouse_click':
      return sendMouseClick(data.button, data.down);
    case 'mouse_scroll':
      return sendMouseScroll(data.deltaX, data.deltaY);
    case 'keyboard_type':
      return sendKeyboardType(data.text);
    case 'keyboard_key':
      return sendKeyboardKey(data.key, data.down);
    default:
      throw new Error(`Unknown input type: ${inputType}`);
  }
}

function launchApp(app: string): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn(app, { detached: true, stdio: 'ignore' });
    proc.unref();
    resolve(`Launched ${app}`);
  });
}

function setAudioVolume(level: number): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('pactl', ['set-sink-volume', '@DEFAULT_SINK@', `${Math.round(level)}%`]);
    proc.on('close', (code) => code === 0 ? resolve(`Volume set to ${level}%`) : reject(new Error('Failed to set volume')));
  });
}

function toggleAudioMute(): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('pactl', ['set-sink-mute', '@DEFAULT_SINK@', 'toggle']);
    proc.on('close', (code) => code === 0 ? resolve('Audio mute toggled') : reject(new Error('Failed to toggle mute')));
  });
}

function mediaControl(action: string): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('playerctl', [action]);
    proc.on('close', (code) => code === 0 ? resolve(`Media ${action}`) : reject(new Error('Media control failed')));
  });
}

function switchWorkspace(target: string | number): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const arg = target === 'next' ? '+1' : target === 'previous' ? '-1' : String(target);
    const proc = spawn('hyprctl', ['dispatch', 'workspace', arg]);
    proc.on('close', (code) => code === 0 ? resolve(`Switched to workspace ${arg}`) : reject(new Error('Workspace switch failed')));
  });
}

function sendMouseMove(x: number, y: number): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('ydotool', ['mousemove', '--', String(x), String(y)]);
    proc.on('close', (code) => code === 0 ? resolve('Mouse moved') : reject(new Error('Mouse move failed')));
  });
}

function sendMouseClick(button: string, down: boolean): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('ydotool', ['click', down ? '1' : '0', button]);
    proc.on('close', (code) => code === 0 ? resolve(`Mouse ${button} ${down ? 'down' : 'up'}`) : reject(new Error('Mouse click failed')));
  });
}

function sendMouseScroll(deltaX: number, deltaY: number): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('ydotool', ['mousescroll', '--', String(deltaX), String(deltaY)]);
    proc.on('close', (code) => code === 0 ? resolve('Mouse scrolled') : reject(new Error('Mouse scroll failed')));
  });
}

function sendKeyboardType(text: string): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('ydotool', ['type', text]);
    proc.on('close', (code) => code === 0 ? resolve('Text typed') : reject(new Error('Keyboard type failed')));
  });
}

function sendKeyboardKey(key: string, down: boolean): Promise<string> {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('ydotool', ['key', `${down ? '' : 'u'}${key}`]);
    proc.on('close', (code) => code === 0 ? resolve(`Key ${key} ${down ? 'down' : 'up'}`) : reject(new Error('Keyboard key failed')));
  });
}

async function startMetricsBroadcast() {
  setInterval(async () => {
    const metrics = await getMetrics();
    broadcastToAuthenticated({ type: 'metrics', data: metrics });
  }, 2000);
}

async function getMetrics(): Promise<any> {
  const { readFile } = await import('fs/promises');
  try {
    const cpuData = await readFile('/proc/stat', 'utf-8');
    const memData = await readFile('/proc/meminfo', 'utf-8');
    const uptimeData = await readFile('/proc/uptime', 'utf-8');

    const cpuLines = cpuData.trim().split('\n');
    const cpuTotal = cpuLines[0].split(/\s+/).slice(1).reduce((a, b) => a + parseInt(b), 0);
    const cpuIdle = parseInt(cpuLines[0].split(/\s+/)[4]);

    const memLines = memData.trim().split('\n');
    const memTotal = parseInt(memLines[0].split(/\s+/)[1]);
    const memAvailable = parseInt(memLines[2].split(/\s+/)[1]);
    const memUsed = memTotal - memAvailable;

    const uptime = parseFloat(uptimeData.split(' ')[0]);

    return {
      cpu: { usage: Math.round((1 - cpuIdle / cpuTotal) * 100) },
      memory: { total: memTotal * 1024, used: memUsed * 1024, usage: Math.round((memUsed / memTotal) * 100) },
      uptime: Math.round(uptime),
      timestamp: Date.now(),
    };
  } catch (err) {
    return { error: 'Failed to read metrics' };
  }
}

async function main() {
  try {
    await fastify.ready();

    const wss = new WebSocketServer({ noServer: true });

    fastify.server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on('connection', handleWebSocketConnection);

    registerActions(fastify);
    registerMetrics(fastify);
    registerInput(fastify);

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`NexusMote server running on http://${HOST}:${PORT}`);

    await startMetricsBroadcast();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();