import { createRouter, createWebHistory } from 'vue-router'

// Dashboard Layout (Authenticated)
const dashboardRoutes = [
  {
    path: '', // Default child for /
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: {
      title: '首页',
      icon: 'House'
    }
  },
  {
    path: 'es', // Note: removed leading slash for children
    name: 'EsDashboard',
    component: () => import('../views/es/EsDashboard.vue'),
    meta: {
      title: 'ES控制台',
      icon: 'Monitor',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: 'instances',
    name: 'InstanceList',
    component: () => import('../views/es/InstanceManagement.vue'),
    meta: {
      title: '实例管理',
      icon: 'Monitor'
    }
  },
  {
    path: 'instances/detail/:id',
    name: 'InstanceDetail',
    component: () => import('../views/es/InstanceDetail.vue'),
    meta: {
      title: '实例详情',
      icon: 'View'
    }
  },
  {
    path: 'instances/add',
    name: 'AddInstance',
    component: () => import('../views/es/InstanceForm.vue'),
    meta: {
      title: '添加实例',
      icon: 'Plus'
    }
  },
  {
    path: 'instances/edit/:id',
    name: 'EditInstance',
    component: () => import('../views/es/InstanceForm.vue'),
    meta: {
      title: '编辑实例',
      icon: 'Edit'
    }
  },
  // ES 模块路由
  {
    path: 'nodes',
    name: 'ESNodeManagement',
    component: () => import('../views/es/NodeManagement.vue'),
    meta: {
      title: '节点管理',
      icon: 'Connection',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: 'indices',
    name: 'IndexManagement',
    component: () => import('../views/es/IndexManagement.vue'),
    meta: {
      title: '索引管理',
      icon: 'DocumentCopy',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: 'shards',
    name: 'ShardManagement',
    component: () => import('../views/es/ShardManagement.vue'),
    meta: {
      title: '分片管理',
      icon: 'Grid',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: 'backup',
    name: 'BackupManagement',
    component: () => import('../views/es/BackupManagement.vue'),
    meta: {
      title: '备份管理',
      icon: 'FolderOpened',
      instanceType: 'elasticsearch'
    }
  },
  {
    path: 'data',
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
    path: 'k8s',
    name: 'K8sDashboard',
    component: () => import('../views/k8s/K8sDashboard.vue'),
    meta: {
      title: 'K8s控制台',
      icon: 'Monitor',
      instanceType: 'kubernetes'
    }
  },

  {
    path: 'k8s/cluster/:clusterName',
    name: 'ClusterDetail',
    component: () => import('../views/k8s/ClusterDetail.vue'),
    meta: {
      title: '集群详情',
      icon: 'View',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/node',
    name: 'K8sNodeManagement',
    component: () => import('../views/k8s/NodeManagement.vue'),
    meta: {
      title: '节点管理',
      icon: 'Monitor',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/pod',
    name: 'PodManagement',
    component: () => import('../views/k8s/PodManagement.vue'),
    meta: {
      title: 'Pod管理',
      icon: 'Box',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/deployment',
    name: 'DeploymentManagement',
    component: () => import('../views/k8s/DeploymentManagement.vue'),
    meta: {
      title: 'Deployment管理',
      icon: 'Files',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/namespace',
    name: 'NamespaceManagement',
    component: () => import('../views/k8s/NamespaceManagement.vue'),
    meta: {
      title: '命名空间管理',
      icon: 'Folder',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/service',
    name: 'ServiceManagement',
    component: () => import('../views/k8s/ServiceManagement.vue'),
    meta: {
      title: 'Service管理',
      icon: 'Connection',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/ingress',
    name: 'IngressManagement',
    component: () => import('../views/k8s/IngressManagement.vue'),
    meta: {
      title: 'Ingress管理',
      icon: 'Share',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/ingressclass',
    name: 'IngressClassManagement',
    component: () => import('../views/k8s/IngressClassManagement.vue'),
    meta: {
      title: 'IngressClass管理',
      icon: 'Operation',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/configmap',
    name: 'ConfigMapManagement',
    component: () => import('../views/k8s/ConfigMapManagement.vue'),
    meta: {
      title: 'ConfigMap管理',
      icon: 'Document',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/secret',
    name: 'SecretManagement',
    component: () => import('../views/k8s/SecretManagement.vue'),
    meta: {
      title: 'Secret管理',
      icon: 'Key',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/event',
    name: 'EventManagement',
    component: () => import('../views/k8s/EventManagement.vue'),
    meta: {
      title: '事件管理',
      icon: 'BellFilled',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/cronjob',
    name: 'CronJobManagement',
    component: () => import('../views/k8s/CronJobManagement.vue'),
    meta: {
      title: 'CronJob管理',
      icon: 'Timer',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/daemonset',
    name: 'DaemonSetManagement',
    component: () => import('../views/k8s/DaemonSetManagement.vue'),
    meta: {
      title: 'DaemonSet管理',
      icon: 'Monitor',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/replicaset',
    name: 'ReplicaSetManagement',
    component: () => import('../views/k8s/ReplicaSetManagement.vue'),
    meta: {
      title: 'ReplicaSet管理',
      icon: 'CopyDocument',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/rc',
    name: 'ReplicationControllerManagement',
    component: () => import('../views/k8s/ReplicationControllerManagement.vue'),
    meta: {
      title: 'RC管理',
      icon: 'CopyDocument',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/crd',
    name: 'CrdManagement',
    component: () => import('../views/k8s/CrdManagement.vue'),
    meta: {
      title: 'CRD管理',
      icon: 'Cpu',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/vpa',
    name: 'VpaManagement',
    component: () => import('../views/k8s/VpaManagement.vue'),
    meta: {
      title: 'VPA管理',
      icon: 'Top',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/hpa',
    name: 'HpaManagement',
    component: () => import('../views/k8s/HpaManagement.vue'),
    meta: {
      title: 'HPA管理',
      icon: 'Right',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/operator',
    name: 'OperatorManagement',
    component: () => import('../views/k8s/OperatorManagement.vue'),
    meta: {
      title: 'Operator管理',
      icon: 'Box',
      instanceType: 'kubernetes'
    }
  },
  // Helm 应用商店
  {
    path: 'helm/repos',
    name: 'HelmRepoManagement',
    component: () => import('../views/helm/RepoManagement.vue'),
    meta: {
      title: 'Helm仓库',
      icon: 'Box',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'helm/store',
    name: 'HelmAppStore',
    component: () => import('../views/helm/AppStore.vue'),
    meta: {
      title: 'Helm应用商店',
      icon: 'ShoppingCart',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'helm/installed',
    name: 'HelmInstalledApps',
    component: () => import('../views/helm/InstalledApps.vue'),
    meta: {
      title: '已安装应用',
      icon: 'Histogram',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/job',
    name: 'JobManagement',
    component: () => import('../views/k8s/JobManagement.vue'),
    meta: {
      title: 'Job管理',
      icon: 'List',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/pv',
    name: 'PvManagement',
    component: () => import('../views/k8s/PvManagement.vue'),
    meta: {
      title: 'PV管理',
      icon: 'Coin',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/pvc',
    name: 'PvcManagement',
    component: () => import('../views/k8s/PvcManagement.vue'),
    meta: {
      title: 'PVC管理',
      icon: 'Ticket',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'k8s/storageclass',
    name: 'StorageClassManagement',
    component: () => import('../views/k8s/StorageClassManagement.vue'),
    meta: {
      title: 'SC管理',
      icon: 'Box',
      instanceType: 'kubernetes'
    }
  },
  {
    path: 'settings',
    name: 'Settings',
    component: () => import('../views/es/Settings.vue'),
    meta: {
      title: '系统设置',
      icon: 'Setting'
    }
  },
  // CI/CD Module Routes
  {
    path: 'cicd',
    redirect: '/cicd/pipelines',
    meta: { title: 'CI/CD' } // Add meta if needed for breadcrumbs
  },
  {
    path: 'cicd/pipelines',
    name: 'PipelineList',
    component: () => import('../views/cicd/PipelineList.vue'),
    meta: {
      title: '流水线',
      icon: 'Cpu',
      instanceType: 'cicd' // Special type or global
    }
  },
  {
    path: 'cicd/pipelines/create',
    name: 'PipelineCreate',
    component: () => import('../views/cicd/PipelineEditor.vue'),
    meta: {
      title: '新建流水线',
      hideInMenu: true
    }
  },
  {
    path: 'cicd/pipelines/:id/edit',
    name: 'PipelineEdit',
    component: () => import('../views/cicd/PipelineEditor.vue'),
    meta: {
      title: '编辑流水线',
      hideInMenu: true
    }
  },
  {
    path: 'cicd/runs/:id',
    name: 'PipelineRunDetail',
    component: () => import('../views/cicd/PipelineRunDetail.vue'),
    meta: {
      title: '执行详情',
      hideInMenu: true // Assuming we have such logic or handled by manual menu construction
    }
  }
]

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/system/login/index.vue'),
    meta: {
      title: 'Login',
      title: '登录'
    }
  },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: dashboardRoutes
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

  // Auth Guard
  const token = localStorage.getItem('access_token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

export default router
