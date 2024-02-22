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
    async clientConnect({ state, dispatch }, position=null) {
      if (state.wsClient) {
        return Promise.resolve(state.wsClient);
      }

      let url = import.meta.env.VITE_AWS_API_GATEWAY_CLIENT_URL;

      if (position && position.lat && position.lng) {
        url = `${url}?lat=${position.lat}&lng=${position.lng}`;
      }

      state.ws = await new Promise((reslove, reject) => {
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
      });
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
