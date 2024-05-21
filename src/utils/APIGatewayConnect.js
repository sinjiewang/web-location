import EventEmitter from 'events';
import { clearTimeout, setTimeout } from 'worker-timers';

const KEEPALIVE_TIMEOUT = 1000 * 60 * 9; // 9 min
const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

export default class APIGatewayConnect extends EventEmitter {
  _timeout;

  constructor({ url, protocol }={}) {
    super();

    this.url = url;
    this.protocol = protocol;
  }

  get connected() {
    const { ws } = this;

    return ws && ws.readyState === WS_READY_STATE.OPEN;
  }

  handleEvent(event) {
    const { type } = event;
    const handler = this[`on${type}`];

    if (handler && typeof handler === 'function') {
      handler.bind(this)(event);
    }

    this.emit(type, event);
    this.keepAlive();
  }

  async connect() {
    const { ws, url, protocol } = this;

    if (ws) {
      return Promise.resolve(ws);
    }

    const wesocket = new WebSocket(url, protocol);

    this.ws = new Promise((resolve, reject) => {
      this.$resolve = resolve;
      this.$reject = reject;

      wesocket.addEventListener('open', this);
      wesocket.addEventListener('close', this);
      wesocket.addEventListener('message', this);
      wesocket.addEventListener('error', this);
    }).then(() => {
      this.ws = wesocket;
      this.keepAlive();
    }).finally(() => {
      delete this.$resolve;
      delete this.$reject;
    });

    return this.ws;
  }

  async send(message) {
    if (this.connected) {
      this.ws.send(JSON.stringify(message));
      this.keepAlive();
    } else {
      console.error('WebSocket disconnect', this.url)

      throw new Error('WebSocket disconnect');
    }
  }

  keepAlive() {
    this.clearTimeout();

    if (this.connected) {
      this._timeout = setTimeout(() => {
        this.send({
          action: 'keep-alive',
        });
      }, KEEPALIVE_TIMEOUT);
    }
  }

  clearTimeout() {
    if (this._timeout) {
      clearTimeout(this._timeout);

      this._timeout = null;
    }
  }

  destroy() {
    const { ws } = this;

    if (ws) {
      this.onclose();

      ws.close();
    }
  }

  onmessage(event) {
    const { action, type, data } = JSON.parse(event.data);

    if (type) {
      this.emit(type, { action, type, data });
    }
  }

  onerror(event) {
    if (this.$reject) {
      console.error("WebSocket error: ", event);

      this.$reject(event);
    }
  }

  onopen() {
    if (this.$resolve) {
      this.$resolve(this);
    }
  }

  onclose() {
    const { ws } = this;

    if (ws && ws.removeEventListener) {
      ws.removeEventListener('open', this);
      ws.removeEventListener('close', this);
      ws.removeEventListener('message', this);
    }

    this.ws = null;
    this.clearTimeout();
  }
}
