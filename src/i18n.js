import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

import Account from '@/store/Account';

const messages = {
  en,
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  ja,
  ko,
};
const keys = Object.keys(messages);
const defaultLocale = Account.state().locale;
const locale = defaultLocale
  ? defaultLocale
  : navigator.languages.reduce((acc, curr) => acc || (keys.includes(curr) ? curr : null), null);
const i18n = createI18n({
  fallbackLocale: 'en',
  locale,
  messages,
});

export default i18n;