<script>
import short from 'short-uuid';
import { mapState, mapActions } from 'vuex';
import AccountDialog from '@/components/AccountDialog.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';
import ConnectionPasswordDialog from '@/components/ConnectionPasswordDialog.vue';
import ImageDialog from '@/components/ImageDialog.vue';
import Service from '@/utils/Service/Chess/ClientService.js';
import SITE from '@/constants/site.js';
import Chess from '../index.vue';

export default {
  components: {
    AccountDialog,
    AccountAvatar,
    ConnectionPasswordDialog,
    ImageDialog,
    Chess,
  },
  data() {
    return {
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
      gameStarted: false,
      isReady: false,
      isWhitePieces: false,
      movable: false,
      selectable: false,
      profile: null,
      participants: [],
      newMessage: null,
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsConnection']),
    connected() {
      return this.channel;
    },
    disconnected() {
      return !this.connected;
    },
    disconnectedDialogConetnt() {
      const mapping = {
        '503': this.$t('Connection Limit Exceeded')
      };

      return mapping[this.connectResponseCode] || this.$t('Disconnected from the Host');
    },
    readyLabel() {
      return this.isReady ? this.$t('Cancel') : this.$t('Ready');
    },
    readyColor() {
      return !this.isReady ? 'blue' : null;
    },
    types() {
      return Object.keys(SITE.TYPE).map((type) => ({
        type,
        text: SITE.TYPE[type].name(this.$t),
      }));
    },
    type() {
      return this.profile?.type;
    },
    title() {
      return this.profile?.title;
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
      const { id, position, title, type, clientId } = profile;

      this.profile = { id, position, title, type, clientId };
    },
    onregister(register) {
      const { name, avatar, clientId } = register;

      console.log( name, clientId )

      this.participants.push({
        name,
        avatar,
        id: clientId,
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
          const isWhitePieces = color[this.profile.clientId] === 'white';

          this.isWhitePieces = isWhitePieces;
          this.gameStarted = true;
          this.selectable = true;
          this.participants.forEach((participant) => participant.trophy = false);
          // this.$refs.chessBoard.reset();
          this.$nextTick(() => this.$refs.chessBoard.reset());
          break;
        case 'turn':
          const { clientId } = command;

          this.movable = clientId === this.profile.clientId;
          this.participants.forEach((participant) => participant.turn = participant.id === clientId);
          break;
        case 'move':
          const { from, to } = command;

          this.$refs.chessBoard.move({from, to});
          break;
        case 'end':
          this.gameStarted = false;
          this.isReady = false;
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
    onclose() {
      this.showDisconnectedDialog = true;
      this.service = null;
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
    async onShowImage({ id, src }) {
      this.imageSrc = src;
      this.$refs.imageDialog.show();

      try {
        this.imageSrc = await this.service.getImageSrc(id);
      } catch (err) {
        console.warn('service.getImage failed', id);
      }
    },
    onClickReady() {
      this.isReady = !this.isReady;
      this.service.sendReady(this.isReady);
    },
    onMove({from, to}={}) {
      this.service.move({ from, to });
    },
    onClickResign() {
      this.service.resign();
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
  // beforeUnmount() {
  //   document.removeEventListener('visibilitychange', this.onvisibilitychange);
  // },
}
</script>

<template>
  <v-app>
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
                variant="elevated"
                block
                :color="readyColor"
                @click="onClickReady"
              >
                {{ readyLabel }}
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

.participant.active {
  opacity: 1;
}

.yellow {
  color: yellow;
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