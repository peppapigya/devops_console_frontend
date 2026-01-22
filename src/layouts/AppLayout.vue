<template>
  <div class="app-layout">
    <!-- 顶部导航栏 -->
    <div class="top-navbar">
      <!-- Logo 和品牌 -->
      <div class="navbar-brand">
        <div class="logo" @click="handleLogoClick" style="cursor: pointer;">
          <el-icon size="28" color="#1976d2">
            <Monitor/>
          </el-icon>
          <span class="logo-text">devops-console</span>
        </div>
        
        <!-- 实例选择器 -->
        <div class="instance-selector">
          <el-dropdown 
            trigger="click" 
            placement="bottom-start"
            @visible-change="handleDropdownVisible"
          >
            <div class="instance-dropdown-trigger">
              <el-icon :color="getTypeColor(getSelectedInstanceType())">
                <component :is="getTypeIcon(getSelectedInstanceType())" />
              </el-icon>
              <span>{{ selectedInstanceName || '实例管理' }}</span>
              <el-icon class="dropdown-arrow">
                <ArrowDown />
              </el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="instance-management-menu">
                <div class="instance-management-content">
                  <!-- 页面头部 -->
                  <div class="page-header">
                    <h2>实例管理</h2>
                    <div class="header-actions">
                      <el-button type="primary" size="small" @click="handleAddInstance">
                        <el-icon><Plus /></el-icon>
                        添加实例
                      </el-button>
                      <el-button size="small" @click="handleRefreshInstances">
                        <el-icon><Refresh /></el-icon>
                        刷新
                      </el-button>
                    </div>
                  </div>

                  <!-- 搜索和筛选 -->
                  <div class="filter-section">
                    <el-input
                      v-model="searchQuery"
                      placeholder="搜索实例名称或地址"
                      size="small"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                    <el-select v-model="typeFilter" placeholder="类型筛选" size="small" clearable>
                      <el-option 
                        v-for="type in instanceTypes"
                        :key="type.id"
                        :label="type.type_name"
                        :value="type.type_name"
                      />
                    </el-select>
                    <el-select v-model="statusFilter" placeholder="状态筛选" size="small" clearable>
                      <el-option label="活跃" value="active" />
                      <el-option label="非活跃" value="inactive" />
                      <el-option label="错误" value="error" />
                    </el-select>
                  </div>

                  <!-- 实例列表 -->
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
                      <div class="instance-meta">
                        <el-tag 
                          :type="getTypeTagType(instance.instance_type)" 
                          size="small"
                        >
                          {{ getTypeLabel(instance.instance_type) }}
                        </el-tag>
                        <el-tag 
                          :type="getStatusType(instance.status)" 
                          size="small"
                        >
                          {{ getStatusLabel(instance.status) }}
                        </el-tag>
                      </div>
                      <div class="instance-actions">
                        <el-button-group size="small">
                          <el-button @click.stop="handleTestInstance(instance)">
                            <el-icon><Connection /></el-icon>
                          </el-button>
                          <el-button @click.stop="handleEditInstance(instance)">
                            <el-icon><Edit /></el-icon>
                          </el-button>
                          <el-button type="danger" @click.stop="handleDeleteInstance(instance)">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </el-button-group>
                      </div>
                    </div>
                  </div>
                </div>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 水平菜单 -->
      <div class="navbar-menu" ref="menuContainer">
        <el-menu
            :default-active="$route.path"
            mode="horizontal"
            router
            class="horizontal-menu"
        >
          <el-menu-item
              v-for="route in visibleMenuRoutes"
              :key="route.path"
              :index="route.path"
          >
            <el-icon>
              <component :is="route.meta.icon"/>
            </el-icon>
            <template #title>{{ route.meta.title }}</template>
          </el-menu-item>
          
          <!-- 更多菜单 -->
          <el-sub-menu 
              v-if="hiddenMenuRoutes.length > 0"
              index="more"
              class="more-menu"
          >
            <template #title>
              <el-icon><MoreFilled /></el-icon>
              <span>更多</span>
            </template>
            <el-menu-item
                v-for="route in hiddenMenuRoutes"
                :key="route.path"
                :index="route.path"
            >
              <el-icon>
                <component :is="route.meta.icon"/>
              </el-icon>
              <template #title>{{ route.meta.title }}</template>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>

      <!-- 右侧操作区 -->
      <div class="navbar-right">
        <!-- 通知 -->
        <el-badge :value="3" :max="99" class="notification-badge">
          <el-button link class="navbar-action">
            <el-icon size="18">
              <Bell/>
            </el-icon>
          </el-button>
        </el-badge>

        <!-- 用户菜单 -->
        <el-dropdown @command="handleUserCommand">
          <div class="user-avatar">
            <el-avatar size="small">
              <el-icon>
                <User/>
              </el-icon>
            </el-avatar>
            <span class="username">Admin</span>
            <el-icon class="dropdown-icon">
              <ArrowDown/>
            </el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon>
                  <User/>
                </el-icon>
                个人资料
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon>
                  <Setting/>
                </el-icon>
                系统设置
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon>
                  <SwitchButton/>
                </el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 主题切换 -->
        <el-button
            link
            @click="toggleTheme"
            class="navbar-action"
        >
          <el-icon size="18">
            <Sunny v-if="isDark"/>
            <Moon v-else/>
          </el-icon>
        </el-button>
      </div>
    </div>

    <!-- 页面内容 -->
    <div class="page-content">
      <router-view/>
    </div>
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
  DataLine, WarningFilled, Delete, MoreFilled, Box, Files, Folder, FolderOpened, DataBoard, Timer
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 主题状态
const isDark = ref(false)

