/**
 * WebSocket server + pairing logic for NexusMote desktop.
 * Receives JSON messages from mobile clients and dispatches them to an InputController.
 */
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

const PAIR_TOKEN = process.env.NEXUSMOTE_TOKEN || null;

function generateToken() {
  return uuidv4().replace(/-/g, '').slice(0, 24);
}

function startServer({ host, port, onStatusChange }) {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  let connectedClient = null;
  const sessionToken = PAIR_TOKEN || generateToken();
  let status = { state: 'disconnected', deviceName: null, token: sessionToken };

  function setStatus(next) {
    status = { ...status, ...next };
    if (onStatusChange) onStatusChange(status);
  }

  function send(ws, payload) {
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function broadcast(payload) {
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(payload));
      }
    }
  }

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log('[ws] connection from', ip);

    send(ws, { type: 'server:hello', port, token: sessionToken });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (err) {
        console.warn('[ws] invalid json', raw.toString());
        return;
      }

      // Pairing handshake
      if (msg.type === 'pair') {
        if (msg.token !== sessionToken) {
          send(ws, { type: 'pair:rejected', reason: 'invalid token' });
          return;
        }
        // Only one device at a time for MVP
        if (connectedClient && connectedClient !== ws) {
          send(connectedClient, { type: 'server:kick', reason: 'another device paired' });
          connectedClient.terminate();
        }
        connectedClient = ws;
        const deviceName = msg.deviceName || 'Unknown device';
        setStatus({ state: 'connected', deviceName });
        send(ws, { type: 'pair:accepted', deviceName });
        return;
      }

      // Any other message requires an accepted pairing
      if (ws !== connectedClient) {
        send(ws, { type: 'server:error', reason: 'not paired' });
        return;
      }

      // Forward to input controller
      const handler = require('./inputController');
      handler.handleInput(msg);
    });

    ws.on('close', () => {
      if (ws === connectedClient) {
        connectedClient = null;
        setStatus({ state: 'disconnected', deviceName: null });
        broadcast({ type: 'server:disconnected' });
      }
      console.log('[ws] client closed');
    });

    ws.on('error', (err) => console.error('[ws] error', err));
  });

  server.listen(port, host, () => {
    console.log(`[server] listening on ${host}:${port}`);
    setStatus({ state: 'listening' });
  });

  return {
    server,
    wss,
    token: sessionToken,
    close: () => new Promise((resolve) => server.close(resolve)),
    getStatus: () => status,
    sendToClient: (payload) => {
      if (connectedClient) send(connectedClient, payload);
    },
  };
}

module.exports = { startServer };