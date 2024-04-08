<script>
import { mapActions } from 'vuex';
import { /*isProxy,*/ toRaw } from 'vue';
import Service from '@/utils/Service/Blog/SiteService.js';
import Blog from '@/pages/Blog/index.vue';

export default {
  components: {
    Blog,
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
    id() {
      return this.$route.params.id;
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
      service.on('message', (event) => this.onmessage(event));

      return service;
    },
    onmessage({ clientId, time, message, name, avatar }) {

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
    async onCreateComment(data) {
      await this.service.createComment(data);
      await this.getComments(data.postId);
    },
    async onDeleteComment(id) {
      await this.service.deleteComment(id)
        .catch((err) => console.error('delete Comment failed:', err, id));

      this.comments = this.comments.filter((comment) => comment.id !== id);
    },
    onChange(value) {
      this.$emit('change', value);
    },
    async getPosts() {
      this.posts = await this.service.getPosts();
    },
    async getComments(postId) {
      this.comments = await this.service.getCommentsByPostId(postId);
    },
  },
  watch: {
    async id(value) {
      this.service.id = value;
      this.$refs.blog.clear();
      this.getPosts();
    },
  },
  async mounted() {
    const db = await this.idbConnect();
    const { nickname, avatar } = await this.getAccount();

    this.name = nickname;
    this.avatar = avatar;

    const { id } = this;
    const service = this.createService({
      id,
      db,
    });

    // await service.init(tunnel);

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
    @change="onChange"
  />
</template>

<style scoped>

</style>
