import { generateClient } from 'aws-amplify/api';
import { listPositions } from '../../graphql/queries';

const client = generateClient();

export default {
  namespaced: true,
  state: () => ({
    labels: [],
  }),
  getters: {
  //   productsByCategory: (state) => (category) => {
  //     return state.products.filter(product => product.category === category);
  //   }
  },
  actions: {
    async getLabels({ commit }, { lat, lng }) {
      const delta = 0.005;
      const filter = {
        lat: {
          between: [
            Number((lat - delta).toFixed(6)),
            Number((lat + delta).toFixed(6))
          ],
        },
        lng: {
          between: [
            Number((lng - delta).toFixed(6)),
            Number((lng + delta).toFixed(6))
          ],
        },
      };

      try {
        const items = await client.graphql({
          query: listPositions,
          variables: {
            filter
          }
        }).then(res => res.data.listPositions.items);

        commit('updateLabels', items);
      } catch (err) {
        console.error('listPositions fail', err)
      }
    },
  },
  mutations: {
    updateLabels(state, labels) {
      state.labels = labels;
    },
  },
}
