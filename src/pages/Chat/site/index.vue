<script>
import Service from '@/utils/Service/Chat/SiteService.js';
import ChatWindow from '../ChatWindow.vue';
import BaseSite from '@/components/BaseSite.vue';
import ImageDialog from '@/components/ImageDialog.vue';
import { mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';

export default {
  extends: BaseSite,
  components: {
    ChatWindow,
    ImageDialog,
  },
  // props: ['tunnel', 'profile'],
  emits: ['reconnect'],
  data() {
    return {
      avatar: null,
      signaling: null,
      rtcSite: null,
      storeChat: null,
      storeHistory: null,
      dataChannels: {},
      participants: {},
      imageSrc: null,
    };
  },
  computed: {
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

      service.on('register', (event) => this.onregister(event));
      service.on('deregister', (event) => this.onderegister(event));
      service.on('message', (event) => this.onmessage(event));
      service.on('connect', (event) => this.onconnect(event));
      service.on('disconnect', (event) => this.ondisconnect(event));

      return service;
    },
    onconnect() {
      this.updateSiteConnectionCount();
    },
    ondisconnect() {
      this.updateSiteConnectionCount();
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
    onmessage(msg) {
      const { clientId, time, message, name, avatar, accepted, messageId } = msg;
      const data = {
        sender: name,
        message,
        time,
        avatar,
        accepted,
        messageId,
      };

      if (clientId === 'host') {
        data.sender = this.$t('You');
        data.align = 'right';
      }

      this.appendMessageToWindow(data);

      if (document.visibilityState === 'hidden') {
        this.newMessageCount += 1;

        this.updateDocumentTitle(`${ this.$t('New message') }(${ this.newMessageCount })`);
      }
    },
    appendMessage(data) {
      this.service.storeMessage(data);
      this.appendMessageToWindow(data);
    },
    appendMessageToWindow(data) {
      this.$refs.messageWindow.appendMessage(data);
    },
    onSendMessage(message) {
      this.service.sendMessage({
        message,
      });
    },
    async onSendImage(images=[]) {
      this.service.sendImages({
        images,
      });
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
    async onAcceptMessage(msg) {
      const { messageId } = msg;

      try {
        await this.service.acceptMessage(messageId);

        this.$refs.messageWindow.removeMessage(msg);
      } catch (err) {
        console.error('service.acceptMessage failed', msg);

        delete msg.loading;
      }
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
    setCloudTunnel(tunnel) {
      if (tunnel) {
        this.service.updateTunnel(tunnel);

        const reconnect = () => {
          tunnel.off('close', reconnect);

          this.$emit('reconnect');
        }
        tunnel.on('close', reconnect);
      }
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
      // tunnel,
      db,
    });

    service.register({ id: 'host', avatar });
    await service.init();

    this.service = service;
    this.appendMessage({
      message: `(${title}) ${this.$t('Established')}`,
      time: Date.now(),
    });
    this.setCloudTunnel(tunnel);

    document.addEventListener('visibilitychange', this.onvisibilitychange);
  },
  beforeUnmount() {
    this.service.close();
    this.service = null;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  },
}
</script>

<template>
  <ChatWindow
    ref="messageWindow"
    class="message-block"
    @message="onSendMessage"
    @image="onSendImage"
    @showImage="onShowImage"
    @acceptMessage="onAcceptMessage"
  ></ChatWindow>
  <ImageDialog
    ref="imageDialog"
    :src="imageSrc"
  />
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
