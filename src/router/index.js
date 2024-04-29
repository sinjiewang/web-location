import { createRouter, createWebHistory } from 'vue-router';
import Browse from '@/pages/Browse/index.vue';
import History from '@/pages/History/index.vue';
import Establish from '@/pages/Establish/index.vue';
import Chat from '@/pages/Chat/client/index.vue';
import Blog from '@/pages/Blog/client/index.vue';
import File from '@/pages/File/index.vue';
import HistoryChat from '@/pages/History/Chat.vue';
import HistoryBlog from '@/pages/History/Blog.vue';

const routes = [
  {
    path: '/browse',
    name: 'browse',
    component: Browse,
  },
  {
    path: '/history',
    name: 'history',
    component: History,
    children: [
      {
        path: 'chat/:id',
        component: HistoryChat,
      },
      {
        path: 'blog/:id',
        component: HistoryBlog,
      }
    ]
  },
  {
    path: '/establish/:id?',
    name: 'establish',
    component: Establish,
    meta: {
      // requiresAuth: true,
      layout: false,
    },
  },
  {
    path: '/chat/:siteId',
    name: 'chat',
    component: Chat,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'chat',
    },
  },
  {
    path: '/blog/:siteId',
    name: 'blog',
    component: Blog,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'blog',
    },
  },
  {
    path: '/file',
    name: 'file',
    component: File,
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