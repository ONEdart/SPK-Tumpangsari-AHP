/**
 * router.js – Vue Router 4 dengan route guard berbasis role
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from './store.js'

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    component: () => import('./views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/admin',
    component: () => import('./views/AdminDashboard.vue'),
    meta: { role: 'admin' }
  },
  {
    path: '/penyuluh',
    component: () => import('./views/PenyuluhDashboard.vue'),
    meta: { role: 'penyuluh' }
  },
  {
    path: '/pakar',
    component: () => import('./views/PakarDashboard.vue'),
    meta: { role: 'pakar' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

const ROLE_PATHS = { admin: '/admin', penyuluh: '/penyuluh', pakar: '/pakar' }

router.beforeEach(async (to) => {
  const store = useAuthStore()

  // Tunggu auth check selesai
  if (!store.ready) {
    await new Promise(resolve => {
      const stop = store.$subscribe(() => {
        if (store.ready) { stop(); resolve() }
      })
    })
  }

  // Route publik (login): jika sudah login redirect ke dashboard
  if (to.meta.public) {
    if (store.uid && store.role) {
      return ROLE_PATHS[store.role] || '/login'
    }
    return true
  }

  // Belum login → ke login
  if (!store.uid) return '/login'

  // Role tidak sesuai → redirect ke dashboard yang sesuai
  if (to.meta.role && to.meta.role !== store.role) {
    return ROLE_PATHS[store.role] || '/login'
  }

  return true
})

export default router