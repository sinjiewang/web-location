import EventEmitter from 'events';

export default class RTCPeerSite extends EventEmitter {
  constructor({ signaling }) {
    super();
    this.peerConnectionMap = {};
    this.signaling = signaling;
    this.$iceBufferMap = {};
    this.$createPeerConnection = this.createPeerConnection.bind(this);
    this.$addIceCandidate = this.addIceCandidate.bind(this);

    signaling.on('offer', this.$createPeerConnection);
    signaling.on('icecand', this.$addIceCandidate);
  }
  async createPeerConnection({
    iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
    clientId, desc,
  }) {
    const { signaling, peerConnectionMap } = this;
    const peerConnection = new RTCPeerConnection({ iceServers }, { optional: [] });

    if (peerConnectionMap[clientId]) {
      peerConnectionMap[clientId].close();
    }

    peerConnection.onicecandidate = ({ candidate }) => {
      signaling.sendIcecand({
        clientId,
        candidate,
      });
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(peerConnection.iceConnectionState)) {
        console.error('WebRTC disconnect', clientId);
        // Handle the failure
        delete peerConnectionMap[clientId];

        this.emit('diconnect', { clientId });
      }
    };

    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;

      if (peerConnection.channels) {
        peerConnection.channels[dataChannel.label] = dataChannel
      } else {
        peerConnection.channels = {
          [dataChannel.label]: dataChannel,
        }
      }

      console.log('datachannel opened')
    };

    await peerConnection.setRemoteDescription(desc);

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    signaling.sendAnswer({ clientId, desc: answer });

    peerConnectionMap[clientId] = peerConnection;

    if (this.$iceBufferMap[clientId]) {
      this.$iceBufferMap[clientId]
        .forEach((desc) => this.addIceCandidate({ clientId, desc }));
      delete this.$iceBufferMap[clientId];
    }

    this.emit('connect', { clientId, peerConnection });
  }

  addIceCandidate({ clientId, desc }) {
    const { peerConnectionMap, $iceBufferMap } = this;
    const peerConnection = peerConnectionMap[clientId];
    const iceBuffer = $iceBufferMap[clientId];

    if (peerConnection instanceof RTCPeerConnection) {
      peerConnection.addIceCandidate(desc);
    } else if (iceBuffer) {
      iceBuffer.push(desc);
    } else {
      $iceBufferMap[clientId] = [desc];
    }
  }
}
