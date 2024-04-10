<script>
import LANG_LIST from '@/locales/list';
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiTranslate, mdiMap, mdiMapPlus } from '@mdi/js'
import { mapActions } from 'vuex';

export default {
  components: {
    SvgIcon,
  },
  data() {
    return {
      items: LANG_LIST,
      mdiTranslate,
      mdiMap,
      mdiMapPlus,
    };
  },
  computed: {
    locale() {
      return this.$i18n.locale;
    },
    establishPath() {
      return this.$router.resolve({ name: 'establish' }).href;
    },
  },
  methods: {
    ...mapActions('Account', ['updateLocale']),
    selectLocale(locale) {
      this.updateLocale({
        i18n: this.$i18n,
        locale,
      });
    },
    onMapPlusClick() {
      window.open(this.establishPath, '_blank');
    },
  },
}
</script>

<template>
  <v-app-bar>
    <v-container fluid>
      <v-row align="center" justify="space-between">
        <v-col cols="auto">
          <svg-icon type="mdi" :path="mdiMap"></svg-icon>
        </v-col>
        <v-col cols="auto">
          <v-btn icon
            @click="onMapPlusClick"
          >
            <svg-icon type="mdi" :path="mdiMapPlus"></svg-icon>
          </v-btn>
          <v-menu offset-y>
            <template v-slot:activator="{ props }">
              <v-btn icon
                v-bind="props"
              >
                <svg-icon type="mdi" :path="mdiTranslate"></svg-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="(item, index) in items"
                :key="index"
                :active="item.value === locale"
                @click="selectLocale(item.value)"
              >
                <v-list-item-title>{{ item.text }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-col>
      </v-row>
    </v-container>
  </v-app-bar>
</template>

<style scoped>

</style>
