import APIGatewayConnect from '@/utils/APIGatewayConnect';

export default {
  namespaced: true,
  state: () => ({
    wsConnection: null,
  }),
  // getters: {

  // },
  actions: {
    connect ({ state, dispatch }, url) {
      return new Promise((reslove, reject) => {
        const connection = new APIGatewayConnect({ url });

        connection.on('close', () => {
          reject();
          state.wsConnection = null;
        });
        connection.on('position', (event) => {
          dispatch('onposition', event);
        });
        connection.connect().then(reslove, reject);

        state.wsConnection = connection;
      })
    },
    async clientConnect({ state, dispatch }, position=null) {
      if (state.wsConnection) {
        return Promise.resolve(state.wsConnection);
      }

      let url = import.meta.env.VITE_AWS_API_GATEWAY_CLIENT_URL;

      if (position && position.lat && position.lng) {
        url = `${url}?lat=${position.lat}&lng=${position.lng}`;
      }

      const connection = await dispatch('connect', url);

      return connection;
    },
    async siteConnect({ state, dispatch }, { siteId='', lat=0, lng=0, type='', title='' }={}) {
      if (state.wsConnection) {
        return Promise.resolve(state.wsConnection);
      }

      let  url = `${import.meta.env.VITE_AWS_API_GATEWAY_SITE_URL}?siteId=${siteId}&lat=${lat}&lng=${lng}&type=${type}`;

      const wsConnection = await dispatch('connect', url);

      await dispatch('updateSiteTitle', title);

      return wsConnection;
    },
    async disconnect({ state }) {
      if (state.wsConnection) {
        state.wsConnection.destroy();
        state.wsConnection = null;
      }
    },
    async sendBySite({ dispatch }, options) {
      const wsSite = await dispatch('siteConnect');

      wsSite.send(options);
    },
    async updateSiteTitle({ dispatch }, title ) {
     await dispatch('sendBySite', {
        action: 'update',
        data: { title },
      });
    },
    async sendByClient({ dispatch }, options) {
      const connection = await dispatch('clientConnect');

      connection.send(options);
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