// 菜单容器引用
const menuContainer = ref(null)
let resizeObserver = null

// 可见和隐藏的菜单项
const visibleMenuRoutes = ref([])
const hiddenMenuRoutes = ref([])

// 所有菜单路由 - 根据实例类型动态返回
const allMenuRoutes = computed(() => {
  const instanceType = getSelectedInstanceType()
  
  // Elasticsearch 菜单
  const esMenus = [
    {path: '/es', meta: {title: 'ES控制台', icon: 'Monitor', instanceType: 'elasticsearch'}},
    {path: '/nodes', meta: {title: '节点管理', icon: 'Connection', instanceType: 'elasticsearch'}},
    {path: '/indices', meta: {title: '索引管理', icon: 'DocumentCopy', instanceType: 'elasticsearch'}},
    {path: '/data', meta: {title: '数据管理', icon: 'DataBoard', instanceType: 'elasticsearch'}},
    {path: '/shards', meta: {title: '分片管理', icon: 'Grid', instanceType: 'elasticsearch'}},
    {path: '/backup', meta: {title: '备份管理', icon: 'FolderOpened', instanceType: 'elasticsearch'}}
  ]
  
  // Kubernetes 菜单
  const k8sMenus = [
    {path: '/k8s', meta: {title: 'K8s控制台', icon: 'Monitor', instanceType: 'kubernetes'}},
    {path: '/k8s/node', meta: {title: '节点管理', icon: 'Monitor', instanceType: 'kubernetes'}},
    {path: '/k8s/pod', meta: {title: 'Pod管理', icon: 'Box', instanceType: 'kubernetes'}},
    {path: '/k8s/deployment', meta: {title: 'Deployment管理', icon: 'Files', instanceType: 'kubernetes'}},
    {path: '/k8s/service', meta: {title: 'Service管理', icon: 'Connection', instanceType: 'kubernetes'}},
    {path: '/k8s/cronjob', meta: {title: 'CronJob管理', icon: 'Timer', instanceType: 'kubernetes'}},
    {path: '/k8s/daemonset', meta: {title: 'DaemonSet管理', icon: 'Monitor', instanceType: 'kubernetes'}},
    {path: '/k8s/job', meta: {title: 'Job管理', icon: 'List', instanceType: 'kubernetes'}},
    {path: '/k8s/namespace', meta: {title: '命名空间管理', icon: 'Folder', instanceType: 'kubernetes'}}
  ]
  
  // 通用菜单
  const commonMenus = [
    {path: '/settings', meta: {title: '系统设置', icon: 'Setting'}}
  ]
  
  // 根据实例类型返回对应的菜单
  if (instanceType === 'kubernetes') {
    return [...k8sMenus, ...commonMenus]
  } else if (instanceType === 'elasticsearch') {
    return [...esMenus, ...commonMenus]
  } else {
    // 默认返回 ES 菜单
    return [...esMenus, ...commonMenus]
  }
})

