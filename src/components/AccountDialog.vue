<script>
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  props: {
    name: {
      type: String,
      default: () => null,
    },
    avatar: {
      type: String,
      default: () => null,
    },
    showCloseButton: {
      type: Boolean,
      default: () => true,
    },
  },
  emits: ['account'],
  data() {
    return {
      mdiAccountCircle,
      showAccountDialog: false,
      showAvatarDialog: false,
      newName: null,
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
    open() {
      this.newName = this.name;
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

        this.maskRadius = Math.max(Math.min(radius, maxRadius), 100);
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
      };

      img.src = this.imageDataUrl || this.newAvatar|| this.avatar;
    },
    async onClickSave() {
      const { newName, newAvatar} = this;

      this.$emit('account', {
        name: newName,
        avatar: newAvatar,
      });
      this.showAccountDialog = false;
    },
    onAccountDialogClose() {
      this.newAvatar = null;
      this.newName = null;
    },
    onAvatarDialogClose() {
      this.imageDataUrl = null;
    },
  },
}
</script>

<template>
  <v-dialog
    v-model="showAccountDialog"
    persistent
    max-width="400px"
    @close="onAccountDialogClose"
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
              v-model="newName"
              :label="$t('Please enter your nickname')"
              filled
            ></v-text-field>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="d-flex align-stretch">
        <v-spacer></v-spacer>
        <v-btn
          v-if="showCloseButton"
          variant="elevated"
          @click="showAccountDialog = false"
        >
          {{ $t('Close') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!newName"
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
    @close="onAvatarDialogClose"
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
</template>

<style scoped>

</style>
