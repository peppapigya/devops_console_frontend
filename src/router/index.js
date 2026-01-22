import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: {
      title: '首页',
      icon: 'House'
    }
  },
  {
    path: '/es',
    name: 'EsDashboard',
    component: () => import('../views/es/EsDashboard.vue'),
    meta: {
      title: 'ES控制台',
      icon: 'Monitor',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: '/instances',
    name: 'InstanceList',
    component: () => import('../views/es/InstanceManagement.vue'),
    meta: {
      title: '实例管理',
      icon: 'Monitor'
    }
  },
  {
    path: '/instances/detail/:id',
    name: 'InstanceDetail',
    component: () => import('../views/es/InstanceDetail.vue'),
    meta: {
      title: '实例详情',
      icon: 'View'
    }
  },
  {
    path: '/instances/add',
    name: 'AddInstance',
    component: () => import('../views/es/InstanceForm.vue'),
    meta: {
      title: '添加实例',
      icon: 'Plus'
    }
  },
  {
    path: '/instances/edit/:id',
    name: 'EditInstance',
    component: () => import('../views/es/InstanceForm.vue'),
    meta: {
      title: '编辑实例',
      icon: 'Edit'
    }
  },
  // ES 模块路由
  {
    path: '/nodes',
    name: 'ESNodeManagement',
    component: () => import('../views/es/NodeManagement.vue'),
    meta: {
      title: '节点管理',
      icon: 'Connection',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: '/indices',
    name: 'IndexManagement',
    component: () => import('../views/es/IndexManagement.vue'),
    meta: {
      title: '索引管理',
      icon: 'DocumentCopy',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: '/shards',
    name: 'ShardManagement',
    component: () => import('../views/es/ShardManagement.vue'),
    meta: {
      title: '分片管理',
      icon: 'Grid',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: '/backup',
    name: 'BackupManagement',
    component: () => import('../views/es/BackupManagement.vue'),
    meta: {
      title: '备份管理',
      icon: 'FolderOpened',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: '/data',
    name: 'DataManagement',
    component: () => import('../views/es/DataManagement.vue'),
    meta: {
      title: '数据管理',
      icon: 'DataBoard',
      instanceType: 'elasticsearch'
    }
  },
  // K8s 模块路由
  {
    path: '/k8s',
    name: 'K8sDashboard',
    component: () => import('../views/k8s/K8sDashboard.vue'),
    meta: {
      title: 'K8s控制台',
      icon: 'Monitor',
      instanceType: 'kubernetes'
    }
  },
  
  {
    path: '/k8s/cluster/:clusterName',
    name: 'ClusterDetail',
    component: () => import('../views/k8s/ClusterDetail.vue'),
    meta: {
      title: '集群详情',
      icon: 'View',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/node',
    name: 'K8sNodeManagement',
    component: () => import('../views/k8s/NodeManagement.vue'),
    meta: {
      title: '节点管理',
      icon: 'Monitor',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/pod',
    name: 'PodManagement',
    component: () => import('../views/k8s/PodManagement.vue'),
    meta: {
      title: 'Pod管理',
      icon: 'Box',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/deployment',
    name: 'DeploymentManagement',
    component: () => import('../views/k8s/DeploymentManagement.vue'),
    meta: {
      title: 'Deployment管理',
      icon: 'Files',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/namespace',
    name: 'NamespaceManagement',
    component: () => import('../views/k8s/NamespaceManagement.vue'),
    meta: {
      title: '命名空间管理',
      icon: 'Folder',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/service',
    name: 'ServiceManagement',
    component: () => import('../views/k8s/ServiceManagement.vue'),
    meta: {
      title: 'Service管理',
      icon: 'Connection',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/cronjob',
    name: 'CronJobManagement',
    component: () => import('../views/k8s/CronJobManagement.vue'),
    meta: {
      title: 'CronJob管理',
      icon: 'Timer',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/daemonset',
    name: 'DaemonSetManagement',
    component: () => import('../views/k8s/DaemonSetManagement.vue'),
    meta: {
      title: 'DaemonSet管理',
      icon: 'Monitor',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/k8s/job',
    name: 'JobManagement',
    component: () => import('../views/k8s/JobManagement.vue'),
    meta: {
      title: 'Job管理',
      icon: 'List',
      instanceType: 'kubernetes'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/es/Settings.vue'),
    meta: {
      title: '系统设置',
      icon: 'Setting'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 添加路由错误处理
router.onError((error) => {
  console.error('Router error:', error)
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - DevOps Console`
  }
  
  // 先允许导航，然后在组件中检查实例类型
  next()
})

export default router