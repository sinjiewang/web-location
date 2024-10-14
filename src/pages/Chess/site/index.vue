<script>
import { /*mapState, mapGetters,*/ mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';
import Service from '@/utils/Service/Chess/SiteService.js';
import BaseSite from '@/components/BaseSite.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';
import Chess from '../index.vue';

export default {
  extends: BaseSite,
  components: {
    AccountAvatar,
    Chess,
  },
  data() {
    return {
      gameStarted: false,
      isWhitePieces: true,
      movable: false,
      selectable: false,
      participants: [],
      newMessage: null,
    };
  },
  methods: {
    ...mapActions('Account', ['getAccount', 'updateRecords']),
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
      service.on('connect', () => this.updateSiteConnectionCount());
      service.on('disconnect', () => this.updateSiteConnectionCount());

      return service;
    },
    onregister(register) {
      const { name, avatar, clientId } = register;

      this.participants.push({
        name,
        avatar,
        id: clientId,
        ready: false,
        turn: false,
      });
    },
    onderegister({ clientId }) {
      this.participants = this.participants.filter(({ id }) => id !== clientId);
    },
    oncommand(command) {
      switch (command.name) {
        case 'ready':
          const player = this.participants.find(({ id }) => id === command.clientId);

          if (player) {
            player.ready = command.status;
          }
          break;
        case 'start':
          const { color } = command;
          const isWhitePieces = color['host'] === 'white';

          this.isWhitePieces = isWhitePieces;
          this.gameStarted = true;
          this.selectable = true;
          this.participants.forEach((participant) => participant.trophy = false);
          this.$nextTick(() => this.$refs.chessBoard.reset());
          break;
        case 'turn':
          const { clientId } = command;

          this.movable = clientId === 'host';
          this.participants.forEach((participant) => participant.turn = participant.id === clientId);
          break;
        case 'move':
          const { from, to } = command;

          this.$refs.chessBoard.move({from, to});
          break
        case 'end':
          this.gameStarted = false;
          this.selectable = false;
          this.movable = false;
          this.participants.forEach((participant) => {
            participant.trophy = participant.id === command.winner;
            participant.turn = false;
            participant.ready = false;
          });
          break;
        default:
      }
    },
    onmessage({ clientId, content, time }) {
      this.participants.forEach((participant) => {
        if (participant.id === clientId) {
          participant.message = {
            content,
            time,
            active: true,
          };
        } else if (participant.message) {
          participant.message.active = false;
        }
      });
    },
    onClickStart() {
      this.service.reset();
    },
    // onClickCard(name, index) {
    //   if (name !== this.defaultCard) return;

    //   this.service.openCard(index)
    // },
    onClickResign() {
      this.service.resign();
    },
    onMove({from, to}={}) {
      this.service.move({ from, to });
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
    this.participants.push({
      name: nickname,
      avatar,
      id: 'host',
      turn: false,
    });

    // document.addEventListener('visibilitychange', this.onvisibilitychange);
  },
};
</script>

<template>
  <!-- <v-app> -->
    <v-container>
      <v-row>
        <v-col cols="12" md="8">
          <v-row>
            <v-col cols="12">
              <Chess
                ref="chessBoard"
                class="chess-board"
                :isWhitePieces="isWhitePieces"
                :movable="movable"
                :selectable="selectable"
                @move="onMove"
            ></Chess>
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="12" md="4">
          <v-row class="mb-2">
            <v-col cols="12">
              <v-btn
                v-if="!gameStarted"
                class="h-56"
                color="blue"
                variant="elevated"
                block
                @click="onClickStart"
              >
                {{ $t('Start') }}
              </v-btn>
              <v-btn
                v-if="gameStarted"
                class="h-56"
                color="red"
                variant="elevated"
                block
                @click="onClickResign"
              >
                {{ $t('Resign') }}
              </v-btn>
            </v-col>
          </v-row>
          <v-card
            width="100%"
          >
            <v-card-text class="text-start">
              <v-list>
                <v-list-item v-for="(participant) in participants" :key="participant.id">
                  <v-list-item-title
                    class="participant"
                    :class="{
                      'inactive': !participant.turn,
                      'text-h6': participant.turn
                    }"
                  >
                  <AccountAvatar
                    :avatar="participant.avatar"
                    class="mr-1"
                    :class="participant.turn ? 'wh-32' : 'wh-24'"
                  ></AccountAvatar>
                    {{ participant.name }}
                    <span v-if="participant.ready && !gameStarted"
                      class="ml-2 mdi mdi-hand-okay"></span>
                    <span v-if="participant.trophy"
                      class="yellow mdi mdi-trophy ml-2"></span>
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="participant.message">
                    <div class="d-flex justify-space-between">
                      <div
                        class="line-h-24 message-text"
                        :class="participant.message.active ? 'text-h6' : 'text-subtitle-1'"
                      >
                        <span class="mr-1">{{ $t('Say') }}:</span>
                        {{ participant.message.content }}
                      </div>
                      <div class="text-subtitle-2 line-h-24 message-time">
                        {{ new Date(participant.message.time).toLocaleTimeString() }}
                      </div>
                    </div>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
          <v-row class="mt-1">
            <v-col cols="8">
              <v-text-field
                ref="messageInput"
                v-model="newMessage"
                :label="$t('Type a message')"
                filled
                @keyup.enter="sendMessage"
              ></v-text-field>
            </v-col>
            <v-col cols="4">
              <v-btn
                class="h-56"
                variant="elevated"
                @click="sendMessage"
                block
                :disabled="!newMessage">{{ $t('Send') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-container>
  <!-- </v-app> -->
</template>

<style scoped>
.v-btn.h-56 {
  height: 56px;
}

.v-avatar.wh-24 {
  width: 24px;
  height: 24px;
}

.v-avatar.wh-32 {
  width: 32px;
  height: 32px;
}

.participant.inactive {
  opacity: 0.7;
}

.yellow {
  color: yellow;
}

.line-h-24 {
  line-height: 24px;
}

.message-text {
  max-width: calc( 100% - 93px);
}

.message-time {
  max-width: 88px;
  opacity: 0.6;
}
</style>

<style lang="scss" scoped>
.chess-board {
  aspect-ratio: 1;
  width: 100%;
  height: 100%;
}
</style>