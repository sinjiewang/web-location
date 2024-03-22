<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle } from '@mdi/js';
import AccountDialog from './AccountDialog.vue';

export default {
  components: {
    SvgIcon,
    AccountDialog,
  },
  data() {
    return {
      mdiAccountCircle,
    };
  },
  computed: {
    ...mapState('Account', ['email', 'nickname', 'avatar']),
    ...mapGetters('Account', {
      displayNickname: 'getNickname'
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
      return `${this.$t('Hello')}, ${this.displayNickname}`;
    },
  },
  methods: {
    ...mapActions('Account', ['updateAccount']),
    onClickAccount() {
      this.$refs.accountDialog.open();
    },
    async onAccount({ name, avatar }) {
      await this.updateAccount({
        nickname: name,
        avatar: avatar,
      });
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
        @click="onClickAccount"
      >
        <template #prepend>
          <v-avatar color="surface-variant">
            <v-img
              v-if="avatar"
              :src="avatar"
              class="account-avatar"
            ></v-img>
            <svg-icon
              v-else
              type="mdi"
              :path="mdiAccountCircle"
            ></svg-icon>
          </v-avatar>
        </template>
      </v-list-item>
      <!-- -->
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
    <AccountDialog
      ref="accountDialog"
      :name="nickname"
      :avatar="avatar"
      @account="onAccount"
    />
  </v-navigation-drawer>
</template>

<style>
.route-link:hover {
  color: var(--color-text-hover);
}

.full {
  width: 100%;
  height: 100%;
}

.v-avatar .v-img.account-avatar {
  width: 24px;
  height: 24px;
}

.avatar-edit {
  position: relative;
  user-select: none;
  overflow: hidden;

  svg {
    position: absolute;
  }
}

.resize {
  cursor: nwse-resize;
}

.avatar-img {
  clip-path: circle(50%);
}
</style>
