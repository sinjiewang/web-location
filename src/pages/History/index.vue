<script>
// import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
// import { mapState, mapGetters, mapActions } from 'vuex';
// import SvgIcon from '@jamescoyle/vue-icon';
// import { mdiHelp } from '@mdi/js';
// import SITE from '@/constants/site.js';
import IdbHistory from '@/utils/IndexedDB/IdbHistory';
import { mapActions } from 'vuex';

export default {
  components: {

  },
  data() {
    return {
      idbHistory: null,
      history: [],
    };
  },
  computed: {
  },
  methods: {
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
  },
  async mounted() {
    const db = await this.idbConnect();

    this.idbHistory = new IdbHistory({ db });
    this.history = await this.idbHistory.queryByAction('join');
  },
}
</script>

<template>
  <v-container>
    <v-row no-gutters>
      <v-col cols="4">

      </v-col>
      <v-col cols="8">

      </v-col>
    </v-row>
    <!-- <v-row no-gutters>
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
    </v-row> -->
  </v-container>
</template>

<style scoped>
/* .interaction-google-map {
  width: 100%;
} */
</style>
