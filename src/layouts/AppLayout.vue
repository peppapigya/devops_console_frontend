<template>
  <div class="app-layout">
    <!-- 左侧边栏 -->
    <aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }">
      <!-- Logo -->
      <div class="sidebar-header" @click="handleLogoClick">
        <div class="logo-icon">
          <el-icon size="24" color="#fff">
            <Monitor />
          </el-icon>
        </div>
        <transition name="fade">
          <span v-if="!isCollapsed" class="logo-text">DevOps Console</span>
        </transition>
      </div>

      <!-- 垂直菜单 -->
      <el-scrollbar class="sidebar-menu-container">
        <el-menu
          :default-active="$route.path"
          class="sidebar-menu"
          :collapse="isCollapsed"
          background-color="transparent"
          text-color="#a0a0b0"
          active-text-color="#fff"
          unique-opened
          router
        >
          <template v-for="route in allMenuRoutes" :key="route.path || route.meta.title">
            <!-- 有子菜单的情况 -->
            <el-sub-menu v-if="route.children && route.children.length > 0" :index="route.path || route.meta.title">
              <template #title>
                <el-icon><component :is="route.meta.icon" /></el-icon>
                <span>{{ route.meta.title }}</span>
              </template>
              <el-menu-item 
                v-for="child in route.children" 
                :key="child.path" 
                :index="child.path"
              >
                <el-icon v-if="child.meta.icon"><component :is="child.meta.icon" /></el-icon>
                <template #title>{{ child.meta.title }}</template>
              </el-menu-item>
            </el-sub-menu>

            <!-- 无子菜单的情况 -->
            <el-menu-item v-else :index="route.path">
              <el-icon><component :is="route.meta.icon" /></el-icon>
              <template #title>
                <span>{{ route.meta.title }}</span>
              </template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
      
      <!-- 底部折叠按钮 -->
      <div class="sidebar-footer" @click="toggleCollapse">
        <el-icon :size="20" color="#a0a0b0">
          <Expand v-if="isCollapsed" />
          <Fold v-else />
        </el-icon>
      </div>
    </aside>

    <!-- 右侧主体内容 -->
    <main class="main-content">
