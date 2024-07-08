import EventEmitter from 'events';
import short from 'short-uuid';
import Site from '../Site.js';
import Protocol from '../Protocol.js';
import {
  WILDS,
  SUITS,
  SKIP,
  REVERSE,
  DRAW,
  shuffle,
  isCompliant,
} from '@/utils/unoHelper.js';

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
    this.participants = Array.from({ length: 6 });
    this.participants[0] = {
      id: 'host',
      name: 'HOST',
      avatar: null,
    };

    this.cards = [];
    this.discards = [];
    this.direction = 1; // 'Clockwise': 1, 'Anticlockwise': -1
    this.currentCard = null;
    this.currentColor = null;
    this.drawCount = 0;
    this.turn = 'host';
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
      }
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
      case 'draw':
        if (this.turn === clientId) {

          this.draw(clientId);
          break;
        }
      case 'color':
        if (this.turn === clientId) {

          this.selectColor(params.color, clientId);
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
    this.currentCard = null;
    this.currentColor = null;
    this.drawCount = 0;
    this.playedClientId = null;
    this.players = this.participants
      .filter((participant) => participant)
      .map(({ id }) => ({
        id,
        cards: null,
      }));

    const { length } = this.players;
    const dealCards = Array.from({ length }).map(() => []);

    this.cards = shuffle();
    this.discards = [];

    for (let i=0; i < 7; i++) {
      for (let j=0; j < length; j++) {
        dealCards[j].push(this.cards.pop());
      }
    }

    do {
      if (this.currentCard) {
        this.discards.push(this.currentCard);
      }
      this.currentCard = this.cards.pop();
    } while (WILDS.includes(this.currentCard));
    this.currentColor = this.currentCard[0];

    dealCards.forEach((cards, index) => {
      const player = this.players[index];
      const type = 'command';
      const data = {
        name: 'start',
        cards,
        init: this.currentCard,
      };

      player.cards = cards;

      if (player.id === 'host') {
        this.emit(type, data);
      } else {
        this.connections[player.id].send({ type, data });
      }
    });

    this.broadcastAll({
      data: {
        name: 'turn',
        clientId: this.turn,
        init: true,
      },
      type: 'command',
    });
  }

  getPlayer(clientId) {
    return this.players.find(({ id }) => id === clientId);
  }

  drawFromCards() {
    if (!this.cards.length) {
      this.cards = shuffle(this.discards)
      this.discards = [];
    }

    return this.cards.pop();
  }

  draw(clientId='host') {
    if (this.turn !== clientId) return;
    if (!this.currentCard) return;

    const player = this.getPlayer(clientId);
    const count = this.drawCount > 0 ? this.drawCount : 1;
    const cards = [];

    for (let i=0; i<count; i+=1) {
      cards.push(this.drawFromCards());
    }

    const others = this.players.filter(player => player && player.id !== clientId)
      .map(player => player.id);

    player.cards = [
      ...player.cards,
      ...cards,
    ];

    // broadcast
    this.broadcastPlayers({
      name: 'clear',
    }, 'command');
    this.broadcastPlayers({
      name: 'draw',
      clientId,
      cards: count,
    }, 'command', [ clientId ]);
    // clientId update
    this.broadcastPlayers({
      name: 'draw',
      clientId,
      cards,
    }, 'command', others);

    this.drawCount = 0;
    this.nextTurn();
  }

  isCompliantCard(card) {
    const { drawCount, currentColor, currentCard } = this;
    const onlyAllowDraw = drawCount > 0;

    return isCompliant(currentCard, card, {
      currentColor,
      onlyAllowDraw,
    });
  }

  playCard(card=null, clientId='host') {
    const player = this.getPlayer(clientId);
    const isCurrentTurn = this.turn === clientId;

    if (!player || !card || !isCurrentTurn) {
      throw new Error('Bad Request');
    }

    const hasCard = player.cards.includes(card);

    if (!hasCard) {
      throw new Error('Bad Request');
    }

    const isCompliant = this.isCompliantCard(card);

    if (isCompliant) {
      this.discards.push(this.currentCard);
      this.currentCard = card;
      this.playedClientId = clientId;

      const [ cardSuit, cardRnak ] = card;
      const isReverse = cardRnak === REVERSE;
      const isSkip = cardRnak === SKIP;
      const isDraw = cardRnak === DRAW;
      const isWild = WILDS.includes(card);

      if (!isWild) {
        this.currentColor = cardSuit;
      }

      if (isReverse) {
        // Reverse
        this.direction = this.direction < 0 ? 1 : -1;
      } else if (isSkip) {
        // Skip
        this.direction *= 2;
      } else if (isDraw) {
        // Draw
        if (SUITS.includes(cardSuit)) {
          this.drawCount += 2;
        } else {
          this.drawCount += 4;
        }
      }

      if (isWild) {
        this.broadcastAll({
          data: {
            name: 'turn',
            clientId: this.turn,
            selectColor: true,
          },
          type: 'command',
        });
      } else {
        this.nextTurn();
      }

      const data = {
        name: 'play',
        clientId,
        card,
      };

      if (isReverse) {
        data.direction = this.direction;
      }
      if (isSkip) {
        this.direction /= 2;
      }
      if (isDraw) {
        data.count = this.drawCount;
      }

      this.broadcastPlayers(data);

      const index = player.cards.findIndex(playerCard => playerCard === card);

      player.cards.splice(index, 1);

      if (player.cards.length <= 0) {
        this.end(clientId);
      }
    } else {
      throw new Error('Bad Request');
    }
  }

  selectColor(color, clientId='host') {
    const player = this.getPlayer(clientId);
    const isCurrentTurn = this.turn === clientId;

    if (!player || !color || !isCurrentTurn) {
      throw new Error('Bad Request');
    }

    this.currentColor = color;
    this.broadcastPlayers({
      name: 'color',
      clientId,
      color,
    });
    this.nextTurn();
  }

  broadcastPlayers(data, type='command', excepts=[]) {
    const { connections } = this;
    const hostId = 'host';

    if (!excepts.includes(hostId)) {
      this.emit(type, data);
    }

    this.players
      .filter((player) => player && !excepts.includes(player.id))
      .map((player) => player.id)
      .filter((clientId) => clientId !== hostId)
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
    const { players, turn, direction } = this;
    const index = players.findIndex(({ id }) => id === turn);
    let next = (index + direction) % players.length;

    if (next < 0) {
      next +=  players.length;
    }

    this.turn = players[next].id;
    this.broadcastAll({
      data: {
        name: 'turn',
        clientId: this.turn,
      },
      type: 'command',
    });
  }

  end(clientId='host') {
    this.broadcastPlayers({
      name: 'end',
      clientId,
    });
    this.participants
      .filter((participant) => participant)
      .forEach((participant) => participant.ready = false);
  }
}
