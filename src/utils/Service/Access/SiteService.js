import EventEmitter from 'events';
import short from 'short-uuid';
import Site from '../Site.js';

import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import StoreFile from '@/utils/IndexedDB/StoreFile';

import Protocol from '../Protocol.js';

export default class ChatSiteService extends EventEmitter {
  constructor({ id=short.generate(), tunnel, profile={}, db }={}) {
    super();

    const service = new Site({ id, tunnel, profile });

    service.on('connect', (event) => this.onconnect(event));
    service.on('disconnect', (event) => this.ondisconnect(event));

    this.service = service;
    this.storeHistory = new StoreHistory({ db });
    this.storeFile = new StoreFile({ db });
    this.id = id;
    this.profile = profile;
    this.connections = {};

    this.$submit = {};
    this.files = [];
  }

  get allowUpload () {
    return this.profile.allowUpload;
  }

  async init() {
    const { id, profile, storeHistory } = this;
    const history =  await storeHistory.queryById(id);

    if (history) {
      this.updateProfile(profile);

      this.profile.allowUpload = history.allowUpload;

      const allowIds = history.allowIds || [];

      this.allowIds = allowIds;
      this.files = await Promise.all(allowIds.map(async (id) => {
        const file = await this.storeFile.queryById(id);

        if (!file) {
          this.allowIds = this.allowIds.filter((allowId) => allowId !== id);

          return null;
        };

        const { info, name, size, thumbnailSrc, type, updatedTime } = file;

        return {
          id,
          name,
          size,
          info,
          thumbnailSrc,
          type,
          updatedTime,
        };
      }));
    } else {
      const { lat, lng } = profile.position;

      this.storeHistory.create({
        ...profile,
        position: { lat, lng },
        action: 'create',
        allowIds: [],
      });
    }
  }

  onconnect({ clientId, dataChannel }) {
    const connection = new Protocol({ clientId, dataChannel });

    connection.on('register', (event) => this.onregister(event));
    connection.on('request', (event) => this.onrequest(event));
    connection.on('submit', (event) => this.onsubmit(event));

    this.connections[clientId] = connection;
    this.emit('connect', { clientId, dataChannel });
  }

  ondisconnect({ clientId }) {
    const connection = this.connections[clientId];

    if (connection) {
      delete this.connections[clientId];
    }

    this.emit('disconnect', { clientId });
  }

  onregister(event) {
    const { clientId } = event;
    const { connections, name, avatar, profile } = this;
    const connection = connections[clientId];
    const time = Date.now();

    connection.send({
      type: 'profile',
      data: {
        ...profile,
        time,
        name,
        avatar,
      },
    });
  }

  async onrequest(params) {
    const { clientId, messageId} = params;

    switch (params.type) {
      case 'fetch':
        const { fileId } = params;

        this.handleFileRequest({
          clientId,
          messageId,
          fileId,
        });
        break;
      default:
        const { limit=10, offset=0 } = params;

        this.handleQueryRequest({
          clientId,
          messageId,
          offset,
          limit,
        });
    }
  }

  async handleFileRequest({ clientId, messageId, fileId }) {
    const connection = this.connections[clientId];

    if (this.files.includes(fileId)) {
      return connection.sendReject(messageId, {
        error: 'Forbidden',
        code: 403,
      });
    }

    try {
      const { src } = await this.storeFile.queryById(fileId);

      connection.sendResponse(messageId, src);
    } catch (err) {
      console.warn('handle request failed', err);

      connection.sendReject(messageId, {
        error: 'Not Found',
        code: 404,
      });
    }
  }

  handleQueryRequest({ clientId, messageId, offset, limit }) {
    const connection = this.connections[clientId];
    const res = this.files.slice(offset, offset + limit);

    connection.sendResponse(messageId, JSON.stringify(res));
  }

  async onsubmit(submit) {
    const { clientId, messageId, id, name, type, size } = submit;
    const connection = this.connections[clientId];

    if (!this.profile.allowUpload) {
      return connection.sendReject(messageId, {
        error: 'Forbidden',
        code: 403,
      });
    }

    const src = await this.getFileFromClient({
      clientId,
      fileId: id,
    });

    this.emit('file', {
      id,
      name,
      type,
      src,
      size,
    });

    connection.sendAccept(messageId);
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

  register({ name, avatar }) {
    this.name = name;
    this.avatar = avatar;
  }

  async getFileFromClient({ clientId, fileId }) {
    const connection = this.connections[clientId];

    if (!connection) return Promise.reject(new Error('Disconnect'));

    const src = await connection.sendRequest({
      id: fileId,
      type: 'image',
    }, -1);

    return src;
  }

  setFiles(files=[]) {
    const allowIds = files.map((file) => file.id);

    this.files = files;
    this.storeHistory.update(this.id, { allowIds });
    this.allowIds = allowIds;
  }

  setProfile(props={}) {
    this.profile = {
      ...this.profile,
      ...props,
    };

    this.updateProfile(this.profile);
  }

  updateProfile(profile) {
    const { title, position, allowUpload } = profile;
    const data = {};

    if (title) {
      data.title = title;
    }

    if (position) {
      data.position = {
        lat: position.lat,
        lng: position.lng
      };
    }

    if (allowUpload !== undefined) {
      data.allowUpload = allowUpload;
    }

    this.storeHistory.update(this.id, data);
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
