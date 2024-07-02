<script>
import { mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiMapPlus, mdiMagnify } from '@mdi/js';
import SITE from '@/constants/site.js';

export default {
  components: {
    SvgIcon,
  },
  data() {
    return {
      loading: false,
      searchAttr: 'type',
      searchKeyWord: null,
      searchTypes: null,
      selectedLabelSites: null,
      nextToken: null,
      mdiMapPlus,
      mdiMagnify,
    };
  },
  computed: {
    establishPath() {
      const { lat, lng } = this;

      return this.$router.resolve({
        name: 'establish',
        query: { lat, lng },
      }).href;
    },
    searchAttrs() {
      return [
        {
          name: 'title',
          text: this.$t('Title'),
        },
        {
          name: 'type',
          text: this.$t('Type'),
        },
      ];
    },
    types() {
      return Object.keys(SITE.TYPE).map((type) => ({
        type,
        text: SITE.TYPE[type].name(this.$t),
      }));
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('Geopositioning', ['listSiteByTitle', 'listSiteByTypes']),
    updateSites({ items=[], nextToken=null }={}) {
      this.selectedLabelSites = [...this.selectedLabelSites, ...items];
      this.nextToken = nextToken;
    },
    clearSites() {
      this.selectedLabelSites = [];
      this.nextToken = null;
    },
    getSiteTypeIcon(type) {
      return SITE.TYPE[type]?.icon || 'mdi-help';
    },
    getSiteTypeName(type) {
      return SITE.TYPE[type]?.name(this.$t) || '';
    },
    getTypeName(type) {
      return this.$router.getRoutes().find(route => route.meta?.type === type).name;
    },
    onClickConnectSite(siteId, type) {
      const name = this.getTypeName(type);
      const url = this.$router.resolve({
        name: name,
        params: { siteId },
      }).href;

      window.open(url, '_blank');
    },
    onEstablishClick() {
      window.open(this.establishPath, '_blank');
    },
    async onSearchTitleClick({ clear=true }={}) {
      const { searchKeyWord, nextToken } = this;

      this.loading = true;

      const res = await this.listSiteByTitle({
        title: searchKeyWord,
        nextToken,
      })
        .finally(() => this.loading = false);

        if (clear) this.clearSites();
      this.updateSites(res);
    },
    async onSearchTypesClick({ clear=true }={}) {
      const { searchTypes, nextToken } = this;
      const types = searchTypes || [];

      this.loading = true;

      const res = await this.listSiteByTypes({
        types,
        nextToken,
      })
        .finally(() => this.loading = false);

      if (clear) this.clearSites();
      this.updateSites(res);
    },
    updateLists() {
      switch (this.searchAttr) {
        case 'title':
          this.onSearchTitleClick({ clear: false });
          break;
        case 'type':
          this.onSearchTypesClick({ clear: false });
          break;
        default:
      }
    },
    onScroll(event) {
      const { scrollTop, offsetHeight, scrollHeight } = event.target;
      const bottomOfWindow = scrollTop + offsetHeight;
      const { loading, nextToken } = this;

      if (!loading && nextToken && bottomOfWindow >= scrollHeight - 50) {
        this.updateLists();
      }
    },
  },
}
</script>

<template>
  <v-container
    class="h-100"
    @scroll="onScroll"
  >
    <v-row no-gutters>
      <v-col cols="12">
        <v-row class="pa-2">
          <v-col cols="4" md="3">
            <v-select
              v-model="searchAttr"
              :label="$t('Search')"
              :items="searchAttrs"
              :rules="[v => !!v || $t('Required')]"
              hide-details
              item-title="text"
              item-value="name"
              required
            >
            </v-select>
          </v-col>
          <v-col cols="8" md="5">
            <v-text-field
              v-if="searchAttr === 'title'"
              class="search-input"
              v-model="searchKeyWord"
              :label="$t('Title')"
              :loading="loading"
              variant="solo"
              hide-details
              @keyup.enter="onSearchTitleClick"
            >
              <template v-slot:append>
                <v-btn
                  class="establish-btn search-btn"
                  @click="onSearchTitleClick"
                  block
                >
                <svg-icon type="mdi" :path="mdiMagnify" class="h-40 w-40 mr-2"></svg-icon>
                </v-btn>
              </template>
            </v-text-field>
            <v-autocomplete
              v-if="searchAttr === 'type'"
              class="search-input"
              v-model="searchTypes"
              :items="types"
              color="blue-grey-lighten-2"
              item-title="text"
              item-value="type"
              :label="$t('Type')"
              :loading="loading"
              chips
              hide-details
              closable-chips
              multiple
            >
              <template v-slot:append>
                <v-btn
                  class="establish-btn search-btn"
                  @click="onSearchTypesClick"
                  block
                >
                <svg-icon type="mdi" :path="mdiMagnify" class="h-40 w-40 mr-2"></svg-icon>
                </v-btn>
              </template>
            </v-autocomplete>
          </v-col>
          <v-col cols="12" md="4">
            <v-btn
              class="establish-btn"
              color="success"
              :title="$t('Establish a site')"
              @click="onEstablishClick"
              block
            >
            <svg-icon type="mdi" :path="mdiMapPlus" class="h-40 w-40 mr-2"></svg-icon>
            {{ $t('Establish a site') }}
            </v-btn>
          </v-col>
        </v-row>
        <v-divider class="ma-2"></v-divider>
        <v-row class="pa-2">
          <v-col cols="12" md="5">
            <div class="d-flex align-center flex-column"
              v-if="selectedLabelSites && !selectedLabelSites.length"
            >
              {{ $t('No Results') }}
            </div>
            <div class="d-flex align-center flex-column"
              v-if="selectedLabelSites && selectedLabelSites.length"
            >
              <template
                v-for="(site, index) in selectedLabelSites"
                :key="site.siteId"
              >
                <v-card
                  width="100%"
                  class="text-start"
                >
                  <v-card-title class="custom-title">
                    <span class="mr-2">#{{ index + 1 }}</span>
                    <v-icon :icon="getSiteTypeIcon(site.type)"></v-icon>
                    <v-icon icon="mdi-key-alert" v-if="site.passwordRequired" class="ml-2"></v-icon>
                    <span class="ml-2">{{ getSiteTypeName(site.type) }}</span>
                    <span class="ml-1"
                      :title="$t('Current Number of Connections')"
                    >({{ site.connectionCount || '0' }}{{ site.connectionLimit ? `/${site.connectionLimit}` : '' }})</span>
                    <span class="ml-2 text-subtitle-2 opacity-70"
                      v-if="site.owner"
                    >{{ $t('Created by', { name: site.owner }) }}</span>
                  </v-card-title>
                  <v-card-text>{{ site.title }}</v-card-text>
                  <v-card-actions class="d-flex justify-end align-stretch">
                    <v-btn class="bg-blue"
                      @click="onClickConnectSite(site.siteId, site.type)"
                    >
                      {{ $t('Connect') }}
                    </v-btn>
                  </v-card-actions>
                </v-card>
                <br>
              </template>
            </div>
          </v-col>
        </v-row>
      </v-col>
      <!-- <v-col cols="12" md="4">
        <v-row class="pa-2">
          <v-col cols="12">
            <v-btn
              class="establish-btn"
              color="success"
              :title="$t('Establish a site')"
              @click="onEstablishClick"
              block
            >
            <svg-icon type="mdi" :path="mdiMapPlus" class="h-40 w-40 mr-2"></svg-icon>
            {{ $t('Establish a site') }}
            </v-btn>
          </v-col>
        </v-row>
        <v-divider class="ma-2"></v-divider>
      </v-col> -->
    </v-row>
  </v-container>
</template>

<style scoped>
.main {

}
.opacity-70 {
  opacity: 0.7;
}
.v-btn.establish-btn {
  height: 56px;
}
.search-input:deep(.v-input__append) {
  margin-left: 0;
}
.search-input:deep(.v-input__control .v-field) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.v-btn.search-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.h-40 {
  height: 40px;
}
.h-56 {
  height: 56px;
}
.w-40 {
  width: 40px;
}
</style>
