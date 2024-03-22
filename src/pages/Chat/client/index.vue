<script>
import { mapState, mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';
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
      nickname: null,
      showNicknameDialog: false,
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
    ...mapActions('Account', ['getAccount']),
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
    async onprofile({ id, position, type, title }) {
      this.appendMessage({
        message: `${this.$t('has joined')} (${title})`,
        time: Date.now(),
      });

      try {
        this.storeHistory.create({
          id: this.id,
          action: 'join',
          siteId: id,
          position,
          type,
          title,
        });
      } catch (err) {
        console.warn('storeHistory.create failed:', err)
      }
    },
    onregister(data) {
      const { name, avatar, clientId, time } = data;

      this.participants[clientId] = { name, avatar };
      this.updateStoreHistory();
      this.appendMessage({
        message: this.$t('has joined', { name }),
        time,
      });
    },
    onmessage(data) {
      const { sender, time, message, clientId } = data;

      this.appendMessage({
        sender,
        time,
        message,
      }, clientId);
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
    onunregister(data) {
      const { clientId, time } = data;
      const participant = this.participants[clientId];

      if (participant) {
        // delete this.participants[clientId];
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
    appendMessage(data, clientId='self') {
      const avatar = clientId ? this.participants[clientId].avatar : this.avatar;

      this.$refs.messageWindow.appendMessage({
        ...data,
        avatar,
      });
      this.storeChat.create({
        ...data,
        clientId,
        historyId: this.id,
      });
    },
    register() {
      const name = this.nickname;
      const avatar = this.avatar;

      this.channel.sendRegister({ name, avatar });
      this.participants['self'] = { name, avatar };
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
    updateStoreHistory() {
      const { participants, id } = this;

      console.log('updateStoreHistory', id)

      this.storeHistory.update(id, {
        participants: toRaw(participants),
      });
    },
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeChat = new StoreChat({ db });
    this.storeHistory = new StoreHistory({ db });

    const { nickname, avatar } = await this.getAccount();

    this.nickname = nickname;
    this.avatar = avatar;

    if (nickname) {
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
            v-model="nickname"
            :label="$t('Please enter your nickname')"
            filled
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="d-flex align-stretch">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!nickname"
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
