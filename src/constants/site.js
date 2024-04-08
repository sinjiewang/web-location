import {
  mdiChatProcessingOutline,
  mdiChatPlus,
  mdiCommentText,
  mdiCommentEdit,
  mdiCommentEyeOutline,
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
})

export default {
  TYPE,
  TYPE_ACTION_ICON,
}