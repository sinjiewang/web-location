import EventEmitter from 'events';
import short from 'short-uuid';

import Signaling from '@/utils/Signaling/SiteSignaling.js';
import RTCPeerSite from '@/utils/RTCPeer/RTCPeerSite.js';
import Protocol from './Protocol';
// import StoreChat from '@/utils/IndexedDB/StoreChat';
// import StoreHistory from '@/utils/IndexedDB/StoreHistory';


export default class Service extends EventEmitter {
  constructor({ id=short.generate(), tunnel, profile={} }={}) {
    super();

    const signaling = new Signaling({ tunnel });
    const rtcSite = new RTCPeerSite({ signaling });

    rtcSite.on('connect', (event) => this.onconnect(event));
    rtcSite.on('disconnect', (event) => this.ondisconnect(event));

    this.rtcSite = rtcSite;
    this.siteId = id;
    this.profile = profile;
    this.dataChannels = {};
    this.participants = {
      'host': {
        name: 'HOST',
        avatar: null,
      }
    };
  }
  async onconnect({ clientId }) {
    const dataChannel = await this.rtcSite.createDataChannel({
      clientId,
      label: 'data',
    });
    const protocol = new Protocol({ clientId, dataChannel });

    protocol.on('message', (event) => this.onmessage(event));
    protocol.on('register', (event) => this.onregister(event));

    this.dataChannels[clientId] = protocol;
  }

  ondisconnect({ clientId }) {
    const dataChannel = this.dataChannels[clientId];
    const { name } = this.participants[clientId] || {};

    if (dataChannel) {
      const time = Date.now();

      dataChannel.removeAllListeners();

      delete this.dataChannels[clientId];

      this.broadcast({
        data: { clientId, time },
        type: 'deregister',
      });
      this.emit('deregister', {
        clientId,
        name,
        time,
      });

      console.warn(clientId, name, 'disconnected')
    }
  }

  onregister({ clientId, name, avatar }) {
    const { dataChannels, participants, profile } = this;
    const registerChannel = dataChannels[clientId];
    const time = Date.now();
    console.warn('clientId', clientId)

    this.register({
      id: clientId,
      name,
      avatar
    });
    this.broadcast({
      excepts: [clientId],
      data: { name, avatar, clientId, time },
      type: 'register',
    });

    registerChannel.send({
      type: 'profile',
      data: {
        ...profile,
        time,
      },
    });
    registerChannel.send({
      type: 'register',
      data: {
        clientId: 'host',
        name: participants['host'].name,
        avatar: participants['host'].avatar,
        time,
      },
    })

    this.emit('register', { name, avatar, clientId, time });

    Object.keys(dataChannels)
      .filter((id) => id !== clientId)
      .forEach((id) => registerChannel.send({
        type: 'register',
        data: {
          clientId: id,
          name: participants[id].name,
          avatar: participants[id].avatar,
          time,
        },
      }));
  }

  onmessage(data) {
    const { time, message, clientId } = data;
    const { name, avatar } = this.participants[clientId] || {};
    const newChat = {
      clientId,
      time,
      message,
    };

    this.broadcast({
      excepts: [clientId],
      data: newChat,
    });
    this.emit('message', {
      ...newChat,
      name,
      avatar,
    });
  }

  sendMessage(message) {
    const data = {
      time: Date.now(),
      message,
    };

    this.broadcast({
      data: {
        clientId: 'host',
        ...data,
      }
    });
  }

  broadcast({ data, type='message', excepts=[] }={}) {
    const { dataChannels } = this;

    Object.keys(dataChannels)
      .filter((clientId) => !excepts.includes(clientId))
      .forEach((clientId) => dataChannels[clientId].send({
        type,
        data,
      }));
  }

  register({ id='host', name, avatar }) {
    const participant = this.participants[id] || {};

    this.participants[id] = {
      name: name || participant.name,
      avatar: avatar || participant.avatar,
    }
  }

  close() {
    this.rtcSite?.close();
  }
}
