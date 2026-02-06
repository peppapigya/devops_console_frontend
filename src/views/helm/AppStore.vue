<template>
  <div class="helm-app-store">
    <el-card class="page-header-card cyber-card">
      <div class="page-header cyber-header">
        <div>
          <h2>Helm 应用商店</h2>
          <p>浏览和安装 Helm Charts</p>
        </div>
        <div class="header-actions">
          <el-select v-model="selectedRepo" placeholder="选择仓库" @change="fetchCharts" style="width: 200px; margin-right: 12px;" class="cyber-select">
            <el-option label="全部仓库" :value="0" />
            <el-option
              v-for="repo in repoList"
              :key="repo.id"
              :label="repo.name"
              :value="repo.id"
            />
          </el-select>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索应用..."
            style="width: 300px;"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </el-card>

    <el-card class="content-card cyber-card">
      <div v-loading="loading" class="charts-container">
        <div v-if="chartList.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无应用">
            <el-button type="primary" @click="$router.push('/helm/repos')">前往添加仓库</el-button>
          </el-empty>
        </div>

        <div v-else class="charts-grid">
          <div
            v-for="chart in chartList"
            :key="chart.id"
            class="chart-card"
            @click="handleChartClick(chart)"
          >
            <div class="chart-icon">
              <img v-if="chart.icon" :src="chart.icon" :alt="chart.name" @error="handleImageError" />
              <el-icon v-else class="default-icon"><Box /></el-icon>
            </div>
            <div class="chart-info">
              <h3 class="chart-name">{{ chart.name }}</h3>
              <p class="chart-description">{{ chart.description || '暂无描述' }}</p>
              <div class="chart-meta">
                <el-tag size="small" effect="plain">{{ chart.repo_name }}</el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="total > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[12, 24, 48, 96]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="fetchCharts"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 安装对话框 -->
    <el-dialog
      v-model="showInstallDialog"
      title="安装 Helm Chart"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="installForm" ref="installFormRef" label-width="120px" @submit.prevent>
        <el-form-item label="Release 名称" prop="release_name" required>
          <el-input v-model="installForm.release_name" placeholder="例如：my-app" />
        </el-form-item>
        <el-form-item label="命名空间" prop="namespace" required>
          <el-input v-model="installForm.namespace" placeholder="default" />
        </el-form-item>
        <el-form-item label="Chart 版本">
          <el-select v-model="installForm.chart_version" placeholder="选择版本" style="width: 100%;">
            <el-option
              v-for="version in chartVersions"
              :key="version.version"
              :label="`${version.version} (App: ${version.app_version || 'N/A'})`"
              :value="version.version"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="自定义 Values">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
            <el-button size="small" @click="loadDefaultValues">加载官方示例</el-button>
          </div>
          <el-input
            v-model="customValues"
            type="textarea"
            :rows="10"
            placeholder='输入 YAML 格式的 values，例如：&#10;service:&#10;  type: LoadBalancer&#10;  port: 80&#10;&#10;replicaCount: 2'
            class="values-textarea"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showInstallDialog = false">取消</el-button>
          <el-button type="primary" @click="handleInstall" :loading="installing">安装</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Box } from '@element-plus/icons-vue'
import { getHelmRepos } from '@/api/helm'
import { getHelmCharts, getChartVersions, installHelmChart } from '@/api/helm'
import { getSelectedInstanceId } from '@/stores/instanceStore'

import { getChartDefaultValues } from '@/api/helm'

const loading = ref(false)
const installing = ref(false)
const repoList = ref([])
const chartList = ref([])
const chartVersions = ref([])
const selectedRepo = ref(0)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(24)
const total = ref(0)
const showInstallDialog = ref(false)
const selectedChart = ref(null)

const installForm = ref({
  release_name: '',
  namespace: 'default',
  chart_version: '',
  chart_name: '',
  repo_name: '',
  instance_id: 0
})

const customValues = ref('')

// 获取仓库列表
const fetchRepos = async () => {
  try {
    const res = await getHelmRepos()
    repoList.value = res.data.repoList || []
  } catch (error) {
    console.error(error)
  }
}

// 获取 Chart 列表
const fetchCharts = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize.value
    }
    if (selectedRepo.value) {
      params.repo_id = selectedRepo.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    const res = await getHelmCharts(params)
    chartList.value = res.data.data.chartList || []
    total.value = res.data.data.total || 0
  } catch (error) {
    console.error(error)
    ElMessage.error('获取应用列表失败')
  } finally {
    loading.value = false
  }
}

