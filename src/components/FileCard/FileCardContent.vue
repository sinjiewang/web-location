<script>
import formatBytes from '@/utils/formatBytes.js';

export default {
  props: {
    file: {
      type: Object,
      default: () => {},
    },
  },
  methods: {
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
  <div v-if="file?.type.startsWith('image/')">
    {{ `${$t('Image size')}: ${file.info.width} x ${file.info.height}` }}
  </div>
  <div>{{ `${$t('Size')}: ${formatBytes(file.size)}` }}</div>
  <div>{{ `${$t('Updated time')}: ${toLocaleTimeString(file.updatedTime)}` }}</div>
</template>

<style scoped>

</style>
