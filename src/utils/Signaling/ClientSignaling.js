import Signaling from './index';

export default class ClientSignaling extends Signaling {
  sendOffer({ siteId, desc }) {
    const { tunnel } = this;

    if (tunnel && tunnel.send) {
      tunnel.send({
        action: 'offer',
        siteId,
        data: {
          sdp: desc,
        }
      });
    }
  }

  sendIceCandidate({ siteId, candidate }) {
    const { tunnel } = this;

    if (tunnel && tunnel.send) {
      tunnel.send({
        action: 'icecand',
        siteId,
        data: {
          sdp: candidate,
        }
      });
    }
  }
}
