import IndexedDBConfig from "@/utils/IndexedDB/IndexedDBConfig";
import StoreChat from '@/utils/IndexedDB/StoreChat';
import StoreHistory from '@/utils/IndexedDB/StoreHistory';

const STORAGE_WAIT = 150; // msec

export default {
  namespaced: true,
  state: () => ({
    db: null,
    quota: null,
    usage: null,
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
    refreshStorageCapacity({ commit }) {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        setTimeout(() => {
          navigator.storage.estimate().then(estimate => {
            commit('updateQuota', estimate.quota);
            commit('updateUsage', estimate.usage);
          }).catch((err) => {
            console.error('storage.estimate() failed', err);
          });
        }, STORAGE_WAIT);
      } else {
        console.warn('Unsupport Storage Estimation API');
      }
    },
  },
  mutations: {
    updateDb(state, db) {
      state.db = db;
    },
    updateQuota(state, quota) {
      state.quota = quota;
    },
    updateUsage(state, usage) {
      state.usage = usage;
    },
  },
}
