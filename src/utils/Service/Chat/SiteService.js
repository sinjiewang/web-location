import EventEmitter from 'events';
import short from 'short-uuid';
import Site from '../Site.js';

import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import StoreFile from '@/utils/IndexedDB/StoreFile';

import Protocol from '../Protocol.js';
// import genThumbnail from '../../genThumbnail.js';

export default class ChatSiteService extends EventEmitter {
  constructor({ id=short.generate(), tunnel, profile={}, db }={}) {
    super();

    const service = new Site({ id, tunnel, profile });

    service.on('connect', (event) => this.onconnect(event));
    service.on('disconnect', (event) => this.ondisconnect(event));

    this.service = service;
    this.storeHistory = new StoreHistory({ db });
    this.storeChat = new StoreChat({ db });
    this.storeFile = new StoreFile({ db });
    this.id = id;
    this.profile = profile;
    this.connections = {};
    this.participants = {
      'host': {
        name: 'HOST',
        avatar: null,
      }
    };
    this.$submit = {};
  }

  async init() {
    const { id, profile, storeChat, storeHistory } = this;
    const history =  await storeHistory.queryById(id);

    if (history) {
      const { title, position } = profile;

      storeHistory.update(id, {
        title,
        position: {
          lat: position.lat,
          lng: position.lng
        },
      });

      const { participants } = history;

      Object.keys(participants).forEach((clientId) => this.register({
        ...participants[clientId],
        id: clientId,
      }));

      const messages = await storeChat.queryByHistoryId(id);

      messages.forEach((message) => {
        const { name, avatar } = participants[message.clientId] || {};

        this.emit('message', {
          ...message,
          name,
          avatar,
        });
      });
    } else {
      const participants = this.participants;
      const { lat, lng } = profile.position;

      this.storeHistory.create({
        ...profile,
        position: { lat, lng },
        action: 'create',
        participants,
      });
    }
  }

  onconnect({ clientId, dataChannel }) {
    const connection = new Protocol({ clientId, dataChannel });

    connection.on('message', (event) => this.onmessage(event));
    connection.on('register', (event) => this.onregister(event));
    connection.on('request', (event) => this.onrequest(event));
    connection.on('submit', (event) => this.onsubmit(event));

    this.connections[clientId] = connection;
  }

  ondisconnect({ clientId }) {
    const { name } = this.participants[clientId] || {};
    const connection = this.connections[clientId];
    const time = Date.now();

    if (connection) {
      delete this.connections[clientId];

      this.broadcast({
        data: { clientId, time },
        type: 'deregister',
      });
      this.emit('deregister', {
        clientId,
        name,
        time,
      });
    }
  }

  onregister(event) {
    const { clientId, name, avatar } = event;
    const { connections, participants, profile } = this;
    const connection = connections[clientId];
    const time = Date.now();

    this.register({
      id: clientId,
      name,
      avatar
    });
    this.broadcast({
      excepts: [clientId],
      data: { name, avatar, clientId, time },
      type: 'register',
    });
    connection.send({
      type: 'profile',
      data: {
        ...profile,
        time,
      },
    });
    connection.send({
      type: 'register',
      data: {
        clientId: 'host',
        name: participants['host'].name,
        avatar: participants['host'].avatar,
        time,
      },
    })
    Object.keys(connections)
      .filter((id) => id !== clientId)
      .forEach((id) => connection.send({
        type: 'register',
        data: {
          clientId: id,
          name: participants[id].name,
          avatar: participants[id].avatar,
          time,
        },
      }));

    this.emit('register', event);
    this.storeHistory.update(this.id, { participants });
  }

  onmessage({ time=Date.now(), message, clientId }) {
    const { name, avatar } = this.participants[clientId] || {};
    const newChat = {
      clientId,
      time,
      message,
    };
    this.broadcast({
      excepts: [clientId],
      data: newChat,
    });
    this.emit('message', {
      ...newChat,
      name,
      avatar,
    });
    this.storeChat.create({
      clientId,
      message,
      historyId: this.id,
      time: Date.now(),
    });
  }

  async onrequest({ id, clientId, messageId }) {
    const connection = this.connections[clientId];

    try {
      const { src } = await this.storeFile.queryById(id);

      connection.sendResponse(messageId, src);
    } catch (err) {
      console.warn('handle request failed', err);
    }
  }

  onsubmit(submit) {
    const { clientId, messageId } = submit;
    const { name, avatar } = this.participants[clientId];

    this.$submit[messageId] = submit;
    this.emit('message', {
      ...submit,
      avatar,
      name,
      accepted: false,
    });
  }

  async acceptMessage(messageId) {
    const submit = this.$submit[messageId];

    if (!submit) return Promise.reject(new Error('message does not exist'));

    const { clientId, message } = submit;
    const promises = message.map(({id}) => this.getFileFromClient({
      clientId,
      fileId: id,
    }));

    await Promise.all(promises);

    this.onmessage({ message, clientId });

    const connection = this.connections[clientId];

    connection.sendAccept(messageId);
  }

  sendMessage({ message, time=Date.now() }) {
    const data = {
      clientId: 'host',
      message,
      time,
    }
    this.storeMessage(data);
    this.broadcast({ data });
    this.emit('message', {
      ...data,
      avatar: this.participants['host'].avatar,
    });
  }

  async sendImages({ images, time=Date.now() }) {
    const promises = images.map(async (imageInfo) => {
      const id = short.generate();
      const { thumbnailSrc } = await this.storeFile.createImage({ id, ...imageInfo });

      return {
        id,
        src: thumbnailSrc,
      };
    });
    const message = await Promise.all(promises);
    const data = {
      clientId: 'host',
      message,
      time,
    };

    this.storeMessage(data);
    this.broadcast({ data });
    this.emit('message', {
      ...data,
      avatar: this.participants['host'].avatar,
    });
  }

  storeMessage(data) {
    this.storeChat.create({
      historyId: this.id,
      time: Date.now(),
      ...data,
    });
  }

  broadcast({ data, type='message', excepts=[] }={}) {
    const { connections } = this;
    Object.keys(connections)
      .filter((clientId) => !excepts.includes(clientId))
      .forEach((clientId) => connections[clientId].send({
        type,
        data,
      }));
  }

  register({ id='host', name, avatar }) {
    const participant = this.participants[id] || {};
    this.participants[id] = {
      name: name || participant.name,
      avatar: avatar || participant.avatar,
    }
  }

  async getImageSrc(id) {
    const { src } = await this.storeFile.queryById(id);

    return src;
  }

  async getFileFromClient({ clientId, fileId }) {
    const connection = this.connections[clientId];

    if (!connection) return Promise.reject(new Error('Disconnect'));

    const src = await connection.sendRequest({
      id: fileId,
      type: 'image',
    });

    this.storeFile.create({
      id: fileId,
      src,
    });

    return src;
  }

  close() {
    this.service?.close();
  }
}
