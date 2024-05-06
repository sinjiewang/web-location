<script>
import { mapState, mapActions } from 'vuex';
import AccountDialog from '@/components/AccountDialog.vue';
import ConnectionPasswordDialog from '@/components/ConnectionPasswordDialog.vue';
import ImageDialog from '@/components/ImageDialog.vue';
import ClientService from '@/utils/Service/Chat/ClientService.js';
import ChatWindow from '../ChatWindow.vue';
import short from 'short-uuid';

export default {
  components: {
    ChatWindow,
    AccountDialog,
    ConnectionPasswordDialog,
    ImageDialog,
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
      password: null,
      pwdRequired: false,
      imageSrc: null,
      newMessageCount: 0,
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

      try {
        await this.clientConnect();

        this.service = await this.createService();
      } catch (err) {
        console.error('init failed', err);

        const { code } = err;

        switch(code) {
          case 401:
            this.pwdRequired = true;
            this.password = null;
            this.$refs.passwordDialog.show();
            break;
          default:
            this.showDisconnectedDialog = true;
        }
      }

      this.loading = false;
      this.disconnect();
    },
    async createService() {
      const { id, nickname, avatar, wsConnection, siteId, db, password } = this;

      const service = new ClientService({
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
        service.on('close', () => this.onclose());

        await service.connect({
          tunnel: wsConnection,
          siteId,
          password,
        });

        resolve(service);
      })
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
    onmessage({ clientId='self', time, message, name, avatar, accepted }) {
      const data = {
        sender: name,
        message,
        time,
        avatar,
        accepted,
      };

      if (clientId === 'self') {
        data.sender = this.$t('You');
        data.align = 'right';
      }

      this.appendMessageToWindow(data);

      if (document.visibilityState === 'hidden') {
        this.newMessageCount += 1;

        this.updateDocumentTitle(`${ this.$t('New message') }(${ this.newMessageCount })`);
      }
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
    onSendImage(images=[]) {
      this.service.sendImages({
        images,
      }).then((message) => {
        const item = this.$refs.messageWindow.findMessage((item) => {
          return typeof item.message === typeof message
            && item.message.every((msg, i) => msg.id === message[i].id)
        });

        this.$refs.messageWindow.removeMessage(item);
      });
    },
    onvisibilitychange() {
      if (document.visibilityState !== 'hidden') {
        this.updateDocumentTitle();
        this.newMessageCount = 0;
      }
    },
    updateDocumentTitle(title='MapUS') {
      document.title = title;
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

    document.addEventListener('visibilitychange', this.onvisibilitychange);
  },
  beforeUnmount() {
    document.removeEventListener('visibilitychange', this.onvisibilitychange);
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
        :acceptable="false"
        @message="sendMessage"
        @image="onSendImage"
        @showImage="onShowImage"
      />
      <ImageDialog
        ref="imageDialog"
        :src="imageSrc"
      />
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
    <ConnectionPasswordDialog
      ref="passwordDialog"
      @password="onPassword"
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
