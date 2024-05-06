import EventEmitter from 'events';
import short from 'short-uuid';
import Client from '../Client.js';
import Protocol from '../Protocol.js';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import StoreFile from '@/utils/IndexedDB/StoreFile';


export default class ChatClientService extends EventEmitter {
  constructor({ id=short.generate(), name, avatar, db }={}) {
    super();

    this.service = new Client({ name, avatar });
    this.service.on('error', (error) => this.emit('error', error));

    this.channel = null;
    this.storeHistory = new StoreHistory({ db });
    this.storeFile = new StoreFile({ db });

    this.id = id;
    this.profile = null;
    this.remoteFiles = [];
    this.$submit = {};
  }

  async connect({ tunnel, siteId, password }={}) {
    const { service } = this;

    await service.connect({ tunnel, siteId, password });

    const { dataChannel } = service;
    const channel = new Protocol({ dataChannel })

    channel.on('profile', (profile) => this.onprofile(profile));
    channel.on('request', (event) => this.onrequest(event));
    channel.on('close', () => this.onclose());

    this.channel = channel;
    this.getProfile();
  }

  async onprofile(profile) {
    const { id, position, type, title, name, avatar } = profile;

    this.profile = profile;
    this.emit('profile', profile);

    const item = await this.storeHistory.queryById(this.id);

    if (!item) {
      this.storeHistory.create({
        id: this.id,
        action: 'join',
        siteId: id,
        position,
        type,
        title,
        host: { name, avatar },
        remoteFiles: [],
      }).catch((err) => {
        console.warn('storeHistory.create failed:', err)
      });
    }
  }

  onclose() {
    this.service.removeAllListeners();
    this.service.close();
    this.service = null;
    this.emit('close');
  }

  async onrequest({ id, messageId }) {
    try {
      const { src } = await this.storeFile.queryById(id);

      this.channel.sendResponse(messageId, src);
    } catch (err) {
      console.warn('handle request failed', err);
    }
  }

  async getFileSrc(id, type) {
    let src;

    src = await this.storeFile.queryById(id)
      .then(({ src }) => src)
      .catch(() => null);

    if (!src) {
      src = await this.channel.sendRequest({
        id,
        type,
      });
      this.storeFile.create({
        id,
        src,
      });
    }

    return src;
  }

  async sendfile({ id, name, type, size }) {
    return this.channel.sendSubmit({
      id,
      name,
      type,
      size,
    });
  }

  getProfile() {
    this.channel.sendRegister();
  }

  async getFiles({ offset=0, limit=10 }={}) {
    if (offset === 0) {
      this.remoteFiles = [];
    }

    const files = await this.channel.sendRequest({
      offset,
      limit,
      type: 'query'
    }).then((res) => JSON.parse(res));

    this.remoteFiles = [...this.remoteFiles, ...files];
    this.storeHistory.update(this.id, {
      remoteFiles: JSON.parse(JSON.stringify(this.remoteFiles)),
    });

    return files;
  }

  async getFileFromServer({ fileId }) {
    const src = await this.channel.sendRequest({
      fileId: fileId,
      type: 'fetch',
    });
    return src;
  }

  close() {
    this.service?.close();
  }
}
