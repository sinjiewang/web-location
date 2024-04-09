<script>
import { mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';
import Service from '@/utils/Service/Blog/SiteService.js';
import Blog from '../index.vue';

export default {
  components: {
    Blog,
  },
  props: {
    tunnel: {
      type: Object,
      default: () => null,
    },
    profile: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      name: null,
      avatar: null,
      signaling: null,
      rtcSite: null,
      dataChannels: {},
      posts: [],
      comments: [],
    };
  },
  computed: {
    siteId() {
      return this.profile.id;
    },
    title() {
      return this.profile.title;
    },
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

      // service.on('register', (event) => this.onregister(event))
      // service.on('deregister', (event) => this.onderegister(event))
      // service.on('message', (event) => this.onmessage(event));
      service.on('comment', (comment) => this.oncomment(comment));

      return service;
    },
    oncomment(comment) {
      if ( this.postId === comment.postId) {
        this.comments.push(comment);
      }
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
    await service.init(tunnel);

    this.service = service;
    this.getPosts();
  },
  beforeUnmount() {
    this.service.close();
    this.service = null;
  },
}
</script>

<template>
  <Blog
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
</template>

<style scoped>

</style>
