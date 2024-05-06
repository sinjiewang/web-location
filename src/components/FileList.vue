<script>
import { mapState, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiFile, mdiDatabase, mdiFilePlus } from '@mdi/js';
import StoreFile from '@/utils/IndexedDB/StoreFile';
import ImageDialog from '@/components/ImageDialog.vue';
import formatBytes from '@/utils/formatBytes.js';

export default {
  components: {
    SvgIcon,
    ImageDialog,
  },
  props: {
    col: {
      type: Number,
      default: () => 6,
    },
    mdCol: {
      type: Number,
      default: () => 3,
    },
    iconHeight: {
      type: Number,
      default: () => 200,
    },
    limitPerLoad: {
      type: Number,
      default: () => 12,
    },
  },
  data() {
    return {
      STORAGE_WAIT: 150, // msec
      // LIMIT_PER_LOAD: 12,
      storeFile: null,
      files: [],
      next: null,
      isLoading: false,
      imageSrc: null,
      mdiFile,
      mdiDatabase,
      mdiFilePlus,
    };
  },
  computed: {
    ...mapState('IndexedDB', ['quota', 'usage']),
    storageQuota() {
      return this.quota ? formatBytes(this.quota) : '--';
    },
    storageUsage() {
      return this.usage ? formatBytes(this.usage) : '--';
    },
  },
  methods: {
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('IndexedDB', ['refreshStorageCapacity']),
    toLocaleTimeString(timestamp) {
      return new Date(timestamp).toLocaleString();
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
    async appendFile(fileData={}) {
      const { id } = fileData;
      let item;

      if (id) {
        const file = await this.storeFile.queryById(id);

        if (file) {
          item = await this.storeFile.update(id, fileData);

          const file = this.files.find((file) => file.id = id);

          Object.keys(item).forEach((attr) => file[attr] = item[attr]);
        }
      }

      if (!item) {
        if (fileData.type.startsWith('image/')) {
          item = await this.storeFile.createImage(fileData);
        } else {
          item = await this.storeFile.create(fileData);
        }

        this.files.unshift(item);
        this.refreshStorageCapacity();
      }

      return item;
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

      await this.appendFile(fileData);
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
      const { items, next } = await this.storeFile.listByUpdateTime({
        next: this.next,
        limit: this.limitPerLoad,
      }).finally(() => this.isLoading = false);

      this.files = [...this.files, ...items];
      this.next = next;
    },
    onClickImage(src) {
      this.imageSrc = src;
      this.$refs.imageDialog.show();
    },
    async deleteFile(id) {
      try {
        await this.storeFile.delete(id);

        this.files = this.files.filter((file) => file.id !== id);
        this.refreshStorageCapacity();
      } catch (err) {
        console.warn('storeFile.delete failed', err, id);
      }
    },
    async onClickRefresh() {
      this.files = [];
      this.next = null;
      this.refreshStorageCapacity();
      await this.updateFiles();

      this.$emit('files', this.files);
    }
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeFile = new StoreFile({ db });
    this.updateFiles();
    this.refreshStorageCapacity();
  },
}
</script>

<template>
  <v-container
    class="overflow-y-scroll"
    @scroll="onScroll"
  >
    <v-row no-gutters v-if="$slots.title">
      <v-col cols="12" class="d-flex">
        <slot name="title"></slot>
      </v-col>
    </v-row>
    <v-row no-gutters>
      <v-col cols="12" class="d-flex">
        <div class="d-flex justify-space-between w-100  pt-1 pb-1">
          <slot name="header" :usage="storageUsage" :quota="storageQuota">
            <div class="line-height-48">
              <v-icon icon="mdi-database" class="ml-2 ml-md-0"></v-icon>
              {{ storageUsage }} / {{ storageQuota }}
              <slot name="capacity"></slot>
            </div>
            <div>
              <v-btn density="default" icon="mdi-refresh"
                class="mr-2"
                :title="$t('Refresh')"
                @click="onClickRefresh"
              ></v-btn>
              <v-btn density="default" icon="mdi-file-plus"
                :title="$t('Upload')"
                @click="onClickAddFile"
              ></v-btn>
              <input
                class="d-none"
                type="file"
                ref="inputFile"
                @change="onFileSelected"
              />
            </div>
          </slot>
        </div>
      </v-col>
    </v-row>
    <v-divider class="ma-2"></v-divider>
    <v-row no-gutters>
      <v-col :cols="col" :md="mdCol"  v-for="(file, index) in files" :key="file.id">
          <v-card class="ma-1">
            <v-card-title
              v-if="$slots['card-title']"
            >
              <slot name="card-title" :file="file" :index="index"></slot>
            </v-card-title>
            <v-img v-if="file.type.startsWith('image/')"
              :src="file.src"
              :height="iconHeight"
              @click="onClickImage(file.src)"
            >
            </v-img>
            <svg-icon
              v-else
              type="mdi"
              :path="mdiFile"
              :height="iconHeight"
              width="100%"
            ></svg-icon>
            <v-divider></v-divider>
            <v-card-subtitle class="pa-2">
              <slot name="card-name" :file="file" :index="index">
                <span :title="file.name">{{ file.name }}</span>
              </slot>
            </v-card-subtitle>
            <v-card-text
              class="text-left"
              v-if="$slots['card-text']"
            >
              <slot name="card-text" :file="file" :index="index"></slot>
            </v-card-text>
            <v-card-actions
              v-if="$slots['card-actions']"
            >
              <slot name="card-actions" :file="file" :index="index"></slot>
            </v-card-actions>
          </v-card>
      </v-col>
    </v-row>
    <ImageDialog
      ref="imageDialog"
      :src="imageSrc"
    />
  </v-container>
</template>

<style scoped>
.capacity-info :deep(.v-list-item__content) {
  text-align: left;
}

.overflow-y-scroll {
  overflow-y: auto;
}

.line-height-48 {
  line-height: 48px;
}
</style>
