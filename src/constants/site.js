import {
  mdiChatProcessingOutline,
  mdiChatPlus,
} from '@mdi/js';

const TYPE = Object.freeze({
  // post: {
  //   name: ($t) => $t('Message Board'),
  //   icon: mdiBullhornVariantOutline,
  // },
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
})

export default {
  TYPE,
  TYPE_ACTION_ICON,
}