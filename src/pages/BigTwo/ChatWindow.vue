<script>
import ChatWindow from '@/pages/Chat/ChatWindow.vue';

export default {
  extends: ChatWindow,
  methods: {
    toLocaleTimeString(timestamp) {
      return new Date(timestamp).toLocaleTimeString();
    },
  },
}
</script>

<style scoped>
.flex-grow-0 {
  display: none;
}

.v-list-item {
  padding-inline: 8px !important;
}
</style>
