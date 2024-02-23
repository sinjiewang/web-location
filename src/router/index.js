import { createRouter, createWebHistory } from 'vue-router';
import Browse from '@/pages/Browse/index.vue';
import Establish from '@/pages/Establish/index.vue';

const routes = [
  {
    path: '/browse',
    name: 'Browse',
    component: Browse,
  },
  {
    path: '/establish',
    name: 'Establish',
    component: Establish,
    meta: {
      // requiresAuth: true,
      layout: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/browse',
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;