<script>
import { mapState, mapGetters } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  data() {
    return {
      mdiAccountCircle,
    };
  },
  computed: {
    ...mapState('Account', ['email']),
    ...mapGetters('Account', {
      username: 'getNickname'
    }),
    navigation() {
      return [
        {
          text: this.$t('Browse'),
          icon: 'mdi-map-search',
          route: '/browse',
        },
        {
          text: this.$t('History'),
          icon: 'mdi-history',
          route: '/history',
        },
        {
          text: this.$t('Information'),
          icon: 'mdi-information-variant-circle-outline',
          route: '',
        }
      ];
    },
    message() {
      return `${this.$t('Hello')}, ${this.username}`;
    },
  },
}
</script>

<template>
  <v-navigation-drawer
    expand-on-hover
    rail
  >
    <v-list>
      <v-list-item
        class="text-start"
        :title="message"
        :subtitle="email"
      >
        <template #prepend>
          <v-avatar color="surface-variant">
            <svg-icon type="mdi" :path="mdiAccountCircle"></svg-icon>
          </v-avatar>
        </template>
      </v-list-item>
    </v-list>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item v-for="item in navigation"
        class="text-start route-link"
        :prependIcon="item.icon"
        :title="item.text"
        :value="item.text"
        :to="item.route"
        >
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<style>
.align-left {
  justify-content: flex-start;
  text-align: left;
}

.route-link:hover {
  color: var(--color-text-hover);
}
</style>
