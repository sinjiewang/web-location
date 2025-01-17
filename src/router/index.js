import { createRouter, createWebHistory } from 'vue-router';
import Search from '@/pages/Search/index.vue';
import Browse from '@/pages/Browse/index.vue';
import History from '@/pages/History/index.vue';
import Establish from '@/pages/Establish/index.vue';
import Chat from '@/pages/Chat/client/index.vue';
import Blog from '@/pages/Blog/client/index.vue';
import Access from '@/pages/Access/client/index.vue';
import MemoryCard from '@/pages/MemoryCard/client/index.vue';
import BigTwo from '@/pages/BigTwo/client/index.vue';
import Uno from '@/pages/Uno/client/index.vue';
import Chess from '@/pages/Chess/client/index.vue';
import File from '@/pages/File/index.vue';
import HistoryChat from '@/pages/History/Chat.vue';
import HistoryBlog from '@/pages/History/Blog.vue';
import HistoryAccess from '@/pages/History/Access.vue';
import Info from '@/pages/Info/index.vue';
// import Dev from '@/pages/Dev/index.vue';

const routes = [
  {
    path: '/search',
    name: 'search',
    component: Search,
  },
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
      },
      {
        path: 'access/:id',
        component: HistoryAccess,
      },
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
    path: '/access/:siteId',
    name: 'access',
    component: Access,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'access',
    },
  },
  {
    path: '/memoryCard/:siteId',
    name: 'memoryCard',
    component: MemoryCard,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'memoryCard',
    },
  },
  {
    path: '/bigTwo/:siteId',
    name: 'bigTwo',
    component: BigTwo,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'bigTwo',
    },
  },
  {
    path: '/uno/:siteId',
    name: 'uno',
    component: Uno,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'uno',
    },
  },
  {
    path: '/chess/:siteId',
    name: 'chess',
    component: Chess,
    meta: {
      // requiresAuth: true,
      layout: false,
      type: 'chess',
    },
  },
  {
    path: '/file',
    name: 'file',
    component: File,
  },
  {
    path: '/info',
    name: 'info',
    component: Info,
  },
  // {
  //   path: '/dev',
  //   name: 'dev',
  //   component: Dev,
  // },
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