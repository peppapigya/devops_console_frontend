<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>DevOps 控制台</h1>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon size="32"><Monitor /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalInstances || 0 }}</div>
            <div class="stat-label">总实例数</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon active">
            <el-icon size="32"><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.activeInstances || 0 }}</div>
            <div class="stat-label">活跃实例</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon error">
            <el-icon size="32"><CircleClose /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.errorInstances || 0 }}</div>
            <div class="stat-label">错误实例</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon warning">
            <el-icon size="32"><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayTests || 0 }}</div>
            <div class="stat-label">今日测试</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>实例类型分布</span>
              </div>
            </template>
            <div ref="typeChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>最近连接测试</span>
              </div>
            </template>
            <div class="test-history">
              <div v-if="recentTests.length === 0" class="empty-state">
                <el-empty description="暂无测试记录" />
              </div>
              <div v-else v-for="test in recentTests" :key="test.id" class="test-item">
                <div class="test-status">
                  <el-icon v-if="test.result === 'success'" color="#67C23A"><CircleCheck /></el-icon>
                  <el-icon v-else-if="test.result === 'warning'" color="#E6A23C"><Warning /></el-icon>
                  <el-icon v-else color="#F56C6C"><CircleClose /></el-icon>
                </div>
                <div class="test-info">
                  <div class="test-name">{{ test.instanceName || '未知实例' }}</div>
                  <div class="test-time">{{ formatTime(test.testedAt) }}</div>
                </div>
                <div class="test-response">
                  <span v-if="test.responseTime">{{ test.responseTime }}ms</span>
                  <span v-else class="error-msg">{{ test.errorMessage || '测试失败' }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 实例状态概览 -->
    <el-card class="instances-overview">
      <template #header>
        <div class="card-header">
          <span>实例状态概览</span>
          <el-button link @click="$router.push('/instances')">查看全部</el-button>
        </div>
      </template>
      <div class="instances-grid">
        <div v-if="instances.length === 0" class="empty-state">
          <el-empty description="暂无实例数据" />
        </div>
        <div v-else v-for="instance in instances" :key="instance.id" class="instance-item">
          <div class="instance-name">{{ instance.name || '未命名实例' }}</div>
          <div class="instance-status">
            <el-tag v-if="instance.status === 'active'" type="success" size="small">
              <el-icon><CircleCheck /></el-icon>
              活跃
            </el-tag>
            <el-tag v-else-if="instance.status === 'warning'" type="warning" size="small">
              <el-icon><Warning /></el-icon>
              警告
            </el-tag>
            <el-tag v-else type="danger" size="small">
              <el-icon><CircleClose /></el-icon>
              错误
            </el-tag>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import {nextTick, onMounted, ref} from 'vue'
import {ElMessage} from 'element-plus'
import {CircleCheck, CircleClose, Monitor, Refresh, Timer, Warning} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {getInstanceList, getTestHistory, getTodayTestStats} from '@/api/instance.js'
import {createRouter as $router} from "vue-router";

// 统计数据
const stats = ref({
  totalInstances: 0,
  activeInstances: 0,
  errorInstances: 0,
  todayTests: 0
})

// 最近测试记录
const recentTests = ref([])

// 实例列表
const instances = ref([])

// 图表引用
const typeChartRef = ref(null)
let typeChart = null

// 格式化时间
const formatTime = (timeStr) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 初始化类型分布图表
const initTypeChart = () => {
  if (!typeChartRef.value) return

  typeChart = echarts.init(typeChartRef.value)
  
  // 初始化时显示空数据
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 10,
      data: ['暂无数据']
    },
    series: [
      {
        name: '实例类型',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 1, name: '暂无数据', itemStyle: { color: '#e0e0e0' } }
        ]
      }
    ]
  }

  typeChart.setOption(option)
}

// 刷新数据
const refreshData = async () => {
  ElMessage.info('正在刷新数据...')
  try {
    await fetchDashboardData()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败: ' + error.message)
  }
}

// 获取仪表板数据
const fetchDashboardData = async () => {
  try {
    // 获取实例列表
    const response = await getInstanceList({ page: 1, page_size: 100 })
    const allInstances = response.data?.list?.data || []
    
    // 更新统计数据
    stats.value.totalInstances = allInstances.length
    stats.value.activeInstances = allInstances.filter(i => i.status === 'active').length
    stats.value.errorInstances = allInstances.filter(i => i.status === 'error').length
    
    // 更新实例列表 - 只显示前4个
    instances.value = allInstances.slice(0, 4)
    
    // 获取今日测试数据
    await fetchTodayTestsData()
    
    // 获取最近测试记录
    await fetchRecentTestsData()
    
    // 更新图表数据
    updateTypeChart(allInstances)
    
  } catch (error) {
    console.error('获取仪表板数据失败:', error)
    ElMessage.error('获取数据失败: ' + error.message)
    throw error
  }
}

// 获取今日测试数据
const fetchTodayTestsData = async () => {
  try {
    const response = await getTodayTestStats()
    stats.value.todayTests = response.data?.total_tests || 0
  } catch (error) {
    console.warn('获取今日测试统计失败:', error)
    stats.value.todayTests = 0
  }
}

