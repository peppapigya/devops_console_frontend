<template>
  <div class="es-dashboard" v-loading="loading">
    <!-- 页面标题 -->
    <div class="page-title">
      <div class="title-header">
        <h1>Elasticsearch 控制台</h1>
      </div>
    </div>

    <!-- 统计卡片区域 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon green">
              <el-icon size="24"><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.activeNodes }}</div>
              <div class="stat-label">活跃节点</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon blue">
              <el-icon size="24"><DocumentCopy /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.totalIndices }}</div>
              <div class="stat-label">索引总数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon orange">
              <el-icon size="24"><Grid /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.totalShards }}</div>
              <div class="stat-label">分片总数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon purple">
              <el-icon size="24"><Monitor /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.totalDocs }}</div>
              <div class="stat-label">文档总数</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 主节点信息和集群健康状态 -->
    <el-row :gutter="20" class="main-content">
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>主节点信息</span>
              <el-tag type="success" size="small">在线</el-tag>
            </div>
          </template>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">节点名称:</span>
              <span class="info-value">{{ masterNode.name || '未知' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">集群UUID:</span>
              <span class="info-value" style="font-size: 12px;">{{ clusterInfo.clusterUUID || '未知' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">版本:</span>
              <el-tooltip 
                :content="getVersionDetails(clusterInfo.version)" 
                placement="top" 
                :disabled="!clusterInfo.version"
              >
                <span class="info-value version-info">
                  {{ formatVersion(clusterInfo.version) || '未知' }}
                  <el-icon class="version-icon" v-if="clusterInfo.version"><InfoFilled /></el-icon>
                </span>
              </el-tooltip>
            </div>
            <div class="info-item">
              <span class="info-label">角色:</span>
              <span class="info-value">master</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态:</span>
              <el-tag :type="getClusterStatusType(clusterHealth.status)" size="small">
                {{ clusterHealth.status?.toUpperCase() || '未知' }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="info-label">连接状态:</span>
              <el-tag type="success" size="small">在线</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>集群健康状态</span>
              <el-tag :type="getClusterStatusType(clusterHealth.status)" size="small">
                {{ clusterHealth.status?.toUpperCase() }}
              </el-tag>
            </div>
          </template>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">集群名称:</span>
              <span class="info-value">{{ clusterInfo.name || '未知' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态:</span>
              <el-tag :type="getClusterStatusType(clusterHealth.status)" size="small">
                {{ clusterHealth.status?.toUpperCase() || '未知' }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="info-label">节点总数:</span>
              <span class="info-value">{{ clusterHealth.number_of_nodes || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">活跃主分片:</span>
              <span class="info-value">{{ clusterHealth.active_primary_shards || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">活跃分片:</span>
              <span class="info-value">{{ clusterHealth.active_shards || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">数据节点:</span>
              <span class="info-value">{{ stats.activeNodes || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">总分片:</span>
              <span class="info-value">{{ stats.totalShards || 0 }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import {nextTick, onMounted, ref, computed} from 'vue'
import {ElMessage} from 'element-plus'
import {CircleCheck, CircleClose, Monitor, Plus, TrendCharts, DocumentCopy, Grid, Warning, Connection, InfoFilled} from '@element-plus/icons-vue'
import { getClusterStatus, getClusterHealth, getClusterInfo } from '../../api/es/cluster.js'
import { getInstanceList } from '../../api/instance.js'
import { getIndices } from '../../api/es/indices.js'

// 统计数据
const stats = ref({
  activeNodes: 0,
  totalIndices: 0,
  totalShards: 0,
  totalDocs: '0'
})

// 集群健康数据
const clusterHealth = ref({
  status: 'unknown',
  number_of_nodes: 0,
  active_primary_shards: 0,
  active_shards: 0
})

// 集群信息
const clusterInfo = ref({
  name: '',
  version: '',
  masterNode: ''
})

// 主节点信息
const masterNode = ref({
  name: '',
  id: '',
  ip: '',
  version: '',
  jvmHeap: ''
})

// 最近活动
const recentActivities = ref([])

// 加载状态
const loading = ref(false)
const selectedInstance = ref(null) // 选中的实例ID

// 获取第一个可用的elasticsearch实例
const fetchFirstInstance = async () => {
  try {
    const response = await getInstanceList({ 
      type_name: 'elasticsearch',
      page: 1,
      page_size: 100
    })
    if (response && response.data && response.data.list && response.data.list.data && response.data.list.data.length > 0) {
      selectedInstance.value = response.data.list.data[0].id
      await fetchData()
    } else {
      ElMessage.warning('未找到可用的Elasticsearch实例')
    }
  } catch (error) {
    console.error('获取实例失败:', error)
    ElMessage.error('获取实例失败: ' + (error.response?.data?.message || error.message))
  }
}

// 获取当前实例配置
const getCurrentConfig = () => {
  // 这里应该从实例管理中获取实际配置
  return {
    host: 'http://localhost:9200',
    username: 'elastic',
    password: 'changeme',
    skipSSLVerify: true
  }
}

// 获取集群状态类型
const getClusterStatusType = (status) => {
  switch (status) {
    case 'green': return 'success'
    case 'yellow': return 'warning'
    case 'red': return 'danger'
    default: return 'info'
  }
}

// 获取活动图标
const getActivityIcon = (type) => {
  switch (type) {
    case 'create': return DocumentCopy
    case 'warning': return Warning
    case 'success': return CircleCheck
    default: return CircleCheck
  }
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 3600000) { // 小于1小时
    return Math.floor(diff / 60000) + ' min ago'
  } else if (diff < 86400000) { // 小于1天
    return Math.floor(diff / 3600000) + ' hours ago'
  } else {
    return date.toLocaleDateString()
  }
}

// 格式化数字
const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 格式化版本信息
const formatVersion = (versionStr) => {
  if (!versionStr) return '未知'
  
  // 提取版本号 (例如: "Elasticsearch 7.17.29" -> "7.17.29")
  const versionMatch = versionStr.match(/(\d+\.\d+\.\d+)/)
  if (versionMatch) {
    return versionMatch[1]
  }
  
  // 如果没有找到标准格式，尝试提取其他版本信息
  const altVersionMatch = versionStr.match(/(\d+\.\d+)/)
  if (altVersionMatch) {
    return altVersionMatch[1]
  }
  
  return versionStr
}

// 获取版本详细信息（用于tooltip）
const getVersionDetails = (versionStr) => {
  if (!versionStr) return ''
  
  // 提取构建信息
  const buildMatch = versionStr.match(/构建:\s*([^,)]+)/)
  const dateMatch = versionStr.match(/构建日期:\s*([^)]+)/)
  
  let details = versionStr
  if (buildMatch && dateMatch) {
    details = `版本: ${formatVersion(versionStr)}\n构建: ${buildMatch[1]}\n日期: ${dateMatch[1]}`
  } else if (buildMatch) {
    details = `版本: ${formatVersion(versionStr)}\n构建: ${buildMatch[1]}`
  }
  
  return details
}

// 获取数据
const fetchData = async () => {
  if (!selectedInstance.value) {
    ElMessage.warning('请先选择一个Elasticsearch实例')
    return
  }

  loading.value = true
  try {
    // 并行获取集群状态、健康信息、基本信息和索引列表
    const [statusResponse, healthResponse, infoResponse, indicesResponse] = await Promise.all([
      getClusterStatus(selectedInstance.value),
      getClusterHealth(selectedInstance.value),
      getClusterInfo(selectedInstance.value),
      getIndices(selectedInstance.value)
    ])

    // 更新集群状态
    if (statusResponse && statusResponse.data && statusResponse.data.cluster_status) {
      const statusData = statusResponse.data.cluster_status
      stats.value.activeNodes = statusData.number_of_nodes || 0
      stats.value.totalShards = statusData.active_shards || 0
      clusterHealth.value.status = statusData.status || 'unknown'
      clusterHealth.value.number_of_nodes = statusData.number_of_nodes || 0
      clusterHealth.value.active_primary_shards = statusData.active_primary_shards || 0
      clusterHealth.value.active_shards = statusData.active_shards || 0
      clusterInfo.value.name = statusData.cluster_name || ''
      clusterInfo.value.version = statusData.version_info || ''
    }

    // 更新健康信息
    if (healthResponse && healthResponse.data && healthResponse.data.health_info) {
      const healthData = healthResponse.data.health_info
      clusterHealth.value.status = healthData.status || 'unknown'
      clusterHealth.value.number_of_nodes = healthData.number_of_nodes || 0
      clusterHealth.value.active_primary_shards = healthData.active_primary_shards || 0
      clusterHealth.value.active_shards = healthData.active_shards || 0
      
      // 更新文档数量
      if (healthData.doc_count !== undefined && healthData.doc_count !== null) {
        stats.value.totalDocs = formatNumber(healthData.doc_count)
      }
    }

    // 更新基本信息
    if (infoResponse && infoResponse.data && infoResponse.data.cluster_info) {
      const infoData = infoResponse.data.cluster_info
      clusterInfo.value.name = infoData.cluster_name || ''
      clusterInfo.value.version = infoData.version || ''
      clusterInfo.value.clusterUUID = infoData.cluster_uuid || ''
      masterNode.value.name = infoData.name || ''
    }

    // 更新索引数量
    if (indicesResponse && indicesResponse.data) {
      let indicesData = indicesResponse.data
      // 检查是否在raw_response中
      if (indicesData.raw_response && Array.isArray(indicesData.raw_response)) {
        indicesData = indicesData.raw_response
      }
      
      if (Array.isArray(indicesData)) {
        stats.value.totalIndices = indicesData.length
        
        // 计算文档总数
        let totalDocs = 0
        indicesData.forEach(index => {
          const docCount = parseInt(index['docs.count']) || 0
          totalDocs += docCount
        })
        stats.value.totalDocs = formatNumber(totalDocs)
      } else if (indicesData.list && Array.isArray(indicesData.list)) {
        stats.value.totalIndices = indicesData.list.length
      }
    }

    // 模拟一些最近活动
    recentActivities.value = [
      {
        id: 1,
        type: 'success',
        title: `集群 "${clusterInfo.value.name}" 状态正常`,
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 2,
        type: 'info',
        title: `Elasticsearch ${clusterInfo.value.version} 运行中`,
        timestamp: new Date(Date.now() - 7200000).toISOString()
      }
    ]

  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取集群数据失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = async () => {
  ElMessage.info('正在刷新数据...')
  try {
    await fetchData()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败: ' + error.message)
  }
}

onMounted(async () => {
  await nextTick()
  await fetchFirstInstance()
})
</script>

<style scoped>
.es-dashboard {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-title {
  margin-bottom: 24px;
}

.title-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.instance-selector {
  min-width: 200px;
}

/* 统计卡片 */
.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
}

.stat-icon.green {
  background: linear-gradient(135deg, #4caf50, #66bb6a);
}

.stat-icon.blue {
  background: linear-gradient(135deg, #2196f3, #42a5f5);
}

.stat-icon.orange {
  background: linear-gradient(135deg, #ff9800, #ffa726);
}

.stat-icon.purple {
  background: linear-gradient(135deg, #9c27b0, #ab47bc);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

/* 主内容区域 */
.main-content {
  margin-bottom: 24px;
}

.info-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.info-card :deep(.el-card__header) {
  border-bottom: 1px solid #f0f0f0;
  padding: 20px;
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
}

.info-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f8f9fa;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 400;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.version-icon {
  font-size: 12px;
  color: #909399;
  transition: color 0.2s;
}

.version-info:hover .version-icon {
  color: #409eff;
}



/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
  }
  
  .chart-section {
    order: 2;
  }
  
  .info-section {
    order: 1;
  }
}

@media (max-width: 768px) {
  .es-dashboard {
    padding: 16px;
  }
  
  .stats-section :deep(.el-col) {
    margin-bottom: 16px;
  }
  
  .stat-number {
    font-size: 24px;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style>