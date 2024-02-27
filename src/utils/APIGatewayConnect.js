import EventEmitter from 'events';

const KEEPALIVE_TIMEOUT = 1000 * 60 * 9; // 9 min

export default class APIGatewayConnect extends EventEmitter {
  _timeout;

  constructor({ url, protocol }={}) {
    super();

    this.url = url;
    this.protocol = protocol;
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

    this.ws = new Promise((reslove, reject) => {
      this.$resolve = reslove;
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
    await this.connect();

    this.ws.send(JSON.stringify(message));
    this.keepAlive();
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
      this.onclose();

      ws.close();
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

    if (ws) {
      ws.removeEventListener('open', this);
      ws.removeEventListener('close', this);
      ws.removeEventListener('message', this);
    }

    this.ws = null;
    this.clearTimeout();
  }
}
