import { getTagged } from '@/utils/logger.js';
import EventEmitter from 'events';

const Log = getTagged('connection:Protocol');

export default class Protocol extends EventEmitter {
  constructor({ clientId, dataChannel }={}) {
    super();

    this.clientId = clientId;
    this.dataChannel = dataChannel;
    this.$onmessage = (event) => this.onmessage(event);
    this.$onclose = (event) => this.onclose(event);

    dataChannel.on('message', this.$onmessage);
    dataChannel.on('close', this.$onclose);
  }

  onclose() {
    const { dataChannel, $onmessage, $onclose } = this;

    dataChannel.off('message', $onmessage);
    dataChannel.off('close', $onclose);

    delete this.$onmessage;
    delete this.$onclose;

    this.emit('close');
    this.dataChannel = null;
  }

  onmessage(event) {
    const { data, type } = JSON.parse(event.data);

    if (this.clientId) {
      data.clientId = this.clientId
    }

    this.emit(type, data);
  }

  sendRegister(data) {
    this.send({
      type: 'register',
      data,
    });
  }

  sendMessage(data) {
    this.send({
      type: 'message',
      data,
    });
  }

  send(data) {
    try {
      this.dataChannel.send(JSON.stringify(data));
    } catch (err) {
      Log.warn(`${err.toString()}, unsent data: ${data}`);
    }
  }
}