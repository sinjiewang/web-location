<script>
import { mapState, mapActions } from 'vuex';
import AccountDialog from '@/components/AccountDialog.vue';
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import ClientService from '@/utils/Service/Blog/ClientService.js';
import Blog from '../index.vue';
import short from 'short-uuid';

export default {
  components: {
    Blog,
    AccountDialog,
    InteractionGoogleMap,
  },
  data() {
    return {
      nickname: null,
      avatar: null,
      showDisconnectedDialog: false,
      siteId: this.$route.params.siteId,
      loading: false,
      service: null,
      db: null,
      posts: [],
      comments: [],
      mapCenter: null,
      mapComponent: null,
      title: '',
    };
  },
  computed: {
    ...mapState('CloudTunnel', ['wsClient']),
    connected() {
      return this.channel;
    },
    disconnected() {
      return !this.connected;
    },
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    ...mapActions('CloudTunnel', ['clientConnect', 'disconnect']),
    async init() {
      this.loading = true;

      try {
        await this.clientConnect();

        this.service = await this.createService();
        this.posts = await this.getPosts();
      } catch (err) {
        console.error('init failed', err);

        this.showDisconnectedDialog = true;
      }

      this.loading = false;
      this.disconnect();
    },
    async createService() {
      const { nickname, avatar, wsClient, siteId, db } = this;

      const service = new ClientService({
        id: siteId,
        name: nickname,
        avatar,
        db,
      });

      service.on('profile', (profile) => this.onprofile(profile));
      // service.on('register', (data) => this.onregister(data));
      // service.on('deregister', (data) => this.onderegister(data));
      // service.on('message', (data) => this.onmessage(data));
      service.on('post', (post) => this.onpost(post));
      service.on('comment', (comment) => this.oncomment(comment));
      service.on('close', () => this.onclose());

      await service.connect({
        tunnel: wsClient,
        siteId,
      });

      return service;
    },
    getPosts() {
      return this.service.getPosts();
    },
    getComments(postId) {
      return this.service.getComments(postId);
    },
    async onprofile(profile) {
    //   this.appendMessage({
    //     message: `${this.$t('has joined')} (${title})`,
    //     time: Date.now(),
    //   });
      const { lat, lng } = profile.position;

      this.title = profile.title;
      this.mapCenter = { lat, lng };
      this.mapComponent = 'InteractionGoogleMap';
      this.$nextTick(() => {
        const { googleMap } = this.$refs;

        googleMap.setMapUndraggable();
        googleMap.removePositionMarker();
        // googleMap.setMapCenter({ lat, lng });
        const positionMarker = googleMap.addPositionMarker({ lat, lng });
        googleMap.setMarkerUndraggable(positionMarker);
      });
    },
    onpost(post) {
      const { method, item } = post;

      switch(method) {
        case 'add':
          this.posts.unshift(item);
          break;
        case 'update':
          this.posts = this.posts.map(post => (post.id !== item.id) ? post : {
              ...post,
              ...item,
            });
          break;
        case 'delete':
          this.posts = this.posts.filter(post => post.id !== item.id);
          break;
      }
    },
    oncomment(data) {
      const { method, item } = data;

      switch(method) {
        case 'add':
          this.comments.push(item);
          break;
        case 'delete':
          this.comments = this.comments.filter(comment => comment.id !== item.id);
          break;
      }
    },
    onclose() {
      this.showDisconnectedDialog = true;
    },
    async onGetComments(postId) {
      const { items } = await this.getComments(postId);

      this.comments = items;
    },
    onCreateComment({ content, name, avatar }, post) {
      this.service.appendComment({ postId: post.id, content, name, avatar }, post);
    },
    appendMessage(data) {
      this.appendMessageToWindow(data);
    },
    appendMessageToWindow(data) {
      this.$refs.messageWindow.appendMessage(data);
    },
    async onClickReconnect() {
      this.showDisconnectedDialog = false;

      await this.init();

      this.loading = false;
    },
    onClickCloseWindow() {
      window.close();
    },
    onAccount({ name, avatar }) {
      this.nickname = name;
      this.avatar = avatar;
      this.init();
    },
  },
  async mounted() {
    this.db = await this.idbConnect();

    const { nickname, avatar } = await this.getAccount();

    this.nickname = nickname;
    this.avatar = avatar;

    if (nickname) {
      this.init();
    } else {
      this.$refs.accountDialog.open();
    }
  },
}
</script>

<template>
  <v-app>
    <v-container>
      <v-container class="pb-0">
        <v-row>
          <v-col cols="12" md="8">
            <component
              ref="googleMap"
              class="interaction-google-map"
              :is="mapComponent"
              :center="mapCenter"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="title"
              :label="$t('Title')"
              hide-details
              required
              disabled
            ></v-text-field>
          </v-col>
        </v-row>
      </v-container>
      <Blog
        ref="blog"
        :name="nickname"
        :avatar="avatar"
        :posts="posts"
        :comments="comments"
        :enableEdit="false"
        @getComments="onGetComments"
        @createComment="onCreateComment"
      />
    </v-container>

    <v-overlay
      v-model="loading"
      class="d-flex align-center justify-center"
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
          {{ $t('Disconnected from the Host') }}
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

    <AccountDialog
      ref="accountDialog"
      :showCloseButton="false"
      @account="onAccount"
    />
  </v-app>
</template>

<style scoped>
.fill-height-100 {
  height: 100%;
}

:deep(.v-avatar.v-avatar--density-default) {
  width: 40px;
  height: 40px;
}

.flex-grow-0 {
  flex-grow: 0;
}

/* .message-row {
  margin: auto;
} */

.interaction-google-map {
  max-height: 56px;
}

</style>
