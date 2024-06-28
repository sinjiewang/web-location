<script>
import short from 'short-uuid';
import { mapState, mapActions } from 'vuex';
import Service from '@/utils/Service/Uno/ClientService.js';
import AccountDialog from '@/components/AccountDialog.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';
import ConnectionPasswordDialog from '@/components/ConnectionPasswordDialog.vue';
import ImageDialog from '@/components/ImageDialog.vue';
import calculateCardCoords from '@/utils/calculateCardCoords.js';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiHandOkay, mdiTrophy, mdiInformation, mdiRotateRight, mdiRotateLeft } from '@mdi/js';
import { SUITS, sortBySuit, isCompliant, score } from '@/utils/unoHelper.js';
import AvatarTimer from '@/components/AvatarTimer.vue';
import ChatWindow from '../ChatWindow.vue';

export default {
  components: {
    AccountDialog,
    AccountAvatar,
    AvatarTimer,
    ConnectionPasswordDialog,
    ImageDialog,
    SvgIcon,
    ChatWindow,
  },
  data() {
    return {
      siteId: this.$route.params.siteId,
      showDisconnectedDialog: false,
      loading: false,
      isReady: false,
      participantIndex: null,
      service: null,
      id: short.generate(),
      nickname: null,
      avatar: null,
      password: null,
      pwdRequired: false,
      profile: null,
      //
      PLAYERS_THRESHOLD: 3,
      MAX_CARD_WIDTH: 120,
      MAX_CARD_HEIGHT: 180,
      HAND_ZOOM: 0.45,
      DISPLAY_ZOOM: 0.8,
      MD_DOWN_ZOOM: 0.6,
      SPACING: 0.4,
      COLOR_CARDS: ['R', 'Y', 'G', 'B'],
      gameStarted: false,
      cards: [],
      selectedIndex: null,
      hover: null,
      played: null,
      color: null,
      playedPlayerIndex: null,
      directionRotate: false,
      direction: 1,
      drawCount: 0,
      showColorButton: false,
      players: [],
      newMessage: null,
      timeout: null,
      expandedPanels: [0],
      scoreTables: [],
      scoreIndex: -1,
      scoreRenew: true,
      mdiHandOkay,
      mdiTrophy,
      mdiInformation,
      mdiRotateRight,
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsConnection']),
    disconnectedDialogConetnt() {
      const mapping = {
        '503': this.$t('Connection Limit Exceeded')
      };

      return mapping[this.connectResponseCode] || this.$t('Disconnected from the Host');
    },
    readyLabel() {
      return this.isReady ? this.$t('Cancel') : this.$t('Ready');
    },
    selectedCard() {
      return this.cards[this.selectedIndex] || null;
    },
    enablePlayCard() {
      const { showColorButton, selectedCard, selfPlayer } = this;
      const isSelfTurn = selfPlayer.turn;
      const isCompliantCard = this.isCompliantCard(selectedCard);

      return isSelfTurn && !showColorButton && isCompliantCard;
    },
    disableDraw() {
      return !this.gameStarted;
    },
    selfPlayer() {
      return this.players[this.participantIndex];
    },
    showBottomMenu() {
      return !!this.selfPlayer?.message;
    },
    firstPlayer() {
      const index = (this.participantIndex + 1) % 4;

      return this.players[index];
    },
    firstPlayerCards() {
      return this.firstPlayer?.cards || [];
    },
    showLeftMenu() {
      return !!this.firstPlayer?.message;
    },
    secondPlayer() {
      const index = (this.participantIndex + 2) % 4;

      return this.players[index];
    },
    secondPlayerCards() {
      return this.secondPlayer?.cards || [];
    },
    showTopMenu() {
      return !!this.secondPlayer?.message;
    },
    thirdPlayer() {
      const index = (this.participantIndex - 1) % 4;

      return this.players[index];
    },
    thirdPlayerCards() {
      return this.thirdPlayer?.cards || [];
    },
    showRightMenu() {
      return !!this.thirdPlayer?.message;
    },
    activePlayer() {
      return this.players.filter((player) => player);
    },
    // allPlayersReady() {
    //   // return this.activePlayer.length >= this.PLAYERS_THRESHOLD
    //   //   && this.activePlayer.every((player) => player.ready);
    //   return true;
    // },
    cardsCoord() {
      const cardCoords = calculateCardCoords(this.cards.length);

      return this.cards.map(( name, index ) => ({
        name,
        ...cardCoords[index],
      }));
    },
    startLabel() {
      const count = this.activePlayer.reduce((acc, curr) => acc + (curr.ready ? 1 : 0), 0)

      return `( ${count} / ${this.PLAYERS_THRESHOLD} )`;
    },
    playedCardClass() {
      const mapping = ['moving-from-bottom', 'moving-from-left', 'moving-from-top', 'moving-from-right'];

      if (this.playedPlayerIndex === null) return '';

      let index = this.playedPlayerIndex - this.participantIndex;

      index = index < 0 ? index + 4 : index;

      return mapping[index] || '';
    },
    cardInterval() {
      const { cards } = this;

      if (this.isSmallWidth) {
        return 0.19;
      }
      const interval = cards.length === 2 ? 1.1
        : cards.length === 3 ? 0.85
        : cards.length === 4 ? 0.6
        : cards.length === 5 ? 0.4
        : 0.3;

      return Math.max(0.3, interval);
    },
    handCardsWidth() {
      const { MAX_CARD_WIDTH, cards, cardInterval } = this;
      const length = cards.length > 1 ? cards.length : 1;

      return MAX_CARD_WIDTH + (length - 1) * cardInterval * MAX_CARD_WIDTH;
    },
    directionIcon() {
      return this.direction > 0 ? mdiRotateRight : mdiRotateLeft;
    },
    directionIconDegree() {
      return this.direction > 0 ? 'deg90' : 'deg270';
    },
    directionIconAnimation() {
      const degree = this.direction > 0 ? 'clockwise' : 'counterclockwise';
      const animation = `rotate-${degree}`;

      return this.directionRotate ? animation : '';
    },
    drawCountLabel() {
      return this.drawCount > 0 ? `+${this.drawCount}` : '';
    },
    isSmallWidth() {
      return window.innerWidth < 960;
    },
    cardsLayerForMD() {
      return Math.max(Math.floor((this.cards.length - 1) / 12) + 1, 1);
    },
    cardsArraysForMD() {
      const length = this.cardsLayerForMD;

      return Array.from({ length })
        .map((_, index) => index);
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount', 'updateAccount', 'updateRecords']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('CloudTunnel', ['clientConnect', 'disconnect']),
    async init() {
      const { pwdRequired, password } = this;

      if (pwdRequired && password === null) {
        return this.$nextTick(() => this.$refs.passwordDialog.show())
      }

      this.loading = true;
      this.connectResponseCode = null;

      try {
        await this.clientConnect();

        this.service = await this.createService();
      } catch (err) {
        console.error('init failed', err);

        const { code } = err;

        this.connectResponseCode = code;

        switch(code) {
          case 401:
            this.pwdRequired = true;
            this.password = null;
            this.$refs.passwordDialog.show();
            break;
          case 503:
          default:
            this.showDisconnectedDialog = true;
        }
      }

      this.loading = false;
      this.disconnect();

      this.gameStarted = false;
      this.cards = [];
      this.selectedIndex = null;
      this.hover = null;
      this.played = null;
      this.players = [];
      this.participantIndex = null;
      this.isReady = false;
    },
    async createService() {
      const { id, nickname, avatar, wsConnection, siteId, db, password } = this;

      const service = new Service({
        id,
        name: nickname,
        avatar,
        db,
      });

      return new Promise(async (resolve, reject) => {
        service.on('error', (error) => {
          service.close();

          reject(error);
        });
        service.on('profile', (profile) => this.onprofile(profile));
        service.on('register', (data) => this.onregister(data));
        service.on('deregister', (data) => this.onderegister(data));
        service.on('message', (data) => this.onmessage(data));
        service.on('command', (data) => this.oncommand(data));
        service.on('close', () => this.onclose());

        await service.connect({
          tunnel: wsConnection,
          siteId,
          password,
        });

        resolve(service);
      })
    },
    // ...mapActions('Account', ['getAccount', 'updateRecords']),
    // ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    // createService({ id, profile, tunnel, db }) {
    //   const service = new Service({
    //     id,
    //     tunnel,
    //     db,
    //     profile: toRaw(profile),
    //   });

    //   service.on('register', (event) => this.onregister(event));
    //   service.on('deregister', (event) => this.onderegister(event));
    //   service.on('message', (event) => this.onmessage(event));
    //   service.on('command', (event) => this.oncommand(event));

    //   return service;
    // },
    async onprofile(profile) {
      const { id, position, title, type, clientId, index } = profile;

      this.profile = { id, position, title, type, clientId };
      this.participantIndex = index;
    },
    onregister(register) {
      const { name, avatar, clientId, index, ready=false } = register;

      this.players[index] = {
        name,
        avatar,
        id: clientId,
        ready,
        turn: false,
        cards: 0,
      };
    },
    onderegister({ index }) {
      this.players[index] = undefined;
    },
    oncommand(command) {
      switch (command.name) {
        case 'ready':
          const player = this.activePlayer.find(({ id }) => id === command.clientId);

          if (player) {
            player.ready = command.status;
          }
          break;
        case 'start':
          this.drawCount = 0;
          this.gameStarted = true;
          this.played = command.init;
          this.color = command.init[0];
          this.selectedIndex = null;
          this.cards = sortBySuit(command.cards);
          this.cards = sortBySuit(command.cards);
          this.activePlayer.forEach((player) => {
            player.cards = 7;
            player.trophy = false;
          });
          this.createScoreTable();
          break;
        case 'turn':
          this.activePlayer.forEach((player) => player.turn = player.id === command.clientId);

          if (command.selectColor && command.clientId === this.profile.clientId) {
            this.showColorButton = true;
          }

          if (!command.selectColor) {
            this.rotateDirection();
          }

          break;
        case 'draw':
          const drawedPlayer = this.getActivePlayer(command.clientId);

          this.showPlayerMessage(drawedPlayer, this.$t('Draw card(s)'));

          if (command.clientId === this.selfPlayer.id) {
            this.cards = sortBySuit([
              ...this.cards,
              ...command.cards,
            ]);
            this.selfPlayer.cards = this.cards.length;
          } else {
            drawedPlayer.cards += command.cards;
          }
          break;
        case 'clear':
          // this.played = null;
          this.drawCount = command.count;
          break;
        case 'play':
          const playedPlayerIndex = this.activePlayer.findIndex(({ id }) => id === command.clientId);
          const playedPlayer = this.activePlayer[playedPlayerIndex];

          this.playedPlayerIndex = playedPlayerIndex;
          this.played = command.card;

          setTimeout(() => this.playedPlayerIndex = null, 2000);

          const color = command.card[0];

          if (SUITS.includes(color)) {
            this.color = color;
          }

          if (playedPlayer) {
            playedPlayer.cards -= 1;

            if (playedPlayer.cards === 1) {
              this.showPlayerMessage(playedPlayer, 'UNO');
            }
          }

          if (command.count) {
            this.drawCount = command.count;
          }

          if (command.direction) {
            this.direction = command.direction;
          }

          break;
        case 'color':
          this.color = command.color;
          this.showColorButton = false;

          const coloredPlayer = this.getActivePlayer(command.clientId);
          const COLOR_MAPPING = {
            'R': this.$t('Red'),
            'Y': this.$t('Yellow'),
            'G': this.$t('Green'),
            'B': this.$t('Blue'),
          };

          this.showPlayerMessage(coloredPlayer, COLOR_MAPPING[command.color]);
          break;
        case 'end':
          this.showColorButton = false;
          const trophyId = command.clientId;

          this.isReady = false;
          this.gameStarted = false;
          this.activePlayer.forEach((player) => {
            player.turn = false;
            player.trophy = player.id === trophyId;
          });
          this.activePlayer
            .filter(({ id }) => id !== 'host')
            .forEach((player) => player.ready = false);

          const scores = this.players.map((player) => player ? score(player.cards) : '--');

          this.updateScoreTable(scores);
          this.updateRecords({
            type: this.profile.type,
            win: trophyId === this.profile.clientId,
          });
          break;
        default:
      }
    },
    onclose() {
      this.showDisconnectedDialog = true;
      this.service = null;
    },
    showPlayerMessage(player, message='', timeout=2000) {
      player.message = message;

      if (player.$timeout) clearTimeout(player.$timeout);

      player.$timeout = setTimeout(() => {
        player.message = null;
        player.$timeout = null;
      }, timeout);
    },
    onmessage({ clientId, content }) {
      const player = this.getActivePlayer(clientId);

      if (player) {
        this.appendMessageToWindow(content, player);
        this.showPlayerMessage(player, content, 5000);
      }
    },
    onClickReady() {
      this.isReady = !this.isReady;
      this.service.sendReady(this.isReady);
    },
    async onClickReconnect() {
      this.showDisconnectedDialog = false;

      await this.init();

      this.loading = false;
    },
    onClickCloseWindow() {
      window.close();
    },
    onAccount({ name, avatar }) {
      this.nickname = name;
      this.avatar = avatar;
      this.updateAccount({
        nickname: name,
        avatar,
      });
      this.init();
    },
    onPassword(password) {
      this.password = password;
      this.init();
    },
    sendMessage() {
      const { newMessage } = this;

      if (newMessage) {
        this.newMessage = null;
        this.service.sendMessage({
          content: newMessage,
        });
      }
    },
    handCardStyle(layerIndex, cardIndex) {
      const { MAX_CARD_WIDTH, selectedIndex, cardInterval } = this;
      const isActive = selectedIndex === cardIndex;
      const left = layerIndex * (MAX_CARD_WIDTH * cardInterval);

      return {
        top: `${ isActive ? -40 : 0 }px`,
        left: `${left}px`,
      };
    },
    handCardClass(name, index) {
      const { selfPlayer, selectedIndex, selectedCard } = this;
      const isCompliantCard = this.isCompliantCard(name);

      return {
        [`uno-card-${name}`]: true,
        'selected': selectedIndex === index,
        'remind': selfPlayer.turn && !selectedCard && isCompliantCard,
      };
    },
    onClickCard(index) {
      this.selectedIndex = (this.selectedIndex === index ) ? null : index;
    },
    selectColor(color) {
      this.service.selectColor(color);
    },
    playCard(card) {
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            await this.service.playCard(card);

            resolve();
          } catch (err) {
            reject(err);
          };
        }, 0);
      });
    },
    async onClickPlayCard() {
      if (this.selectedIndex !== null) {
        try {
          this.selfPlayer.turn = false;

          await this.playCard(this.selectedCard);

          this.cards.splice(this.selectedIndex, 1);
          this.selectedIndex = null;
        } catch (err) {
          console.warn('service.playCard failed', err);
        }
      }
    },
    onClickDraw() {
      this.selfPlayer.turn = false;
      this.selectedIndex = null;

      setTimeout(() => this.service.draw(), 0);
    },
    appendMessageToWindow(message, client) {
      const data = {
        sender: client.name,
        time: Date.now(),
        message,
      };

      if (client.id === this.profile?.clientId) {
        data.align = 'right';
        data.sender = this.$t('You');
      }

      this.$refs.messageWindow.appendMessage(data);
    },
    createScoreTable() {
      if (this.scoreRenew) {
        this.scoreRenew = false;
        this.scoreIndex += 1;
        this.scoreTables[this.scoreIndex] = {
          players: this.activePlayer.map((player) => player.avatar),
          totals: this.activePlayer.map(() => 0),
          scores: [],
        };
      }
    },
    updateScoreTable(scores=[]) {
      const { scoreIndex } = this;
      const scoreTable = this.scoreTables[scoreIndex];
      const index = scores.findIndex(value => value === 0);
      const total = scores.filter(value => value !== '--')
        .reduce((acc, curr) => acc + curr) * -1;

      scores[index] = total;
      scoreTable.scores.unshift(scores);
      scoreTable.totals = scoreTable.totals.map((value, i) => value += (scores[i] !== '--' ? scores[i] : 0 ));
    },
    getActivePlayer(clientId) {
      return this.activePlayer.find(({ id }) => id === clientId);
    },
    isCompliantCard(card) {
      const { color, played, drawCount } = this;
      const onlyAllowDraw = drawCount > 0;

      return isCompliant(played, card, {
        onlyAllowDraw,
        currentColor: color,
      });
    },
    rotateDirection() {
      this.directionRotate = true;

      setTimeout(() => this.directionRotate = false, 1500);
    },
  },
  async mounted() {
    this.db = await this.idbConnect();

    const { nickname, avatar } = await this.getAccount();

    this.nickname = nickname;
    this.avatar = avatar;

    if (nickname) {
      this.init();
    } else {
      this.$refs.accountDialog.show();
    }

    // document.addEventListener('visibilitychange', this.onvisibilitychange);
  },
};
</script>

