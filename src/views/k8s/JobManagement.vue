<template>
  <div class="job-management">
    <div class="page-header">
      <h2>Job管理</h2>
      <div class="header-actions">
        <div class="namespace-selector">
          <span class="selector-label">命名空间：</span>
          <el-select v-model="selectedNamespace" placeholder="选择命名空间" @change="handleNamespaceChange" style="width: 200px;">
            <el-option
              key="all"
              label="所有"
              value="all"
            />
            <el-option
              v-for="ns in namespaceList"
              :key="ns.name"
              :label="ns.name"
              :value="ns.name"
            />
          </el-select>
        </div>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          创建Job
        </el-button>
        <el-button @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索框 -->
    <el-card class="search-card">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索Job名称"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
      </el-row>
    </el-card>

    <!-- Job列表 -->
    <el-card class="content-card">
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="filteredJobs"
          @selection-change="handleSelectionChange"
          stripe
          style="width: 100%"
          height="calc(100vh - 280px)"
          :empty-text="loading ? '加载中...' : '暂无数据'"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="jobName" label="名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link type="primary" @click="handleViewDetail(row)">
                {{ row.jobName }}
              </el-link>
            </template>
          </el-table-column>
        <el-table-column prop="nameSpace" label="命名空间" width="120" />
        <el-table-column label="完成数/期望数" width="120">
          <template #default="{ row }">
            <el-tag :type="getJobCompletionStatus(row.podsStatuses) ? 'success' : 'warning'">
              {{ extractCompletionCount(row.podsStatuses) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="持续时间" width="120">
          <template #default="{ row }">
            {{ formatDuration(row.startTime, row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getJobStatusType(row.podsStatuses)">
              {{ extractJobStatus(row.podsStatuses) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="120">
          <template #default="{ row }">
            {{ formatJobTime(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="handleViewDetail(row)">
                <el-icon><View /></el-icon>
                详情
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
    </el-card>

    <!-- 批量操作 -->
    <div v-if="selectedJobs.length > 0" class="batch-actions">
      <el-alert
        :title="`已选择 ${selectedJobs.length} 个Job`"
        type="info"
        :closable="false"
      >
        <template #default>
          <el-button size="small" @click="handleBatchDelete" type="danger">批量删除</el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </template>
      </el-alert>
    </div>

    <!-- 创建Job对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建 Job" width="900px" :close-on-click-modal="false">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="表单创建" name="form">
          <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="120px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="命名空间" prop="namespace">
                  <el-select v-model="createForm.namespace" placeholder="选择命名空间" style="width: 100%;">
                    <el-option
                      v-for="ns in namespaceList"
                      :key="ns.name"
                      :label="ns.name"
                      :value="ns.name"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Job 名称" prop="name">
                  <el-input v-model="createForm.name" placeholder="请输入 Job 名称" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-divider content-position="left">作业配置</el-divider>
            
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="并行数" prop="parallelism">
                  <el-input-number v-model="createForm.parallelism" :min="1" style="width: 100%;" />
                  <div class="help-text">
                    <small>同时运行的Pod数量</small>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="完成数" prop="completions">
                  <el-input-number v-model="createForm.completions" :min="1" style="width: 100%;" />
                  <div class="help-text">
                    <small>需要成功完成的Pod数量</small>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="超时时间(秒)">
                  <el-input-number v-model="createForm.activeDeadlineSeconds" :min="1" style="width: 100%;" />
                  <div class="help-text">
                    <small>作业运行的最长时间</small>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="回退限制">
                  <el-input-number v-model="createForm.backoffLimit" :min="0" style="width: 100%;" />
                  <div class="help-text">
                    <small>失败后的重试次数</small>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="重启策略">
                  <el-select v-model="createForm.restartPolicy" placeholder="选择策略" style="width: 100%;">
                    <el-option label="OnFailure" value="OnFailure" />
                    <el-option label="Never" value="Never" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-divider content-position="left">Pod 模板配置</el-divider>
            
            <el-form-item label="Pod 标签">
              <div v-for="(label, index) in createForm.podLabels" :key="index" class="label-config">
                <el-row :gutter="10">
                  <el-col :span="10">
                    <el-input v-model="label.key" placeholder="标签键" />
                  </el-col>
                  <el-col :span="10">
                    <el-input v-model="label.value" placeholder="标签值" />
                  </el-col>
                  <el-col :span="4">
                    <el-button type="danger" size="small" @click="removePodLabel(index)">删除</el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" size="small" @click="addPodLabel">添加标签</el-button>
            </el-form-item>
            
            <el-divider content-position="left">容器配置</el-divider>
            
            <div v-for="(container, index) in createForm.containers" :key="index" class="container-config">
              <el-card class="container-card">
                <template #header>
                  <div class="container-header">
                    <span>容器 {{ index + 1 }}</span>
                    <el-button 
                      v-if="createForm.containers.length > 1"
                      type="danger" 
                      size="small" 
                      text
                      @click="removeContainer(index)"
                    >
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                  </div>
                </template>
                
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item :label="`容器名称`" :prop="`containers.${index}.name`" :rules="{ required: true, message: '请输入容器名称', trigger: 'blur' }">
                      <el-input v-model="container.name" placeholder="请输入容器名称" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item :label="`镜像`" :prop="`containers.${index}.image`" :rules="{ required: true, message: '请输入镜像', trigger: 'blur' }">
                      <el-input v-model="container.image" placeholder="例如: busybox:latest" />
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="镜像拉取策略">
                      <el-select v-model="container.imagePullPolicy" placeholder="选择策略">
                        <el-option label="Always" value="Always" />
                        <el-option label="IfNotPresent" value="IfNotPresent" />
                        <el-option label="Never" value="Never" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="工作目录">
                      <el-input v-model="container.workingDir" placeholder="容器内的工作目录（可选）" />
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-form-item label="命令">
                  <el-input v-model="container.command" placeholder="例如: /bin/sh,-c,'echo Hello World'" />
                  <div class="help-text">
                    <small>多个命令用逗号分隔，如: /bin/sh,-c,'echo Hello World'</small>
                  </div>
                </el-form-item>
                
                <el-form-item label="参数">
                  <el-input v-model="container.args" placeholder="例如: arg1,arg2,arg3" />
                  <div class="help-text">
                    <small>多个参数用逗号分隔</small>
                  </div>
                </el-form-item>
                
                <el-form-item label="环境变量">
                  <div v-for="(env, envIndex) in container.env" :key="envIndex" class="env-config">
                    <el-row :gutter="10">
                      <el-col :span="8">
                        <el-input v-model="env.name" placeholder="变量名" />
                      </el-col>
                      <el-col :span="12">
                        <el-input v-model="env.value" placeholder="变量值" />
                      </el-col>
                      <el-col :span="4">
                        <el-button type="danger" size="small" @click="removeEnv(container, envIndex)">删除</el-button>
                      </el-col>
                    </el-row>
                  </div>
                  <el-button type="primary" size="small" @click="addEnv(container)">添加环境变量</el-button>
                </el-form-item>
                
                <el-form-item label="资源限制">
                  <el-row :gutter="20">
                    <el-col :span="12">
                      <el-form-item label="CPU请求">
                        <el-input v-model="container.resources.requests.cpu" placeholder="例如: 100m" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="内存请求">
                        <el-input v-model="container.resources.requests.memory" placeholder="例如: 128Mi" />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="20">
                    <el-col :span="12">
                      <el-form-item label="CPU限制">
                        <el-input v-model="container.resources.limits.cpu" placeholder="例如: 500m" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="内存限制">
                        <el-input v-model="container.resources.limits.memory" placeholder="例如: 512Mi" />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form-item>
                
                <el-form-item label="挂载卷">
                  <div v-for="(volume, volumeIndex) in container.volumeMounts" :key="volumeIndex" class="volume-config">
                    <el-row :gutter="10">
                      <el-col :span="8">
                        <el-input v-model="volume.name" placeholder="卷名称" />
                      </el-col>
                      <el-col :span="8">
                        <el-input v-model="volume.mountPath" placeholder="挂载路径" />
                      </el-col>
                      <el-col :span="4">
                        <el-checkbox v-model="volume.readOnly">只读</el-checkbox>
                      </el-col>
                      <el-col :span="4">
                        <el-button type="danger" size="small" @click="removeVolumeMount(container, volumeIndex)">删除</el-button>
                      </el-col>
                    </el-row>
                  </div>
                  <el-button type="primary" size="small" @click="addVolumeMount(container)">添加挂载卷</el-button>
                </el-form-item>
              </el-card>
            </div>
            
            <el-button type="primary" @click="addContainer">添加容器</el-button>
            
            <el-divider content-position="left">高级配置</el-divider>
            
            <el-form-item label="Job 标签">
              <div v-for="(label, index) in createForm.labels" :key="index" class="label-config">
                <el-row :gutter="10">
                  <el-col :span="10">
                    <el-input v-model="label.key" placeholder="标签键" />
                  </el-col>
                  <el-col :span="10">
                    <el-input v-model="label.value" placeholder="标签值" />
                  </el-col>
                  <el-col :span="4">
                    <el-button type="danger" size="small" @click="removeLabel(index)">删除</el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" size="small" @click="addLabel">添加标签</el-button>
            </el-form-item>
            
            <el-form-item label="注解">
              <div v-for="(annotation, index) in createForm.annotations" :key="index" class="annotation-config">
                <el-row :gutter="10">
                  <el-col :span="10">
                    <el-input v-model="annotation.key" placeholder="注解键" />
                  </el-col>
                  <el-col :span="10">
                    <el-input v-model="annotation.value" placeholder="注解值" />
                  </el-col>
                  <el-col :span="4">
                    <el-button type="danger" size="small" @click="removeAnnotation(index)">删除</el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" size="small" @click="addAnnotation">添加注解</el-button>
            </el-form-item>
            
            <el-form-item label="节点选择器">
              <div v-for="(selector, index) in createForm.nodeSelector" :key="index" class="selector-config">
                <el-row :gutter="10">
                  <el-col :span="10">
                    <el-input v-model="selector.key" placeholder="选择器键" />
                  </el-col>
                  <el-col :span="10">
                    <el-input v-model="selector.value" placeholder="选择器值" />
                  </el-col>
                  <el-col :span="4">
                    <el-button type="danger" size="small" @click="removeNodeSelector(index)">删除</el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" size="small" @click="addNodeSelector">添加节点选择器</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="YAML编辑" name="yaml">
          <div class="yaml-editor">
            <el-alert
              title="提示"
              type="info"
              description="您可以直接编辑YAML配置，或者先在表单中填写配置，然后切换到YAML查看生成的配置"
              show-icon
              :closable="false"
            />
            <div class="editor-toolbar">
              <el-button size="small" @click="formatYAML">格式化</el-button>
              <el-button size="small" @click="validateYAML">验证</el-button>
              <el-button size="small" @click="downloadYAML">下载</el-button>
            </div>
            <el-input
              v-model="yamlContent"
              type="textarea"
              :rows="20"
              placeholder="请输入Job的YAML配置..."
              class="yaml-textarea"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="handleCreate" :loading="submitting">创建</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Job详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="Job详情"
      width="80%"
      :before-close="handleCloseDetail"
    >
      <div v-if="selectedJob" class="job-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="名称">{{ selectedJob.jobName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="命名空间">{{ selectedJob.nameSpace || '-' }}</el-descriptions-item>
          <el-descriptions-item label="完成数">{{ extractSucceededCount(selectedJob.podsStatuses) }}</el-descriptions-item>
          <el-descriptions-item label="期望数">{{ extractDesiredCount(selectedJob.podsStatuses) }}</el-descriptions-item>
          <el-descriptions-item label="活跃数">{{ extractActiveCount(selectedJob.podsStatuses) }}</el-descriptions-item>
          <el-descriptions-item label="失败数">{{ extractFailedCount(selectedJob.podsStatuses) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatJobTime(selectedJob.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatJobTime(selectedJob.endTime) }}</el-descriptions-item>
          <el-descriptions-item label="容器名称">{{ selectedJob.containerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="容器镜像">{{ selectedJob.containerImage || '-' }}</el-descriptions-item>
          <el-descriptions-item label="命令参数" :span="2">{{ selectedJob.commandArgs || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 容器信息已整合到基本信息中，不再单独显示 -->

        <h3>标签</h3>
        <div v-if="parsedLabels && parsedLabels.length > 0">
          <el-tag
            v-for="(tag, index) in parsedLabels"
            :key="index"
            size="small"
            class="tag-margin"
          >
            {{ tag }}
          </el-tag>
        </div>
        <div v-else class="no-data">
          <span>暂无标签</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Refresh, Search, View, Edit, Delete
} from '@element-plus/icons-vue'
import {
  getJobList,
  deleteJob,
  createJob
} from '@/api/k8s/job.js'
import { getNamespaceList } from '@/api/k8s/namespace.js'
import { getSelectedInstanceId } from '@/stores/instanceStore'
import yaml from 'js-yaml'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const jobs = ref([])
const searchQuery = ref('')
const selectedJobs = ref([])
const detailDialogVisible = ref(false)
const selectedJob = ref(null)
const namespaceList = ref([])
const selectedNamespace = ref('all')
const showCreateDialog = ref(false)
const createFormRef = ref(null)
const activeTab = ref('form')
const yamlContent = ref('')

const createForm = ref({
  namespace: 'default',
  name: '',
  parallelism: 1,
  completions: 1,
  activeDeadlineSeconds: null,
  backoffLimit: 6,
  restartPolicy: 'OnFailure',
  podLabels: [],
  labels: [],
  annotations: [],
  nodeSelector: [],
  containers: [{
    name: '',
    image: '',
    imagePullPolicy: 'IfNotPresent',
    workingDir: '',
    command: '',
    args: '',
    env: [],
    resources: {
      requests: {
        cpu: '',
        memory: ''
      },
      limits: {
        cpu: '',
        memory: ''
      }
    },
    volumeMounts: []
  }]
})

const createRules = {
  namespace: [{ required: true, message: '请选择命名空间', trigger: 'change' }],
  name: [{ required: true, message: '请输入Job名称', trigger: 'blur' }],
  parallelism: [{ required: true, message: '请输入并行数', trigger: 'blur' }],
  completions: [{ required: true, message: '请输入完成数', trigger: 'blur' }]
}

// 计算属性
const filteredJobs = computed(() => {
  if (!searchQuery.value) return jobs.value
  return jobs.value.filter(job =>
    job.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 方法
const fetchNamespaces = async () => {
  try {
    const instanceId = getSelectedInstanceId() || '1'
    const response = await getNamespaceList(instanceId)
    namespaceList.value = response.data?.namespaceList || []
  } catch (error) {
    ElMessage.error('获取命名空间列表失败: ' + error.message)
  }
}

const handleNamespaceChange = () => {
  fetchJobs()
}

const fetchJobs = async () => {
  loading.value = true
  try {
    const instanceId = getSelectedInstanceId() || '1'
    const response = await getJobList(selectedNamespace.value, instanceId)
    jobs.value = response.data?.jobList || []
  } catch (error) {
    ElMessage.error('获取Job列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // 搜索逻辑已在计算属性中实现
}

const handleRefresh = () => {
  fetchJobs()
}

const handleSelectionChange = (selection) => {
  selectedJobs.value = selection
}

const clearSelection = () => {
  selectedJobs.value = []
}

const handleViewDetail = (job) => {
  selectedJob.value = job
  detailDialogVisible.value = true
}

const handleCloseDetail = () => {
  detailDialogVisible.value = false
  selectedJob.value = null
}

const handleEdit = (job) => {
  ElMessage.info('编辑功能待实现')
}

const handleDelete = async (job) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除Job "${job.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const instanceId = getSelectedInstanceId() || '1'
    await deleteJob(job.namespace, job.name, instanceId)
    ElMessage.success('Job删除成功')
    await fetchJobs()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除Job失败: ' + error.message)
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedJobs.value.length} 个Job吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 批量删除逻辑
    for (const job of selectedJobs.value) {
      const instanceId = getSelectedInstanceId() || '1'
    await deleteJob(job.namespace, job.name, instanceId)
    }
    
    ElMessage.success('批量删除成功')
    selectedJobs.value = []
    await fetchJobs()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

// 容器管理方法
const addContainer = () => {
  createForm.value.containers.push({
    name: '',
    image: '',
    imagePullPolicy: 'IfNotPresent',
    workingDir: '',
    command: '',
    args: '',
    env: [],
    resources: {
      requests: {
        cpu: '',
        memory: ''
      },
      limits: {
        cpu: '',
        memory: ''
      }
    },
    volumeMounts: []
  })
}

const removeContainer = (index) => {
  createForm.value.containers.splice(index, 1)
}

// 环境变量管理方法
const addEnv = (container) => {
  container.env.push({
    name: '',
    value: ''
  })
}

const removeEnv = (container, index) => {
  container.env.splice(index, 1)
}

// 卷挂载管理方法
const addVolumeMount = (container) => {
  container.volumeMounts.push({
    name: '',
    mountPath: '',
    readOnly: false
  })
}

const removeVolumeMount = (container, index) => {
  container.volumeMounts.splice(index, 1)
}

// 标签管理方法
const addLabel = () => {
  createForm.value.labels.push({
    key: '',
    value: ''
  })
}

const removeLabel = (index) => {
  createForm.value.labels.splice(index, 1)
}

// Pod标签管理方法
const addPodLabel = () => {
  createForm.value.podLabels.push({
    key: '',
    value: ''
  })
}

const removePodLabel = (index) => {
  createForm.value.podLabels.splice(index, 1)
}

// 注解管理方法
const addAnnotation = () => {
  createForm.value.annotations.push({
    key: '',
    value: ''
  })
}

const removeAnnotation = (index) => {
  createForm.value.annotations.splice(index, 1)
}

// 节点选择器管理方法
const addNodeSelector = () => {
  createForm.value.nodeSelector.push({
    key: '',
    value: ''
  })
}

const removeNodeSelector = (index) => {
  createForm.value.nodeSelector.splice(index, 1)
}

// YAML相关方法
const generateYAML = () => {
  // 过滤有效的容器
  const validContainers = createForm.value.containers.filter(container => container.name && container.image)
  
  if (validContainers.length === 0) {
    ElMessage.error('请至少配置一个有效的容器')
    return ''
  }
  
  // 手动构建YAML字符串，确保格式正确
  let yaml = `apiVersion: batch/v1
kind: Job
metadata:
  name: ${createForm.value.name}
  namespace: ${createForm.value.namespace}`
  
  // 添加标签
  const validLabels = createForm.value.labels.filter(label => label.key && label.value)
  if (validLabels.length > 0) {
    yaml += '\n  labels:'
    validLabels.forEach(label => {
      yaml += `\n    ${label.key}: ${label.value}`
    })
  }
  
  // 添加注解
  const validAnnotations = createForm.value.annotations.filter(annotation => annotation.key && annotation.value)
  if (validAnnotations.length > 0) {
    yaml += '\n  annotations:'
    validAnnotations.forEach(annotation => {
      yaml += `\n    ${annotation.key}: ${annotation.value}`
    })
  }
  
  yaml += `\nspec:
  parallelism: ${createForm.value.parallelism}
  completions: ${createForm.value.completions}`
  
  if (createForm.value.activeDeadlineSeconds) {
    yaml += `\n  activeDeadlineSeconds: ${createForm.value.activeDeadlineSeconds}`
  }
  
  if (createForm.value.backoffLimit !== undefined) {
    yaml += `\n  backoffLimit: ${createForm.value.backoffLimit}`
  }
  
  yaml += `
  template:
    metadata:`
  
  // 添加Pod标签
  const validPodLabels = createForm.value.podLabels.filter(label => label.key && label.value)
  if (validPodLabels.length > 0) {
    yaml += '\n      labels:'
    validPodLabels.forEach(label => {
      yaml += `\n        ${label.key}: ${label.value}`
    })
  }
  
  yaml += `
    spec:
      restartPolicy: ${createForm.value.restartPolicy}
      containers:`
  
  // 添加容器
  validContainers.forEach(container => {
    yaml += `\n        - name: ${container.name}
          image: ${container.image}
          imagePullPolicy: ${container.imagePullPolicy || 'IfNotPresent'}`
    
    // 添加工作目录
    if (container.workingDir) {
      yaml += `\n          workingDir: ${container.workingDir}`
    }
    
    // 添加命令
    if (container.command) {
      const commands = container.command.split(',').map(cmd => cmd.trim())
      yaml += '\n          command:'
      commands.forEach(cmd => {
        yaml += `\n            - ${cmd}`
      })
    }
    
    // 添加参数
    if (container.args) {
      const args = container.args.split(',').map(arg => arg.trim())
      yaml += '\n          args:'
      args.forEach(arg => {
        yaml += `\n            - ${arg}`
      })
    }
    
    // 添加环境变量
    const validEnv = container.env.filter(env => env.name)
    if (validEnv.length > 0) {
      yaml += '\n          env:'
      validEnv.forEach(env => {
        yaml += `\n            - name: ${env.name}
              value: "${env.value || ''}"`
      })
    }
    
    // 添加资源限制
    const hasRequests = container.resources.requests.cpu || container.resources.requests.memory
    const hasLimits = container.resources.limits.cpu || container.resources.limits.memory
    if (hasRequests || hasLimits) {
      yaml += '\n          resources:'
      if (hasRequests) {
        yaml += '\n            requests:'
        if (container.resources.requests.cpu) {
          yaml += `\n              cpu: ${container.resources.requests.cpu}`
        }
        if (container.resources.requests.memory) {
          yaml += `\n              memory: ${container.resources.requests.memory}`
        }
      }
      if (hasLimits) {
        yaml += '\n            limits:'
        if (container.resources.limits.cpu) {
          yaml += `\n              cpu: ${container.resources.limits.cpu}`
        }
        if (container.resources.limits.memory) {
          yaml += `\n              memory: ${container.resources.limits.memory}`
        }
      }
    }
    
    // 添加卷挂载
    const validVolumeMounts = container.volumeMounts.filter(mount => mount.name && mount.mountPath)
    if (validVolumeMounts.length > 0) {
      yaml += '\n          volumeMounts:'
      validVolumeMounts.forEach(mount => {
        yaml += `\n            - name: ${mount.name}
              mountPath: ${mount.mountPath}`
        if (mount.readOnly) {
          yaml += `
              readOnly: ${mount.readOnly}`
        }
      })
    }
  })
  
  // 添加节点选择器
  const validNodeSelectors = createForm.value.nodeSelector.filter(selector => selector.key && selector.value)
  if (validNodeSelectors.length > 0) {
    yaml += '\n      nodeSelector:'
    validNodeSelectors.forEach(selector => {
      yaml += `\n        ${selector.key}: ${selector.value}`
    })
  }
  
  return yaml
}

const formatYAML = () => {
  try {
    // 如果当前在YAML标签页，尝试解析并重新生成
    if (activeTab.value === 'yaml' && yamlContent.value) {
      try {
        const parsed = yaml.load(yamlContent.value, {
          schema: yaml.FAILSAFE_SCHEMA
        })
        yamlContent.value = yaml.dump(parsed, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false
        })
        ElMessage.success('YAML格式化成功')
      } catch (parseError) {
        // 如果解析失败，至少清理一下多余的空行
        const lines = yamlContent.value.split('\n')
        const cleaned = lines.filter(line => line.trim() !== '' || line === '').join('\n')
        yamlContent.value = cleaned
        ElMessage.warning('YAML已清理（部分格式可能需要手动调整）')
      }
    } else {
      // 如果在表单页，直接重新生成
      yamlContent.value = generateYAML()
      ElMessage.success('YAML重新生成成功')
    }
  } catch (error) {
    ElMessage.error('YAML格式化失败: ' + error.message)
  }
}

const validateYAML = () => {
  try {
    // 如果是手动生成的YAML，尝试解析基本结构
    if (yamlContent.value) {
      const lines = yamlContent.value.split('\n')
      let hasApiVersion = false
      let hasKind = false
      let hasMetadata = false
      let hasSpec = false
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('apiVersion:')) hasApiVersion = true
        if (trimmed.startsWith('kind:')) hasKind = true
        if (trimmed.startsWith('metadata:')) hasMetadata = true
        if (trimmed.startsWith('spec:')) hasSpec = true
      }
      
      if (hasApiVersion && hasKind && hasMetadata && hasSpec) {
        // 尝试解析，但不严格要求格式完美
        yaml.load(yamlContent.value, {
          schema: yaml.FAILSAFE_SCHEMA
        })
        ElMessage.success('YAML验证通过')
      } else {
        ElMessage.warning('YAML缺少必要字段（apiVersion, kind, metadata, spec）')
      }
    } else {
      ElMessage.warning('YAML内容为空')
    }
  } catch (error) {
    ElMessage.error('YAML验证失败: ' + error.message)
  }
}

const downloadYAML = () => {
  const blob = new Blob([yamlContent.value], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${createForm.value.name || 'job'}.yaml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 监听标签页切换
watch(activeTab, async (newTab) => {
  if (newTab === 'yaml') {
    // 先验证表单数据
    if (!createForm.value.name) {
      ElMessage.warning('请先填写Job名称')
      activeTab.value = 'form'
      return
    }
    
    // 验证容器配置
    const validContainers = createForm.value.containers.filter(container => container.name && container.image)
    if (validContainers.length === 0) {
      ElMessage.warning('请至少配置一个有效的容器（名称和镜像不能为空）')
      activeTab.value = 'form'
      return
    }
    
    // 从表单生成YAML
    yamlContent.value = generateYAML()
  }
})

const handleCreate = async () => {
  submitting.value = true
  
  try {
    const instanceId = getSelectedInstanceId() || '1'
    let createData
    
    if (activeTab.value === 'yaml') {
      // 直接使用YAML创建
      try {
        const jobSpec = yaml.load(yamlContent.value)
        createData = {
          namespace: jobSpec.metadata.namespace,
          name: jobSpec.metadata.name,
          yaml: yamlContent.value
        }
      } catch (error) {
        ElMessage.error('YAML解析失败: ' + error.message)
        return
      }
    } else {
      // 使用表单数据创建
      if (!createFormRef.value) return
      
      // 表单验证
      const valid = await createFormRef.value.validate().catch(() => false)
      if (!valid) return
      
      // 验证容器配置
      if (!createForm.value.containers || createForm.value.containers.length === 0) {
        ElMessage.error('请至少配置一个容器')
        return
      }
      
      for (let i = 0; i < createForm.value.containers.length; i++) {
        const container = createForm.value.containers[i]
        if (!container.name || !container.image) {
          ElMessage.error(`容器 ${i + 1} 的名称和镜像不能为空`)
          return
        }
      }
      
      createData = createForm.value
    }
    
    await createJob(createData.namespace, createData, instanceId)
    ElMessage.success('Job 创建成功')
    showCreateDialog.value = false
    resetCreateForm()
    await fetchJobs()
  } catch (error) {
    ElMessage.error('创建 Job 失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const resetCreateForm = () => {
  createForm.value = {
    namespace: selectedNamespace.value || 'default',
    name: '',
    parallelism: 1,
    completions: 1,
    activeDeadlineSeconds: null,
    backoffLimit: 6,
    restartPolicy: 'OnFailure',
    podLabels: [],
    labels: [],
    annotations: [],
    nodeSelector: [],
    containers: [{
      name: '',
      image: '',
      imagePullPolicy: 'IfNotPresent',
      workingDir: '',
      command: '',
      args: '',
      env: [],
      resources: {
        requests: {
          cpu: '',
          memory: ''
        },
        limits: {
          cpu: '',
          memory: ''
        }
      },
      volumeMounts: []
    }]
  }
  yamlContent.value = ''
  activeTab.value = 'form'
}

// 工具方法
const getJobStatusType = (podsStatuses) => {
  if (!podsStatuses) return 'info'
  
  // 从podsStatuses字符串中解析状态
  if (podsStatuses.includes('成功') && !podsStatuses.includes('失败') && !podsStatuses.includes('活跃')) {
    return 'success'
  } else if (podsStatuses.includes('失败')) {
    return 'danger'
  } else if (podsStatuses.includes('活跃')) {
    return 'primary'
  } else {
    return 'warning'
  }
}

const extractJobStatus = (podsStatuses) => {
  if (!podsStatuses) return 'Unknown'
  
  if (podsStatuses.includes('成功') && !podsStatuses.includes('失败') && !podsStatuses.includes('活跃')) {
    return 'Completed'
  } else if (podsStatuses.includes('活跃')) {
    return 'Running'
  } else if (podsStatuses.includes('失败')) {
    return 'Failed'
  } else {
    return 'Pending'
  }
}

const extractCompletionCount = (podsStatuses) => {
  if (!podsStatuses) return '0/0'
  
  // 解析 "活跃: X, 成功: Y, 失败: Z" 格式
  const activeMatch = podsStatuses.match(/活跃:\s*(\d+)/)
  const successMatch = podsStatuses.match(/成功:\s*(\d+)/)
  
  const active = activeMatch ? parseInt(activeMatch[1]) : 0
  const success = successMatch ? parseInt(successMatch[1]) : 0
  
  // 如果有活跃的，显示成功/总数
  if (active > 0) {
    return `${success}/${success + active}`
  }
  // 如果没有活跃的，只显示成功数
  return `${success}/${success}`
}

const getJobCompletionStatus = (podsStatuses) => {
  if (!podsStatuses) return false
  
  // 检查是否所有任务都已完成
  const activeMatch = podsStatuses.match(/活跃:\s*(\d+)/)
  const active = activeMatch ? parseInt(activeMatch[1]) : 0
  
  return active === 0
}

const formatJobTime = (startTime) => {
  if (!startTime) return '-'
  try {
    return new Date(startTime).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return '-'
  }
}

const extractSucceededCount = (podsStatuses) => {
  if (!podsStatuses) return 0
  const match = podsStatuses.match(/成功:\s*(\d+)/)
  return match ? parseInt(match[1]) : 0
}

const extractActiveCount = (podsStatuses) => {
  if (!podsStatuses) return 0
  const match = podsStatuses.match(/活跃:\s*(\d+)/)
  return match ? parseInt(match[1]) : 0
}

const extractFailedCount = (podsStatuses) => {
  if (!podsStatuses) return 0
  const match = podsStatuses.match(/失败:\s*(\d+)/)
  return match ? parseInt(match[1]) : 0
}

const extractDesiredCount = (podsStatuses) => {
  if (!podsStatuses) return 0
  const active = extractActiveCount(podsStatuses)
  const succeeded = extractSucceededCount(podsStatuses)
  return active + succeeded
}

// 解析标签字符串
const parsedLabels = computed(() => {
  if (!selectedJob.value?.labels) return []
  
  try {
    // 如果labels是字符串形式的map，尝试解析
    if (typeof selectedJob.value.labels === 'string') {
      // 尝试解析JSON格式
      if (selectedJob.value.labels.startsWith('{')) {
        const parsed = JSON.parse(selectedJob.value.labels)
        return Object.entries(parsed).map(([key, value]) => `${key}: ${value}`)
      }
      // 如果是map[string]的字符串格式，尝试提取键值对
      const labelMatches = selectedJob.value.labels.match(/(\w+):\s*([^,\s]+)/g)
      if (labelMatches) {
        return labelMatches.map(match => match.trim())
      }
    }
    
    // 如果是对象，直接处理
    if (typeof selectedJob.value.labels === 'object') {
      return Object.entries(selectedJob.value.labels).map(([key, value]) => `${key}: ${value}`)
    }
  } catch (error) {
    console.error('解析标签失败:', error)
  }
  
  return []
})

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

const formatDuration = (startTime, completionTime) => {
  if (!startTime) return '-'
  
  const start = new Date(startTime)
  const end = completionTime ? new Date(completionTime) : new Date()
  const duration = end - start
  
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((duration % (1000 * 60)) / 1000)
  
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

const calculateAge = (timestamp) => {
  if (!timestamp) return '-'
  const now = new Date()
  const created = new Date(timestamp)
  const diff = now - created
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days}天`
  if (hours > 0) return `${hours}小时`
  return '刚刚'
}

// 生命周期
onMounted(() => {
  fetchNamespaces()
  fetchJobs()
})
</script>

<style scoped>
.job-management {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.namespace-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.search-card, .content-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.batch-actions {
  margin-bottom: 24px;
}

.job-detail {
  padding: 20px 0;
}

.job-detail h3 {
  margin: 30px 0 15px 0;
  color: #1a1a1a;
  font-size: 18px;
  font-weight: 600;
}

.tag-margin {
  margin-right: 8px;
  margin-bottom: 8px;
}

.no-data {
  color: #999;
  font-style: italic;
  padding: 10px;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.job-detail h3 {
  margin: 30px 0 15px 0;
  color: #1a1a1a;
  font-size: 18px;
  font-weight: 600;
}

.tag-margin {
  margin-right: 8px;
  margin-bottom: 8px;
}

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-descriptions) {
  margin-bottom: 20px;
}

/* 容器配置样式 */
.container-config {
  margin-bottom: 20px;
}

.container-card {
  margin-bottom: 15px;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 环境变量配置样式 */
.env-config {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

/* 卷配置样式 */
.volume-config {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

/* 标签配置样式 */
.label-config {
  margin-bottom: 10px;
}

.annotation-config {
  margin-bottom: 10px;
}

.selector-config {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

/* YAML编辑器样式 */
.yaml-editor {
  padding: 20px;
}

.editor-toolbar {
  margin: 15px 0;
  display: flex;
  gap: 10px;
}

.yaml-textarea {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

:deep(.yaml-textarea .el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* 对话框底部样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 表单分隔线样式 */
:deep(.el-divider__text) {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* 卡片间距调整 */
:deep(.el-card__body) {
  padding: 15px;
}

/* 表单项间距调整 */
:deep(.el-form-item) {
  margin-bottom: 15px;
}

/* 帮助文本样式 */
.help-text {
  margin-top: 5px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.content-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-container {
  flex: 1;
  overflow: hidden;
}

/* 表格滚动条样式优化 */
:deep(.el-table__body-wrapper) {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background-color: #c1c1c1;
  border-radius: 3px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb:hover) {
  background-color: #a8a8a8;
}
</style>