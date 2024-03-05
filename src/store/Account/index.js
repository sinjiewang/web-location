export default {
  namespaced: true,
  state: () => ({
    email: '',
    nickName: 'Guest',
    avatar: null,
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
  },
  mutations: {
    updateNickName({ state }, name) {
      state.nickName = name;
    },
    updateAvatar({ state }, blob) {
      state.avatar = blob;
    },
  },
}
