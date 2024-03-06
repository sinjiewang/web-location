<script>
import Signaling from '@/utils/Signaling/SiteSignaling.js';
import RTCPeerSite from '@/utils/RTCPeer/RTCPeerSite.js';

import ChatWindow from '../ChatWindow.vue';
import ChatProtocol from '../utils/ChatProtocol';

export default {
  components: {
    ChatWindow,
  },
  props: {
    tunnel: {
      type: Object,
      default: () => null,
    },
    title: {
      type: String,
      default: '',
    }
  },
  data() {
    return {
      signaling: null,
      rtcSite: null,
      dataChannels: {},
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
      const dataChannel = await this.rtcSite.createDataChannel({
        clientId, label: 'data'
      });
      const chatProtocol = new ChatProtocol({ clientId, dataChannel });

      chatProtocol.on('message', (event) => this.onmessage(event));
      chatProtocol.on('register', (event) => this.onregister(event));
      this.dataChannels[clientId] = chatProtocol;
    },
    diconnect({ clientId }) {
      const dataChannel = this.dataChannels[clientId];

      if (dataChannel) {
        const { name } = dataChannel;
        const time = Date.now();

        dataChannel.removeAllListeners();

        delete this.dataChannels[clientId];
        this.$refs.messageWindow.appendMessage({
          message: this.$t('has left', { name }),
          time,
        });
        this.broadcast({
          data: { clientId, time },
          type: 'unregister',
        });
      }
    },
    onmessage(data) {
      const { time, message, clientId } = data;
      const { name, avatar } = this.dataChannels[clientId] || {};
      const newChat = {
        sender: name,
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
    onregister({ clientId, name, avatar }) {
      const dataChannel = this.dataChannels[clientId];
      const time = Date.now();

      if (dataChannel) {
        dataChannel.name = name;
        dataChannel.avatar = avatar;
      }

      this.$refs.messageWindow.appendMessage({
        message: this.$t('has joined', { name }),
        time,
      });
      this.broadcast({
        excepts: [clientId],
        data: { name, avatar, clientId, time },
        type: 'register',
      });

      dataChannel.send({
        type: 'register',
        data: {
          clientId: 'HOST',
          name: this.title,
          avatar: null,
          time,
        },
      });
      Object.keys(this.dataChannels)
        .filter((id) => id !== clientId)
        .forEach((id) => dataChannel.send({
          type: 'register',
          data: {
            clientId: id,
            name: this.dataChannels[id].name,
            avatar: this.dataChannels[id].avatar,
            time,
          },
        }));
    },
    sendMessage(message) {
      const data = {
        time: Date.now(),
        message,
      };

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
    broadcast({ data, type='message', excepts=[] }={}) {
      const { dataChannels } = this;

      Object.keys(dataChannels)
        .filter((clientId) => !excepts.includes(clientId))
        .forEach((clientId) => dataChannels[clientId].send({
          type,
          data,
        }));
    },
  },
  async mounted() {
    this.init();
    this.$refs.messageWindow.appendMessage({
      time: Date.now(),
      message: `${this.title} ${this.$t('Established')}`,
    });
  },
  beforeUnmount() {
    this.rtcSite.close();
    this.rtcSite = null;
  },
}
</script>

<template>
  <ChatWindow
    ref="messageWindow"
    class="message-block"
    @send="sendMessage"
  ></ChatWindow>
</template>

<style scoped>
.message-block {
  height: 100%;
}

.v-btn.form-btn {
  height: 56px;
  width: 100%;
}
</style>
