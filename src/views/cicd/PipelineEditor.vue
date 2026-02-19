<template>
  <div class="page-container">
    <!-- Header -->
    <el-card class="page-header-card">
       <div class="page-header">
         <div class="header-left">
           <el-button link class="back-btn" @click="$router.back()">
              <el-icon><ArrowLeft /></el-icon> 返回
           </el-button>
           <div class="header-title-wrapper ml-4">
              <h2>{{ form.name || (isEditMode ? '编辑流水线' : '新建流水线') }}</h2>
              <p class="subtitle">{{ isEditMode ? '更新配置' : '创建新配置' }}</p>
           </div>
         </div>
         <div class="header-right">
            <el-button @click="fetchData" v-if="isEditMode" :icon="Refresh">重置</el-button>
            <el-button type="primary" @click="handleGlobalSave" :loading="savingGlobal" :icon="Check">保存全部配置</el-button>
         </div>
       </div>
    </el-card>

    <el-row :gutter="20" class="editor-workspace" v-loading="loadingData">
       <!-- Left Sidebar: Structure Tree -->
       <el-col :span="6">
         <el-card class="content-card sidebar-panel">
            <template #header>
               <div class="flex-between">
                  <span>配置结构</span>
                  <el-tooltip content="添加步骤" placement="top">
                     <el-button circle size="small" type="primary" @click="handleAddStep">
                         <el-icon><Plus /></el-icon>
                     </el-button>
                  </el-tooltip>
               </div>
            </template>

            <div class="structure-list">
               <!-- Basic Settings Node -->
               <div 
                  class="structure-item" 
                  :class="{ active: currentSelection === 'basic' }"
                  @click="currentSelection = 'basic'"
               >
                  <div class="item-icon basic-icon"><el-icon><Setting /></el-icon></div>
                  <div class="item-info">
                     <div class="item-title">基础信息</div>
                     <div class="item-desc">Git仓、分支、模板</div>
                  </div>
               </div>

               <div class="divider">流水线步骤</div>
               
               <!-- Steps List (Draggable) -->
               <div class="steps-scroll-area">
                  <div v-if="stepsList.length === 0" class="no-steps-hint">
                     点击右上角 + 添加步骤
                  </div>
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
               </div>
            </div>
         </el-card>
       </el-col>

       <!-- Right Panel: Dynamic Form -->
       <el-col :span="18">
         <el-card class="content-card detail-panel">
            <!-- Case 1: Basic Info Form -->
            <div v-if="currentSelection === 'basic'" class="form-container">
               <div class="panel-header-custom">
                  <el-icon><Setting /></el-icon> <span>基础信息配置</span>
               </div>
               <el-form :model="form" label-position="top">
                   <el-form-item label="流水线名称" required>
                      <el-input v-model="form.name" placeholder="请输入流水线名称" />
                   </el-form-item>
                   <el-form-item label="描述">
                      <el-input v-model="form.description" type="textarea" :rows="3" placeholder="简要描述流水线功能" />
                   </el-form-item>
                   <el-form-item label="目标集群" required>
                      <el-select v-model="form.k8sInstanceId" placeholder="选择K8s集群">
                          <el-option
                             v-for="item in k8sInstanceList"
                             :key="item.id"
                             :label="item.name"
                             :value="item.id"
                          />
                      </el-select>
                   </el-form-item>
                   <el-row :gutter="20">
                       <el-col :span="12">
                           <el-form-item label="代码仓库 URL" required>
                              <el-input v-model="form.gitUrl" placeholder="https://github.com/...">
                                  <template #prefix><el-icon><Connection /></el-icon></template>
                              </el-input>
                           </el-form-item>
                       </el-col>
                       <el-col :span="12">
                           <el-form-item label="默认分支" required>
                              <el-input v-model="form.branch" placeholder="main">
                                  <template #prefix><el-icon><Bicycle /></el-icon></template>
                              </el-input>
                           </el-form-item>
                       </el-col>
                   </el-row>
                   <el-form-item label="Argo 模板" required>
                      <el-input v-model="form.argoTemplate" placeholder="workflow-template-name">
                          <template #prefix><el-icon><Cpu /></el-icon></template>
                      </el-input>
                   </el-form-item>
               </el-form>
            </div>

            <!-- Case 2: Step Detail Form -->
            <div v-else-if="currentSelection === 'step' && stepsList[currentStepIndex]" class="form-container">
                <div class="panel-header-custom">
                   <div class="ph-left">
                       <el-icon><Box /></el-icon> 步骤配置: <span class="highlight-text">{{ stepsList[currentStepIndex].name }}</span>
                   </div>
                   <el-tag size="small" type="info">步骤 {{ currentStepIndex + 1 }}</el-tag>
                </div>
                
                <el-form label-position="top">
                    <el-form-item label="步骤名称" required>
                        <el-input v-model="stepsList[currentStepIndex].name" placeholder="例如: Check Code" />
                    </el-form-item>
                    <el-form-item label="运行镜像" required>
                        <el-input v-model="stepsList[currentStepIndex].image" placeholder="例如: golang:1.18">
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
         </el-card>
       </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createPipeline, updatePipeline, getPipeline, getPipelineSteps, createPipelineStep, updatePipelineStep, deletePipelineStep } from '@/api/cicd.js'
