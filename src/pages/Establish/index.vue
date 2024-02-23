<script>
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import { mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiMapMarkerRightOutline } from '@mdi/js';
import coordinate from '@/utils/coordinate.js'
import SITE from '@/constants/site.js';

export default {
  components: {
    SvgIcon,
    InteractionGoogleMap,
  },
  data() {
    return {
      mdiMapMarkerRightOutline,
      mapComponent: null,
      positionMarker: null,
      position: null,
      title: null,
      type: null,
      loading: false,
      formValid: false,
      wsClient: null,
    };
  },
  computed: {
    types() {
      return Object.keys(SITE.TYPE).map((type) => ({
        type,
        text: SITE.TYPE[type].name(this.$t),
      }));
    },
  },
  methods: {
    ...mapActions('Geopositioning', ['getUserPosition']),
    ...mapActions('CloudTunnel', ['siteConnect', 'disconnect']),
    onPositionChanged({ lat, lng }) {
      this.position = coordinate.transform({ lat, lng });
    },
    async onClickCreate() {
      const { type, title, position } = this;
      const { lat, lng } = position;

      this.$refs.form.validate();

      if (!this.formValid) return;

      this.setUndraggable();
      this.loading = true;
      this.wsClient = await this.siteConnect({ lat, lng, type, title });

      this._onWsClientClose = () => {
        this.wsClient.off('close', this._onWsClientClose);
        this.wsClient = null;
        this._onWsClientClose = null;
      };
      this.wsClient.on('close', this._onWsClientClose);
      this.loading = false;
    },
    onClickDisconnect() {
      const { wsClient, _onWsClientClose } = this;

      if (wsClient && _onWsClientClose) {
        _onWsClientClose();
      }

      setTimeout(() => {
        this.loading = false;
        this.setDraggable();
      }, 1000)
      this.loading = true;
      this.disconnect();
    },
    setDraggable() {
      this.$refs.googleMap.setMapDraggable();
      this.$refs.googleMap.setMarkerDraggable(this.positionMarker);
    },
    setUndraggable() {
      this.$refs.googleMap.setMapUndraggable();
      this.$refs.googleMap.setMarkerUndraggable(this.positionMarker);
    },
  },
  async mounted() {
    const { lat, lng } = await this.getUserPosition();

    this.position = coordinate.transform({ lat, lng });
    this.mapComponent = 'InteractionGoogleMap';
    this.$nextTick(() => {
      this.positionMarker = this.$refs.googleMap.addPositionMarker(this.position);
    });
  },
}
</script>

<template>
  <!-- <v-container class="bg-surface-variant"> -->
    <v-row no-gutters>
      <v-col cols="8">
        <v-sheet class="ma-2 pa-2">
          <component
            ref="googleMap"
            class="interaction-google-map"
            :is="mapComponent"
            :center="position"
            @position="onPositionChanged"
          />
        </v-sheet>
      </v-col>
      <v-col cols="4">
        <!-- <v-row cols="8">
          <svg-icon type="mdi" :path="mdiMapMarkerRightOutline"></svg-icon>
        </v-row> -->
        <v-form
          v-model="formValid"
          ref="form"
          class="site-form"
        >
          <v-container>
            <div class="d-flex mb-4">
              <svg-icon type="mdi" :path="mdiMapMarkerRightOutline"></svg-icon>
              <span>{{ $t('Drag to set your position') }}</span>
            </div>
            <v-select
              v-model="type"
              :label="$t('Type')"
              :items="types"
              :rules="[v => !!v || $t('Required')]"
              item-title="text"
              item-value="type"
              required
            >
            </v-select>
            <v-text-field
              v-model="title"
              :label="$t('Title')"
              :rules="[v => !!v || $t('Required')]"
              hide-details
              required
            ></v-text-field>
            <div class="d-flex flex-column">
              <v-btn
                v-if="!wsClient"
                :disabled="!formValid"
                :loading="loading"
                class="mt-4 form-btn"
                :color="formValid ? 'blue' : null"
                @click="onClickCreate"
              >
              {{ $t('Create') }}
              </v-btn>
              <v-btn
                v-else
                class="mt-4 form-btn"
                color="red"
                :loading="loading"
                @click="onClickDisconnect"
              >
              {{ $t('Close') }}
              </v-btn>
            </div>
          </v-container>
        </v-form>
      </v-col>
    </v-row>
  <!-- </v-container> -->
</template>

<style scoped>
.interaction-google-map {
  width: 100%;
}

.site-form .form-btn {
  height: 56px;
}

.loader {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