// 实例选择器相关
const selectedInstance = ref('')
const instanceList = ref([])
const instanceTypes = ref([])
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')

// 计算当前选中实例的名称
const selectedInstanceName = computed(() => {
  if (!selectedInstance.value) return ''
  const instance = instanceList.value.find(item => item.id === selectedInstance.value)
  return instance ? instance.name : ''
})



// 过滤后的实例列表
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

// 选择实例
const selectInstance = (instanceId) => {
  selectedInstance.value = instanceId
  const instance = instanceList.value.find(item => item.id === instanceId)
  if (instance) {
    // 更新全局状态
    setSelectedInstance(instance)
    ElMessage.success(`已选择实例: ${instance.name}`)
    // 重新计算菜单可见性
    nextTick(() => {
      calculateMenuVisibility()
      // 跳转到该类型的第一个菜单项
      const menus = allMenuRoutes.value
      if (menus.length > 0) {
        router.push(menus[0].path)
      }
    })
  }
}

// 添加实例
const handleAddInstance = () => {
  router.push('/instances/add')
}

// 测试实例连接
const handleTestInstance = async (instance) => {
  try {
    const response = await testConnection(instance.id)
    const testData = response.data.test_result
    
    if (testData.test_result === 'success') {
      ElMessage.success(`${instance.name} 连接测试成功 (响应时间: ${testData.response_time}ms)`)
    } else {
      const errorMsg = testData.error_message || '未知错误'
      ElMessage.error(`${instance.name} 连接测试失败: ${errorMsg}`)
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || '连接测试失败'
    ElMessage.error(`${instance.name} 连接测试失败: ${errorMsg}`)
  }
}

// 编辑实例
const handleEditInstance = (instance) => {
  router.push(`/instances/edit/${instance.id}`)
}

// 删除实例
const handleDeleteInstance = async (instance) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除实例 "${instance.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await deleteInstance(instance.id)
    
    if (response.message === '删除成功') {
      ElMessage.success(`实例 "${instance.name}" 删除成功`)
      await fetchInstances() // 重新加载实例列表
    } else {
      const errorMsg = response.data?.message || '删除失败'
      ElMessage.error(errorMsg)
    }
  } catch (error) {
    if (error.message !== 'cancel') {
      const errorMsg = error.response?.data?.message || error.message || '删除失败'
      ElMessage.error('删除失败: ' + errorMsg)
    }
  }
}

// 刷新实例列表
const handleRefreshInstances = async () => {
  await Promise.all([fetchInstances(), fetchInstanceTypes()])
  ElMessage.success('数据已刷新')
}

// 处理下拉框显示状态
const handleDropdownVisible = (visible) => {
  if (visible) {
    Promise.all([fetchInstances(), fetchInstanceTypes()])
  }
}

// 获取实例列表
const fetchInstances = async () => {
  try {
    const response = await getInstanceList({ page: 1, page_size: 100 })
    const listData = response.data?.list || {}
    instanceList.value = listData.data || []
    
    // 如果有实例且未选择实例，默认选择第一个
    if (instanceList.value.length > 0 && !selectedInstance.value) {
      selectedInstance.value = instanceList.value[0].id
      // 同时更新全局状态（但不触发导航）
      const instance = instanceList.value[0]
      setSelectedInstance(instance)
      // 不在这里自动导航，让用户手动选择或通过URL导航
    }
  } catch (error) {
    console.error('获取实例列表失败:', error)
    ElMessage.error('获取实例列表失败')
  }
}

// 获取实例类型列表
const fetchInstanceTypes = async () => {
  try {
    const response = await getInstanceTypes()
    instanceTypes.value = response.data?.instance_types || []
  } catch (error) {
    console.error('获取实例类型失败:', error)
    ElMessage.error('获取实例类型失败')
  }
}

// 类型相关方法
const getTypeIcon = (type) => {
  const icons = {
    elasticsearch: Monitor,
    kibana: DataLine,
    logstash: DocumentCopy,
    filebeat: DocumentCopy,
    metricbeat: DocumentCopy,
    apm: WarningFilled,
    kubernetes: Box
  }
  return icons[type] || Monitor
}

