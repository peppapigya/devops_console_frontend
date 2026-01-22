<template>
  <div class="k8s-dashboard">
    <el-card class="page-header-card">
      <div class="page-header">
        <div>
          <h2>Kubernetes 控制台</h2>
          <p>集群概览和资源监控</p>
        </div>
        <div class="header-actions">
          <el-button @click="refreshData" :loading="refreshing">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 核心指标卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon nodes">
              <el-icon size="32"><Monitor /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ clusterMetrics.totalNodes }}</div>
              <div class="metric-label">节点总数</div>
              <div class="metric-sub">就绪: {{ clusterMetrics.readyNodes }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon pods">
              <el-icon size="32"><Box /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ clusterMetrics.totalPods }}</div>
              <div class="metric-label">工作负载</div>
              <div class="metric-sub">Pod: {{ clusterMetrics.totalPods }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon cpu">
              <el-icon size="32"><Cpu /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ clusterMetrics.cpuUsage }}%</div>
              <div class="metric-label">CPU使用率</div>
              <div class="metric-sub">{{ clusterMetrics.cpuAvailable }}核可用 / {{ clusterMetrics.cpuTotal }}核总量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon memory">
              <el-icon size="32"><Memo /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ clusterMetrics.memoryUsage }}%</div>
              <div class="metric-label">内存使用率</div>
              <div class="metric-sub">{{ clusterMetrics.memoryAvailable }}Mi可用 / {{ clusterMetrics.memoryTotal }}Mi总量</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 集群概览 -->
    <el-row :gutter="20" class="overview-row">
      <el-col :span="12">
        <el-card class="cluster-overview-card">
          <template #header>
            <div class="card-header">
              <el-icon><Connection /></el-icon>
              <span>集群概览</span>
            </div>
          </template>
          <div class="cluster-overview">
            <el-empty v-if="clusterList.length === 0" description="暂无集群信息">
              <el-button type="primary" @click="navigateTo('/k8s/cluster')">
                添加集群
              </el-button>
            </el-empty>
            <div v-else class="cluster-list">
              <div v-for="cluster in clusterList" :key="cluster.id" class="cluster-item" @click="viewClusterDetail(cluster)">
                <div class="cluster-info">
                  <div class="cluster-name">{{ cluster.cluster_name }}</div>
                  <div class="cluster-meta">
                    <el-tag :type="cluster.status === 'active' ? 'success' : 'info'" size="small">
                      {{ cluster.status === 'active' ? '已连接' : '未连接' }}
                    </el-tag>
                    <span class="cluster-time">最后同步: {{ cluster.last_sync || '未知' }}</span>
                  </div>
                </div>
                <div class="cluster-actions">
                  <el-button size="small" @click.stop="handleTestConnection(cluster)">
                    <el-icon><View /></el-icon>
                    测试
                  </el-button>
                  <el-button size="small" @click.stop="handleChangeCluster(cluster)">
                    <el-icon><RefreshRight /></el-icon>
                    切换
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="workload-card">
          <template #header>
            <div class="card-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>工作负载统计</span>
            </div>
          </template>
          <div class="workload-stats">
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-icon deployment">
                  <el-icon><Files /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ workloadStats.deployments }}</div>
                  <div class="stat-name">Deployments</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon statefulset">
                  <el-icon><Collection /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ workloadStats.statefulSets }}</div>
                  <div class="stat-name">StatefulSets</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon daemonset">
                  <el-icon><Operation /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ workloadStats.daemonSets }}</div>
                  <div class="stat-name">DaemonSets</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon job">
                  <el-icon><Timer /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ workloadStats.jobs }}</div>
                  <div class="stat-name">Jobs</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon total-pods">
                  <el-icon><Box /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ workloadStats.totalPods }}</div>
                  <div class="stat-name">总Pod数</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon running-pods">
                  <el-icon><VideoPlay /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ workloadStats.runningPods }}</div>
                  <div class="stat-name">运行中Pod</div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快速操作和资源状态 -->
    <el-row :gutter="20" class="actions-row">
      <el-col :span="12">
        <el-card class="quick-actions-card">
          <template #header>
            <div class="card-header">
              <el-icon><Menu /></el-icon>
              <span>快速操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="navigateTo('/k8s/cluster')">
              <el-icon><Setting /></el-icon>
              管理集群
            </el-button>
            <el-button type="success" @click="navigateTo('/k8s/pod')">
              <el-icon><Box /></el-icon>
              管理 Pod
            </el-button>
            <el-button type="warning" @click="navigateTo('/k8s/deployment')">
              <el-icon><Files /></el-icon>
              管理 Deployment
            </el-button>
            <el-button type="info" @click="navigateTo('/k8s/namespace')">
              <el-icon><Folder /></el-icon>
              管理命名空间
            </el-button>
            <el-button type="danger" @click="navigateTo('/k8s/service')">
              <el-icon><Connection /></el-icon>
              管理 Service
            </el-button>
            <el-button type="primary" plain @click="navigateTo('/k8s/cronjob')">
              <el-icon><Clock /></el-icon>
              管理 CronJob
            </el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="resource-status-card">
          <template #header>
            <div class="card-header">
              <el-icon><Monitor /></el-icon>
              <span>资源状态</span>
            </div>
          </template>
          <div class="resource-status">
            <div class="status-item">
              <div class="status-indicator healthy"></div>
              <div class="status-info">
                <div class="status-label">健康节点</div>
                <div class="status-value">{{ resourceStatus.healthyNodes }}/{{ resourceStatus.totalNodes }}</div>
              </div>
            </div>
            <div class="status-item">
              <div class="status-indicator warning"></div>
              <div class="status-info">
                <div class="status-label">警告Pod</div>
                <div class="status-value">{{ resourceStatus.warningPods }}</div>
              </div>
            </div>
            <div class="status-item">
              <div class="status-indicator error"></div>
              <div class="status-info">
                <div class="status-label">失败Pod</div>
                <div class="status-value">{{ resourceStatus.failedPods }}</div>
              </div>
            </div>
            <div class="status-item">
              <div class="status-indicator pending"></div>
              <div class="status-info">
                <div class="status-label">待处理</div>
                <div class="status-value">{{ resourceStatus.pendingPods }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 存储信息 -->
    <el-row :gutter="20" class="storage-row">
      <el-col :span="24">
        <el-card class="storage-card">
          <template #header>
            <div class="card-header">
              <el-icon><FolderOpened /></el-icon>
              <span>存储信息</span>
            </div>
          </template>
          <div class="storage-stats">
            <div class="storage-item">
              <div class="storage-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="storage-info">
                <div class="storage-value">{{ storageInfo.totalPV }}</div>
                <div class="storage-label">PV总数</div>
              </div>
            </div>
            <div class="storage-item">
              <div class="storage-icon">
                <el-icon><Folder /></el-icon>
              </div>
              <div class="storage-info">
                <div class="storage-value">{{ storageInfo.totalPVC }}</div>
                <div class="storage-label">PVC总数</div>
              </div>
            </div>
            <div class="storage-item">
              <div class="storage-icon">
                <el-icon><Coin /></el-icon>
              </div>
              <div class="storage-info">
                <div class="storage-value">{{ storageInfo.storageClasses }}</div>
                <div class="storage-label">存储类</div>
              </div>
            </div>
            <div class="storage-item">
              <div class="storage-icon">
                <el-icon><PieChart /></el-icon>
              </div>
              <div class="storage-info">
                <div class="storage-value">{{ storageInfo.usedStorage }}Gi</div>
                <div class="storage-label">已用存储</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Monitor, Box, Files, Connection, Setting, Folder, Refresh, Cpu, Memo,
  DataAnalysis, Collection, Operation, Timer, VideoPlay, Menu, Clock,
  FolderOpened, Document, Coin, PieChart, View, RefreshRight
} from '@element-plus/icons-vue'
import { getClusterList, changeCluster, testClusterConnection } from '@/api/k8s/cluster'
import { getClusterMetrics, getClusterInfo } from '@/api/k8s/cluster-info'
import { getSelectedInstanceId } from '@/stores/instanceStore'
import eventBus from '@/utils/eventBus'

