import StoreAccount from '@/utils/IndexedDB/StoreAccount';

const locale = localStorage.getItem('locale');

export default {
  namespaced: true,
  state: () => ({
    sub: '',
    email: '',
    nickname: '',
    avatar: null,
    position: null,
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
      let account = await storeAccount.queryById(state.sub);

      if (account) {
        const { nickname, avatar, position } = account;

        commit('updateNickname', nickname);
        commit('updateAvatar', avatar);
        commit('updatePosition', position);
      } else {
        try {
          account = await storeAccount.create({
            id: '',
            nickname: '',
            avatar: null,
          });
        } catch (err) {
          console.warn('storeAccount.create failed: ', err)
          // try again
          return dispatch('getAccount');
        }
      }

      return account;
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
    async updatePosition({ state, dispatch, commit }, { lat, lng }) {
      const storeAccount = await dispatch('getStoreConnect');

      await storeAccount.update(state.sub, { position: { lat, lng }});

      commit('updatePosition', { lat, lng });
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
    updatePosition(state, position) {
      state.position = position;
    },
  },
}
