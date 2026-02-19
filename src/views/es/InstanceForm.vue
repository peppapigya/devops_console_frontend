<template>
  <div class="page-container">
    <el-card class="page-header-card">
       <div class="page-header">
         <div class="header-left">
           <el-button @click="handleBack" link class="mr-2">
             <el-icon><ArrowLeft /></el-icon>
           </el-button>
           <div class="header-title-wrapper">
             <h2>{{ isEdit ? '编辑实例' : '添加实例' }}</h2>
             <p class="subtitle">配置连接信息与认证方式</p>
           </div>
         </div>
         <div class="header-right">
            <el-button @click="handleCancel">取消</el-button>
            <el-button @click="handleTestConnection" :loading="testing" :disabled="!formData.name || !formData.address">
              <el-icon><Connection /></el-icon> 测试连接
            </el-button>
            <el-button type="primary" @click="handleSave" :loading="saving">
              <el-icon><Check /></el-icon> 保存
            </el-button>
         </div>
       </div>
    </el-card>

    <div class="form-container max-w-4xl mx-auto">
       <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-position="top"
          class="instance-form-content"
       >
          <!-- Basic Info -->
          <el-card class="content-card mb-20 p-4">
             <template #header>
                <div class="font-bold flex items-center gap-2">
                   <el-icon><InfoFilled /></el-icon> 基本信息
                </div>
             </template>
             <el-row :gutter="24">
                <el-col :span="12">
                   <el-form-item label="实例类型" prop="instanceType">
                      <el-select
                        v-model="formData.instanceType"
                        placeholder="请选择实例类型"
                        class="w-full"
                        @change="handleTypeChange"
                      >
                         <el-option
                           v-for="type in instanceTypes"
                           :key="type.value"
                           :label="type.label"
                           :value="type.value"
                         >
                            <div class="flex items-center gap-2">
                               <el-icon :color="type.color"><component :is="type.icon" /></el-icon>
                               <span>{{ type.label }}</span>
                            </div>
                         </el-option>
                      </el-select>
                   </el-form-item>
                </el-col>
                <el-col :span="12">
                   <el-form-item label="实例名称" prop="name">
                      <el-input v-model="formData.name" placeholder="请输入实例名称" clearable />
                   </el-form-item>
                </el-col>
                <el-col :span="24">
                   <el-form-item label="实例地址" prop="address">
                      <el-input v-model="formData.address" placeholder="例如: 192.168.1.100:9200" clearable>
                         <template #prepend>
                            <el-select v-model="addressProtocol" style="width: 90px">
                               <el-option label="http://" value="http" />
                               <el-option label="https://" value="https" />
                            </el-select>
                         </template>
                      </el-input>
                   </el-form-item>
                </el-col>
                <el-col :span="24" v-if="addressProtocol === 'https'">
                   <el-form-item>
                      <el-checkbox v-model="formData.skipSslVerify">跳过 SSL 证书验证</el-checkbox>
                      <div class="text-xs text-sub ml-2 inline-block">启用此选项可忽略自签名证书错误</div>
                   </el-form-item>
                </el-col>
             </el-row>
          </el-card>

          <!-- Auth Config -->
          <el-card class="content-card mb-20 p-4">
             <template #header>
                <div class="flex justify-between items-center">
                   <div class="font-bold flex items-center gap-2">
                      <el-icon><Lock /></el-icon> 认证配置
                   </div>
                   <el-button link type="primary" size="small" @click="resetAuthConfig">重置</el-button>
                </div>
             </template>
             
             <el-form-item label="认证方式" prop="authType">
                <el-radio-group v-model="formData.authType" class="w-full flex-wrap">
                   <el-radio-button label="none">无认证</el-radio-button>
                   <el-radio-button label="basic">基础认证 (Basic)</el-radio-button>
                   <el-radio-button label="api_key">API 密钥</el-radio-button>
                   <el-radio-button label="token">Token 令牌</el-radio-button>
                   <el-radio-button v-if="isKubernetesType" label="kubeconfig">Kubeconfig</el-radio-button>
                </el-radio-group>
             </el-form-item>

             <div class="auth-fields mt-4 bg-gray-50 p-6 rounded-lg border border-gray-100" v-if="formData.authType !== 'none'">
                 <!-- Basic -->
                 <div v-if="formData.authType === 'basic'">
                    <el-row :gutter="24">
                       <el-col :span="12">
                          <el-form-item label="用户名" prop="username">
                             <el-input v-model="formData.username" placeholder="Username" />
                          </el-form-item>
                       </el-col>
                       <el-col :span="12">
                          <el-form-item label="密码" prop="password">
                             <el-input v-model="formData.password" type="password" show-password placeholder="Password" />
                          </el-form-item>
                       </el-col>
                    </el-row>
                 </div>

                 <!-- API Key -->
                 <div v-if="formData.authType === 'api_key'">
                    <el-row :gutter="24">
                       <el-col :span="12">
                          <el-form-item label="API ID" prop="apiId">
                             <el-input v-model="formData.apiId" placeholder="API ID" />
                          </el-form-item>
                       </el-col>
                       <el-col :span="12">
                          <el-form-item label="API Key" prop="apiKey">
                             <el-input v-model="formData.apiKey" type="password" show-password placeholder="API Key Secret" />
                          </el-form-item>
                       </el-col>
                    </el-row>
                 </div>

                 <!-- Token -->
                 <div v-if="formData.authType === 'token'">
                    <el-form-item label="Token" prop="token">
                       <el-input v-model="formData.token" type="textarea" :rows="3" placeholder="Bearer Token" />
                    </el-form-item>
                 </div>
                 
                 <!-- Kubeconfig -->
                 <div v-if="formData.authType === 'kubeconfig'">
                    <el-form-item label="Kubeconfig 文件" prop="kubeconfigFile">
                       <el-upload
                         class="w-full"
                         drag
                         action="#"
                         :auto-upload="false"
                         :on-change="handleKubeconfigChange"
                         :limit="1"
                         accept=".yaml,.yml,.conf,.config"
                       >
                         <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
                       </el-upload>
                    </el-form-item>
                    <el-form-item label="内容预览" v-if="formData.kubeconfigContent">
                        <el-input type="textarea" v-model="formData.kubeconfigContent" :rows="5" readonly />
                    </el-form-item>
                 </div>
             </div>
          </el-card>

          <!-- Advanced -->
          <el-card class="content-card p-4">
              <template #header>
                 <div class="font-bold flex items-center gap-2">
                    <el-icon><Setting /></el-icon> 高级选项
                 </div>
              </template>
              <el-row :gutter="24">
                 <el-col :span="8">
                    <el-form-item label="连接超时 (秒)">
                       <el-input-number v-model="formData.connectTimeout" :min="1" :max="60" class="w-full" />
                    </el-form-item>
                 </el-col>
                 <el-col :span="8">
                    <el-form-item label="请求超时 (秒)">
                       <el-input-number v-model="formData.requestTimeout" :min="1" :max="120" class="w-full" />
                    </el-form-item>
                 </el-col>
              </el-row>
              <el-row :gutter="24">
                 <el-col :span="12">
                    <el-checkbox v-model="formData.autoMonitor">自动监控状态</el-checkbox>
                    <el-checkbox v-model="formData.enableAlert">启用告警通知</el-checkbox>
                 </el-col>
              </el-row>
          </el-card>
       </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {
  ArrowLeft, Check, Connection, 
  Monitor, DataLine, DocumentCopy, CircleCheck, CircleClose, Box, UploadFilled,
  InfoFilled, Lock, Setting, WarningFilled
} from '@element-plus/icons-vue'
import { getInstanceDetail, addInstance, updateInstance, testConnection, getInstanceTypes } from '@/api/instance.js'

