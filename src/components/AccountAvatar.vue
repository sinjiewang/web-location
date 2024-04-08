<script>
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  props: {
    avatar: {
      type: String,
      default: () => null,
    },
  },
  data() {
    return {
      mdiAccountCircle,
    };
  },
}
</script>

<template>
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

<style scoped>
.v-avatar .v-img.account-avatar {
  width: 100%;
  height: 100%;
}
</style>
