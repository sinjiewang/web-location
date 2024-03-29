<script>
import { mapState, mapActions } from 'vuex';
import AccountDialog from '@/components/AccountDialog.vue';
import ClientService from '@/utils/Service/Chat/ClientService.js';
import ChatWindow from '../ChatWindow.vue';
import short from 'short-uuid';

export default {
  components: {
    ChatWindow,
    AccountDialog,
  },
  data() {
    return {
      nickname: null,
      avatar: null,
      showDisconnectedDialog: false,
      siteId: this.$route.params.siteId,
      loading: false,
      service: null,
      db: null,
      id: short.generate(),
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsClient']),
    connected() {
      return this.channel;
    },
    disconnected() {
      return !this.connected;
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('CloudTunnel', ['clientConnect', 'disconnect']),
    async init() {
      this.loading = true;

      try {
        await this.clientConnect();

        this.service = await this.createService();
      } catch (err) {
        console.error('init failed', err);

        this.showDisconnectedDialog = true;
      }

      this.loading = false;
      this.disconnect();
    },
    async createService() {
      const { id, nickname, avatar, wsClient, siteId, db } = this;

      const service = new ClientService({
        id,
        name: nickname,
        avatar,
        db,
      });

      service.on('profile', (profile) => this.onprofile(profile));
      service.on('register', (data) => this.onregister(data));
      service.on('deregister', (data) => this.onderegister(data));
      service.on('message', (data) => this.onmessage(data));
      service.on('close', () => this.onclose());

      await service.connect({
        tunnel: wsClient,
        siteId,
      });

      return service;
    },
    async onprofile({ title }) {
      this.appendMessage({
        message: `${this.$t('has joined')} (${title})`,
        time: Date.now(),
      });
    },
    onregister({ name }) {
      const data = {
        message: this.$t('has joined', { name }),
        time: Date.now(),
      };

      this.appendMessage(data);
      this.service.storeMessage(data);
    },
    onmessage({ clientId='self', time, message, name, avatar }) {
      const data = {
        sender: name,
        message,
        time,
        avatar,
      };

      if (clientId === 'self') {
        data.sender = this.$t('You');
        data.align = 'right';
      }

      this.appendMessageToWindow(data);
    },
    onclose() {
      this.showDisconnectedDialog = true;
      this.appendMessage({
        message: `Host ${this.$t('Disconnected')}`,
        time: Date.now(),
      });
      this.service = null;
    },
    onderegister({ name }) {
      const data = {
        message: this.$t('has left', { name }),
        time: Date.now(),
      };

      this.appendMessage(data);
      this.service.storeMessage(data);
    },
    sendMessage(message) {
      this.service.sendMessage(message);
      this.onmessage({
        message,
        time: Date.now(),
        name: this.nickname,
        avatar: this.avatar,
      });
    },
    appendMessage(data) {
      this.appendMessageToWindow(data);
    },
    appendMessageToWindow(data) {
      this.$refs.messageWindow.appendMessage(data);
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
  },
  async mounted() {
    this.db = await this.idbConnect();

    const { nickname, avatar } = await this.getAccount();

    this.nickname = nickname;
    this.avatar = avatar;

    if (nickname) {
      this.init();
    } else {
      this.$refs.accountDialog.open();
    }
  },
}
</script>

<template>
  <v-app>
    <v-container class="fill-height" fluid>
      <ChatWindow
        ref="messageWindow"
        class="fill-height-100"
        disabled
        @send="sendMessage">
      </ChatWindow>
    </v-container>

    <v-overlay
      v-model="loading"
      class="d-flex align-center justify-center"
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
          {{ $t('Disconnected from the Host') }}
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
  </v-app>
</template>

<style scoped>
.fill-height-100 {
  height: 100%;
}

:deep(.v-avatar.v-avatar--density-default) {
  width: 40px;
  height: 40px;
}

.flex-grow-0 {
  flex-grow: 0;
}

/* .message-row {
  margin: auto;
} */

</style>
