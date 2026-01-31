<template>
  <div class="pipeline-editor-page">
    <!-- Header -->
    <div class="editor-header">
       <div class="header-left">
          <el-button link class="back-btn" @click="$router.back()">
             <el-icon><ArrowLeft /></el-icon> 返回
          </el-button>
          <div class="header-title">
             <h1 class="page-title">{{ form.name || (isEditMode ? '编辑流水线' : '新建流水线') }}</h1>
             <span class="page-subtitle">{{ isEditMode ? 'Updating Configuration' : 'New Configuration' }}</span>
          </div>
       </div>
       <div class="header-right">
          <el-button class="cyber-button-ghost" @click="fetchData" v-if="isEditMode">
             <el-icon><Refresh /></el-icon> 重置
          </el-button>
          <el-button type="primary" class="cyber-button blue" @click="handleGlobalSave" :loading="savingGlobal">
             <el-icon><Check /></el-icon> 保存全部配置
          </el-button>
       </div>
    </div>

    <!-- Main Workspace -->
    <div class="editor-workspace" v-loading="loadingData">
       
       <!-- Left Sidebar: Structure Tree -->
       <div class="sidebar-panel glass-panel">
          <div class="sidebar-header">
             <span class="sh-title">配置结构</span>
             <el-tooltip content="添加步骤" placement="top">
                <el-button circle size="small" type="primary" @click="handleAddStep">
                    <el-icon><Plus /></el-icon>
                </el-button>
             </el-tooltip>
          </div>

          <div class="structure-list">
             <!-- Basic Settings Node -->
             <div 
                class="structure-item" 
                :class="{ active: currentSelection === 'basic' }"
                @click="currentSelection = 'basic'"
             >
                <div class="msg-icon basic-icon"><el-icon><Setting /></el-icon></div>
                <div class="item-info">
                   <div class="item-title">基础信息</div>
                   <div class="item-desc">Git仓、分支、模板</div>
                </div>
             </div>

             <div class="divider">流水线步骤</div>
             
             <!-- Steps List (Draggable) -->
             <div class="steps-scroll-area">
                <div 
                    v-for="(step, index) in stepsList" 
                    :key="step.tempId || step.id" 
                    class="structure-item step-item"
                    :class="{ active: currentSelection === 'step' && currentStepIndex === index }"
                    @click="handleSelectStep(index)"
                    draggable="true"
                    @dragstart="onDragStart($event, index)"
                    @dragover.prevent
                    @dragenter.prevent
                    @drop="onDrop($event, index)"
                >
                    <div class="drag-handle"><el-icon><Rank /></el-icon></div>
                    <div class="step-idx">{{ index + 1 }}</div>
                    <div class="item-info">
                        <div class="item-title">{{ step.name || '未命名步骤' }}</div>
                        <div class="item-desc">{{ step.image }}</div>
                    </div>
                     <el-button 
                        link 
                        type="danger" 
                        class="delete-btn" 
                        @click.stop="handleDeleteStep(index)"
                    >
                        <el-icon><Delete /></el-icon>
                    </el-button>
                </div>
                 <div v-if="stepsList.length === 0" class="no-steps-hint">
                    点击右上角 + 添加步骤
                 </div>
             </div>
          </div>
       </div>

       <!-- Right Panel: Dynamic Form -->
       <div class="detail-panel glass-panel">
          
          <!-- Case 1: Basic Info Form -->
          <div v-if="currentSelection === 'basic'" class="form-container">
             <div class="panel-header">
                <el-icon><Setting /></el-icon> 基础信息配置
             </div>
             <el-form :model="form" label-position="top" class="cyber-form">
                 <el-form-item label="流水线名称" required>
                    <el-input v-model="form.name" placeholder="请输入流水线名称" class="cyber-input" />
                 </el-form-item>
                 <el-form-item label="描述">
                    <el-input v-model="form.description" type="textarea" :rows="3" placeholder="简要描述流水线功能" class="cyber-input" />
                 </el-form-item>
                 <div class="form-row">
                     <el-form-item label="代码仓库 URL" required class="flex-1">
                        <el-input v-model="form.gitUrl" placeholder="https://github.com/..." class="cyber-input">
                            <template #prefix><el-icon><Connection /></el-icon></template>
                        </el-input>
                     </el-form-item>
                     <el-form-item label="默认分支" required class="flex-1">
                        <el-input v-model="form.branch" placeholder="main" class="cyber-input">
                            <template #prefix><el-icon><bicycle /></el-icon></template>
                        </el-input>
                     </el-form-item>
                 </div>
                 <el-form-item label="Argo 模板" required>
                    <el-input v-model="form.argoTemplate" placeholder="workflow-template-name" class="cyber-input">
                        <template #prefix><el-icon><Cpu /></el-icon></template>
                    </el-input>
                 </el-form-item>
             </el-form>
          </div>

          <!-- Case 2: Step Detail Form -->
          <div v-else-if="currentSelection === 'step' && stepsList[currentStepIndex]" class="form-container">
              <div class="panel-header">
                 <div class="ph-left">
                     <el-icon><Box /></el-icon> 步骤配置: <span class="highlight-text">{{ stepsList[currentStepIndex].name }}</span>
                 </div>
                 <span class="step-badge">Index: {{ currentStepIndex + 1 }}</span>
              </div>
              
              <el-form label-position="top" class="cyber-form">
                  <el-form-item label="步骤名称" required>
                      <el-input v-model="stepsList[currentStepIndex].name" placeholder="例如: Check Code" class="cyber-input" />
                  </el-form-item>
                  <el-form-item label="运行镜像" required>
                      <el-input v-model="stepsList[currentStepIndex].image" placeholder="例如: golang:1.18" class="cyber-input">
                         <template #prefix><el-icon><Monitor /></el-icon></template>
                      </el-input>
                  </el-form-item>
                  <el-form-item label="Shell 命令">
                      <el-input 
                        v-model="stepsList[currentStepIndex].commands" 
                        type="textarea" 
                        :rows="12" 
                        class="code-editor-input"
                        placeholder="# 输入运行命令..." 
                      />
                  </el-form-item>
              </el-form>
          </div>

          <div v-else class="empty-selection">
              <el-icon class="huge-icon"><Pointer /></el-icon>
              <p>请在左侧选择要配置的项</p>
          </div>

       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createPipeline, updatePipeline, getPipeline, getPipelineSteps, createPipelineStep, updatePipelineStep, deletePipelineStep } from '@/api/cicd.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
    ArrowLeft, Check, Setting, Connection, Cpu, Refresh,
    Plus, Delete, Rank, Box, Monitor, Pointer
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const pipelineId = route.params.id