const getTypeColor = (type) => {
  const colors = {
    elasticsearch: '#1976d2',
    kibana: '#4caf50',
    logstash: '#ff9800',
    filebeat: '#f44336',
    metricbeat: '#9c27b0',
    apm: '#795548',
    kubernetes: '#326CE5'
  }
  return colors[type] || '#666'
}

const getStatusType = (status) => {
  const types = {
    active: 'success',
    inactive: 'info',
    error: 'danger'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    active: '活跃',
    inactive: '非活跃',
    error: '错误'
  }
  return labels[status] || status
}

const getTypeLabel = (type) => {
  const labels = {
    elasticsearch: 'Elasticsearch',
    kibana: 'Kibana',
    logstash: 'Logstash',
    filebeat: 'Filebeat',
    metricbeat: 'Metricbeat',
    apm: 'APM',
    kubernetes: 'Kubernetes'
  }
  return labels[type] || type
}

const getTypeTagType = (type) => {
  const types = {
    elasticsearch: 'primary',
    kibana: 'success',
    logstash: 'warning',
    filebeat: 'danger',
    metricbeat: 'info',
    apm: 'info',
    kubernetes: 'primary'
  }
  return types[type] || 'info'
}

// 处理实例选择变化
const handleInstanceChange = (instanceId) => {
  const instance = instanceList.value.find(item => item.id === instanceId)
  if (instance) {
    ElMessage.success(`已切换到实例: ${instance.name}`)
    // 这里可以添加实际的实例切换逻辑
  }
}

// 计算菜单项的可见性 - 使用屏幕宽度作为判断标准
const calculateMenuVisibility = () => {
  const screenWidth = window.innerWidth
  
  // 根据屏幕宽度决定显示哪些菜单项
  if (screenWidth >= 1400) {
    // 超大屏幕：显示所有菜单项
    visibleMenuRoutes.value = [...allMenuRoutes.value]
    hiddenMenuRoutes.value = []
  } else if (screenWidth >= 1200) {
    // 大屏幕：显示前7个菜单项
    visibleMenuRoutes.value = allMenuRoutes.value.slice(0, 7)
    hiddenMenuRoutes.value = allMenuRoutes.value.slice(7)
  } else if (screenWidth >= 992) {
    // 中等屏幕：显示前5个菜单项
    visibleMenuRoutes.value = allMenuRoutes.value.slice(0, 5)
    hiddenMenuRoutes.value = allMenuRoutes.value.slice(5)
  } else if (screenWidth >= 768) {
    // 小屏幕：显示前3个菜单项
    visibleMenuRoutes.value = allMenuRoutes.value.slice(0, 3)
    hiddenMenuRoutes.value = allMenuRoutes.value.slice(3)
  } else {
    // 超小屏幕：只显示第一个菜单项
    visibleMenuRoutes.value = allMenuRoutes.value.slice(0, 1)
    hiddenMenuRoutes.value = allMenuRoutes.value.slice(1)
  }
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 防抖化的菜单可见性计算
const debouncedCalculateMenuVisibility = debounce(calculateMenuVisibility, 100)



// 切换主题
const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  ElMessage.success(`已切换到${isDark.value ? '暗色' : '亮色'}主题`)
}

// Logo点击处理
const handleLogoClick = () => {
  router.push('/')
}

// 用户操作
const handleUserCommand = (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人资料功能待实现')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      ElMessage.success('已退出登录')
      // 这里可以添加退出登录的逻辑
      break
  }
}

// 初始化主题
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

onMounted(() => {
  initTheme()
  fetchInstances() // 获取实例列表
  fetchInstanceTypes() // 获取实例类型列表
  nextTick(() => {
    calculateMenuVisibility()
    // 监听窗口大小变化
    window.addEventListener('resize', debouncedCalculateMenuVisibility)
    
    // 使用ResizeObserver监控菜单容器尺寸变化
    if (menuContainer.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(entries => {
        try {
          for (let entry of entries) {
            // 当容器尺寸发生变化时，重新计算菜单可见性
            calculateMenuVisibility()
          }
        } catch (error) {
          console.error('ResizeObserver错误:', error)
        }
      })
      resizeObserver.observe(menuContainer.value)
    }
  })
  
  // 延迟再次计算，确保DOM完全渲染
  setTimeout(() => {
    calculateMenuVisibility()
  }, 100)
  
  // 额外的延迟计算，确保控制台开关后菜单能正确恢复
  setTimeout(() => {
    calculateMenuVisibility()
  }, 500)
})

