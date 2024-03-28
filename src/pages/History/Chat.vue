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
      participants: {},
      action: null,
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
      const { id, action, storeChat, participants } = this;
      const messages = await storeChat.queryByHistoryId(id);

      this.$refs.chatWindow.clear();

      messages.forEach((message) => {
        const { clientId } = message;
        const { avatar, name } = (participants && participants[clientId])
          ? participants[message.clientId]
          : {};
        const data = {
          ...message,
          sender: name,
          avatar,
        }

        if ((action === 'create' && clientId === 'host')
            || clientId === 'self'
        ) {
          data.align = 'right';
        }

        this.$refs.chatWindow.appendMessage(data);
      });
    },
    async updateParticipants() {
      const { id, storeHistory } = this;
      const { participants, action } = await storeHistory.queryById(id);

      this.action = action;
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
