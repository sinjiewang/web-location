import EventEmitter from 'events';

const KEEPALIVE_TIMEOUT = 1000 * 60 * 9; // 9 min

export default class WebSocketClient extends EventEmitter {
  _timeout;

  constructor({ url, protocol }={}) {
    super();

    const ws = new WebSocket(url, protocol);

    ws.addEventListener('open', this);
    ws.addEventListener('close', this);
    ws.addEventListener('message', this);

    this.ws = ws;
    this.keepAlive();
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

  send(message) {
    const { ws } = this;
    if (ws) {
      ws.send(JSON.stringify(message));

      this.keepAlive();
    }
  }

  keepAlive() {
    this.clearTimeout();
    this._timeout = setTimeout(() => {
      this.send({
        action: 'keep-alive',
      });
    }, KEEPALIVE_TIMEOUT);
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
      ws.removeEventListener('open', this);
      ws.removeEventListener('close', this);
      ws.removeEventListener('message', this);
      ws.close();
    }

    this.clearTimeout();
  }
}
