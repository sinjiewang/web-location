import APIGatewayConnect from '@/utils/APIGatewayConnect';

export default {
  namespaced: true,
  state: () => ({
    wsClient: null,
  }),
  // getters: {

  // },
  actions: {
    connect ({ state, dispatch }, url) {
      return new Promise((reslove, reject) => {
        const wsClient = new APIGatewayConnect({ url });

        wsClient.on('close', () => {
          reject();
          state.wsClient = null;
        });
        wsClient.on('position', (event) => {
          dispatch('onposition', event);
        });
        wsClient.connect().then(reslove, reject);

        state.wsClient = wsClient;
      })
    },
    async clientConnect({ state, dispatch }, position=null) {
      if (state.wsClient) {
        return Promise.resolve(state.wsClient);
      }

      let url = import.meta.env.VITE_AWS_API_GATEWAY_CLIENT_URL;

      if (position && position.lat && position.lng) {
        url = `${url}?lat=${position.lat}&lng=${position.lng}`;
      }

      const wsClient = await dispatch('connect', url);

      return wsClient;
    },
    async siteConnect({ state, dispatch }, { siteId='', lat=0, lng=0, type='', title='' }={}) {
      if (state.wsClient) {
        return Promise.resolve(state.wsClient);
      }

      let  url = `${import.meta.env.VITE_AWS_API_GATEWAY_SITE_URL}?siteId=${siteId}&lat=${lat}&lng=${lng}&type=${type}`;

      const wsClient = await dispatch('connect', url);

      await dispatch('updateSiteTitle', title);

      return wsClient;
    },
    async disconnect({ state }) {
      if (state.wsClient) {
        state.wsClient.destroy();
        state.wsClient = null;
      }
    },
    async sendBySite({ dispatch }, options) {
      const wsClient = await dispatch('siteConnect');

      wsClient.send(options);
    },
    async updateSiteTitle({ dispatch }, title ) {
     await dispatch('sendBySite', {
        action: 'update',
        data: { title },
      });
    },
    async sendByClient({ dispatch }, options) {
      const wsClient = await dispatch('clientConnect');

      wsClient.send(options);
    },
    async updateClientPosition({ dispatch }, { lat, lng }) {
      await dispatch('sendByClient', {
        //TODO 'position' -> 'update'
        action: 'position',
        data: { lat, lng },
      });
    },
    onposition({ dispatch }, event) {
      const { action, data } = event;
      const operateName = `${action}Position`;

      dispatch(operateName, data);
    },
    addPosition({ commit }, position) {
      commit('Geopositioning/addLabel', position, { root: true });
    },
    removePosition({ commit }, position) {
      commit('Geopositioning/removeLabel', position, { root: true });
    },
  },
  mutations: {

  },
}
