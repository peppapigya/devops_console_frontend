<template>
  <div class="pipeline-list-page">
    <!-- Header / Stats Section -->
    <div class="stats-section">
       <div class="stat-card">
          <div class="stat-icon-wrapper blue-glow">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalPipelines }}</span>
            <span class="stat-label">流水线总数</span>
          </div>
       </div>
       <div class="stat-card">
          <div class="stat-icon-wrapper green-glow">
            <el-icon><VideoPlay /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ activeRuns }}</span>
            <span class="stat-label">运行中</span>
          </div>
       </div>
       <div class="stat-card">
          <div class="stat-icon-wrapper purple-glow">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ successRate }}%</span>
            <span class="stat-label">成功率</span>
          </div>
       </div>
    </div>

    <!-- Main Content -->
    <div class="main-content-panel">
       <!-- Toolbar -->
       <div class="toolbar">
          <div class="left-tools">
             <el-input
               v-model="searchQuery"
               placeholder="搜索流水线..."
               class="cyber-input"
               prefix-icon="Search"
               clearable
               @change="refreshData"
             />
             <el-radio-group v-model="viewMode" size="small" class="view-toggle">
                <el-radio-button label="list"><el-icon><List /></el-icon></el-radio-button>
                <el-radio-button label="grid"><el-icon><Grid /></el-icon></el-radio-button>
             </el-radio-group>
          </div>
          <div class="right-tools">
             <el-button type="primary" class="cyber-button" @click="handleCreate">
                <el-icon><Plus /></el-icon> New Pipeline
             </el-button>
             <el-button class="cyber-button-ghost" @click="refreshData" :loading="loading">
                <el-icon><Refresh /></el-icon>
             </el-button>
          </div>
       </div>

       <!-- Grid View -->
       <div v-if="viewMode === 'grid'" class="pipeline-grid" v-loading="loading">
          <div v-for="item in filteredPipelines" :key="item.id" class="pipeline-card" @click="handleHistory(item)">
             <div class="card-header">
                <div class="pipeline-icon" :class="getStatusClass(item.last_run_status)">
                   <el-icon><Cpu /></el-icon>
                </div>
                <div class="card-actions" @click.stop>
                   <el-dropdown trigger="click">
                      <el-icon class="more-btn"><MoreFilled /></el-icon>
                      <template #dropdown>
                       <el-dropdown-menu>
                           <el-dropdown-item @click="handleEdit(item)">编辑</el-dropdown-item>
                           <el-dropdown-item @click="handleDelete(item)" style="color: #F56C6C">删除</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                   </el-dropdown>
                </div>
             </div>
             <div class="card-body">
                <h3 class="pipeline-title">{{ item.name }}</h3>
                <p class="pipeline-desc">{{ item.description || '暂无描述' }}</p>
                <div class="pipeline-meta">
                   <el-tag size="small" effect="dark" class="cyber-tag">{{ item.branch || 'main' }}</el-tag>
                   <span class="meta-time">{{ formatTime(item.last_run_time) }}</span>
                </div>
             </div>
             <div class="card-footer">
                <div class="status-indicator">
                   <span class="status-dot" :class="getStatusClass(item.last_run_status)"></span>
                   <span class="status-text">{{ item.last_run_status || '未运行' }}</span>
                </div>
                <el-button type="primary" link size="small" @click.stop="handleRun(item)">
                   运行 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                </el-button>
             </div>
          </div>
       </div>

       <!-- List View -->
       <div v-else class="pipeline-list" v-loading="loading">
           <el-table :data="filteredPipelines" style="width: 100%" class="cyber-table">
             <el-table-column prop="name" label="流水线名称" min-width="200">
                <template #default="{ row }">
                   <div class="list-name-col">
                      <div class="list-icon" :class="getStatusClass(row.last_run_status)">
                         <el-icon><Cpu /></el-icon>
                      </div>
                      <div class="name-info">
                         <span class="name-text">{{ row.name }}</span>
                         <span class="desc-text">{{ row.description }}</span>
                      </div>
                   </div>
                </template>
             </el-table-column>
             <el-table-column prop="repository" label="代码仓库" min-width="200">
                <template #default="{ row }">
                   <div class="repo-info">
                      <el-icon><Connection /></el-icon>
                      <span>{{ row.gitUrl }}</span>
                   </div>
                </template>
             </el-table-column>
             <el-table-column prop="last_run" label="最近状态" width="150">
                 <template #default="{ row }">
                    <el-tag :type="getStatusType(row.last_run_status)" effect="dark" class="status-tag">
                       {{ row.last_run_status || '未运行' }}
                    </el-tag>
                 </template>
             </el-table-column>
             <el-table-column prop="updated_at" label="更新时间" width="180">
                <template #default="{ row }">
                   {{ formatTime(row.updated_at) }}
                </template>
             </el-table-column>
             <el-table-column label="操作" width="180" align="right">
                <template #default="{ row }">
                   <el-button-group>
                      <el-button size="small" class="action-btn" @click="handleRun(row)"><el-icon><VideoPlay /></el-icon></el-button>
                      <el-button size="small" class="action-btn" @click="handleHistory(row)"><el-icon><Timer /></el-icon></el-button>
                      <el-button size="small" class="action-btn" @click="handleEdit(row)"><el-icon><Edit /></el-icon></el-button>
                      <el-button size="small" class="action-btn danger" @click="handleDelete(row)"><el-icon><Delete /></el-icon></el-button>
                   </el-button-group>
                </template>
             </el-table-column>
          </el-table>
       </div>
    </div>

    <!-- Create/Edit Dialog Removed -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getPipelines, triggerPipeline, deletePipeline } from '@/api/cicd.js'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  Monitor, VideoPlay, TrendCharts, Search, List, Grid,
  Plus, Refresh, MoreFilled, Cpu, ArrowRight, Connection,
  Timer, Edit, Delete, Rank
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const viewMode = ref('grid')
const loading = ref(false)
const searchQuery = ref('')
const pipelines = ref([])
// const dialogVisible = ref(false) // Removed
const editingId = ref(null)

