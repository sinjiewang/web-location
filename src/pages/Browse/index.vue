<script>
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import { mapState, mapGetters, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiHelp, mdiKeyAlert, mdiMapPlus } from '@mdi/js';
import SITE from '@/constants/site.js';
import coordinate from '@/utils/coordinate.js';

export default {
  components: {
    SvgIcon,
    InteractionGoogleMap,
  },
  data() {
    return {
      lat: null,
      lng: null,
      mapComponent: null,
      selectedLabel: null,
      selectedLabelSites: [],
      selectedLabelSitesNextToken: null,
      mdiKeyAlert,
      mdiMapPlus,
    };
  },
  computed: {
    ...mapState('Account', ['nickName', 'position']),
    ...mapGetters('Geopositioning', ['labels']),
    connectLabel() {
      return this.$t('Connect');
    },
    queryLat() {
      return this.$route.query?.lat !== undefined
        ? Number(this.$route.query.lat) : null;
    },
    queryLng() {
      return this.$route.query?.lng !== undefined
        ? Number(this.$route.query.lng) : null;
    },
    center() {
      const { lat, lng } = this;

      return { lat, lng };
    },
    establishPath() {
      const { lat, lng } = this;

      return this.$router.resolve({
        name: 'establish',
        query: { lat, lng },
      }).href;
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('Account', { updateAccountPosition: 'updatePosition' }),
    ...mapActions('Geopositioning', ['getLabels', 'getUserPosition', 'getPositionSites']),
    ...mapActions('CloudTunnel', ['clientConnect', 'updateClientPosition']),
    onMapCenterMoved(position) {
      const { lat, lng } = coordinate.transform(position);

      this.lat = lat;
      this.lng = lng;
      this.getLabels(this.center);
      this.updateClientPosition(position);
      this.updateAccountPosition(position);
    },
    async updateSites(positionId, nextToken=null) {
      const res = await this.getPositionSites({ positionId, nextToken });

      if (res && res.items) {
        this.selectedLabelSites = [...this.selectedLabelSites, ...res.items];
        this.selectedLabelSitesNextToken = res.nextToken;
      }
    },
    onClickMapLabel(label) {
      this.selectedLabel = label;
      this.selectedLabelSites = [];
      this.selectedLabelSitesNextToken = null;

      return this.updateSites(label.positionId);
    },
    getSiteTypeIcon(type) {
      return SITE.TYPE[type]?.icon || 'mdi-help';
    },
    getTypeName(type) {
      return this.$router.getRoutes().find(route => route.meta?.type === type).name;
    },
    onClickConnect(siteId, type) {
      const name = this.getTypeName(type);
      const url = this.$router.resolve({
        name: name,
        params: { siteId },
      }).href;

      window.open(url, '_blank');
    },
    onMapPlusClick() {
      window.open(this.establishPath, '_blank');
    },
  },
  watch: {
    labels(value) {
      const { googleMap } = this.$refs;

      googleMap.updateLabelMarkers(value);
    },
  },
  async mounted() {
    await this.getAccount();

    let position;

    if (this.queryLat !== null && this.queryLng !== null) {
      position = {
        lat: this.queryLat,
        lng: this.queryLng,
      };
    } else if (this.position) {
      position = this.position;
    } else {
      position = await this.getUserPosition();
    }

    const { lat, lng } = coordinate.transform(position);

    this.lat = lat;
    this.lng = lng;

    await this.clientConnect(this.center);

    this.mapComponent = 'InteractionGoogleMap';
    this.getLabels(this.center);
  },
}
</script>

<template>
  <v-container>
    <v-row no-gutters>
      <v-col cols="12" md="8">
        <v-sheet class="ma-2 pa-2">
          <component
            ref="googleMap"
            class="interaction-google-map"
            :is="mapComponent"
            :center="center"
            :minZoom="16"
            @center="onMapCenterMoved"
            @label="onClickMapLabel"
          />
        </v-sheet>
      </v-col>
      <v-col cols="12" md="4">
        <v-row class="pa-2">
          <v-col cols="12">
            <v-btn
              class="establish-btn"
              color="success"
              :title="$t('Establish a site')"
              @click="onMapPlusClick"
              block
            >
            <svg-icon type="mdi" :path="mdiMapPlus" class="h-40 w-40 mr-2"></svg-icon>
            {{ $t('Establish a site') }}
            </v-btn>
          </v-col>
        </v-row>
        <v-divider class="ma-2"></v-divider>
        <div class="d-flex align-center flex-column"
          v-if="selectedLabel"
        >
          <template
            v-for="site in selectedLabelSites"
            :key="site.siteId"
          >
            <v-card
              width="100%"
              class="text-start"
            >
              <v-card-title class="custom-title">
                <v-icon :icon="getSiteTypeIcon(site.type)"></v-icon>
                <v-icon icon="mdi-key-alert" v-if="site.passwordRequired" class="ml-2"></v-icon>
                <span class="ml-2 text-subtitle-2 opacity-70" v-if="site.owner">{{ $t('Created by', { name: site.owner }) }}</span>
              </v-card-title>
              <v-card-text>{{ site.title }}</v-card-text>
              <v-card-actions class="d-flex justify-end align-stretch">
                <v-btn class="bg-blue"
                  @click="onClickConnect(site.siteId, site.type)"
                >
                  {{ connectLabel }}
                </v-btn>
              </v-card-actions>
            </v-card>
            <br>
          </template>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.interaction-google-map {
  width: 100%;
}
.opacity-70 {
  opacity: 0.7;
}
.v-btn.establish-btn {
  height: 56px;
}
.h-40 {
  height: 40px;
}
.w-40 {
  width: 40px;
}
</style>
