import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

import { getTagged } from '@/utils/logger.js';

const Log = getTagged('connection:Protocol');
const MAX_CHUNK_LENGTH = 250000;

export default class Protocol extends EventEmitter {
  constructor({ clientId, dataChannel }={}) {
    super();

    this.clientId = clientId;
    this.dataChannel = dataChannel;
    this.$onmessage = (event) => this.onmessage(event);
    this.$onclose = (event) => this.onclose(event);

    dataChannel.on('message', this.$onmessage);
    dataChannel.on('close', this.$onclose);

    this.$requests = {};
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

    if (type === 'response') {
      return this.onresponse(data);
    }

    if (this.clientId) {
      data.clientId = this.clientId
    }

    this.emit(type, data);
  }

  onresponse({messageId, contentLength, body}) {
    const res = this.$requests[messageId];

    if (!res) return;

    if (res.body) {
      res.body += body;
    } else {
      res.body = body;
    }

    console.log('received', res.body.length, Math.round(res.body.length / contentLength * 100) + '%')
    if (res.body.length >= contentLength) {
      res.resolve(res.body);
    }
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

  sendRequest(data={}) {
    const messageId = uuidv4();

    return new Promise(( resolve, reject ) => {
      const timeout = setTimeout(() => reject(new Error('Request Timeout')), 30 * 1000);

      this.$requests[messageId] = {
        resolve,
        timeout,
      };
      this.send({
        type: 'request',
        data: {
          messageId,
          ...data
        },
      });
    }).finally(() => {
      const { timeout } = this.$requests[messageId];

      clearTimeout(timeout);

      delete this.$requests[messageId];
    });
  }

  sendResponse(messageId, data) {
    const length = data.length;

    for(let start=0; start<length; start+=MAX_CHUNK_LENGTH) {
      const end = (start + MAX_CHUNK_LENGTH) <= length ? (start + MAX_CHUNK_LENGTH) : length;
      const chunk = data.substring(start, end);

      this.send({
        type: 'response',
        data: {
          messageId,
          contentLength: length,
          body: chunk,
        },
      });
    }
  }

  send(data) {
    try {
      this.dataChannel.send(JSON.stringify(data));
    } catch (err) {
      Log.warn(`${err.toString()}, unsent data: ${data}`);
    }
  }
}
