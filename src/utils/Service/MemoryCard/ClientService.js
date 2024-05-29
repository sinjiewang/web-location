import EventEmitter from 'events';
import short from 'short-uuid';
import Client from '../Client.js';
import Protocol from '../Protocol.js';

export default class ChatClientService extends EventEmitter {
  constructor({ id=short.generate(), name, avatar }={}) {
    super();

    this.service = new Client({ name, avatar });
    this.service.on('error', (error) => this.emit('error', error));

    this.channel = null;
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
    channel.on('command', (data) => this.oncommand(data));
    channel.on('register', (data) => this.onregister(data));
    channel.on('deregister', (data) => this.onderegister(data));
    channel.on('close', () => this.onclose());

    this.channel = channel;

    const { name, avatar } = this.participants.self;

    this.channel.sendRegister({ name, avatar });
  }

  async onprofile(profile) {
    this.profile = profile;
    this.emit('profile', profile);
  }

  onregister(data) {
    const { name, avatar, clientId } = data;

    this.participants[clientId] = { name, avatar };
    this.emit('register', {
      ...data,
      time: Date.now(),
    });
  }

  onmessage(data) {
    this.emit('message', data);
  }

  oncommand(data) {
    this.emit('command', data);
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

  sendMessage({ content='' }={}) {
    // this.channel.sendMessage({
    //   content,
    //   time,
    // });
    return this.channel.sendRequest({
      type: 'message',
      content
    });
  }

  close() {
    this.service?.close();
  }

  openCard(index) {
    return this.channel.sendRequest({
      type: 'card',
      index,
    });
  }
}
