import EventEmitter from 'events';
import short from 'short-uuid';
import Client from '../Client.js';
import Protocol from '../Protocol.js';

import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';


export default class ChatClientService extends EventEmitter {
  constructor({ id=short.generate(), name, avatar, db }={}) {
    super();

    this.service = new Client({ name, avatar });
    this.service.on('error', (error) => this.emit('error', error));

    this.channel = null;
    this.storeChat = new StoreChat({ db });
    this.storeHistory = new StoreHistory({ db });

    this.id = id;
    this.profile = null;
    this.participants = {
      'self': {
        name,
        avatar,
      }
    };
  }

  async connect({ tunnel, siteId, password }={}) {
    const { service } = this;

    await service.connect({ tunnel, siteId, password });

    const { dataChannel } = service;
    const channel = new Protocol({ dataChannel })

    channel.on('profile', (profile) => this.onprofile(profile));
    channel.on('message', (data) => this.onmessage(data));
    channel.on('register', (data) => this.onregister(data));
    channel.on('deregister', (data) => this.onderegister(data));
    channel.on('close', () => this.onclose());

    this.channel = channel;

    const { name, avatar } = this.participants.self;

    this.channel.sendRegister({ name, avatar });
  }

  async onprofile(profile) {
    const { id, position, type, title } = profile;

    this.profile = profile;
    this.emit('profile', profile);
    this.storeHistory.create({
      id: this.id,
      action: 'join',
      siteId: id,
      position,
      type,
      title,
    }).catch((err) => {
      console.warn('storeHistory.create failed:', err)
    });
  }

  onregister(data) {
    const { name, avatar, clientId } = data;
    const { id, participants } = this;

    this.participants[clientId] = { name, avatar };
    this.emit('register', {
      ...data,
      time: Date.now(),
    });
    this.storeHistory.update(id, { participants });
  }

  onmessage(data) {
    const { clientId } = data;
    const { name, avatar } = this.participants[clientId] || {};

    this.emit('message', {
      ...data,
      name,
      avatar,
    });
    this.storeMessage(data);
  }

  onclose() {
    this.service.removeAllListeners();
    this.service.close();
    this.service = null;
    this.emit('close');
  }

  onderegister(data) {
    const { clientId } = data;
    const participant = this.participants[clientId];

    if (participant) {
      this.emit('deregister', {
        ...data,
        name: participant.name,
      });
    }
  }

  sendMessage(message) {
    const time = Date.now();
    const data = { message, time };

    this.channel.sendMessage(data);
    this.storeMessage({
      ...data,
      clientId: 'self',
    });
  }

  storeMessage(data) {
    this.storeChat.create({
      historyId: this.id,
      time: Date.now(),
      ...data,
    });
  }

  close() {
    this.service?.close();
  }
}
