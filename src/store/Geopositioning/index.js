import { generateClient } from 'aws-amplify/api';
import { listPositions, getPosition } from '@/graphql/queries';
import coordinate from '@/utils/coordinate';

const QUERY_RANGE = 0.01;
const client = generateClient();

export default {
  namespaced: true,
  state: () => ({
    labels: [],
    userPosition: null,
  }),
  getters: {
    labels(state) {
      return state.labels;
    },
  },
  actions: {
    async getLabels({ commit }, { lat, lng }) {
      const delta = QUERY_RANGE;
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
    async getCurrentPosition() {
      return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
        .then(({ coords }) => ({
          accuracy: coords.accuracy,
          ...coordinate.transform({
            lat: coords.latitude,
            lng: coords.longitude,
          }),
        }));
    },
    async getGeolocationAPI() {
      const { VITE_GOOGLE_APIS_GEOLOCATE_URL, VITE_GOOGLE_MAPS_APIKEY } = import.meta.env;
      const googleapisUrl = `${VITE_GOOGLE_APIS_GEOLOCATE_URL}?key=${VITE_GOOGLE_MAPS_APIKEY}`;

      return fetch(googleapisUrl, {
        method: 'POST',
      })
        .then(res => res.json())
        .then(({ accuracy, location }) => ({ accuracy, ...coordinate.transform(location)}));
    },
    async getUserPosition({ commit, dispatch }) {
      let position = null;

      try {
        if ('geolocation' in navigator) {
          position = await dispatch('getCurrentPosition');
        } else {
          position = await dispatch('getGeolocationAPI');
        }

      } catch (err) {
        console.warn('getUserPosition fail', err);
      }

      commit('updateUserPosition', position);

      return position;
    },
    async getPositionSites(_, variables) {
      try {
        const sites = await client.graphql({
          query: getPosition,
          variables,
        }).then(res => res.data.getPosition.sites);

        return sites;
      } catch (err) {
        console.error('listPositions fail', err)
      }
    },
  },
  mutations: {
    updateLabels(state, labels) {
      state.labels = labels;
    },
    updateUserPosition(state, { lag, lng }) {
      state.userPosition = { lag, lng };
    },
    addLabel(state, position) {
      const hasIncludes = state.labels.find(({ positionId }) => positionId === position.positionId);

      if (!hasIncludes) {
        state.labels = [...state.labels, position];
      }
    },
    removeLabel(state, position) {
      const hasIncludes = state.labels.find(({ positionId }) => positionId === position.positionId);

      if (hasIncludes) {
        state.labels = state.labels.filter(({ positionId }) => positionId !== position.positionId);
      }
    },
  },
}
