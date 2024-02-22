import { createApp } from 'vue'
import '@/style.css'
import App from '@/App.vue'
import { store } from '@/store'
import i18n from '@/i18n'
import router from '@/router';

import { Amplify } from 'aws-amplify'
import config from '@/amplifyconfiguration.json'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

Amplify.configure(config);

const app = createApp(App)
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
  },
})

app.use(router)
app.use(store)
app.use(i18n)
app.use(vuetify)
app.mount('#app')
