import EventEmitter from 'events';
import short from 'short-uuid';
import Client from '../Client.js';
import Protocol from '../Protocol.js';

import StoreComment from '@/utils/IndexedDB/StoreComment';
import StorePost from '@/utils/IndexedDB/StorePost';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';


export default class ChatClientService extends EventEmitter {
  constructor({ id=short.generate(), name, avatar, db }={}) {
    super();

    this.service = new Client({ name, avatar });
    this.service.on('error', (error) => this.emit('error', error));
    this.channel = null;
    this.storePost = new StorePost({ db });
    this.storeComment = new StoreComment({ db });
    this.storeHistory = new StoreHistory({ db });

    this.id = id;
    this.name = name;
    this.avatar = avatar;
    this.profile = null;
    this.promises = {};
    this.host = {};
  }

  async connect({ tunnel, siteId, password }={}) {
    const { service } = this;

    await service.connect({ tunnel, siteId, password });

    const { dataChannel } = service;
    const channel = new Protocol({ dataChannel })

    channel.on('profile', (profile) => this.onprofile(profile));
    channel.on('message', (data) => this.onmessage(data));
    channel.on('register', (data) => this.onregister(data));
    channel.on('close', () => this.onclose());

    this.channel = channel;
  }

  async onprofile(profile) {
    const { id, position, type, title } = profile;

    const history = await this.storeHistory.queryById(id);

    if (history) {
      await this.storeHistory.update(id, {
        position,
        type,
        title,
      });
    } else {
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

    this.profile = profile;
    this.emit('profile', profile);
  }

  onregister(data) {
    const { name, avatar } = data;
    const { id } = this;

    this.host = { name, avatar };
    this.storeHistory.update(id, { host: this.host });
  }

  onmessage(data) {
    const { messageId } = data;
    const promise = this.promises[messageId]

    if (promise) {
      promise.resolve(data);
    }

    const { type } = data;

    if (type === 'post') {
      const { name, avatar } = this.host;

      this.emit(type, {
        ...data,
        item: {
          ...data.item,
          name,
          avatar,
        },
      });
    } else {
      this.emit(type, data);
    }
  }

  onclose() {
    this.service.removeAllListeners();
    this.service.close();
    this.service = null;
    this.emit('close');
  }

  sendMessage(message) {
    const time = Date.now();
    const data = { message, time };

    this.channel.sendMessage(data);
  }

  async sendMessageWithResponse(message) {
    const messageId =  short.generate();
    let timeout;

    this.sendMessage({
      ...message,
      messageId,
    })

    return new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Request Timeout')), 30 * 1000);

      this.promises[messageId] = { resolve, reject };
    })
    .finally(() => {
      clearTimeout(timeout);

      delete this.promises[messageId];
    });
  }

  async getPosts() {
    const { items } = await this.sendMessageWithResponse({
      action: 'getPosts',
    }).catch((err) => {
      console.warn('getPosts failed:', err);

      return [];
    });
    const postsInStore = await this.storePost.queryByHistoryId(this.id);

    await Promise.all(postsInStore.map(({ id }) => this.storePost.delete(id)));

    items.forEach(item => this.storePost.create(item));

    const { name, avatar } = this.host;

    return items.map((item) => ({
      ...item,
      name,
      avatar,
    }));
  }

  getComments(postId) {
    return this.sendMessageWithResponse({
      action: 'getComments',
      postId,
    });
  }

  async appendComment({ postId, content, name, avatar }, post) {
    const { comment } = await this.sendMessageWithResponse({
      action: 'appendComment',
      postId, content, name, avatar,
    });

    if (!post) return;

    const postInStore = await this.storePost.queryById(post.id);

    if (!postInStore) {
      const { id, content, title, historyId, createdTime, updatedTime } = post;

      await this.storePost.create({ id, content, title, historyId, createdTime, updatedTime });
    }

    this.storeComment.create(comment);
  }

  close() {
    this.service?.close();
  }
}
