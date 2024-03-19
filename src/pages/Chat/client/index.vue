<script>
import { mapState, mapActions } from 'vuex';
import ClientSignaling from '@/utils/Signaling/ClientSignaling.js';
import RTCPeerClient from '@/utils/RTCPeer/RTCPeerClient.js';

import ChatProtocol from '../utils/ChatProtocol';
import ChatWindow from '../ChatWindow.vue';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import StoreChat from '@/utils/IndexedDB/StoreChat';
import short from 'short-uuid';

export default {
  components: {
    ChatWindow,
  },
  data() {
    return {
      nickName: this.$route.query.nickName,
      showNicknameDialog: !this.$route.query.nickName,
      showDisconnectedDialog: false,
      siteId: this.$route.params.siteId,
      loading: false,
      channel: null,
      participants: {},
      storeChat: null,
      storeHistory: null,
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
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('CloudTunnel', ['clientConnect', 'disconnect']),
    async init() {
      this.loading = true;

      try {
        await this.clientConnect();
        await this.peerConnect();
      } catch (err) {
        console.error('init failed', err);
      }

      this.loading = false;
      this.disconnect();
    },
    async peerConnect() {
      const { wsClient, siteId } = this;
      const signaling = new ClientSignaling({ tunnel: wsClient });
      const rtcConnection = new RTCPeerClient({
        signaling,
        siteId,
      });

      await rtcConnection.connect();
      const dataChannel = await rtcConnection.createDataChannel('data');
      const chatProtocol = new ChatProtocol({ dataChannel })

      chatProtocol.on('profile', (event) => this.onprofile(event));
      chatProtocol.on('message', (event) => this.onmessage(event));
      chatProtocol.on('register', (event) => this.onregister(event));
      chatProtocol.on('unregister', (event) => this.onunregister(event));
      chatProtocol.on('close', () => this.onclose());

      this.channel = chatProtocol;
      this.register();
    },
    onprofile({ id, position, type, title }) {
      this.appendMessage({
        message: `${this.$t('has joined')} (${title})`,
        time: Date.now(),
      });
      this.storeHistory.create({
        id: this.id,
        action: 'join',
        siteId: id,
        position,
        type,
        title,
      });
    },
    onmessage(data) {
      const { sender, time, message, avatar } = data;

      this.appendMessage({
        sender,
        time,
        message,
        avatar,
      });
    },
    onclose() {
      this.channel.removeAllListeners();
      this.channel = null;
      this.showDisconnectedDialog = true;
      this.appendMessage({
        message: `Host ${this.$t('Disconnected')}`,
        time: Date.now(),
      });
    },
    onregister(data) {
      const { name, avatar, clientId, time } = data;

      this.participants[clientId] = { name, avatar };

      this.appendMessage({
        message: this.$t('has joined', { name }),
        time,
      });
    },
    onunregister(data) {
      const { clientId, time } = data;
      const participant = this.participants[clientId];

      if (participant) {
        delete this.participants[clientId];
        this.appendMessage({
          message: this.$t('has left', { name: participant.name }),
          time,
        });
      }
    },
    sendMessage(message) {
      const time = Date.now();

      this.channel.sendMessage({ message, time });
      this.appendMessage({
        sender: this.$t('You'),
        time,
        message,
        align: 'right',
      });
    },
    appendMessage(data) {
      this.$refs.messageWindow.appendMessage(data);
      this.storeChat.create({
        ...data,
        historyId: this.id,
      });
    },
    register() {
      const name = this.nickName;

      this.channel.sendRegister({ name });
    },
    async onClickReconnect() {
      this.showDisconnectedDialog = false;

      await this.init();

      this.loading = false;
    },
    onClickCloseWindow() {
      window.close();
    },
    onClickClose() {
      this.showNicknameDialog = false;
      this.init();
    },
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeChat = new StoreChat({ db });
    this.storeHistory = new StoreHistory({ db });

    if (this.nickName) {
      this.init();
    } else {
      this.showNicknameDialog = true;
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

    <v-dialog
      v-model="showNicknameDialog"
      persistent
      max-width="400px"
    >
      <v-card>
        <v-card-text>
          <v-text-field
            v-model="nickName"
            :label="$t('Please enter your nickname')"
            filled
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="d-flex align-stretch">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!nickName"
            @click="onClickClose"
          >
            {{ $t('Close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
