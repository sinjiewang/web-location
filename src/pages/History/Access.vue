<script>
import { mapActions } from 'vuex';
import SiteAccess from '@/pages/Access/site/index.vue';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import ClientAccess from '@/pages/Access/ClientAccess.vue';

export default {
  components: {
    SiteAccess,
    ClientAccess,
  },
  data() {
    return {
      profile: null,
      component: null,
    };
  },
  computed: {
    id() {
      return this.$route.params.id;
    },
  },
  methods: {
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    async render() {
      this.component = null;

      const history = await this.storeHistory.queryById(this.id);

      if (history) {
        this.component = history.action === 'create' ? 'SiteAccess' : 'ClientAccess';
      }
    },
  },
  watch: {
    async id() {
      this.render();
    },
  },
  async mounted() {
    const { id } = this;

    this.profile = { id };

    const db = await this.idbConnect();

    this.storeHistory = new StoreHistory({ db });
    this.render();
  },
}
</script>

<template>
  <component
    :is="component"
    :profile="profile"
  />
</template>

<style scoped>

</style>
