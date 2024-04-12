import EventEmitter from 'events';
import ClientSignaling from '@/utils/Signaling/ClientSignaling.js';
import RTCPeerClient from '@/utils/RTCPeer/RTCPeerClient.js';

export default class Service extends EventEmitter {
  constructor() {
    super();

    this.rtcConnection = null;
    this.signaling = null;
    this.dataChannel = null;
  }

  async connect({ tunnel, siteId, password }={}) {
    const signaling = new ClientSignaling({ tunnel, password });

    this.$onerror = (error) => this.onerror(error);
    this.signaling = signaling;

    signaling.on('error', this.$onerror);

    const rtcClient = new RTCPeerClient({
      signaling,
      siteId,
    });

    await rtcClient.connect();

    const dataChannel = await rtcClient.createDataChannel('data');

    dataChannel.on('close', () => this.onclose());

    this.dataChannel = dataChannel;
    this.rtcClient = rtcClient;
  }

  onerror(error) {
    console.warn('signaling error:', error);

    this.emit('error', error);
  }

  onclose() {
    this.dataChannel.removeAllListeners();
    this.dataChannel = null;
  }

  close() {
    this.signaling?.off('error', this.$onerror);

    this.rtcClient?.close();
    this.rtcClient = null;
  }
}
