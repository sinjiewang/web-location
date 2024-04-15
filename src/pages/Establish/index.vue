<script>
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import { mapState, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiMapMarkerRightOutline, mdiQrcode, mdiContentCopy, mdiCheckBold } from '@mdi/js';
import coordinate from '@/utils/coordinate.js'

import StoreHistory from '@/utils/IndexedDB/StoreHistory';
import SITE from '@/constants/site.js';
import Chat from '@/pages/Chat/site/index.vue';
import Blog from '@/pages/Blog/site/index.vue';

import short from 'short-uuid';
import QRCode from 'qrcode';

const APP_MAPPING = {
  chat: 'Chat',
  blog: 'Blog',
};

export default {
  components: {
    SvgIcon,
    InteractionGoogleMap,
    Blog,
    Chat,
  },
  data() {
    return {
      mapComponent: null,
      thumbnailComponent: null,
      positionMarker: null,
      position: null,
      id: this.$route.params.id,
      title: null,
      type: 'chat',
      pwdRequired: false,
      password: null,
      disableTypeSelect: false,
      qrcodeUrl: null,
      showQRcodeDialog: false,
      loading: false,
      formValid: false,
      appComponent: null,
      step: 1,
      showPassword: false,
      // svg-icon
      copyIcon: mdiContentCopy,
      mdiMapMarkerRightOutline,
      mdiQrcode,
      mdiContentCopy,
    };
  },
  computed: {
    ...mapState('Account', ['sub']),
    ...mapState('Account', { accountPostion: 'position' }),
    ...mapState('CloudTunnel', ['wsConnection']),
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
    appProfile() {
      const { id, title, position, type } = this;

      return {
        id,
        title,
        position,
        type,
      };
    },
    appUrl() {
      const { type, id } = this;

      if (!type || !id) return '';

      const name = this.getTypeName(type);
      const path = this.$router.resolve({
        name: name,
        params: { siteId: id },
      }).href;

      return `${location.origin}${path}`;
    },
    establishLabel() {
      return this.id ? this.$t('Establish') : this.$t('Create');
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('Geopositioning', ['getUserPosition']),
    ...mapActions('CloudTunnel', ['siteConnect', 'disconnect']),
    onPositionChanged({ lat, lng }) {
      this.position = coordinate.transform({ lat, lng });
    },
    async onClickEstablish() {
      const { id, type, title, position, pwdRequired, password } = this;
      const { lat, lng } = position;
      const siteId = id || short.generate();

      this.$refs.form.validate();

      if (!this.formValid) return;

      this.setUndraggable();
      this.loading = true;

      const params = { siteId, lat, lng, type, title };

      if (pwdRequired) {
        params.password = password;
      }

      await this.siteConnect(params);

      this.id = siteId;
      this.$router.push({ params: { id: siteId }});
      this.nextStep();
      this.appComponent = APP_MAPPING[type];
      this.loading = false;
      this.disableTypeSelect = true;
      this.setQRCode();
    },
    onClickPWDRequired() {
      this.$refs.password.focus();
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
    onClickQRCode() {
      this.showQRcodeDialog = true;
    },
    onClickCopy() {
      navigator.clipboard.writeText(this.appUrl)
        .then(() => {
          this.copyIcon = mdiCheckBold;

          setTimeout(() => {
            this.copyIcon = mdiContentCopy;
          }, 1.5 * 1000);
        });
    },
    getTypeName(type) {
      return this.$router.getRoutes().find(route => route.meta?.type === type).name;
    },
    async setQRCode() {
      const dataUrl = await new Promise((resolve, reject) => {
        QRCode.toDataURL(this.appUrl, (err, url) => {
          if (err) {
            reject(err);
          } else {
            resolve(url);
          }
        });
      });

      this.qrcodeUrl = dataUrl;
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
    await this.getAccount();

    let history = null;

    if (this.id) {
      const db = await this.idbConnect();
      const storeHistory = new StoreHistory({ db });

      history = await storeHistory.queryById(this.id);
    }

    if (history) {
      this.type = history.type;
      this.title = history.title;
      this.position = history.position;
      this.disableTypeSelect = true;
    } else if (this.accountPostion) {
      this.position = this.accountPostion;
    } else {
      const { lat, lng } = await this.getUserPosition();

      this.position = coordinate.transform({ lat, lng });
    }

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
      <v-col cols="12" md="4">
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
      <v-col cols="12" md="8">
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
            <v-row>
              <v-col
                cols="5"
                md="4"
              >
                <v-select
                  v-model="type"
                  :label="$t('Type')"
                  :items="types"
                  :rules="[v => !!v || $t('Required')]"
                  :disabled="disableTypeSelect"
                  hide-details
                  item-title="text"
                  item-value="type"
                  required
                >
                </v-select>
              </v-col>
              <v-col cols="2" class="hidden-md-and-down"></v-col>
              <v-col cols="1">
                <v-tooltip bottom>
                  <template #activator="{ props }">
                    <v-checkbox
                      class="password-checbox"
                      v-model="pwdRequired"
                      v-bind="props"
                      hide-details
                      @click="onClickPWDRequired"
                    ></v-checkbox>
                  </template>
                  <span>{{ $t('Password Required') }}</span>
                </v-tooltip>
              </v-col>
              <v-col cols="6" md="5">
                <v-text-field
                  ref="password"
                  v-model="password"
                  :label="$t('Password')"
                  :rules="[v => !pwdRequired || !!v || $t('Required')]"
                  :required="pwdRequired"
                  :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  :type="showPassword ? 'text' : 'password'"
                  @click:append="showPassword = !showPassword"
                  hide-details
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col
                cols="12"
              >
                <v-text-field
                  v-model="title"
                  :label="$t('Title')"
                  :rules="[v => !!v || $t('Required')]"
                  hide-details
                  required
                ></v-text-field>
              </v-col>
            </v-row>
            <div class="d-flex flex-column">
              <v-btn
                :disabled="!formValid"
                :loading="loading"
                class="mt-4 form-btn"
                :color="formValid ? 'blue' : null"
                @click="onClickEstablish"
              >
              {{ establishLabel }}
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
            <v-container>
              <v-row no-gutters>
                <v-col
                  cols="3"
                  md="1"
                >
                  <v-btn
                    class="form-btn"
                    @click="onClickQRCode"
                    block
                  >
                    <svg-icon type="mdi" width="36" height="36" :path="mdiQrcode"></svg-icon>
                  </v-btn>
                  <v-dialog
                    v-model="showQRcodeDialog"
                    persistent
                    max-width="400px"
                    @click:outside="showQRcodeDialog = false"
                  >
                    <v-card class="site-form">
                      <v-img :src="qrcodeUrl" />
                      <v-card-text>
                        <v-row no-gutters>
                          <v-col
                            cols="10"
                          >
                          <v-text-field
                            v-model="appUrl"
                            label="URL"
                            hide-details
                            disabled
                          ></v-text-field>
                          </v-col>
                          <v-col
                            cols="2"
                          >
                            <v-btn
                              class="form-btn"
                              @click="onClickCopy"
                              block
                            >
                              <svg-icon type="mdi" :path="copyIcon"></svg-icon>
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </v-dialog>
                </v-col>
                <v-col
                  cols="4"
                  md="2"
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
                  cols="5"
                  md="6"
                >
                  <v-text-field
                    v-model="title"
                    :label="$t('Title')"
                    hide-details
                    disabled
                  ></v-text-field>
                </v-col>
                <v-col
                  cols="6"
                  md="2"
                >
                  <v-checkbox
                    v-model="pwdRequired"
                    :label="$t('Password Required')"
                    hide-details
                    disabled
                  ></v-checkbox>
                </v-col>
                <v-col
                  cols="6"
                  md="1"
                >
                  <v-btn
                    class="form-btn close-btn"
                    color="red"
                    :loading="loading"
                    @click="onClickDisconnect"
                    block
                  >
                  {{ $t('Close') }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-col>
      </v-row>
      <v-divider></v-divider>
      <v-row no-gutters class="app-content">
        <component
          :tunnel="wsConnection"
          :is="appComponent"
          :profile="appProfile"
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
  height: calc(100vh - 110px);
}

.max-h-80 {
  max-height: 80px;
}

.password-checbox {
  @media (max-width: 960px) {
    margin-left: -16px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
