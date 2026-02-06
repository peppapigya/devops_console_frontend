<template>
  <div class="helm-repo-management">
    <el-card class="page-header-card cyber-card">
      <div class="page-header cyber-header">
        <div>
          <h2>Helm 仓库管理</h2>
          <p>管理 Helm Chart 仓库</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" class="cyber-button" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            添加仓库
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="content-card cyber-card">
      <div class="table-container">
        <el-table
          :data="repoList"
          style="width: 100%"
          v-loading="loading"
          element-loading-background="rgba(0, 0, 0, 0.5)"
        >
          <el-table-column prop="name" label="仓库名称" min-width="180" />
          <el-table-column prop="url" label="URL" min-width="300" show-overflow-tooltip />
          <el-table-column prop="username" label="用户名" width="150">
            <template #default="scope">
              <span v-if="scope.row.username">{{ scope.row.username }}</span>
              <span v-else style="color: #999;">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="scope">
              <el-button link type="primary" size="small" @click="handleSync(scope.row)">
                <el-icon><Refresh /></el-icon> 同步
              </el-button>
              <el-button link type="info" size="small" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="isEditMode ? '编辑仓库' : '添加仓库'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="repoForm" ref="repoFormRef" label-width="100px" @submit.prevent>
        <el-form-item label="仓库名称" prop="name" required>
          <el-input v-model="repoForm.name" placeholder="例如：bitnami" :disabled="isEditMode" />
        </el-form-item>
        <el-form-item label="仓库 URL" prop="url" required>
          <el-input v-model="repoForm.url" placeholder="https://charts.bitnami.com/bitnami" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="repoForm.username" placeholder="私有仓库认证（可选）" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="repoForm.password" type="password" placeholder="私有仓库密码（可选）" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEditMode ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
// import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import dayjs from 'dayjs'
import {
  getHelmRepos,
  createHelmRepo,
  updateHelmRepo,
  deleteHelmRepo,
  syncHelmRepo
} from '@/api/helm'

const loading = ref(false)
const submitting = ref(false)
const repoList = ref([])
const showCreateDialog = ref(false)
const isEditMode = ref(false)
const editingRepo = ref(null)
const repoFormRef = ref(null)

const repoForm = ref({
  name: '',
  url: '',
  username: '',
  password: ''
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getHelmRepos()
    repoList.value = res.data.repoList || []
  } catch (error) {
    console.error(error)
    ElMessage.error('获取仓库列表失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  repoForm.value = {
    name: '',
    url: '',
    username: '',
    password: ''
  }
  isEditMode.value = false
  editingRepo.value = null
}

const handleCloseDialog = () => {
  showCreateDialog.value = false
  resetForm()
}

const handleCreate = async () => {
  submitting.value = true
  try {
    await createHelmRepo(repoForm.value)
    ElMessage.success('创建成功')
    handleCloseDialog()
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('创建失败')
  } finally {
    submitting.value = false
  }
}

const handleUpdate = async () => {
  submitting.value = true
  try {
    await updateHelmRepo(editingRepo.value.id, repoForm.value)
    ElMessage.success('更新成功')
    handleCloseDialog()
    fetchData()
  } catch (error) {
    console.error(error)
    ElMessage.error('更新失败')
  } finally {
    submitting.value = false
  }
}

const handleSubmit = () => {
  if (isEditMode.value) {
    handleUpdate()
  } else {
    handleCreate()
  }
}

const handleEdit = (row) => {
  isEditMode.value = true
  editingRepo.value = row
  repoForm.value = {
    name: row.name,
    url: row.url,
    username: row.username || '',
    password: '' // 密码不回显
  }
  showCreateDialog.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除仓库 "${row.name}" 吗？这将同时删除该仓库的所有 Chart 缓存。`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteHelmRepo(row.id)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error(error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// const handleSync = async (row) => {
//     console.log("1111111")
//   ElMessageBox.confirm(`确定要同步仓库 "${row.name}" 吗？这将从仓库获取最新的 Chart 列表。`, '同步确认', {
//     confirmButtonText: '确定',
//     cancelButtonText: '取消',
//     type: 'info'
//   }).then(async () => {
//     console.log("2222222222")
//     const loadingMsg = ElMessage.loading('正在同步仓库，请稍候...')
//     try {
//       await syncHelmRepo(row.id)
//       console.log("2333333333")
//       loadingMsg.close()
//       ElMessage.success('同步成功')
//       fetchData()
//     } catch (error) {
//       loadingMsg.close()
//       console.error(error)
//       ElMessage.error('同步失败')
//     }
//   }).catch(() => {})
// }

const handleSync = (row) => {
  ElMessageBox.confirm(
    `确定要同步仓库 "${row.name}" 吗？这将从仓库获取最新的 Chart 列表。`,
    '同步确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  )
  .then(() => {
    doSync(row)
  })
  .catch(() => {})
}

// const doSync = async (row) => {
//   try {
//     await syncHelmRepo(row.id)
//     ElMessage.success('同步成功')
//     fetchData()
//   } catch (error) {
//     console.error('Sync error:', error)
//     ElMessage.error(error.message || '同步失败')
//   }
// }
const doSync = async (row) => {
  // 显示加载提示
  const loadingInstance = ElLoading.service({
    lock: true,
    text: `正在同步仓库 "${row.name}"，请稍候...`,
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    await syncHelmRepo(row.id)
    loadingInstance.close()
    ElMessage.success('同步成功')
    fetchData()
  } catch (error) {
    loadingInstance.close()
    console.error('Sync error:', error)
    ElMessage.error(error.message || '同步失败')
  }
}

const formatTime = (timestamp) => {
  return dayjs. unix(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.helm-repo-management {
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

.cyber-button {
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.cyber-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

/* 表格样式 */
.table-container :deep(.el-table) {
  background: transparent;
  color: #303133;
}

.table-container :deep(.el-table th.el-table__cell) {
  background: rgba(64, 158, 255, 0.1);
  color: #303133;
  border-bottom: 1px solid rgba(64, 158, 255, 0.3);
  font-weight: 600;
}

.table-container :deep(.el-table tr) {
  background: transparent;
}

.table-container :deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background: rgba(64, 158, 255, 0.1) !important;
}

.table-container :deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  color: #606266;
}

.table-container :deep(.el-table__empty-text) {
  color: #909399;
}

/* 对话框样式 */
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

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: none;
}

:deep(.el-input__inner) {
  color: rgba(255, 255, 255, 0.9);
}

:deep(.el-input__wrapper:hover) {
  border-color: rgba(64, 158, 255, 0.5);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #409EFF;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.3);
}
</style>
