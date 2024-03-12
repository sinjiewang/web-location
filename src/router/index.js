import { createRouter, createWebHistory } from 'vue-router';
import Browse from '@/pages/Browse/index.vue';
import History from '@/pages/History/index.vue';
import Establish from '@/pages/Establish/index.vue';
import Chat from '@/pages/Chat/client/index.vue';
import HistoryChat from '@/pages/History/chat.vue';

const routes = [
  {
    path: '/browse',
    name: 'Browse',
    component: Browse,
  },
  {
    path: '/history',
    name: 'History',
    component: History,
    children: [
      {
        path: 'chat/:id',
        component: HistoryChat,
      }
    ]
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
    path: '/chat/:siteId',
    name: 'Chat',
    component: Chat,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'chat',
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