<script>
import short from 'short-uuid';
import { mapState, mapActions } from 'vuex';
import Service from '@/utils/Service/BigTwo/ClientService.js';
import calculateCardCoords from '@/utils/calculateCardCoords.js';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiHandOkay, mdiTrophy, mdiInformation } from '@mdi/js';
import { sortByRank, sortBySuit, compare, score } from '@/utils/bigTwoHelper.js';
import AccountDialog from '@/components/AccountDialog.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';
import ConnectionPasswordDialog from '@/components/ConnectionPasswordDialog.vue';
import ImageDialog from '@/components/ImageDialog.vue';
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
      MAX_CARD_LENGTH: 13,
      MAX_CARD_WIDTH: 120,
      MAX_CARD_HEIGHT: 167,
      HAND_ZOOM: 0.45,
      DISPLAY_ZOOM: 0.85,
      MD_DOWN_ZOOM: 0.6,
      SPACING: 0.2,
      nickname: null,
      avatar: null,
      showDisconnectedDialog: false,
      connectResponseCode: null,
      siteId: this.$route.params.siteId,
      loading: false,
      service: null,
      db: null,
      id: short.generate(),
      password: null,
      pwdRequired: false,
      profile: null,
      participants: [],
      participantIndex: null,
      // cardNumbers: [0, 0, 0],
      nickname: null,
      avatar: null,
      gameStarted: false,
      cards: [],
      selected: [],
      hover: null,
      played: [],
      playedPlayerIndex: null,
      only3c: false,
      cardBack: 'Blue_Back',
      orderBySuits: false,
      players: [],
      participantIndex: null,
      isReady: false,
      newMessage: null,
      expandedPanels: [0],
      scoreTables: [],
      scoreIndex: -1,
      scoreRenew: true,
      mdiHandOkay,
      mdiTrophy,
      mdiInformation,
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
    maxCardsWidth() {
      if (this.cards.length <= 1) {
        return this.MAX_CARD_WIDTH
      }

      const cards = calculateCardCoords(this.cards.length);
      const first = cards.shift();
      const { x } = cards.pop();

      return x + this.MAX_CARD_WIDTH + first.x;
    },
    maxCardsHeight() {
      const { y } = calculateCardCoords(this.MAX_CARD_LENGTH).pop();

      return y + this.MAX_CARD_HEIGHT;
    },
    disablePlayCard() {
      return this.selected.length <= 0
        || !compare(this.played, this.selected)
        || (this.only3c && !this.selected.includes('3C'));
    },
    disablePass() {
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
    activePlayer() {
      return this.players.filter((player) => player);
    },
    showRightMenu() {
      return !!this.thirdPlayer?.message;
    },
    // allPlayersReady() {
    //   // const players = this.players.filter((player) => player);

    //   // return players.length >= this.PLAYERS_THRESHOLD
    //   //   && players.every((player) => player.ready);
    //   return true;
    // },
    cardsCoord() {
      const cardCoords = calculateCardCoords(this.cards.length);

      return this.cards.map(( name, index ) => ({
        name,
        ...cardCoords[index],
      }));
    },
    playedCardClass() {
      const mapping = ['moving-from-bottom', 'moving-from-left', 'moving-from-top', 'moving-from-right'];
      let index = this.playedPlayerIndex - this.participantIndex;

      index = index < 0 ? index + 4 : index;

      return mapping[index] || '';
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
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
      this.selected = [];
      this.hover = null;
      this.played = [];
      this.only3c = false;
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
          this.gameStarted = true;
          this.played = [];
          this.selected = [];
          this.cards = this.orderBySuitsts
            ? sortBySuit(command.cards)
            : sortByRank(command.cards);
          this.activePlayer.forEach((player) => {
            player.cards = Array.from({ length: 13 }).map(() => this.cardBack);
            player.trophy = false;
          });
          this.createScoreTable();
          break;
        case 'turn':
          this.activePlayer.forEach((player) => player.turn = player.id === command.clientId);
          this.only3c = command.init;
          break;
        case 'pass':
          const passedPlayer = this.activePlayer.find(({ id }) => id === command.clientId);

          if (passedPlayer) {
            this.showPlayerMessage(passedPlayer, 'PASS');
          }
          break;
        case 'clear':
          this.played = [];
          break;
        case 'play':
          const playedPlayerIndex = this.activePlayer.findIndex(({ id }) => id === command.clientId);
          const playedPlayer = this.activePlayer[playedPlayerIndex];

          this.playedPlayerIndex = playedPlayerIndex;
          this.played = command.cards;

          if (playedPlayer) {
            playedPlayer.cards.length -= command.cards.length;
          }
          break;
        case 'end':
          const trophyId = command.clientId;

          this.isReady = false;
          this.gameStarted = false;
          this.activePlayer.forEach((player) => {
            player.turn = false;
            player.trophy = player.id === trophyId;

            if (command.cards[player.id]) player.cards = sortByRank(command.cards[player.id]);
          });
          this.activePlayer
            .filter(({ id }) => id !== 'host')
            .forEach((player) => player.ready = false);

          const scores = this.players.map((player) => player ? score(player.cards) : '--');

          this.updateScoreTable(scores);
          break;
        default:
      }
    },
    onclose() {
      this.showDisconnectedDialog = true;
      this.service = null;
    },
    showPlayerMessage(player, message='PASS', timeout=2000) {
      player.message = message;

      if (player.$timeout) clearTimeout(player.$timeout);

      player.$timeout = setTimeout(() => {
        player.message = null;
        player.$timeout = null;
      }, timeout);
    },
    onmessage({ clientId, content }) {
      const player = this.activePlayer.find(({ id }) => id === clientId);

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
    fanCardStyle(card, name) {
      const { MAX_CARD_WIDTH, MAX_CARD_HEIGHT, selected, hover } = this;
      const isActive = selected.includes(name) || hover === name;

      return {
        width: `${MAX_CARD_WIDTH}px`,
        height: `${MAX_CARD_HEIGHT}px`,
        top: `${ isActive ? (card.y - 30) : card.y }px`,
        left: `${card.x}px`,
        transform: `rotate(${card.angle}deg) translateZ(0px)`,
      };
    },
    handCardStyle(name, index) {
      const { MAX_CARD_WIDTH, MAX_CARD_HEIGHT, MD_DOWN_ZOOM, selected, hover } = this;
      const isActive = selected.includes(name) || hover === name;
      const left = index * (MAX_CARD_WIDTH * MD_DOWN_ZOOM * 0.3);

      return {
        width: `${MAX_CARD_WIDTH * MD_DOWN_ZOOM}px`,
        height: `${MAX_CARD_HEIGHT * MD_DOWN_ZOOM}px`,
        top: `${ isActive ? -30 : 0 }px`,
        left: `${left}px`,
      };
    },
    onMouseover(card) {
      this.hover = card;
    },
    onMouseout() {
      this.hover = null;
    },
    onClickCard(card) {
      if (this.selected.includes(card)) {
        this.selected = this.selected.filter((selectedCard) => selectedCard !== card);
      } else {
        this.selected.push(card);
      }
    },
    async onClickPlayCard() {
      if (this.selected.length) {
        try {
          await this.service.playCard(this.selected);

          this.cards = this.cards.filter((card) => !this.selected.includes(card));
          this.selected = [];
        } catch (err) {
          console.warn('service.playCard failed', err);
        }
      }
    },
    onClickPass() {
      this.service.pass();
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
          players: this.players.map((player) => player.avatar),
          totals: this.players.map(() => 0),
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
  },
  watch: {
    orderBySuits(value) {
      const { cards } = this;

      this.cards = value ? sortBySuit(cards) : sortByRank(cards);
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
                    class="pa-2  d-flex align-center"
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
                  width: `${ (MAX_CARD_WIDTH + (secondPlayerCards.length - 1) * SPACING * MAX_CARD_WIDTH) * HAND_ZOOM }px`,
                  height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                }"
              >
                <img v-for="(card, index) in secondPlayerCards"
                  class="playing-cards p-absolute"
                  :style="{
                    left: `${ index * (MAX_CARD_WIDTH) * SPACING * HAND_ZOOM }px`,
                    top: '0px',
                    width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                    height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                  }"
                  :src="`/cards/${card}.svg`"
                ></img>
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
                      height: `${ (MAX_CARD_HEIGHT + (firstPlayerCards.length - 1) * SPACING * MAX_CARD_HEIGHT) * HAND_ZOOM }px`,
                    }"
                  >
                    <img v-for="(card, index) in firstPlayerCards"
                      class="playing-cards p-absolute"
                      :style="{
                        top: `${ index * (MAX_CARD_HEIGHT) * HAND_ZOOM * SPACING }px`,
                        left: '0px',
                        width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                        height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                      }"
                      :src="`/cards/${card}.svg`"
                    ></img>
                  </div>
                </v-col>
              </v-row>
            </v-col>
            <!-- center block -->
            <v-col cols="8" md="4">
              <v-row class="card-table"
                :style="{
                  height: `${ (MAX_CARD_HEIGHT + 12 * SPACING * MAX_CARD_HEIGHT) * HAND_ZOOM }px`,
                }"
              >
                <v-col cols="12" class="d-flex justify-center">
                  <div class="p-relative"
                    :class="playedCardClass"
                    :style="{
                      width: `${ MAX_CARD_WIDTH + (played.length - 1) * SPACING * MAX_CARD_WIDTH * DISPLAY_ZOOM}px`,
                      height: `${ MAX_CARD_HEIGHT * DISPLAY_ZOOM }px`,
                    }"
                  >
                    <img v-for="(card, index ) in played"
                      class="playing-cards p-absolute"
                      :style="{
                        'max-with': `${ MAX_CARD_WIDTH * DISPLAY_ZOOM}px`,
                        'max-height': `${ MAX_CARD_HEIGHT * DISPLAY_ZOOM}px`,
                        left: `${ index * (MAX_CARD_WIDTH) * SPACING }px`,
                      }"
                      :src="`/cards/${ card }.svg`"
                    ></img>
                  </div>
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
                          @timeout="onClickPass"
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
                      height: `${ (MAX_CARD_HEIGHT + (thirdPlayerCards.length - 1) * SPACING * MAX_CARD_HEIGHT) * HAND_ZOOM }px`,
                    }"
                  >
                    <img v-for="(card, index) in thirdPlayerCards"
                      class="playing-cards p-absolute"
                      :style="{
                        top: `${ index * (MAX_CARD_HEIGHT) * HAND_ZOOM * SPACING }px`,
                        left: '0px',
                        width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                        height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                      }"
                      :src="`/cards/${card}.svg`"
                    ></img>
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
                  width: `${maxCardsWidth}px`,
                  height: `${maxCardsHeight}px`,
                }"
              >
                <img v-for="card in cardsCoord"
                  class="self playing-cards p-absolute"
                  :style="fanCardStyle(card, card.name)"
                  :src="`/cards/${card.name}.svg`"
                  @click="onClickCard(card.name)"
                ></img>
              </div>
              <div
                class="p-relative d-md-none"
                :style="{
                  width: '100%',
                  height: `${MAX_CARD_HEIGHT * MD_DOWN_ZOOM}px`,
                }"
              >
                <img v-for="(card, index) in cards"
                  class="playing-cards p-absolute"
                  :style="handCardStyle(card, index)"
                  :src="`/cards/${card}.svg`"
                  @touchend="onClickCard(card)"
                ></img>
              </div>
            </v-col>
            <v-col cols="12"class="d-flex flex-column full-height" >
              <v-row>
                <v-col cols="0" md="2" class="d-none d-md-block"></v-col>
                <v-col cols="5" md="3">
                  <v-switch
                    v-model="orderBySuits"
                    :color="orderBySuits ? 'primary' : ''"
                    :label="$t('Sort by Suit')"
                    hide-details
                  ></v-switch>
                </v-col>
                <v-col cols="3" md="2">
                  <v-btn
                    class="h-56"
                    block
                    :disabled="disablePass"
                    @click="onClickPass"
                  >{{ $t('Pass') }}</v-btn>
                </v-col>
                <v-col cols="4" md="3">
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
                    :disabled="disablePlayCard"
                    @click="onClickPlayCard"
                    block
                  >{{ $t('Play Card') }}</v-btn>
                </v-col>
                <v-col cols="0" md="2" class="d-none d-md-block"></v-col>
              </v-row>
              <v-row>
                <v-col cols="0" md="2" class="d-none d-md-block"></v-col>
                <v-col cols="8" md="5">
                  <v-text-field
                    ref="messageInput"
                    v-model="newMessage"
                    :label="$t('Type a message')"
                    filled
                    hide-details
                    @keyup.enter="sendMessage"
                  ></v-text-field>
                </v-col>
                <v-col cols="4" md="3">
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
          <!-- <v-card
            width="100%"
          >
            <v-card-text class="text-start">

            </v-card-text>
          </v-card> -->
          <v-expansion-panels
            v-model="expandedPanels"
          >
            <v-expansion-panel>
              <v-expansion-panel-title>
                {{ $t('Score') }}
                <v-btn class="ml-1 bg-transparent" icon="mdi-information" size="x-small">
                  <svg-icon type="mdi" :path="mdiInformation"></svg-icon>
                  <v-tooltip
                    activator="parent"
                    location="bottom"
                  >
                    <ul class="pl-3">
                      <li>{{ $t('One card counts as one point') }}</li>
                      <li>{{ $t('One deuce (2) counts double') }}</li>
                    </ul>
                  </v-tooltip>
                </v-btn>
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
  animation: move-from-left 1s forwards;
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
  animation: move-from-right 1s forwards;
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
  animation: move-from-top 1s forwards;
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
  animation: move-from-bottom 1s forwards;
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

</style>
