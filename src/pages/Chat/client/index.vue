<script>
import { mapState, mapActions } from 'vuex';
import ClientSignaling from '@/utils/Signaling/ClientSignaling.js';
import RTCPeerClient from '@/utils/RTCPeerClient.js';

export default {
  components: {

  },
  data() {
    return {
      siteId: this.$route.params.connectionId,
      loading: true,
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsClient']),
  },
  methods: {
    ...mapActions('CloudTunnel', ['clientConnect']),
    async init() {
      const { wsClient, siteId } = this;
      const signaling = new ClientSignaling({ tunnel: wsClient });
      const rtcConnection = new RTCPeerClient({
        signaling,
        siteId,
      });

      await rtcConnection.connect();
    },
  },
  async mounted() {
    await this.clientConnect();
    await this.init();

    this.loading = false;
  },
}
</script>

<template>

</template>

<style scoped>

</style>
