<script>
import { mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiFile } from '@mdi/js';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import FileCardContent from  '@/components/FileCard/FileCardContent.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';

export default {
  components: {
    SvgIcon,
    AccountAvatar,
    FileCardContent,
  },
  data() {
    return {
      profile: null,
      component: null,
      history: null,
      iconHeight: 100,
      mdiFile,
    };
  },
  computed: {
    id() {
      return this.$route.params.id;
    },
    title() {
      return this.history?.title;
    },
    hostName() {
      return this.history?.host.name;
    },
    hostAvatar() {
      return this.history?.host.avatar;
    },
    remoteFiles() {
      return this.history?.remoteFiles;
    },
  },
  methods: {
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    async updateHistory() {
      this.history = await this.storeHistory.queryById(this.id);
    },
  },
  watch: {
    async id() {
      this.updateHistory();
    },
  },
  async mounted() {
    const { id } = this;

    this.profile = { id };

    const db = await this.idbConnect();

    this.storeHistory = new StoreHistory({ db });
    this.updateHistory();
  },
}
</script>

<template>
  <v-row class="w-100 h-100 overflow-auto">
    <v-col cols="12">
      <v-row no-gutters>
        <v-col cols="12" class="text-left">
          <div v-if="profile" class="line-height-56">
            <v-icon icon="mdi-at" class="mr-1"></v-icon>
            <span>{{ title }}</span><span class="text-caption mr-1"> from {{ hostName }}</span>
            <AccountAvatar class="avatar-size" :avatar="hostAvatar"/>
          </div>
        </v-col>
      </v-row>
      <v-divider class="ma-2"></v-divider>
      <v-row no-gutters>
        <v-col cols="6" md="3"  v-for="(file) in remoteFiles" :key="file.id">
          <v-card class="ma-1">
            <v-img v-if="file.type.startsWith('image/')"
              :src="file.thumbnailSrc"
              :height="iconHeight"
            ></v-img>
            <svg-icon
              v-else
              type="mdi"
              :path="mdiFile"
              :height="iconHeight"
              width="100%"
            ></svg-icon>
            <v-divider></v-divider>

            <v-card-subtitle class="pa-2">
              <span :title="file.name">{{ file.name }}</span>
            </v-card-subtitle>

            <v-card-text class="text-left">
              <FileCardContent :file="file"/>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-col>
  </v-row>
</template>

<style scoped>
.v-avatar.v-avatar--density-default.avatar-size {
  width: 24px;
  height: 24px;
}
</style>
