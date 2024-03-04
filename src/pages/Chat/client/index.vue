<script>
import { mapState, mapActions } from 'vuex';
import ClientSignaling from '@/utils/Signaling/ClientSignaling.js';
import RTCPeerClient from '@/utils/RTCPeerClient.js';

import ChatProtocol from '../utils/ChatProtocol';
import MessageWindow from '../MessageWindow.vue';

export default {
  components: {
    MessageWindow,
  },
  data() {
    return {
      siteId: this.$route.params.connectionId,
      loading: true,
      channel: null,
      newMessage: 'TESTTEST',
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
      chatProtocol.on('close', () => this.onclose());

      this.channel = chatProtocol;
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
      this.channel = null;
    },
    sendMessage() {
      const time = Date.now();
      const message = this.newMessage;

      this.channel.sendMessage({ message, time });
      this.newMessage = '';
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
    <v-container>
      <MessageWindow ref="messageWindow" class="message-block" />
      <v-row>
        <v-col cols="10">
          <v-text-field
            v-model="newMessage"
            :label="$t('Type a message')"
            filled
            @keyup.enter="sendMessage"
          ></v-text-field>
        </v-col>
        <v-col cols="2">
          <v-btn
            class="form-btn"
            color="primary"
            @click="sendMessage"
            :disabled="!newMessage">{{ $t('Send') }}</v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<style scoped>
.message-block {
  height: calc(100vh - 126px);
}
.v-btn.form-btn {
  height: 56px;
  width: 100%;
}

:deep .v-avatar.v-avatar--density-default {
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
