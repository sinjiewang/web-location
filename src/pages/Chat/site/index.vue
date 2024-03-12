<script>
import Signaling from '@/utils/Signaling/SiteSignaling.js';
import RTCPeerSite from '@/utils/RTCPeer/RTCPeerSite.js';
import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import ChatProtocol from '../utils/ChatProtocol';

import ChatWindow from '../ChatWindow.vue';
import { mapActions } from 'vuex';

export default {
  components: {
    ChatWindow,
  },
  props: {
    // siteId: {
    //   type: String,
    //   default: '',
    // },
    tunnel: {
      type: Object,
      default: () => null,
    },
    // title: {
    //   type: String,
    //   default: '',
    // }
    profile: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      signaling: null,
      rtcSite: null,
      storeChat: null,
      storeHistory: null,
      dataChannels: {},
    };
  },
  computed: {
    // ...mapState('IndexedDB', ['db']),
    siteId() {
      return this.profile.id;
    },
    title() {
      return this.profile.title;
    },
  },
  methods: {
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
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
        this.appendMessage({
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

      this.appendMessage(newChat);
      this.broadcast({
        excepts: [clientId],
        data: newChat,
      });
    },
    onregister({ clientId, name, avatar }) {
      const { dataChannels } = this;
      const dataChannel = dataChannels[clientId];
      const time = Date.now();
      const { profile } = this;

      if (dataChannel) {
        dataChannel.name = name;
        dataChannel.avatar = avatar;
      }

      this.appendMessage({
        message: this.$t('has joined', { name }),
        time,
      });
      this.broadcast({
        excepts: [clientId],
        data: { name, avatar, clientId, time },
        type: 'register',
      });

      dataChannel.send({
        type: 'profile',
        data: {
          ...profile,
          time,
        },
      });
      dataChannel.send({
        type: 'register',
        data: {
          name: 'HOST',
          avatar: null,
          time,
        },
      });
      Object.keys(dataChannels)
        .filter((id) => id !== clientId)
        .forEach((id) => dataChannel.send({
          type: 'register',
          data: {
            clientId: id,
            name: dataChannels[id].name,
            avatar: dataChannels[id].avatar,
            time,
          },
        }));
    },
    sendMessage(message) {
      const data = {
        time: Date.now(),
        message,
      };

      this.appendMessage({
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
    appendMessage(data) {
      this.$refs.messageWindow.appendMessage(data);
      this.storeChat.create({
        ...data,
        historyId: this.siteId,
      })/*.then((id) => {})*/;
    },
  },
  async mounted() {
    const db = await this.idbConnect();
    const { lat, lng } = this.profile.position;

    this.storeChat = new StoreChat({ db });
    this.storeHistory = new StoreHistory({ db });
    this.init();

    this.storeHistory.create({
      ...this.profile,
      position: { lat, lng },
      action: 'create',
    });
    this.appendMessage({
      time: Date.now(),
      message: `(${this.title}) ${this.$t('Established')}`,
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
