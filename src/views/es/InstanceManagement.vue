<template>
  <div class="instances-page">
    <div class="page-header">
      <h2>实例管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          添加实例
        </el-button>
        <el-button @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索实例名称或地址"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="typeFilter" placeholder="类型筛选" clearable>
            <el-option label="Elasticsearch" value="elasticsearch" />
            <el-option label="Kibana" value="kibana" />
            <el-option label="Logstash" value="logstash" />
            <el-option label="Filebeat" value="filebeat" />
            <el-option label="Metricbeat" value="metricbeat" />
            <el-option label="APM" value="apm" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable>
            <el-option label="活跃" value="active" />
            <el-option label="非活跃" value="inactive" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-button-group>
            <el-button type="primary" @click="handleSearch" :loading="searching">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleResetFilter">
              <el-icon><RefreshLeft /></el-icon>
              重置
            </el-button>
            <el-button
              :type="viewMode === 'table' ? 'primary' : 'default'"
              @click="viewMode = 'table'"
            >
              <el-icon><List /></el-icon>
              列表视图
            </el-button>
            <el-button
              :type="viewMode === 'card' ? 'primary' : 'default'"
              @click="viewMode = 'card'"
            >
              <el-icon><Grid /></el-icon>
              卡片视图
            </el-button>
          </el-button-group>
        </el-col>
      </el-row>
    </el-card>

    <!-- 批量操作 -->
    <div v-if="selectedInstances.length > 0" class="batch-actions">
      <el-alert
        :title="`已选择 ${selectedInstances.length} 个实例`"
        type="info"
        :closable="false"
      >
        <template #default>
          <el-button size="small" @click="handleBatchTest">批量测试</el-button>
          <el-button size="small" @click="handleBatchDelete" type="danger">批量删除</el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </template>
      </el-alert>
    </div>

    <!-- 表格视图 -->
    <el-card v-if="viewMode === 'table'" class="table-card">
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="filteredInstances"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
          stripe
          style="width: 100%"
          height="100%"
        >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="名称" min-width="80" sortable="custom">
          <template #default="{ row }">
            <div class="instance-name">
              <el-icon class="type-icon" :color="getTypeColor(row.instance_type)">
                <component :is="getTypeIcon(row.instance_type)" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="instance_type" label="类型" width="140" sortable="custom">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeTagType(row.instance_type)">
              {{ getTypeLabel(row.instance_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="180" />
        <el-table-column prop="https_enabled" label="HTTPS" width="140" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="getHttpsStatus(row.https_enabled, row.skip_ssl_verify) ? 'success' : 'info'" size="small">
              <el-icon>
                <Lock v-if="getHttpsStatus(row.https_enabled, row.skip_ssl_verify)" />
                <Unlock v-else />
              </el-icon>
              {{ getHttpsStatus(row.https_enabled, row.skip_ssl_verify) ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="140" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              <el-icon><component :is="getStatusIcon(row.status)" /></el-icon>
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.updated_at">{{ formatTime(row.updated_at) }}</span>
            <span v-else class="text-muted">未知</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="handleTest(row)" :loading="row.testing">
                <el-icon><Connection /></el-icon>
                测试
              </el-button>
              <el-button size="small" @click="handleEdit(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="prev, pager, next, sizes, jumper, total"
          :prev-text="'上一页'"
          :next-text="'下一页'"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 卡片视图 -->
    <div v-if="viewMode === 'card'" class="cards-view">
      <el-row :gutter="20">
        <el-col
          v-for="instance in filteredInstances"
          :key="instance.id"
          :span="8"
          class="card-col"
        >
          <el-card class="instance-card" :class="`status-${instance.status}`">
            <template #header>
              <div class="card-header">
                <div class="instance-name">
                  <el-icon class="type-icon" :color="getTypeColor(instance.instance_type)">
                    <component :is="getTypeIcon(instance.instance_type)" />
                  </el-icon>
                  <span>{{ instance.name }}</span>
                </div>
                <el-dropdown @command="handleCardAction">
                  <el-button link>
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'test', instance }">
                        <el-icon><Connection /></el-icon>
                        测试连接
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'edit', instance }">
                        <el-icon><Edit /></el-icon>
                        编辑
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'delete', instance }" divided>
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>

            <div class="card-content">
              <div class="instance-info">
                <div class="info-item">
                  <span class="label">类型:</span>
                  <el-tag size="small" :type="getTypeTagType(instance.instance_type)">
                    {{ getTypeLabel(instance.instance_type) }}
                  </el-tag>
                </div>
                <div class="info-item">
                  <span class="label">地址:</span>
                  <span class="value">{{ instance.address }}</span>
                </div>
                <div class="info-item">
                  <span class="label">HTTPS:</span>
                  <el-tag :type="getHttpsStatus(instance.https_enabled, instance.skip_ssl_verify) ? 'success' : 'info'" size="small">
                    <el-icon>
                      <Lock v-if="getHttpsStatus(instance.https_enabled, instance.skip_ssl_verify)" />
                      <Unlock v-else />
                    </el-icon>
                    {{ getHttpsStatus(instance.https_enabled, instance.skip_ssl_verify) ? '启用' : '禁用' }}
                  </el-tag>
                </div>
                <div class="info-item">
                  <span class="label">状态:</span>
                  <el-tag :type="getStatusType(instance.status)" size="small">
                    <el-icon><component :is="getStatusIcon(instance.status)" /></el-icon>
                    {{ getStatusLabel(instance.status) }}
                  </el-tag>
                </div>
                <div class="info-item">
                  <span class="label">更新时间:</span>
                  <span class="value">
                    {{ instance.updated_at ? formatTime(instance.updated_at) : '未知' }}
                  </span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Refresh, RefreshLeft, Search, List, Grid, Edit, Delete, Connection, View,
  CircleCheck, WarningFilled, CircleClose, Monitor, DataLine, DocumentCopy,
  MoreFilled, Lock, Unlock
} from '@element-plus/icons-vue'
import { getInstanceList, deleteInstance, testConnection } from '@/api/instance.js'

const router = useRouter()

// 数据状态
const loading = ref(false)
const viewMode = ref('table')
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const searching = ref(false)
const selectedInstances = ref([])

// 分页
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 排序
const sortConfig = ref({
  prop: '',
  order: ''
})

// 实例数据
const instances = ref([])

// 计算属性
const filteredInstances = computed(() => {
  // 直接返回实例数据，排序和筛选由后端处理
  return instances.value
})

// 类型相关方法
const getTypeIcon = (type) => {
  const icons = {
    elasticsearch: Monitor,
    kibana: DataLine,
    logstash: DocumentCopy,
    filebeat: DocumentCopy,
    metricbeat: DocumentCopy,
    apm: WarningFilled
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
    apm: '#795548'
  }
  return colors[type] || '#666'
}

const getTypeLabel = (type) => {
  const labels = {
    elasticsearch: 'Elasticsearch',
    kibana: 'Kibana',
    logstash: 'Logstash',
    filebeat: 'Filebeat',
    metricbeat: 'Metricbeat',
    apm: 'APM'
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

// 状态相关方法
const getStatusIcon = (status) => {
  const icons = {
    active: CircleCheck,
    inactive: WarningFilled,
    error: CircleClose
  }
  return icons[status] || CircleClose
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

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  
  const date = new Date(timeStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 获取HTTPS状态
const getHttpsStatus = (httpsEnabled, skipSslVerify) => {
  // 根据skip_ssl_verify字段判断HTTPS状态
  if (skipSslVerify === true || skipSslVerify === 1 || skipSslVerify === '1' || skipSslVerify === 'true') {
    return true
  }
  return false
}

// 事件处理
const handleSearch = () => {
  searching.value = true
  pagination.value.currentPage = 1
  fetchInstances().finally(() => {
    searching.value = false
  })
}

const handleResetFilter = () => {
  searchQuery.value = ''
  typeFilter.value = ''
  statusFilter.value = ''
  pagination.value.currentPage = 1
  fetchInstances()
}

// 获取实例数据
const fetchInstances = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.currentPage,
      page_size: pagination.value.pageSize
    }
    
    // 添加筛选参数
    if (searchQuery.value) {
      params.keyword = searchQuery.value
    }
    if (typeFilter.value) {
      params.type_name = typeFilter.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    const response = await getInstanceList(params)
    const listData = response.data?.list || {}
    
    instances.value = listData.data || []
    pagination.value.total = listData.total || 0
    
    // 调试：打印第一条数据查看结构
    if (instances.value.length > 0) {
      console.log('实例数据结构:', instances.value[0])
    }
    
  } catch (error) {
    ElMessage.error('数据加载失败: ' + error.message)
    instances.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  router.push('/instances/add')
}

const handleEdit = (instance) => {
  router.push(`/instances/edit/${instance.id}`)
}

const handleTest = async (instance) => {
  instance.testing = true
  try {
    const response = await testConnection(instance.id)
    const testData = response.data?.test_result
    
    if (testData?.test_result === 'success') {
      ElMessage.success(`${instance.name} 连接测试成功 (响应时间: ${testData.response_time}ms)`)
      // 更新实例状态为活跃
      instance.status = 'active'
    } else {
      const errorMsg = testData?.error_message || '测试失败'
      ElMessage.error(`${instance.name} 连接测试失败: ${errorMsg}`)
      // 根据错误类型设置状态
      instance.status = testData?.test_result === 'timeout' ? 'warning' : 'error'
    }
    
    // 更新实例更新时间
    instance.updated_at = new Date().toISOString()
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || '连接测试失败'
    ElMessage.error(`${instance.name} 连接测试失败: ${errorMsg}`)
    instance.status = 'error'
  } finally {
    instance.testing = false
  }
}

const handleDelete = async (instance) => {
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
      await fetchInstances() // 重新加载数据
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

const handleRefresh = async () => {
  searchQuery.value = ''
  typeFilter.value = ''
  statusFilter.value = ''
  pagination.value.currentPage = 1
  await fetchInstances()
}

const handleSelectionChange = (selection) => {
  selectedInstances.value = selection
}

const handleSortChange = ({ prop, order }) => {
  sortConfig.value = { prop, order }
}

const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  fetchInstances()
}

const handleCurrentChange = (page) => {
  pagination.value.currentPage = page
  fetchInstances()
}

const handleBatchTest = async () => {
  ElMessage.info('开始批量测试...')
  let successCount = 0
  let failCount = 0
  
  for (const instance of selectedInstances.value) {
    try {
      await handleTest(instance)
      successCount++
    } catch (error) {
      failCount++
    }
  }
  
  ElMessage.success(`批量测试完成：成功 ${successCount} 个，失败 ${failCount} 个`)
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedInstances.value.length} 个实例吗？此操作不可恢复。`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    let successCount = 0
    let failCount = 0
    
    for (const instance of selectedInstances.value) {
      try {
        const response = await deleteInstance(instance.id)
        if (response.message === '删除成功') {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
      }
    }
    
    selectedInstances.value = []
    
    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 个实例`)
    } else {
      ElMessage.warning(`批量删除完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    }
    
    await fetchInstances() // 重新加载数据
  } catch (error) {
    if (error.message !== 'cancel') {
      ElMessage.error('批量删除操作已取消')
    }
  }
}

const clearSelection = () => {
  selectedInstances.value = []
}

const handleCardAction = ({ action, instance }) => {
  switch (action) {
    case 'test':
      handleTest(instance)
      break
    case 'edit':
      handleEdit(instance)
      break
    case 'delete':
      handleDelete(instance)
      break
  }
}

onMounted(() => {
  fetchInstances()
})
</script>

<style scoped>
.instances-page {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  padding: 8px 0;
  flex-shrink: 0;
}

.page-header h2 {
  margin: 0;
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filter-card {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.filter-card :deep(.el-card__body) {
  padding: 20px;
}

.batch-actions {
  margin-bottom: 24px;
}

.table-card {
  margin-bottom: 24px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.table-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.table-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 20px;
}

.table-container :deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
}

.table-container :deep(.el-table__header) {
  background-color: #fafafa;
}

.table-container :deep(.el-table__header th) {
  background-color: #fafafa;
  color: #1a1a1a;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 2px solid #e0e0e0;
}

.table-container :deep(.el-table__row) {
  transition: all 0.2s ease;
}

.table-container :deep(.el-table__row:hover) {
  background-color: #f8f9fa;
}

.instance-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.type-icon {
  font-size: 18px;
  padding: 4px;
  border-radius: 6px;
  background-color: #f0f0f0;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 20px 20px 20px 0;
}

.pagination-wrapper :deep(.el-pagination) {
  background-color: transparent;
}

.cards-view {
  margin-bottom: 24px;
}

.card-col {
  margin-bottom: 24px;
}

.instance-card {
  height: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: none;
}

.instance-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.instance-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.instance-card:hover::before {
  height: 6px;
}

.instance-card.status-active::before {
  background: linear-gradient(90deg, #67c23a 0%, #85ce61 100%);
}

.instance-card.status-inactive::before {
  background: linear-gradient(90deg, #909399 0%, #a6a9ad 100%);
}

.instance-card.status-error::before {
  background: linear-gradient(90deg, #f56c6c 0%, #f78989 100%);
}

.instance-card :deep(.el-card__header) {
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  padding: 16px 20px;
}

.instance-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-content {
  padding: 0;
}

.instance-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.info-item .value {
  color: #1a1a1a;
  font-size: 14px;
  font-weight: 500;
}

.text-muted {
  color: #999;
}

/* 改进的按钮样式 */
.header-actions :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.header-actions :deep(.el-button:hover) {
  transform: translateY(-2px);
}

/* 改进的输入框和选择器样式 */
.filter-card :deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.filter-card :deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-card :deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

/* 改进的标签样式 */
.info-item :deep(.el-tag) {
  border-radius: 20px;
  font-weight: 500;
  padding: 4px 12px;
}

/* 改进的表格按钮样式 */
.table-container :deep(.el-button-group .el-button) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.table-container :deep(.el-button-group .el-button:hover) {
  transform: translateY(-1px);
}

/* 暗色主题适配 */
:global(.dark) .instances-page {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

:global(.dark) .page-header h2 {
  background: linear-gradient(135deg, #9fa8da 0%, #b39ddb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:global(.dark) .filter-card,
:global(.dark) .table-card {
  background-color: var(--el-bg-color);
}

:global(.dark) .table-container :deep(.el-table__header) {
  background-color: var(--el-fill-color-light);
}

:global(.dark) .table-container :deep(.el-table__header th) {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  border-bottom-color: var(--el-border-color);
}

:global(.dark) .table-container :deep(.el-table__row:hover) {
  background-color: var(--el-fill-color);
}

:global(.dark) .instance-card :deep(.el-card__header) {
  background-color: var(--el-fill-color-light);
  border-bottom-color: var(--el-border-color);
}

:global(.dark) .info-item {
  border-bottom-color: var(--el-border-color);
}

:global(.dark) .info-item .label {
  color: var(--el-text-color-regular);
}

:global(.dark) .info-item .value {
  color: var(--el-text-color-primary);
}

:global(.dark) .type-icon {
  background-color: var(--el-fill-color-light);
}
</style>