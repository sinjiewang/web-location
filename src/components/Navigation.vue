<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle, mdiContentSavePlusOutline } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  data() {
    return {
      mdiAccountCircle,
      showAccountDialog: false,
      showAvatarDialog: false,
      newNickname: null,
      newAvatar: null,
      imageDataUrl: null,
      maskTop: 0,
      maskLeft: 0,
      maskRadius: 0,
      imageWidth: 0,
      imageHeight: 0,
    };
  },
  computed: {
    ...mapState('Account', ['email', 'nickname', 'avatar']),
    ...mapGetters('Account', {
      displayNickname: 'getNickname'
    }),
    navigation() {
      return [
        {
          text: this.$t('Browse'),
          icon: 'mdi-map-search',
          route: '/browse',
        },
        {
          text: this.$t('History'),
          icon: 'mdi-history',
          route: '/history',
        },
        {
          text: this.$t('Information'),
          icon: 'mdi-information-variant-circle-outline',
          route: '',
        }
      ];
    },
    message() {
      return `${this.$t('Hello')}, ${this.displayNickname}`;
    },
    maskHeight() {
      return this.maskRadius * 2;
    },
    maskWidth() {
      return this.maskRadius * 2;
    },
    maskTrianglePoints() {
      const length = 55;
      const { maskTop, maskLeft, maskWidth, maskHeight } = this;
      const vertexX = maskWidth + maskLeft;
      const vertexY = maskHeight + maskTop;

      return `${vertexX},${vertexY} ${vertexX},${vertexY - length} ${vertexX - length},${vertexY}`
    },
    maskCX() {
      return this.maskLeft + this.maskRadius;
    },
    maskCY() {
      return this.maskTop + this.maskRadius;
    },
  },
  methods: {
    ...mapActions('Account', ['updateAccount']),
    closeAccountDialog() {
      this.showAccountDialog = false;
      this.newAvatar = null;
      this.newNickname = null;
    },
    onClickAccount() {
      this.newNickname = this.nickname;
      this.showAccountDialog = true;
    },
    onClickAvatar() {
      this.imageDataUrl = this.newAvatar || this.avatar;
      this.showAvatarDialog = true;
    },
    onClickSelectImage() {
      this.$refs.fileInput.click();
    },
    onFileSelected(event) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => this.imageDataUrl = event.target.result;
      reader.readAsDataURL(file);
    },
    onImgLoad() {
      setTimeout(() => {
        if (!this.showAvatarDialog) return;

        const { offsetWidth, offsetHeight } = this.$refs.avatarImg.$el.querySelector('img');
        const radius = Math.min(offsetWidth, offsetHeight) / 2;

        this.maskRadius = radius;
        this.maskTop = (offsetHeight / 2) - radius;
        this.maskLeft = (offsetWidth / 2) - radius;
        this.imageWidth = offsetWidth;
        this.imageHeight = offsetHeight;
      }, 150);
    },
    onResizeStart(event) {
      const { offsetX } = event;

      this.resizing = true;
      this.mousePosition = { offsetX };
      this.$mouseup = () => this.onMouseUp();

      document.addEventListener('mouseup', this.$mouseup);
    },
    onResizing (event) {
      const { offsetX } = event;
      const { maskRadius, imageWidth, imageHeight, maskTop } = this;

      if (this.resizing) {
        const radius = maskRadius + (offsetX - this.mousePosition.offsetX)/2;
        const maxRadius = imageWidth / 2;
        const checkBiggerThanWidth = radius * 2 + maskTop > imageWidth;
        const checkBiggerThanHeight = radius * 2 + maskTop > imageHeight;

        if (checkBiggerThanWidth || checkBiggerThanHeight) return;

        this.maskRadius = Math.max(Math.min(radius, maxRadius), 80);
        this.mousePosition = { offsetX };
      }
    },
    onMoveStart(event) {
      const { clientX, clientY } = event;

      this.moving = true;
      this.maskPostion = {
        top: this.maskTop,
        left: this.maskLeft,
      }
      this.mousePosition = { clientX, clientY };
      this.$mouseup = () => this.onMouseUp();

      document.addEventListener('mouseup', this.$mouseup);
    },
    onMoving(event) {
      if (this.moving) {
        const { clientX, clientY } = event;
        const { top, left } = this.maskPostion;
        const deltaX = clientX - this.mousePosition.clientX;
        const deltaY = clientY - this.mousePosition.clientY;
        const { maskWidth, maskHeight, imageWidth, imageHeight } = this;
        const maskTop = top + deltaY;
        const maskLeft = left + deltaX;

        this.maskTop = Math.max(Math.min(maskTop, imageHeight - maskHeight), 0)
        this.maskLeft = Math.max(Math.min(maskLeft, imageWidth - maskWidth), 0)
      }
    },
    onMouseUp() {
      this.mousePosition = null;
      this.resizing = false;
      this.moving = false;

      document.removeEventListener('mouseup', this.$mouseup);
    },
    onClickUpdate() {
      const { imageWidth, imageHeight, maskTop, maskLeft, maskWidth, maskHeight } = this;
      const img = new Image();

      img.onload = () => {
        const length = 128;
        const { width, height } = img;
        const scaleX = width / imageWidth;
        const scaleY = height / imageHeight;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = length;
        canvas.height = length;

        ctx.drawImage(img, maskLeft*scaleX, maskTop*scaleY, maskWidth*scaleX, maskHeight*scaleY, 0, 0, length, length);

        this.newAvatar = canvas.toDataURL('image/webp', 1);
        this.showAvatarDialog = false;
        this.imageDataUrl = null;
      };

      img.src = this.imageDataUrl || this.newAvatar|| this.avatar;
    },
    async onClickSave() {
      const { newNickname, newAvatar} = this;

      await this.updateAccount({
        nickname: newNickname,
        avatar: newAvatar,
      });

      this.imageDataUrl = null;
      this.closeAccountDialog();
    },
  },
}
</script>