<!-- ... (Existing Header and Content Wrapper code remains unchanged up to script) ... -->
<!-- However, since replace_file_content expects contiguous blocks, I have to be careful. --> 
<!-- If I am just replacing the menu area and data, I should do it in two chunks or use multi_replace. -->
<!-- But wait, I need to replace the TEMPLATE part and the SCRIPT part. replace_file_content only does one block. -->
<!-- I will use multi_replace_file_content. -->
      <!-- 顶部 Header -->
      <header class="top-header">
        <!-- 左侧：面包屑或当前路径标题 (可选) -->
        <div class="header-left">
           <!-- 实例选择器 (从旧版迁移过来) -->
           <div class="instance-selector">
              <el-dropdown 
                trigger="click" 
                placement="bottom-start"
                @visible-change="handleDropdownVisible"
              >
                <div class="instance-dropdown-trigger">
                  <div class="trigger-icon-box" :style="{ background: getTypeColor(getSelectedInstanceType()) + '20' }">
                     <el-icon :color="getTypeColor(getSelectedInstanceType())">
                        <component :is="getTypeIcon(getSelectedInstanceType())" />
                      </el-icon>
                  </div>
                  <div class="trigger-info">
                    <span class="trigger-label">当前实例</span>
                    <span class="trigger-value">{{ selectedInstanceName || '选择实例' }}</span>
                  </div>
                  <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
                </div>
                <!-- 保持原有的 Dropdown Menu 内容不变 -->
                <template #dropdown>
                  <el-dropdown-menu class="instance-management-menu">
                    <!-- ... 实例管理下拉内容保持不变，复用原有逻辑 ... -->
                    <div class="instance-management-content">
                      <div class="page-header">
                        <h2>实例管理</h2>
                        <div class="header-actions">
                          <el-button size="small" @click="$router.push('/instances')">
                             <el-icon><List /></el-icon>实例列表
                          </el-button>
                          <el-button type="primary" size="small" @click="handleAddInstance">
                            <el-icon><Plus /></el-icon>添加实例
                          </el-button>
                          <el-button size="small" @click="handleRefreshInstances">
                            <el-icon><Refresh /></el-icon>刷新
                          </el-button>
                        </div>
                      </div>
                      
                      <div class="filter-section">
                        <el-input v-model="searchQuery" placeholder="搜索实例..." size="small" clearable>
                           <template #prefix><el-icon><Search /></el-icon></template>
                        </el-input>
                        <el-select v-model="typeFilter" placeholder="类型" size="small" clearable>
                           <el-option v-for="t in instanceTypes" :key="t.id" :label="t.type_name" :value="t.type_name" />
                        </el-select>
                         <el-select v-model="statusFilter" placeholder="状态" size="small" clearable>
                          <el-option label="活跃" value="active" />
                          <el-option label="非活跃" value="inactive" />
                          <el-option label="错误" value="error" />
                        </el-select>
                      </div>

                      <div class="instance-list-container">
                        <div
                          v-for="instance in filteredInstanceList"
                          :key="instance.id"
                          class="instance-row"
                          :class="{ 'selected': selectedInstance === instance.id }"
                          @click="selectInstance(instance.id)"
                        >
                           <div class="instance-info">
                              <el-icon class="type-icon" :color="getTypeColor(instance.instance_type)">
                                <component :is="getTypeIcon(instance.instance_type)" />
                              </el-icon>
                              <div class="instance-details">
                                <div class="instance-name">{{ instance.name }}</div>
                                <div class="instance-address">{{ instance.address }}</div>
                              </div>
                           </div>
                           <div class="instance-actions">
                               <el-tag :type="getStatusType(instance.status)" size="small" effect="plain">{{ getStatusLabel(instance.status) }}</el-tag>
                           </div>
                        </div>
                      </div>
                    </div>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
           </div>
        </div>

        <!-- 右侧：全局操作 -->
        <div class="header-right">
           <!-- 通知 -->
           <el-tooltip content="通知" effect="dark" placement="bottom">
              <el-badge :value="3" :max="99" class="action-item">
                <el-icon size="20"><Bell /></el-icon>
              </el-badge>
           </el-tooltip>

           <!-- 主题切换 -->
           <el-tooltip :content="isDark ? '切换亮色' : '切换暗色'" effect="dark" placement="bottom">
             <div class="action-item" @click="toggleTheme">
                <el-icon size="20">
                  <Sunny v-if="isDark"/>
                  <Moon v-else/>
                </el-icon>
             </div>
           </el-tooltip>

           <!-- 用户菜单 -->
           <el-dropdown @command="handleUserCommand" trigger="click">
              <div class="user-profile">
                <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
                <span class="user-name">Admin</span>
                <el-icon><CaretBottom /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu class="user-dropdown">
                  <div class="user-dropdown-header">
                    <p class="name">Administrator</p>
                    <p class="role">超级管理员</p>
                  </div>
                  <el-dropdown-item command="profile" divided><el-icon><User /></el-icon>个人中心</el-dropdown-item>
                  <el-dropdown-item command="settings"><el-icon><Setting /></el-icon>系统设置</el-dropdown-item>
                  <el-dropdown-item command="logout" divided style="color: #f56c6c;"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
           </el-dropdown>
        </div>
      </header>

      <!-- 页面内容区 -->
      <div class="content-wrapper">
         <router-view v-slot="{ Component }">
            <transition name="fade-transform" mode="out-in">
               <component :is="Component" />
            </transition>
         </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, nextTick, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {getInstanceList, deleteInstance, testConnection, getInstanceTypes} from '@/api/instance.js'
