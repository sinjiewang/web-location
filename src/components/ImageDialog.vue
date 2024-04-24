<script>
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  props: {
    src: {
      type: String,
      default: () => null,
    },
  },
  data() {
    return {
      showImageDialog: false,
    };
  },
  computed: {

  },
  methods: {
    show() {
      this.showImageDialog = true;
    },
  },
}
</script>

<template>
  <v-dialog
    v-model="showImageDialog"
    @click:outside="showImageDialog=false"
  >
    <v-card>
      <v-card-text>
        <v-img :src="src" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>

</style>
