<script>
import { mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';
import BaseSite from '@/components/BaseSite.vue';
import Service from '@/utils/Service/Blog/SiteService.js';
import Blog from '../index.vue';
import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';

export default {
  extends: BaseSite,
  components: {
    Blog,
    InteractionGoogleMap,
  },
  // props: ['tunnel', 'profile'],
  data() {
    return {
      name: null,
      avatar: null,
      signaling: null,
      rtcSite: null,
      dataChannels: {},
      posts: [],
      comments: [],
      mapCenter: null,
      mapComponent: null,
    };
  },
  methods: {
    ...mapActions('Account', ['getAccount']),
    ...mapActions('IndexedDB', { idbConnect: 'connect' }),
    createService({ id, profile, tunnel, db }) {
      const service = new Service({
        id,
        tunnel,
        db,
        profile: toRaw(profile),
      });

      service.on('comment', (comment) => this.oncomment(comment));
      service.on('connect', (event) => this.onconnect(event));
      service.on('disconnect', (event) => this.ondisconnect(event));

      return service;
    },
    oncomment(comment) {
      if ( this.postId === comment.postId) {
        this.comments.push(comment);
      }
    },
    onconnect() {
      this.updateSiteConnectionCount();
    },
    ondisconnect() {
      this.updateSiteConnectionCount();
    },
    async onGetComments(postId) {
      this.getComments(postId);
    },
    async onCreatePost(data) {
      await this.service.createPost(data);
      await this.getPosts();
    },
    async onUpdatePost(data) {
      await this.service.updatePost(data.id, data);
      await this.getPosts();
    },
    async onDeletePost(id) {
      await this.service.deletePost(id);
      await this.getPosts();
    },
    async onCreateComment(data, post) {
      await this.service.createComment({
        ...data,
        postId: post.id,
      });
      await this.getComments(post.id);
    },
    async onDeleteComment(id) {
      await this.service.deleteComment(id)
        .catch((err) => console.error('delete Comment failed:', err, id));

      this.comments = this.comments.filter((comment) => comment.id !== id);
    },
    async getPosts() {
      this.posts = await this.service.getPosts();
    },
    async getComments(postId) {
      this.comments = await this.service.getCommentsByPostId(postId);
      this.postId = postId;
    },
    showPosition({ lat, lng }) {
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
    setCloudTunnel(tunnel) {
      if (tunnel) {
        this.service.updateTunnel(tunnel);

        const reconnect = () => {
          tunnel.off('close', reconnect);

          this.$emit('reconnect');
        }
        tunnel.on('close', reconnect);
      }
    },
  },
  async mounted() {
    const db = await this.idbConnect();
    const { nickname, avatar } = await this.getAccount();

    this.name = nickname;
    this.avatar = avatar;

    const { siteId, profile, tunnel } = this;
    const service = this.createService({
      id: siteId,
      profile,
      db,
    });

    service.register({ name: nickname, avatar });
    await service.init();

    this.service = service;
    this.getPosts();

    const { lat, lng } = profile.position;

    this.showPosition({ lat, lng });
    this.setCloudTunnel(tunnel);
  },
  beforeUnmount() {
    this.service.close();
    this.service = null;
  },
}
</script>

<template>
  <v-container class="pa-0">
    <v-row>
      <v-container class="pb-0">
        <v-col cols="12">
          <component
            ref="googleMap"
            class="interaction-google-map mt-2"
            :is="mapComponent"
            :center="mapCenter"
          />
        </v-col>
      </v-container>
    </v-row>
    <Blog
      ref="blog"
      :name="name"
      :avatar="avatar"
      :posts="posts"
      :comments="comments"
      @getComments="onGetComments"
      @createPost="onCreatePost"
      @updatePost="onUpdatePost"
      @deletePost="onDeletePost"
      @createComment="onCreateComment"
      @deleteComment="onDeleteComment"
    />
  </v-container>
</template>

<style scoped>
.interaction-google-map {
  max-height: 56px;
}
</style>
