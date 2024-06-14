import EventEmitter from 'events';
import short from 'short-uuid';
import Site from '../Site.js';
import Protocol from '../Protocol.js';
import { shuffle, compare } from '@/utils/bigTwoHelper.js';


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
    this.participants = Array.from({ length: 4 });
    this.participants[0] = {
      id: 'host',
      name: 'HOST',
      avatar: null,
    };

    this.cards = [];
    this.locked = false;
    this.turn = 'host';
    this.count = null;
    this.players = [];
  }

  async init() {

  }

  onconnect({ clientId, dataChannel }) {
    const connection = new Protocol({ clientId, dataChannel });

    connection.on('message', (event) => this.onmessage(event));
    connection.on('register', (event) => this.onregister(event));
    connection.on('request', (event) => this.onrequest(event));

    this.connections[clientId] = connection;
    this.emit('connect', { clientId, dataChannel });
  }

  ondisconnect({ clientId }) {
    const connection = this.connections[clientId];

    if (connection) {
      delete this.connections[clientId];

      const disconnectPlayer = this.players.find((player) => player.id === clientId);

      if (disconnectPlayer?.cards && disconnectPlayer.cards.includes('3C')) {
        this.initialized = false;
      }

      this.deregister(clientId);

      if (this.turn === clientId) {
        this.nextTurn();
        // this.participants = this.participants.filter(({ id }) => id !== clientId);
        // this.players = this.players.filter(({ id }) => id !== clientId);
      } // else {
        // this.participants = this.participants.filter(({ id }) => id !== clientId);
        // this.players = this.players.filter(({ id }) => id !== clientId);
      // }
      this.players = this.players.filter((player) => player.id !== clientId);
    }
    this.emit('disconnect', { clientId });
  }

  onregister(event) {
    const { clientId, name, avatar } = event;
    const { connections, profile } = this;
    const connection = connections[clientId];

    const index = this.register({
      id: clientId,
      name,
      avatar
    });
    this.broadcast({
      excepts: [clientId],
      data: { name, avatar, clientId, index },
      type: 'register',
    });
    connection.send({
      type: 'profile',
      data: {
        ...profile,
        clientId,
        index,
      },
    });
    // response register list
    this.participants
      .forEach((participant, index) => participant ? connection.send({
        type: 'register',
        data: {
          clientId: participant.id,
          name: participant.name,
          avatar: participant.avatar,
          ready: participant.ready,
          index,
        },
      }) : null);

    this.emit('register', {
      ...event,
      index,
    });
  }

  async onrequest(params) {
    const { clientId, messageId, type } = params;
    const connection = this.connections[clientId];
    const sendReject = (messageId, error='Forbidden', code=403) => connection.sendReject(messageId, { error, code });

    switch (type) {
      case 'message':
        this.sendMessage({
          clientId,
          content: params.content,
          time: Date.now(),
        });
        break;
      case 'ready':
        const participant = this.participants.find((participant) => participant.id === clientId);

        if (participant) {
          participant.ready = params.status;

          this.broadcastAll({
            data: {
              name: 'ready',
              clientId,
              status: params.status,
            },
            type: 'command',
          });

          connection.sendResponse(messageId);
        }
        break;
      case 'playCard':
        if (this.turn === clientId) {
          try {
            this.playCard(params.cards, clientId);

            break;
          } catch (err) {
            console.warn('playCard failed', err);

            return sendReject()
          }
        }
      case 'pass':
        if (this.turn === clientId) {

          this.pass(clientId);

          break;
        }
      default:
        return sendReject();
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
    let index = this.participants.findIndex((participant) => participant?.id === id);

    if (index >= 0) {
      this.participants[index].name = name;
      this.participants[index].avatar = avatar;
    } else {
      index = this.participants.findIndex(participant => !participant);

      this.participants[index] = {
        id,
        name,
        avatar,
      };
    }

    return index;
  }

  deregister(clientId) {
    const index = this.participants
      .findIndex((participant) => participant && participant.id === clientId);

    if (index < 0) return;

    this.participants[index] = undefined;
    this.broadcastAll({
      data: { clientId, index },
      type: 'deregister',
    });
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

  reset() {
    this.initialized = true;
    this.current = null;
    this.playedClientId = null;
    this.players = this.participants
      .filter((participant) => participant)
      .map(({ id }) => ({
        id,
        cards: null,
      }));

    const { length } = this.players;

    let turn = null;

    shuffle()
      .reduce((acc, curr, index) => {
        acc[index % length] = [...acc[index % length], curr];
        return acc;
      }, Array.from({ length }).map(() => []))
      .forEach((cards, index) => {
        const player = this.players[index];
        const type = 'command';
        const data = {
          name: 'start',
          cards,
        };

        player.cards = cards;

        if (player.id === 'host') {
          this.emit(type, data);
        } else {
          this.connections[player.id].send({ type, data });
        }

        if (cards.includes('3C')) {
          turn = player.id;
        }
      });

    this.turn = turn;
    this.broadcastAll({
      data: {
        name: 'turn',
        clientId: turn,
        init: true,
      },
      type: 'command',
    });
  }

  pass(clientId='host') {
    if (this.turn !== clientId) return;
    if (!this.current) return;

    this.broadcastPlayers({
      name: 'pass',
      clientId,
    });
    this.nextTurn();
  }

  playCard(cards=[], clientId='host') {
    const player = this.players.find(({ id }) => id === clientId);
    const isInitErr = this.initialized && !cards.includes('3C');
    const isCurrentTurn = this.turn === clientId;

    if (!player || !cards.length || !isCurrentTurn || isInitErr) {
      throw new Error('Bad Request');
    }

    const hasCards = cards.every((card) => player.cards.includes(card));

    if (!hasCards) {
      throw new Error('Bad Request');
    }

    const isCompliant = compare(this.current, cards);

    if (isCompliant) {
      this.initialized = false;
      this.current = cards;
      this.playedClientId = clientId;
      this.broadcastPlayers({
        name: 'play',
        clientId,
        cards,
      });
      this.nextTurn();

      player.cards = player.cards.filter((card) => !cards.includes(card));

      if (player.cards.length <= 0) {
        this.end(clientId);
      }
    } else {
      throw new Error('Bad Request');
    }
  }

  broadcastPlayers(data, type='command') {
    const { connections } = this;

    this.emit(type, data);
    this.players
      .filter((player) => player)
      .map(({ id }) => id)
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
    const { players, turn } = this;
    const index = players.findIndex(({ id }) => id === turn);
    const next = (index + 1) % players.length;

    this.turn = players[next].id;
    this.broadcastAll({
      data: {
        name: 'turn',
        clientId: this.turn,
      },
      type: 'command',
    });

    if (this.turn === this.playedClientId) {
      this.current = null;
      this.broadcastPlayers({
        name: 'clear',
      });
    }
  }

  end(clientId='host') {
    this.turn = null;
    this.broadcastPlayers({
      name: 'end',
      clientId,
      cards: this.players
        .filter((player) => player)
        .reduce((acc, curr) => ({
          ...acc,
          [curr.id]: curr.cards,
        }), {}),
    });
    this.participants
      .filter((participant) => participant)
      .forEach((participant) => participant.ready = false);
  }
}
