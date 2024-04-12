import Signaling from './index';

export default class ClientSignaling extends Signaling {
  constructor({ tunnel, password }={}) {
    super({ tunnel });

    this.password = password;
  }

  sendOffer({ siteId, desc }) {
    const { tunnel, password } = this;
    const data = {
      action: 'offer',
      siteId,
      data: {
        sdp: desc,
      }
    };

    if (password) {
      data.password = password;
    }

    if (tunnel && tunnel.send) {
      tunnel.send(data);
    }
  }

  sendIceCandidate({ siteId, candidate }) {
    const { tunnel, password } = this;
    const data = {
      action: 'icecand',
      siteId,
      data: {
        sdp: candidate,
      }
    };

    if (password) {
      data.password = password;
    }

    if (tunnel && tunnel.send) {
      tunnel.send(data);
    }
  }
}