const route = useRoute()
const router = useRouter()

// 表单引用
const formRef = ref()

// 数据状态
const saving = ref(false)
const testing = ref(false)
const addressProtocol = ref('http')
const instanceTypes = ref([
    { label: 'Elasticsearch', value: 'elasticsearch', icon: markRaw(Monitor), color: '#005571', defaultPort: 9200 },
    { label: 'Kibana', value: 'kibana', icon: markRaw(DataLine), color: '#005571', defaultPort: 5601 },
    { label: 'Logstash', value: 'logstash', icon: markRaw(DocumentCopy), color: '#005571', defaultPort: 9600 },
    { label: 'Kubernetes', value: 'kubernetes', icon: markRaw(Box), color: '#326CE5', defaultPort: 6443 },
    { label: 'Filebeat', value: 'filebeat', icon: markRaw(DocumentCopy), color: '#005571', defaultPort: 5066 },
    { label: 'Metricbeat', value: 'metricbeat', icon: markRaw(DocumentCopy), color: '#005571', defaultPort: 5067 },
    { label: 'APM', value: 'apm', icon: markRaw(WarningFilled), color: '#005571', defaultPort: 8200 },
])

// 判断是否为编辑模式
const isEdit = computed(() => !!route.params.id)

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
  token: '',
  certPath: '',
  keyPath: '',
  caPath: '',
  kubeconfigFile: null,
  kubeconfigContent: '',
  autoMonitor: true,
  enableAlert: false,
  connectTimeout: 5,
  requestTimeout: 10
})

