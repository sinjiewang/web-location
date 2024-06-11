<script>
import { /*mapState, mapGetters,*/ mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';
import Service from '@/utils/Service/BigTwo/SiteService.js';
import BaseSite from '@/components/BaseSite.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';
import calculateCardCoords from '@/utils/calculateCardCoords.js';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiHandOkay, mdiTrophy } from '@mdi/js';
import { sortByRank, sortBySuit, compare } from '@/utils/bigTwoHelper.js';

export default {
  extends: BaseSite,
  components: {
    AccountAvatar,
    SvgIcon,
  },
  data() {
    return {
      PLAYERS_THRESHOLD: 4,
      MAX_CARD_LENGTH: 13,
      MAX_CARD_WIDTH: 120,
      MAX_CARD_HEIGHT: 167,
      HAND_ZOOM: 0.45,
      DISPLAY_ZOOM: 0.85,
      MD_DOWN_ZOOM: 0.6,
      SPACING: 0.2,
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
      newMessage: null,
      mdiHandOkay,
      mdiTrophy,
    };
  },
  computed: {
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
      return this.players[0];
    },
    showBottomMenu() {
      return !!this.selfPlayer?.message;
    },
    firstPlayer() {
      return this.players[1];
    },
    firstPlayerCards() {
      return this.firstPlayer?.cards || 0;
    },
    showLeftMenu() {
      return !!this.firstPlayer?.message;
    },
    secondPlayer() {
      return this.players[2];
    },
    secondPlayerCards() {
      return this.secondPlayer?.cards || 0;
    },
    showTopMenu() {
      return !!this.secondPlayer?.message;
    },
    thirdPlayer() {
      return this.players[3];
    },
    thirdPlayerCards() {
      return this.thirdPlayer?.cards || 0;
    },
    showRightMenu() {
      return !!this.thirdPlayer?.message;
    },
    activePlayer() {
      return this.players.filter((player) => player);
    },
    allPlayersReady() {
      return this.activePlayer.length >= this.PLAYERS_THRESHOLD
        && this.activePlayer.every((player) => player.ready);
      // return true;
    },
    cardsCoord() {
      const cardCoords = calculateCardCoords(this.cards.length);

      return this.cards.map(( name, index ) => ({
        name,
        ...cardCoords[index],
      }));
    },
    startLabel() {
      return `( ${this.activePlayer.length} / ${this.PLAYERS_THRESHOLD} )`;
    },
    playedCardClass() {
      const mapping = ['moving-from-bottom', 'moving-from-left', 'moving-from-top', 'moving-from-right'];

      return mapping[this.playedPlayerIndex] || '';
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    createService({ id, profile, tunnel, db }) {
      const service = new Service({
        id,
        tunnel,
        db,
        profile: toRaw(profile),
      });

      service.on('register', (event) => this.onregister(event));
      service.on('deregister', (event) => this.onderegister(event));
      service.on('message', (event) => this.onmessage(event));
      service.on('command', (event) => this.oncommand(event));

      return service;
    },
    onregister(register) {
      const { name, avatar, clientId, index } = register;

      this.players[index] = {
        name,
        avatar,
        id: clientId,
        ready: false,
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
          this.cards = this.orderBySuitsts
            ? sortBySuit(command.cards)
            : sortByRank(command.cards);
          this.activePlayer.forEach((player) => {
            player.cards = 13;
            player.trophy = false;
          });
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
            playedPlayer.cards -= command.cards.length;
          }
          break;
        case 'end':
          const trophyId = command.clientId;

          this.gameStarted = false;
          this.activePlayer.forEach((player) => {
            player.turn = false;
            player.trophy = player.id === trophyId;
          });
          this.activePlayer
            .filter(({ id }) => id !== 'host')
            .forEach((player) => player.ready = false);
          break;
        default:
      }
    },
    showPlayerMessage(player, message='PASS') {
      player.message = message;

      if (player.$timeout) clearTimeout(player.$timeout);

      player.$timeout = setTimeout(() => {
        player.message = null;
        player.$timeout = null;
      }, 2000);
    },
    onmessage({ clientId, content }) {
      const player = this.activePlayer.find(({ id }) => id === clientId);

      if (player) {
        this.showPlayerMessage(player, content);
      }
    },
    onClickStart() {
      this.service.reset();
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
  },
  watch: {
    orderBySuits(value) {
      const { cards } = this;

      this.cards = value ? sortBySuit(cards) : sortByRank(cards);
    },
  },
  async mounted() {
    const db = await this.idbConnect();
    const { nickname, avatar } = await this.getAccount();
    const { siteId, profile, tunnel } = this;
    const service = this.createService({
      id: siteId,
      profile,
      db,
    });

    service.register({ id: 'host', avatar, name: nickname });
    await service.init();

    this.service = service;
    this.setCloudTunnel(tunnel);
    this.players[0] = {
      name: nickname,
      avatar,
      id: 'host',
      turn: false,
      ready: true,
    };

    // document.addEventListener('visibilitychange', this.onvisibilitychange);
  },
};
</script>

