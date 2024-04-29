<script>
import { saveAs } from 'file-saver';
// import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import { mapState, mapGetters, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiFile, mdiDatabase, mdiFilePlus } from '@mdi/js';
// import SITE from '@/constants/site.js';
import StoreFile from '@/utils/IndexedDB/StoreFile';
import ImageDialog from '@/components/ImageDialog.vue';

export default {
  components: {
    SvgIcon,
    // InteractionGoogleMap,
    ImageDialog,
  },
  data() {
    return {
      STORAGE_WAIT: 150, // msec
      LIMIT_PER_LOAD: 12,
      storeFile: null,
      files: [],
      next: null,
      isLoading: false,
      storageUsage: null,
      storageQuota: null,
      imageSrc: null,
      mdiFile,
      mdiDatabase,
      mdiFilePlus,
    };
  },
  computed: {
    quota() {
      return this.storageQuota ? this.formatBytes(this.storageQuota) : '--';
    },
    usage() {
      return this.storageUsage ? this.formatBytes(this.storageUsage) : '--';
    },
  },
  methods: {
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    formatBytes(bytes=0, decimals=2) {
      if (bytes === 0) return '0 Bytes';

      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    toLocaleTimeString(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    updateStorageCapacity() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        setTimeout(() => {
          navigator.storage.estimate().then(estimate => {
            this.storageQuota = estimate.quota;
            this.storageUsage = estimate.usage;
          }).catch((err) => {
            console.error('storage.estimate() failed', err);
          });
        }, this.STORAGE_WAIT);
      } else {
        console.warn('Unsupport Storage Estimation API');
      }
    },
    async onClickDelete(id) {
      try {
        await this.storeFile.delete(id);

        this.files = this.files.filter((file) => file.id !== id);
        this.updateStorageCapacity();
      } catch (err) {
        console.warn('storeFile.delete failed', err, id);
      }
    },
    onClickAddFile() {
      this.$refs.inputFile.click();
    },
    getFileAsDataUrl(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(file);
      })
    },
    async onFileSelected(event) {
      const file = event.target.files[0];
      const { name, type, size } = file;
      const dataUrl = await this.getFileAsDataUrl(file);
      const fileData = {
        name,
        type,
        size,
        src: dataUrl,
      };
      let item;

      if (type.startsWith('image/')) {
        item = await this.storeFile.createImage(fileData);
      } else {
        item = await this.storeFile.create(fileData);
      }

      this.files.unshift(item);

      this.updateStorageCapacity();
    },
    onClickDownload({ name, type, src }) {
      saveAs(src, name, { type });
    },
    onScroll(event) {
      const { scrollTop, offsetHeight, scrollHeight } = event.target;
      const bottomOfWindow = scrollTop + offsetHeight;
      const { next, isLoading } = this;

      if (!isLoading && next && bottomOfWindow >= scrollHeight - 50) {
        this.updateFiles();
      }
    },
    async updateFiles() {
      this.isLoading = true;
      const { items, next } = await this.storeFile.listByUpdateTime({ next: this.next, limit: this.LIMIT_PER_LOAD }).finally(() => this.isLoading = false);

      this.files = [...this.files, ...items];
      this.next = next;
    },
    onClickImage(src) {
      this.imageSrc = src;
      this.$refs.imageDialog.show();
    },
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeFile = new StoreFile({ db });
    this.updateFiles();
    this.updateStorageCapacity();
  },
}
</script>

<template>
  <v-container
    class="h-100 overflow-y-scroll"
    @scroll="onScroll"
  >
    <v-row no-gutters>
      <v-col cols="12" class="d-flex">
        <v-list-item
          class="w-100 capacity-info"
          density="compact"
          prepend-icon="mdi-database"
        >
          <v-list-item-subtitle>{{ usage }} / {{ quota }}</v-list-item-subtitle>
          <template v-slot:append>
            <input
              ref="inputFile"
              type="file"
              class="d-none"
              @change="onFileSelected"
            />
            <v-btn density="default" icon="mdi-file-plus"
              :title="$t('Upload')"
              @click="onClickAddFile"
            ></v-btn>
          </template>
      </v-list-item>
      </v-col>
    </v-row>
    <v-divider class="ma-2"></v-divider>
    <v-row no-gutters>
      <v-col cols="6" md="3"  v-for="(file) in files" :key="file.id">
        <v-card class="ma-1">
          <v-img v-if="file.type.startsWith('image/')"
            :src="file.src"
            @click="onClickImage(file.src)"
            height="200"
          >
          </v-img>
          <svg-icon v-else type="mdi" :path="mdiFile" height="200" width="100%"></svg-icon>
          <v-divider></v-divider>
          <v-card-subtitle class="pt-4">
            {{ file.name }}
          </v-card-subtitle>
          <v-card-text class="text-left">
            <div v-if="file.type.startsWith('image/')">
              {{ `${$t('Image size')}: ${file.info.width} x ${file.info.height}` }}
            </div>
            <div>{{ `${$t('Size')}: ${formatBytes(file.size)}` }}</div>
            <div>{{ `${$t('Updated time')}: ${toLocaleTimeString(file.updatedTime)}` }}</div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="medium-emphasis"
              icon="mdi-download"
              :title="$t('Download')"
              @click="onClickDownload(file)"
            ></v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="medium-emphasis"
              icon="mdi-trash-can"
              :title="$t('Delete')"
              @click="onClickDelete(file.id)"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <ImageDialog
    ref="imageDialog"
    :src="imageSrc"
  />
</template>

<style scoped>
.capacity-info :deep(.v-list-item__content) {
  text-align: left;
}

.overflow-y-scroll {
  overflow-y: auto;
}
</style>
