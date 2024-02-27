import { getTagged } from './logger';
import EventEmitter from 'events';

import DataChannelWrapper from './DataChannelWrapper';

const Log = getTagged('connection:rtc-client');

class RTCPeerClient extends EventEmitter {
  constructor({ signaling, siteId } = {}) {
    super();

    this.peerConnection = null;
    this.siteId = siteId;
    this.dataChannels = new Map();
    this.$createTimeout = null;
    this.$closeTimeout = null;

    this.signaling = signaling;

    this.endpoints = [];
    this.defaultDataChannelCount = 0;

    this.RESPONSE_TIMEOUT = 30; // same as sdp response;
    this.CLOSE_TIMEOUT = 10;

    this.isSetRemoteDescriptionSuccess = false;
  }

  get connected() {
    const { peerConnection } = this;
    return peerConnection && !['failed', 'disconnected', 'closed'].includes(peerConnection.iceConnectionState);
  }

  async connect() {
    if (this.connected) {
      this.close();
    }

    this.$_startConnectTime = new Date().getTime();

    const setRemoteDescription = ({desc}) => this.setRemoteDescription(desc);
    const addIceCandidate = ({desc}) => this.addIceCandidate(desc);

    this.signaling.on('answer', setRemoteDescription);
    this.signaling.on('icecand', addIceCandidate);

    return this.createPeerConnection()
      .finally(() => {
        this.signaling.off('answer', setRemoteDescription);
        this.signaling.off('icecand', addIceCandidate);
      });
  }

  close() {
    this.closeAllServiceChannels();

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      this.isSetRemoteDescriptionSuccess = false;
    }
    clearTimeout(this.$createTimeout);
    clearTimeout(this.$closeTimeout);
  }

  closeAllServiceChannels() {
    this.dataChannels.forEach((channel) => {
      channel.removeAllListeners();
      channel.close();
    });
  }

  async createPeerConnection({
    iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
    defaultDataChannels = { data: { /* ordered: true */ } },
  }={}) {
    this.defaultDataChannelCount = Object.keys(defaultDataChannels).length;

    const { signaling, siteId } = this;

    this.$createPeerConnectionPromise = new Promise((resolve, reject) => {
      Log.log('Try to create WebRTC conncection');
      const channels = Object.keys(defaultDataChannels);
      const peerConnection = new RTCPeerConnection({ iceServers }, { optional: [] });
      this.peerConnection = peerConnection;

      Promise.all(channels.map((label) => this.createDataChannel(label, defaultDataChannels[label])))
        .then(() => resolve(this));

      peerConnection.onicecandidate = ({ candidate }) => {
        signaling.sendIceCandidate({
          siteId,
          candidate,
        });
      };
      peerConnection.createOffer().then((desc) => {
        peerConnection.setLocalDescription(desc);

        signaling.sendOffer({
          siteId,
          desc,
        });
      }, (err) => {
        Log.error('createOffer fail');
        return reject(err);
      });
      peerConnection.oniceconnectionstatechange = () => {
        const { iceConnectionState } = peerConnection;

        if (['failed', 'disconnected', 'closed'].includes(iceConnectionState)) {
          Log.error(`WebRTC conneciton failed, status: ${iceConnectionState}`);
          // Handle the failure
          this.closeAllServiceChannels();
          this.emit('close');
          reject(new Error('Create WebRTC conneciton failed'));
        }
      };

      this.$createTimeout = setTimeout(() => {
        peerConnection.close();
        Log.error('Create WebRTC conneciton timeout');
        reject(new Error('Create WebRTC conneciton failed'));
      }, 30 * 1000);
    })
    .finally(() => {
      clearTimeout(this.$createTimeout);

      delete this.$createTimeout;
      delete this.$createPeerConnectionPromise;
    });

    return this.$createPeerConnectionPromise;
  }

  setRemoteDescription(desc) {
    const { peerConnection } = this;

    if (peerConnection) {
      peerConnection.setRemoteDescription(desc).then(() => {
        this.isSetRemoteDescriptionSuccess = true;
        if (this.$iceBuffer) {
          this.$iceBuffer.forEach((bufferDesc) => {
            this.addIceCandidate(bufferDesc);
          });
          delete this.$iceBuffer;
        }
      });
    }
  }

  addIceCandidate(desc) {
    const { peerConnection, isSetRemoteDescriptionSuccess } = this;

    if (!isSetRemoteDescriptionSuccess) {
      if (this.$iceBuffer) {
        this.$iceBuffer.push(desc);
      } else {
        this.$iceBuffer = [desc];
      }
      return;
    }

    if (peerConnection) {
      peerConnection.addIceCandidate(desc);
    }
  }

  async createDataChannel(label, options = { /* ordered: true */ }) {
    const { peerConnection, connected, dataChannels } = this;

    if (!peerConnection || !connected) {
      return Promise.reject(new Error('WebRTC disconnect'));
    }

    if (dataChannels.has(label)) {
      return Promise.resolve(dataChannels.get(label));
    }

    return new Promise((resolve) => {
      const channel = new DataChannelWrapper(peerConnection.createDataChannel(label, options));
      channel.createTime = new Date().getTime();

      channel.on('open', () => {
        channel.openedTime = new Date().getTime() - channel.createTime;
        Log.log(`Data channel: ${label} opened in ${channel.openedTime} ms.`);
        dataChannels.set(label, channel);

        resolve(channel);
      });
      channel.on('close', () => {
        if (dataChannels.has(label)) {
          Log.warn(`Data channel: ${label} closed. Trying to close session: ${channel.sessionId}`);

          dataChannels.delete(label);
        }

        this.handleDataChannelClosed();
      });
    });
  }

  handleDataChannelClosed() {
    const { dataChannels, defaultDataChannelCount } = this;
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    this.closeTimeout = setTimeout(() => {
      if (dataChannels.size === defaultDataChannelCount) {
        this.close();
      }
    }, this.CLOSE_TIMEOUT * 1000);
  }
}

export default RTCPeerClient;
