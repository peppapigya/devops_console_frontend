<template>
  <div class="run-detail-page">
    <!-- Header -->
    <div class="detail-header">
       <div class="header-left">
          <el-button link class="back-btn" @click="$router.push('/cicd/pipelines')">
             <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <div class="header-info">
             <div class="info-top">
                <h1 class="pipeline-name">{{ pipeline?.name || '加载中...' }}</h1>
                <el-tag :type="getStatusType(run?.status)" effect="dark" class="status-tag">
                   {{ run?.status || 'Active' }} 
                </el-tag>
             </div>
             <div class="info-bottom">
                <span class="run-id">#{{ run?.id }}</span>
                <span class="divider">|</span>
                <span class="info-item"><el-icon><User /></el-icon> {{ run?.operator || 'System' }}</span>
                <span class="divider">|</span>
                <span class="info-item"><el-icon><Timer /></el-icon> {{ run?.duration || '0s' }}</span>
             </div>
          </div>
       </div>
       <div class="header-right">
          <el-button class="cyber-button-ghost" @click="handleEditPipeline" v-if="pipeline?.id">
             <el-icon><Edit /></el-icon> 编辑流水线
          </el-button>
          <el-button class="cyber-button-ghost" @click="fetchData">
             <el-icon><Refresh /></el-icon> 刷新
          </el-button>
          <el-button type="primary" class="cyber-button blue" @click="handleRerun" :loading="triggering">
             <el-icon><VideoPlay /></el-icon> 重新运行
          </el-button>
       </div>
    </div>
    
    <!-- Edit Dialog Removed -->

    <!-- Main Content -->
    <div class="detail-body">
       <!-- Steps Timeline (Left) -->
       <div class="steps-panel">
          <div class="panel-title">流水线步骤</div>
          <div class="steps-list">
             <div 
               v-for="(step, index) in steps" 
               :key="index"
               class="step-item"
               :class="[getStepStatusClass(step.status), { active: selectedStepIndex === index }]"
               @click="selectStep(index)"
             >
                <div class="step-indicator">
                   <div class="step-line-top" v-if="index > 0"></div>
                   <div class="step-icon">
                      <el-icon v-if="step.status === 'Succeeded'"><Check /></el-icon>
                      <el-icon v-else-if="step.status === 'Failed'"><Close /></el-icon>
                      <el-icon v-else-if="step.status === 'Running'" class="is-loading"><Loading /></el-icon>
                      <el-icon v-else><MoreFilled /></el-icon>
                   </div>
                   <div class="step-line-bottom" v-if="index < steps.length - 1"></div>
                </div>
                <div class="step-content">
                   <div class="step-name">{{ step.name }}</div>
                   <div class="step-meta">
                      <span class="step-duration">{{ step.duration || '-' }}</span>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <!-- Log Viewer (Right) -->
       <div class="logs-panel">
          <div class="logs-header">
             <div class="terminal-title">
                <el-icon><Monitor /></el-icon> 
                终端输出: {{ currentStep?.name || '控制台' }}
             </div>
             <div class="terminal-actions">
                <el-button link size="small" @click="copyLogs"><el-icon><CopyDocument /></el-icon></el-button>
                <el-button link size="small"><el-icon><Download /></el-icon></el-button>
             </div>
          </div>
          <div class="logs-container" ref="logsContainer">
             <template v-if="loadingLogs">
                <div class="loading-state">
                   <el-icon class="is-loading"><Loading /></el-icon> 正在加载日志...
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPipelineRun, getPipeline, triggerPipeline, getPipelineRunSteps, getPipelineRunLogs } from '@/api/cicd.js'
import { 
  ArrowLeft, User, Timer, Refresh, VideoPlay, 
  Check, Close, Loading, MoreFilled, Monitor, 
  CopyDocument, Download, Edit
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const runId = route.params.id

const run = ref(null)
const pipeline = ref(null)
const steps = ref([])
const logs = ref([])
const selectedStepIndex = ref(0)
const loadingLogs = ref(false)
const triggering = ref(false)
const pollingTimer = ref(null)

// Edit
const handleEditPipeline = () => {
    router.push(`/cicd/pipelines/${pipeline.value.id}/edit`)
}

const currentStep = computed(() => steps.value[selectedStepIndex.value])

const fetchData = async () => {
    try {
        const resRun = await getPipelineRun(runId)
        run.value = resRun.data
        
        if (run.value.pipeline_id) {
            const resPipe = await getPipeline(run.value.pipeline_id)
            pipeline.value = resPipe.data
        }

        // Fetch steps
        const resSteps = await getPipelineRunSteps(runId)
        // Check if steps is array inside a data property or direct
        steps.value = resSteps.data.items || resSteps.data || []
        
        // If no steps selected, select first
        if (steps.value.length > 0) {
            fetchLogs(currentStep.value?.name)
        }
    } catch(e) {
        console.error(e)
    }
}

const fetchLogs = async (stepName) => {
    if (!stepName) return
    loadingLogs.value = true
    logs.value = []
    try {
        const res = await getPipelineRunLogs(runId, stepName)
        // Assume logs come as array of strings or single string
        const logData = res.data.logs || res.data || ''
        if (Array.isArray(logData)) {
            logs.value = logData
        } else {
            logs.value = logData.split('\n')
        }
    } catch(e) {
        logs.value = ['加载日志失败。']
    } finally {
        loadingLogs.value = false
    }
}

const selectStep = (index) => {
    selectedStepIndex.value = index
    fetchLogs(steps.value[index].name)
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

const getStepStatusClass = (status) => {
     const map = { 'Succeeded': 'step-success', 'Failed': 'step-failed', 'Running': 'step-running', 'Pending': 'step-pending' }
     return map[status] || 'step-pending'
}

const formatLogLine = (line) => {
    // Simple ANSI color replacement could go here if needed
    return line
}

const copyLogs = () => {
    navigator.clipboard.writeText(logs.value.join('\n'))
    ElMessage.success('日志已复制')
}

// Auto-refresh if running
const startPolling = () => {
    if (pollingTimer.value) clearInterval(pollingTimer.value)
    pollingTimer.value = setInterval(() => {
        if (run.value?.status === 'Running' || run.value?.status === 'Pending') {
            fetchData()
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
.run-detail-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: transparent;
    gap: 16px;
}

/* Header */
.detail-header {
    background: #fff;
    border-radius: 12px;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.header-left { display: flex; align-items: center; gap: 16px; }
.back-btn { font-size: 18px; color: #606266; }
.header-info { display: flex; flex-direction: column; gap: 4px; }

.info-top { display: flex; align-items: center; gap: 12px; }
.pipeline-name { margin: 0; font-size: 18px; font-weight: 600; color: #303133; }
.status-tag { border: none; font-weight: 500; }

.info-bottom { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #909399; }
.divider { color: #E4E7ED; }
.info-item { display: flex; align-items: center; gap: 4px; }

/* Main Body */
.detail-body {
    flex: 1;
    display: flex;
    gap: 16px;
    overflow: hidden;
}

/* Steps Panel */
.steps-panel {
    width: 320px;
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    margin-bottom: 20px;
    letter-spacing: 0.5px;
}

.steps-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.step-item {
    display: flex;
    gap: 16px;
    cursor: pointer;
    min-height: 56px;
}

.step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 24px;
}

.step-line-top, .step-line-bottom { width: 2px; background: #E4E7ED; flex: 1; min-height: 10px;}
.step-item:first-child .step-line-top { visibility: hidden; }
.step-item:last-child .step-line-bottom { visibility: hidden; }

.step-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f4f5;
    color: #909399;
    border: 2px solid #fff;
    box-shadow: 0 0 0 2px #E4E7ED;
    z-index: 1;
    transition: all 0.2s;
}

.step-content {
    flex: 1;
    padding-bottom: 20px;
    border-radius: 8px;
    padding: 8px 12px;
    transition: background 0.2s;
}

.step-item:hover .step-content { background: #F5F7FA; }
.step-item.active .step-content { background: #ECF5FF; }

.step-name { font-weight: 500; font-size: 14px; color: #303133; margin-bottom: 2px; }
.step-duration { font-size: 12px; color: #C0C4CC; }

/* Step Status Colors */
.step-success .step-icon { background: #13ce66; color: #fff; box-shadow: 0 0 0 4px rgba(19, 206, 102, 0.1); }
.step-failed .step-icon { background: #F56C6C; color: #fff; box-shadow: 0 0 0 4px rgba(245, 108, 108, 0.1); }
.step-running .step-icon { background: #326CE5; color: #fff; box-shadow: 0 0 0 4px rgba(50, 108, 229, 0.1); }
.step-pending .step-icon { background: #E4E7ED; }

/* Logs Panel */
.logs-panel {
    flex: 1;
    background: #1e1e2d; /* Dark terminal bg */
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.logs-header {
    height: 48px;
    background: #252526;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    border-bottom: 1px solid #333;
}

.terminal-title {
    color: #E1E1E1;
    font-size: 13px;
    font-family: 'Consolas', monospace;
    display: flex;
    align-items: center;
    gap: 8px;
}

.logs-container {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #cccccc;
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
    gap: 8px;
}

/* Dark Mode Overrides for Panels */
.dark .detail-header, .dark .steps-panel {
    background: #1e1e2d;
}
.dark .pipeline-name { color: #fff; }
.dark .step-name { color: #eee; }
.dark .step-item:hover .step-content { background: #2a2a35; }
.dark .step-item.active .step-content { background: rgba(50, 108, 229, 0.2); }
</style>
