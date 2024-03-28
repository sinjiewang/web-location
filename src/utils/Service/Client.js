import EventEmitter from 'events';
// import short from 'short-uuid';
import ClientSignaling from '@/utils/Signaling/ClientSignaling.js';
import RTCPeerClient from '@/utils/RTCPeer/RTCPeerClient.js';
import Protocol from './Protocol';

export default class Service extends EventEmitter {
  constructor({ name, avatar }={}) {
    super();

    this.channel = null;
    this.profile = null;
    this.participants = {
      'self': {
        name,
        avatar,
      }
    };
  }

  async connect({ tunnel, siteId }={}) {
    const { name, avatar } = this.participants.self;
    const signaling = new ClientSignaling({ tunnel });
    const rtcConnection = new RTCPeerClient({
      signaling,
      siteId,
    });

    await rtcConnection.connect();
    const dataChannel = await rtcConnection.createDataChannel('data');
    const protocol = new Protocol({ dataChannel })

    protocol.on('profile', (event) => this.onprofile(event));
    protocol.on('message', (event) => this.onmessage(event));
    protocol.on('register', (event) => this.onregister(event));
    protocol.on('deregister', (event) => this.onderegister(event));
    protocol.on('close', () => this.onclose());

    this.channel = protocol;
    this.channel.sendRegister({ name, avatar });
    this.register({ name, avatar });
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
    const { clientId } = data;
    const { name, avatar } = this.participants[clientId];

    this.emit('message', {
      ...data,
      name,
      avatar,
    })
  }

  onclose() {
    this.channel.removeAllListeners();
    this.channel = null;
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

    this.channel.sendMessage({ message, time });
  }

  register({ id='self', name, avatar }={}) {
    this.participants[id] = { name, avatar };
  }
}
