import EventEmitter from 'events';
import short from 'short-uuid';
import Client from '../Client.js';
import Protocol from '../Protocol.js';
import genThumbnail from '../../genThumbnail.js';

import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import StoreFile from '@/utils/IndexedDB/StoreFile';


export default class ChatClientService extends EventEmitter {
  constructor({ id=short.generate(), name, avatar, db }={}) {
    super();

    this.service = new Client({ name, avatar });
    this.service.on('error', (error) => this.emit('error', error));

    this.channel = null;
    this.storeChat = new StoreChat({ db });
    this.storeHistory = new StoreHistory({ db });
    this.storeFile = new StoreFile({ db });

    this.id = id;
    this.profile = null;
    this.participants = {
      'self': {
        name,
        avatar,
      }
    };
    this.$submit = {};
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
    channel.on('request', (event) => this.onrequest(event));
    // channel.on('accept', (event) => this.onaccept(event));
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

  async onrequest({ id, messageId }) {
    try {
      const { src } = await this.storeFile.queryById(id);

      this.channel.sendResponse(messageId, src);
    } catch (err) {
      console.warn('handle request failed', err);
    }
  }

  async onaccept({ messageId }) {
    // try {
    //   const { src } = await this.storeFile.queryById(id);

    //   this.channel.sendResponse(messageId, src);
    // } catch (err) {
    //   console.warn('handle request failed', err);
    // }
  }

  sendMessage(message) {
    const time = Date.now();
    const data = { message, time };
    const clientId = 'self';
    const { avatar } = this.participants[clientId];

    this.channel.sendMessage(data);
    this.storeMessage({
      ...data,
      clientId,
    });
    this.emit('message', {
      ...data,
      clientId,
      avatar,
    });
  }

  storeMessage(data) {
    this.storeChat.create({
      historyId: this.id,
      time: Date.now(),
      ...data,
    });
  }

  async getImageSrc(id) {
    let src;

    src = await this.storeFile.queryById(id)
      .then(({ src }) => src)
      .catch(() => null);

    if (!src) {
      src = await this.channel.sendRequest({
        id,
        type: 'image',
      });
      this.storeFile.create({
        id,
        src,
      });
    }

    return src;
  }

  async sendImages({ images, time=Date.now() }) {
    const promises = images.map(async (src) => {
      const id = short.generate();

      await this.storeFile.create({ id, src });

      const { thumbnailSrc } = await genThumbnail(src);

      return {
        id,
        src: thumbnailSrc,
      };
    });
    const message = await Promise.all(promises);
    const data = {
      message,
      time,
    };
    const clientId = 'self';
    const { avatar } = this.participants[clientId];

    this.emit('message', {
      ...data,
      clientId,
      avatar,
      accepted: false,
    });

    return this.channel.sendSubmit(data)
      .then(() => {
        this.storeMessage({
          ...data,
          clientId,
        });
        this.emit('message', {
          ...data,
          clientId,
          avatar,
        });

        return message;
      });
  }

  close() {
    this.service?.close();
  }
}