import { setSelectedInstance, getSelectedInstanceType } from '@/stores/instanceStore.js'
import {
  Monitor, Bell, User, ArrowDown, Setting, SwitchButton,
  Sunny, Moon, House, DocumentCopy, Grid, CopyDocument, TrendCharts,
  Connection, Plus, List, Search, Refresh, Edit, ArrowRight,
  DataLine, WarningFilled, Delete, MoreFilled, Box, Files, Folder, FolderOpened, DataBoard, Timer,
  Expand, Fold, CaretBottom, Cpu, Coin, Ticket, Share, Operation, Document, Key, BellFilled, Histogram
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 状态
const isDark = ref(false)
const isCollapsed = ref(false)
const selectedInstance = ref('')
const instanceList = ref([])
const instanceTypes = ref([])
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')

// 获取所有菜单路由
const allMenuRoutes = computed(() => {
  const instanceType = getSelectedInstanceType()

  // Elasticsearch 菜单
  const esMenus = [
    {path: '/es', meta: {title: 'ES控制台', icon: 'Monitor', instanceType: 'elasticsearch'}},
    {
      path: 'es-cluster', 
      meta: {title: '集群管理', icon: 'Connection'},
      children: [
        {path: '/nodes', meta: {title: '节点管理', icon: 'Connection', instanceType: 'elasticsearch'}},
        {path: '/shards', meta: {title: '分片管理', icon: 'Grid', instanceType: 'elasticsearch'}},
      ]
    },
    {
      path: 'es-data',
      meta: {title: '数据管理', icon: 'DataBoard'},
      children: [
        {path: '/indices', meta: {title: '索引管理', icon: 'DocumentCopy', instanceType: 'elasticsearch'}},
        {path: '/data', meta: {title: '数据查询', icon: 'Search', instanceType: 'elasticsearch'}}, // Changed title for clarity
        {path: '/backup', meta: {title: '备份管理', icon: 'FolderOpened', instanceType: 'elasticsearch'}}
      ]
    }
  ]

  // Kubernetes 菜单
  const k8sMenus = [
    {path: '/k8s', meta: {title: 'K8s概览', icon: 'Monitor', instanceType: 'kubernetes'}},
    {
      path: 'k8s-cluster',
      meta: {title: '集群管理', icon: 'Connection'},
      children: [
         {path: '/k8s/node', meta: {title: '节点管理', icon: 'Monitor', instanceType: 'kubernetes'}},
         {path: '/k8s/namespace', meta: {title: '命名空间', icon: 'Folder', instanceType: 'kubernetes'}}
      ]
    },
    {
      path: 'k8s-workload',
      meta: {title: '工作负载', icon: 'Box'},
      children: [
        {path: '/k8s/pod', meta: {title: 'Pod管理', icon: 'Box', instanceType: 'kubernetes'}},
        {path: '/k8s/deployment', meta: {title: 'Deployments', icon: 'Files', instanceType: 'kubernetes'}},
        {path: '/k8s/daemonset', meta: {title: 'DaemonSets', icon: 'Monitor', instanceType: 'kubernetes'}},
        {path: '/k8s/job', meta: {title: 'Jobs', icon: 'List', instanceType: 'kubernetes'}},
        {path: '/k8s/cronjob', meta: {title: 'CronJobs', icon: 'Timer', instanceType: 'kubernetes'}},
      ]
    },
    {
      path: 'k8s-storage',
      meta: {title: '存储管理', icon: 'Coin'},
      children: [
        {path: '/k8s/pv', meta: {title: 'PV管理', icon: 'Coin', instanceType: 'kubernetes'}},
        {path: '/k8s/pvc', meta: {title: 'PVC管理', icon: 'Ticket', instanceType: 'kubernetes'}},
        {path: '/k8s/storageclass', meta: {title: 'StorageClass', icon: 'Box', instanceType: 'kubernetes'}},
      ]
    },
    {
       path: 'k8s-network',
       meta: {title: '服务发现', icon: 'Connection'},
       children: [
         {path: '/k8s/service', meta: {title: 'Services', icon: 'Connection', instanceType: 'kubernetes'}},
         {path: '/k8s/ingress', meta: {title: 'Ingress', icon: 'Share', instanceType: 'kubernetes'}},
         {path: '/k8s/ingressclass', meta: {title: 'IngressClass', icon: 'Operation', instanceType: 'kubernetes'}},
       ]
    },
    {
       path: 'k8s-config',
       meta: {title: '配置管理', icon: 'Document'},
       children: [
         {path: '/k8s/configmap', meta: {title: 'ConfigMap', icon: 'Document', instanceType: 'kubernetes'}},
         {path: '/k8s/secret', meta: {title: 'Secret', icon: 'Key', instanceType: 'kubernetes'}},
       ]
    },
    {
       path: 'k8s-monitoring',
       meta: {title: '监控与事件', icon: 'BellFilled'},
       children: [
         {path: '/k8s/event', meta: {title: '事件管理', icon: 'BellFilled', instanceType: 'kubernetes'}},
       ]
    },
    {
      path: 'helm',
      meta: {title: 'Helm 应用商店', icon: 'ShoppingCart'},
      children: [
        {path: '/helm/repos', meta: {title: 'Helm仓库', icon: 'Box', instanceType: 'kubernetes'}},
        {path: '/helm/store', meta: {title: '应用商店', icon: 'ShoppingCart', instanceType: 'kubernetes'}},
        {path: '/helm/installed', meta: {title: '已安装应用', icon: 'Histogram', instanceType: 'kubernetes'}},
      ]
    }
  ]

  // 通用菜单
  const commonMenus = [
    {path: '/settings', meta: {title: '系统设置', icon: 'Setting'}}
  ]

  // CI/CD 菜单
  const cicdMenus = [
      {
          path: '/cicd/pipelines', 
          meta: { title: 'CI/CD 流水线', icon: 'Cpu' }
      }
  ]

  if (instanceType === 'kubernetes') {
    return [...k8sMenus, ...cicdMenus, ...commonMenus]
  } else if (instanceType === 'elasticsearch') {
    return [...esMenus, ...commonMenus]
  } else {
    // 默认返回 ES 菜单
    return [...esMenus, ...commonMenus]
  }
})

// 计算选中实例名称
const selectedInstanceName = computed(() => {
  if (!selectedInstance.value) return ''
  const instance = instanceList.value.find(item => item.id === selectedInstance.value)
  return instance ? instance.name : ''
})

// 过滤实例列表
const filteredInstanceList = computed(() => {
  let result = [...instanceList.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(instance => 
      instance.name.toLowerCase().includes(query) ||
      instance.address.toLowerCase().includes(query)
    )
  }
  if (typeFilter.value) {
    result = result.filter(instance => instance.instance_type === typeFilter.value)
  }
  if (statusFilter.value) {
    result = result.filter(instance => instance.status === statusFilter.value)
  }
  return result
})

// === 方法 ===

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

const handleLogoClick = () => {
  router.push('/')
}

const handleUserCommand = (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人资料功能待实现')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      ElMessage.success('已退出登录')
      router.push('/login')
      break
  }
}