<template>
  <v-app>
    <v-container>
      <v-row>
        <v-col cols="12" md="9">
          <!-- first layer -->
          <v-row>
            <v-col cols="12" class="pb-0 d-flex justify-center h-80">
              <v-menu
                v-model="showTopMenu"
                :close-on-content-click="false"
              >
                <template v-slot:activator="{ props }">
                  <div v-bind="props" v-if="secondPlayer"
                    class="pa-2 d-flex align-center"
                    :class="{
                      'lh-52': !secondPlayer.turn,
                      'active-player': secondPlayer.turn,
                    }"
                  >
                    <svg-icon v-if="secondPlayer.trophy"
                      class="yellow mr-2"
                      type="mdi"
                      style="width: 32px; height: 32px;"
                      :path="mdiTrophy"
                    ></svg-icon>
                    <AccountAvatar
                      class="account-avatar"
                      :class="{ active: secondPlayer.turn }"
                      :avatar="secondPlayer.avatar"
                    />
                    <span
                      class="ml-2 account-name d-none d-md-inline-block"
                      :class="{ active: secondPlayer.turn }"
                    >
                      {{ secondPlayer.name }}
                    </span>
                    <span v-if="secondPlayer.ready && !gameStarted"
                      class="ml-2 mdi mdi-hand-okay"></span>
                  </div>
                </template>
                <v-list
                  class="text-h5"
                  style="background-color: bisque; color: black;"
                >
                  <v-list-item>
                    <v-list-item-title>
                      <span class="d-md-none">{{ secondPlayer.name }}: </span>{{ secondPlayer.message }}
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-col>
            <v-col cols="12" class="d-flex justify-center">
              <div class="p-relative"
                :style="{
                  width: `${ (MAX_CARD_WIDTH + (secondPlayerCards - 1) * SPACING * MAX_CARD_WIDTH) * HAND_ZOOM }px`,
                  height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                }"
              >
                <div v-for="(_, index) in Array.from({ length: secondPlayerCards })"
                  class="p-absolute uno-card-back"
                  :style="{
                    left: `${ index * (MAX_CARD_WIDTH) * Math.max(0.3, 1/(secondPlayerCards - 1)) * HAND_ZOOM }px`,
                  }"
                ></div>
              </div>
            </v-col>
          </v-row>

          <!-- second layer -->
          <v-row :style="{
              'max-height': `${ MAX_CARD_HEIGHT }px`,
            }">
            <!-- left block -->
            <v-col cols="2" md="4">
              <v-row class="p-relative">
                <v-col cols="8" class="sides-account left d-flex justify-end"
                  :class="{
                    active: (firstPlayer && firstPlayer.turn),
                  }"
                >
                  <v-menu
                    v-model="showLeftMenu"
                    location="end"
                    :close-on-content-click="false"
                  >
                    <template v-slot:activator="{ props }">
                      <div v-bind="props" v-if="firstPlayer"
                        class="pa-2 h-fit-content d-flex align-center"
                        :class="{
                          'active-player': firstPlayer.turn,
                        }"
                      >
                        <svg-icon v-if="firstPlayer.trophy"
                          class="yellow mr-2"
                          type="mdi"
                          style="width: 32px; height: 32px;"
                          :path="mdiTrophy"
                        ></svg-icon>
                        <AccountAvatar
                          class="account-avatar"
                          :class="{ active: firstPlayer.turn }"
                          :avatar="firstPlayer.avatar"
                        />
                        <span
                          class="ml-2 account-name d-none d-md-inline-block"
                          :class="{ active: firstPlayer.turn }"
                        >
                          {{ firstPlayer.name }}
                        </span>
                        <span v-if="firstPlayer.ready && !gameStarted"
                          class="mdi mdi-hand-okay ml-2"></span>
                      </div>
                    </template>
                    <v-list
                      class="text-h5"
                      style="background-color: bisque; color: black;"
                    >
                      <v-list-item>
                        <v-list-item-title>
                          <span class="d-md-none">{{ firstPlayer.name }}: </span>{{ firstPlayer.message }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>
                <v-col cols="4" class="d-flex justify-center sides-cards">
                  <div class="p-relative"
                    :style="{
                      width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                      height: `${ (MAX_CARD_HEIGHT + (firstPlayerCards - 1) * 0.2 * MAX_CARD_HEIGHT) * HAND_ZOOM }px`,
                    }"
                  >
                    <div v-for="(_, index) in Array.from({ length: firstPlayerCards })"
                      class="p-absolute uno-card-back"
                      :style="{
                        top: `${ index * (MAX_CARD_HEIGHT) * 0.2 * HAND_ZOOM }px`,
                      }"
                    ></div>
                  </div>
                </v-col>
              </v-row>
            </v-col>
            <!-- center block -->
            <v-col cols="8" md="4">
              <v-row class="card-table"
                :style="{
                  height: '255px',
                }"
              >
                <v-col cols="12" class="d-flex justify-space-between">
                  <svg-icon v-if="played"
                    :class="{
                      [directionIconDegree]: true,
                      [`background-${color}`]: !!color,
                      [directionIconAnimation]: true,
                    }"
                    class="direction"
                    type="mdi"
                    width="40"
                    height="40"
                    :path="directionIcon"
                  ></svg-icon>
                  <div class="p-relative"
                    :class="playedCardClass"
                    :style="{
                      width: `${ MAX_CARD_WIDTH * DISPLAY_ZOOM }px`,
                      height: `${ MAX_CARD_HEIGHT * DISPLAY_ZOOM }px`,
                    }"
                  >
                    <div v-if="played && COLOR_CARDS.includes(played)"
                      class="p-absolut"
                      :class="`uno-card-${played}`"
                    ></div>
                    <div v-else-if="played"
                      class="p-absolut scale-04"
                      :class="`uno-card-${played}`"
                    ></div>
                  </div>
                  <div style="width: 40px;height: 40px;font-size: 24px; line-height: 40px;">{{ drawCountLabel }}</div>
                </v-col>
                <v-col cols="12" class="pt-0 d-flex justify-center">
                  <v-menu
                    v-model="showBottomMenu"
                    :close-on-content-click="false"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <div v-bind="props" v-if="selfPlayer"
                        class="pa-2 d-flex align-center p-relative"
                        :class="{
                          'active-player': selfPlayer.turn,
                        }"
                      >
                        <svg-icon v-if="selfPlayer.trophy"
                          class="yellow mr-2"
                          type="mdi"
                          style="width: 32px; height: 32px;"
                          :path="mdiTrophy"
                        ></svg-icon>
                        <AccountAvatar
                          class="account-avatar"
                          :avatar="selfPlayer.avatar"
                          :class="{
                            active: selfPlayer.turn
                          }"
                        />
                        <span
                          class="ml-2 account-name d-none d-md-inline-block"
                          :class="{
                            active: selfPlayer.turn
                          }"
                        >
                          {{ selfPlayer.name }}
                        </span>
                        <span v-if="selfPlayer.ready && !gameStarted"
                          class="ml-2 mdi mdi-hand-okay"></span>
                        <AvatarTimer v-if="selfPlayer.turn"
                          class="avatar-timer"
                          @timeout="onClickDraw"
                        >
                        </AvatarTimer>
                      </div>
                    </template>
                    <v-list
                      class="text-h5"
                      style="background-color: bisque; color: black;"
                    >
                      <v-list-item>
                        <v-list-item-title>
                          <span class="d-md-none">{{ selfPlayer.name }}: </span>{{ selfPlayer.message }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>
              </v-row>
            </v-col>
            <!-- right block -->
            <v-col cols="2" md="4">
              <v-row class="p-relative">
                <v-col cols="4" class="d-flex justify-center sides-cards">
                  <div class="p-relative"
                    :style="{
                      width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                      height: `${ (MAX_CARD_HEIGHT + (thirdPlayerCards - 1) * 0.2 * MAX_CARD_HEIGHT) * HAND_ZOOM }px`,
                    }"
                  >
                    <div v-for="(_, index) in Array.from({ length: thirdPlayerCards })"
                      class="p-absolute uno-card-back"
                      :style="{
                        top: `${ index * (MAX_CARD_HEIGHT) * 0.2 * HAND_ZOOM }px`,
                      }"
                    ></div>
                  </div>
                </v-col>
                <v-col cols="8" class="sides-account right d-flex justify-start"
                  :class="{
                    active: (thirdPlayer && thirdPlayer.turn),
                  }"
                >
                  <v-menu
                    v-model="showRightMenu"
                    location="start"
                    :close-on-content-click="false"
                  >
                    <template v-slot:activator="{ props }">
                      <div v-bind="props" v-if="thirdPlayer"
                        class="pa-2 h-fit-content d-flex align-center"
                        :class="{
                          'active-player': thirdPlayer.turn,
                        }"
                      >
                        <svg-icon v-if="thirdPlayer.trophy"
                          class="yellow mr-2"
                          type="mdi"
                          style="width: 32px; height: 32px;"
                          :path="mdiTrophy"
                        ></svg-icon>
                        <AccountAvatar
                          class="account-avatar"
                          :class="{ active: thirdPlayer.turn }"
                          :avatar="thirdPlayer.avatar"
                        />
                        <span
                          class="ml-2 account-name d-none d-md-inline-block"
                          :class="{ active: thirdPlayer.turn }"
                        >
                          {{ thirdPlayer.name }}
                        </span>
                        <span v-if="thirdPlayer.ready && !gameStarted"
                          class="ml-2 mdi mdi-hand-okay"></span>
                      </div>
                    </template>
                    <v-list
                      class="text-h5"
                      style="background-color: bisque; color: black;"
                    >
                      <v-list-item>
                        <v-list-item-title>
                          <span class="d-md-none">{{ thirdPlayer.name }}: </span>{{ thirdPlayer.message }}
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>
              </v-row>
            </v-col>
          </v-row>

          <!-- third layer -->
          <v-row class="mt-16">
            <v-col cols="12"
              class="d-flex justify-center"
            >
              <div
                class="p-relative d-none d-md-block"
                :style="{
                  width: `${ handCardsWidth }px`,
                  height: `${ MAX_CARD_HEIGHT }px`,
                }"
              >
                <div v-for="(card, index) in cards"
                  class="p-absolute uno-card scale-05"
                  :class="handCardClass(card, index)"
                  :style="handCardStyle(index, index)"
                  @click="onClickCard(index)"
                ></div>
              </div>
              <div
                class="w-100 d-md-none"
                :style="{
                  height: `${MAX_CARD_HEIGHT * MD_DOWN_ZOOM + (cardsLayerForMD - 1) * 40}px`,
                }"
              >
                <div v-for="(i) in cardsArraysForMD"
                  class="p-relative w-100"
                  :style="{
                    'margin-top': `${40 * i}px`,
                  }"
                >
                  <div v-for="(card, index) in cards.slice(i * 12, (i + 1) * 12)"
                    class="p-absolute uno-card scale-03"
                    :class="handCardClass(card, index)"
                    :style="handCardStyle(index, index + i * 12)"
                    @touchend="onClickCard(index + i * 12)"
                  ></div>
                </div>
              </div>
            </v-col>
            <v-col cols="12"class="d-flex flex-column full-height" >
              <v-row>
                <v-col cols="0" md="2" class="d-none d-md-block"></v-col>
                <v-col cols="5" md="4">
                  <v-row v-if="showColorButton">
                    <v-col cols="3">
                      <v-btn
                        class="h-56 background-R"
                        block
                        @click="selectColor('R')"
                      ></v-btn>
                    </v-col>
                    <v-col cols="3">
                      <v-btn
                        class="h-56 background-Y"
                        block
                        @click="selectColor('Y')"
                      ></v-btn>
                    </v-col>
                    <v-col cols="3">
                      <v-btn
                        class="h-56 background-G"
                        block
                        @click="selectColor('G')"
                      ></v-btn>
                    </v-col>
                    <v-col cols="3">
                      <v-btn
                        class="h-56 background-B"
                        block
                        @click="selectColor('B')"
                      ></v-btn>
                    </v-col>
                  </v-row>
                </v-col>
                <v-col cols="3" md="2">
                  <v-btn
                    class="h-56 red-button"
                    block
                    :disabled="disableDraw"
                    @click="onClickDraw"
                  >{{ $t('Draw card(s)') }}</v-btn>
                </v-col>
                <v-col cols="4" md="2">
                  <v-btn
                    v-if="!gameStarted"
                    class="h-56"
                    color="blue"
                    variant="elevated"
                    block
                    @click="onClickReady"
                  >
                    {{ readyLabel }}
                  </v-btn>
                  <v-btn
                    v-if="gameStarted"
                    class="h-56"
                    color="success"
                    :disabled="!enablePlayCard"
                    @click="onClickPlayCard"
                    block
                  >{{ $t('Play Card') }}</v-btn>
                </v-col>
                <v-col cols="0" md="2" class="d-none d-md-block"></v-col>
              </v-row>
              <v-row>
                <v-col cols="0" md="2" class="d-none d-md-block"></v-col>
                <v-col cols="8" md="6">
                  <v-text-field
                    ref="messageInput"
                    v-model="newMessage"
                    :label="$t('Type a message')"
                    filled
                    hide-details
                    @keyup.enter="sendMessage"
                  ></v-text-field>
                </v-col>
                <v-col cols="4" md="2">
                  <v-btn
                    class="h-56"
                    variant="elevated"
                    @click="sendMessage"
                    block
                    :disabled="!newMessage">{{ $t('Send') }}
                  </v-btn>
                </v-col>
                <v-col cols="0" md="2" class="d-none d-md-block"></v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="12" md="3">
          <v-expansion-panels
            v-model="expandedPanels"
          >
            <v-expansion-panel>
              <v-expansion-panel-title>
                {{ $t('Score') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="expansion-panel">
                <v-table v-for="scoreTable in scoreTables">
                  <thead>
                    <tr>
                      <th v-for="player in scoreTable.players"
                        class="text-center"
                      >
                        <AccountAvatar
                          class="account-avatar"
                          :avatar="player"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-weight-black total-score" v-for="total in scoreTable.totals">{{ total }}</td>
                    </tr>
                    <tr v-for="scores in scoreTable.scores">
                      <td v-for="score in scores"
                        :class="{
                          yellow: score >= 0,
                        }"
                      >{{ score }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel
              :title="$t('Chat History')"
            >
              <v-expansion-panel-text
                class="expansion-panel"
                eager
              >
                <ChatWindow
                  ref="messageWindow"
                  class="pa-0"
                  :displayInput="false"
                ></ChatWindow>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>
    </v-container>

    <v-overlay
      v-model="loading"
      class="d-flex align-center justify-center"
      persistent
    >
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <v-dialog
      v-model="showDisconnectedDialog"
      persistent
      max-width="400px"
    >
      <v-card>
        <v-card-text>
          {{ disconnectedDialogConetnt }}
        </v-card-text>
        <v-card-actions class="d-flex align-stretch">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            @click="onClickReconnect"
          >
            {{ $t('Reconnect') }}
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="onClickCloseWindow"
          >
            {{ $t('Close Window') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <AccountDialog
      ref="accountDialog"
      :showCloseButton="false"
      @account="onAccount"
    />
    <ConnectionPasswordDialog
      ref="passwordDialog"
      @password="onPassword"
    />
  </v-app>
</template>

<style scoped>
.yellow {
  color: yellow;
}

.lh-56 {
  line-height: 56px;
}

.card-table {
  background-color: #222;
}

.v-avatar.account-avatar {
  width: 24px;
  height: 24px;
}

.v-avatar.account-avatar.active {
  width: 40px;
  height: 40px;
}

.account-name {
  opacity: 0.7;
  line-height: 24px;
}

.account-name.active {
  opacity: 1;
  font-size: 20px;
  line-height: 40px;
}

.p-relative {
  position: relative;
}

.p-absolute {
  position: absolute;
}

.v-btn.h-56 {
  height: 56px;
}

.moving-from-left {
  z-index: 1;
  animation: move-from-left 0.5s ease forwards;
}

@keyframes move-from-left {
    from {
        left: -100px;
        transform: scale(1.2);
    }
    to {
        left: 0;
        transform: scale(1);
    }
}

.moving-from-right {
  z-index: 1;
  animation: move-from-right 0.5s ease forwards;
}

@keyframes move-from-right {
    from {
        left: 100px;
        transform: scale(1.2);
    }
    to {
        left: 0;
        transform: scale(1);
    }
}

.moving-from-top {
  z-index: 1;
  animation: move-from-top 0.5s ease forwards;
}

@keyframes move-from-top {
    from {
        top: -70px;
        transform: scale(1.2);
    }
    to {
      top: 0;
        transform: scale(1);
    }
}

.moving-from-bottom {
  z-index: 1;
  animation: move-from-bottom 0.5s ease forwards;
}

@keyframes move-from-bottom {
    from {
        top: 100px;
        transform: scale(1.2);
    }
    to {
      top: 0;
        transform: scale(1);
    }
}

@media (max-width: 959px) {
  .sides-account {
    position: absolute;
    top: -70px;
  }
  .sides-account.active {
    position: absolute;
    top: -80px;
  }
  .sides-account.left {
    left: 22px;
  }
  .sides-account.left.active {
    left: 32px;
  }
  .sides-account.right {
    left: -8px;
  }
  .sides-account.right.active {
    left: -18px;
  }
}

@media (max-width: 959px) {
  .sides-cards {
    padding: 0;
  }
}

.active-player {
  border: 5px solid #FFF;
  border-radius: 10px;
  background-color: var(--v-theme-background);
}

.h-fit-content {
  height: fit-content;
}

.h-80 {
  height: 80px;
}

.lh-52 {
  line-height: 52px;
}

.self.playing-cards:hover {
  border: 5px solid red;
}

.avatar-timer{
  position: absolute;
  top:-16px;
  right: -16px;
  width: 30px;
  height: 30px;
}

.expansion-panel {
  max-height: 70vh;
  overflow-y: auto;
}

.v-table > .v-table__wrapper > table > tbody > tr > th, .v-table > .v-table__wrapper > table > thead > tr > th, .v-table > .v-table__wrapper > table > tfoot > tr > th,
.v-table > .v-table__wrapper > table > tbody > tr > td, .v-table > .v-table__wrapper > table > thead > tr > td, .v-table > .v-table__wrapper > table > tfoot > tr > td {
  height: 36px;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 8px;
}

td.total-score {
  background-color: #333;
}

.bg-transparent {
  background-color: transparent;
}

svg.deg90 {
  --r: 90deg !important;
}

svg.deg270 {
  --r: 270deg !important;
}

svg.direction {
  border-radius: 10px;
}

.rotate-clockwise {
  animation: rotate-clockwise 1.5s ease forwards;
}

@keyframes rotate-clockwise {
  from {
    transform: rotate(90deg);
  }
  to {
    transform: rotate(450deg);
  }
}

.rotate-counterclockwise {
  animation: rotate-counterclockwise 1.5s ease forwards;
}

@keyframes rotate-counterclockwise {
  from {
    transform: rotate(270deg);
  }
  to {
    transform: rotate(-90deg);
  }
}
</style>

<style lang="scss" scoped>
$cardWidth: 120;
$cardHeigth: 180;
$borderWidth: 10;
$borderRadius: 20;
$zoom45: 0.45;

.uno-card-back {
  background-image: url('/cards/UNO_Logo.svg');
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  background-color: #000;
  width: #{ $cardWidth * $zoom45 }px;
  height: #{ $cardHeigth * $zoom45 }px;
  border: #{ $borderWidth * $zoom45 }px solid #fff;
  border-radius: #{ $borderRadius * $zoom45 }px;
}

$zoom85: 0.8;

@mixin uno-card-css {
  width: #{ $cardWidth * $zoom85 }px;
  height: #{ $cardHeigth * $zoom85 }px;
  border: #{ $borderWidth * $zoom85 }px solid #fff;
  border-radius: #{ $borderRadius * $zoom85 }px;
}

$unoColorR: #f55;
$unoColorY: #fa0;
$unoColorG: #5a5;
$unoColorB: #55f;

.uno-card-R {
  @include uno-card-css;
  background-color: #{$unoColorR};
}

.uno-card-Y {
  @include uno-card-css;
  background-color: #{$unoColorY};
}

.uno-card-G {
  @include uno-card-css;
  background-color: #{$unoColorG};
}

.uno-card-B {
  @include uno-card-css;
  background-color: #{$unoColorB};
}

.background-R {
  background-color: #{$unoColorR};
}

.background-Y {
  background-color: #{$unoColorY};
}

.background-G {
  background-color: #{$unoColorG};
}

.background-B {
  background-color: #{$unoColorB};
}

$svgCardWidth: 240;
$svgCardHeigth: 360;
$totalWidth: 3362;
$totalHeigth: 2882;
$colors: R, Y, G, B;
$ranks: 0, 1, 2 ,3, 4, 5 ,6, 7, 8 ,9, S, R, D;

@mixin uno-card {
  background-image: url('/cards/UNO_cards_deck.svg');
  background-repeat: no-repeat;
  width: #{$svgCardWidth + 2}px;
  height: #{$svgCardHeigth + 2}px;
  background-size: #{$totalWidth}px #{$totalHeigth}px;
}

$cardBorderWidth: 10;
$cardBorderRadius: 38;

@mixin uno-card-hover {
  border: #b00 solid #{$cardBorderWidth}px;
  border-radius: #{$cardBorderRadius}px;
}

@mixin uno-card-remind {
  border: #f88 solid #{$cardBorderWidth}px;
  border-radius: #{$cardBorderRadius}px;
}

$remindTop: -15;

@for $i from 1 through length($colors) {
  $color: nth($colors, $i);

  @for $j from 1 through length($ranks) {
    $rank: nth($ranks, $j);
    $card: #{$color}#{$rank};
    $position-x: ($j - 1) * $svgCardWidth * -1;
    $position-y: ($i - 1) * $svgCardHeigth * -1;
    $position-x-with-border: #{$position-x - 8};
    $position-y-with-border: #{$position-y - 8};

    .uno-card-#{$card} {
      @include uno-card;
      background-position-x: #{$position-x}px;
      background-position-y: #{$position-y}px;

      &.remind:not(.selected) {
        top: #{$remindTop}px !important;
      }

      &:hover, &.remind:hover {
        @include uno-card-hover;
        background-position-x: #{$position-x-with-border}px;
        background-position-y: #{$position-y-with-border}px;
      }
    }
  }
}

.uno-card-W {
  @mixin b-position {
    background-position-x: #{$svgCardWidth * -13 - 8}px;
    background-position-y: -8px;
  }

  @include uno-card;
  background-position-x: #{$svgCardWidth * -13}px;
  background-position-y: 0px;

  &.remind:not(.selected) {
    top: #{$remindTop}px !important;
  }

  &:hover, &.remind:hover {
    @include uno-card-hover;
    @include b-position;
  }
}

.uno-card-WD {
  @mixin b-position {
    background-position-x: #{$svgCardWidth * -13 - 8}px;
    background-position-y: #{$svgCardHeigth * -5 - 8}px;
  }

  @include uno-card;
  background-position-x: #{$svgCardWidth * -13}px;
  background-position-y: #{$svgCardHeigth * -5}px;

  &.remind:not(.selected) {
    top: #{$remindTop}px !important;
  }

  &:hover, &.remind:hover {
    @include uno-card-hover;
    @include b-position;
  }
}

$scale: 9;

@for $i from 1 through $scale {
  .scale-0#{$i} {
    transform: scale(#{$i * 0.1});
    transform-origin: top left;
  }
}
</style>
