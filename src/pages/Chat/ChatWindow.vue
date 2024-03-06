<script>
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiAccountCircle } from '@mdi/js';

export default {
  components: {
    SvgIcon,
  },
  data() {
    return {
      newMessage: null,
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
    };
  },
  methods: {
    appendMessage({ sender, time, message, avatar, align }={}) {
      this.messages.push({ sender, time, message, avatar, align });
    },
    toLocaleTimeString(timestamp) {
      return new Date(timestamp).toLocaleTimeString();
    },
    sendMessage() {
      const message = this.newMessage;

      this.newMessage = null;
      this.$emit('send', message);
    },
    itemAlign(message) {
      return !message.sender
        ? ''
        : message.align === 'right'
        ? 'd-flex justify-end'
        : 'd-flex justify-start'
    },
  },
}
</script>

<template>
  <v-container>
    <v-card class="mb-4 message-block" outlined>
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
    <v-row>
      <v-col cols="9" md="10">
        <v-text-field
          v-model="newMessage"
          :label="$t('Type a message')"
          filled
          @keyup.enter="sendMessage"
        ></v-text-field>
      </v-col>
      <v-col cols="3" md="2">
        <v-btn
          class="form-btn"
          color="primary"
          @click="sendMessage"
          :disabled="!newMessage">{{ $t('Send') }}</v-btn>
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
  height: calc(100% - 102px);
  overflow: auto;
}

</style>
