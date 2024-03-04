<script>
import Signaling from '@/utils/Signaling/SiteSignaling.js';
import RTCPeerSite from '@/utils/RTCPeerSite.js';

import MessageWindow from '../MessageWindow.vue';
import ChatProtocol from '../utils/ChatProtocol';

export default {
  components: {
    MessageWindow,
  },
  props: {
    tunnel: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      signaling: null,
      rtcSite: null,
      dataChannels: {},
      newMessage: '',
    };
  },
  computed: {

  },
  methods: {
    init() {
      const { tunnel } = this;
      const signaling = new Signaling({ tunnel });
      const rtcSite = new RTCPeerSite({ signaling });

      rtcSite.on('connect', (event) => this.onconnect(event));
      rtcSite.on('diconnect', (event) => this.diconnect(event));

      this.rtcSite = rtcSite;
    },
    async onconnect({ clientId }) {
      console.log('onconnect', clientId);

      const dataChannel = await this.rtcSite.createDataChannel({
        clientId, label: 'data'
      });
      const chatProtocol = new ChatProtocol({ clientId, dataChannel });

      chatProtocol.on('message', (event) => this.onmessage(event));

      this.dataChannels[clientId] = chatProtocol;
    },
    diconnect({ clientId }) {
      this.dataChannels[clientId]?.removeAllListeners();

      delete this.dataChannels[clientId];
    },
    onmessage(data) {
      const { time, message, avatar, clientId } = data;
      const newChat = {
        sender: clientId,
        avatar,
        time,
        message,
      };

      this.$refs.messageWindow.appendMessage(newChat);
      this.broadcast({
        excepts: [clientId],
        data: newChat,
      });
    },
    sendMessage() {
      const data = {
        time: Date.now(),
        message: this.newMessage,
      };

      this.newMessage = '';
      this.$refs.messageWindow.appendMessage({
        sender: this.$t('You'),
        align: 'right',
        ...data,
      });
      this.broadcast({
        data: {
          sender: 'Host',
          ...data,
        }
      });
    },
    broadcast({ data, excepts=[] }={}) {
      const { dataChannels } = this;

      Object.keys(dataChannels)
        .filter((clientId) => !excepts.includes(clientId))
        .forEach((clientId) => dataChannels[clientId].send({
          type: 'message',
          data,
        }));
    },
  },
  async mounted() {
    this.init();
  },
}
</script>

<template>
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
</template>

<style scoped>
.message-block {
  height: calc(100% - 126px);
}

.v-btn.form-btn {
  height: 56px;
  width: 100%;
}
</style>
