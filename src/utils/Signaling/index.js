import EventEmitter from 'events';

export default class Signaling extends EventEmitter {
  static getIceServers = () => Promise.reject('get ice servers fail');

  constructor({ tunnel }={}) {
    super();

    this.tunnel = tunnel;
    this.$onmessage = this.onmessage.bind(this);
    this.tunnel.on('message', this.$onmessage);
  }

  onmessage(event) {
    const { action, data, clientId, siteId } = JSON.parse(event.data);
    const actionData = {
      desc: data.sdp,
    };

    if (clientId) {
      actionData.clientId = clientId;
    } else {
      actionData.siteId = siteId;
    }

    this.emit(action, actionData);
  }

  destroy() {
    this.tunnel.off('message', this.$onmessage);
  }
}
