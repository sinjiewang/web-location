import APIGatewayClient from '@/utils/APIGatewayClient';

export default {
  namespaced: true,
  state: () => ({
    connected: true,
    wsClient: null,
  }),
  // getters: {

  // },
  actions: {
    connect ({ state, dispatch }, url) {
      return new Promise((reslove, reject) => {
        const wsClient = new APIGatewayClient({ url });

        wsClient.on('open', () => {
          reslove(wsClient);
          state.wsClient = wsClient;
        });
        wsClient.on('close', () => {
          reject();
          state.wsClient = null;
        });
        wsClient.on('message', (event) => {
          const { action, type, data, message } = JSON.parse(event.data);

          if (message) console.warn(message);

          const handler = `${action}${type[0].toUpperCase() + type.substring(1)}`;

          dispatch(handler, data);
        });
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
    async siteConnect({ state, dispatch }, { lat=0, lng=0, type='', title='' }={}) {
      if (state.wsClient) {
        return Promise.resolve(state.wsClient);
      }

      let url = import.meta.env.VITE_AWS_API_GATEWAY_SITE_URL;

      url = `${url}?lat=${lat}&lng=${lng}&type=${type}`;

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
    async updateSiteTitle({ dispatch }, title ) {
      const wsSite = await dispatch('siteConnect');

      wsSite.send({
        action: 'update',
        data: { title },
      })
    },
    async updateClientPosition({ dispatch }, { lat, lng }) {
      const wsClient = await dispatch('clientConnect');

      wsClient.send({
        action: 'position',
        data: { lat, lng },
      })
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