const editingPipelineData = ref(null)

// Stats (Mocked for now, can be calculated from data)

// Stats (Mocked for now, can be calculated from data)
const totalPipelines = ref(0)
const activeRuns = ref(0)
const successRate = ref(98)
const page = ref(1)
const pageSize = ref(20)

const fetchData = async () => {
    loading.value = true
    try {
        const res = await getPipelines({
            pageNum: page.value,
            pageSize: pageSize.value,
            keyword: searchQuery.value
        })
      console.log(res.data.data.data)
        pipelines.value = res.data.data.data || []
        totalPipelines.value = res.data.data.total || pipelines.value.length

        // Simple mock calc for active runs if backend doesn't return
        const activeCount = pipelines.value.filter(p => p.last_run_status === 'Running').length
        if (activeCount > 0) activeRuns.value = activeCount
    } catch (e) {
        ElMessage.error('加载流水线失败')
    } finally {
        loading.value = false
    }
}

const refreshData = () => {
   fetchData()
   ElMessage.success('数据已刷新')
}

const filteredPipelines = computed(() => {
    // Backend filtering is preferred with pagination, but if local:
    return pipelines.value
})

// Debounce search could be added here to trigger fetchData on search change
// For now, let's just make search trigger refresh or filter locally if we fetch all?
// Since we switched to page interface, we should probably fetch on search.
// But for now, user just asked for "page interface", let's assume server-side paging.

