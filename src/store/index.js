import { createStore } from 'vuex'
import CloudTunnel from './CloudTunnel'
import Geopositioning from './Geopositioning'

export const store = createStore({
  modules: {
    CloudTunnel,
    Geopositioning,
  }
})