// 获取最近测试记录
const fetchRecentTestsData = async () => {
  try {
    // 获取所有实例的最近测试记录，这里简化为获取前几个实例的测试记录
    const testPromises = instances.value.map(instance =>
      getTestHistory(instance.id, { page_size: 10 }).catch(() => ({ data: { test_list: [] } }))
    )

    const testResults = await Promise.all(testPromises)
    const allTests = []
    
    testResults.forEach((result, index) => {
      // 修正数据结构解析路径
      const testList = result.data?.tests || result.data?.test_list || []
      // 遍历所有测试记录，而不是只取第一条
      testList.forEach(test => {
        // 转换为前端需要的格式
        const formattedTest = {
          id: test.id,
          instanceName: test.instance?.name || instances.value[index]?.name || '未知实例',
          instanceId: test.instance_id,
          result: test.test_result === 'success' ? 'success' : 
                 test.test_result === 'timeout' ? 'warning' : 'error',
          responseTime: test.response_time || 0,
          errorMessage: test.error_message || '',
          testedAt: test.tested_at
        }
        allTests.push(formattedTest)
      })
    })
    
    // 按测试时间排序，最新的在前
    allTests.sort((a, b) => new Date(b.testedAt) - new Date(a.testedAt))
    recentTests.value = allTests.slice(0, 8) // 只显示前8条
    
  } catch (error) {
    console.warn('获取最近测试记录失败:', error)
    recentTests.value = []
  }
}

// 更新类型分布图表
const updateTypeChart = (allInstances) => {
  if (!typeChart) return
  
  // 统计各类型实例数量
  const typeCount = {}
  const typeColors = {
    'elasticsearch': '#1976d2',
    'kibana': '#4caf50',
    'logstash': '#ff9800',
    'filebeat': '#f44336',
    'metricbeat': '#9c27b0',
    'apm': '#795548',
    'beats': '#607d8b',
    'other': '#9e9e9e'
  }
  
  allInstances.forEach(instance => {
    // 使用正确的字段名 instance_type
    const type = instance.instance_type || 'other'
    typeCount[type] = (typeCount[type] || 0) + 1
  })
  
  // 转换为图表数据格式
  const chartData = Object.keys(typeCount).map(type => ({
    value: typeCount[type],
    name: type.charAt(0).toUpperCase() + type.slice(1),
    itemStyle: { color: typeColors[type] || typeColors.other }
  }))
  
  // 如果没有数据，显示空数据提示
  if (chartData.length === 0) {
    chartData.push({
      value: 1,
      name: '暂无数据',
      itemStyle: { color: '#e0e0e0' }
    })
  }
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 10,
      data: chartData.map(item => item.name)
    },
    series: [
      {
        name: '实例类型',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
      }
    ]
  }
  
  typeChart.setOption(option)
}

onMounted(async () => {
  await nextTick()
  initTypeChart()
  await fetchDashboardData()
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (typeChart) {
      typeChart.resize()
    }
  })
})
</script>

<style scoped>
.dashboard {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 200px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  padding: 8px 0;
}

.dashboard-header h1 {
  margin: 0;
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.stat-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-card:hover::before {
  height: 6px;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 24px;
  position: relative;
}

.stat-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  position: relative;
  transition: all 0.3s ease;
}

.stat-icon::after {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border-radius: 20px;
  background: inherit;
  opacity: 0.2;
  z-index: -1;
}

.stat-icon {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1976d2;
}

.stat-icon.active {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  color: #4caf50;
}

.stat-icon.error {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  color: #f44336;
}

.stat-icon.warning {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  color: #ff9800;
}

.stat-card:hover .stat-icon {
  transform: rotate(5deg) scale(1.1);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.charts-section {
  margin-bottom: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.chart-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  color: #1a1a1a;
}

.chart-container {
  width: 100%;
  height: 320px;
  position: relative;
}

.test-history {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 8px;
}

.test-history::-webkit-scrollbar {
  width: 6px;
}

.test-history::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.test-history::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.test-history::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.test-item {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  background-color: #fafafa;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.test-item:hover {
  background-color: #f0f0f0;
  border-color: #e0e0e0;
  transform: translateX(4px);
}

.test-item:last-child {
  margin-bottom: 0;
}

.test-status {
  margin-right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.test-info {
  flex: 1;
}

.test-name {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 14px;
}

.test-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.test-response {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.error-msg {
  color: #f56c6c;
  font-size: 12px;
  font-weight: 500;
}

.instances-overview {
  margin-bottom: 20px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.instances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.instance-item {
  padding: 20px;
  border-radius: 12px;
  background-color: #fafafa;
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
  position: relative;
  overflow: hidden;
}

.instance-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.instance-item:hover {
  background-color: #f0f0f0;
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.instance-item:hover::before {
  transform: scaleY(1);
}

.instance-name {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
  font-size: 14px;
}

.instance-status {
  display: flex;
  align-items: center;
}

.instance-status .el-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.empty-state :deep(.el-empty) {
  padding: 40px 0;
}

/* 暗色主题适配 */
:global(.dark) .dashboard {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

:global(.dark) .dashboard-header h1 {
  background: linear-gradient(135deg, #9fa8da 0%, #b39ddb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:global(.dark) .stat-card {
  background-color: var(--el-bg-color);
}

:global(.dark) .stat-value {
  color: var(--el-text-color-primary);
}

:global(.dark) .stat-label {
  color: var(--el-text-color-regular);
}

:global(.dark) .chart-card {
  background-color: var(--el-bg-color);
}

:global(.dark) .card-header {
  color: var(--el-text-color-primary);
}

:global(.dark) .test-item {
  background-color: var(--el-fill-color-light);
}

:global(.dark) .test-item:hover {
  background-color: var(--el-fill-color);
}

:global(.dark) .instance-item {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color);
}

:global(.dark) .instance-item:hover {
  background-color: var(--el-fill-color);
}

:global(.dark) .instance-name {
  color: var(--el-text-color-primary);
}
</style>