const router = useRouter()
const refreshing = ref(false)

// 集群指标数据
const clusterMetrics = ref({
  totalNodes: 0,
  readyNodes: 0,
  totalPods: 0,
  cpuUsage: 0,
  cpuAvailable: 0,
  cpuTotal: 0,
  memoryUsage: 0,
  memoryAvailable: 0,
  memoryTotal: 0
})

// 工作负载统计
const workloadStats = ref({
  deployments: 0,
  statefulSets: 0,
  daemonSets: 0,
  jobs: 0,
  totalPods: 0,
  runningPods: 0
})

// 资源状态
const resourceStatus = ref({
  totalNodes: 0,
  healthyNodes: 0,
  warningPods: 0,
  failedPods: 0,
  pendingPods: 0
})

// 存储信息
const storageInfo = ref({
  totalPV: 0,
  totalPVC: 0,
  storageClasses: 0,
  usedStorage: 0
})

const clusterList = ref([])

// 集群信息
const clusterInfo = ref({})

const navigateTo = (path) => {
  router.push(path)
}

const viewClusterDetail = (cluster) => {
  router.push(`/k8s/cluster/${cluster.cluster_name}`)
}

const refreshData = async () => {
  refreshing.value = true
  try {
    await fetchDashboardData()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败: ' + (error.message || '未知错误'))
  } finally {
    refreshing.value = false
  }
}

