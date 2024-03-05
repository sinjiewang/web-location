<script>
import { mapState, mapActions } from 'vuex';
import ClientSignaling from '@/utils/Signaling/ClientSignaling.js';
import RTCPeerClient from '@/utils/RTCPeer/RTCPeerClient.js';

import ChatProtocol from '../utils/ChatProtocol';
import ChatWindow from '../ChatWindow.vue';

export default {
  components: {
    ChatWindow,
  },
  data() {
    return {
      nickName: this.$route.query.nickName || 'Guest',
      siteId: this.$route.params.connectionId,
      loading: true,
      channel: null,
      participants: {},
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsClient']),
  },
  methods: {
    ...mapActions('CloudTunnel', ['clientConnect', 'disconnect']),
    async init() {
      const { wsClient, siteId } = this;
      const signaling = new ClientSignaling({ tunnel: wsClient });
      const rtcConnection = new RTCPeerClient({
        signaling,
        siteId,
      });

      await rtcConnection.connect();
      const dataChannel = await rtcConnection.createDataChannel('data');
      const chatProtocol = new ChatProtocol({ dataChannel })

      chatProtocol.on('message', (event) => this.onmessage(event));
      chatProtocol.on('register', (event) => this.onregister(event));
      chatProtocol.on('unregister', (event) => this.onunregister(event));
      chatProtocol.on('close', () => this.onclose());

      this.channel = chatProtocol;
      this.register();
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
      // disconnect handle
      // TODO
    },
    onregister(data) {
      const { name, avatar, clientId, time } = data;

      this.participants[clientId] = { name, avatar };

      this.$refs.messageWindow.appendMessage({
        message: this.$t('has joined', { name }),
        time,
      });
    },
    onunregister(data) {
      const { clientId, time } = data;
      const participant = this.participants[clientId];

      if (participant) {
        delete this.participants[clientId];
        this.$refs.messageWindow.appendMessage({
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
    appendMessage({ sender, time, message, avatar, align }) {
      this.$refs.messageWindow.appendMessage({ sender, time, message, avatar, align });
    },
    register() {
      const name = this.nickName;

      this.channel.sendRegister({ name });
    },
  },
  async mounted() {
    await this.clientConnect();
    await this.init();

    this.loading = false;

    this.disconnect();
  },
}
</script>

<template>
  <v-app>
    <ChatWindow
      ref="messageWindow"
      class="message-block"
      @send="sendMessage">
    </ChatWindow>
  </v-app>
</template>

<style scoped>
.message-block {
  height: 100vh;
}
.v-btn.form-btn {
  height: 56px;
  width: 100%;
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