const formatTime = (time) => {
    if (!time) return '-'
    return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const getStatusClass = (status) => {
    const map = {
        'Succeeded': 'status-success',
        'Failed': 'status-failed',
        'Running': 'status-running',
        'Pending': 'status-pending'
    }
    return map[status] || 'status-pending'
}

const getStatusType = (status) => {
    const map = {
        'Succeeded': 'success',
        'Failed': 'danger',
        'Running': 'warning',
        'Pending': 'info'
    }
    return map[status] || 'info'
}

const handleCreate = () => {
    router.push('/cicd/pipelines/create')
}

const handleEdit = (row) => {
    router.push(`/cicd/pipelines/${row.id}/edit`)
}

const handleRun = async (row) => {
    try {
       await triggerPipeline(row.id, {})
       ElNotification({
          title: '触发流水线',
          message: `流水线 ${row.name} 已成功开始运行。`,
          type: 'success',
          duration: 3000
       })
       fetchData() // Refresh status
    } catch(e) {
       console.error(e)
    }
}
const handleHistory = (row) => {
    // Navigate to pipeline detail or latest run
    // For now assuming we go to latest run or list
    router.push(`/cicd/runs/${row.id}-latest`)
}


const handleDelete = async (row) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除 ${row.name} 吗?`,
            '警告',
            {
                confirmButtonText: '删除',
                cancelButtonText: '取消',
                type: 'warning',
            }
        )
        await deletePipeline(row.id)
        ElMessage.success('流水线已删除')
        fetchData()
    } catch (e) {
        // Cancelled or error
    }
}

onMounted(fetchData)
</script>

<style scoped>
.pipeline-list-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background-color: transparent; /* Rely on layout bg */
}

/* Stats Section */
.stats-section {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

.stat-card {
    background: linear-gradient(135deg, #ffffff 0%, #f7f9fc 100%);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 1px solid rgba(0,0,0,0.04);
    position: relative;
    overflow: hidden;
}

.stat-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: transparent;
    transition: background 0.3s;
}

.stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(50, 108, 229, 0.1);
}

.stat-card:nth-child(1):hover::after { background: #326CE5; }
.stat-card:nth-child(2):hover::after { background: #13ce66; }
.stat-card:nth-child(3):hover::after { background: #8A0A4A; }

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}

.stat-icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
}

.blue-glow { background: rgba(50, 108, 229, 0.1); color: #326CE5; }
.green-glow { background: rgba(19, 206, 102, 0.1); color: #13ce66; }
.purple-glow { background: rgba(138, 10, 74, 0.1); color: #8A0A4A; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: #303133; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }

/* Main Panel */
.main-content-panel {
    background: #fff;
    border-radius: 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    overflow: hidden;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.left-tools {
    display: flex;
    gap: 16px;
    align-items: center;
    flex: 1;
}

.cyber-input {
    width: 300px;
    transition: all 0.3s ease;
}

.cyber-input:hover, .cyber-input:focus-within {
    box-shadow: 0 0 8px rgba(50, 108, 229, 0.2);
}

.view-toggle :deep(.el-radio-button__inner) {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid #DCDFE6;
}

.view-toggle :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: #326CE5;
    border-color: #326CE5;
    box-shadow: none;
    color: white;
}

.right-tools { display: flex; gap: 12px; }

/* Grid View */
.pipeline-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    overflow-y: auto;
    padding-bottom: 20px;
}

.pipeline-card {
    background: #fff;
    border: 1px solid #EBEEF5;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.pipeline-card:hover {
    border-color: #326CE5;
    box-shadow: 0 8px 24px rgba(50, 108, 229, 0.1);
    transform: translateY(-2px);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.pipeline-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}

.card-body { flex: 1; }
.pipeline-title { font-size: 16px; font-weight: 600; color: #303133; margin: 0 0 8px 0; }
.pipeline-desc { font-size: 13px; color: #909399; margin: 0 0 16px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.pipeline-meta { display: flex; align-items: center; gap: 12px; }
.meta-time { font-size: 12px; color: #C0C4CC; }

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f4f4f5;
    padding-top: 16px;
}

.status-indicator { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-text { font-size: 12px; color: #606266; font-weight: 500; }

/* Status Styles */
.status-success { background: rgba(19, 206, 102, 0.1); color: #13ce66; }
.status-dot.status-success { background: #13ce66; }

.status-failed { background: rgba(245, 108, 108, 0.1); color: #F56C6C; }
.status-dot.status-failed { background: #F56C6C; }

.status-running { background: rgba(50, 108, 229, 0.1); color: #326CE5; }
.status-dot.status-running { background: #326CE5; animation: pulse 1.5s infinite; }

.status-pending { background: #f4f4f5; color: #909399; }
.status-dot.status-pending { background: #909399; }

@keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(50, 108, 229, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(50, 108, 229, 0); }
    100% { box-shadow: 0 0 0 0 rgba(50, 108, 229, 0); }
}

/* Dark Mode Support */
.dark .stats-section .stat-card {
    background: #1e1e2d;
    border-color: #303030;
}
.dark .stat-value { color: #fff; }
.dark .main-content-panel { background: #1e1e2d; }
.dark .pipeline-card { background: #1e1e2d; border-color: #303030; }
.dark .pipeline-card:hover { border-color: #326CE5; }
.dark .pipeline-title { color: #fff; }
.dark .card-footer { border-top-color: #303030; }

/* List View */
.list-name-col { display: flex; align-items: center; gap: 12px; }
.list-icon {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-size: 18px;
}
.name-info { display: flex; flex-direction: column; }
.name-text { font-weight: 500; color: #303133; }
.desc-text { font-size: 12px; color: #909399; }
.repo-info { display: flex; align-items: center; gap: 6px; color: #606266; font-size: 13px; }

.dark .name-text { color: #fff; }
.dark .list-icon { background-color: rgba(255,255,255,0.05); }
.dark .cyber-table { background: transparent; --el-table-bg-color: transparent; }

/* Steps Manager */
.steps-manager {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 16px;
    min-height: 200px;
}

.steps-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.drag-hint { font-size: 12px; color: #909399; display: flex; align-items: center; gap: 4px; }

.steps-list-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.draggable-step-item {
    background: #f4f4f5;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: move;
    transition: all 0.2s;
}

.draggable-step-item:hover {
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.step-handle { cursor: move; color: #909399; }
.step-content-mini { flex: 1; display: flex; flex-direction: column; }
.step-name-row { font-weight: 500; font-size: 14px; }
.step-img-txt { font-size: 12px; color: #909399; }
.step-actions-mini { display: flex; }

.dark .steps-manager { border-color: #4C4D4F; }
.dark .draggable-step-item { background: #2b2b2c; border-color: #4C4D4F; }
.dark .draggable-step-item:hover { background: #363637; }
.dark .step-name-row { color: #fff; }
</style>
