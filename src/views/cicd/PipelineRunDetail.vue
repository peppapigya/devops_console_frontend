<template>
  <div class="page-container">
    <!-- Header -->
    <el-card class="page-header-card">
       <div class="page-header">
         <div class="header-left">
           <el-button link class="back-btn" @click="$router.push('/cicd/pipelines')">
              <el-icon><ArrowLeft /></el-icon>
           </el-button>
           <div class="header-content ml-4">
              <div class="flex items-center gap-3">
                 <h2 class="m-0 page-title">{{ pipeline?.name || '加载中...' }}</h2>
                 <el-tag :type="getStatusType(run?.status)" effect="light" class="font-medium">
                    {{ run?.status || 'Active' }} 
                 </el-tag>
              </div>
              <div class="meta-row mt-2">
                 <span class="meta-item">#{{ run?.id }}</span>
                 <el-divider direction="vertical" />
                 <span class="meta-item"><el-icon><User /></el-icon> {{ run?.operator || 'System' }}</span>
                 <el-divider direction="vertical" />
                 <span class="meta-item"><el-icon><Timer /></el-icon> {{ run?.duration || '0s' }}</span>
              </div>
           </div>
         </div>
         <div class="header-right">
           <el-button @click="handleEditPipeline" v-if="pipeline?.id" :icon="Edit">编辑流水线</el-button>
           <el-button @click="fetchData" :icon="Refresh">刷新</el-button>
           <el-button type="primary" @click="handleRerun" :loading="triggering" :icon="VideoPlay">重新运行</el-button>
         </div>
       </div>
    </el-card>

    <!-- Content: Full Graph -->
    <div class="main-content">
       <el-card class="content-card graph-card" :body-style="{ height: '100%', padding: 0 }">
           <div class="graph-wrapper">
               <PipelineGraph 
                  :steps="steps" 
                  :active-step-name="currentStep?.name"
                  @node-click="handleNodeClick" 
               />
               <div class="graph-tip" v-if="!currentStep">点击节点查看日志</div>
           </div>
       </el-card>
    </div>

    <!-- Drawer for Logs & Details -->
    <el-drawer
      v-model="drawerVisible"
      :title="currentStep?.name || '步骤详情'"
      direction="rtl"
      size="50%"
      :before-close="handleDrawerClose"
      class="step-drawer"
    >
      <template #header>
        <div class="drawer-header">
           <span class="drawer-title">{{ currentStep?.name || '步骤详情' }}</span>
           <el-tag :type="getStatusType(currentStep?.status)" size="small" class="ml-2" v-if="currentStep">
              {{ currentStep.status }}
           </el-tag>
        </div>
      </template>

      <div class="drawer-content h-full flex flex-col">
          <el-tabs v-model="activeTab" class="h-full flex flex-col">
             <el-tab-pane label="终端日志" name="logs" class="h-full flex flex-col">
                 <div class="logs-wrapper flex-1 flex flex-col h-full">
                     <div class="logs-header">
                        <div class="terminal-actions">
                           <el-button link @click="copyLogs" size="small"><el-icon><CopyDocument /></el-icon> 复制</el-button>
                           <el-button link size="small"><el-icon><Download /></el-icon> 下载</el-button>
                        </div>
                     </div>
                     <div class="logs-container flex-1" ref="logsContainer">
                        <template v-if="loadingLogs">
                           <div class="loading-state">
                              <el-icon class="is-loading mr-2"><Loading /></el-icon> 正在加载日志...
                           </div>
                        </template>
                        <template v-else-if="logs.length > 0">
                           <div v-for="(line, idx) in logs" :key="idx" class="log-line">
                              <span class="line-num">{{ idx + 1 }}</span>
                              <span class="line-content" v-html="formatLogLine(line)"></span>
                           </div>
                        </template>
                        <template v-else>
                           <div class="empty-logs">暂无日志</div>
                        </template>
                     </div>
                 </div>
             </el-tab-pane>
             <el-tab-pane label="步骤详情" name="details">
                 <div class="step-details-panel">
                    <el-descriptions :column="1" border>
                       <el-descriptions-item label="步骤名称">{{ currentStep?.name }}</el-descriptions-item>
                       <el-descriptions-item label="镜像">{{ currentStep?.image }}</el-descriptions-item>
                       <el-descriptions-item label="运行节点">
                           {{ currentStep?.podName || '-' }}
                       </el-descriptions-item>
                       <el-descriptions-item label="耗时">{{ currentStep?.duration }}</el-descriptions-item>
                       <el-descriptions-item label="开始时间">-</el-descriptions-item>
                    </el-descriptions>
                 </div>
             </el-tab-pane>
          </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPipelineRun, getPipeline, triggerPipeline, getPipelineRunSteps, getPipelineRunLogs } from '@/api/cicd.js'