// 监听路由变化，重新计算菜单可见性
watch(route, () => {
  nextTick(() => {
    calculateMenuVisibility()
  })
})

// 监听实例列表变化，重新计算菜单可见性
watch(instanceList, () => {
  nextTick(() => {
    calculateMenuVisibility()
  })
}, { deep: true })

// 监听全局选中实例类型变化，重新计算菜单
watch(() => getSelectedInstanceType(), () => {
  nextTick(() => {
    calculateMenuVisibility()
  })
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('resize', debouncedCalculateMenuVisibility)
  
  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  overflow: hidden;
}

.top-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 80px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 100;
}

.top-navbar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--el-border-color), transparent);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.logo::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.logo:hover::before {
  opacity: 1;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all 0.3s ease;
}

.instance-selector {
  display: flex;
  align-items: center;
}

.instance-select {
  width: 260px;
}

.instance-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
}

.instance-dropdown-trigger:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dropdown-arrow {
  margin-left: auto;
  transition: transform 0.2s ease;
}

.instance-management-menu {
  padding: 0 !important;
  border-radius: 12px !important;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
}

.instance-management-content {
  width: 600px;
  max-height: 500px;
  overflow-y: auto;
  background-color: var(--el-bg-color);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.filter-section {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background-color: var(--el-fill-color-light);
}

.filter-section .el-input {
  flex: 1;
}

.filter-section .el-select {
  width: 120px;
}

.instance-list-container {
  padding: 8px;
}

.instance-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  margin-bottom: 4px;
}

.instance-row:hover {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color);
}

.instance-row.selected {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.instance-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.type-icon {
  font-size: 18px;
  padding: 6px;
  border-radius: 6px;
  background-color: var(--el-fill-color);
}

.instance-details {
  flex: 1;
  min-width: 0;
}

.instance-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.instance-address {
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.instance-meta {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.instance-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.instance-row:hover .instance-actions {
  opacity: 1;
}

.instance-select :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.instance-select :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.instance-select :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.instance-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.instance-option .el-icon {
  font-size: 16px;
}

.instance-info {
  flex: 1;
  min-width: 0;
}

.instance-name {
  display: block;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.instance-address {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navbar-menu {
  flex: 1;
  display: flex;
  justify-content: center;
  margin: 0 20px;
}

.horizontal-menu {
  border-bottom: none;
  background-color: transparent;
}

.horizontal-menu :deep(.el-menu-item) {
  padding: 0 20px;
  height: 60px;
  line-height: 60px;
  border-radius: 12px;
  margin: 0 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  font-weight: 500;
}

.horizontal-menu :deep(.el-menu-item::before) {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 0 3px 3px 0;
  transform: translateX(-50%);
  transition: width 0.3s ease;
}

.horizontal-menu :deep(.el-menu-item:hover) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  transform: translateY(-2px);
}

.horizontal-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  color: #667eea;
  font-weight: 600;
}

.horizontal-menu :deep(.el-menu-item.is-active::before) {
  width: 80%;
}

.horizontal-menu :deep(.el-menu-item .el-icon) {
  margin-right: 8px;
  font-size: 16px;
}

/* 更多菜单样式 */
.more-menu :deep(.el-sub-menu__title) {
  padding: 0 12px;
  height: 60px;
  line-height: 60px;
  border-radius: 12px;
  margin: 0 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  font-weight: 500;
  flex-shrink: 0;
  min-width: 60px;
}

.more-menu :deep(.el-sub-menu__title:hover) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  transform: translateY(-2px);
}

.more-menu :deep(.el-sub-menu__title .el-icon) {
  margin-right: 6px;
  font-size: 16px;
}

.more-menu :deep(.el-menu) {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 8px;
  min-width: 160px;
  max-height: 400px;
  overflow-y: auto;
}

.more-menu :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  border-radius: 8px;
  margin: 2px 0;
  padding: 0 16px;
}

.more-menu :deep(.el-menu-item:hover) {
  background-color: var(--el-fill-color-light);
}

.more-menu :deep(.el-menu-item.is-active) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.more-menu :deep(.el-menu-item .el-icon) {
  margin-right: 12px;
  font-size: 16px;
}

/* 菜单容器样式优化 */
.navbar-menu {
  flex: 1;
  display: flex;
  justify-content: center;
  margin: 0 20px;
  min-width: 0; /* 确保可以收缩 */
  overflow: hidden;
}

.horizontal-menu {
  border-bottom: none;
  background-color: transparent;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow-x: auto; /* 允许水平滚动 */
  scrollbar-width: none; /* 隐藏滚动条 - Firefox */
  -ms-overflow-style: none; /* 隐藏滚动条 - IE/Edge */
}

.horizontal-menu::-webkit-scrollbar {
  display: none; /* 隐藏滚动条 - Chrome/Safari/Opera */
}

.horizontal-menu :deep(.el-menu-item) {
  padding: 0 16px;
  height: 60px;
  line-height: 60px;
  border-radius: 12px;
  margin: 0 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 14px;
}

.horizontal-menu :deep(.el-menu-item::before) {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 0 3px 3px 0;
  transform: translateX(-50%);
  transition: width 0.3s ease;
}

.horizontal-menu :deep(.el-menu-item:hover) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  transform: translateY(-2px);
}

