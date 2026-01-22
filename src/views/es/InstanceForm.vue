<template>
  <div class="instance-form">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleBack" link>
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2>{{ isEdit ? '编辑实例' : '添加实例' }}</h2>
      </div>
      <div class="header-actions">
        <el-button @click="handleTestConnection" :loading="testing" v-if="formData.name && formData.address">
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </div>
    </div>

    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      class="instance-form-content"
    >
      <!-- 基本信息 -->
      <el-card class="form-card">
        <template #header>
          <span>基本信息</span>
        </template>
        <el-form-item label="实例类型" prop="instanceType">
          <el-select
            v-model="formData.instanceType"
            placeholder="请选择实例类型"
            style="width: 100%"
            @change="handleTypeChange"
          >
            <el-option
              v-for="type in instanceTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            >
              <div class="type-option">
                <el-icon :color="type.color">
                  <component :is="type.icon" />
                </el-icon>
                <span>{{ type.label }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="实例名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入实例名称"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="实例地址" prop="address">
          <el-input
            v-model="formData.address"
            placeholder="例如: 192.168.1.100:9200"
            clearable
          >
            <template #prepend>
              <el-select
                v-model="addressProtocol"
                style="width: 80px"
                @change="handleProtocolChange"
              >
                <el-option label="http" value="http" />
                <el-option label="https" value="https" />
              </el-select>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item v-if="formData.httpsEnabled" label="HTTPS选项">
          <el-checkbox v-model="formData.skipSslVerify">
            跳过SSL证书验证
          </el-checkbox>
          <div style="margin-top: 5px; font-size: 12px; color: #999;">
            启用此选项可忽略自签名证书或证书链验证错误
          </div>
        </el-form-item>
      </el-card>

      <!-- 认证配置 -->
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <span>认证配置</span>
            <el-button link @click="resetAuthConfig">
              <el-icon><RefreshLeft /></el-icon>
              重置
            </el-button>
          </div>
        </template>
        
        <el-form-item label="认证方式" prop="authType">
          <el-select
            v-model="formData.authType"
            placeholder="请选择认证方式"
            style="width: 100%"
            @change="handleAuthTypeChange"
          >
            <el-option label="无认证" value="none" />
            <el-option label="基础认证" value="basic" />
            <el-option label="API密钥" value="api_key" />
            <el-option label="AWS IAM" value="aws_iam" />
            <el-option label="令牌认证" value="token" />
            <el-option label="证书认证" value="certificate" />
            <el-option v-if="isKubernetesType" label="Kubeconfig文件" value="kubeconfig" />
          </el-select>
        </el-form-item>

        <!-- 基础认证配置 -->
        <div v-if="formData.authType === 'basic'" class="auth-config-section">
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="formData.username"
              placeholder="请输入用户名"
              clearable
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              show-password
              clearable
            />
          </el-form-item>
        </div>

        <!-- API密钥配置 -->
        <div v-else-if="formData.authType === 'api_key'" class="auth-config-section">
          <el-form-item label="API Key" prop="apiKey">
            <el-input
              v-model="formData.apiKey"
              type="password"
              placeholder="请输入API Key"
              show-password
              clearable
            />
          </el-form-item>
          <el-form-item label="API ID" prop="apiId">
            <el-input
              v-model="formData.apiId"
              placeholder="请输入API ID"
              clearable
            />
          </el-form-item>
        </div>

        <!-- AWS IAM配置 -->
        <div v-else-if="formData.authType === 'aws_iam'" class="auth-config-section">
          <el-form-item label="Access Key" prop="accessKey">
            <el-input
              v-model="formData.accessKey"
              type="password"
              placeholder="请输入Access Key"
              show-password
              clearable
            />
          </el-form-item>
          <el-form-item label="Secret Key" prop="secretKey">
            <el-input
              v-model="formData.secretKey"
              type="password"
              placeholder="请输入Secret Key"
              show-password
              clearable
            />
          </el-form-item>
          <el-form-item label="Region" prop="region">
            <el-select
              v-model="formData.region"
              placeholder="请选择Region"
              style="width: 100%"
            >
              <el-option label="us-east-1" value="us-east-1" />
              <el-option label="us-west-2" value="us-west-2" />
              <el-option label="eu-west-1" value="eu-west-1" />
              <el-option label="ap-southeast-1" value="ap-southeast-1" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 令牌认证配置 -->
        <div v-else-if="formData.authType === 'token'" class="auth-config-section">
          <el-form-item label="Token" prop="token">
            <el-input
              v-model="formData.token"
              type="password"
              placeholder="请输入Token"
              show-password
              clearable
            />
          </el-form-item>
          <el-form-item label="过期时间" prop="tokenExpiresAt">
            <el-date-picker
              v-model="formData.tokenExpiresAt"
              type="datetime"
              placeholder="选择过期时间"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <!-- 证书认证配置 -->
        <div v-else-if="formData.authType === 'certificate'" class="auth-config-section">
          <el-form-item label="证书路径" prop="certPath">
            <el-input
              v-model="formData.certPath"
              placeholder="请输入证书文件路径"
              clearable
            />
          </el-form-item>
          <el-form-item label="私钥路径" prop="keyPath">
            <el-input
              v-model="formData.keyPath"
              placeholder="请输入私钥文件路径"
              clearable
            />
          </el-form-item>
          <el-form-item label="CA证书路径" prop="caPath">
            <el-input
              v-model="formData.caPath"
              placeholder="请输入CA证书文件路径"
              clearable
            />
          </el-form-item>
        </div>

        <!-- Kubeconfig 文件上传配置 -->
        <div v-else-if="formData.authType === 'kubeconfig'" class="auth-config-section">
          <el-form-item label="Kubeconfig文件" prop="kubeconfigFile">
            <el-upload
              ref="uploadRef"
              class="kubeconfig-upload"
              :auto-upload="false"
              :on-change="handleKubeconfigChange"
              :on-remove="handleKubeconfigRemove"
              :limit="1"
              accept=".yaml,.yml,.conf,.config"
              drag
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将 kubeconfig 文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 .yaml, .yml, .conf, .config 格式的 kubeconfig 文件<br/>
                  通常位于 ~/.kube/config 或 /root/.kube/config
                </div>
              </template>
            </el-upload>
          </el-form-item>
          
          <el-form-item v-if="formData.kubeconfigContent" label="文件预览">
            <el-input
              v-model="formData.kubeconfigContent"
              type="textarea"
              :rows="10"
              placeholder="Kubeconfig 文件内容"
              readonly
            />
          </el-form-item>

          <el-alert
            title="提示"
            type="info"
            :closable="false"
            style="margin-top: 10px;"
          >
            <template #default>
              <p style="margin: 0;">Kubeconfig 文件包含集群访问凭证，请确保文件来源可信。</p>
              <p style="margin: 5px 0 0 0;">文件将被安全存储，用于 Kubernetes 集群连接认证。</p>
            </template>
          </el-alert>
        </div>
      </el-card>

      <!-- 高级选项 -->
      <el-card class="form-card">
        <template #header>
          <span>高级选项</span>
        </template>
        
        <el-form-item>
          <el-checkbox v-model="formData.autoMonitor">
            自动监控状态
          </el-checkbox>
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="formData.enableAlert">
            启用告警通知
          </el-checkbox>
        </el-form-item>

        <el-form-item label="连接超时" prop="connectTimeout">
          <el-input-number
            v-model="formData.connectTimeout"
            :min="1"
            :max="300"
            :step="1"
            style="width: 200px"
          />
          <span style="margin-left: 10px; color: #666;">秒</span>
        </el-form-item>

        <el-form-item label="请求超时" prop="requestTimeout">
          <el-input-number
            v-model="formData.requestTimeout"
            :min="1"
            :max="600"
            :step="1"
            style="width: 200px"
          />
          <span style="margin-left: 10px; color: #666;">秒</span>
        </el-form-item>
      </el-card>

      <!-- 测试结果 -->
      <el-card v-if="testResult" class="form-card test-result-card">
        <template #header>
          <div class="card-header">
            <span>测试结果</span>
            <el-button link @click="clearTestResult">
              <el-icon><Close /></el-icon>
              清除
            </el-button>
          </div>
        </template>
        
        <div class="test-result-content">
          <div class="test-result-header">
            <div class="test-status">
              <el-icon v-if="testResult.success" color="#67C23A" size="24">
                <CircleCheck />
              </el-icon>
              <el-icon v-else color="#F56C6C" size="24">
                <CircleClose />
              </el-icon>
              <span class="test-status-text" :class="{ 'success': testResult.success, 'error': !testResult.success }">
                {{ testResult.success ? '连接成功' : '连接失败' }}
              </span>
            </div>
            <div class="test-time">
              <span class="time-label">响应时间:</span>
              <span class="time-value">{{ testResult.responseTime }}ms</span>
            </div>
          </div>
          
          <div class="test-details">
            <div class="detail-item">
              <span class="detail-label">测试地址:</span>
              <span class="detail-value">{{ testResult.url }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">HTTP状态:</span>
              <span class="detail-value" :class="{ 'success': testResult.status >= 200 && testResult.status < 300, 'error': testResult.status >= 400 }">
                {{ testResult.status }}
              </span>
            </div>
            <div v-if="testResult.message" class="detail-item">
              <span class="detail-label">消息:</span>
              <span class="detail-value">{{ testResult.message }}</span>
            </div>
            <div v-if="testResult.data" class="detail-item">
              <span class="detail-label">响应数据:</span>
              <el-collapse>
                <el-collapse-item title="查看详情">
                  <pre class="response-data">{{ JSON.stringify(testResult.data, null, 2) }}</pre>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </div>
      </el-card>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {
  ArrowLeft, Check, Plus, Delete, RefreshRight, Connection, WarningFilled,
  Monitor, DataLine, DocumentCopy, CircleCheck, CircleClose, Close, Box, UploadFilled
} from '@element-plus/icons-vue'
import { getInstanceDetail, addInstance, updateInstance, testConnection, getInstanceTypes } from '@/api/instance.js'

const route = useRoute()
const router = useRouter()

// 表单引用
const formRef = ref()
const uploadRef = ref()

// 数据状态
const saving = ref(false)
const testing = ref(false)
const addressProtocol = ref('http')
const testResult = ref(null)

// 判断是否为编辑模式
const isEdit = computed(() => route.name === 'EditInstance')

// 判断是否为 Kubernetes 类型
const isKubernetesType = computed(() => formData.instanceType === 'kubernetes')

// 实例类型选项 - 从后端API获取
const instanceTypes = ref([])

// 图标映射
const iconMap = {
  'elasticsearch': markRaw(Monitor),
  'kibana': markRaw(DataLine),
  'logstash': markRaw(DocumentCopy),
  'filebeat': markRaw(DocumentCopy),
  'metricbeat': markRaw(DocumentCopy),
  'apm': markRaw(WarningFilled),
  'kubernetes': markRaw(Box)
}

// 颜色映射
const colorMap = {
  'elasticsearch': '#1976d2',
  'kibana': '#4caf50',
  'logstash': '#ff9800',
  'filebeat': '#f44336',
  'metricbeat': '#9c27b0',
  'apm': '#795548',
  'kubernetes': '#326CE5'
}

// 默认端口映射
const defaultPortMap = {
  'elasticsearch': 9200,
  'kibana': 5601,
  'logstash': 5044,
  'filebeat': 9000,
  'metricbeat': 9200,
  'apm': 8200,
  'kubernetes': 6443
}

// 表单数据
const formData = reactive({
  id: null,
  instanceType: '',
  name: '',
  address: '',
  httpsEnabled: false,
  skipSslVerify: false,
  authType: 'none',
  username: '',
  password: '',
  apiKey: '',
  apiId: '',
  accessKey: '',
  secretKey: '',
  region: '',
  token: '',
  tokenExpiresAt: '',
  certPath: '',
  keyPath: '',
  caPath: '',
  kubeconfigFile: null,
  kubeconfigContent: '',
  autoMonitor: false,
  enableAlert: false,
  connectTimeout: 10,
  requestTimeout: 30
})

// 表单验证规则
const formRules = {
  instanceType: [
    { required: true, message: '请选择实例类型', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入实例名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入实例地址', trigger: 'blur' },
    {
      pattern: /^(\d{1,3}\.){3}\d{1,3}:\d+$/,
      message: '请输入有效的IP地址和端口，例如: 192.168.1.100:9200',
      trigger: 'blur'
    }
  ],
  authType: [
    { required: true, message: '请选择认证方式', trigger: 'change' }
  ],
  username: [
    {
      required: () => formData.authType === 'basic',
      message: '请输入用户名',
      trigger: 'blur'
    }
  ],
  password: [
    {
      required: () => formData.authType === 'basic',
      message: '请输入密码',
      trigger: 'blur'
    }
  ],
  apiKey: [
    {
      required: () => formData.authType === 'api_key',
      message: '请输入API Key',
      trigger: 'blur'
    }
  ],
  apiId: [
    {
      required: () => formData.authType === 'api_key',
      message: '请输入API ID',
      trigger: 'blur'
    }
  ],
  accessKey: [
    {
      required: () => formData.authType === 'aws_iam',
      message: '请输入Access Key',
      trigger: 'blur'
    }
  ],
  secretKey: [
    {
      required: () => formData.authType === 'aws_iam',
      message: '请输入Secret Key',
      trigger: 'blur'
    }
  ],
  region: [
    {
      required: () => formData.authType === 'aws_iam',
      message: '请选择Region',
      trigger: 'change'
    }
  ],
  token: [
    {
      required: () => formData.authType === 'token',
      message: '请输入Token',
      trigger: 'blur'
    }
  ],
  certPath: [
    {
      required: () => formData.authType === 'certificate',
      message: '请输入证书路径',
      trigger: 'blur'
    }
  ],
  keyPath: [
    {
      required: () => formData.authType === 'certificate',
      message: '请输入私钥路径',
      trigger: 'blur'
    }
  ],
  kubeconfigFile: [
    {
      required: () => formData.authType === 'kubeconfig',
      message: '请上传 Kubeconfig 文件',
      trigger: 'change'
    }
  ]
}

// 事件处理
const handleBack = () => {
  router.push('/instances')
}

const handleCancel = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要取消吗？未保存的更改将会丢失。',
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '继续编辑',
        type: 'warning'
      }
    )
    router.push('/instances')
  } catch (error) {
    // 用户取消
  }
}

