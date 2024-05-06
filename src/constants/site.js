import {
  mdiChatProcessingOutline,
  mdiChatPlus,
  mdiCommentText,
  mdiCommentEdit,
  mdiCommentEyeOutline,
  mdiFileEye,
  mdiFileArrowUpDown,
} from '@mdi/js';

const TYPE = Object.freeze({
  blog: {
    name: ($t) => $t('Blog'),
    icon: mdiCommentText,
  },
  chat: {
    name: ($t) => $t('Chat'),
    icon: mdiChatProcessingOutline,
  },
  access: {
    name: ($t) => $t('Access'),
    icon: mdiFileEye,
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
})

export default {
  TYPE,
  TYPE_ACTION_ICON,
}