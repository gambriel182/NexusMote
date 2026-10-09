/**
 * WebSocket client for the NexusMote mobile app.
 * Handles pairing, reconnection, and message dispatch.
 *
 * Flow:
 *   1. Open WebSocket
 *   2. Receive server:hello (includes the pairing token)
 *   3. Send pair with token
 *   4. Receive pair:accepted → connection resolved
 */
export class NexusMoteClient {
  constructor() {
    this.ws = null;
    this.url = null;
    this.token = null;
    this.deviceName = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this._resolveConnect = null;
    this._rejectConnect = null;
    this._connectResolved = false;
    this._timeout = null;
    this.onOpen = null;
    this.onClose = null;
    this.onError = null;
    this.onPaired = null;
    this.onKick = null;
    this.onStatus = null;
  }

  connect(url, deviceName, token) {
    this.url = url;
    this.deviceName = deviceName;
    this.token = token || null;
    this.reconnectAttempts = 0;

    return new Promise((resolve, reject) => {
      this._resolveConnect = resolve;
      this._rejectConnect = reject;
      this._connectResolved = false;

      this._timeout = setTimeout(() => {
        if (!this._connectResolved) {
          this._connectResolved = true;
          this._resolveConnect = null;
          this._rejectConnect = null;
          reject(new Error('Connection timeout'));
        }
      }, 8000);

      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          if (this.onOpen) this.onOpen();
        };

        this.ws.onmessage = (event) => {
          this._handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.ws = null;
          if (this.onClose) this.onClose(event.code, event.reason);
          if (!this._connectResolved) {
            clearTimeout(this._timeout);
            this._connectResolved = true;
            this._rejectConnect(new Error('Connection closed'));
            this._resolveConnect = null;
            this._rejectConnect = null;
          } else {
            this._scheduleReconnect();
          }
        };

        this.ws.onerror = (err) => {
          if (this.onError) this.onError(err);
        };
      } catch (err) {
        this._connectResolved = true;
        clearTimeout(this._timeout);
        reject(err);
      }
    });
  }

  _resolveConnected(msg) {
    if (this._connectResolved) return;
    clearTimeout(this._timeout);
    this._connectResolved = true;
    if (this._resolveConnect) this._resolveConnect(msg);
    this._resolveConnect = null;
    this._rejectConnect = null;
  }

  _rejectConnected(reason) {
    if (this._connectResolved) return;
    clearTimeout(this._timeout);
    this._connectResolved = true;
    if (this._rejectConnect) this._rejectConnect(new Error(reason));
    this._resolveConnect = null;
    this._rejectConnect = null;
  }

  _handleMessage(data) {
    let msg;
    try {
      msg = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data));
    } catch (err) {
      console.warn('[client] invalid message', data);
      return;
    }

    switch (msg.type) {
      case 'server:hello': {
        const pairToken = this.token || msg.token;
        if (pairToken) {
          this.send({ type: 'pair', deviceName: this.deviceName, token: pairToken });
        } else {
          this._rejectConnected('No pairing token available');
        }
        if (this.onStatus) this.onStatus(msg);
        break;
      }
      case 'pair:accepted':
        this.reconnectAttempts = 0;
        if (this.onPaired) this.onPaired(msg);
        this._resolveConnected(msg);
        break;
      case 'pair:rejected':
        if (this.onKick) this.onKick(msg.reason || 'pairing rejected');
        this._rejectConnected(msg.reason || 'pairing rejected');
        break;
      case 'server:kick':
        if (this.onKick) this.onKick(msg.reason || 'kicked');
        break;
      case 'server:status':
      case 'server:disconnected':
        if (this.onStatus) this.onStatus(msg);
        break;
      default:
        console.log('[client] unhandled', msg.type);
    }
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  move(dx, dy) {
    this.send({ type: 'mouse.move', dx, dy });
  }

  click(button) {
    this.send({ type: 'mouse.click', button });
  }

  scroll(dy) {
    this.send({ type: 'mouse.scroll', dy });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    this._connectResolved = true;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.url) {
        this.connect(this.url, this.deviceName, this.token).catch(() => {});
      }
    }, delay);
  }
}