<template>
  <!-- <v-app> -->
    <v-container>
      <v-row>
        <v-col cols="12" md="9">
          <!-- <v-row>
            <v-col cols="3" md="2">
              <v-btn
                class="h-56"
                color="blue"
                variant="elevated"
                block
                :disabled="!allPlayersReady"
                @click="onClickStart"
              >
                {{ $t('Start') }}
              </v-btn>
            </v-col>
            <v-col cols="3" md="2" class="text-start lh-56">
              {{ startLabel }}
            </v-col>
          </v-row>
          <v-divider class="mt-2 mb-2"></v-divider> -->
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
                    <v-list-item-title>{{ secondPlayer.message }}</v-list-item-title>
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
                <img v-for="(_, index) in Array.from({ length: secondPlayerCards })"
                  class="playing-cards p-absolute"
                  :style="{
                    left: `${ index * (MAX_CARD_WIDTH) * SPACING * HAND_ZOOM }px`,
                    top: '0px',
                    width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                    height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                  }"
                  :src="`/cards/${cardBack}.svg`"
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
                        <v-list-item-title>{{ firstPlayer.message }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-col>
                <v-col cols="4" class="d-flex justify-center sides-cards">
                  <div class="p-relative"
                    :style="{
                      width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                      height: `${ (MAX_CARD_HEIGHT + (firstPlayerCards - 1) * SPACING * MAX_CARD_HEIGHT) * HAND_ZOOM }px`,
                    }"
                  >
                    <img v-for="(_, index) in Array.from({ length: firstPlayerCards })"
                      class="playing-cards p-absolute"
                      :style="{
                        top: `${ index * (MAX_CARD_HEIGHT) * HAND_ZOOM * SPACING }px`,
                        left: '0px',
                        width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                        height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                      }"
                      :src="`/cards/${cardBack}.svg`"
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
                        class="pa-2 d-flex align-center"
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
                      </div>
                    </template>
                    <v-list
                      class="text-h5"
                      style="background-color: bisque; color: black;"
                    >
                      <v-list-item>
                        <v-list-item-title>{{ selfPlayer.message }}</v-list-item-title>
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
                      height: `${ (MAX_CARD_HEIGHT + (thirdPlayerCards - 1) * SPACING * MAX_CARD_HEIGHT) * HAND_ZOOM }px`,
                    }"
                  >
                    <img v-for="(_, index) in Array.from({ length: thirdPlayerCards })"
                      class="playing-cards p-absolute"
                      :style="{
                        top: `${ index * (MAX_CARD_HEIGHT) * HAND_ZOOM * SPACING }px`,
                        left: '0px',
                        width: `${ MAX_CARD_WIDTH * HAND_ZOOM }px`,
                        height: `${ MAX_CARD_HEIGHT * HAND_ZOOM }px`,
                      }"
                      :src="`/cards/${cardBack}.svg`"
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
                        <v-list-item-title>{{ thirdPlayer.message }}</v-list-item-title>
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
                    :disabled="!allPlayersReady"
                    @click="onClickStart"
                  >
                    {{ $t('Start')  }} {{ startLabel }}
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
          <v-card
            width="100%"
          >
            <v-card-text class="text-start">

            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  <!-- </v-app> -->
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

</style>
