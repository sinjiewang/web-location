<script>
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle, mdiMinusCircle } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  props: {
    displayInput: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      newMessage: null,
      newImages: [],
      dragover: false,
      messages: [
        // {
        //   message: 'has joined',
        //   time: 1709277935214,
        // },
        // {
        //   sender: 'Alice',
        //   message: 'Hello, how are you?',
        //   time: 1709277935214,
        //   // avatar: 'https://cdn.vuetifyjs.com/images/lists/1.jpg',
        // },
        // {
        //   sender: 'Bob',
        //   message: 'I\'m good, thanks! And you?',
        //   time: 1709278055214,
        //   // avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
        //   align: 'right',
        // },
        // {
        //   sender: 'John',
        //   message: 'Hi, two guys.',
        //   time: 1709278115214,
        //   // avatar: '',
        // },
      ],
      mdiAccountCircle,
      mdiMinusCircle,
    };
  },
  computed: {
    // isScrollAtBottom() {
    //   const { msgWindow } = this.$refs;

    //   console.log(msgWindow.scrollTop, msgWindow.scrollHeight, msgWindow.clientHeight)
    //   return msgWindow.scrollTop >= msgWindow.scrollHeight - msgWindow.clientHeight;
    // },
    disabled() {
      const { newMessage, newImages } = this;

      return !newMessage && newImages.length <= 0;
    }
  },
  methods: {
    appendMessage({ sender, time, message, avatar, align }={}) {
      this.messages.push({ sender, time, message, avatar, align });

      if (this.isScrollAtBottom()) {
        this.$nextTick(() => this.scrollToBottom());
      }
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

        if (file.type.startsWith('image/') && !this.$dropLock) {
          const reader = new FileReader();

          reader.onload = (evt) => this.newImages = [...this.newImages, evt.target.result];
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
        <v-list-item v-for="(msg, index) in messages" :key="index"
          three-line
          :class="itemAlign(msg)"
        >
          <v-row class="message-row">
            <template v-if="msg.align === 'right'">
              <v-col class="text-end">
                <v-list-item-title>
                  {{ msg.sender }}
                  <span class="text-primary">{{ toLocaleTimeString(msg.time) }}</span>
                </v-list-item-title>
                <v-list-item-subtitle>{{ msg.message }}</v-list-item-subtitle>
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
                    <span class="text-primary">{{ toLocaleTimeString(msg.time) }}</span>
                </v-list-item-title>
                <v-list-item-subtitle>{{ msg.message }}</v-list-item-subtitle>
              </v-col>
            </template>
            <!-- system message -->
            <template v-else>
              <v-col>
                <v-list-item-title>
                {{ msg.message }}<span class="ml-2 text-primary">{{ toLocaleTimeString(msg.time) }}</span>
                </v-list-item-title>
              </v-col>
            </template>
          </v-row>
        </v-list-item>
      </v-list>
    </v-card>
    <v-row v-if="displayInput">
      <v-col cols="9" md="10">
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
                    :src="newImage" />
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
</style>