const isEditMode = computed(() => !!pipelineId)
const loadingData = ref(false)
const savingGlobal = ref(false)

// State
const currentSelection = ref('basic') // 'basic' | 'step'
const currentStepIndex = ref(0)
const draggedItemIndex = ref(null)

const form = reactive({
    id: null,
    name: '',
    description: '',
    gitUrl: '',
    branch: 'main',
    argoTemplate: ''
})

const stepsList = ref([])
const deletedStepIds = ref([]) // Track deleted steps for backend sync

const fetchData = async () => {
    if (!isEditMode.value) return
    loadingData.value = true
    try {
        const res = await getPipeline(pipelineId)
        const data = res.data.data
        Object.assign(form, data)
        const stepRes = await getPipelineSteps(pipelineId)
        stepsList.value = (stepRes.data.data || []).map(s => ({...s})) // Clone
    } catch(e) {
        ElMessage.error('加载流水线数据失败')
    } finally {
        loadingData.value = false
    }
}

const handleAddStep = () => {
    stepsList.value.push({
        tempId: Date.now(), // Local temp ID
        name: 'New Step',
        image: 'ubuntu:latest',
        commands: 'echo "hello world"',
        sort: stepsList.value.length
    })
    // Auto select new step
    currentSelection.value = 'step'
    currentStepIndex.value = stepsList.value.length - 1
}

const handleSelectStep = (index) => {
    currentSelection.value = 'step'
    currentStepIndex.value = index
}

const handleDeleteStep = (index) => {
    const step = stepsList.value[index]
    if (step.id) {
        deletedStepIds.value.push(step.id)
    }
    stepsList.value.splice(index, 1)
    if (currentStepIndex.value >= stepsList.value.length) {
        currentStepIndex.value = Math.max(0, stepsList.value.length - 1)
    }
    if (stepsList.value.length === 0) {
        currentSelection.value = 'basic'
    }
}

