<script>
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiHelp } from '@mdi/js';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import { mapActions } from 'vuex';
import { mergeProps } from 'vue'

import SITE from '@/constants/site.js';

export default {
  components: {
    SvgIcon,
    InteractionGoogleMap,
  },
  data() {
    return {
      storeHistory: null,
      next: null,
      history: [],
      center: null,
      mapComponent: null,
      selectedHistory: null,
    };
  },
  computed: {
    historyUrl() {
      return this.$route.matched[0].path;
    },
    menuButtonLabel() {
      return this.selectedHistory
        ? `${this.selectedHistory.title} (${this.toLocaleString(this.selectedHistory.updatedTime)})`
        : this.$t('Please select...');
    }
  },
  methods: {
    mergeProps,
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('Geopositioning', ['getUserPosition']),
    queryActionsFromStore(next) {
      return this.storeHistory.queryActionOrderByUpdateTime('', { next });
    },
    getIconPath(type, action) {
      return SITE.TYPE_ACTION_ICON[type][action] || mdiHelp;
    },
    toLocaleString(timestamp) {
      const date = new Date(timestamp);

      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    },
    genHistoryChildUrl(item) {
      return `${this.historyUrl}/${item.type}/${item.id}`;
    },
    onClick(item) {
      const { lat, lng } = item.position;

      this.$refs.googleMap.removePositionMarker();
      this.$refs.googleMap.setMapCenter({ lat, lng });
      this.$refs.googleMap.addPositionMarker({ lat, lng });
      this.selectedHistory = item;
    },
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeHistory = new StoreHistory({ db });

    const {items, next} = await this.queryActionsFromStore();

    this.history = items;
    this.next = next;
    this.center = await this.getUserPosition();
    this.mapComponent = 'InteractionGoogleMap';
    this.$nextTick(() => {
      const selectedId = this.$route.params?.id;

      if (selectedId) {
        const selectedItem = this.history.find((item) => item.id === selectedId);

        this.onClick(selectedItem);
      }
      this.$refs.googleMap.setMapUndraggable();
    });
  },
}
</script>

<template>
  <v-container class="md-fill-height">
    <v-row no-gutters class="md-fill-height">
      <v-col cols="12" md="4" class="md-fill-height">
        <v-card
          class="mx-auto pa-2 d-flex flex-column md-fill-height"
        >
          <component
            ref="googleMap"
            class="interaction-google-map mb-3"
            :is="mapComponent"
            :center="center"
          />
          <!-- MD size -->
          <v-divider class="hidden-md-and-down"></v-divider>
          <div class="overflow-auto hidden-md-and-down">
            <v-list-item
              v-for="item in history"
              :key="item.id"
              :value="item.id"
              :to="genHistoryChildUrl(item)"
              class="text-start mt-1 mb-1"
              @click="onClick(item)"
            >
              <template v-slot:prepend>
                <svg-icon type="mdi" :path="getIconPath(item.type, item.action)"></svg-icon>
              </template>
              <v-list-item-title>
                <span class="ml-2">{{ item.title }}</span>
              </v-list-item-title>
              <v-list-item-subtitle>
                <span class="ml-2">
                  {{ toLocaleString(item.updatedTime) }}
                </span>
              </v-list-item-subtitle>
            </v-list-item>
          </div>
          <!-- SM size -->
          <div class="text-center hidden-md-and-up pa-2">
            <v-menu>
              <template v-slot:activator="{ props: menu }">
                <v-tooltip location="top">
                  <template v-slot:activator="{ props: tooltip }">
                    <div class="d-flex flex-column">
                      <v-btn
                        class="menu-btn"
                        variant="outlined"
                        color="primary"
                        v-bind="mergeProps(menu, tooltip)"
                      >
                        {{ menuButtonLabel }}
                      </v-btn>
                    </div>
                  </template>
                </v-tooltip>
              </template>
              <v-list>
                <v-list-item
                  v-for="(item) in history"
                  :key="item.id"
                  :to="genHistoryChildUrl(item)"
                  class="mt-1 mb-1"
                  @click="onClick(item)"
                >
                  <template v-slot:prepend>
                    <svg-icon type="mdi" :path="getIconPath(item.type, item.action)"></svg-icon>
                  </template>
                  <v-list-item-title>
                    <span class="ml-2">{{ item.title }}</span>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <span class="ml-2">
                      {{ toLocaleString(item.updatedTime) }}
                    </span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="8" class="md-fill-height">
        <router-view></router-view>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.overflow-auto {
  overflow: auto;
}

.md-fill-height {
  @media (min-width: 960px) {
    height: 100%;
  }
}

.menu-btn.v-btn {
  height: 40px;
}

a.v-list-item:hover {
  color: var(--color-text-hover);
}
</style>
