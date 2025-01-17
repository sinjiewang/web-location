<script>
import SvgIcon from '@jamescoyle/vue-icon';
import short from 'short-uuid';
import { mdiAccountCircle, mdiMinusCircle, mdiPlusBoxOutline, mdiFileEyeOutline } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  props: {
    displayInput: {
      type: Boolean,
      default: true,
    },
    acceptable: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      newMessage: null,
      newImages: [],
      dragover: false,
      messages: [],
      mdiAccountCircle,
      mdiMinusCircle,
      mdiPlusBoxOutline,
      mdiFileEyeOutline,
    };
  },
  computed: {
    disabled() {
      const { newMessage, newImages } = this;

      return !newMessage && newImages.length <= 0;
    }
  },
  methods: {
    appendMessage({ id=short.generate(), sender, time, message, avatar, align, messageId, accepted }={}) {
      this.messages.push({ id, sender, time, message, avatar, align, messageId, accepted });

      if (this.isScrollAtBottom()) {
        this.$nextTick(() => this.scrollToBottom());
      }
    },
    removeMessage(msg) {
      this.messages = this.messages.filter((message) => msg !== message);
    },
    findMessage(filterFn) {
      return this.messages.find(filterFn);
    },
    toLocaleTimeString(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    sendMessage() {
      const { newMessage, newImages } = this;

      if (newMessage) {
        this.newMessage = null;
        this.$emit('message', newMessage);
      }
      else if (newImages.length) {
        this.newImages = [];
        this.$emit('image', newImages);
      }
    },
    itemAlign(message) {
      return !message.sender
        ? ''
        : message.align === 'right'
        ? 'd-flex justify-end'
        : 'd-flex justify-start'
    },
    clear() {
      this.messages = [];
    },
    isScrollAtBottom() {
      const element = this.$refs.msgWindow.$el;

      return Math.ceil(element.scrollTop) >= element.scrollHeight - element.clientHeight;
    },
    scrollToBottom() {
      const element = this.$refs.msgWindow.$el;

      element.scrollTop = Math.ceil(element.scrollHeight - element.clientHeight);
    },
    onDragover() {
      this.dragover = true;
      this.$refs.messageInput?.focus();
    },
    onDragleave() {
      this.dragover = false;
    },
    onDrop(event) {
      const files = event.dataTransfer.files;

      if (files.length > 0) {
        const file = files[0];
      const { name, type, size } = file;

        if (type.startsWith('image/') && !this.$dropLock) {
          const reader = new FileReader();

          reader.onload = (evt) => this.newImages = [...this.newImages, {
            name,
            type,
            size,
            src: evt.target.result,
          }];
          reader.readAsDataURL(file);

          this.$dropLock = true;

          setTimeout(() => delete this.$dropLock, 500);
        }
      }

      this.dragover = false;
    },
    onClickRemoveImage(index) {
      this.newImages = this.newImages.filter((_, i) => i != index);
    },
    onClickImage(id) {
      this.$emit('showImage', id);
    },
    onClickAccept(message) {
      message.loading = true;

      this.$emit('acceptMessage', message);
    },
    onClickInputFile() {
      this.$refs.inputFile.click();
    },
    getFileAsDataUrl(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(file);
      })
    },
    async onFileSelected(event) {
      const file = event.target.files[0];
      const { name, type, size } = file;

      if (type.startsWith('image/')) {
        const dataUrl = await this.getFileAsDataUrl(file);

        this.newImages.push({
          name,
          type,
          size,
          src: dataUrl,
        });
      }
    },
    async onPaste(event) {
      const { types } = event.clipboardData;

      if (event.clipboardData.files.length > 0) {
        const file = event.clipboardData.files[0];
        const { name, type, size } = file;

        if (type.startsWith('image/')) {
          const dataUrl = await this.getFileAsDataUrl(file);

          this.newImages.push({
            name,
            type,
            size,
            src: dataUrl,
          });
        }
      } else if (types.includes('text/plain')) {
        const text = event.clipboardData.getData('text/plain');

        this.newMessage = text;
      }
    },
  },
}
</script>

