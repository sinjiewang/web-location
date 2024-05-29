import EventEmitter from 'events';
import short from 'short-uuid';
import Site from '../Site.js';
import Protocol from '../Protocol.js';

export default class ChatSiteService extends EventEmitter {
  constructor({ id=short.generate(), tunnel, profile={}, db }={}) {
    super();

    const service = new Site({ id, tunnel, profile });

    service.on('connect', (event) => this.onconnect(event));
    service.on('disconnect', (event) => this.ondisconnect(event));

    this.service = service;
    this.id = id;
    this.profile = profile;

    this.connections = {};
    this.participants = [
      {
        id: 'host',
        name: 'HOST',
        avatar: null,
      },
    ];

    this.cards = [];
    this.locked = false;
    this.turn = 'host';
    this.count = null;
    this.stakeholders = [];
  }

  async init() {

  }

  onconnect({ clientId, dataChannel }) {
    const connection = new Protocol({ clientId, dataChannel });

    connection.on('message', (event) => this.onmessage(event));
    connection.on('register', (event) => this.onregister(event));
    connection.on('request', (event) => this.onrequest(event));
    // connection.on('submit', (event) => this.onsubmit(event));

    this.connections[clientId] = connection;
    this.emit('connect', { clientId, dataChannel });
    // this.sequence.push(clientId);
  }

  ondisconnect({ clientId }) {
    const connection = this.connections[clientId];

    if (connection) {
      delete this.connections[clientId];

      this.broadcastAll({
        data: { clientId },
        type: 'deregister',
      });

      if (this.turn === clientId) {
        this.nextTurn();
        this.participants = this.participants.filter(({ id }) => id !== clientId);
        this.stakeholders = this.stakeholders.filter(({ id }) => id !== clientId);
        this.broadcastStakeholders({
          type: 'turn',
          clientId: this.turn,
        });
      } else {
        this.participants = this.participants.filter(({ id }) => id !== clientId);
        this.stakeholders = this.stakeholders.filter(({ id }) => id !== clientId);
      }
    }
    this.emit('disconnect', { clientId });
  }

  onregister(event) {
    const { clientId, name, avatar } = event;
    const { connections, profile } = this;
    const connection = connections[clientId];

    this.register({
      id: clientId,
      name,
      avatar
    });
    this.broadcast({
      excepts: [clientId],
      data: { name, avatar, clientId },
      type: 'register',
    });
    connection.send({
      type: 'profile',
      data: {
        ...profile,
        clientId,
      },
    });
    // response register list
    this.participants
      .forEach(({ id, name, avatar}) => connection.send({
        type: 'register',
        data: {
          clientId: id,
          name,
          avatar,
        },
      }));

    this.emit('register', event);
  }

  async onrequest(params) {
    const { clientId, messageId, type } = params;
    const connection = this.connections[clientId];

    switch (type) {
      case 'message':
        this.sendMessage({
          clientId,
          content: params.content,
          time: Date.now(),
        });
        break;
      case 'card':
        if (this.turn === clientId) {
          this.openCard(params.index, clientId);
        }
        break;
      default:
        return connection.sendReject(messageId, {
          error: 'Forbidden',
          code: 403,
        });
    }

    connection.sendResponse(messageId);
  }

  sendMessage({ content, time=Date.now(), clientId='host'}) {
    this.broadcastAll({
      data: {
        clientId,
        content,
        time,
      },
      type: 'message',
    });
  }

  broadcast({ data, type='message', excepts=[] }={}) {
    const { connections } = this;

    Object.keys(connections)
      .filter((clientId) => !excepts.includes(clientId))
      .forEach((clientId) => connections[clientId].send({
        type,
        data,
      }));
  }

  register({ id='host', name, avatar }) {
    const participant = this.participants.find((participant) => participant.id === id);

    if (participant) {
      participant.name = name;
      participant.avatar = avatar;
    } else {
      this.participants.push({
        id,
        name,
        avatar,
      });
    }
  }

  close() {
    this.service?.close();
  }

  updateTunnel(tunnel) {
    this.service.updateTunnel(tunnel);
  }

  get connectionCount() {
    return Object.keys(this.connections).length;
  }

  genCards(length=0) {
    const numbers = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const colors = ['C', 'D', 'H', 'S'];
    const cards = [];

    for (let i=0; i<length; i+=1) {
      let card;

      do {
        const indexN = Math.floor(Math.random() * numbers.length);
        const number = numbers[indexN];

        const indexC = Math.floor(Math.random() * colors.length);
        const color = colors[indexC];

        card = `${ number }${ color }`;
      } while (cards.includes(card));

      cards.push(card);
    }

    return cards;
  }

  shuffle(arr) {
    const n = arr.length;

    for (let i = n - 1; i > 0; i -= 1) {
      const rand = Math.floor(Math.random() * (i + 1));

      [arr[i], arr[rand]] = [arr[rand], arr[i]];
    }

    return arr;
  }

  reset({ quantity=8 }={}) {
    const cards = this.genCards(quantity/2);

    this.cards = this.shuffle([
      ...cards,
      ...cards,
    ]);
    this.current = null;
    this.locked = false;
    this.count = 0;
    this.stakeholders = this.participants.map(({ id }) => ({
      id,
      point: 0,
    }));

    let data = {
      type: 'start',
      quantity,
    };

    this.broadcastStakeholders(data);

    data = {
      type: 'turn',
      clientId: this.turn,
    };
    this.broadcastStakeholders(data);
  }

  openCard(index, clientId='host') {
    if (this.locked || this.turn !== clientId) {
      return;
    }
    const card = this.cards[index];
    const { current } = this;

    this.broadcastOpenCard(index, card);

    if (!current) return;

    if (current.card !== card) {
      this.locked = true;

      setTimeout(() => {
        this.broadcastCloseCard([index, current.index]);
        this.locked = false;
        this.nextTurn();
        this.broadcastStakeholders({
          type: 'turn',
          clientId: this.turn,
        });
      }, 1000);
    } else {
      this.count += 2;

      const stakeholder = this.stakeholders.find(({ id }) => id === clientId);

      stakeholder.point += 2;

      this.broadcastStakeholders({
        type: 'point',
        clientId,
        point: stakeholder.point,
      })

      if (this.count >= this.cards.length) {
        const data = {
          type: 'end',
          points: this.stakeholders,
        };

        this.broadcastStakeholders(data);
      }
    }
    this.current = null;
  }

  broadcastOpenCard(index, card) {
    const data = {
      type: 'open',
      position: index,
      name: card,
    };

    this.broadcastStakeholders(data);
    this.current = { index, card };
  }

  broadcastCloseCard(indexes=[]) {
    this.broadcastStakeholders({
      type: 'close',
      positions: indexes,
    });
  }

  broadcastStakeholders(data, type='command') {
    const { connections } = this;

    this.emit(type, data);
    this.stakeholders.map(({ id }) => id)
      .filter((clientId) => clientId !== 'host')
      .forEach((clientId) => connections[clientId].send({
        type,
        data,
      }));
  }

  broadcastAll({data, type='command'}={}) {
    this.emit(type, data);
    this.broadcast({ data, type });
  }

  nextTurn() {
    const { stakeholders, turn } = this;
    const index = stakeholders.findIndex(({ id }) => id === turn);
    const next = (index + 1) % stakeholders.length;

    this.turn = stakeholders[next].id;
  }
}
