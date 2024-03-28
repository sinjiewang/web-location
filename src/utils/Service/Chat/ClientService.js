import EventEmitter from 'events';
import short from 'short-uuid';
import Service from '../Client.js';

import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';


export default class ChatClientService extends EventEmitter {
  constructor({ name, avatar, db }={}) {
    super();

    this.id = short.generate();
    this.service = new Service({ name, avatar });
    this.storeChat = new StoreChat({ db });
    this.storeHistory = new StoreHistory({ db });
  }

  async connect({ tunnel, siteId }={}) {
    const { service } = this;
    await service.connect({ tunnel, siteId });

    service.on('profile', (event) => this.onprofile(event));
    service.on('message', (event) => this.onmessage(event));
    service.on('register', (event) => this.onregister(event));
    service.on('deregister', (event) => this.onderegister(event));
    service.on('close', () => this.onclose());
  }

  async onprofile(profile) {
    const { id, position, type, title } = profile;

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
    const { id, service } = this;
    const { participants } = service;

    this.emit('register', {
      ...data,
      time: Date.now(),
    });
    this.storeHistory.update(id, { participants });
  }

  onmessage(data) {
    this.emit('message',data);
    this.storeMessage(data);
  }

  onclose() {
    this.service.removeAllListeners();
    this.service = null;
    this.emit('close');
  }

  onderegister(data) {
    this.emit('deregister', data);
  }

  sendMessage(message) {
    const time = Date.now();
    const data = { message, time };

    this.service.sendMessage(message);
    this.storeMessage({
      ...data,
      clientId: 'self',
    });
  }

  register({ id='self', name, avatar }={}) {
    this.participants[id] = { name, avatar };
  }

  storeMessage(data) {
    this.storeChat.create({
      historyId: this.id,
      time: Date.now(),
      ...data,
    });
  }
}
