<script>
import Signaling from '@/utils/Signaling/SiteSignaling.js';
import RTCPeerSite from '@/utils/RTCPeer/RTCPeerSite.js';
import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import ChatProtocol from '../utils/ChatProtocol';

import ChatWindow from '../ChatWindow.vue';
import { mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';

export default {
  components: {
    ChatWindow,
  },
  props: {
    tunnel: {
      type: Object,
      default: () => null,
    },
    profile: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      avatar: null,
      signaling: null,
      rtcSite: null,
      storeChat: null,
      storeHistory: null,
      dataChannels: {},
      participants: {},
    };
  },
  computed: {
    siteId() {
      return this.profile.id;
    },
    title() {
      return this.profile.title;
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
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
      const { name } = this.dataChannels[clientId] || {};
      const newChat = {
        sender: name,
        clientId,
        time,
        message,
      };

      this.appendMessage(newChat, clientId);
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

      this.updateStoreHistory({ clientId, name, avatar });
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
          clientId: 'host',
          avatar: this.avatar,
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
          clientId: 'host',
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
    appendMessage(data, clientId='host') {
      this.storeChat.create({
        ...data,
        clientId,
        historyId: this.siteId,
      })/*.then((id) => {})*/;
      this.appendMessageToWindow(data, clientId);
    },
    appendMessageToWindow(data, clientId) {
      const { avatar, name } = this.participants[clientId] || {};

      this.$refs.messageWindow.appendMessage({
        ...data,
        avatar,
        name,
      });
    },
    updateStoreHistory({ clientId, name, avatar }) {
      const { participants, siteId } = this;

      participants[clientId] = { name, avatar };

      this.storeHistory.update(siteId, {
        participants: toRaw(participants),
      });
    },
  },
  async mounted() {
    const db = await this.idbConnect();
    const { avatar } = await this.getAccount();
    const { title, position } = this.profile;
    const { lat, lng } = position;

    this.avatar = avatar;
    this.storeChat = new StoreChat({ db });
    this.storeHistory = new StoreHistory({ db });
    this.init();

    const { siteId } = this;
    const history =  await this.storeHistory.queryById(siteId);

    if (history) {
      this.participants = history.participants;
      this.storeHistory.update(siteId, {
        title,
        position: { lat, lng },
      });

      const messages = await this.storeChat.queryByHistoryId(siteId);

      messages.forEach((message) => {
        this.appendMessageToWindow(message, message.clientId)
      });
    } else {
      const participants = {
        host: {
          name: 'HOST',
          avatar,
        },
      };

      this.storeHistory.create({
        ...this.profile,
        position: { lat, lng },
        action: 'create',
        participants,
      });
      this.participants = participants;
    }
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
