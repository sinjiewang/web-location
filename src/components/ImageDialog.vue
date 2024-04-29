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
      <v-img :src="src"
        max-width="95vw"
        max-height="95vh"
      />
      <v-btn
        class="close-button"
        icon
        @click="showImageDialog=false"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
}
</style>