const handleChangeCluster = async (cluster) => {
  try {
    await changeCluster(cluster.cluster_name)
    ElMessage.success(`已切换到集群: ${cluster.cluster_name}`)
    await fetchDashboardData()
  } catch (error) {
    ElMessage.error('切换集群失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  }
}

const handleTestConnection = async (cluster) => {
  try {
    await testClusterConnection(cluster.cluster_name)
    ElMessage.success(`集群 ${cluster.cluster_name} 连接正常`)
  } catch (error) {
    ElMessage.error('连接测试失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  }
}

const fetchDashboardData = async () => {
  try {
    const instanceId = getSelectedInstanceId() || '1'
    const response = await getClusterList(instanceId)
    console.log('集群列表响应:', response)
    clusterList.value = response.data?.clasters || []

    // 获取集群基本信息
    const infoResponse = await getClusterInfo(instanceId)
    console.log('集群信息响应:', infoResponse)
    clusterInfo.value = infoResponse.data?.clusterInfo || {}

    // 获取集群指标数据
    const metricsResponse = await getClusterMetrics(instanceId)
    const metrics = metricsResponse.data?.metrics
    
    if (metrics) {
      clusterMetrics.value = {
        totalNodes: metrics.totalNodes,
        readyNodes: metrics.readyNodes,
        totalPods: metrics.totalPods,
        cpuUsage: metrics.cpuUsage,
        cpuAvailable: metrics.cpuAvailable,
        cpuTotal: metrics.cpuTotal,
        memoryUsage: metrics.memoryUsage,
        memoryAvailable: metrics.memoryAvailable,
        memoryTotal: metrics.memoryTotal
      }

      workloadStats.value = metrics.workloadStats
      storageInfo.value = metrics.storageInfo

      // 计算资源状态
      resourceStatus.value = {
        totalNodes: metrics.totalNodes,
        healthyNodes: metrics.readyNodes,
        warningPods: 1, // 这些需要从Pod状态中计算
        failedPods: 0,
        pendingPods: metrics.totalPods - metrics.workloadStats.runningPods
      }
    }

  } catch (error) {
    console.error('获取仪表板数据失败:', error)
    console.error('错误详情:', error.response?.data)
    ElMessage.error('获取数据失败: ' + (error.message || '未知错误'))
  }
}

// 监听Pod操作事件
const handlePodEvent = () => {
  console.log('检测到Pod操作，刷新仪表板数据')
  fetchDashboardData()
}

onMounted(() => {
  fetchDashboardData()
  
  // 添加事件监听器
  eventBus.on('pod:created', handlePodEvent)
  eventBus.on('pod:deleted', handlePodEvent)
})

onUnmounted(() => {
  // 组件卸载时移除事件监听器
  eventBus.off('pod:created', handlePodEvent)
  eventBus.off('pod:deleted', handlePodEvent)
})
</script>

<style scoped>
.k8s-dashboard {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2d3748;
}

.page-header p {
  margin: 0;
  color: #718096;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: none;
  height: 120px;
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
}

.metric-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.metric-icon.nodes {
  background: linear-gradient(135deg, #6b46c1 0%, #9333ea 100%);
}

.metric-icon.pods {
  background: linear-gradient(135deg, #ed64a6 0%, #f472b6 100%);
}

.metric-icon.cpu {
  background: linear-gradient(135deg, #3182ce 0%, #60a5fa 100%);
}

.metric-icon.memory {
  background: linear-gradient(135deg, #38a169 0%, #4ade80 100%);
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #1a1a1a;
  line-height: 1.2;
}

.metric-label {
  font-size: 14px;
  color: #4a5568;
  margin: 4px 0;
}

.metric-sub {
  font-size: 12px;
  color: #a0aec0;
}

.overview-row {
  margin-bottom: 20px;
}

.cluster-overview-card,
.workload-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: none;
  height: 300px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2d3748;
  font-size: 16px;
}

.cluster-list {
  max-height: 220px;
  overflow-y: auto;
}

.cluster-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cluster-item:hover {
  background-color: #f8f9fa;
}

.cluster-item:last-child {
  border-bottom: none;
}

.cluster-info {
  flex: 1;
}

.cluster-name {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 4px;
}

.cluster-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cluster-time {
  font-size: 12px;
  color: #a0aec0;
}

.cluster-actions {
  display: flex;
  gap: 8px;
}

.workload-stats {
  padding: 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.deployment {
  background: #3182ce;
}

.stat-icon.statefulset {
  background: #38a169;
}

.stat-icon.daemonset {
  background: #dd6b20;
}

.stat-icon.job {
  background: #e53e3e;
}

.stat-icon.total-pods {
  background: #718096;
}

.stat-icon.running-pods {
  background: #38a169;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 18px;
  font-weight: bold;
  color: #1a1a1a;
}

.stat-name {
  font-size: 12px;
  color: #666666;
}

.actions-row {
  margin-bottom: 20px;
}

.quick-actions-card,
.resource-status-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: none;
  height: 280px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
}

.quick-actions .el-button {
  height: 60px;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.resource-status {
  padding: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.status-item:last-child {
  border-bottom: none;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.healthy {
  background-color: #38a169;
}

.status-indicator.warning {
  background-color: #dd6b20;
}

.status-indicator.error {
  background-color: #e53e3e;
}

.status-indicator.pending {
  background-color: #718096;
}

.status-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 14px;
  color: #4a5568;
}

.status-value {
  font-size: 16px;
  font-weight: bold;
  color: #1a1a1a;
}

.storage-row {
  margin-bottom: 20px;
}

.storage-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: none;
}

.storage-stats {
  display: flex;
  gap: 24px;
  padding: 16px;
}

.storage-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.storage-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.storage-info {
  display: flex;
  flex-direction: column;
}

.storage-value {
  font-size: 24px;
  font-weight: bold;
  color: #1a1a1a;
}

.storage-label {
  font-size: 14px;
  color: #666666;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .metrics-row .el-col {
    margin-bottom: 16px;
  }
  
  .overview-row .el-col {
    margin-bottom: 16px;
  }
  
  .actions-row .el-col {
    margin-bottom: 16px;
  }
  
  .stat-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .storage-stats {
    flex-direction: column;
    gap: 16px;
  }
  
  .cluster-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .cluster-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