// Drag functionality
const onDragStart = (e, index) => {
    draggedItemIndex.value = index
    e.dataTransfer.effectAllowed = 'move'
}

const onDrop = (e, index) => {
    if (draggedItemIndex.value === null || draggedItemIndex.value === index) return
    const item = stepsList.value.splice(draggedItemIndex.value, 1)[0]
    stepsList.value.splice(index, 0, item)
    draggedItemIndex.value = null
}

// Global Save Logic
const handleGlobalSave = async () => {
    if (!form.name || !form.gitUrl || !form.argoTemplate) {
        ElMessage.warning('请完善基础信息')
        currentSelection.value = 'basic'
        return
    }

    savingGlobal.value = true
    try {
        // 1. Save Pipeline Info
        let pid = form.id
        if (pid) {
            await updatePipeline(pid, form)
        } else {
            // Create pipeline
            // NOTE: Backend needs to return ID.
            // Assuming the current createPipeline API does standard JSON return
            // We might need to fetch the list to find it if backend doesn't return ID?
            // Let's hope your backend returns the created object or ID.
            const res = await createPipeline(form)
            // If we can't get ID, we can't save steps.
            // Usually backend returns { code: 200, data: { ...pipeline } } or similar
            // If not, we have a problem.
            // Fallback: If backend returns success but no ID, we might need to query by name?
            // Let's check res structure if possible.
            // For now, assuming res.data.data contains the new record or ID.
            if (res.data.data && res.data.data.id) {
                pid = res.data.data.id
                form.id = pid
            } else {
                 // Optimization: If API doesn't return ID, we can't proceed with step creation.
                 // We will assume it does for now as is standard.
                 // If failure, user will see "Saved basic info but failed steps".
            }
        }

        if (!pid) {
            throw new Error('无法获取流水线ID，无法保存步骤')
        }

        // 2. Process Deletions
        for (const delId of deletedStepIds.value) {
            await deletePipelineStep(delId)
        }
        deletedStepIds.value = [] // Reset

        // 3. Process Steps (Create/Update)
        // We do this concurrently or sequentially.
        const promises = stepsList.value.map((step, idx) => {
             const payload = {
                 ...step,
                 pipelineId: pid,
                 sort: idx
             }
             if (step.id) {
                 return updatePipelineStep(payload)
             } else {
                 return createPipelineStep(payload)
             }
        })
        
        await Promise.all(promises)
        
        ElMessage.success('全部配置已保存')
        if (!isEditMode.value) {
             // Redirect to edit mode or list
             router.replace(`/cicd/pipelines/${pid}/edit`)
             // Reload to get real IDs for new steps
             setTimeout(fetchData, 500)
        } else {
            fetchData()
        }

    } catch(e) {
        console.error(e)
        ElMessage.error('保存失败: ' + (e.message || 'Unknown error'))
    } finally {
        savingGlobal.value = false
    }
}

onMounted(fetchData)
</script>

