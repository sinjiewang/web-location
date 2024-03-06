<script>
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import { mapState, mapGetters, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiHelp } from '@mdi/js';
import SITE from '@/constants/site.js';

export default {
  components: {
    SvgIcon,
    InteractionGoogleMap,
  },
  data() {
    return {
      center: null,
      mapComponent: null,
      selectedLabel: null,
      selectedLabelSites: [],
      selectedLabelSitesNextToken: null,
    };
  },
  computed: {
    ...mapState('Account', ['nickName']),
    ...mapGetters('Geopositioning', ['labels']),
    labelName() {
      const { lat, lng } = this.selectedLabel || {};

      return `${lat}, ${lng}`;
    },
    connectLabel() {
      return this.$t('Connect');
    },
  },
  methods: {
    ...mapActions('Geopositioning', ['getLabels', 'getUserPosition', 'getPositionSites']),
    ...mapActions('CloudTunnel', ['clientConnect', 'updateClientPosition']),
    onMapCenterMoved(position) {
      this.center = position;
      this.getLabels(this.center);
      this.updateClientPosition(position);
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
      return SITE.TYPE[type]?.icon || mdiHelp;
    },
    getTypeName(type) {
      return this.$router.getRoutes().find(route => route.meta?.type === type).name;
    },
    onClickConnect(siteId, type) {
      const name = this.getTypeName(type);
      const { nickName } = this;
      const url = this.$router.resolve({
        name: name,
        params: { siteId },
        // query: { nickName },
      }).href;

      window.open(url, '_blank');
    },
  },
  watch: {
    labels(value) {
      const { googleMap } = this.$refs;

      googleMap.updateLabelMarkers(value);
    },
  },
  async mounted() {
    this.center = await this.getUserPosition();

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
      <v-col cols="12" md="4"
        v-if="selectedLabel"
      >
        <div class="d-flex align-center flex-column">
          <div class="text-subtitle-1">{{ labelName }}</div>
          <template
            v-for="site in selectedLabelSites"
            :key="site.siteId"
          >
            <v-card
              width="100%"
              class="text-start"
            >
              <v-card-title class="custom-title">
                <svg-icon type="mdi" :path="getSiteTypeIcon(site.type)"></svg-icon>
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
</style>
