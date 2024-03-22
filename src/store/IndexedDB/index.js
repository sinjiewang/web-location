import IndexedDBConfig from "@/utils/IndexedDB/IndexedDBConfig";
import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';

export default {
  namespaced: true,
  state: () => ({
    db: null,
  }),
  // getters: {

  // },
  actions: {
    connect({ commit, rootState, state }) {
      if (state.db) {
        return Promise.resolve(state.db);
      }

      return new Promise((resolve) => {
        const { sub } = rootState.Account;
        const promise = new IndexedDBConfig({ sub }).open()
          .then((db) => {
            commit('updateDb', db);

            resolve(db);

            return db;
          });

        commit('updateDb', promise);
      });
    },
    async deleteHistory({ dispatch }, id) {
      const db = await dispatch('connect');
      const storeHistory = new StoreHistory({ db });
      const storeChat = new StoreChat({ db });
      const messages = await storeChat.queryByHistoryId(id);

      messages.forEach(({ id }) => storeChat.delete(id));

      await storeHistory.delete(id);
    },
  },
  mutations: {
    updateDb(state, db) {
      state.db = db;
    },
  },
}
