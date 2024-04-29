<script>
import DOMPurify from 'dompurify';
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css';

import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue';
import LeaveConfirmDialog from '@/components/LeaveConfirmDialog.vue';
// import InteractionGoogleMap from '@/components/InteractionGoogleMap.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiCommentPlusOutline, mdiAccountCircle } from '@mdi/js';
import { /*isProxy,*/ toRaw, mergeProps } from 'vue';

export default {
  components: {
    SvgIcon,
    // InteractionGoogleMap,
    DeleteConfirmDialog,
    LeaveConfirmDialog,
    AccountAvatar,
    QuillEditor,
  },
  props: {
    enableEdit: {
      type: Boolean,
      default: () => true,
    },
    enableComment: {
      type: Boolean,
      default: () => true,
    },
    name: {
      type: String,
      default: () => null,
    },
    avatar: {
      type: String,
      default: () => null,
    },
    posts: {
      type: Array,
      default: () => [],
    },
    comments: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      mdiCommentPlusOutline,
      mdiAccountCircle,
      selected: null,
      postTitle: null,
      postContent: null,
      postName: null,
      postAvatar: null,
      commentContent: null,
      changed: false,
      confirmHandler: null,
      // mapComponent: null,
      // mapCenter: null,
      quillOptions: {
        theme: 'bubble',
        bounds: '#content-block'
      },
    };
  },
  computed: {
    saveLable() {
      return this.selected?.id ? this.$t('Save') : this.$t('Create');
    },
    selectedId() {
      return this.selected?.id || '';
    },
    menuButtonLabel() {
      const title = this.selected?.title || '--';
      const updatedTime = this.selected?.updatedTime
        ? `(${this.toLocaleString(this.selected?.updatedTime)})`
        : '';

      return this.selected
        ? `${title} ${updatedTime}`
        : this.$t('Please select...');
    },
  },
  methods: {
    mergeProps,
    toLocaleString(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    onClickCreate() {
      this.selected = {
        title: null,
        content: null,
      };
      this.postTitle = null;
      this.postContent = null;
      this.postName = this.name;
      this.postAvatar = this.avatar;
    },
    async onSelect(item) {
      const { id, title, content, avatar, name } = item;
      const confirmHandler = () => {
        this.postTitle = title;
        this.postContent = content;
        this.postName = name;
        this.postAvatar = avatar;
        this.selected = item;
        this.$emit('getComments', id);
        this.$nextTick(() => {
          this.changed = false;
        });
      }

      if (this.enableEdit && this.changed) {
        this.$refs.leaveConfirmDialog.show();
        this.confirmHandler = confirmHandler;
      } else {
        confirmHandler();
      }
    },
    onClickClose() {
      if (this.changed) {
        return new Promise((resolve) => {
          this.$refs.leaveConfirmDialog.show();
          this.confirmHandler = () => {
            this.clear();

            resolve();
          };
        });
      } else {
        this.clear();

        return Promise.resolve();
      }
    },
    async onClickSave() {
      const { postTitle, postContent, selected } = this;

      selected.title = DOMPurify.sanitize(postTitle, { USE_PROFILES: { html: true } });
      selected.content = DOMPurify.sanitize(postContent, { USE_PROFILES: { html: true } });

      if (selected.id) {
        this.$emit('updatePost', selected);
      } else {
        this.$emit('createPost', selected);
      }

      this.clear();
    },
    onClicPostkDelete(item) {
      this.selected = item,
      this.$refs.deleteConfirmDialog.show();
    },
    async onClicConfirmDelete() {
      const { id } = this.selected;

      this.clear();
      this.$emit('deletePost', id);
    },
    async onCommentEnter() {
      const { name, avatar, selected, commentContent } = this;
      const { id } = selected;
      const content = DOMPurify.sanitize(commentContent, { USE_PROFILES: { html: true } });

      if (!id || !content) return;

      this.$emit('createComment', {
        postId: id,
        content,
        name,
        avatar,
      }, toRaw(selected));
      this.commentContent = null;
    },
    onDeleteComment({ id }) {
      this.$emit('deleteComment', id);
    },
    clear() {
      this.selected = null;
      this.postTitle = null;
      this.postContent = null;
      this.$nextTick(() => {
        this.changed = false;
      });
    },
    onClicConfirmLeave() {
      if (typeof this.confirmHandler === 'function') {
        this.confirmHandler();
        this.confirmHandler = null;
      }
    },
  },
  watch: {
    postTitle() {
      this.changed = true;
    },
    postContent() {
      this.changed = true;
    },
    changed(value) {
      this.$emit('change', value);
    },
    posts(values) {
      const id = this.selected?.id;
      const selectedPost = values.find((post) => post.id === id);

      if (id && !selectedPost) {
        this.clear();
      } else if (selectedPost) {
        this.postTitle = selectedPost.title;
        this.postContent = selectedPost.content;
      }
    },
  },
}
</script>

