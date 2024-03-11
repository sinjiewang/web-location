<script>
import Header from '@/components/Header.vue';
import Navigation from '@/components/Navigation.vue';
import { mapActions } from 'vuex';

export default {
  components: {
    Header,
    Navigation,
  },
  data() {
    return {

    };
  },
  computed: {
    displayLayout() {
      return this.$route.meta.layout !== false;
    },
  },
  methods: {
    ...mapActions('IndexedDB', ['connect']),
  },
  // watch: {

  // },
  async mounted() {
    await this.connect();
  },
}
</script>

<template>
  <v-app>
    <v-layout>
      <Header v-if="displayLayout" />

      <Navigation  v-if="displayLayout" />

      <v-main>
        <router-view></router-view>
      </v-main>
    </v-layout>
  </v-app>
</template>

<style scoped>
.v-main {
  min-height: 300px;
  height: 100vh;
}
</style>
