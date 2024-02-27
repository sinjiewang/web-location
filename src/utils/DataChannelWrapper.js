import { getTagged } from './logger';
import EventEmitter from 'events';

const Log = getTagged('connection:data-channel');

export default class DataChannelWrapper extends EventEmitter {
  constructor(dataChannel) {
    super();
    this.dataChannel = dataChannel;

    dataChannel.binaryType = 'arraybuffer';
    dataChannel.addEventListener('open', this);
    dataChannel.addEventListener('close', this);
    dataChannel.addEventListener('message', this);
  }

  get readyState() {
    const { dataChannel } = this;

    if (dataChannel instanceof WebSocket) {
      // WebSocket ref: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
      // RTCDataChannel ref: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/readyState
      const state = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];

      return state[dataChannel.readyState].toLowerCase();
    }

    return dataChannel.readyState;
  }

  handleEvent(ev) {
    const { type } = ev;

    this.emit(type, ev);
  }

  send(data) {
    try {
      this.dataChannel.send(data);
    } catch (err) {
      Log.warn(`${err.toString()}, unsent data: ${data}`);
    }
  }

  close() {
    if (this.readyState !== 'open') {
      return;
    }
    const { dataChannel } = this;

    dataChannel.removeEventListener('open', this);
    dataChannel.removeEventListener('close', this);
    dataChannel.removeEventListener('message', this);

    this.dataChannel.close();

    this.emit('close');
  }
}
