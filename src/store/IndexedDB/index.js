import IndexedDBConfig from "@/utils/IndexedDB/IndexedDBConfig";

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
  },
  mutations: {
    updateDb(state, db) {
      state.db = db;
    },
  },
}
