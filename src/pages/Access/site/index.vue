<script>
import { mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';
import FileList from '@/components/FileList.vue';
import BaseSite from '@/components/BaseSite.vue';
import Service from '@/utils/Service/Access/SiteService.js';

export default {
  extends: BaseSite,
  components: {
    FileList,
  },
  // props: ['tunnel', 'profile'],
  data() {
    return {
      signaling: null,
      rtcSite: null,
      storeHistory: null,
      dataChannels: {},
      participants: {},
      selected: [],
      allowUpload: true,
    };
  },
  computed: {
    selectedLabel() {
      const { length } = this.selected.filter((selected) => !!selected);

      return length
        ? `(${this.$t('Selected')} ${length})`
        : '';
    },
  },
  watch: {
    allowUpload(value) {
      this.service?.setProfile({
        allowUpload: value,
      });
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('CloudTunnel', ['updateSiteOptions']),
    createService({ id, profile, tunnel, db }) {
      const { allowUpload } = this;
      const service = new Service({
        id,
        tunnel,
        db,
        profile: {
          ...toRaw(profile),
          allowUpload,
        },
      });

      service.on('file', (event) => this.onfile(event));
      service.on('connect', (event) => this.onconnect(event));
      service.on('disconnect', (event) => this.ondisconnect(event));

      return service;
    },
    async onfile(file) {
      await this.$refs.fileList.appendFile(file);

      if (!this.isSelected(file.id)) {
        this.selected.push(file.id);
      }

      this.updateServiceFiles();
    },
    onconnect() {
      this.updateSiteConnectionCount();
    },
    ondisconnect() {
      this.updateSiteConnectionCount();
    },
    onClickCheckbox({ id }) {
      if (this.isSelected(id)) {
        this.removeSelectedById(id);
      } else {
        this.selected.push(id);
      }

      this.updateServiceFiles();
    },
    isSelected(id) {
      return this.selected.includes(id);
    },
    removeSelectedById(id) {
      this.selected = this.selected.filter((selectedId) => selectedId !== id);
    },
    updateServiceFiles() {
      const files = this.$refs.fileList.files
        .filter(({ id }) => this.isSelected(id))
        .map(({
          id,
          name,
          size,
          info,
          thumbnailSrc,
          type,
          updatedTime
        }) => ({
          id,
          name,
          size,
          info,
          thumbnailSrc,
          type,
          updatedTime
        }));

      this.service.setFiles(files);
    },
    onFilesChanged(files) {
      this.selected.forEach((id) => {
        if (files.every((file) => file.id !== id)) {
          this.removeSelectedById(id);
          this.updateServiceFiles();
        }
      });
    },
  },
  async mounted() {
    const db = await this.idbConnect();
    const { siteId, profile, tunnel } = this;
    const service = this.createService({
      id: siteId,
      profile,
      // tunnel,
      db,
    });
    const { nickname, avatar } = await this.getAccount();

    service.register({ name: nickname, avatar });

    await service.init();

    this.service = service;
    this.allowUpload = service.allowUpload;
    this.selected = service.files.map((file) => file?.id)
      .filter(value => !!value);

    this.setCloudTunnel(tunnel);
  },
  beforeUnmount() {
    this.service.close();
    this.service = null;
  },
}
</script>

<template>
  <FileList
    ref="fileList"
    class="h-100-30"
    v-bind="$attrs"
    :iconHeight="100"
    :limitPerLoad="16"
    @files="onFilesChanged"
  >
    <template #title>
      <div class="ml-2 ml-md-0">
        <v-icon icon="mdi-checkbox-marked-outline"></v-icon>
        {{ $t('Please select files to allow access') }} {{ selectedLabel }}
      </div>
    </template>
    <template #capacity>
      <span class="ml-md-8 d-none d-md-inline">
        <v-btn
          color="medium-emphasis"
          size="small"
          :icon="allowUpload ? 'mdi-checkbox-outline' : 'mdi-checkbox-blank-outline'"
          @click="allowUpload = !allowUpload"
        ></v-btn>
        <span class="ml-2">{{ $t('Allow upload') }}</span>
      </span>
      <div class="d-md-none text-start">
        <v-btn
          color="medium-emphasis"
          size="small"
          :icon="allowUpload ? 'mdi-checkbox-outline' : 'mdi-checkbox-blank-outline'"
          @click="allowUpload = !allowUpload"
        ></v-btn>
        <span class="ml-2">{{ $t('Allow upload') }}</span>
      </div>
    </template>
    <template #card-name="{ file, index }">
      <div class="v-card-subtitle text-align-left"
        :class="isSelected(file.id) ? 'opacity-1' : 'opacity-half'"
        @click="onClickCheckbox(file, index)"
      >
        <v-icon
          class="mr-2"
          :color="isSelected(file.id) ? 'medium-emphasis' : ''"
          :icon="isSelected(file.id) ? 'mdi-checkbox-outline' : 'mdi-checkbox-blank-outline'"
        ></v-icon>
        <span :title="file.name">{{ file.name }}</span>
      </div>
    </template>
  </FileList>
</template>

<style scoped>
.h-100-30 {
  height: calc(100% - 30px);
}

.text-align-left {
  text-align: left;
}

.opacity-1 {
  opacity: 1;
}
.opacity-half {
  opacity: 0.5;
}
</style>
