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

    this.$response = {};
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

    switch(type) {
      case 'response':
        return this.onresponse(data);
      case 'accept':
        return this.onaccept(data);
      default:
    }

    if (this.clientId) {
      data.clientId = this.clientId
    }

    this.emit(type, data);
  }

  onresponse(response) {
    const res = this.$response[response.messageId];

    if (!res) return;

    if (response.error) {
      return res.reject(new Error(response.error));
    }

    if (response.body && response.contentLength) {
      const { body, contentLength } = response;

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
  }

  onaccept({ messageId }) {
    const res = this.$response[messageId];

    if (res && res.resolve) res.resolve();
  }

  sendRegister(data={}) {
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

  sendRespondCommand(data={}, type='', timeout=-1) {
    const messageId = uuidv4();

    return new Promise(( resolve, reject ) => {
      let $timeout;

      if (timeout >= 0) {
        $timeout = setTimeout(() => reject(new Error('Request Timeout')), timeout * 1000);
      }

      this.$response[messageId] = {
        resolve,
        reject,
        $timeout,
      };
      this.send({
        type,
        data: {
          messageId,
          ...data
        },
      });
    }).finally(() => {
      const { $timeout } = this.$response[messageId];

      if ($timeout) clearTimeout($timeout);

      delete this.$response[messageId];
    });
  }

  sendRequest(data={}) {
    return this.sendRespondCommand(data, 'request', 30);
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

  sendReject(messageId, data) {
    this.send({
      type: 'response',
      data: {
        messageId,
        ...data,
      },
    });
  }

  sendSubmit(data={}) {
    return this.sendRespondCommand(data, 'submit');
  }

  sendAccept(messageId) {
    this.send({
      type: 'accept',
      data: {
        messageId,
      },
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
