<script>
import { mapActions } from 'vuex';
import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import ChatWindow from '@/pages/Chat/ChatWindow.vue';

export default {
  components: {
    ChatWindow,
  },
  data() {
    return {
      storeChat: null,
      storeHistory: null,
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
      const { id, storeChat, participants } = this;
      const messages = await storeChat.queryByHistoryId(id);

      this.$refs.chatWindow.clear();

      messages.forEach((message) => {
        const { avatar } = (participants && participants[message.clientId])
          ? participants[message.clientId]
          : {};

        this.$refs.chatWindow.appendMessage({
          ...message,
          avatar,
        });
      });
    },
    async updateParticipants() {
      const { id, storeHistory } = this;
      const { participants } = await storeHistory.queryById(id);

      this.participants = participants;
    },
  },
  watch: {
    async id() {
      await this.updateParticipants();
      await this.updateChatWindow();
    },
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeHistory = new StoreHistory({ db });
    this.storeChat = new StoreChat({ db });

    try {
      await this.updateParticipants();
      await this.updateChatWindow();
    } catch (err) {
      console.error('init failed:', err)
    }
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