const isKubernetesType = computed(() => formData.instanceType === 'kubernetes')

// 表单验证规则
const formRules = {
  instanceType: [{ required: true, message: '请选择实例类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入实例名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入实例地址', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleBack = () => router.push('/es/instances')
const handleCancel = () => router.push('/es/instances')

const handleTypeChange = (val) => {
    const type = instanceTypes.value.find(t => t.value === val)
    if (type && !formData.address) {
        formData.address = `127.0.0.1:${type.defaultPort}`
    }
}

const handleKubeconfigChange = (file) => {
    formData.kubeconfigFile = file.raw
    const reader = new FileReader()
    reader.onload = (e) => {
        formData.kubeconfigContent = e.target.result
    }
    reader.readAsText(file.raw)
}

const resetAuthConfig = () => {
    formData.authType = 'none'
    formData.username = ''
    formData.password = ''
    formData.apiKey = ''
    formData.apiId = ''
    formData.token = ''
    formData.kubeconfigFile = null
    formData.kubeconfigContent = ''
}

const handleSave = async () => {
    if (!formRef.value) return
    await formRef.value.validate()
    
    saving.value = true
    try {
        const payload = { ...formData }
        if (addressProtocol.value === 'https') {
             // Logic to prepend https if not present, or handle it via a separate field if backend expects it
             payload.httpsEnabled = true
        } else {
             payload.httpsEnabled = false
        }
        
        if (isEdit.value) {
            await updateInstance(payload)
            ElMessage.success('更新成功')
        } else {
            await addInstance(payload)
            ElMessage.success('创建成功')
        }
        router.push('/es/instances')
    } catch (e) {
        ElMessage.error(e.message || '保存失败')
    } finally {
        saving.value = false
    }
}

const handleTestConnection = async () => {
    testing.value = true
    try {
        await testConnection(formData)
        ElMessage.success('连接测试成功')
    } catch (e) {
        ElMessage.error('连接测试失败: ' + (e.message || '网络错误'))
    } finally {
        testing.value = false
    }
}

const getInstanceTypeId = (typeName) => {
    // Mock logic: map string to ID if backend requires ID
    // In real app, this might fetch from a store or types API
    return 1 
}

const getAuthConfigValue = () => {
    switch (formData.authType) {
        case 'basic': return JSON.stringify({ username: formData.username, password: formData.password })
        case 'api_key': return JSON.stringify({ id: formData.apiId, key: formData.apiKey })
        case 'token': return formData.token
        case 'kubeconfig': return formData.kubeconfigContent
        default: return ''
    }
}

onMounted(async () => {
    if (isEdit.value) {
        const id = route.params.id
        try {
            const res = await getInstanceDetail(id)
            Object.assign(formData, res.data)
            // Parse address protocol
            if (formData.httpsEnabled) addressProtocol.value = 'https'
            
            // Parse auth config if needed
        } catch (e) {
            ElMessage.error('加载实例详情失败')
        }
    }
})

</script>

<style scoped>
.header-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.max-w-4xl { max-width: 56rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mr-2 { margin-right: 8px; }
.mb-20 { margin-bottom: 20px; }
.mt-4 { margin-top: 16px; }
.ml-2 { margin-left: 8px; }
.p-4 { padding: 16px; }
.p-6 { padding: 24px; }
.w-full { width: 100%; }
.gap-2 { gap: 8px; }
.text-xs { font-size: 12px; }
.text-sub { color: var(--text-sub); }
.font-bold { font-weight: 600; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.flex-wrap { flex-wrap: wrap; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left { display: flex; align-items: center; }
.header-title-wrapper h2 { margin: 0; font-size: 18px; color: var(--text-main); }
.header-title-wrapper .subtitle { margin: 0; font-size: 12px; color: var(--text-sub); }
.header-right { display: flex; align-items: center; gap: 12px; }

.grid-radio-group {
    display: flex;
    gap: 0;
}
</style>