<script>
import Service from '@/utils/Service/Chat/SiteService.js';
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
    createService({ id, profile, tunnel, db }) {
      const service = new Service({
        id,
        tunnel,
        db,
        profile: toRaw(profile),
      });

      service.on('register', (event) => this.onregister(event))
      service.on('deregister', (event) => this.onderegister(event))
      service.on('message', (event) => this.onmessage(event))

      return service;
    },
    onregister({ name }) {
      this.appendMessage({
        message: this.$t('has joined', { name }),
        time: Date.now(),
      });
    },
    onderegister({ name }) {
      this.appendMessage({
        message: this.$t('has left', { name }),
        time: Date.now(),
      });
    },
    onmessage({ clientId, time, message, name, avatar }) {
      const data = {
        sender: name,
        message,
        time,
        avatar,
      };

      if (clientId === 'host') {
        data.sender = this.$t('You');
        data.align = 'right';
      }

      this.appendMessageToWindow(data);
    },
    appendMessage(data) {
      this.service.storeMessage(data);
      this.appendMessageToWindow(data);
    },
    appendMessageToWindow(data) {
      this.$refs.messageWindow.appendMessage(data);
    },
    onSend(value) {
      const data = {
        clientId: 'host',
        time: Date.now(),
        message: value,
      };

      this.service.sendMessage(data);
      this.onmessage({
        ...data,
        avatar: this.avatar,
      });
    },
  },
  async mounted() {
    const db = await this.idbConnect();
    const { avatar } = await this.getAccount();

    this.avatar = avatar;

    const { siteId, title, profile, tunnel } = this;

    const service = this.createService({
      id: siteId,
      profile,
      tunnel,
      db,
    });

    service.register({ id: 'host', avatar });
    await service.init();

    this.service = service;
    this.appendMessage({
      message: `(${title}) ${this.$t('Established')}`,
      time: Date.now(),
    });
  },
  beforeUnmount() {
    this.service.close();
    this.service = null;
  },
}
</script>

<template>
  <ChatWindow
    ref="messageWindow"
    class="message-block"
    @send="onSend"
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
