<script>
import { mapActions } from 'vuex';

export default {
  components: {

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
      service: null,
    };
  },
  computed: {
    siteId() {
      return this.profile?.id;
    },
    siteConnectionLimit() {
      return this.profile?.connectionLimit;
    },
  },
  methods: {
    ...mapActions('CloudTunnel', ['updateSiteOptions']),
    createService(/*{ id, profile, tunnel, db }*/) {
      return null;
    },
    updateSiteConnectionCount() {
      const connectionCount = this.service?.connectionCount;

      if (this.siteConnectionLimit !== null && this.siteConnectionLimit !== undefined) {
        this.updateSiteOptions({ connectionCount });
      }
    },
    setCloudTunnel(tunnel) {
      if (tunnel) {
        this.service?.updateTunnel(tunnel);

        const reconnect = () => {
          tunnel.off('close', reconnect);

          this.$emit('reconnect');
        }
        tunnel.on('close', reconnect);
      }
    },
  },
  watch: {
    tunnel(value) {
      if (value) {
        this.setCloudTunnel(value);
      }
    },
  },
}
</script>

<template>

</template>

<style scoped>

</style>
