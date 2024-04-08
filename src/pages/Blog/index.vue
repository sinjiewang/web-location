<script>
import DOMPurify from 'dompurify';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue';
import LeaveConfirmDialog from '@/components/LeaveConfirmDialog.vue';
import AccountAvatar from '@/components/AccountAvatar.vue';
import SvgIcon from '@jamescoyle/vue-icon';
import { mdiCommentPlusOutline, mdiAccountCircle } from '@mdi/js';

export default {
  components: {
    SvgIcon,
    DeleteConfirmDialog,
    LeaveConfirmDialog,
    AccountAvatar,
  },
  props: {
    enableEdit: {
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
      commentContent: null,
      changed: false,
      confirmHandler: null,
    };
  },
  computed: {
    saveLable() {
      return this.selected?.id ? this.$t('Save') : this.$t('Create');
    },
    selectedId() {
      return this.selected?.id || '';
    },
  },
  methods: {
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
    },
    async onSelect(item) {
      const { id, title, content } = item;
      const confirmHandler = () => {
        this.postTitle = title;
        this.postContent = content;
        this.selected = item;
        this.$emit('getComments', id);
        this.$nextTick(() => {
          this.changed = false;
        });
      }

      if (this.changed) {
        this.$refs.leaveConfirmDialog.show();
        this.confirmHandler = confirmHandler;
      } else {
        confirmHandler();
      }
    },
    onClickClose() {
      if (this.changed) {
        return new Promise((reslove) => {
          this.$refs.leaveConfirmDialog.show();
          this.confirmHandler = () => {
            this.clear();

            reslove();
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
      });
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
    }
  }
}
</script>

<template>
  <v-container class="h-100">
    <v-row no-gutters class="h-100">
      <v-col cols="3" class="h-100 overflow-auto">
        <v-card>
          <v-btn
            v-if="enableEdit"
            class="form-button create mt-2"
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
      <v-col cols="9" class="h-100 overflow-auto">
        <v-container
          v-if="selected"
          class="pt-0 pb-0"
        >
          <v-card>
            <v-container>
              <div class="d-flex">
                <AccountAvatar
                  class="account-avatar mr-2 mt-2 mb-2"
                  :avatar="avatar"
                />
                <v-text-field
                  v-if="enableEdit"
                  v-model="postTitle"
                  :label="$t('Post title')"
                  :rules="[v => !!v || $t('Required')]"
                  hide-details
                ></v-text-field>
                <span
                  v-else
                  class="ml-2 line-height-56"
                >{{ postTitle }}</span>
              </div>
              <br>
              <v-textarea
                v-if="enableEdit"
                v-model="postContent"
                :label="$t('Post content')"
                auto-grow
              ></v-textarea>
              <div
                v-else
              >
                <div v-for="(str) in postContent.split('\n')"
                  class="text-left"
                >
                  {{ str }}
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
                <v-list-item>
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
}

.v-btn.create {
  width: 100%;
}

.line-height-56 {
  line-height: 56px;
}

.comment-input :deep(input) {
  min-height: 40px;
  padding-top: 12px;
  padding-bottom: 4px;
}
</style>
