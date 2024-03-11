const locale = localStorage.getItem('locale');

export default {
  namespaced: true,
  state: () => ({
    sub: null,
    email: '',
    nickname: '',
    avatar: null,
    locale,
  }),
  getters: {
    getNickname(state) {
      return state.nickname || 'Guest';
    },
  },
  actions: {
    updateNickName({ commit }, name) {
      commit('updateNickName', name);
    },
    updateAvatar({ commit }, blob) {
      commit('updateAvatar', blob);
    },
    updateLocale({ commit }, { i18n, locale }) {
      localStorage.setItem('locale', locale);

      i18n.locale = locale;

      commit('updateLocale', locale);
    },
  },
  mutations: {
    updateSub(state, sub) {
      state.sub = sub;
    },
    updateNickname(state, name) {
      state.nickname = name;
    },
    updateAvatar(state, blob) {
      state.avatar = blob;
    },
    updateLocale(state, locale) {
      state.locale = locale;
    },
  },
}
