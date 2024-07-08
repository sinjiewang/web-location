import {
  mdiChatProcessingOutline,
  mdiChatPlus,
  mdiCommentEdit,
  mdiCommentEyeOutline,
  mdiFileEye,
  mdiFileArrowUpDown,
  // mdiCardsPlayingClubMultiple,
  // mdiCardsPlayingSpadeMultipleOutline,
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
    name: ($t) => $t('File Access'),
    icon: 'mdi-file-eye',
  },
  memoryCard: {
    name: ($t) => $t('Memory Card'),
    icon: 'mdi-cards-playing-club-multiple',
  },
  bigTwo: {
    name: ($t) => $t('Big Two'),
    icon: 'mdi-cards-playing',
  },
  uno: {
    name: () => 'Uno',
    icon: 'mdi-cards',
  },
});

const TYPE_LIMITATION = Object.freeze({
  bigTwo: {
    connectionLimit: 3,
  },
  uno: {
    connectionLimit: 5,
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
  // memoryCard: {
  //   create: mdiCardsPlayingClubMultiple,
  //   join: mdiCardsPlayingSpadeMultipleOutline,
  // },
});

export default {
  TYPE,
  TYPE_ACTION_ICON,
  TYPE_LIMITATION
}