import {
  mdiChatProcessingOutline,
  mdiChatPlus,
  mdiCommentEdit,
  mdiCommentEyeOutline,
  mdiFileEye,
  mdiFileArrowUpDown,
} from '@mdi/js';

const TYPE = Object.freeze({
  blog: {
    name: ($t) => $t('Blog'),
    icon: 'mdi-comment-text',
  },
  chat: {
    name: ($t) => $t('Chat'),
    icon: 'mdi-chat-processing-outline',
  },
  access: {
    name: ($t) => $t('Access'),
    icon: 'mdi-file-eye',
  },
});

const TYPE_ACTION_ICON = Object.freeze({
  chat: {
    create: mdiChatPlus,
    join: mdiChatProcessingOutline,
  },
  blog: {
    create: mdiCommentEdit,
    join: mdiCommentEyeOutline,
  },
  access: {
    create: mdiFileArrowUpDown,
    join: mdiFileEye,
  },
});

export default {
  TYPE,
  TYPE_ACTION_ICON,
}