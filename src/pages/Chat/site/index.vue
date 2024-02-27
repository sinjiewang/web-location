<script>
import Signaling from '@/utils/Signaling/SiteSignaling.js';
import RTCPeerSite from '@/utils/RTCPeerSite.js';
import { mapState, mapActions } from 'vuex';

export default {
  components: {

  },
  props: {
    tunnel: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      signaling: null,
      connections: {},
    };
  },
  computed: {

  },
  methods: {
    // ...mapActions('CloudTunnel', ['clientConnect']),
    init() {
      const { tunnel } = this;
      const signaling = new Signaling({ tunnel });
      const rtcPeer = new RTCPeerSite({ signaling });

      rtcPeer.on('connect', this.onconnect);
    },
    onconnect({ clientId, peerConnection }) {
      console.log('onconnect', clientId)
    }
  },
  async mounted() {
    this.init();
  },
}
</script>

<template>

</template>

<style scoped>

</style>
