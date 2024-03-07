const locale = localStorage.getItem('locale');

export default {
  namespaced: true,
  state: () => ({
    email: '',
    nickName: '',
    avatar: null,
    locale,
  }),
  // getters: {

  // },
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
    updateNickName(state, name) {
      state.nickName = name;
    },
    updateAvatar(state, blob) {
      state.avatar = blob;
    },
    updateLocale(state, locale) {
      state.locale = locale;
    },
  },
}