// 实例管理相关
const selectInstance = (instanceId) => {
  selectedInstance.value = instanceId
  const instance = instanceList.value.find(item => item.id === instanceId)
  if (instance) {
    setSelectedInstance(instance)
    ElMessage.success(`已切换到: ${instance.name}`)
    // Reset route logic if needed
    const menus = allMenuRoutes.value
    if (menus.length > 0) {
       router.push(menus[0].path)
    }
  }
}

const handleAddInstance = () => {
  router.push('/instances/add')
}

const handleRefreshInstances = async () => {
  await Promise.all([fetchInstances(), fetchInstanceTypes()])
  ElMessage.success('数据已刷新')
}

const handleDropdownVisible = (visible) => {
  if (visible) {
    Promise.all([fetchInstances(), fetchInstanceTypes()])
  }
}

// Data fetching
const fetchInstances = async () => {
  try {
    const response = await getInstanceList({ page: 1, page_size: 100 })
    const listData = response.data?.list || {}
    instanceList.value = listData.data || []
    
    if (instanceList.value.length > 0 && !selectedInstance.value) {
      selectedInstance.value = instanceList.value[0].id
      const instance = instanceList.value[0]
      setSelectedInstance(instance)
    }
  } catch (error) {
    console.error('获取实例列表失败:', error)
  }
}

const fetchInstanceTypes = async () => {
  try {
    const response = await getInstanceTypes()
    instanceTypes.value = response.data?.instance_types || []
  } catch (error) {
    console.error('获取类型失败:', error)
  }
}

// Utility
const getTypeIcon = (type) => {
  const icons = {
    elasticsearch: Monitor, kubernetes: Box, kibana: DataLine, 
    logstash: DocumentCopy, filebeat: DocumentCopy, metricbeat: DocumentCopy, apm: WarningFilled
  }
  return icons[type] || Monitor
}

const getTypeColor = (type) => {
  const colors = {
    elasticsearch: '#005FD4', kubernetes: '#326CE5', kibana: '#00BFB3',
    logstash: '#FEC514', filebeat: '#00BFB3', metricbeat: '#00BFB3', apm: '#8A0A4A'
  }
  return colors[type] || '#666'
}

const getStatusType = (status) => ({ active: 'success', inactive: 'info', error: 'danger' }[status] || 'info')
const getStatusLabel = (status) => ({ active: '活跃', inactive: '非活跃', error: '异常' }[status] || status)

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
  fetchInstances()
  fetchInstanceTypes()
})

