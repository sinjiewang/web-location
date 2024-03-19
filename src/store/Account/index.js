import StoreAccount from '@/utils/IndexedDB/StoreAccount';

const locale = localStorage.getItem('locale');

export default {
  namespaced: true,
  state: () => ({
    sub: '',
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
    async getStoreConnect({ dispatch }) {
      const db = await dispatch('IndexedDB/connect', null, { root: true });

      return new StoreAccount({ db });
    },
    async getAccount({ state, dispatch, commit }) {
      // TODO get sub from cognito
      const storeAccount = await dispatch('getStoreConnect');
      const account = await storeAccount.queryById(state.sub);

      if (account) {
        const { nickname, avatar } = account;

        commit('updateNickname', nickname);
        commit('updateAvatar', avatar);
      } else {
        storeAccount.create({
          id: '',
          nickname: '',
          avatar: null,
        });
      }
    },
    async updateAccount({ state, dispatch, commit }, { nickname, avatar }) {
      const storeAccount = await dispatch('getStoreConnect');

      await storeAccount.update(state.sub, { nickname, avatar });

      commit('updateNickname', nickname);
      commit('updateAvatar', avatar);
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
    updateAvatar(state, dataUrl) {
      state.avatar = dataUrl;
    },
    updateLocale(state, locale) {
      state.locale = locale;
    },
  },
}