<template>
  <v-navigation-drawer
    expand-on-hover
    rail
  >
    <v-list>
      <v-list-item
        class="text-start"
        :title="message"
        :subtitle="email"
        @click="onClickAccount"
      >
        <template #prepend>
          <v-avatar color="surface-variant">
            <v-img
              v-if="avatar"
              :src="avatar"
              class="account-avatar"
            ></v-img>
            <svg-icon
              v-else
              type="mdi"
              :path="mdiAccountCircle"
            ></svg-icon>
          </v-avatar>
        </template>
      </v-list-item>
      <v-dialog
        v-model="showAccountDialog"
        persistent
        max-width="400px"
      >
        <v-card>
          <v-card-text>
            <v-row>
              <v-col
                cols="4"
                @click="onClickAvatar"
              >
                <v-img
                  v-if="newAvatar"
                  :src="newAvatar"
                  class="full avatar-img"
                ></v-img>
                <v-img
                  v-else-if="avatar"
                  :src="avatar"
                  class="full avatar-img"
                ></v-img>
                <svg-icon
                  v-else
                  class="full"
                  type="mdi"
                  :path="mdiAccountCircle">
                </svg-icon>
              </v-col>
              <v-col
                cols="8"
              >
                <v-text-field
                  v-model="newNickname"
                  :label="$t('Please enter your nickname')"
                  filled
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions class="d-flex align-stretch">
            <v-spacer></v-spacer>
            <v-btn
              variant="elevated"
              @click="closeAccountDialog"
            >
              {{ $t('Close') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!newNickname"
              @click="onClickSave"
            >
              {{ $t('Save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="showAvatarDialog"
        persistent
        max-width="500px"
      >
        <v-card>
          <v-card-text
            class="mb-1"
            @mousemove="onResizing"
          >
            <v-row>
              <v-col cols="12">
                <svg-icon
                  v-if="!imageDataUrl"
                  class="full"
                  type="mdi" :path="mdiAccountCircle"
                ></svg-icon>
                <div
                  :class="{
                    'd-none': !imageDataUrl
                  }"
                  class="avatar-edit"
                  ref="avatarEdit"
                >
                  <v-img
                    class="full"
                    ref="avatarImg"
                    :src="imageDataUrl"
                    @load="onImgLoad"
                  ></v-img>
                  <svg style="position: absolute;"
                    :style="{
                      top: 0,
                      left: 0,
                      width: imageWidth,
                      height: imageHeight,
                    }"
                  >
                    <rect
                      :x="maskLeft"
                      :y="maskTop"
                      :width="maskWidth"
                      :height="maskHeight"
                      fill="rgba(0,0,0,0)"
                      stroke="rgba(0,0,0,0.7)"
                    />
                    <mask id="circleMask">
                      <rect
                        :width="imageWidth"
                        :height="imageHeight"
                        fill="white"
                      />
                      <circle
                        :cx="maskCX"
                        :cy="maskCY"
                        :r="maskRadius"
                        fill="black"
                      />
                    </mask>
                    <rect
                      x="0"
                      y="0"
                      :width="imageWidth"
                      :height="imageHeight"
                      fill="rgba(0,0,0,0.5)"
                      mask="url(#circleMask)"
                        @mousedown.self="onMoveStart"
                        @mousemove.self="onMoving"
                    />
                    <polygon class="resize"
                      :points="maskTrianglePoints"
                      fill="rgba(255,255,255,0.5)"
                      @mousedown.self="onResizeStart"
                    />
                  </svg>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions class="ml-4 mr-4 mb-2 d-flex align-stretch">
            <input
              type="file"
              ref="fileInput"
              @change="onFileSelected"
              style="display: none"
            />
            <v-btn
              color="primary"
              variant="elevated"
              @click="onClickSelectImage"
            >
              {{ $t('Select Image') }}
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              variant="elevated"
              @click="showAvatarDialog = false"
            >
              {{ $t('Close') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              @click="onClickUpdate"
            >
              {{ $t('Update') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-list>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item v-for="item in navigation"
        class="text-start route-link"
        :prependIcon="item.icon"
        :title="item.text"
        :value="item.text"
        :to="item.route"
        >
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<style>
.route-link:hover {
  color: var(--color-text-hover);
}

.full {
  width: 100%;
  height: 100%;
}

.v-avatar .v-img.account-avatar {
  width: 24px;
  height: 24px;
}

.avatar-edit {
  position: relative;
  user-select: none;
  overflow: hidden;

  svg {
    position: absolute;
  }
}

.resize {
  cursor: nwse-resize;
}

.avatar-img {
  clip-path: circle(50%);
}
</style>