// Watchers
watch(() => getSelectedInstanceType(), () => {
  // Instance Type change might trigger menu refresh automatically via computed
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #f4f6f9;
  overflow: hidden;
}

/* Sidebar Styling */
.sidebar {
  width: 260px;
  background: #1e1e2d;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4px 0 24px rgba(0,0,0,0.1);
  z-index: 200;
  flex-shrink: 0;
}

.sidebar.is-collapsed {
  width: 64px;
}

.sidebar-header {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  overflow: hidden;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #005FD4, #326CE5);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.sidebar-menu-container {
  flex: 1;
}

.sidebar-menu {
  border-right: none;
  padding: 10px 0;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  margin: 4px 12px;
  border-radius: 8px;
  width: auto;
}

:deep(.el-menu-item.is-active) {
  background: rgba(50, 108, 229, 0.1) !important;
  color: #6993FF !important;
  font-weight: 500;
}

:deep(.el-menu-item:hover) {
  background-color: rgba(255,255,255,0.03) !important;
  color: #fff !important;
}

.sidebar-footer {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-footer:hover {
  background: rgba(255,255,255,0.03);
}

/* Main Content Styling */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f4f6f9; /* Light mode bg */
}

/* Top Header */
.top-header {
  height: 70px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.instance-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  min-width: 200px;
}

.instance-dropdown-trigger:hover {
  border-color: #409eff;
  background: #f9faff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.trigger-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.instance-dropdown-trigger:hover .trigger-icon-box {
  transform: scale(1.05);
}

.trigger-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
}

.trigger-label {
  font-size: 11px;
  color: #909399;
  line-height: 1.2;
}

.trigger-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.dropdown-arrow {
  margin-left: 8px;
  color: #c0c4cc;
  transition: transform 0.3s;
}

.instance-dropdown-trigger:hover .dropdown-arrow {
  color: #409eff;
  transform: rotate(180deg);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-item {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  cursor: pointer;
  transition: background 0.2s;
}

.action-item:hover {
  background: #f2f3f5;
  color: #303133;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-profile:hover {
  background: #f2f3f5;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

/* Dropdown Custom Styles */
.user-dropdown-header {
  padding: 16px 20px;
  border-bottom: 1px solid #EBEEF5;
  margin-bottom: 4px;
}

.user-dropdown-header .name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  margin-bottom: 4px;
}

.user-dropdown-header .role {
  font-size: 12px;
  color: #909399;
}

/* Instance Menu Styles - Copied/Adpated from old layout */
.instance-management-content {
  width: 400px;
  padding: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 { font-size: 16px; margin: 0; }
.filter-section { display: flex; gap: 8px; margin-bottom: 12px; }
.instance-list-container { max-height: 300px; overflow-y: auto; }
.instance-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;
}
.instance-row:hover { background: #f5f7fa; }
.instance-row.selected { background: #ecf5ff; }
.instance-info { display: flex; align-items: center; gap: 10px; }
.instance-details .instance-name { font-weight: 500; font-size: 14px; }
.instance-details .instance-address { font-size: 12px; color: #909399; }

/* Content Wrapper */
.content-wrapper {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-transform-enter-active, .fade-transform-leave-active { transition: all 0.3s; }
.fade-transform-enter-from { opacity: 0; transform: translateX(10px); }
.fade-transform-leave-to { opacity: 0; transform: translateX(-10px); }

/* Dark Mode Overrides */
html.dark .sidebar { background: #18181c; } /* Darker sidebar */
html.dark .main-content { background: #121212; }
html.dark .top-header {
  background: #1e1e2d;
  border-bottom-color: #303030;
}
html.dark .instance-dropdown-trigger {
  background: #262734;
  border-color: #262734;
}
html.dark .instance-dropdown-trigger:hover {
  background: #30303d;
  border-color: #3e3e4a;
}
html.dark .trigger-label { color: #8d90a1; }
html.dark .trigger-value { color: #e1e1e1; }
html.dark .search-input :deep(.el-input__wrapper) { background-color: #262734; box-shadow: none; }
html.dark .action-item { color: #a0a0b0; }
html.dark .action-item:hover { background: #2a2a35; color: #fff; }
html.dark .user-name { color: #e1e1e1; }
html.dark .user-profile:hover { background: #2a2a35; }
</style>