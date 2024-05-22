<script>
import short from 'short-uuid';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiFile } from '@mdi/js';

import { saveAs } from 'file-saver';
import { mapState, mapActions } from 'vuex';

import ConnectionPasswordDialog from '@/components/ConnectionPasswordDialog.vue';
import ClientService from '@/utils/Service/Access/ClientService.js';
import FileList from '@/components/FileList.vue';
import FileCardContent from  '@/components/FileCard/FileCardContent.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';

export default {
  components: {
    SvgIcon,
    ConnectionPasswordDialog,
    FileList,
    AccountAvatar,
    FileCardContent,
  },
  data() {
    return {
      connectResponseCode: null,
      showDisconnectedDialog: false,
      siteId: this.$route.params.siteId,
      loading: false,
      service: null,
      db: null,
      id: short.generate(),
      password: null,
      pwdRequired: false,
      iconHeight: 100,
      profile: null,
      remoteFiles: [],
      remoteOffset: 0,
      remoteLimit: 10,
      handling: [],
      mdiFile,
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsConnection']),
    connected() {
      return this.channel;
    },
    disconnected() {
      return !this.connected;
    },
    hostName() {
      return this.profile?.name;
    },
    hostAvatar() {
      return this.profile?.avatar;
    },
    title() {
      return this.profile?.title;
    },
    allowUpload() {
      return this.profile?.allowUpload;
    },
    disconnectedDialogConetnt() {
      const mapping = {
        '503': this.$t('Connection Limit Exceeded')
      };

      return mapping[this.connectResponseCode] || this.$t('Disconnected from the Host');
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('CloudTunnel', ['clientConnect', 'disconnect']),
    async init() {
      const { pwdRequired, password } = this;

      if (pwdRequired && password === null) {
        return this.$nextTick(() => this.$refs.passwordDialog.show())
      }

      this.loading = true;
      this.connectResponseCode = null;

      try {
        await this.clientConnect();

        this.service = await this.createService();
        this.getFilesFromRemote();
      } catch (err) {
        console.error('init failed', err);

        const { code } = err;

        this.connectResponseCode = code;

        switch(code) {
          case 401:
            this.pwdRequired = true;
            this.password = null;
            this.$refs.passwordDialog.show();
            break;
          case 503:
          default:
            this.showDisconnectedDialog = true;
        }
      }

      this.loading = false;
      this.disconnect();
    },
    async createService() {
      const { id, wsConnection, siteId, db, password } = this;

      const service = new ClientService({
        id,
        db,
      });

      return new Promise(async (resolve, reject) => {
        service.on('error', (error) => {
          service.close();

          reject(error);
        });
        service.on('profile', (profile) => this.onprofile(profile));
        service.on('close', () => this.onclose());

        await service.connect({
          tunnel: wsConnection,
          siteId,
          password,
        });

        resolve(service);
      })
    },
    async onprofile(profile) {
      this.profile = profile;
    },
    onclose() {
      this.showDisconnectedDialog = true;
      this.service = null;
    },
    async onClickReconnect() {
      this.showDisconnectedDialog = false;

      await this.init();

      this.loading = false;
    },
    onClickCloseWindow() {
      window.close();
    },
    onPassword(password) {
      this.password = password;
      this.init();
    },
    onScroll() {
      const { scrollTop, offsetHeight, scrollHeight } = event.target;
      const bottomOfWindow = scrollTop + offsetHeight;
      const { isLoading } = this;

      if (!isLoading && bottomOfWindow >= scrollHeight - 50) {
        this.getFilesFromRemote();
      }
    },
    onClickDownload({ name, type, src }) {
      saveAs(src, name, { type });
    },
    onClickRefresh() {
      this.remoteOffset = 0;
      this.remoteFiles = [];

      this.service.getProfile();
      this.getFilesFromRemote();
    },
    async getFilesFromRemote() {
      const { remoteOffset, remoteLimit } = this;

      this.isLoading = true;

      const files = await this.service.getFiles({
        offset: remoteOffset,
        limit: remoteLimit,
      }).finally(() => this.isLoading = false);

      this.remoteFiles = [...this.remoteFiles, ...files];
      this.remoteOffset = this.remoteFiles.length;
    },
    async onClickFetch({ id, type, name, size }) {
      this.handling.push(id);

      const fileSrc = await this.service.getFileFromServer({ fileId: id })
        .finally(() => this.handling = this.handling.filter((handlingId) => handlingId !== id));
      const fileData = {
        id,
        name,
        type,
        size,
        src: fileSrc,
      };

      this.$refs.fileList.appendFile(fileData);
    },
    onClickDelete(id) {
      this.$refs.fileList.deleteFile(id);
    },
    async onClickUpload(file) {
      const { id } = file;

      this.handling.push(id);

      try {
        await this.service.sendfile(file);

        const now = Date.now();
        const remoteFile = this.remoteFiles.find((remoteFile) => remoteFile.id === file.id);

        if (remoteFile) {
          Object.keys(file).forEach((attr) => remoteFile[attr] = file[attr]);

          remoteFile.createdTime = now;
          remoteFile.updatedTime = now;
        } else {
          this.remoteFiles.unshift(file);
        }
      } catch (err) {
        console.error('this.service.sendfile failed', err);
      } finally {
        this.handling = this.handling.filter((handlingId) => handlingId !== id);
      }
    },
  },
  async mounted() {
    this.db = await this.idbConnect();
    this.init();
  },
}
</script>

<template>
  <v-app>
    <v-container class="h-100">
      <v-row
        class="w-100 h-50 overflow-auto"
        @scroll="onScroll"
      >
        <v-col cols="12">
          <!-- <v-icon icon="mdi-at"></v-icon> -->
          <v-row no-gutters>
            <v-col cols="12" class="text-left">
              <div v-if="profile" class="line-height-56">
                <v-icon icon="mdi-at" class="mr-1"></v-icon>
                <span>{{ title }}</span><span class="text-caption mr-1"> from {{ hostName }}</span>
                <AccountAvatar class="avatar-size" :avatar="hostAvatar"/>
                <v-btn density="default" icon="mdi-refresh"
                  class="ml-2"
                  size="small"
                  :title="$t('Refresh')"
                  @click="onClickRefresh"
                ></v-btn>
              </div>
            </v-col>
          </v-row>
          <v-divider class="ma-2"></v-divider>
          <v-row no-gutters>
            <v-col cols="6" md="3"  v-for="(file) in remoteFiles" :key="file.id">
              <v-card class="ma-1">
                <v-img v-if="file.type.startsWith('image/')"
                  :src="file.thumbnailSrc"
                  :height="iconHeight"
                ></v-img>
                <svg-icon
                  v-else
                  type="mdi"
                  :path="mdiFile"
                  :height="iconHeight"
                  width="100%"
                ></svg-icon>
                <v-divider></v-divider>

                <v-card-subtitle class="pa-2">
                  <span :title="file.name">{{ file.name }}</span>
                </v-card-subtitle>

                <v-card-text class="text-left">
                  <FileCardContent :file="file"/>
                </v-card-text>

                <v-card-actions>
                  <v-btn
                    color="medium-emphasis"
                    icon="mdi-file-download-outline"
                    :loading="handling.includes(file.id)"
                    :title="$t('Download')"
                    :disable="isLoading"
                    @click="onClickFetch(file)"
                  ></v-btn>
                  <v-spacer></v-spacer>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <v-row class="w-100 h-50 overflow-auto">
        <v-col cols="12">
          <FileList
            ref="fileList"
            :iconHeight="iconHeight"
          >

            <template #card-text="{ file }">
              <div>{{ `${$t('Updated time')}: ${new Date(file.updatedTime).toLocaleString()}` }}</div>
            </template>

            <template #card-actions="{ file }">
              <v-btn
                v-if="allowUpload"
                color="medium-emphasis"
                icon="mdi-file-upload-outline"
                :loading="handling.includes(file.id)"
                :title="$t('Upload')"
                @click="onClickUpload(file)"
              ></v-btn>
              <v-spacer></v-spacer>
              <v-btn
                color="medium-emphasis"
                icon="mdi-tray-arrow-down"
                :title="$t('Save file to device')"
                @click="onClickDownload(file)"
              ></v-btn>
              <v-btn
                color="medium-emphasis"
                icon="mdi-trash-can"
                :title="$t('Delete')"
                @click="onClickDelete(file.id)"
              ></v-btn>
            </template>
          </FileList>
        </v-col>
      </v-row>
    </v-container>

    <v-overlay
      v-model="loading"
      class="d-flex align-center justify-center"
      persistent
    >
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <v-dialog
      v-model="showDisconnectedDialog"
      persistent
      max-width="400px"
    >
      <v-card>
        <v-card-text>
          {{ disconnectedDialogConetnt }}
        </v-card-text>
        <v-card-actions class="d-flex align-stretch">
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="elevated"
            @click="onClickReconnect"
          >
            {{ $t('Reconnect') }}
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="onClickCloseWindow"
          >
            {{ $t('Close Window') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- <AccountDialog
      ref="accountDialog"
      :showCloseButton="false"
      @account="onAccount"
    /> -->
    <ConnectionPasswordDialog
      ref="passwordDialog"
      @password="onPassword"
    />
  </v-app>
</template>

<style scoped>
.overflow-auto {
  overflow-y: auto;
}
.line-height-56 {
  line-height: 56px;
}
.v-avatar.v-avatar--density-default.avatar-size {
  width: 24px;
  height: 24px;
}
</style>