<template>
  <v-container class="h-100">
    <v-row no-gutters class="h-100">
      <div class="text-center hidden-md-and-up w-100 mb-2">
        <v-btn
          v-if="enableEdit"
          class="form-button create mb-2"
          @click="onClickCreate"
        >
          <svg-icon type="mdi" width="36" height="36" :path="mdiCommentPlusOutline"></svg-icon>
        </v-btn>
        <v-menu>
          <template v-slot:activator="{ props: menu }">
            <v-tooltip location="top">
              <template v-slot:activator="{ props: tooltip }">
                <div class="d-flex flex-column">
                  <v-btn
                    class="menu-btn ellipsis"
                    variant="outlined"
                    color="primary"
                    v-bind="mergeProps(menu, tooltip)"
                  >
                    {{ menuButtonLabel }}
                  </v-btn>
                </div>
              </template>
            </v-tooltip>
          </template>
          <v-list>
            <v-list-item
              v-for="(item) in posts"
              :key="item.id"
              class="mt-1 mb-1"
              @click="onSelect(item)"
            >
              <v-list-item-title>
                <span class="ml-2">{{ item.title }}</span>
              </v-list-item-title>
              <v-list-item-subtitle>
                <span class="ml-2">
                  {{ toLocaleString(item.updatedTime) }}
                </span>
              </v-list-item-subtitle>
              <template v-slot:append>
                <v-btn
                  color="red"
                  icon="mdi-delete"
                  variant="text"
                  @click="onClicPostkDelete(post)"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <!-- MD size -->
      <v-col cols="0" md="4" class="h-100 overflow-auto hidden-md-and-down">
        <v-card>
          <v-btn
            v-if="enableEdit"
            class="form-button create"
            @click="onClickCreate"
          >
            <svg-icon type="mdi" width="36" height="36" :path="mdiCommentPlusOutline"></svg-icon>
          </v-btn>
          <v-list>
            <v-divider
              v-if="enableEdit"
              class="hidden-md-and-down"
            ></v-divider>
            <v-list-item
              v-for="(post) in posts"
              class="text-start mt-1 mb-1"
              :key="post.id"
              :active="selectedId === post.id"
              @click="onSelect(post)"
            >
              <v-list-item-title>
                <span class="ml-2">{{ post.title }}</span>
              </v-list-item-title>
              <v-list-item-subtitle>
                <span class="ml-2">
                  {{ toLocaleString(post.updatedTime) }}
                </span>
              </v-list-item-subtitle>
              <template #append
                v-if="enableEdit"
              >
                <v-btn
                  color="red"
                  icon="mdi-delete"
                  variant="text"
                  @click="onClicPostkDelete(post)"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" md="8" class="h-100 overflow-auto">
        <v-container
          v-if="selected"
          class="pt-0 pb-0 pr-0"
        >
          <v-card>
            <v-container>
              <div class="d-flex">
                <AccountAvatar
                  class="account-avatar mr-2 mt-2 mb-2"
                  :avatar="postAvatar"
                />
                <v-text-field
                  v-if="enableEdit"
                  v-model="postTitle"
                  :label="$t('Post title')"
                  :rules="[v => !!v || $t('Required')]"
                  hide-details
                ></v-text-field>
                <div
                  v-else
                  class="ellipsis"
                >
                  <span
                    class="ml-2 line-height-56"
                  >{{ postTitle }}</span>
                  <span class="ml-2 text-caption text-secondary">by {{ postName }}</span>
                </div>
              </div>
              <br>
              <div class="content-block" id="content-block">
                <QuillEditor
                  v-if="enableEdit"
                  v-model:content="postContent"
                  :options="quillOptions"
                  contentType="html"
                  theme="snow"
                />
                <div
                  v-else
                  class="ql-container"
                >
                  <div
                    v-html="postContent"
                    class="ql-editor"
                  >
                  </div>
                </div>
              </div>
              <v-card-actions
                  v-if="enableEdit"
                  class="pt-0 pr-0 pb-0"
                >
                  <v-spacer></v-spacer>
                  <v-btn
                    class="form-button"
                    @click="onClickClose"
                  >
                    {{ $t('Close') }}
                  </v-btn>
                  <v-btn
                    color="primary"
                    variant="elevated"
                    class="form-button"
                    :disabled="!postTitle || !changed"
                    @click="onClickSave"
                  >
                    {{ saveLable }}
                  </v-btn>
              </v-card-actions>
            </v-container>
          </v-card>
        </v-container>
        <v-container v-if="selected?.id">
          <v-row>
            <v-col cols="12" md="8">
              <v-list>
                <v-list-item
                  v-for="(comment) in comments"
                  class="text-start mt-1 mb-1"
                  :key="comment.id"
                >
                  <template #prepend>
                    <AccountAvatar
                      class="account-avatar size-24"
                      :avatar="comment.avatar"
                    />
                  </template>
                  <v-list-item-title>
                    <span>{{ comment.name }}</span>
                    <span class="ml-1 text-caption text-secondary">at {{ toLocaleString(comment.createdTime) }}</span>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <span>
                      {{ comment.content }}
                    </span>
                  </v-list-item-subtitle>
                  <template #append
                    v-if="enableEdit"
                  >
                    <v-btn
                      icon="mdi-trash-can"
                      variant="text"
                      @click="onDeleteComment(comment)"
                    ></v-btn>
                  </template>
                </v-list-item>
                <v-list-item v-if="enableComment">
                  <template #prepend>
                    <AccountAvatar
                      class="account-avatar size-24"
                      :avatar="avatar"
                    />
                  </template>
                  <template #title>
                    <v-text-field
                      class="comment-input"
                      v-model="commentContent"
                      :label="commentContent ? null : $t('Add a comment')"
                      @keyup.enter="onCommentEnter"
                      hide-details
                    ></v-text-field>
                  </template>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-container>
      </v-col>
    </v-row>
    <DeleteConfirmDialog
      ref="deleteConfirmDialog"
      :name="selected?.title"
      @delete="onClicConfirmDelete"/>
    <LeaveConfirmDialog
      ref="leaveConfirmDialog"
      @confirm="onClicConfirmLeave"
    />
  </v-container>
</template>

<style scoped>
.v-avatar.account-avatar {
  width: 40px;
  height: 40px;
}

.v-btn.form-button {
  height: 56px;

  &.h-40 {
    height: 40px;
  }
}

.v-btn.create {
  width: 100%;
}

.menu-btn.v-btn {
  height: 40px;
}

.line-height-56 {
  line-height: 56px;
}

.comment-input :deep(input) {
  min-height: 40px;
  padding-top: 12px;
  padding-bottom: 4px;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-block {
  text-align: left;
}

/* .interaction-google-map {
  max-height: 56px;
} */
</style>
