<script>
import { mapActions } from 'vuex';
import StoreChat from '@/utils/IndexedDB/StoreChat';
import ChatWindow from '@/pages/Chat/ChatWindow.vue';

export default {
  components: {
    ChatWindow,
  },
  data() {
    return {
      storeChat: null,
    };
  },
  computed: {
    id() {
      return this.$route.params.id;
    },
  },
  methods: {
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    async updateChatWindow() {
      const { id, storeChat } = this;
      const messages = await storeChat.queryByHistoryId(id);

      this.$refs.chatWindow.clear();

      messages.forEach((message) => {
        this.$refs.chatWindow.appendMessage(message);
      });
    },
  },
  watch: {
    id() {
      this.updateChatWindow();
    },
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeChat = new StoreChat({ db });
    this.updateChatWindow();
  },
}
</script>

<template>
  <ChatWindow
    ref="chatWindow"
    class="fill-height-100"
    :displayInput="false"
  />
</template>

<style scoped>
/* .interaction-google-map {
  width: 100%;
} */
.fill-height-100 {
  height: 100%;
}
</style>
