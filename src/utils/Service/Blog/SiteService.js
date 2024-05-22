import EventEmitter from 'events';
import short from 'short-uuid';
import Site from '../Site.js';

import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import StorePost from '@/utils/IndexedDB/StorePost';
import StoreComment from '@/utils/IndexedDB/StoreComment';

import Protocol from '../Protocol.js'

export default class BlogSiteService extends EventEmitter {
  constructor({ id=short.generate(), profile={}, db }={}) {
    super();

    this.storeHistory = new StoreHistory({ db });
    this.storePost = new StorePost({ db });
    this.storeComment = new StoreComment({ db });
    this.id = id;
    this.profile = profile;
    this.host = {};
    this.connections = {};
    this.service = null;
  }

  async init(tunnel) {
    const { id, profile, storeHistory/*, storeChat*/ } = this;
    const service = new Site({ id, tunnel, profile });

    service.on('connect', (event) => this.onconnect(event));
    service.on('disconnect', (event) => this.ondisconnect(event));

    this.service = service;

    const history = await storeHistory.queryById(id);

    if (history) {
      const { title, position } = profile;

      this.updateHistory({
        title,
        position: {
          lat: position.lat,
          lng: position.lng
        },
      });
    } else {
      const { lat, lng } = profile.position;

      this.storeHistory.create({
        ...profile,
        position: { lat, lng },
        action: 'create',
      });
    }
  }

  onconnect({ clientId, dataChannel }) {
    const connection = new Protocol({ clientId, dataChannel });
    const { profile, host } = this;
    const time = Date.now()

    connection.on('message', (event) => this.onmessage(event));
    // connection.on('register', (event) => this.onregister(event));

    this.connections[clientId] = connection;

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
        name: host.name,
        avatar: host.avatar,
        time,
      },
    });

    this.emit('connect', { clientId, dataChannel });
  }

  ondisconnect({ clientId }) {
    const connection = this.connections[clientId];

    if (connection) {
      delete this.connections[clientId];
    }

    this.emit('disconnect', { clientId });
  }

  onmessage({ message, clientId }) {
    const data = {
      clientId,
      ...message,
    };

    switch(message.action) {
      case 'getPosts':
        return this.responsePosts(data);
      case 'getComments':
        return this.responseComments(data);
      case 'appendComment':
        return this.appendComment(data);
    }
  }

  async createPost(data) {
    this.updateHistory();

    const post = await this.storePost.create({
      ...data,
      id: short.generate(),
      historyId: this.id,
    });

    this.broadcast({
      data: {
        type: 'post',
        method: 'add',
        item: post,
      },
    });

    return post;
  }

  async updatePost(id, data) {
    const post = await this.storePost.update(id, data);

    this.updateHistory();
    this.broadcast({
      data: {
        type: 'post',
        method: 'update',
        item: post,
      },
    });
  }

  async deletePost(id) {
    await this.storePost.delete(id);

    const comments = await this.storeComment.queryByPostId(id);

    comments.forEach(({ id }) => this.storeComment.delete(id)
      .catch((err) => console.error('storeComment.delete failed', err)));

    this.updateHistory();
    this.broadcast({
      data: {
        type: 'post',
        method: 'delete',
        item: { id },
      },
    });
  }

  async createComment({ postId, content, name, avatar }) {
    const comment = await  this.storeComment.create({
      postId,
      content,
      name,
      avatar,
      id: short.generate(),
    });

    this.broadcast({
      data: {
        type: 'comment',
        method: 'add',
        item: comment,
      },
    });

    return comment;
  }

  updateHistory(data={}) {
    this.storeHistory.update(this.id, {
      ...data
    });
  }

  $getPosts() {
    return this.storePost.queryByHistoryId(this.id)
      .then((posts) => posts.sort((a, b) => b.createdTime - a.createdTime));
  }

  getPosts() {
    const { name, avatar } = this.host;

    return this.$getPosts()
      .then((posts) => posts.map((post) => ({ ...post, name, avatar })));
  }

  async responsePosts({messageId, clientId}={}) {
    const posts = await this.$getPosts();
    const connection = this.connections[clientId];

    connection.sendMessage({
      messageId,
      items: posts,
    });
  }

  getCommentsByPostId(id) {
    return this.storeComment.queryByPostId(id)
      .then((posts) => posts.sort((a, b) => a.createdTime - b.createdTime));
  }

  async deleteComment(id) {
    await this.storeComment.delete(id);
    this.broadcast({
      data: {
        type: 'comment',
        method: 'delete',
        item: { id },
      },
    });
  }

  async responseComments({messageId, clientId, postId}={}) {
    const comments = await this.getCommentsByPostId(postId);
    const connection = this.connections[clientId];

    connection.sendMessage({
      messageId,
      items: comments,
    });
  }

  async appendComment({ clientId, postId, content, name, avatar, messageId}) {
    const comment = await this.createComment({ postId, content, name, avatar });

    this.emit('comment', comment);

    const connection = this.connections[clientId];

    connection.sendMessage({
      messageId,
      comment,
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

  register({ name, avatar }={}) {
    this.host = { name, avatar };
  }

  close() {
    this.service?.close();
  }

  updateTunnel(tunnel) {
    this.service.updateTunnel(tunnel);
  }

  get connectionCount() {
    return Object.keys(this.connections).length;
  }
}
