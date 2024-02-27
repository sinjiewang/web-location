import Signaling from './index';

export default class SiteSignaling extends Signaling {
  sendAnswer({ clientId, desc }) {
    const { tunnel } = this;

    if (tunnel && tunnel.send) {
      tunnel.send({
        action: 'answer',
        clientId,
        data: {
          sdp: desc,
        }
      });
    }
  }

  sendIcecand({ clientId, candidate }) {
    const { tunnel } = this;

    if (tunnel && tunnel.send) {
      tunnel.send({
        action: 'icecand',
        clientId,
        data: {
          sdp: candidate,
        }
      });
    }
  }
}
