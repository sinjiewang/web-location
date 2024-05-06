<script>
import { saveAs } from 'file-saver';
import SvgIcon from '@jamescoyle/vue-icon';
import FileList from '@/components/FileList.vue';
import formatBytes from '@/utils/formatBytes.js';
import FileCardContent from  '@/components/FileCard/FileCardContent.vue';

export default {
  components: {
    SvgIcon,
    FileList,
    FileCardContent,
  },
  methods: {
    async onClickDelete(id) {
      this.$refs.fileList.deleteFile(id)
    },
    onClickDownload({ name, type, src }) {
      saveAs(src, name, { type });
    },
    toLocaleTimeString(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    formatBytes(value) {
      return formatBytes(value);
    },
  },
}
</script>

<template>
  <FileList ref="fileList" class="h-100">
    <!-- <template #header="{ file }"></template> -->
    <template #card-text="{ file }">
      <FileCardContent :file="file"/>
    </template>

    <template #card-actions="{ file }">
      <v-btn
        color="medium-emphasis"
        icon="mdi-tray-arrow-down"
        :title="$t('Save file to device')"
        @click="onClickDownload(file)"
      ></v-btn>
      <v-spacer></v-spacer>
      <v-btn
        color="medium-emphasis"
        icon="mdi-trash-can"
        :title="$t('Delete')"
        @click="onClickDelete(file.id)"
      ></v-btn>
    </template>
  </FileList>
</template>

<style scoped>
.capacity-info :deep(.v-list-item__content) {
  text-align: left;
}

.overflow-y-scroll {
  overflow-y: auto;
}
</style>