const loadDefaultValues = async () => {
  if (!selectedChart.value) {
    ElMessage.warning('未选择 Chart')
    return
  }
  
  try {
    const res = await getChartDefaultValues(
      selectedChart.value.name,
      selectedChart.value.repo_id,
      installForm.value.chart_version
    )
    customValues.value = res.data.values || ''
    ElMessage.success('已加载官方默认配置')
  } catch (error) {
    console.error(error)
    ElMessage.error('加载失败')
  }
}

// 搜索防抖
let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchCharts()
  }, 500)
}

const handleSizeChange = () => {
  currentPage.value = 1
  fetchCharts()
}

// 点击 Chart 卡片
const handleChartClick = async (chart) => {
  selectedChart.value = chart
  
  // 获取版本列表
  try {
    const res = await getChartVersions(chart.name, chart.repo_id)
    chartVersions.value = res.data.versions || []
  } catch (error) {
    console.error(error)
    chartVersions.value = []
  }

  // 初始化安装表单
  installForm.value = {
    release_name: chart.name.toLowerCase(),
    namespace: 'default',
    chart_version: chart.version,
    chart_name: chart.name,
    repo_name: chart.repo_name,
    instance_id: getSelectedInstanceId()
  }
  customValues.value = ''
  showInstallDialog.value = true
}

// 安装 Chart
const handleInstall = async () => {
  const instanceId = getSelectedInstanceId()
  if (!instanceId) {
    ElMessage.warning('请先选择K8s实例')
    return
  }

  installing.value = true
  try {
    const data = {
      ...installForm.value
    }

  
    // 直接传递 YAML 字符串给后端
    if (customValues.value.trim()) {
      data.values_yaml = customValues.value
    }

    await installHelmChart(data, instanceId)
    ElMessage.success('安装成功')
    showInstallDialog.value = false
  } catch (error) {
    console.error(error)
    ElMessage.error('安装失败')
  } finally {
    installing.value = false
  }
}

const handleImageError = (e) => {
  e.target.style.display = 'none'
}

onMounted(() => {
  fetchRepos()
  fetchCharts()
})
</script>

<style scoped>
.helm-app-store {
  padding: 20px;
  min-height: calc(100vh - 60px);
}

/* Cyber Card 样式 */
.cyber-card {
  background: linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(15, 25, 45, 0.9) 100%);
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
              0 0 20px rgba(64, 158, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.cyber-card:hover {
  border-color: rgba(64, 158, 255, 0.5);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(64, 158, 255, 0.2);
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
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-header p {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Charts Grid */
.charts-container {
  min-height: 400px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-card:hover {
  background: rgba(64, 158, 255, 0.08);
  border-color: rgba(64, 158, 255, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.chart-icon {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.chart-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.chart-icon .default-icon {
  font-size: 32px;
  color: rgba(64, 158, 255, 0.6);
}

.chart-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;  /* ← 深色文字 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-description {
  margin: 0;
  font-size: 13px;
  color: #606266;  /* ← 深灰色文字 */
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 2.8em;
}

.chart-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Empty State */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* Pagination */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

:deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-button-bg-color: rgba(255, 255, 255, 0.05);
  --el-pagination-hover-color: #409EFF;
}

:deep(.el-pagination button),
:deep(.el-pager li) {
  background: rgba(255, 255, 255, 0.05);
  color: #606266;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

:deep(.el-pagination button:hover),
:deep(.el-pager li:hover) {
  background: rgba(64, 158, 255, 0.2);
  color: #409EFF;
}

:deep(.el-pager li.is-active) {
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  color: white;
  border-color: transparent;
}
/* 对话框内输入框使用浅色文字 */
:deep(.el-dialog .el-input__inner),
:deep(.el-dialog .el-textarea__inner) {
  color: rgba(255, 255, 255, 0.9) !important;
}

:deep(.el-dialog .el-select__selected-item) {
  color: rgba(255, 255, 255, 0.9) !important;
}

/* Values 文本域等宽字体 */
.values-textarea :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

/* Dialog */
:deep(.el-dialog) {
  background: linear-gradient(135deg, rgba(10, 15, 30, 0.98) 0%, rgba(15, 25, 45, 0.95) 100%);
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

:deep(.el-dialog__title) {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: none;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  color: #303133;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  border-color: rgba(64, 158, 255, 0.5);
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  border-color: #409EFF;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.3);
}

:deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: none;
}

:deep(.el-select__selected-item) {
  color: #303133;
}

:deep(.el-select__wrapper:hover) {
  border-color: rgba(64, 158, 255, 0.5);
}
</style>
