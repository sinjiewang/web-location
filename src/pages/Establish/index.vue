<script>
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import { mapState, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiMapMarkerRightOutline } from '@mdi/js';
import coordinate from '@/utils/coordinate.js'

import SITE from '@/constants/site.js';
import Chat from '@/pages/Chat/site/index.vue';

import { v4 as uuidv4 } from 'uuid';

const APP_MAPPING = {
  chat: 'Chat'
};

export default {
  components: {
    SvgIcon,
    InteractionGoogleMap,
    Chat,
  },
  data() {
    return {
      mdiMapMarkerRightOutline,
      mapComponent: null,
      thumbnailComponent: null,
      positionMarker: null,
      position: null,
      id: null,
      title: 'TEST',
      type: 'chat',
      loading: false,
      formValid: false,
      appComponent: null,
      step: 1,
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsClient']),
    types() {
      return Object.keys(SITE.TYPE).map((type) => ({
        type,
        text: SITE.TYPE[type].name(this.$t),
      }));
    },
    labelX() {
      return this.position?.lat || '';
    },
    labelY() {
      return this.position?.lng || '';
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
      this.id = uuidv4();

      await this.siteConnect({ lat, lng, type, title });

      this.nextStep();
      this.appComponent = APP_MAPPING[type];
      this.loading = false;

      this.setThumbnailMap();
    },
    onClickDisconnect() {
      setTimeout(() => {
        this.previousStep();
        this.loading = false;
        this.setDraggable();
        this.appComponent = null;
      }, 1000)
      this.loading = true;
      this.disconnect();
    },
    setThumbnailMap() {
      // this.thumbnailComponent = 'InteractionGoogleMap';
      // this.$nextTick(() => {
      //   this.positionMarker = this.$refs.thumbnailMap.addPositionMarker(this.position);
      //   this.$refs.thumbnailMap.setMapUndraggable();
      // });
    },
    setDraggable() {
      this.$refs.googleMap.setMapDraggable();
      this.$refs.googleMap.setMarkerDraggable(this.positionMarker);
    },
    setUndraggable() {
      this.$refs.googleMap.setMapUndraggable();
      this.$refs.googleMap.setMarkerUndraggable(this.positionMarker);
    },
    nextStep() {
      this.step = Math.min(this.step + 1, 2);
    },
    previousStep() {
      this.step = Math.max(this.step - 1, 1);
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
  <v-window v-model="step">

  <!-- config window -->
  <v-window-item :value="1">
  <v-container>
    <v-row no-gutters>
      <v-col cols="12" md="8">
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
      <v-col cols="12" md="4">
        <v-form
          v-model="formValid"
          ref="form"
          class="site-form"
        >
          <v-container>
            <div class="d-flex mb-4">
              <svg-icon type="mdi" :path="mdiMapMarkerRightOutline"></svg-icon>
              <span class="ml-1">{{ $t('Drag to set your position') }}</span>
            </div>
            <v-row class="mb-4">
              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-model="labelX"
                  label="x"
                  disabled
                  hide-details
                ></v-text-field>
              </v-col>
              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-model="labelY"
                  label="y"
                  disabled
                  hide-details
                ></v-text-field>
              </v-col>
            </v-row>
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
                :disabled="!formValid"
                :loading="loading"
                class="mt-4 form-btn"
                :color="formValid ? 'blue' : null"
                @click="onClickCreate"
              >
              {{ $t('Create') }}
              </v-btn>
            </div>
          </v-container>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
  </v-window-item>

  <!-- module window -->
  <v-window-item :value="2">
    <v-container>
      <v-row no-gutters>
        <v-col cols="12">
          <v-form class="site-form">
            <v-row no-gutters>
              <v-col
                cols="12"
                md="1"
              >
              <component
                ref="thumbnailMap"
                :is="thumbnailComponent"
                :center="position"
              />
              </v-col>
              <v-col
                cols="12"
                md="1"
              >
                <v-text-field
                  v-model="labelX"
                  label="x"
                  disabled
                  hide-details
                ></v-text-field>
              </v-col>
              <v-col
                cols="12"
                md="1"
              >
                <v-text-field
                  v-model="labelY"
                  label="y"
                  disabled
                  hide-details
                ></v-text-field>
              </v-col>
              <v-col
                cols="12"
                md="1"
              >
                <v-select
                  v-model="type"
                  :label="$t('Type')"
                  :items="types"
                  item-title="text"
                  item-value="type"
                  disabled
                >
                </v-select>
              </v-col>
              <v-col
                cols="12"
                md="7"
              >
                <v-text-field
                  v-model="title"
                  :label="$t('Title')"
                  hide-details
                  :rules="[v => !!v || $t('Required')]"
                  required
                ></v-text-field>
              </v-col>
              <v-col
                cols="12"
                md="1"
              >
                <v-btn
                  class="form-btn"
                  color="red"
                  :loading="loading"
                  @click="onClickDisconnect"
                >
                {{ $t('Close') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-col>
      </v-row>
      <v-divider></v-divider>
      <v-row no-gutters class="app-content">
        <component
          :tunnel="wsClient"
          :is="appComponent"
          :title="title"
        ></component>
    </v-row>
    </v-container>
  </v-window-item>
  </v-window>
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

.app-content {
  height: calc(100vh - 79px);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