const handleSave = async () => {
  saving.value = true
  
  try {
    // 表单验证
    await formRef.value.validate()
    
    // 构建提交数据
    const submitData = {
      instance_type_id: getInstanceTypeId(formData.instanceType),
      name: formData.name,
      address: formData.address,
      https_enabled: formData.httpsEnabled,
      skip_ssl_verify: formData.skipSslVerify,
      auth_configs: {
        auth_type: formData.authType,
        config_key: formData.authType,
        config_value: getAuthConfigValue(),
        is_encrypted: false
      }
    }
    
    // 如果是编辑模式，添加ID
    if (isEdit.value) {
      submitData.id = formData.id
      await updateInstance(submitData)
      ElMessage.success('实例更新成功')
    } else {
      await addInstance(submitData)
      ElMessage.success('实例创建成功')
    }
    
    router.push('/instances')
  } catch (error) {
    if (error !== false) { // 不是表单验证错误
      const errorMsg = error.response?.data?.message || error.message || '未知错误'
      ElMessage.error(isEdit.value ? '实例更新失败: ' + errorMsg : '实例创建失败: ' + errorMsg)
      console.error('保存实例失败:', error.response?.data || error)
    }
  } finally {
    saving.value = false
  }
}

const handleTestConnection = async () => {
  if (!formData.name || !formData.address) {
    ElMessage.warning('请先填写实例名称和地址')
    return
  }

  testing.value = true
  
  try {
    // 构建完整的URL
    const url = `${addressProtocol.value}://${formData.address}`
    
    // 构建请求配置
    const requestConfig = {
      method: 'GET',
      timeout: (formData.connectTimeout || 10) * 1000,
      headers: {}
    }
    
    // 根据认证方式添加认证信息
    if (formData.authType === 'basic' && formData.username && formData.password) {
      const credentials = btoa(`${formData.username}:${formData.password}`)
      requestConfig.headers.Authorization = `Basic ${credentials}`
    } else if (formData.authType === 'api_key' && formData.apiKey) {
      const apiKey = formData.apiId ? `${formData.apiId}:${formData.apiKey}` : formData.apiKey
      requestConfig.headers.Authorization = `ApiKey ${apiKey}`
    } else if (formData.authType === 'token' && formData.token) {
      requestConfig.headers.Authorization = `Bearer ${formData.token}`
    }
    
    // 根据实例类型选择测试端点
    let testEndpoint = url
    if (formData.instanceType === 'elasticsearch') {
      testEndpoint = `${url}/_cluster/health`
    } else if (formData.instanceType === 'kibana') {
      testEndpoint = `${url}/api/status`
    } else if (formData.instanceType === 'logstash') {
      testEndpoint = `${url}/_node/stats`
    } else {
      testEndpoint = url
    }
    
    // 记录开始时间
    const startTime = Date.now()
    
    // 发送测试请求
    const response = await fetch(testEndpoint, requestConfig)
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    if (response.ok) {
      // 尝试解析响应数据
      let responseData
      try {
        responseData = await response.json()
      } catch (e) {
        // 如果不是JSON，尝试获取文本
        responseData = await response.text()
      }
      
      // 设置测试结果
      testResult.value = {
        success: true,
        url: testEndpoint,
        status: response.status,
        responseTime,
        message: '连接成功',
        data: responseData
      }
      
      // 显示成功结果
      ElMessage.success(`${formData.name} 连接测试成功 (响应时间: ${responseTime}ms)`)
    } else {
      // 请求失败
      let errorMessage = `HTTP ${response.status}`
      let errorData = null
      
      try {
        errorData = await response.json()
        errorMessage = errorData.error?.message || errorData.message || errorMessage
      } catch (e) {
        // 如果不是JSON，尝试获取文本
        try {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        } catch (textError) {
          // 无法获取错误详情
        }
      }
      
      // 设置测试结果
      testResult.value = {
        success: false,
        url: testEndpoint,
        status: response.status,
        responseTime,
        message: errorMessage,
        data: errorData
      }
      
      ElMessage.error(`${formData.name} 连接测试失败: ${errorMessage}`)
    }
    
  } catch (error) {
    let errorMessage = '连接测试失败'
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = '网络连接失败，请检查地址是否正确'
    } else if (error.name === 'AbortError') {
      errorMessage = '连接超时，请检查网络或增加超时时间'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    // 设置测试结果
    testResult.value = {
      success: false,
      url: testEndpoint,
      status: 'N/A',
      responseTime: 'N/A',
      message: errorMessage,
      data: null
    }
    
    ElMessage.error(`${formData.name} 连接测试失败: ${errorMessage}`)
  } finally {
    testing.value = false
  }
}

