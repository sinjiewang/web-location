import EventEmitter from 'events';
import short from 'short-uuid';
import Site from '../Site.js';
import Protocol from '../Protocol.js';
import { isPawnMovingDiagonally } from '@/utils/chessHelper';

export default class ChatSiteService extends EventEmitter {
  constructor({ id=short.generate(), tunnel, profile={} }={}) {
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

    this.board = {};
    this.turn = 'host';
    this.turnCount = 0;
    this.stakeholders = [];
    this.hostColor = null;
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
          name: 'turn',
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
      case 'move':
        if (this.turn === clientId) {
          this.move({
            from: params.from,
            to: params.to,
          }, clientId);
        }
        break;
      case 'resign':
        this.resign(clientId);
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
    let index = this.participants.findIndex((participant) => participant?.id === id);

    if (index >= 0) {
      this.participants[index].name = name;
      this.participants[index].avatar = avatar;
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

  initBoard() {
    const initialBoard = {};

    const piecesOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    const whitePawnRow = '2';
    const blackPawnRow = '7';

    // Initialize pieces for both sides
    ['1', '8'].forEach((row) => {
      const color = row === '1' ? 'white' : 'black';

      // Back row (with major pieces)
      piecesOrder.forEach((piece, colIndex) => {
        const col = String.fromCharCode(97 + colIndex); // Convert index to a, b, c, etc.
        initialBoard[`${col}${row}`] = {
          color: color,
          type: piece,
        };
      });

      // Pawn row
      const pawnRow = row === '1' ? whitePawnRow : blackPawnRow;
      for (let i = 0; i < 8; i++) {
        const col = String.fromCharCode(97 + i);
        initialBoard[`${col}${pawnRow}`] = {
          color: color,
          type: 'pawn',
          init: true,
          enPassant: false,
        };
      }
    });

    return initialBoard;
  }

  reset() {
    let data;

    this.board = this.initBoard();
    this.current = null;
    this.turnCount += 1;
    // this.hostColor = this.hostColor === 'white' ? 'black' : 'white';
    this.stakeholders = this.participants.map(({ id }, index) => ({
      id,
      color: (this.turnCount % 2) ^ index ? 'white': 'black',
    })).filter((_, index) => index <2);

    data = {
      name: 'start',
      color: this.stakeholders.reduce((acc, curr) => ({
        ...acc,
        [curr.id]: curr.color,
      }), {}),
    };

    this.broadcastStakeholders(data);
    this.turn = this.stakeholders.find(({ color }) => color === 'white').id;

    data = {
      name: 'turn',
      clientId: this.turn,
    };
    this.broadcastStakeholders(data);
  }

  move({ from='', to='' }, clientId='host') {
    if (this.turn !== clientId) {
      return;
    }

    const piece = this.board[from];
    const target = this.board[to];
    const color = this.stakeholders.find(({id}) => id === clientId).color;

    if (!piece || piece.color !== color) {
      return;
    }

    this.board[to] = piece;

    if (piece.type === 'pawn') {
      // Queening
      if ( ['1', '8'].includes(to[1])) {
        piece.type = 'queen';
      }

      const enPassantSquare = to[0] + from[1];
      const enPassantTarget = this.board[enPassantSquare];
      const isEnPassant = isPawnMovingDiagonally(from, to)
        && !target
        && enPassantTarget?.enPassant;
      // En passant
      if (isEnPassant) {
        delete this.board[enPassantSquare];
      }

      if (piece.init) {
        piece.init = false;
        piece.enPassant = true;
      } else {
        piece.enPassant = false;
      }
    }

    delete this.board[from];

    const data = {
      name: 'move',
      from,
      to,
    };

    this.broadcastStakeholders(data);

    if (target?.type === 'king') {
      this.end(this.turn);
    } else {
      this.nextTurn();
    }
  }

  resign(clientId='host') {
    const winner = this.stakeholders.find(({ id }) => id !== clientId);

    this.end(winner.id);
  }

  end(winner='host') {
    this.turn = null;
    this.broadcastStakeholders({
      name: 'end',
      winner,
    });

    this.participants
      .filter((participant) => participant)
      .forEach((participant) => participant.ready = false);
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
    this.broadcastAll({
      data: {
        name: 'turn',
        clientId: this.turn,
      },
      type: 'command',
    });
  }
}