<template>
  <v-container>
    <v-card
      class="mb-4 message-block"
      :class="{
        'display-input': displayInput
      }"
      outlined
      ref="msgWindow"
    >
      <v-list>
        <v-list-item v-for="(msg) in messages" :key="msg.id"
          three-line
          :class="itemAlign(msg)"
        >
          <v-row class="message-row">
            <template v-if="msg.align === 'right'">
              <v-col class="text-end">
                <v-list-item-title>
                  {{ msg.sender }}
                  <span class="text-primary" :title="toLocaleTimeString(msg.time)">{{ toLocaleTimeString(msg.time) }}</span>
                </v-list-item-title>
                <v-list-item-subtitle v-if="Array.isArray(msg.message)">
                  <v-container
                    class="d-flex justify-end pa-0"
                  >
                    <v-card v-for="(imageInfo) in msg.message"
                      class="ml-2"
                    >
                      <v-card-text
                        class="pa-0"
                      >
                        <img
                          class="image-message"
                          :src="imageInfo.src"
                          @click="onClickImage(imageInfo)"
                        />
                      </v-card-text>
                    </v-card>
                    <v-tooltip bottom>
                      <template #activator="{ props }">
                        <svg-icon
                          v-if="msg.accepted===false"
                          v-bind="props"
                          class="mt-8 ml-2 text-red-lighten-2"
                          type="mdi" :path="mdiFileEyeOutline"
                        >
                        </svg-icon>
                      </template>
                      <span>{{ $t('Wait for HOST acceptance') }}</span>
                    </v-tooltip>
                  </v-container>
                </v-list-item-subtitle>
                <v-list-item-subtitle v-else-if="typeof msg.message === 'string'">
                  {{ msg.message }}
                </v-list-item-subtitle>
              </v-col>
              <v-col class="flex-grow-0">
                <v-avatar>
                  <v-img
                    v-if="msg.avatar"
                    :src="msg.avatar"
                  ></v-img>
                  <svg-icon
                    v-else
                    type="mdi"
                    width="40"
                    height="40"
                    :path="mdiAccountCircle"
                  ></svg-icon>
                </v-avatar>
              </v-col>
            </template>
            <template v-else-if="msg.sender" >
              <v-col class="flex-grow-0">
                <v-avatar>
                  <v-img
                    v-if="msg.avatar"
                    :src="msg.avatar"
                  ></v-img>
                  <svg-icon
                    v-else
                    type="mdi"
                    width="40"
                    height="40"
                    :path="mdiAccountCircle"
                  ></svg-icon>
                </v-avatar>
              </v-col>

              <v-col class="text-start">
                <v-list-item-title>
                    {{ msg.sender }}
                    <span class="text-primary" :title="toLocaleTimeString(msg.time)">{{ toLocaleTimeString(msg.time) }}</span>
                </v-list-item-title>
                <v-list-item-subtitle v-if="Array.isArray(msg.message)">
                  <v-container
                    class="d-flex justify-start pa-0"
                  >
                    <v-card v-for="(imageInfo) in msg.message"
                      class="image-message-card max-h-56 mr-2"
                    >
                      <v-card-text
                        class="pa-0"
                      >
                        <img
                          class="image-message"
                          :src="imageInfo.src"
                          @click="onClickImage(imageInfo)"
                        />
                      </v-card-text>
                    </v-card>
                    <v-btn
                      v-if="msg.accepted===false"
                      color="success"
                      :loading="msg.loading"
                      @click="onClickAccept(msg)"
                    >{{ $t('Accept') }}</v-btn>
                  </v-container>
                </v-list-item-subtitle>
                <v-list-item-subtitle v-else-if="typeof msg.message === 'string'">
                  {{ msg.message }}
                </v-list-item-subtitle>
              </v-col>
            </template>
            <!-- system message -->
            <template v-else>
              <v-col>
                <v-list-item-title>
                {{ msg.message }}<span class="ml-2 text-primary" :title="toLocaleTimeString(msg.time)">{{ toLocaleTimeString(msg.time) }}</span>
                </v-list-item-title>
              </v-col>
            </template>
          </v-row>
        </v-list-item>
      </v-list>
    </v-card>
    <v-row v-if="displayInput">
      <input
        ref="inputFile"
        type="file"
        class="d-none"
        accept="image/*"
        @change="onFileSelected"
      />
      <v-col cols="1">
        <v-btn
          class="form-btn"
          @click="onClickInputFile"
          block
        >
          <svg-icon type="mdi" width="36" height="36" :path="mdiPlusBoxOutline"></svg-icon>
        </v-btn>
      </v-col>
      <v-col cols="8" md="9">
        <v-field
          v-if="newImages.length"
          :color="dragover ? 'primary' : ''"
          @drop.prevent="onDrop"
          @dragover.prevent="onDragover"
          @dragleave.prevent="onDragleave"
        >
          <template #default>
            <v-container
              class="d-flex justify-start pt-0 pb-0"
            >
              <v-card v-for="(newImage, index) in newImages"
                class="image-message-card max-h-56 mr-2"
              >
                <v-card-text
                  class="pa-0"
                >
                  <img
                    class="image-message"
                    :src="newImage.src" />
                  <svg-icon
                    type="mdi"
                    :path="mdiMinusCircle"
                    class="image-remove"
                    @click="onClickRemoveImage(index)"
                  ></svg-icon>
                </v-card-text>
              </v-card>
            </v-container>
          </template>
        </v-field>
        <v-text-field
          v-else
          ref="messageInput"
          v-model="newMessage"
          :label="$t('Type a message')"
          :color="dragover ? 'primary' : ''"
          filled
          @keyup.enter="sendMessage"
          @drop.prevent="onDrop"
          @dragover.prevent="onDragover"
          @dragleave.prevent="onDragleave"
          @paste.prevent="onPaste"
        ></v-text-field>
      </v-col>
      <v-col cols="3" md="2">
        <v-btn
          class="form-btn"
          color="primary"
          @click="sendMessage"
          :disabled="disabled">{{ $t('Send') }}</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.v-btn.form-btn {
  height: 56px;
  width: 100%;
}

:deep(.v-avatar.v-avatar--density-default) {
  width: 40px;
  height: 40px;
}

.flex-grow-0 {
  flex-grow: 0;
}

.message-block {
  height: calc(100%);
  overflow: auto;

  &.display-input {
    height: calc(100% - 102px);
  }
}

.v-list-item-subtitle {
  user-select: text;
}

.h-56 {
  height: 56px;
}

.pos-relative {
  position: relative;
}

.image-message-card:hover .image-remove {
  display: inherit;
}

.image-remove {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  color: #F44336;
}

.image-message {
  height: 56px;
  width: auto;
  position: relative;
}

.max-h-56 {
  max-height: 56px;
}

.pt-40 {
  padding-top: 40px;
}

.hide {
  display: none;
}

</style>