// 清除测试结果
const clearTestResult = () => {
  testResult.value = null
}

const handleTypeChange = (value) => {
  const type = instanceTypes.value.find(t => t.value === value)
  if (type) {
    // 自动填充默认端口
    if (!formData.address.includes(':')) {
      formData.address = `192.168.1.100:${type.defaultPort}`
    }
  }
}

const handleProtocolChange = () => {
  // 协议变更时自动设置HTTPS状态
  formData.httpsEnabled = addressProtocol.value === 'https'
}

const handleAuthTypeChange = () => {
  // 清空之前的认证配置
  Object.keys(formData).forEach(key => {
    if (['username', 'password', 'apiKey', 'apiId', 'accessKey', 'secretKey', 'region', 'token', 'tokenExpiresAt', 'certPath', 'keyPath', 'caPath', 'kubeconfigFile', 'kubeconfigContent'].includes(key)) {
      if (key === 'kubeconfigFile') {
        formData[key] = null
      } else {
        formData[key] = ''
      }
    }
  })
  
  // 清空上传组件
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// 处理 Kubeconfig 文件变化
const handleKubeconfigChange = (file) => {
  formData.kubeconfigFile = file.raw
  
  // 读取文件内容用于预览
  const reader = new FileReader()
  reader.onload = (e) => {
    formData.kubeconfigContent = e.target.result
  }
  reader.readAsText(file.raw)
}

// 处理 Kubeconfig 文件移除
const handleKubeconfigRemove = () => {
  formData.kubeconfigFile = null
  formData.kubeconfigContent = ''
}

const resetAuthConfig = () => {
  handleAuthTypeChange()
  ElMessage.success('认证配置已重置')
}

// 获取认证配置值
const getAuthConfigValue = () => {
  const config = {}
  
  switch (formData.authType) {
    case 'basic':
      config.username = formData.username
      config.password = formData.password
      break
    case 'api_key':
      config.apiKey = formData.apiKey
      config.apiId = formData.apiId
      break
    case 'aws_iam':
      config.accessKey = formData.accessKey
      config.secretKey = formData.secretKey
      config.region = formData.region
      break
    case 'token':
      config.token = formData.token
      config.tokenExpiresAt = formData.tokenExpiresAt
      break
    case 'certificate':
      config.certPath = formData.certPath
      config.keyPath = formData.keyPath
      config.caPath = formData.caPath
      break
    case 'kubeconfig':
      config.kubeconfigContent = formData.kubeconfigContent
      config.fileName = formData.kubeconfigFile?.name || 'config'
      break
  }
  
  // 返回JSON字符串
  return JSON.stringify(config)
}

// 获取实例类型ID
const getInstanceTypeId = (type) => {
  const typeItem = instanceTypes.value.find(t => t.value === type)
  return typeItem ? typeItem.id : null
}

// 加载实例类型列表
const loadInstanceTypes = async () => {
  try {
    const response = await getInstanceTypes()
    const types = response.data?.instance_types || []
    
    // 转换为表单需要的格式
    instanceTypes.value = types.map(type => ({
      id: type.id,
      value: type.type_name.toLowerCase(),
      label: type.type_name,
      icon: iconMap[type.type_name.toLowerCase()] || markRaw(Monitor),
      color: colorMap[type.type_name.toLowerCase()] || '#666',
      defaultPort: defaultPortMap[type.type_name.toLowerCase()] || 8080
    }))
  } catch (error) {
    console.error('获取实例类型失败:', error)
    ElMessage.error('获取实例类型失败')
  }
}

// 加载实例数据(编辑模式)
const loadInstanceData = async () => {
  if (!isEdit.value) return
  
  try {
    const response = await getInstanceDetail(route.params.id)
    const instance = response.data?.instance
    
    if (instance) {
      // 填充表单
      formData.id = instance.id
      formData.instanceType = instance.type_name.toLowerCase()
      formData.name = instance.name
      formData.address = instance.address
      formData.httpsEnabled = instance.https_enabled || false
      formData.skipSslVerify = instance.skip_ssl_verify || false
      
      // 根据HTTPS设置协议
      addressProtocol.value = formData.httpsEnabled ? 'https' : 'http'
      
      // 解析认证配置
      if (instance.auth_configs) {
        try {
          let authConfigs = []
          
          // 尝试解析为JSON数组
          try {
            authConfigs = JSON.parse(instance.auth_configs)
          } catch (e) {
            // 如果解析失败，尝试解析旧格式: "basic:{"username":"elastic","password":"123456"}"
            const colonIndex = instance.auth_configs.indexOf(':')
            if (colonIndex > -1) {
              const authType = instance.auth_configs.substring(0, colonIndex)
              const configJson = instance.auth_configs.substring(colonIndex + 1)
              
              authConfigs = [{
                auth_type: authType,
                config_value: configJson
              }]
            }
          }
          
          // 使用第一个认证配置
          if (authConfigs.length > 0) {
            const authConfig = authConfigs[0]
            formData.authType = authConfig.auth_type
            
            // 解析配置值
            let config = {}
            try {
              config = JSON.parse(authConfig.config_value)
            } catch (e) {
              // 如果解析失败，直接使用原始值
              console.warn('解析认证配置失败，使用原始值:', authConfig.config_value)
            }
            
            // 根据认证类型填充对应的表单字段
            switch (formData.authType) {
              case 'basic':
                formData.username = config.username || ''
                formData.password = config.password || ''
                break
              case 'api_key':
                formData.apiKey = config.apiKey || ''
                formData.apiId = config.apiId || ''
                break
              case 'aws_iam':
                formData.accessKey = config.accessKey || ''
                formData.secretKey = config.secretKey || ''
                formData.region = config.region || ''
                break
              case 'token':
                formData.token = config.token || ''
                formData.tokenExpiresAt = config.tokenExpiresAt || ''
                break
              case 'certificate':
                formData.certPath = config.certPath || ''
                formData.keyPath = config.keyPath || ''
                formData.caPath = config.caPath || ''
                break
              case 'kubeconfig':
                formData.kubeconfigContent = config.kubeconfigContent || ''
                // 注意: 编辑模式下文件对象无法恢复,只能显示内容
                break
            }
          }
        } catch (e) {
          console.warn('解析认证配置失败', e, instance.auth_configs)
        }
      }
    }
    
  } catch (error) {
    ElMessage.error('加载实例数据失败: ' + error.message)
    router.push('/instances')
  }
}

onMounted(async () => {
  await loadInstanceTypes()
  await loadInstanceData()
})
</script>

<style scoped>
.instance-form {
  padding: 20px;
  background-color: #f5f5f5;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.instance-form-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  overflow-y: auto;
}

.form-card {
  flex-shrink: 0;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth-config-section {
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
  margin-top: 10px;
}

.test-result-card {
  border: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.test-result-content {
  padding: 16px;
}

.test-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.test-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.test-status-text {
  font-size: 18px;
  font-weight: 600;
}

.test-status-text.success {
  color: #67C23A;
}

.test-status-text.error {
  color: #F56C6C;
}

.test-time {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-label {
  color: #666;
  font-size: 14px;
}

.time-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.test-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-label {
  min-width: 100px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.detail-value {
  flex: 1;
  color: #333;
  font-size: 14px;
  word-break: break-all;
}

.detail-value.success {
  color: #67C23A;
  font-weight: 600;
}

.detail-value.error {
  color: #F56C6C;
  font-weight: 600;
}

.response-data {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.kubeconfig-upload {
  width: 100%;
}

.kubeconfig-upload :deep(.el-upload) {
  width: 100%;
}

.kubeconfig-upload :deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 20px;
}

.kubeconfig-upload :deep(.el-icon--upload) {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 16px;
}

.kubeconfig-upload :deep(.el-upload__text) {
  font-size: 14px;
  color: #606266;
}

.kubeconfig-upload :deep(.el-upload__text em) {
  color: #409EFF;
  font-style: normal;
}

.kubeconfig-upload :deep(.el-upload__tip) {
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
  line-height: 1.6;
}

</style>