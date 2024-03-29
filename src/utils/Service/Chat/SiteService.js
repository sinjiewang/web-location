import EventEmitter from 'events';
import Service from '../Site.js';

import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';

import Protocol from './Protocol.js'

export default class ChatSiteService extends EventEmitter {
  constructor({ id=short.generate(), tunnel, profile={}, db }={}) {
    super();

    const service = new Service({ id, tunnel, profile });

    service.on('connect', (event) => this.onconnect(event));
    service.on('disconnect', (event) => this.ondisconnect(event));

    this.service = service;
    this.storeHistory = new StoreHistory({ db });
    this.storeChat = new StoreChat({ db });
    this.id = id;
    this.profile = profile;
    this.connections = {};
    this.participants = {
      'host': {
        name: 'HOST',
        avatar: null,
      }
    };
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
      const participants = this.service.participants;
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

  onmessage({ time, message, clientId }) {
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

  sendMessage(data) {
    this.storeMessage(data);
    this.broadcast({
      data: {
        clientId: 'host',
        ...data,
      }
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

  close() {
    this.service?.close();
  }
}
