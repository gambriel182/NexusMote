import Fastify from 'fastify';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { registerActions } from './actions.js';
import { registerMetrics } from './metrics.js';
import { registerInput } from './input.js';
import { getAllMetrics } from './metrics.js';
import {
  launchApp,
  setAudioVolume,
  toggleAudioMute,
  mediaControl,
  switchWorkspace,
} from './actions.js';
import {
  moveMouse as inputMoveMouse,
  moveMouseRelative as inputMoveMouseRelative,
  clickMouse as inputClickMouse,
  scrollMouse as inputScrollMouse,
  typeText as inputTypeText,
  pressKey as inputPressKey,
  keyCombo as inputKeyCombo,
} from './input.js';

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

registerActions(fastify);
registerMetrics(fastify);
registerInput(fastify);

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
      console.log(`Message from ${clientId}:`, message.type);
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
  const client = clients.get(clientId);
  if (!client) return;
  try {
    let result: any;
    switch (action) {
      case 'launch_app':
        result = await launchApp(params.app);
        break;
      case 'audio_volume':
        result = await setAudioVolume(params.level);
        break;
      case 'audio_mute':
        result = await toggleAudioMute();
        break;
      case 'media_play_pause':
        result = await mediaControl('play-pause');
        break;
      case 'media_next':
        result = await mediaControl('next');
        break;
      case 'media_previous':
        result = await mediaControl('previous');
        break;
      case 'workspace_switch':
        result = await switchWorkspace(params.index);
        break;
      case 'workspace_next':
        result = await switchWorkspace('next');
        break;
      case 'workspace_previous':
        result = await switchWorkspace('previous');
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    client.ws.send(JSON.stringify({ type: 'action_result', action, result }));
  } catch (err: any) {
    if (client) {
      client.ws.send(JSON.stringify({ type: 'action_error', action, error: err.message }));
    }
  }
}

async function handleInput(clientId: string, message: any) {
  const { inputType, data } = message;
  const client = clients.get(clientId);
  if (!client) return;
  try {
    let result: any;
    switch (inputType) {
      case 'mouse_move':
        result = data.relative
          ? await inputMoveMouseRelative(data.x, data.y)
          : await inputMoveMouse(data.x, data.y);
        break;
      case 'mouse_click':
        result = await inputClickMouse(data.button, data.down);
        break;
      case 'mouse_scroll':
        result = await inputScrollMouse(data.deltaX, data.deltaY);
        break;
      case 'keyboard_type':
        result = await inputTypeText(data.text);
        break;
      case 'keyboard_key':
        result = await inputPressKey(data.key, data.down);
        break;
      case 'keyboard_combo':
        result = await inputKeyCombo(data.keys);
        break;
      default:
        throw new Error(`Unknown input type: ${inputType}`);
    }
    client.ws.send(JSON.stringify({ type: 'input_result', inputType, result }));
  } catch (err: any) {
    client.ws.send(JSON.stringify({ type: 'input_error', inputType, error: err.message }));
  }
}

async function startMetricsBroadcast() {
  setInterval(async () => {
    const metrics = await getAllMetrics();
    broadcastToAuthenticated({ type: 'metrics', data: metrics });
  }, 2000);
}

async function main() {
  try {
    await fastify.ready();

    const wss = new WebSocketServer({ noServer: true });

    fastify.server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on('connection', handleWebSocketConnection);

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`NexusMote server running on http://${HOST}:${PORT}`);

    await startMetricsBroadcast();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();