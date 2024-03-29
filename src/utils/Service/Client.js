import EventEmitter from 'events';
import ClientSignaling from '@/utils/Signaling/ClientSignaling.js';
import RTCPeerClient from '@/utils/RTCPeer/RTCPeerClient.js';

export default class Service extends EventEmitter {
  constructor() {
    super();

    this.rtcConnection = null;
    this.dataChannel = null;
  }

  async connect({ tunnel, siteId }={}) {
    const signaling = new ClientSignaling({ tunnel });
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

  onclose() {
    this.dataChannel.removeAllListeners();
    this.dataChannel = null;
  }

  close() {
    this.rtcClient?.close();
    this.rtcClient = null;
  }
}
