import EventEmitter from 'events';
import short from 'short-uuid';

import Signaling from '@/utils/Signaling/SiteSignaling.js';
import RTCPeerSite from '@/utils/RTCPeer/RTCPeerSite.js';

export default class Service extends EventEmitter {
  constructor({ id=short.generate(), tunnel }={}) {
    super();

    const signaling = new Signaling({ tunnel });
    const rtcSite = new RTCPeerSite({ signaling });

    rtcSite.on('connect', (event) => this.onconnect(event));
    rtcSite.on('disconnect', (event) => this.ondisconnect(event));

    this.rtcSite = rtcSite;
    this.siteId = id;
    this.dataChannels = {};
  }

  async onconnect({ clientId }) {
    const dataChannel = await this.rtcSite.createDataChannel({
      clientId,
      label: 'data',
    });

    this.dataChannels[clientId] = dataChannel;
    this.emit('connect', {
      clientId,
      dataChannel,
    });
  }

  ondisconnect({ clientId }) {
    const dataChannel = this.dataChannels[clientId];

    if (dataChannel) {
      this.emit('disconnect', {
        clientId,
        dataChannel,
      });

      delete this.dataChannels[clientId];

      console.warn(clientId, 'disconnected')
    }
  }

  close() {
    this.rtcSite?.close();
  }
}
