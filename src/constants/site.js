import { mdiChatProcessingOutline, mdiBullhornVariantOutline } from '@mdi/js';

const TYPE = Object.freeze({
  post: {
    name: ($t) => $t('Message Board'),
    icon: mdiBullhornVariantOutline,
  },
  chat:  {
    name: ($t) => $t('Chat'),
    icon: mdiChatProcessingOutline,
  },
});

export default {
  TYPE,
}