.horizontal-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  color: #667eea;
  font-weight: 600;
}

.horizontal-menu :deep(.el-menu-item.is-active::before) {
  width: 80%;
}

.horizontal-menu :deep(.el-menu-item .el-icon) {
  margin-right: 8px;
  font-size: 16px;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.breadcrumb-nav {
  margin-right: 20px;
}

.navbar-action {
  padding: 10px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: transparent;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.navbar-action::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: var(--el-fill-color-light);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.navbar-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.navbar-action:hover::before {
  width: 40px;
  height: 40px;
}

.notification-badge {
  margin-right: 8px;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: transparent;
  border: 1px solid transparent;
  position: relative;
}

.user-avatar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.user-avatar:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-avatar:hover::before {
  opacity: 1;
}

.username {
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  font-weight: 500;
}

.dropdown-icon {
  font-size: 12px;
  color: var(--el-text-color-regular);
  transition: transform 0.2s ease;
}

.user-avatar:hover .dropdown-icon {
  transform: rotate(180deg);
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  overflow: hidden;
  position: relative;
}

/* 确保页面内容填满整个可用空间 */
.page-content > * {
  flex: 1;
  width: 100%;
}



/* 改进的徽章样式 */
.notification-badge :deep(.el-badge__content) {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  border: none;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
}

/* 改进的头像样式 */
.user-avatar :deep(.el-avatar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid var(--el-bg-color);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 响应式设计 */
@media (min-width: 1600px) {
  .navbar-menu {
    margin: 0 30px;
  }
  
  .horizontal-menu :deep(.el-menu-item) {
    padding: 0 20px;
    font-size: 15px;
  }
}

@media (min-width: 1400px) and (max-width: 1599px) {
  .navbar-menu {
    margin: 0 25px;
  }
  
  .horizontal-menu :deep(.el-menu-item) {
    padding: 0 18px;
    font-size: 15px;
  }
}

@media (min-width: 1200px) and (max-width: 1399px) {
  .navbar-menu {
    margin: 0 20px;
  }
  
  .horizontal-menu :deep(.el-menu-item) {
    padding: 0 16px;
    font-size: 14px;
  }
}

@media (max-width: 1199px) and (min-width: 992px) {
  .navbar-brand {
    gap: 14px;
  }
  
  .instance-select {
    width: 200px;
  }
  
  .navbar-menu {
    margin: 0 12px;
  }
  
  .horizontal-menu :deep(.el-menu-item) {
    padding: 0 14px;
    font-size: 14px;
  }
}

@media (max-width: 991px) and (min-width: 768px) {
  .username {
    display: none;
  }
  
  .navbar-brand {
    gap: 12px;
  }
  
  .instance-select {
    width: 180px;
  }
  
  .navbar-menu {
    margin: 0 10px;
  }
  
  .horizontal-menu :deep(.el-menu-item) {
    padding: 0 12px;
    font-size: 13px;
  }
  
  .navbar-right {
    gap: 10px;
  }
  
  .more-menu :deep(.el-sub-menu__title) {
    padding: 0 12px;
  }
}

@media (max-width: 767px) and (min-width: 576px) {
  .top-navbar {
    padding: 0 12px;
    height: 70px;
  }
  
  .navbar-brand {
    gap: 10px;
  }
  
  .instance-select {
    width: 160px;
  }
  
  .logo-text {
    display: none;
  }
  
  .navbar-menu {
    margin: 0 8px;
  }
  
  .horizontal-menu :deep(.el-menu-item) {
    padding: 0 10px;
    font-size: 12px;
  }
  
  .horizontal-menu :deep(.el-menu-item .el-icon) {
    margin-right: 4px;
    font-size: 14px;
  }
  
  .navbar-right {
    gap: 8px;
  }
  
  .more-menu :deep(.el-sub-menu__title) {
    padding: 0 10px;
  }
}

@media (max-width: 575px) {
  .top-navbar {
    padding: 0 8px;
  }
  
  .navbar-brand {
    gap: 8px;
  }
  
  .instance-select {
    width: 120px;
  }
  
  .navbar-menu {
    margin: 0 5px;
  }
  
  .horizontal-menu :deep(.el-menu-item) {
    padding: 0 8px;
    font-size: 12px;
  }
  
  .horizontal-menu :deep(.el-menu-item .el-icon) {
    margin-right: 2px;
    font-size: 12px;
  }
  
  .navbar-right {
    gap: 6px;
  }
  
  .more-menu :deep(.el-sub-menu__title) {
    padding: 0 8px;
  }
  
  .more-menu :deep(.el-sub-menu__title span) {
    display: none;
  }
}

/* 暗色主题样式 */
:global(.dark) .app-layout {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

:global(.dark) .top-navbar {
  background-color: var(--el-bg-color);
  border-bottom-color: var(--el-border-color);
}

:global(.dark) .logo {
  background: linear-gradient(135deg, rgba(159, 168, 218, 0.05) 0%, rgba(179, 157, 219, 0.05) 100%);
}

:global(.dark) .logo::before {
  background: linear-gradient(135deg, rgba(159, 168, 218, 0.1) 0%, rgba(179, 157, 219, 0.1) 100%);
}

/* 暗色主题实例选择器样式 */
:global(.dark) .instance-select :deep(.el-input__wrapper) {
  background-color: var(--el-fill-color);
  border-color: var(--el-border-color);
}

:global(.dark) .instance-select :deep(.el-input__wrapper:hover) {
  border-color: #9fa8da;
  box-shadow: 0 4px 12px rgba(159, 168, 218, 0.2);
}

:global(.dark) .instance-select :deep(.el-input__wrapper.is-focus) {
  border-color: #9fa8da;
  box-shadow: 0 4px 12px rgba(159, 168, 218, 0.3);
}

:global(.dark) .logo-text {
  background: linear-gradient(135deg, #9fa8da 0%, #b39ddb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:global(.dark) .horizontal-menu :deep(.el-menu-item:hover) {
  background: linear-gradient(135deg, rgba(159, 168, 218, 0.1) 0%, rgba(179, 157, 219, 0.1) 100%);
}

:global(.dark) .horizontal-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(159, 168, 218, 0.15) 0%, rgba(179, 157, 219, 0.15) 100%);
  color: #9fa8da;
}

:global(.dark) .horizontal-menu :deep(.el-menu-item::before) {
  background: linear-gradient(90deg, #9fa8da 0%, #b39ddb 100%);
}

/* 暗色主题菜单样式 */
:global(.dark) .horizontal-menu :deep(.el-menu-item:hover) {
  background: linear-gradient(135deg, rgba(159, 168, 218, 0.1) 0%, rgba(179, 157, 219, 0.1) 100%);
}

:global(.dark) .horizontal-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(159, 168, 218, 0.15) 0%, rgba(179, 157, 219, 0.15) 100%);
  color: #9fa8da;
}

:global(.dark) .horizontal-menu :deep(.el-menu-item::before) {
  background: linear-gradient(90deg, #9fa8da 0%, #b39ddb 100%);
}

:global(.dark) .page-content {
  background-color: var(--el-bg-color-page);
}

:global(.dark) .user-avatar::before {
  background: linear-gradient(135deg, rgba(159, 168, 218, 0.1) 0%, rgba(179, 157, 219, 0.1) 100%);
}

:global(.dark) .user-avatar :deep(.el-avatar) {
  background: linear-gradient(135deg, #9fa8da 0%, #b39ddb 100%);
}
</style>