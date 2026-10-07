/**
 * WebSocket client for the NexusMote mobile app.
 * Handles pairing, reconnection, and message dispatch.
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
    this.token = token;
    this.reconnectAttempts = 0;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.send({
            type: 'pair',
            deviceName: this.deviceName,
            token: this.token,
          });
          if (this.onOpen) this.onOpen();
        };

        this.ws.onmessage = (event) => {
          this._handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.ws = null;
          if (this.onClose) this.onClose(event.code, event.reason);
          this._scheduleReconnect();
        };

        this.ws.onerror = (err) => {
          if (this.onError) this.onError(err);
        };

        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 8000);
        const originalOnPaired = this.onPaired;
        this.onPaired = (data) => {
          clearTimeout(timeout);
          if (originalOnPaired) originalOnPaired(data);
          resolve(data);
        };
      } catch (err) {
        reject(err);
      }
    });
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
      case 'pair:accepted':
        this.reconnectAttempts = 0;
        if (this.onPaired) this.onPaired(msg);
        break;
      case 'pair:rejected':
        if (this.onKick) this.onKick(msg.reason || 'pairing rejected');
        break;
      case 'server:kick':
        if (this.onKick) this.onKick(msg.reason || 'kicked');
        break;
      case 'server:hello':
      case 'server:status':
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