import { 
  ArrowLeft, User, Timer, Refresh, VideoPlay, 
  Loading, Monitor, CopyDocument, Download, Edit
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import PipelineGraph from './components/PipelineGraph.vue'

const route = useRoute()
const router = useRouter()
const runId = route.params.id

const run = ref(null)
const pipeline = ref(null)
const steps = ref([])
const logs = ref([])
const selectedStepIndex = ref(-1)
const activeTab = ref('logs')
const drawerVisible = ref(false)

const loadingLogs = ref(false)
const triggering = ref(false)
const pollingTimer = ref(null)

const handleEditPipeline = () => {
    router.push(`/cicd/pipelines/${pipeline.value.id}/edit`)
}

const currentStep = computed(() => selectedStepIndex.value >= 0 ? steps.value[selectedStepIndex.value] : null)

const fetchData = async () => {
    try {
        const resRun = await getPipelineRun(runId)
        run.value = resRun.data
        
        if (run.value.pipeline_id) {
            const resPipe = await getPipeline(run.value.pipeline_id)
            pipeline.value = resPipe.data
        }

        const resSteps = await getPipelineRunSteps(runId)
        steps.value = resSteps.data.items || resSteps.data || []
        
        // Auto select first running/failed step IF drawer is open, or update logs if open
        if (drawerVisible.value && currentStep.value) {
             fetchLogs(currentStep.value.name)
        }
    } catch(e) {
        console.error(e)
        // Silent error or small toast
    }
}

const fetchLogs = async (stepName) => {
    if (!stepName) return
    loadingLogs.value = true
    // Don't clear logs immediately to avoid flicker if polling, only if switching steps? 
    // For now clear to show loading state is safer for correctness
    logs.value = []
    try {
        const res = await getPipelineRunLogs(runId, stepName)
        const logData = res.data.logs || res.data || ''
        if (Array.isArray(logData)) {
            logs.value = logData
        } else {
            logs.value = logData.split('\n')
        }
    } catch(e) {
        // logs.value = ['加载日志失败。'] 
    } finally {
        loadingLogs.value = false
    }
}

const selectStep = (index) => {
    if (index < 0 || index >= steps.value.length) return
    selectedStepIndex.value = index
    fetchLogs(steps.value[index].name)
}

const handleNodeClick = (stepName) => {
    const idx = steps.value.findIndex(s => s.name === stepName)
    if (idx !== -1) {
        selectStep(idx)
        drawerVisible.value = true
        activeTab.value = 'logs'
    }
}

const handleDrawerClose = (done) => {
    selectedStepIndex.value = -1 // Deselect on close? Or keep selected? Let's keep state simple.
    done()
}

const handleRerun = async () => {
    triggering.value = true
    try {
        await triggerPipeline(pipeline.value.id, {})
        ElMessage.success('已触发重新运行')
        setTimeout(fetchData, 1000)
    } finally {
        triggering.value = false
    }
}

const getStatusType = (status) => {
     const map = { 'Succeeded': 'success', 'Failed': 'danger', 'Running': 'warning', 'Pending': 'info' }
     return map[status] || 'info'
}

const formatLogLine = (line) => {
    return line
}

const copyLogs = () => {
    navigator.clipboard.writeText(logs.value.join('\n'))
    ElMessage.success('日志已复制')
}

const startPolling = () => {
    if (pollingTimer.value) clearInterval(pollingTimer.value)
    pollingTimer.value = setInterval(() => {
        if (run.value?.status === 'Running' || run.value?.status === 'Pending') {
            fetchData()
        }
        // Also poll logs if drawer open and step is running
        if (drawerVisible.value && currentStep.value?.status === 'Running') {
            fetchLogs(currentStep.value.name)
        }
    }, 5000)
}

onMounted(() => {
    fetchData()
    startPolling()
})

onUnmounted(() => {
    if (pollingTimer.value) clearInterval(pollingTimer.value)
})
</script>

<style scoped>
.page-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding-bottom: 20px;
}

.page-header-card { margin-bottom: 16px; flex-shrink: 0; }
.back-btn { font-size: 18px; color: var(--text-sub); }
.ml-4 { margin-left: 16px; }
.mr-2 { margin-right: 8px; }
.m-0 { margin: 0; }
.mt-2 { margin-top: 8px; }

.page-title { font-size: 18px; font-weight: 600; color: var(--text-main); }
.meta-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-sub); }
.meta-item { display: flex; align-items: center; gap: 4px; }

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; 
}

.graph-card {
    flex: 1; /* Take all remaining space */
    padding: 0;
    overflow: hidden;
    position: relative;
}

.graph-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
}

.graph-tip {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.6);
    color: #fff;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    pointer-events: none;
}

/* Drawer Styles */
.drawer-header {
    display: flex;
    align-items: center;
}
.drawer-title { font-size: 16px; font-weight: 600; }

.logs-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1e1e2d;
    border-radius: 4px;
    overflow: hidden;
}

.logs-header {
    height: 40px;
    background: #252526;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0 16px;
    border-bottom: 1px solid #333;
}

.logs-container {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #cccccc;
    background: #1e1e2d; 
    min-height: 0;
}

.log-line { display: flex; gap: 12px; }
.line-num { color: #555; user-select: none; min-width: 30px; text-align: right; }
.line-content { white-space: pre-wrap; word-break: break-all; }

.loading-state, .empty-logs {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    min-height: 200px;
}

.step-details-panel { padding: 0 16px; }

/* Styles helpers */
.h-full { height: 100%; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1; }

:deep(.el-drawer__body) {
    padding: 0;
    overflow: hidden; /* Let internal tabs handle scroll */
}
:deep(.el-tabs__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    overflow: auto;
}
:deep(.el-tabs__header) {
    margin: 0;
    padding: 0 16px;
    background: #f5f7fa;
    border-bottom: 1px solid #e4e7ed;
}
</style>