import { getInstanceList } from '@/api/instance.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
    ArrowLeft, Check, Setting, Connection, Cpu, Refresh,
    Plus, Delete, Rank, Box, Monitor, Pointer, Bicycle
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
    argoTemplate: '',
    k8sInstanceId: null
})

const k8sInstanceList = ref([])

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

const fetchK8sInstances = async () => {
    try {
        const res = await getInstanceList({ page: 1, page_size: 100 })
        const list = res.data?.list?.data || []
        k8sInstanceList.value = list.filter(item => item.instance_type === 'kubernetes')
        
        // Default select first if not set
        if (!form.k8sInstanceId && k8sInstanceList.value.length > 0) {
            form.k8sInstanceId = k8sInstanceList.value[0].id
        }
    } catch (e) {
        console.error('Fetch instances failed', e)
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
    if (!form.name || !form.gitUrl || !form.argoTemplate || !form.k8sInstanceId) {
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
            const res = await createPipeline(form)
            if (res.data.data && res.data.data.id) {
                pid = res.data.data.id
                form.id = pid
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
             router.replace(`/cicd/pipelines/${pid}/edit`)
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


onMounted(() => {
    fetchData()
    fetchK8sInstances()
})
</script>

<style scoped>
.back-btn { font-size: 14px; color: var(--text-sub); }
.ml-4 { margin-left: 16px; }

.structure-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
}

.divider {
    font-size: 12px;
    color: var(--text-sub);
    margin: 16px 0 8px 0;
    font-weight: 600;
    padding-left: 12px;
}

.structure-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
    gap: 12px;
}

.structure-item:hover { background: #f5f7fa; }
.structure-item.active { background: #ecf5ff; border-color: #d9ecff; }

.item-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    background: #f0f2f5; color: var(--text-sub);
}
.active .item-icon { background: var(--primary-color); color: #fff; }

.item-info { flex: 1; overflow: hidden; }
.item-title { font-size: 14px; font-weight: 500; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-desc { font-size: 12px; color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Steps */
.step-item {
    background: #fff;
    border: 1px solid var(--border-color);
    margin-bottom: 8px;
    position: relative;
    padding-left: 40px;
}

.step-idx {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: #f0f2f5;
    color: var(--text-sub);
    font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
    position: absolute;
    left: 8px;
}
.active .step-idx { background: var(--primary-color); color: #fff; }

.drag-handle { 
    position: absolute; right: 8px; top: 4px; 
    color: var(--text-sub); cursor: grab; opacity: 0; 
}
.step-item:hover .drag-handle { opacity: 1; }

.delete-btn {
    position: absolute; right: 8px; bottom: 4px;
    opacity: 0; transition: opacity 0.2s;
}
.step-item:hover .delete-btn { opacity: 1; }

.panel-header-custom {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-main);
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
}
.ph-left { display: flex; align-items: center; gap: 8px; }
.highlight-text { color: var(--primary-color); }

.empty-selection {
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-sub);
}
.huge-icon { font-size: 48px; margin-bottom: 16px; }

.code-editor-input :deep(.el-textarea__inner) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    background: #fafafa;
}

.no-steps-hint { text-align: center; color: var(--text-sub); font-size: 12px; margin-top: 20px; }
</style>