<style scoped>
.pipeline-editor-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.header-left { display: flex; align-items: center; gap: 16px; }
.header-title { display: flex; flex-direction: column; }
.page-title { margin: 0; font-size: 18px; font-weight: 600; color: #303133; }
.page-subtitle { font-size: 12px; color: #909399; }
.back-btn { font-size: 14px; color: #606266; }

/* Workspace */
.editor-workspace {
    flex: 1;
    display: flex;
    gap: 20px;
    overflow: hidden; /* To contain inner scroll */
}

/* Sidebar */
.sidebar-panel {
    width: 320px;
    background: #fff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    border: 1px solid #EBEEF5;
    overflow: hidden;
}

.sidebar-header {
    padding: 16px;
    border-bottom: 1px solid #EBEEF5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #FAFAFA;
}
.sh-title { font-weight: 600; color: #303133; }

.structure-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.divider {
    font-size: 12px;
    color: #909399;
    margin: 12px 0 4px 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.structure-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
    gap: 12px;
}
.structure-item:hover { background: #F5F7FA; }
.structure-item.active { background: #ECF5FF; border-color: #D9ECFF; }

.msg-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    background: #F0F2F5; color: #606266;
}
.basic-icon { background: rgba(50, 108, 229, 0.1); color: #326CE5; }
.active .msg-icon { background: #326CE5; color: #fff; }

.steps-scroll-area {
    display: flex;
    flex-direction: column;
    align-items: center; /* Center items for flowchart look */
    gap: 32px; /* Space for arrows */
    padding: 16px 0;
}

.step-item { 
    position: relative; 
    z-index: 1; 
    width: 260px; /* Fixed width cards */
    justify-content: flex-start;
    border: 1px solid #DCDFE6;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

/* Flowchart Arrow */
.step-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 50%; /* Center */
    top: 100%; /* Bottom of card */
    height: 32px; /* Gap size */
    width: 2px;
    background: #DCDFE6;
    z-index: -1;
    transform: translateX(-50%);
}

/* Arrowhead */
.step-item:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 50%;
    top: calc(100% + 24px); /* Position at end of line */
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #DCDFE6;
    z-index: 0;
}

.drag-handle { cursor: grab; color: #C0C4CC; font-size: 14px; opacity: 0; transition: opacity 0.2s; position: absolute; right: 8px; top: 8px; }
.step-item:hover .drag-handle { opacity: 1; }

.step-idx {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: #F0F2F5;
    color: #909399;
    font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
}
.active .step-idx { background: #326CE5; color: #fff; }

.item-info { flex: 1; min-width: 0; text-align: left; }
.item-title { font-size: 14px; font-weight: 500; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-desc { font-size: 12px; color: #909399; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.delete-btn { opacity: 0; transition: opacity 0.2s; position: absolute; right: 8px; bottom: 8px;}
.step-item:hover .delete-btn { opacity: 1; }

.no-steps-hint { font-size: 12px; color: #C0C4CC; text-align: center; margin-top: 20px; }

/* Dark Mode Overrides for Flowchart */
.dark .step-item { background: #2b2b2c; border-color: #4C4D4F; }
.dark .step-item:hover { border-color: #326CE5; }
.dark .step-item:not(:last-child)::after { background: #4C4D4F; }
.dark .step-item:not(:last-child)::before { border-top-color: #4C4D4F; }
.dark .step-idx { background: #363637; color: #C0C4CC; }
.dark .active .step-idx { background: #326CE5; color: #fff; }

/* Right Panel */
.detail-panel {
    flex: 1;
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    border: 1px solid #EBEEF5;
    overflow-y: auto;
    position: relative;
}

.panel-header {
    font-size: 18px; 
    font-weight: 600; 
    color: #303133; 
    margin-bottom: 24px; 
    padding-bottom: 16px;
    border-bottom: 1px solid #EBEEF5;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
}
.ph-left { display: flex; align-items: center; gap: 10px; }
.highlight-text { color: #326CE5; }
.step-badge { font-size: 12px; background: #F0F2F5; padding: 4px 8px; border-radius: 4px; color: #909399; font-weight: normal; }

.form-container { max-width: 800px; margin: 0 auto; }
.form-row { display: flex; gap: 20px; }
.flex-1 { flex: 1; }

.code-editor-input :deep(.el-textarea__inner) {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
    line-height: 1.5;
    background: #FAFAFA;
    border-color: #DCDFE6;
}

.empty-selection {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #DCDFE6;
}
.huge-icon { font-size: 64px; margin-bottom: 16px; }

/* Dark Mode */
.dark .editor-header, .dark .sidebar-panel, .dark .detail-panel { 
    background: #1e1e2d; border-color: #303030; 
}
.dark .sidebar-header { background: #262635; border-bottom-color: #303030; }
.dark .page-title, .dark .sh-title, .dark .item-title, .dark .panel-header { color: #fff; }
.dark .msg-icon, .dark .step-idx { background: #363637; color: #C0C4CC; }
.dark .structure-item:hover { background: #2b2b2c; }
.dark .structure-item.active { background: rgba(50, 108, 229, 0.1); border-color: rgba(50, 108, 229, 0.3); }
.dark .step-badge { background: #363637; color: #ccc; }
.dark .code-editor-input :deep(.el-textarea__inner) { background: #2b2b2c; border-color: #4C4D4F; color: #fff; }
</style>
