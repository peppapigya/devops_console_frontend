import { createRouter, createWebHistory } from 'vue-router'

// ============================================================
// 静态路由（无需登录/鉴权的基础路由）
// 所有业务路由通过动态路由 (router.addRoute) 在登录后按权限注册
// ============================================================
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/system/login/index.vue'),
    meta: { title: '登录', hidden: true }
  },
  {
    // 已认证用户的根布局，name='AppLayout' 供 addRoute 使用
    path: '/',
    name: 'AppLayout',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页', icon: 'House' }
      }
    ]
  },
  // 不匹配时的 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/404.vue'),
    meta: { hidden: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// ============================================================
// 路由守卫 —— 动态路由核心入口
// ============================================================
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - DevOps Console`
  }

  const token = localStorage.getItem('access_token')

  // 未登录
  if (!token) {
    if (to.path === '/login') {
      next()
    } else {
      next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    return
  }

  // 已登录访问登录页，直接去首页
  if (to.path === '/login') {
    next('/')
    return
  }

  // 动态路由是否已加载
  const { usePermissionStore } = await import('../stores/permissionStore.js')
  const permStore = usePermissionStore()

  if (!permStore.isLoaded) {
    try {
      await permStore.loadUserAndRoutes(router)
      // 路由刚刚动态添加，需要重新导航让路由匹配生效
      next({ ...to, replace: true })
    } catch (err) {
      console.error('动态路由加载故障:', err)
      // token 失效等场景，清除并跳登录
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      next('/login')
    }
  } else {
    next()
  }
})

// 路由错误处理
router.onError((error) => {
  console.error('Router error:', error)
})

export default router
