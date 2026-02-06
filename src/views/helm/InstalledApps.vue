<template>
  <div class="helm-installed-apps">
    <el-card class="page-header-card cyber-card">
      <div class="page-header cyber-header">
        <div>
          <h2>已安装应用</h2>
          <p>查看和管理 Helm Releases</p>
        </div>
        <div class="header-actions">
          <el-select v-model="selectedNamespace" placeholder="选择命名空间" @change="fetchReleases" style="width: 200px;" class="cyber-select">
            <el-option label="所有命名空间" value="" />
            <el-option label="default" value="default" />
            <el-option label="kube-system" value="kube-system" />
          </el-select>
        </div>
      </div>
    </el-card>

    <el-card class="content-card cyber-card">
      <div class="table-container">
        <el-table
          :data="releaseList"
          style="width: 100%"
          v-loading="loading"
          element-loading-background="rgba(0, 0, 0, 0.5)"
          height="calc(100vh - 280px)"
        >
          <el-table-column prop="release_name" label="Release 名称" min-width="200" />
          <el-table-column prop="namespace" label="命名空间" width="150" />
          <el-table-column prop="chart_name" label="Chart" min-width="180" />
          <el-table-column prop="chart_version" label="版本" width="120" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)" size="small">
                {{ scope.row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button link type="info" size="small" @click="handleViewDetail(scope.row)">详情</el-button>
              <el-button link type="warning" size="small" @click="handleUpgrade(scope.row)">升级</el-button>
              <el-button link type="danger" size="small" @click="handleUninstall(scope.row)">卸载</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="Release 详情"
      width="800px"
    >
      <div v-if="currentRelease" class="release-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Release 名称">{{ currentRelease.release_name }}</el-descriptions-item>
          <el-descriptions-item label="命名空间">{{ currentRelease.namespace }}</el-descriptions-item>
          <el-descriptions-item label="Chart">{{ currentRelease.chart_name }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ currentRelease.chart_version }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRelease.status)">{{ currentRelease.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatTime(currentRelease.updated_at) }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="currentRelease.values" class="values-section">
          <h4>自定义 Values</h4>
          <pre class="values-content">{{ formatValues(currentRelease.values) }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getHelmReleases, getHelmReleaseDetail, uninstallHelmRelease } from '@/api/helm'
import { getSelectedInstanceId } from '@/stores/instanceStore'

const loading = ref(false)
const releaseList = ref([])
const currentRelease = ref(null)
const selectedNamespace = ref('')
const showDetailDialog = ref(false)

const fetchReleases = async () => {
  const instanceId = getSelectedInstanceId()
  if (!instanceId) {
    ElMessage.warning('请先选择K8s实例')
    return
  }

  loading.value = true
  try {
    const res = await getHelmReleases(instanceId, selectedNamespace.value)
    releaseList.value = res.data.releaseList || []
  } catch (error) {
    console.error(error)
    ElMessage.error('获取Release列表失败')
  } finally {
    loading.value = false
  }
}

const handleViewDetail = async (row) => {
  const instanceId = getSelectedInstanceId()
  if (!instanceId) return

  try {
    const res = await getHelmReleaseDetail(row.namespace, row.release_name, instanceId)
    currentRelease.value = res.data.release
    showDetailDialog.value = true
  } catch (error) {
    console.error(error)
    ElMessage.error('获取Release详情失败')
  }
}

const handleUpgrade = (row) => {
  ElMessage.info('升级功能开发中...')
}

const handleUninstall = (row) => {
  ElMessageBox.confirm(
    `确定要卸载 Release "${row.release_name}" 吗？此操作将删除所有相关的 Kubernetes 资源。`,
    '卸载确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    const instanceId = getSelectedInstanceId()
    if (!instanceId) return

    try {
      await uninstallHelmRelease(row.namespace, row.release_name, instanceId)
      ElMessage.success('卸载成功')
      fetchReleases()
    } catch (error) {
      console.error(error)
      ElMessage.error('卸载失败')
    }
  }).catch(() => {})
}

const getStatusType = (status) => {
  const statusMap = {
    deployed: 'success',
    failed: 'danger',
    pending: 'warning',
    uninstalled: 'info'
  }
  return statusMap[status?.toLowerCase()] || 'info'
}

const formatTime = (timestamp) => {
  return dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

const formatValues = (values) => {
  try {
    if (typeof values === 'string') {
      return JSON.stringify(JSON.parse(values), null, 2)
    }
    return JSON.stringify(values, null, 2)
  } catch {
    return values
  }
}

onMounted(() => {
  fetchReleases()
})
</script>

<style scoped>
.helm-installed-apps {
  padding: 20px;
  min-height: calc(100vh - 60px);
}

/* Cyber Card 样式 */
.cyber-card {
  background: linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(15, 25, 45, 0.9) 100%);
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
              0 0 20px rgba(64, 158, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.cyber-card:hover {
  border-color: rgba(64, 158, 255, 0.5);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(64, 158, 255, 0.2);
}

.page-header-card {
  margin-bottom: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-header p {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

/* 表格样式 */
.table-container :deep(.el-table) {
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
}

.table-container :deep(.el-table th.el-table__cell) {
  background: rgba(64, 158, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(64, 158, 255, 0.3);
}

.table-container :deep(.el-table tr) {
  background: transparent;
}

.table-container :deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background: rgba(64, 158, 255, 0.1) !important;
}

.table-container :deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
}

/* 详情对话框 */
.release-detail {
  color: rgba(255, 255, 255, 0.9);
}

.values-section {
  margin-top: 24px;
}

.values-section h4 {
  margin: 0 0 12px 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
}

.values-content {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 4px;
  padding: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  max-height: 400px;
  overflow: auto;
  margin: 0;
}

:deep(.el-descriptions) {
  --el-descriptions-item-bordered-label-background: rgba(64, 158, 255, 0.1);
}

:deep(.el-descriptions__label) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-descriptions__content) {
  color: rgba(255, 255, 255, 0.9);
}

:deep(.el-descriptions__cell) {
  border-color: rgba(64, 158, 255, 0.2);
}

/* Dialog */
:deep(.el-dialog) {
  background: linear-gradient(135deg, rgba(10, 15, 30, 0.98) 0%, rgba(15, 25, 45, 0.95) 100%);
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

:deep(.el-dialog__title) {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

:deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(64, 158, 255, 0.3);
}
</style>
