<template>
  <div class="deployment-management">
    <el-card class="page-header-card">
      <div class="page-header">
        <div>
          <h2>Deployment 管理</h2>
          <p>查看和管理 Kubernetes Deployment</p>
        </div>
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
            创建 Deployment
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="content-card">
      <div class="table-container">
        <el-table 
          :data="deploymentList" 
          style="width: 100%" 
          v-loading="loading"
          height="calc(100vh - 280px)"
          :empty-text="loading ? '加载中...' : '暂无数据'"
        >
          <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="namespace" label="命名空间" width="150" />
          <el-table-column label="副本数" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.ready === scope.row.replicas ? 'success' : 'warning'">
                {{ scope.row.ready || 0 }}/{{ scope.row.replicas || 0 }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="available" label="可用副本" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.available === scope.row.replicas ? 'success' : 'danger'">
                {{ scope.row.available || 0 }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.created) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="320" fixed="right">
            <template #default="scope">
              <el-button-group>
                <el-button size="small" @click="handleViewDetail(scope.row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
                <el-button size="small" @click="handleScale(scope.row)">
                  <el-icon><Sort /></el-icon>
                  扩缩容
                </el-button>
                <el-button size="small" @click="handleUpdate(scope.row)">
                  <el-icon><Edit /></el-icon>
                  更新
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(scope.row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="showCreateDialog" title="创建 Deployment" width="900px" :close-on-click-modal="false">
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
                <el-form-item label="Deployment 名称" prop="name">
                  <el-input v-model="createForm.name" placeholder="请输入 Deployment 名称" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="副本数" prop="replicas">
                  <el-input-number v-model="createForm.replicas" :min="0" :max="100" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="选择器标签">
                  <el-input v-model="createForm.selectorLabel" placeholder="app:nginx" />
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
                      <el-select v-model="createForm.restartPolicy" placeholder="选择策略">
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
              </el-card>
            </div>
            
            <el-button type="primary" @click="addContainer">添加容器</el-button>
            
            <el-divider content-position="left">高级配置</el-divider>
            
            <el-form-item label="Deployment 标签">
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
                  <el-select v-model="createForm.strategy.type" placeholder="选择策略">
                    <el-option label="RollingUpdate" value="RollingUpdate" />
                    <el-option label="Recreate" value="Recreate" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最大不可用">
                  <el-input v-model="createForm.strategy.rollingUpdate.maxUnavailable" placeholder="例如: 25%" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="最大超出">
              <el-input v-model="createForm.strategy.rollingUpdate.maxSurge" placeholder="例如: 25%" />
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
              placeholder="请输入Deployment的YAML配置..."
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

    <el-dialog v-model="showScaleDialog" title="扩缩容" width="400px">
      <el-form :model="scaleForm" label-width="100px">
        <el-form-item label="当前副本数">
          <el-input :value="currentDeployment?.replicas" disabled />
        </el-form-item>
        <el-form-item label="目标副本数">
          <el-input-number v-model="scaleForm.replicas" :min="0" :max="100" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showScaleDialog = false">取消</el-button>
        <el-button type="primary" @click="handleScaleConfirm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showUpdateDialog" title="更新镜像" width="500px">
      <el-form :model="updateForm" label-width="100px">
        <el-form-item label="当前镜像">
          <el-input :value="currentDeployment?.image || '未知'" disabled />
        </el-form-item>
        <el-form-item label="新镜像">
          <el-input v-model="updateForm.image" placeholder="例如: nginx:1.20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUpdateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateConfirm" :loading="submitting">更新</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetailDialog" title="Deployment 详情" width="800px">
      <el-descriptions :column="2" border v-if="currentDeployment">
        <el-descriptions-item label="名称">{{ currentDeployment.name }}</el-descriptions-item>
        <el-descriptions-item label="命名空间">{{ currentDeployment.namespace }}</el-descriptions-item>
        <el-descriptions-item label="副本数">{{ currentDeployment.replicas }}</el-descriptions-item>
        <el-descriptions-item label="就绪副本">{{ currentDeployment.ready }}</el-descriptions-item>
        <el-descriptions-item label="可用副本">{{ currentDeployment.available }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(currentDeployment.created) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, View, Sort, Edit, Delete } from '@element-plus/icons-vue'
import { getDeploymentList, getDeploymentDetail, createDeployment, updateDeployment, scaleDeployment, deleteDeployment } from '@/api/k8s/deployment'
import { getNamespaceList } from '@/api/k8s/namespace'
import { getSelectedInstanceId } from '@/stores/instanceStore'
import yaml from 'js-yaml'

const loading = ref(false)
const submitting = ref(false)
const showCreateDialog = ref(false)
const showScaleDialog = ref(false)
const showUpdateDialog = ref(false)
const showDetailDialog = ref(false)
const deploymentList = ref([])
const namespaceList = ref([])
const selectedNamespace = ref('all')
const currentDeployment = ref(null)
const createFormRef = ref(null)
const activeTab = ref('form')
const yamlContent = ref('')

const createForm = ref({
  namespace: 'default',
  name: '',
  replicas: 1,
  selectorLabel: '',
  restartPolicy: 'Always',
  labels: [],
  annotations: [],
  nodeSelector: [],
  podLabels: [],
  strategy: {
    type: 'RollingUpdate',
    rollingUpdate: {
      maxUnavailable: '25%',
      maxSurge: '25%'
    }
  },
  containers: [{
    name: '',
    image: '',
    imagePullPolicy: 'IfNotPresent',
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
    }
  }]
})

const scaleForm = ref({
  replicas: 1
})

const updateForm = ref({
  image: ''
})

const createRules = {
  namespace: [{ required: true, message: '请选择命名空间', trigger: 'change' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  replicas: [{ required: true, message: '请输入副本数', trigger: 'blur' }]
}

// 容器管理方法
const addContainer = () => {
  createForm.value.containers.push({
    name: '',
    image: '',
    imagePullPolicy: 'IfNotPresent',
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
    }
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
kind: Deployment
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
  replicas: ${createForm.value.replicas}
  selector:
    matchLabels:`
  
  // 添加选择器标签
  if (createForm.value.selectorLabel) {
    const [key, value] = createForm.value.selectorLabel.split(':')
    yaml += `\n      ${key || 'app'}: ${value || createForm.value.name}`
  } else {
    yaml += `\n      app: ${createForm.value.name}`
  }
  
  yaml += `
  strategy:
    type: ${createForm.value.strategy.type}`
  
  if (createForm.value.strategy.type === 'RollingUpdate') {
    yaml += `
    rollingUpdate:
      maxUnavailable: ${createForm.value.strategy.rollingUpdate.maxUnavailable}
      maxSurge: ${createForm.value.strategy.rollingUpdate.maxSurge}`
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
      restartPolicy: ${createForm.value.restartPolicy || 'Always'}
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
  a.download = `${createForm.value.name || 'deployment'}.yaml`
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
      ElMessage.warning('请先填写Deployment名称')
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

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchNamespaceList = async () => {
  try {
    const instanceId = getSelectedInstanceId() || '1'
    const response = await getNamespaceList(instanceId)
    namespaceList.value = response.data?.namespaceList || []
  } catch (error) {
    ElMessage.error('获取命名空间列表失败')
  }
}

const fetchDeploymentList = async () => {
  loading.value = true
  try {
    const instanceId = getSelectedInstanceId() || '1'
    const response = await getDeploymentList(selectedNamespace.value, instanceId)
    deploymentList.value = response.data?.deploymentList || []
  } catch (error) {
    ElMessage.error('获取 Deployment 列表失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const handleNamespaceChange = () => {
  fetchDeploymentList()
}

const handleCreate = async () => {
  submitting.value = true
  
  try {
    const instanceId = getSelectedInstanceId() || '1'
    let createData
    
    if (activeTab.value === 'yaml') {
      // 直接使用YAML创建
      try {
        const deploymentSpec = yaml.load(yamlContent.value)
        createData = {
          namespace: deploymentSpec.metadata.namespace,
          name: deploymentSpec.metadata.name,
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
    
    await createDeployment(createData.namespace, createData, instanceId)
    ElMessage.success('Deployment 创建成功')
    showCreateDialog.value = false
    resetCreateForm()
    await fetchDeploymentList()
  } catch (error) {
    ElMessage.error('创建 Deployment 失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const resetCreateForm = () => {
  createForm.value = {
    namespace: selectedNamespace.value || 'default',
    name: '',
    replicas: 1,
    selectorLabel: '',
    restartPolicy: 'Always',
    labels: [],
    annotations: [],
    nodeSelector: [],
    podLabels: [],
    strategy: {
      type: 'RollingUpdate',
      rollingUpdate: {
        maxUnavailable: '25%',
        maxSurge: '25%'
      }
    },
    containers: [{
      name: '',
      image: '',
      imagePullPolicy: 'IfNotPresent',
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
      }
    }]
  }
  yamlContent.value = ''
  activeTab.value = 'form'
}

const handleViewDetail = async (deployment) => {
  try {
    const instanceId = getSelectedInstanceId() || '1'
    const response = await getDeploymentDetail(deployment.namespace, deployment.name, instanceId)
    currentDeployment.value = response.data?.deploymentDetail || deployment
    showDetailDialog.value = true
  } catch (error) {
    ElMessage.error('获取 Deployment 详情失败')
  }
}

const handleScale = (deployment) => {
  currentDeployment.value = deployment
  scaleForm.value.replicas = deployment.replicas
  showScaleDialog.value = true
}

const handleScaleConfirm = async () => {
  submitting.value = true
  try {
    const instanceId = getSelectedInstanceId() || '1'
    await scaleDeployment(currentDeployment.value.namespace, currentDeployment.value.name, scaleForm.value.replicas, instanceId)
    ElMessage.success('扩缩容成功')
    showScaleDialog.value = false
    await fetchDeploymentList()
  } catch (error) {
    ElMessage.error('扩缩容失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const handleUpdate = (deployment) => {
  currentDeployment.value = deployment
  updateForm.value.image = ''
  showUpdateDialog.value = true
}

const handleUpdateConfirm = async () => {
  if (!updateForm.value.image) {
    ElMessage.warning('请输入新镜像')
    return
  }
  
  submitting.value = true
  try {
    const instanceId = getSelectedInstanceId() || '1'
    await updateDeployment(currentDeployment.value.namespace, currentDeployment.value.name, updateForm.value, instanceId)
    ElMessage.success('更新成功')
    showUpdateDialog.value = false
    await fetchDeploymentList()
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.response?.data?.message || error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (deployment) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 Deployment "${deployment.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const instanceId = getSelectedInstanceId() || '1'
    await deleteDeployment(deployment.namespace, deployment.name, instanceId)
    ElMessage.success('Deployment 删除成功')
    await fetchDeploymentList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除 Deployment 失败: ' + (error.response?.data?.message || error.message || '未知错误'))
    }
  }
}

onMounted(() => {
  fetchNamespaceList()
  fetchDeploymentList()
})
</script>

<style scoped>
.deployment-management {
  padding: 20px;
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
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
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

.content-card {
  min-height: 400px;
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

/* 标签配置样式 */
.label-config {
  margin-bottom: 10px;
}

.annotation-config {
  margin-bottom: 10px;
}

.selector-config {
  margin-bottom: 10px;
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

/* 按钮组样式 */
:deep(.el-button-group) {
  .el-button {
    padding: 5px 10px;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  :deep(.el-col) {
    margin-bottom: 10px;
  }
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
