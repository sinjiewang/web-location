import { createRouter, createWebHistory } from 'vue-router';
import Browse from '@/pages/Browse/index.vue';

const routes = [
  {
    path: '/browse',
    name: 'Browse',
    component: Browse,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;