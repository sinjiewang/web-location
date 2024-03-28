import EventEmitter from 'events';
import Service from './index.js';

import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';


export default class ChatService extends EventEmitter {
  constructor({ id=short.generate(), tunnel, profile={}, db }={}) {
    super();

    const service = new Service({ id, tunnel, profile });

    service.on('register', (event) => this.onregister(event))
    service.on('deregister', (event) => this.onderegister(event))
    service.on('message', (event) => this.onmessage(event))

    this.service = service;
    this.storeHistory = new StoreHistory({ db });
    this.storeChat = new StoreChat({ db });
    this.id = id;
    this.profile = profile;
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

  onregister(event) {
    this.emit('register', event);

    const { participants } = this.service;

    this.storeHistory.update(this.id, { participants });
  }

  onderegister(event) {
    this.emit('deregister', event)
  }

  onmessage(event) {
    const { clientId, message } = event;
    this.emit('message', event);
    this.storeChat.create({
      clientId,
      message,
      historyId: this.id,
      time: Date.now(),
    });
  }

  sendMessage(data) {
    this.service.sendMessage(data.message);
    this.storeMessage(data);
  }

  storeMessage(data) {
    this.storeChat.create({
      historyId: this.id,
      time: Date.now(),
      ...data,
    });
  }

  register(params) {
    this.service.register(params);
  }

  close() {
    this.service?.close();
  }
}
