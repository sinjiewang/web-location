import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { store } from './store';

import { Amplify } from 'aws-amplify';
import config from './amplifyconfiguration.json';

Amplify.configure(config);

const app = createApp(App)

app.use(store)
app.mount('#app')
