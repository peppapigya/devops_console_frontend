<template>
  <div class="autoops-container chaos-create-page">
    <div class="page-header">
      <el-page-header @back="handleBack" title="返回">
        <template #content>
          <span class="page-title">创建混沌实验</span>
        </template>
      </el-page-header>
    </div>

    <div class="chaos-wizard-container">
      <el-card>
        <!-- Steps Indicator -->
        <el-steps :active="currentStep" finish-status="success" align-center>
          <el-step title="基本信息" />
          <el-step title="故障配置" />
          <el-step title="目标选择" />
          <el-step title="确认提交" />
        </el-steps>

        <!-- Step 1: Basic Info -->
        <div v-show="currentStep === 0" class="wizard-step">
          <el-form :model="formData" :rules="step1Rules" ref="formStep1" label-width="120px">
            <el-form-item label="实验名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入实验名称" />
            </el-form-item>

            <el-form-item label="命名空间" prop="namespace">
              <el-select v-model="formData.namespace" placeholder="请选择命名空间" style="width: 100%">
                <el-option v-for="ns in namespaceList" :key="ns.name" :label="ns.name" :value="ns.name" />
              </el-select>
            </el-form-item>

            <el-form-item label="故障类型" prop="faultType">
              <el-radio-group v-model="formData.faultType" @change="handleFaultTypeChange">
                <el-radio value="PodChaos">Pod混沌</el-radio>
                <el-radio value="NetworkChaos">网络混沌</el-radio>
                <el-radio value="IOChaos">IO混沌</el-radio>
                <el-radio value="StressChaos">压力混沌</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="持续时间">
              <el-input v-model="formData.duration" placeholder="例如: 5m, 1h, 30s" />
              <span class="form-tip">格式: 数字 + 单位 (s/m/h)</span>
            </el-form-item>

            <el-form-item label="标签">
              <el-input 
                v-model="formData.labelsStr" 
                type="textarea" 
                :rows="2" 
                placeholder="格式: key1=value1,key2=value2"
              />
            </el-form-item>
          </el-form>

          <div class="step-actions">
            <el-button type="primary" @click="nextStep">下一步</el-button>
          </div>
        </div>

        <!-- Step 2: Fault Configuration -->
        <div v-show="currentStep === 1" class="wizard-step">
          <el-form :model="formData.spec" :rules="step2Rules" ref="formStep2" label-width="120px">
            
            <!-- PodChaos Configuration -->
            <div v-if="formData.faultType === 'PodChaos'">
              <el-form-item label="故障动作" prop="action">
                <el-select v-model="formData.spec.action" placeholder="请选择故障动作">
                  <el-option label="Pod Kill" value="pod-kill" />
                  <el-option label="Pod Failure" value="pod-failure" />
                  <el-option label="Container Kill" value="container-kill" />
                </el-select>
              </el-form-item>

              <el-form-item label="容器名称">
                <el-input v-model="formData.spec.containerName" placeholder="请输入容器名称 (可选)" />
              </el-form-item>

              <el-form-item label="宽限期(秒)">
                <el-input-number v-model="formData.spec.gracePeriod" :min="0" :max="3600" />
              </el-form-item>

              <el-form-item label="影响模式">
                <el-select v-model="formData.spec.mode" placeholder="请选择影响模式">
                  <el-option label="One" value="one" />
                  <el-option label="All" value="all" />
                  <el-option label="Fixed" value="fixed" />
                  <el-option label="Fixed Percent" value="fixed-percent" />
                  <el-option label="Random Max Percent" value="random-max-percent" />
                </el-select>
              </el-form-item>

              <el-form-item label="影响数值">
                <el-input v-model="formData.spec.value" placeholder="请输入影响数值" />
              </el-form-item>
            </div>

            <!-- NetworkChaos Configuration -->
            <div v-if="formData.faultType === 'NetworkChaos'">
              <el-form-item label="故障动作" prop="action">
                <el-select v-model="formData.spec.action" placeholder="请选择故障动作">
                  <el-option label="Delay" value="delay" />
                  <el-option label="Loss" value="loss" />
                  <el-option label="Duplicate" value="duplicate" />
                  <el-option label="Corrupt" value="corrupt" />
                  <el-option label="Partition" value="partition" />
                </el-select>
              </el-form-item>

              <el-form-item v-if="formData.spec.action === 'delay'" label="延迟配置">
                <el-input v-model="formData.spec.delayLatency" placeholder="延迟时间 (例如: 10ms)" />
                <el-input v-model="formData.spec.delayJitter" placeholder="抖动时间 (例如: 5ms)" />
              </el-form-item>

              <el-form-item v-if="formData.spec.action === 'loss'" label="丢包配置">
                <el-input v-model="formData.spec.lossLoss" placeholder="丢包百分比 (例如: 10)" />
              </el-form-item>

              <el-form-item label="影响方向">
                <el-select v-model="formData.spec.direction" placeholder="请选择影响方向">
                  <el-option label="To" value="to" />
                  <el-option label="From" value="from" />
                  <el-option label="Both" value="both" />
                </el-select>
              </el-form-item>
            </div>

            <!-- IOChaos Configuration -->
            <div v-if="formData.faultType === 'IOChaos'">
              <el-form-item label="故障动作" prop="action">
                <el-select v-model="formData.spec.action" placeholder="请选择故障动作">
                  <el-option label="Latency" value="latency" />
                  <el-option label="Fault" value="fault" />
                </el-select>
              </el-form-item>

              <el-form-item label="影响百分比">
                <el-input-number v-model="formData.spec.percent" :min="0" :max="100" />
              </el-form-item>

              <el-form-item label="目标路径">
                <el-input v-model="formData.spec.path" placeholder="例如: /data" />
              </el-form-item>

              <el-form-item label="IO方法">
                <el-checkbox-group v-model="formData.spec.methods">
                  <el-checkbox value="read">Read</el-checkbox>
                  <el-checkbox value="write">Write</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>

            <!-- StressChaos Configuration -->
            <div v-if="formData.faultType === 'StressChaos'">
              <el-form-item label="CPU压力">
                <el-input-number v-model="formData.spec.cpuLoad" :min="0" :max="100" placeholder="CPU负载百分比" />
                <el-input-number v-model="formData.spec.cpuWorkers" :min="1" :max="32" placeholder="Workers数量" />
              </el-form-item>

              <el-form-item label="内存压力">
                <el-input v-model="formData.spec.memorySize" placeholder="内存大小 (例如: 256MB)" />
                <el-input-number v-model="formData.spec.memoryWorkers" :min="1" :max="32" placeholder="Workers数量" />
              </el-form-item>

              <el-form-item label="Workers数量">
                <el-input-number v-model="formData.spec.workers" :min="1" :max="64" />
              </el-form-item>
            </div>
          </el-form>

          <div class="step-actions">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="nextStep">下一步</el-button>
          </div>
        </div>

        <!-- Step 3: Target Selector -->
        <div v-show="currentStep === 2" class="wizard-step">
          <el-form :model="formData.spec" :rules="step3Rules" ref="formStep3" label-width="120px">
            <el-form-item label="选择方式">
              <el-radio-group v-model="targetMode">
                <el-radio value="label">Label选择器</el-radio>
                <el-radio value="pod">指定Pod</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="targetMode === 'label'" label="Label选择器">
              <el-input 
                v-model="formData.spec.labelSelectorsStr" 
                type="textarea" 
                :rows="4" 
                placeholder="格式: app=frontend,env=dev"
              />
            </el-form-item>

            <el-form-item v-if="targetMode === 'pod'" label="指定Pod">
              <el-input 
                v-model="formData.spec.podsStr" 
                type="textarea" 
                :rows="4" 
                placeholder="格式: namespace1:pod1,pod2;namespace2:pod3"
              />
            </el-form-item>

            <el-form-item label="影响模式">
              <el-select v-model="formData.spec.mode" placeholder="请选择影响模式">
                <el-option label="One" value="one" />
                <el-option label="All" value="all" />
                <el-option label="Fixed" value="fixed" />
                <el-option label="Fixed Percent" value="fixed-percent" />
                <el-option label="Random Max Percent" value="random-max-percent" />
              </el-select>
            </el-form-item>

            <el-form-item label="影响数值">
              <el-input v-model="formData.spec.value" placeholder="请输入影响数值" />
            </el-form-item>
          </el-form>

          <div class="step-actions">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="nextStep">下一步</el-button>
          </div>
        </div>

        <!-- Step 4: Preview & Submit -->
        <div v-show="currentStep === 3" class="wizard-step">
          <el-descriptions title="实验配置预览" :column="1" border>
            <el-descriptions-item label="实验名称">
              {{ formData.name }}
            </el-descriptions-item>
            <el-descriptions-item label="命名空间">
              {{ formData.namespace }}
            </el-descriptions-item>
            <el-descriptions-item label="故障类型">
              {{ formData.faultType }}
            </el-descriptions-item>
            <el-descriptions-item label="持续时间">
              {{ formData.duration || '不限制' }}
            </el-descriptions-item>
            <el-descriptions-item label="目标选择方式">
              {{ targetMode === 'label' ? 'Label选择器' : '指定Pod' }}
            </el-descriptions-item>
            <el-descriptions-item label="影响模式">
              {{ formData.spec.mode || '-' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="formData.spec.action" label="故障动作">
              {{ formData.spec.action }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="step-actions">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">提交实验</el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { createChaosExperiment } from '@/api/chaos'
import { getSelectedInstanceId } from '@/stores/instanceStore'
import { listNamespaces } from '@/api/k8s/namespace'

const router = useRouter()

const currentStep = ref(0)
const submitting = ref(false)
const targetMode = ref('label')
const namespaceList = ref([])

const formData = reactive({
  name: '',
  namespace: '',
  faultType: 'PodChaos',
  duration: '5m',
  labelsStr: '',
  labels: {},
  spec: {
    action: 'pod-kill',
    containerName: '',
    gracePeriod: 0,
    mode: 'one',
    value: '1',
    selector: {},
    delayLatency: '',
    delayJitter: '',
    lossLoss: '',
    direction: 'both',
    percent: 100,
    path: '',
    methods: [],
    cpuLoad: 0,
    cpuWorkers: 1,
    memorySize: '',
    memoryWorkers: 1,
    workers: 1,
    labelSelectorsStr: '',
    podsStr: ''
  }
})

const step1Rules = {
  name: [{ required: true, message: '请输入实验名称', trigger: 'blur' }],
  namespace: [{ required: true, message: '请选择命名空间', trigger: 'change' }],
  faultType: [{ required: true, message: '请选择故障类型', trigger: 'change' }]
}

const step2Rules = {
  action: [{ required: true, message: '请选择故障动作', trigger: 'change' }]
}

const step3Rules = {
  mode: [{ required: true, message: '请选择影响模式', trigger: 'change' }]
}

const formStep1 = ref(null)
const formStep2 = ref(null)
const formStep3 = ref(null)

const fetchNamespaces = async () => {
  try {
    const instanceId = getSelectedInstanceId()
    const res = await listNamespaces(instanceId)
    namespaceList.value = res.data?.namespaceList || []
    if (namespaceList.value.length > 0 && !formData.namespace) {
      formData.namespace = namespaceList.value[0].name
    }
  } catch (e) {
    ElMessage.error('获取命名空间列表失败')
  }
}

const handleFaultTypeChange = () => {
  formData.spec.action = getDefaultAction(formData.faultType)
}

const getDefaultAction = (type) => {
  const actions = {
    'PodChaos': 'pod-kill',
    'NetworkChaos': 'delay',
    'IOChaos': 'latency',
    'StressChaos': ''
  }
  return actions[type] || ''
}

const nextStep = async () => {
  if (currentStep.value === 0) {
    try {
      await formStep1.value.validate()
      currentStep.value++
    } catch (e) {
      ElMessage.warning('请完善基本信息')
    }
  } else if (currentStep.value === 1) {
    try {
      await formStep2.value.validate()
      currentStep.value++
    } catch (e) {
      ElMessage.warning('请完善故障配置')
    }
  } else if (currentStep.value === 2) {
    try {
      await formStep3.value.validate()
      currentStep.value++
    } catch (e) {
      ElMessage.warning('请完善目标选择')
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const buildSelector = () => {
  const selector = {}

  if (targetMode.value === 'label' && formData.spec.labelSelectorsStr) {
    const pairs = formData.spec.labelSelectorsStr.split(',').filter(p => p.trim())
    const labelSelectors = {}
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim())
      if (key && value) {
        labelSelectors[key] = value
      }
    })
    selector.labelSelectors = labelSelectors
  }

  if (targetMode.value === 'pod' && formData.spec.podsStr) {
    const entries = formData.spec.podsStr.split(';').filter(e => e.trim())
    const pods = {}
    entries.forEach(entry => {
      const [ns, podNames] = entry.split(':').map(s => s.trim())
      if (ns && podNames) {
        pods[ns] = podNames.split(',').map(p => p.trim()).filter(p => p)
      }
    })
    selector.pods = pods
  }

  return selector
}

const buildLabels = () => {
  if (!formData.labelsStr) return {}
  
  const labels = {}
  const pairs = formData.labelsStr.split(',').filter(p => p.trim())
  pairs.forEach(pair => {
    const [key, value] = pair.split('=').map(s => s.trim())
    if (key && value) {
      labels[key] = value
    }
  })
  return labels
}

const buildSpec = () => {
  const spec = {
    selector: buildSelector(),
    mode: formData.spec.mode,
    value: formData.spec.value
  }

  if (formData.faultType === 'PodChaos') {
    spec.action = formData.spec.action
    spec.containerName = formData.spec.containerName
    spec.gracePeriod = formData.spec.gracePeriod
  } else if (formData.faultType === 'NetworkChaos') {
    spec.action = formData.spec.action
    spec.direction = formData.spec.direction
    if (formData.spec.action === 'delay') {
      spec.delay = {
        latency: formData.spec.delayLatency,
        jitter: formData.spec.delayJitter
      }
    }
    if (formData.spec.action === 'loss') {
      spec.loss = {
        loss: formData.spec.lossLoss
      }
    }
  } else if (formData.faultType === 'IOChaos') {
    spec.action = formData.spec.action
    spec.percent = formData.spec.percent
    spec.path = formData.spec.path
    spec.methods = formData.spec.methods
  } else if (formData.faultType === 'StressChaos') {
    spec.workers = formData.spec.workers
    if (formData.spec.cpuLoad > 0) {
      spec.cpu = {
        load: formData.spec.cpuLoad,
        workers: formData.spec.cpuWorkers
      }
    }
    if (formData.spec.memorySize) {
      spec.memory = {
        size: formData.spec.memorySize,
        workers: formData.spec.memoryWorkers
      }
    }
  }

  return spec
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    const instanceId = getSelectedInstanceId()
    
    const request = {
      name: formData.name,
      namespace: formData.namespace,
      faultType: formData.faultType,
      duration: formData.duration,
      labels: buildLabels(),
      spec: buildSpec()
    }

    await createChaosExperiment(formData.namespace, request, instanceId)
    ElMessage.success('实验创建成功')
    router.push('/chaos')
  } catch (e) {
    ElMessage.error('实验创建失败: ' + (e.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  router.push('/chaos')
}

onMounted(() => {
  fetchNamespaces()
})
</script>

<style scoped>
.chaos-create-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
}

.chaos-wizard-container {
  max-width: 900px;
  margin: 0 auto;
}

.wizard-step {
  margin-top: 30px;
  padding: 20px;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 30px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
</style>
