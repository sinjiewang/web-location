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

    connection.on('message', (event) => this.onmessage(event));
    // connection.on('register', (event) => this.onregister(event));

    this.connections[clientId] = connection;
  }

  ondisconnect({ clientId }) {
    // const { name } = this.participants[clientId] || {};
    const connection = this.connections[clientId];
    // const time = Date.now();

    if (connection) {
      delete this.connections[clientId];

      // this.broadcast({
      //   data: { clientId, time },
      //   type: 'deregister',
      // });
      // this.emit('deregister', {
      //   clientId,
      //   name,
      //   time,
      // });
    }
  }

  // onregister(event) {
  //   const { clientId, name, avatar } = event;
  //   const { connections, participants, profile } = this;
  //   const connection = connections[clientId];
  //   const time = Date.now();

  //   this.register({
  //     id: clientId,
  //     name,
  //     avatar
  //   });
  //   this.broadcast({
  //     excepts: [clientId],
  //     data: { name, avatar, clientId, time },
  //     type: 'register',
  //   });
  //   connection.send({
  //     type: 'profile',
  //     data: {
  //       ...profile,
  //       time,
  //     },
  //   });
  //   connection.send({
  //     type: 'register',
  //     data: {
  //       clientId: 'host',
  //       name: participants['host'].name,
  //       avatar: participants['host'].avatar,
  //       time,
  //     },
  //   })
  //   Object.keys(connections)
  //     .filter((id) => id !== clientId)
  //     .forEach((id) => connection.send({
  //       type: 'register',
  //       data: {
  //         clientId: id,
  //         name: participants[id].name,
  //         avatar: participants[id].avatar,
  //         time,
  //       },
  //     }));

  //   this.emit('register', event);
  //   this.storeHistory.update(this.id, { participants });
  // }

  onmessage({ time, message, clientId }) {
    const { name, avatar } = this.participants[clientId] || {};
    // const newChat = {
    //   clientId,
    //   time,
    //   message,
    // };
    // this.broadcast({
    //   excepts: [clientId],
    //   data: newChat,
    // });
    // this.emit('message', {
    //   ...newChat,
    //   name,
    //   avatar,
    // });
    // this.storeChat.create({
    //   clientId,
    //   message,
    //   historyId: this.id,
    //   time: Date.now(),
    // });
  }

  sendMessage(data) {
    // this.storeMessage(data);
    // this.broadcast({
    //   data: {
    //     clientId: 'host',
    //     ...data,
    //   }
    // });
  }

  // storeMessage(data) {
  //   this.storeChat.create({
  //     historyId: this.id,
  //     time: Date.now(),
  //     ...data,
  //   });
  // }
  createPost(data) {
    this.updateHistory();

    return this.storePost.create({
      ...data,
      id: short.generate(),
      historyId: this.id,
    });
  }

  updatePost(id, data) {
    this.updateHistory();

    return this.storePost.update(id, data);
  }

  async deletePost(id) {
    await this.storePost.delete(id);

    const comments = await this.storeComment.queryByPostId(id);

    comments.forEach(({ id }) => this.storeComment.delete(id)
      .catch((err) => console.error('storeComment.delete failed', err)));

    this.updateHistory();
  }

  createComment(data) {
    return this.storeComment.create({
      ...data,
      id: short.generate(),
    });
  }

  updateHistory(data={}) {
    this.storeHistory.update(this.id, {
      ...data
    });
  }

  getPosts() {
    return this.storePost.queryByHistoryId(this.id)
      .then((posts) => posts.sort((a, b) => b.createdTime - a.createdTime));
  }

  getCommentsByPostId(id) {
    return this.storeComment.queryByPostId(id);
  }

  deleteComment(id) {
    return this.storeComment.delete(id);
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

  close() {
    this.service?.close();
  }
}
