import { createStore } from 'vuex'
import Account from './Account'
import CloudTunnel from './CloudTunnel'
import Geopositioning from './Geopositioning'

export const store = createStore({
  modules: {
    Account,
    CloudTunnel,
    Geopositioning,
  }
});
