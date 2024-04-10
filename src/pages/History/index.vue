<script>
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue';
import LeaveConfirmDialog from '@/components/LeaveConfirmDialog.vue';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiHelp } from '@mdi/js';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import { mapActions } from 'vuex';
import { mergeProps } from 'vue';

import SITE from '@/constants/site.js';

export default {
  components: {
    SvgIcon,
    InteractionGoogleMap,
    DeleteConfirmDialog,
    LeaveConfirmDialog,
  },
  data() {
    return {
      storeHistory: null,
      next: null,
      history: [],
      center: null,
      mapComponent: null,
      selectedHistory: null,
      selectedChanged: false,
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
    },
  },
  methods: {
    mergeProps,
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('IndexedDB', ['deleteHistory']),
    ...mapActions('Geopositioning', ['getUserPosition']),
    queryActionsFromStore(next) {
      return this.storeHistory.queryActionOrderByUpdateTime('', { next });
    },
    getIconPath(type, action) {
      return SITE.TYPE_ACTION_ICON[type][action] || mdiHelp;
    },
    toLocaleString(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    genHistoryChildUrl(item) {
      return `${this.historyUrl}/${item.type}/${item.id}`;
    },
    setSelectedItem(item) {
      const { lat, lng } = item.position;

      this.$refs.googleMap.removePositionMarker();
      this.$refs.googleMap.setMapCenter({ lat, lng });

      const positionMarker = this.$refs.googleMap.addPositionMarker({ lat, lng });

      this.$refs.googleMap.setMarkerUndraggable(positionMarker);
      this.selectedHistory = item;
      this.$router.push(this.genHistoryChildUrl(item));
    },
    onClick(item) {
      const confirmHandler = () => {
        this.setSelectedItem(item);
      };

      if (this.selectedChanged) {
        this.$refs.leaveConfirmDialog.show();
        this.confirmHandler = confirmHandler;
      } else {
        confirmHandler();
      }
    },
    onClickOpen(item) {
      const { id, action, siteId, type } = item;
      let url;

      switch(action) {
        case 'create':
          url = this.$router.resolve({
            name: 'establish',
            params: { id },
          }).href;
          break;
        default:
          url = this.$router.resolve({
            name: type,
            params: { siteId },
          }).href;
      }

      window.open(url, '_blank');
    },
    onClickHistoryDelete(item) {
      this.selectedHistory = item;
      this.$refs.deleteConfirmDialog.show();
    },
    async onClickConfirmDelete() {
      const { id } = this.selectedHistory;

      await this.deleteHistory(id);

      this.history = this.history.filter((item) => item.id !== id);

      if (this.$route.params.id) {
        this.$refs.googleMap.removePositionMarker();
        this.$router.push('../');
      }
    },
    onChange(value) {
      this.selectedChanged = value;
    },
    onClicConfirmLeave() {
      this.confirmHandler();
      this.confirmHandler = null;
      this.selectedChanged = false;
    },
  },
  async mounted() {
    const db = await this.idbConnect();

    this.storeHistory = new StoreHistory({ db });

    const {items, next} = await this.queryActionsFromStore();

    this.history = items;
    this.next = next;

    await this.getAccount();

    if (this.position) {
      this.center = this.position;
    } else {
      this.center = await this.getUserPosition();
    }

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
            class="mb-3"
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
              :active="selectedHistory === item"
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
              <template v-slot:append>
                <v-btn
                  color="grey-lighten-1"
                  icon="mdi-arrow-top-right-bold-box-outline"
                  variant="text"
                  @click="onClickOpen(item)"
                ></v-btn>
                <v-btn
                  color="red"
                  icon="mdi-delete"
                  variant="text"
                  @click="onClickHistoryDelete(item)"
                ></v-btn>
              </template>
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
                  <template v-slot:append>
                    <v-btn
                      color="grey-lighten-1"
                      icon="mdi-arrow-top-right-bold-box-outline"
                      variant="text"
                      @click="onClickOpen(item)"
                    ></v-btn>
                    <v-btn
                      color="red"
                      icon="mdi-delete"
                      variant="text"
                      @click="onClickHistoryDelete(item)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="8" class="md-fill-height">
        <router-view
          class="pt-0 pb-0"
          @change="onChange"
        ></router-view>
      </v-col>
    </v-row>
    <DeleteConfirmDialog
      ref="deleteConfirmDialog"
      :name="selectedHistory?.title"
      @delete="onClickConfirmDelete"/>
    <LeaveConfirmDialog
      ref="leaveConfirmDialog"
      @confirm="onClicConfirmLeave"/>
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
