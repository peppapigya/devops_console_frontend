<template>
  <div class="daemonset-management">
    <div class="page-header">
      <h2>DaemonSet管理</h2>
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
          创建DaemonSet
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
            placeholder="搜索DaemonSet名称"
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

    <!-- DaemonSet列表 -->
    <el-card class="content-card">
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="filteredDaemonSets"
          @selection-change="handleSelectionChange"
          stripe
          style="width: 100%"
          height="calc(100vh - 280px)"
          :empty-text="loading ? '加载中...' : '暂无数据'"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link type="primary" @click="handleViewDetail(row)">
                {{ row.name }}
              </el-link>
            </template>
          </el-table-column>
        <el-table-column prop="namespace" label="命名空间" width="120" />
        <el-table-column prop="desired" label="期望数" width="80">
          <template #default="{ row }">
            <el-tag type="primary">{{ row.desired || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="current" label="当前数" width="80">
          <template #default="{ row }">
            <el-tag :type="row.current === row.desired ? 'success' : 'warning'">
              {{ row.current || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ready" label="就绪数" width="80">
          <template #default="{ row }">
            <el-tag :type="row.ready === row.desired ? 'success' : 'danger'">
              {{ row.ready || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="available" label="可用数" width="80">
          <template #default="{ row }">
            <el-tag :type="row.available === row.desired ? 'success' : 'warning'">
              {{ row.available || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="创建时间" width="120">
          <template #default="{ row }">
            {{ calculateAge(row.creationTimestamp) }}
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
    <div v-if="selectedDaemonSets.length > 0" class="batch-actions">
      <el-alert
        :title="`已选择 ${selectedDaemonSets.length} 个DaemonSet`"
        type="info"
        :closable="false"
      >
        <template #default>
          <el-button size="small" @click="handleBatchDelete" type="danger">批量删除</el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </template>
      </el-alert>
    </div>

    <!-- 创建DaemonSet对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建 DaemonSet" width="900px" :close-on-click-modal="false">
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
                <el-form-item label="DaemonSet 名称" prop="name">
                  <el-input v-model="createForm.name" placeholder="请输入 DaemonSet 名称" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-divider content-position="left">选择器配置</el-divider>
            
            <el-form-item label="选择器标签">
              <div v-for="(selector, index) in createForm.selector" :key="index" class="selector-config">
                <el-row :gutter="10">
                  <el-col :span="10">
                    <el-input v-model="selector.key" placeholder="选择器键（如：app）" />
                  </el-col>
                  <el-col :span="10">
                    <el-input v-model="selector.value" placeholder="选择器值（如：nginx）" />
                  </el-col>
                  <el-col :span="4">
                    <el-button type="danger" size="small" @click="removeSelector(index)">删除</el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button type="primary" size="small" @click="addSelector">添加选择器</el-button>
            </el-form-item>
            
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
                      <el-input v-model="container.image" placeholder="例如: nginx:latest" />
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
                    <el-form-item label="重启策略">
                      <el-select v-model="container.restartPolicy" placeholder="选择策略">
                        <el-option label="Always" value="Always" />
                        <el-option label="OnFailure" value="OnFailure" />
                        <el-option label="Never" value="Never" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-form-item label="端口配置">
                  <div v-for="(port, portIndex) in container.ports" :key="portIndex" class="port-config">
                    <el-row :gutter="10">
                      <el-col :span="6">
                        <el-input v-model="port.name" placeholder="端口名称" />
                      </el-col>
                      <el-col :span="6">
                        <el-input-number v-model="port.containerPort" :min="1" :max="65535" placeholder="容器端口" style="width: 100%" />
                      </el-col>
                      <el-col :span="6">
                        <el-select v-model="port.protocol" placeholder="协议">
                          <el-option label="TCP" value="TCP" />
                          <el-option label="UDP" value="UDP" />
                        </el-select>
                      </el-col>
                      <el-col :span="6">
                        <el-button type="danger" size="small" @click="removePort(container, portIndex)">删除</el-button>
                      </el-col>
                    </el-row>
                  </div>
                  <el-button type="primary" size="small" @click="addPort(container)">添加端口</el-button>
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
            
            <el-form-item label="DaemonSet 标签">
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
            
            <el-divider content-position="left">更新策略</el-divider>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="更新策略类型">
                  <el-select v-model="createForm.updateStrategy.type" placeholder="选择策略">
                    <el-option label="RollingUpdate" value="RollingUpdate" />
                    <el-option label="OnDelete" value="OnDelete" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最大不可用">
                  <el-input v-model="createForm.updateStrategy.rollingUpdate.maxUnavailable" placeholder="例如: 1" />
                </el-form-item>
              </el-col>
            </el-row>
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
              placeholder="请输入DaemonSet的YAML配置..."
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

    <!-- DaemonSet详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="DaemonSet详情"
      width="80%"
      :before-close="handleCloseDetail"
    >
      <div v-if="selectedDaemonSet" class="daemonset-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="名称">{{ selectedDaemonSet.name }}</el-descriptions-item>
          <el-descriptions-item label="命名空间">{{ selectedDaemonSet.namespace }}</el-descriptions-item>
          <el-descriptions-item label="期望数">{{ selectedDaemonSet.desired || 0 }}</el-descriptions-item>
          <el-descriptions-item label="当前数">{{ selectedDaemonSet.current || 0 }}</el-descriptions-item>
          <el-descriptions-item label="就绪数">{{ selectedDaemonSet.ready || 0 }}</el-descriptions-item>
          <el-descriptions-item label="可用数">{{ selectedDaemonSet.available || 0 }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(selectedDaemonSet.creationTimestamp) }}</el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag
              v-for="(value, key) in selectedDaemonSet.labels"
              :key="key"
              size="small"
              class="tag-margin"
            >
              {{ key }}: {{ value }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <h3>选择器</h3>
        <el-tag
          v-for="(value, key) in selectedDaemonSet.selector"
          :key="key"
          size="small"
          class="tag-margin"
        >
          {{ key }}: {{ value }}
        </el-tag>

        <h3>容器状态</h3>
        <el-table :data="selectedDaemonSet.containers" border>
          <el-table-column prop="name" label="容器名称" />
          <el-table-column prop="image" label="镜像" />
          <el-table-column prop="ports" label="端口">
            <template #default="{ row }">
              <span v-if="row.ports && row.ports.length > 0">
                {{ row.ports.map(p => `${p.containerPort}/${p.protocol}`).join(', ') }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="resources" label="资源限制">
            <template #default="{ row }">
              <div v-if="row.resources">
                <div v-if="row.resources.limits">
                  <strong>限制:</strong> {{ formatResources(row.resources.limits) }}
                </div>
                <div v-if="row.resources.requests">
                  <strong>请求:</strong> {{ formatResources(row.resources.requests) }}
                </div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
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
  getDaemonSetList,
  deleteDaemonSet,
  createDaemonSet
} from '@/api/k8s/daemonset.js'
import { getNamespaceList } from '@/api/k8s/namespace.js'
import { getSelectedInstanceId } from '@/stores/instanceStore'
import yaml from 'js-yaml'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const daemonsets = ref([])
const searchQuery = ref('')
const selectedDaemonSets = ref([])
const detailDialogVisible = ref(false)
const selectedDaemonSet = ref(null)
const namespaceList = ref([])
const selectedNamespace = ref('all')
const showCreateDialog = ref(false)
const createFormRef = ref(null)
const activeTab = ref('form')
const yamlContent = ref('')

const createForm = ref({
  namespace: 'default',
  name: '',
  selector: [],
  podLabels: [],
  labels: [],
  annotations: [],
  nodeSelector: [],
  updateStrategy: {
    type: 'RollingUpdate',
    rollingUpdate: {
      maxUnavailable: '1'
    }
  },
  containers: [{
    name: '',
    image: '',
    imagePullPolicy: 'IfNotPresent',
    restartPolicy: 'Always',
    ports: [],
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
  name: [{ required: true, message: '请输入DaemonSet名称', trigger: 'blur' }]
}

// 计算属性
const filteredDaemonSets = computed(() => {
  if (!searchQuery.value) return daemonsets.value
  return daemonsets.value.filter(daemonset =>
    daemonset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
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
  fetchDaemonSets()
}

const fetchDaemonSets = async () => {
  loading.value = true
  try {
    const instanceId = getSelectedInstanceId() || '1'
    const response = await getDaemonSetList(selectedNamespace.value, instanceId)
    daemonsets.value = response.data?.daemonSetList || []
  } catch (error) {
    ElMessage.error('获取DaemonSet列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // 搜索逻辑已在计算属性中实现
}

const handleRefresh = () => {
  fetchDaemonSets()
}

const handleSelectionChange = (selection) => {
  selectedDaemonSets.value = selection
}

const clearSelection = () => {
  selectedDaemonSets.value = []
}

const handleViewDetail = (daemonset) => {
  selectedDaemonSet.value = daemonset
  detailDialogVisible.value = true
}

const handleCloseDetail = () => {
  detailDialogVisible.value = false
  selectedDaemonSet.value = null
}

const handleEdit = (daemonset) => {
  ElMessage.info('编辑功能待实现')
}

const handleDelete = async (daemonset) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除DaemonSet "${daemonset.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const instanceId = getSelectedInstanceId() || '1'
    await deleteDaemonSet(daemonset.namespace, daemonset.name, instanceId)
    ElMessage.success('DaemonSet删除成功')
    await fetchDaemonSets()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除DaemonSet失败: ' + error.message)
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedDaemonSets.value.length} 个DaemonSet吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 批量删除逻辑
    for (const daemonset of selectedDaemonSets.value) {
      const instanceId = getSelectedInstanceId() || '1'
    await deleteDaemonSet(daemonset.namespace, daemonset.name, instanceId)
    }
    
    ElMessage.success('批量删除成功')
    selectedDaemonSets.value = []
    await fetchDaemonSets()
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
    restartPolicy: 'Always',
    ports: [],
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

// 端口管理方法
const addPort = (container) => {
  container.ports.push({
    name: '',
    containerPort: 80,
    protocol: 'TCP'
  })
}

const removePort = (container, index) => {
  container.ports.splice(index, 1)
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

// 选择器管理方法
const addSelector = () => {
  createForm.value.selector.push({
    key: '',
    value: ''
  })
}

const removeSelector = (index) => {
  createForm.value.selector.splice(index, 1)
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
  let yaml = `apiVersion: apps/v1
kind: DaemonSet
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
  selector:
    matchLabels:`
  
  // 添加选择器标签
  const validSelectors = createForm.value.selector.filter(selector => selector.key && selector.value)
  if (validSelectors.length > 0) {
    validSelectors.forEach(selector => {
      yaml += `\n      ${selector.key}: ${selector.value}`
    })
  } else {
    yaml += `\n      app: ${createForm.value.name}`
  }
  
  yaml += `
  updateStrategy:
    type: ${createForm.value.updateStrategy.type}`
  
  if (createForm.value.updateStrategy.type === 'RollingUpdate') {
    yaml += `
    rollingUpdate:
      maxUnavailable: ${createForm.value.updateStrategy.rollingUpdate.maxUnavailable}`
  }
  
  yaml += `
  template:
    metadata:
      labels:`
  
  // 添加Pod标签
  const validPodLabels = createForm.value.podLabels.filter(label => label.key && label.value)
  if (validPodLabels.length > 0) {
    validPodLabels.forEach(label => {
      yaml += `\n        ${label.key}: ${label.value}`
    })
  } else {
    yaml += `\n        app: ${createForm.value.name}`
  }
  
  yaml += `
    spec:
      restartPolicy: ${createForm.value.containers[0]?.restartPolicy || 'Always'}
      containers:`
  
  // 添加容器
  validContainers.forEach(container => {
    yaml += `\n        - name: ${container.name}
          image: ${container.image}
          imagePullPolicy: ${container.imagePullPolicy || 'IfNotPresent'}`
    
    // 添加端口
    const validPorts = container.ports.filter(port => port.containerPort)
    if (validPorts.length > 0) {
      yaml += '\n          ports:'
      validPorts.forEach(port => {
        yaml += `\n            - containerPort: ${port.containerPort}`
        if (port.name) {
          yaml += `\n              name: ${port.name}`
        }
        yaml += `\n              protocol: ${port.protocol || 'TCP'}`
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
  a.download = `${createForm.value.name || 'daemonset'}.yaml`
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
      ElMessage.warning('请先填写DaemonSet名称')
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
        const daemonsetSpec = yaml.load(yamlContent.value)
        createData = {
          namespace: daemonsetSpec.metadata.namespace,
          name: daemonsetSpec.metadata.name,
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
    
    await createDaemonSet(createData.namespace, createData, instanceId)
    ElMessage.success('DaemonSet 创建成功')
    showCreateDialog.value = false
    resetCreateForm()
    await fetchDaemonSets()
  } catch (error) {
    ElMessage.error('创建 DaemonSet 失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const resetCreateForm = () => {
  createForm.value = {
    namespace: selectedNamespace.value || 'default',
    name: '',
    selector: [],
    podLabels: [],
    labels: [],
    annotations: [],
    nodeSelector: [],
    updateStrategy: {
      type: 'RollingUpdate',
      rollingUpdate: {
        maxUnavailable: '1'
      }
    },
    containers: [{
      name: '',
      image: '',
      imagePullPolicy: 'IfNotPresent',
      restartPolicy: 'Always',
      ports: [],
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
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
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

const formatResources = (resources) => {
  return Object.entries(resources).map(([key, value]) => `${key}: ${value}`).join(', ')
}

// 生命周期
onMounted(() => {
  fetchNamespaces()
  fetchDaemonSets()
})
</script>

<style scoped>
.daemonset-management {
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

.daemonset-detail {
  padding: 20px 0;
}

.daemonset-detail h3 {
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

/* 端口配置样式 */
.port-config {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
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