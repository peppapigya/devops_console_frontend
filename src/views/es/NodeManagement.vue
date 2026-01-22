<template>
  <div class="node-management">
    <div class="page-header">
      <h2>节点管理</h2>
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索节点名称"
          style="width: 300px; margin-right: 10px"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        
      </div>
    </div>

    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon color="#409EFF"><Connection /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalNodes }}</div>
                <div class="stat-label">总节点数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon color="#67C23A"><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.activeNodes }}</div>
                <div class="stat-label">活跃节点</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon color="#E6A23C"><Warning /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.warningNodes }}</div>
                <div class="stat-label">警告节点</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon color="#F56C6C"><CircleClose /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.failedNodes }}</div>
                <div class="stat-label">故障节点</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-card class="table-card">
      <el-table
        :data="filteredNodes"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="节点名称" min-width="180">
          <template #default="{ row }">
            <div class="node-name">
              <div>
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
                <span style="margin-left: 10px">{{ row.name }}</span>
              </div>
              <div class="status-reason" v-if="row.statusReason && row.statusReason !== '运行正常'">
                <el-tooltip :content="row.statusReason" placement="top">
                  <span class="reason-text">{{ row.statusReason }}</span>
                </el-tooltip>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP地址" width="180" align="right" />
        <el-table-column prop="port" label="端口" width="140" align="right" />
        <el-table-column prop="version" label="版本" width="160" align="right" />
        <el-table-column prop="cpuUsage" label="CPU使用率" width="130" align="right">
          <template #default="{ row }">
            <div class="usage-column">
              <el-progress
                :percentage="row.cpuUsage"
                :color="getProgressColor(row.cpuUsage)"
                :stroke-width="6"
              />
              <div class="usage-detail" v-if="row.loadAverage">
                负载: {{ row.loadAverage.toFixed(2) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="memoryUsage" label="内存使用率" width="130" align="right">
          <template #default="{ row }">
            <div class="usage-column">
              <el-progress
                :percentage="row.memoryUsage"
                :color="getProgressColor(row.memoryUsage)"
                :stroke-width="6"
              />
              <div class="usage-detail" v-if="row.totalMemory">
                {{ formatBytes(row.totalMemory - row.availableMemory) }}/{{ formatBytes(row.totalMemory) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="diskUsage" label="磁盘使用率" width="130" align="right">
          <template #default="{ row }">
            <div class="usage-column">
              <el-progress
                :percentage="row.diskUsage"
                :color="getProgressColor(row.diskUsage)"
                :stroke-width="6"
              />
              <div class="usage-detail" v-if="row.totalDisk">
                {{ formatBytes(row.totalDisk - row.availableDisk) }}/{{ formatBytes(row.totalDisk) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="loadAverage" label="系统负载" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.loadAverage">{{ row.loadAverage.toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastHeartbeat" label="最后心跳" width="160" align="right">
          <template #default="{ row }">
            {{ formatTime(row.lastHeartbeat) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              @click="viewDetails(row)"
            >
              详情
            </el-button>
            <el-button
              type="warning"
              size="small"
              link
              @click="restartNodeHandler(row)"
              :disabled="row.status === '离线'"
            >
              重启
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="removeNode(row)"
            >
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 节点详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="节点详情"
      width="80%"
    >
      <div v-if="currentNode" class="node-details">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="节点名称">{{ currentNode.name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <div>
                  <el-tag :type="getStatusType(currentNode.status)">{{ currentNode.status || '未知' }}</el-tag>
                  <div v-if="currentNode.statusReason && currentNode.statusReason !== '运行正常'" class="status-reason-detail">
                    {{ currentNode.statusReason }}
                  </div>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="节点ID">{{ currentNode.id || '-' }}</el-descriptions-item>
              <el-descriptions-item label="主机名">{{ currentNode.host || currentNode.ip || '-' }}</el-descriptions-item>
              <el-descriptions-item label="传输地址">{{ currentNode.transportAddress || '-' }}</el-descriptions-item>
              <el-descriptions-item label="HTTP地址">{{ currentNode.httpAddress || '-' }}</el-descriptions-item>
              <el-descriptions-item label="版本">{{ currentNode.version || '-' }}</el-descriptions-item>
              <el-descriptions-item label="角色">
                <div v-if="currentNode.roles && currentNode.roles.length > 0">
                  <el-tag v-for="role in currentNode.roles" :key="role" size="small" style="margin-right: 5px">
                    {{ role }}
                  </el-tag>
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="构建信息">
                <span v-if="currentNode.build && currentNode.build.hash">
                  {{ currentNode.build.hash.substring(0, 7) }} ({{ currentNode.build.date || '未知日期' }})
                </span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="运行时长">{{ formatDuration(Date.now() - currentNode.startTime) }}</el-descriptions-item>
              <el-descriptions-item label="启动时间">{{ formatTime(currentNode.startTime) }}</el-descriptions-item>
              <el-descriptions-item label="最后心跳">{{ formatTime(currentNode.lastHeartbeat) }}</el-descriptions-item>
              <el-descriptions-item label="节点属性" span="2">
                <div v-if="currentNode.attributes && Object.keys(currentNode.attributes).length > 0">
                  <el-tag v-for="(value, key) in currentNode.attributes" :key="key" size="small" style="margin-right: 5px">
                    {{ key }}: {{ value }}
                  </el-tag>
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <!-- 系统信息 -->
          <el-tab-pane label="系统信息" name="system">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="CPU核心数">{{ currentNode.cpuCores || '-' }}</el-descriptions-item>
              <el-descriptions-item label="CPU使用率">
                <el-progress :percentage="currentNode.cpuUsage || 0" :color="getProgressColor(currentNode.cpuUsage || 0)" :stroke-width="6" />
              </el-descriptions-item>
              <el-descriptions-item label="系统负载">
                <div v-if="currentNode.stats && currentNode.stats.os && currentNode.stats.os.cpu && currentNode.stats.os.cpu.load_average">
                  1分钟: {{ currentNode.stats.os.cpu.load_average['1m'] || '-' }}<br/>
                  5分钟: {{ currentNode.stats.os.cpu.load_average['5m'] || '-' }}<br/>
                  15分钟: {{ currentNode.stats.os.cpu.load_average['15m'] || '-' }}
                </div>
                <div v-else-if="currentNode.os && currentNode.os.cpu && currentNode.os.cpu.load_average">
                  1分钟: {{ currentNode.os.cpu.load_average['1m'] || '-' }}<br/>
                  5分钟: {{ currentNode.os.cpu.load_average['5m'] || '-' }}<br/>
                  15分钟: {{ currentNode.os.cpu.load_average['15m'] || '-' }}
                </div>
                <span v-else>{{ currentNode.loadAverage ? currentNode.loadAverage.toFixed(2) : '-' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="负载/CPU核心">
                {{ currentNode.loadAverage && currentNode.cpuCores ? (currentNode.loadAverage / currentNode.cpuCores).toFixed(2) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="总内存">{{ formatBytes(currentNode.totalMemory || (currentNode.os && currentNode.os.mem && currentNode.os.mem.total_in_bytes) || (currentNode.stats && currentNode.stats.os && currentNode.stats.os.mem && currentNode.stats.os.mem.total_in_bytes)) }}</el-descriptions-item>
              <el-descriptions-item label="可用内存">{{ formatBytes(currentNode.availableMemory || (currentNode.os && currentNode.os.mem && currentNode.os.mem.free_in_bytes) || (currentNode.stats && currentNode.stats.os && currentNode.stats.os.mem && currentNode.stats.os.mem.free_in_bytes)) }}</el-descriptions-item>
              <el-descriptions-item label="内存使用率">
                <el-progress :percentage="currentNode.memoryUsage || 0" :color="getProgressColor(currentNode.memoryUsage || 0)" :stroke-width="6" />
              </el-descriptions-item>
              <el-descriptions-item label="已用内存">
                {{ (currentNode.totalMemory && currentNode.availableMemory) ? formatBytes(currentNode.totalMemory - currentNode.availableMemory) : 
                   (currentNode.os && currentNode.os.mem) ? formatBytes(currentNode.os.mem.total_in_bytes - currentNode.os.mem.free_in_bytes) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="总磁盘">{{ formatBytes(currentNode.totalDisk || (currentNode.fs && currentNode.fs.total && currentNode.fs.total.total_in_bytes)) }}</el-descriptions-item>
              <el-descriptions-item label="可用磁盘">{{ formatBytes(currentNode.availableDisk || (currentNode.fs && currentNode.fs.total && currentNode.fs.total.available_in_bytes)) }}</el-descriptions-item>
              <el-descriptions-item label="磁盘使用率">
                <el-progress :percentage="currentNode.diskUsage || 0" :color="getProgressColor(currentNode.diskUsage || 0)" :stroke-width="6" />
              </el-descriptions-item>
              <el-descriptions-item label="已用磁盘">
                {{ (currentNode.totalDisk && currentNode.availableDisk) ? formatBytes(currentNode.totalDisk - currentNode.availableDisk) : 
                   (currentNode.fs && currentNode.fs.total) ? formatBytes(currentNode.fs.total.total_in_bytes - currentNode.fs.total.available_in_bytes) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="操作系统" span="2">
                <span v-if="currentNode.osName || (currentNode.os && currentNode.os.name)">
                  {{ currentNode.osName || currentNode.os.name }} {{ currentNode.osVersion || currentNode.os.version || '' }} ({{ currentNode.osArch || currentNode.os.arch || '未知' }})
                </span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="交换分区" span="2" v-if="(currentNode.os && currentNode.os.swap) || (currentNode.stats && currentNode.stats.os && currentNode.stats.os.swap)">
                <span v-if="currentNode.stats && currentNode.stats.os && currentNode.stats.os.swap">
                  {{ formatBytes(currentNode.stats.os.swap.used_in_bytes) }} / {{ formatBytes(currentNode.stats.os.swap.total_in_bytes) }} 
                  ({{ currentNode.stats.os.swap.total_in_bytes ? Math.round((currentNode.stats.os.swap.used_in_bytes / currentNode.stats.os.swap.total_in_bytes) * 100) : 0 }}%)
                </span>
                <span v-else-if="currentNode.os && currentNode.os.swap">
                  {{ formatBytes(currentNode.os.swap.used_in_bytes) }} / {{ formatBytes(currentNode.os.swap.total_in_bytes) }} 
                  ({{ currentNode.os.swap.total_in_bytes ? Math.round((currentNode.os.swap.used_in_bytes / currentNode.os.swap.total_in_bytes) * 100) : 0 }}%)
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="系统运行时间" span="2">
                <span v-if="currentNode.systemUptime || (currentNode.os && currentNode.os.uptime_in_millis)">
                  {{ formatDuration(currentNode.systemUptime || currentNode.os.uptime_in_millis) }}
                </span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="系统时区" span="2">
                <span v-if="currentNode.systemTimezone || (currentNode.os && currentNode.os.timezone)">
                  {{ currentNode.systemTimezone || currentNode.os.timezone }}
                </span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="系统时间" span="2">
                <span v-if="currentNode.systemTimestamp || (currentNode.os && currentNode.os.timestamp)">
                  {{ formatTime(currentNode.systemTimestamp || currentNode.os.timestamp) }}
                </span>
                <span v-else>{{ formatTime(Date.now()) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="进程ID" span="2" v-if="currentNode.process && currentNode.process.id">
                {{ currentNode.process.id }}
              </el-descriptions-item>
              <el-descriptions-item label="进程CPU" span="2" v-if="(currentNode.process && currentNode.process.cpu) || (currentNode.stats && currentNode.stats.process && currentNode.stats.process.cpu)">
                <span v-if="currentNode.stats && currentNode.stats.process && currentNode.stats.process.cpu">
                  总CPU时间: {{ formatDuration(currentNode.stats.process.cpu.total_in_millis || 0) }}<br/>
                  CPU使用率: {{ currentNode.stats.process.cpu.percent || 0 }}%
                </span>
                <span v-else-if="currentNode.process && currentNode.process.cpu">
                  总CPU时间: {{ formatDuration(currentNode.process.cpu.total_in_millis || 0) }}<br/>
                  CPU使用率: {{ currentNode.process.cpu.percent || 0 }}%
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="进程内存" span="2" v-if="(currentNode.process && currentNode.process.mem) || (currentNode.stats && currentNode.stats.process && currentNode.stats.process.mem)">
                <span v-if="currentNode.stats && currentNode.stats.process && currentNode.stats.process.mem">
                  虚拟内存: {{ formatBytes(currentNode.stats.process.mem.total_virtual_in_bytes || 0) }}
                </span>
                <span v-else-if="currentNode.process && currentNode.process.mem">
                  虚拟内存: {{ formatBytes(currentNode.process.mem.total_virtual_in_bytes || 0) }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="文件描述符" span="2" v-if="currentNode.process || (currentNode.stats && currentNode.stats.process)">
                <span v-if="currentNode.stats && currentNode.stats.process">
                  已打开: {{ currentNode.stats.process.open_file_descriptors || 0 }} / 限制: {{ currentNode.stats.process.max_file_descriptors || '未知' }}
                </span>
                <span v-else-if="currentNode.process">
                  已打开: {{ currentNode.process.open_file_descriptors || 0 }} / 限制: {{ currentNode.process.max_file_descriptors || '未知' }}
                </span>
              </el-descriptions-item>
            </el-descriptions>
            
            <!-- Cgroup信息 -->
            <el-divider content-position="left">Cgroup 控制组信息</el-divider>
            <el-descriptions :column="2" border v-if="(currentNode.os && currentNode.os.cgroup) || (currentNode.stats && currentNode.stats.os && currentNode.stats.os.cgroup)">
              <el-descriptions-item label="CPU控制组" span="2">
                <div v-if="currentNode.stats && currentNode.stats.os && currentNode.stats.os.cgroup && currentNode.stats.os.cgroup.cpu">
                  控制组: {{ currentNode.stats.os.cgroup.cpu.control_group || '-' }}<br/>
                  配额: {{ currentNode.stats.os.cgroup.cpu.cfs_quota_micros === -1 ? '无限制' : currentNode.stats.os.cgroup.cpu.cfs_quota_micros + 'μs' }}<br/>
                  周期: {{ currentNode.stats.os.cgroup.cpu.cfs_period_micros + 'μs' }}<br/>
                  <div v-if="currentNode.stats.os.cgroup.cpu.stat">
                    限制次数: {{ currentNode.stats.os.cgroup.cpu.stat.number_of_times_throttled || 0 }}<br/>
                    限制时间: {{ formatDuration(currentNode.stats.os.cgroup.cpu.stat.time_throttled_nanos / 1000000) }}
                  </div>
                </div>
                <div v-else-if="currentNode.os && currentNode.os.cgroup && currentNode.os.cgroup.cpu">
                  控制组: {{ currentNode.os.cgroup.cpu.control_group || '-' }}<br/>
                  配额: {{ currentNode.os.cgroup.cpu.cfs_quota_micros === -1 ? '无限制' : currentNode.os.cgroup.cpu.cfs_quota_micros + 'μs' }}<br/>
                  周期: {{ currentNode.os.cgroup.cpu.cfs_period_micros + 'μs' }}<br/>
                  <div v-if="currentNode.os.cgroup.cpu.stat">
                    限制次数: {{ currentNode.os.cgroup.cpu.stat.number_of_times_throttled || 0 }}<br/>
                    限制时间: {{ formatDuration(currentNode.os.cgroup.cpu.stat.time_throttled_nanos / 1000000) }}
                  </div>
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="内存控制组" span="2">
                <div v-if="currentNode.stats && currentNode.stats.os && currentNode.stats.os.cgroup && currentNode.stats.os.cgroup.memory">
                  控制组: {{ currentNode.stats.os.cgroup.memory.control_group || '-' }}<br/>
                  限制: {{ currentNode.stats.os.cgroup.memory.limit_in_bytes === 'max' ? '无限制' : formatBytes(parseInt(currentNode.stats.os.cgroup.memory.limit_in_bytes)) }}<br/>
                  已使用: {{ formatBytes(parseInt(currentNode.stats.os.cgroup.memory.usage_in_bytes)) }}
                </div>
                <div v-else-if="currentNode.os && currentNode.os.cgroup && currentNode.os.cgroup.memory">
                  控制组: {{ currentNode.os.cgroup.memory.control_group || '-' }}<br/>
                  限制: {{ currentNode.os.cgroup.memory.limit_in_bytes === 'max' ? '无限制' : formatBytes(parseInt(currentNode.os.cgroup.memory.limit_in_bytes)) }}<br/>
                  已使用: {{ formatBytes(parseInt(currentNode.os.cgroup.memory.usage_in_bytes)) }}
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="CPU统计" span="2" v-if="(currentNode.os && currentNode.os.cgroup && currentNode.os.cgroup.cpuacct) || (currentNode.stats && currentNode.stats.os && currentNode.stats.os.cgroup && currentNode.stats.os.cgroup.cpuacct)">
                <span v-if="currentNode.stats && currentNode.stats.os && currentNode.stats.os.cgroup && currentNode.stats.os.cgroup.cpuacct">
                  总使用时间: {{ formatDuration((currentNode.stats.os.cgroup.cpuacct.usage_nanos || 0) / 1000000) }}
                </span>
                <span v-else-if="currentNode.os && currentNode.os.cgroup && currentNode.os.cgroup.cpuacct">
                  总使用时间: {{ formatDuration((currentNode.os.cgroup.cpuacct.usage_nanos || 0) / 1000000) }}
                </span>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <!-- JVM信息 -->
          <el-tab-pane label="JVM信息" name="jvm">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="JVM版本">
                <span v-if="currentNode.jvm && currentNode.jvm.version">
                  {{ currentNode.jvm.version }}
                </span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="JVM供应商">
                <span v-if="currentNode.jvm && currentNode.jvm.vm_vendor">
                  {{ currentNode.jvm.vm_vendor }}
                </span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="JVM启动时间" v-if="(currentNode.jvm && currentNode.jvm.timestamp) || (currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.timestamp)">
                {{ formatTime((currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.timestamp ? currentNode.stats.jvm.timestamp : currentNode.jvm.timestamp) - (currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.uptime_in_millis ? currentNode.stats.jvm.uptime_in_millis : currentNode.jvm.uptime_in_millis)) }}
              </el-descriptions-item>
              <el-descriptions-item label="JVM运行时长" v-if="(currentNode.jvm && currentNode.jvm.uptime_in_millis) || (currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.uptime_in_millis)">
                {{ formatDuration(currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.uptime_in_millis ? currentNode.stats.jvm.uptime_in_millis : currentNode.jvm.uptime_in_millis) }}
              </el-descriptions-item>
              <el-descriptions-item label="堆内存使用" span="2">
                <div v-if="(currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.mem) || (currentNode.jvm && currentNode.jvm.mem)">
                  <el-progress 
                    :percentage="(currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.mem && currentNode.stats.jvm.mem.heap_used_percent) || (currentNode.jvm && currentNode.jvm.mem && currentNode.jvm.mem.heap_used_percent) || 0" 
                    :color="getProgressColor((currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.mem && currentNode.stats.jvm.mem.heap_used_percent) || (currentNode.jvm && currentNode.jvm.mem && currentNode.jvm.mem.heap_used_percent) || 0)" 
                    :stroke-width="6" 
                    style="margin-bottom: 8px"
                  />
                  <div>
                    {{ formatBytes((currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.mem && currentNode.stats.jvm.mem.heap_used_in_bytes) || (currentNode.jvm && currentNode.jvm.mem && currentNode.jvm.mem.heap_used_in_bytes) || 0) }} / 
                    {{ formatBytes((currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.mem && currentNode.stats.jvm.mem.heap_max_in_bytes) || (currentNode.jvm && currentNode.jvm.mem && currentNode.jvm.mem.heap_max_in_bytes) || 0) }}
                    ({{ (currentNode.stats && currentNode.stats.jvm && currentNode.stats.jvm.mem && currentNode.stats.jvm.mem.heap_used_percent) || (currentNode.jvm && currentNode.jvm.mem && currentNode.jvm.mem.heap_used_percent) || 0 }}%)
                  </div>
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="非堆内存使用" span="2">
                <div v-if="currentNode.jvm && currentNode.jvm.mem">
                  {{ formatBytes(currentNode.jvm.mem.non_heap_used_in_bytes) }} / 
                  {{ formatBytes(currentNode.jvm.mem.non_heap_committed_in_bytes) }}
                  (已提交: {{ formatBytes(currentNode.jvm.mem.non_heap_committed_in_bytes) }})
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="线程数" span="2" v-if="currentNode.jvm && currentNode.jvm.threads">
                当前: {{ currentNode.jvm.threads.count || 0 }} / 峰值: {{ currentNode.jvm.threads.peak_count || 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="类加载" span="2" v-if="currentNode.jvm && currentNode.jvm.classes">
                已加载: {{ currentNode.jvm.classes.current_loaded_count || 0 }}<br/>
                总加载: {{ currentNode.jvm.classes.total_loaded_count || 0 }}<br/>
                已卸载: {{ currentNode.jvm.classes.total_unloaded_count || 0 }}
              </el-descriptions-item>
            </el-descriptions>
            
            <!-- JVM内存池详情 -->
            <el-divider content-position="left">JVM内存池详情</el-divider>
            <el-table :data="getJVMMemoryPools()" stripe v-if="currentNode.jvm && currentNode.jvm.mem && currentNode.jvm.mem.pools">
              <el-table-column prop="name" label="内存池" width="150">
                <template #default="{ row }">
                  {{ getPoolDisplayName(row.name) }}
                </template>
              </el-table-column>
              <el-table-column prop="used" label="已使用" width="120">
                <template #default="{ row }">
                  {{ formatBytes(row.used_in_bytes) }}
                </template>
              </el-table-column>
              <el-table-column prop="peak" label="峰值" width="120">
                <template #default="{ row }">
                  {{ formatBytes(row.peak_used_in_bytes) }}
                </template>
              </el-table-column>
              <el-table-column prop="max" label="最大值" width="120">
                <template #default="{ row }">
                  {{ formatBytes(row.max_in_bytes) }}
                </template>
              </el-table-column>
              <el-table-column label="使用率" width="150">
                <template #default="{ row }">
                  <el-progress 
                    :percentage="row.max_in_bytes ? Math.round((row.used_in_bytes / row.max_in_bytes) * 100) : 0" 
                    :color="getProgressColor(row.max_in_bytes ? Math.round((row.used_in_bytes / row.max_in_bytes) * 100) : 0)" 
                    :stroke-width="6" 
                  />
                </template>
              </el-table-column>
            </el-table>
            
            <!-- JVM缓冲池 -->
            <el-divider content-position="left">JVM缓冲池</el-divider>
            <el-table :data="getJVMBufferPools()" stripe v-if="currentNode.jvm && currentNode.jvm.buffer_pools">
              <el-table-column prop="name" label="缓冲池" width="150" />
              <el-table-column prop="count" label="数量" width="100" />
              <el-table-column prop="used" label="已使用" width="120">
                <template #default="{ row }">
                  {{ formatBytes(row.used_in_bytes) }}
                </template>
              </el-table-column>
              <el-table-column prop="capacity" label="容量" width="120">
                <template #default="{ row }">
                  {{ formatBytes(row.total_capacity_in_bytes) }}
                </template>
              </el-table-column>
            </el-table>
            
            <!-- GC收集器详情 -->
            <el-divider content-position="left">GC收集器详情</el-divider>
            <el-row :gutter="20" style="margin-bottom: 20px" v-if="currentNode.jvm && currentNode.jvm.gc && currentNode.jvm.gc.collectors">
              <el-col :span="8" v-for="(collector, name) in currentNode.jvm.gc.collectors" :key="name">
                <el-card class="gc-card">
                  <template #header>
                    <div class="gc-header">
                      <span>{{ name }}</span>
                      <el-tag :type="getGCStatusType(collector)" size="small">
                        {{ getGCStatus(collector) }}
                      </el-tag>
                    </div>
                  </template>
                  <div class="gc-stats">
                    <div class="gc-stat">
                      <div class="stat-value">{{ (collector.collection_count || 0).toLocaleString() }}</div>
                      <div class="stat-label">收集次数</div>
                    </div>
                    <div class="gc-stat">
                      <div class="stat-value">{{ formatDuration(collector.collection_time_in_millis || 0) }}</div>
                      <div class="stat-label">总耗时</div>
                    </div>
                    <div class="gc-stat">
                      <div class="stat-value">
                        {{ collector.collection_count > 0 ? Math.round((collector.collection_time_in_millis || 0) / collector.collection_count) + 'ms' : '-' }}
                      </div>
                      <div class="stat-label">平均耗时</div>
                    </div>
                  </div>
                  <div class="gc-chart">
                    <el-progress 
                      :percentage="getGCUtilization(collector)" 
                      :color="getProgressColor(getGCUtilization(collector))" 
                      :stroke-width="8"
                      :format="() => `${getGCUtilization(collector)}%`"
                    />
                    <div class="chart-label">GC时间占比</div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
            
            <el-table :data="getGCCollectors()" stripe v-if="currentNode.jvm && currentNode.jvm.gc && currentNode.jvm.gc.collectors">
              <el-table-column prop="name" label="收集器" width="200" />
              <el-table-column prop="collectionCount" label="收集次数" width="120">
                <template #default="{ row }">
                  {{ (row.collection_count || 0).toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="collectionTime" label="总耗时" width="150">
                <template #default="{ row }">
                  {{ formatDuration(row.collection_time_in_millis || 0) }}
                </template>
              </el-table-column>
              <el-table-column label="平均耗时" width="150">
                <template #default="{ row }">
                  {{ row.collection_count > 0 ? Math.round((row.collection_time_in_millis || 0) / row.collection_count) + 'ms' : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="GC频率" width="120">
                <template #default="{ row }">
                  {{ getGCFrequency(row) }}
                </template>
              </el-table-column>
              <el-table-column label="最近GC" width="150">
                <template #default="{ row }">
                  {{ getLastGCTime(row) }}
                </template>
              </el-table-column>
            </el-table>
            
            <!-- JVM参数 -->
            <el-divider content-position="left">JVM参数</el-divider>
            <div v-if="currentNode.jvm && currentNode.jvm.input_arguments && currentNode.jvm.input_arguments.length > 0" style="max-height: 200px; overflow-y: auto">
              <el-tag v-for="arg in currentNode.jvm.input_arguments" :key="arg" size="small" style="margin: 2px; display: block; width: fit-content">
                {{ arg }}
              </el-tag>
            </div>
            <div v-else>无JVM参数信息</div>
          </el-tab-pane>
          
          <!-- 网络信息 -->
          <el-tab-pane label="网络信息" name="network">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="传输地址">{{ currentNode.transportAddress || '-' }}</el-descriptions-item>
              <el-descriptions-item label="HTTP地址">{{ currentNode.httpAddress || '-' }}</el-descriptions-item>
              <el-descriptions-item label="网络连接" span="2">
                <div v-if="currentNode.network && currentNode.network.tcp">
                  <div>打开: {{ currentNode.network.tcp.active_opens || 0 }}</div>
                  <div>关闭: {{ currentNode.network.tcp.close_wait || 0 }}</div>
                  <div>重置: {{ currentNode.network.tcp.est_resets || 0 }}</div>
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="网络流量" span="2" v-if="currentNode.stats && currentNode.stats.transport">
                <div>发送: {{ formatBytes(currentNode.stats.transport.server_out || 0) }}</div>
                <div>接收: {{ formatBytes(currentNode.stats.transport.server_in || 0) }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="HTTP连接" span="2" v-if="currentNode.stats && currentNode.stats.http">
                <div>打开连接: {{ currentNode.stats.http.total_opened || 0 }}</div>
                <div>当前连接: {{ currentNode.stats.http.current_open || 0 }}</div>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <!-- 文件系统I/O -->
          <el-tab-pane label="文件系统I/O" name="filesystem" v-if="currentNode.stats && currentNode.stats.fs">
            <el-card style="margin-bottom: 20px">
              <template #header>磁盘空间使用</template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="总空间">
                  {{ formatBytes(currentNode.stats.fs.total?.total_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="可用空间">
                  {{ formatBytes(currentNode.stats.fs.total?.available_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="已用空间">
                  {{ currentNode.stats.fs.total ? formatBytes(currentNode.stats.fs.total.total_in_bytes - currentNode.stats.fs.total.available_in_bytes) : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="使用率">
                  {{ currentNode.stats.fs.total ? Math.round(((currentNode.stats.fs.total.total_in_bytes - currentNode.stats.fs.total.available_in_bytes) / currentNode.stats.fs.total.total_in_bytes) * 100) + '%' : '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
            
            <el-card style="margin-bottom: 20px" v-if="currentNode.stats.fs.data">
              <template #header>数据路径详情</template>
              <el-table :data="getFileSystemData()" stripe>
                <el-table-column prop="path" label="路径" width="300" />
                <el-table-column prop="mount" label="挂载点" width="200" />
                <el-table-column prop="type" label="文件系统" width="100" />
                <el-table-column prop="total" label="总空间" width="150">
                  <template #default="{ row }">
                    {{ formatBytes(row.total) }}
                  </template>
                </el-table-column>
                <el-table-column prop="available" label="可用空间" width="150">
                  <template #default="{ row }">
                    {{ formatBytes(row.available) }}
                  </template>
                </el-table-column>
                <el-table-column prop="free" label="空闲空间" width="150">
                  <template #default="{ row }">
                    {{ formatBytes(row.free) }}
                  </template>
                </el-table-column>
                <el-table-column label="使用率" width="120">
                  <template #default="{ row }">
                    <el-progress 
                      :percentage="row.total ? Math.round(((row.total - row.available) / row.total) * 100) : 0" 
                      :color="getProgressColor(row.total ? Math.round(((row.total - row.available) / row.total) * 100) : 0)" 
                      :stroke-width="6" 
                    />
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
            
            <el-card style="margin-bottom: 20px" v-if="currentNode.stats.fs.io_stats">
              <template #header>I/O统计</template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="总操作数">
                  {{ (currentNode.stats.fs.io_stats.total?.operations || 0).toLocaleString() }}
                </el-descriptions-item>
                <el-descriptions-item label="I/O时间">
                  {{ formatDuration(currentNode.stats.fs.io_stats.total?.io_time_in_millis || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="读取操作">
                  {{ (currentNode.stats.fs.io_stats.total?.read_operations || 0).toLocaleString() }}
                </el-descriptions-item>
                <el-descriptions-item label="写入操作">
                  {{ (currentNode.stats.fs.io_stats.total?.write_operations || 0).toLocaleString() }}
                </el-descriptions-item>
                <el-descriptions-item label="读取数据">
                  {{ formatBytes((currentNode.stats.fs.io_stats.total?.read_kilobytes || 0) * 1024) }}
                </el-descriptions-item>
                <el-descriptions-item label="写入数据">
                  {{ formatBytes((currentNode.stats.fs.io_stats.total?.write_kilobytes || 0) * 1024) }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
            
            <el-card v-if="currentNode.stats.fs.io_stats && currentNode.stats.fs.io_stats.devices">
              <template #header>设备I/O详情</template>
              <el-table :data="getIODeviceData()" stripe>
                <el-table-column prop="device" label="设备名称" width="150" />
                <el-table-column prop="operations" label="总操作数" width="120">
                  <template #default="{ row }">
                    {{ (row.operations || 0).toLocaleString() }}
                  </template>
                </el-table-column>
                <el-table-column prop="readOps" label="读取操作" width="120">
                  <template #default="{ row }">
                    {{ (row.readOps || 0).toLocaleString() }}
                  </template>
                </el-table-column>
                <el-table-column prop="writeOps" label="写入操作" width="120">
                  <template #default="{ row }">
                    {{ (row.writeOps || 0).toLocaleString() }}
                  </template>
                </el-table-column>
                <el-table-column prop="readKB" label="读取数据" width="120">
                  <template #default="{ row }">
                    {{ formatBytes((row.readKB || 0) * 1024) }}
                  </template>
                </el-table-column>
                <el-table-column prop="writeKB" label="写入数据" width="120">
                  <template #default="{ row }">
                    {{ formatBytes((row.writeKB || 0) * 1024) }}
                  </template>
                </el-table-column>
                <el-table-column prop="ioTime" label="I/O时间" width="120">
                  <template #default="{ row }">
                    {{ formatDuration(row.ioTime || 0) }}
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-tab-pane>
          
          <!-- 线程池信息 -->
          <el-tab-pane label="线程池状态" name="threadpool">
            <div v-if="currentNode.stats && currentNode.stats.thread_pool">
              <el-row :gutter="20" style="margin-bottom: 20px">
                <el-col :span="6">
                  <el-card class="thread-pool-stat">
                    <div class="stat-value">{{ getThreadPoolStats().totalPools }}</div>
                    <div class="stat-label">线程池总数</div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="thread-pool-stat">
                    <div class="stat-value">{{ getThreadPoolStats().totalThreads }}</div>
                    <div class="stat-label">总线程数</div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="thread-pool-stat">
                    <div class="stat-value">{{ getThreadPoolStats().totalActive }}</div>
                    <div class="stat-label">活跃线程</div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="thread-pool-stat">
                    <div class="stat-value">{{ getThreadPoolStats().totalRejected }}</div>
                    <div class="stat-label">拒绝任务</div>
                  </el-card>
                </el-col>
              </el-row>
              
              <el-table :data="getThreadPoolData(currentNode.stats.thread_pool)" stripe>
                <el-table-column prop="name" label="线程池名称" width="180">
                  <template #default="{ row }">
                    <div>
                      <div>{{ row.name }}</div>
                      <el-tag size="small" type="info">{{ getThreadPoolType(row.name) }}</el-tag>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="threads" label="线程数" width="100">
                  <template #default="{ row }">
                    <el-progress 
                      :percentage="row.largest > 0 ? Math.round((row.threads / row.largest) * 100) : 0" 
                      :color="getProgressColor(row.largest > 0 ? Math.round((row.threads / row.largest) * 100) : 0)" 
                      :stroke-width="6"
                      style="width: 60px"
                    />
                    <div style="margin-top: 4px">{{ row.threads }} / {{ row.largest }}</div>
                  </template>
                </el-table-column>
                <el-table-column prop="active" label="活跃线程" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.active > 0 ? 'warning' : 'success'" size="small">
                      {{ row.active }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="queue" label="队列长度" width="120">
                  <template #default="{ row }">
                    <el-tag :type="getQueueStatusType(row.queue)" size="small">
                      {{ row.queue }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="rejected" label="拒绝任务数" width="120">
                  <template #default="{ row }">
                    <el-tag :type="row.rejected > 0 ? 'danger' : 'success'" size="small">
                      {{ row.rejected }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="completed" label="完成任务数" width="120">
                  <template #default="{ row }">
                    {{ row.completed.toLocaleString() }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="{ row }">
                    <el-button type="primary" size="small" link @click="showThreadPoolDetails(row)">
                      详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div v-else class="no-plugins">无线程池信息</div>
          </el-tab-pane>
          
          <!-- 索引统计 -->
          <el-tab-pane label="索引统计" name="indices" v-if="currentNode.stats && currentNode.stats.indices">
            <el-row :gutter="20" style="margin-bottom: 20px">
              <el-col :span="6">
                <el-card class="indices-stat-card">
                  <div class="stat-value">{{ (currentNode.stats.indices.docs?.count || 0).toLocaleString() }}</div>
                  <div class="stat-label">文档总数</div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="indices-stat-card">
                  <div class="stat-value">{{ formatBytes(currentNode.stats.indices.store?.size_in_bytes || 0) }}</div>
                  <div class="stat-label">索引大小</div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="indices-stat-card">
                  <div class="stat-value">{{ currentNode.stats.indices.segments?.count || 0 }}</div>
                  <div class="stat-label">段数量</div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="indices-stat-card">
                  <div class="stat-value">{{ currentNode.stats.indices.shard_stats?.total_count || 0 }}</div>
                  <div class="stat-label">分片数量</div>
                </el-card>
              </el-col>
            </el-row>
            
            <!-- 文档统计 -->
            <el-card style="margin-bottom: 20px">
              <template #header>文档统计</template>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="文档总数">
                  {{ (currentNode.stats.indices.docs?.count || 0).toLocaleString() }}
                </el-descriptions-item>
                <el-descriptions-item label="已删除文档">
                  {{ (currentNode.stats.indices.docs?.deleted || 0).toLocaleString() }}
                </el-descriptions-item>
                <el-descriptions-item label="删除比例">
                  {{ currentNode.stats.indices.docs?.count ? 
                     Math.round((currentNode.stats.indices.docs.deleted / currentNode.stats.indices.docs.count) * 100) + '%' : '0%' }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
            
            <!-- 存储统计 -->
            <el-card style="margin-bottom: 20px">
              <template #header>存储统计</template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="索引大小">
                  {{ formatBytes(currentNode.stats.indices.store?.size_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="预留空间">
                  {{ formatBytes(currentNode.stats.indices.store?.reserved_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="数据集大小">
                  {{ formatBytes(currentNode.stats.indices.store?.total_data_set_size_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="事务日志大小">
                  {{ formatBytes(currentNode.stats.indices.translog?.size_in_bytes || 0) }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
            
            <!-- 操作统计 -->
            <el-card style="margin-bottom: 20px">
              <template #header>操作统计</template>
              <el-table :data="getIndexOperationsData()" stripe>
                <el-table-column prop="operation" label="操作类型" width="120" />
                <el-table-column prop="total" label="总次数" width="120">
                  <template #default="{ row }">
                    {{ (row.total || 0).toLocaleString() }}
                  </template>
                </el-table-column>
                <el-table-column prop="time" label="总耗时" width="150">
                  <template #default="{ row }">
                    {{ formatDuration(row.time || 0) }}
                  </template>
                </el-table-column>
                <el-table-column prop="avgTime" label="平均耗时" width="120">
                  <template #default="{ row }">
                    {{ row.total > 0 ? Math.round((row.time || 0) / row.total) + 'ms' : '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="current" label="当前操作" width="120">
                  <template #default="{ row }">
                    <el-tag :type="row.current > 0 ? 'warning' : 'success'" size="small">
                      {{ row.current || 0 }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
            
            <!-- 段统计 -->
            <el-card style="margin-bottom: 20px" v-if="currentNode.stats.indices.segments">
              <template #header>段统计</template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="段数量">
                  {{ currentNode.stats.indices.segments.count || 0 }}
                </el-descriptions-item>
                <el-descriptions-item label="段内存">
                  {{ formatBytes(currentNode.stats.indices.segments.memory_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="文档值内存">
                  {{ formatBytes(currentNode.stats.indices.segments.doc_values_memory_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="存储字段内存">
                  {{ formatBytes(currentNode.stats.indices.segments.stored_fields_memory_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="词项内存">
                  {{ formatBytes(currentNode.stats.indices.segments.terms_memory_in_bytes || 0) }}
                </el-descriptions-item>
                <el-descriptions-item label="规范内存">
                  {{ formatBytes(currentNode.stats.indices.segments.norms_memory_in_bytes || 0) }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
            
            <!-- 缓存统计 -->
            <el-card style="margin-bottom: 20px" v-if="currentNode.stats.indices.query_cache || currentNode.stats.indices.request_cache || currentNode.stats.indices.fielddata">
              <template #header>缓存统计</template>
              <el-table :data="getCacheData()" stripe>
                <el-table-column prop="name" label="缓存类型" width="150" />
                <el-table-column prop="hitCount" label="命中次数" width="120">
                  <template #default="{ row }">
                    {{ (row.hitCount || 0).toLocaleString() }}
                  </template>
                </el-table-column>
                <el-table-column prop="missCount" label="未命中次数" width="120">
                  <template #default="{ row }">
                    {{ (row.missCount || 0).toLocaleString() }}
                  </template>
                </el-table-column>
                <el-table-column prop="hitRate" label="命中率" width="120">
                  <template #default="{ row }">
                    {{ getCacheHitRate(row.hitCount, row.missCount) }}%
                  </template>
                </el-table-column>
                <el-table-column prop="memory" label="内存使用" width="150">
                  <template #default="{ row }">
                    {{ formatBytes(row.memory) }}
                  </template>
                </el-table-column>
                <el-table-column prop="evictions" label="驱逐次数" width="120">
                  <template #default="{ row }">
                    {{ (row.evictions || 0).toLocaleString() }}
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-tab-pane>
          
          <!-- 插件信息 -->
          <el-tab-pane label="插件信息" name="plugins">
            <div v-if="currentNode.plugins && currentNode.plugins.length > 0" class="plugins-list">
              <el-tag v-for="plugin in currentNode.plugins" :key="plugin.name" class="plugin-tag">
                {{ plugin.name }} ({{ plugin.version }})
              </el-tag>
            </div>
            <div v-else class="no-plugins">无插件信息</div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Connection, CircleCheck, Warning, CircleClose } from '@element-plus/icons-vue'
import { getNodeInfo, getNodeStats } from '@/api/es/node.js'
import { getSelectedInstanceId } from '@/stores/instanceStore.js'

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const detailDialogVisible = ref(false)
const currentNode = ref(null)
const activeTab = ref('basic')

// 统计数据
const stats = reactive({
  totalNodes: 0,
  activeNodes: 0,
  warningNodes: 0,
  failedNodes: 0
})

// 节点列表数据
const nodes = ref([])

// 过滤后的节点列表
const filteredNodes = computed(() => {
  if (!searchQuery.value) return nodes.value
  return nodes.value.filter(node => 
    node.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    '正常': 'success',
    '警告': 'warning',
    '故障': 'danger',
    '离线': 'info'
  }
  return statusMap[status] || 'info'
}

// 获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage < 60) return '#67C23A'
  if (percentage < 80) return '#E6A23C'
  return '#F56C6C'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

// 格式化字节
const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化持续时间
const formatDuration = (milliseconds) => {
  if (!milliseconds) return '0ms'
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// 获取线程池数据
const getThreadPoolData = (threadPool) => {
  if (!threadPool) return []
  
  return Object.keys(threadPool).map(poolName => {
    const pool = threadPool[poolName]
    return {
      name: poolName,
      threads: pool.threads || 0,
      queue: pool.queue || 0,
      active: pool.active || 0,
      rejected: pool.rejected || 0,
      completed: pool.completed || 0,
      largest: pool.largest || 0,
      type: getThreadPoolType(poolName)
    }
  })
}

// 获取线程池类型
const getThreadPoolType = (poolName) => {
  const typeMap = {
    'index': '索引',
    'search': '搜索',
    'bulk': '批量',
    'get': '查询',
    'write': '写入',
    'management': '管理',
    'refresh': '刷新',
    'listener': '监听器',
    'fetch_shard_started': '分片获取',
    'fetch_shard_store': '分片存储',
    'force_merge': '强制合并',
    'snapshot': '快照',
    'warmer': '预热',
    'flush': '刷盘',
    'search_throttled': '限流搜索'
  }
  return typeMap[poolName] || '其他'
}

// 获取JVM内存池数据
const getJVMMemoryPools = () => {
  const memPools = (currentNode.value.stats && currentNode.value.stats.jvm && currentNode.value.stats.jvm.mem && currentNode.value.stats.jvm.mem.pools) || 
                   (currentNode.value.jvm && currentNode.value.jvm.mem && currentNode.value.jvm.mem.pools)
  
  if (!memPools) {
    return []
  }
  
  return Object.keys(memPools).map(poolName => {
    const pool = memPools[poolName]
    return {
      name: poolName,
      used_in_bytes: pool.used_in_bytes || 0,
      peak_used_in_bytes: pool.peak_used_in_bytes || 0,
      max_in_bytes: pool.max_in_bytes || 0
    }
  })
}

// 获取内存池显示名称
const getPoolDisplayName = (poolName) => {
  const poolNames = {
    'old': '老年代',
    'young': '新生代',
    'survivor': '幸存区',
    'metaspace': '元空间',
    'code_cache': '代码缓存',
    'compressed_class_space': '压缩类空间'
  }
  return poolNames[poolName] || poolName
}

// 获取JVM缓冲池数据
const getJVMBufferPools = () => {
  const bufferPools = (currentNode.value.stats && currentNode.value.stats.jvm && currentNode.value.stats.jvm.buffer_pools) ||
                      (currentNode.value.jvm && currentNode.value.jvm.buffer_pools)
  
  if (!bufferPools) {
    return []
  }
  
  return Object.keys(bufferPools).map(poolName => {
    const pool = bufferPools[poolName]
    return {
      name: poolName,
      count: pool.count || 0,
      used_in_bytes: pool.used_in_bytes || 0,
      total_capacity_in_bytes: pool.total_capacity_in_bytes || 0
    }
  })
}

// 获取GC收集器数据
const getGCCollectors = () => {
  const gcCollectors = (currentNode.value.stats && currentNode.value.stats.jvm && currentNode.value.stats.jvm.gc && currentNode.value.stats.jvm.gc.collectors) ||
                      (currentNode.value.jvm && currentNode.value.jvm.gc && currentNode.value.jvm.gc.collectors)
  
  if (!gcCollectors) {
    return []
  }
  
  return Object.keys(gcCollectors).map(collectorName => {
    const collector = gcCollectors[collectorName]
    return {
      name: collectorName,
      collection_count: collector.collection_count || 0,
      collection_time_in_millis: collector.collection_time_in_millis || 0
    }
  })
}

// 获取线程池统计信息
const getThreadPoolStats = () => {
  if (!currentNode.value || !currentNode.value.stats || !currentNode.value.stats.thread_pool) {
    return {
      totalPools: 0,
      totalThreads: 0,
      totalActive: 0,
      totalRejected: 0
    }
  }
  
  const pools = Object.values(currentNode.value.stats.thread_pool)
  return {
    totalPools: pools.length,
    totalThreads: pools.reduce((sum, pool) => sum + (pool.threads || 0), 0),
    totalActive: pools.reduce((sum, pool) => sum + (pool.active || 0), 0),
    totalRejected: pools.reduce((sum, pool) => sum + (pool.rejected || 0), 0)
  }
}

// 获取队列状态类型
const getQueueStatusType = (queue) => {
  if (queue > 1000) return 'danger'
  if (queue > 100) return 'warning'
  return 'success'
}

// 显示线程池详情
const showThreadPoolDetails = (pool) => {
  ElMessage.info(`线程池 ${pool.name} 详情功能待实现`)
}

// 获取索引操作数据
const getIndexOperationsData = () => {
  if (!currentNode.value || !currentNode.value.stats || !currentNode.value.stats.indices) {
    return []
  }
  
  const indices = currentNode.value.stats.indices
  return [
    {
      operation: '索引',
      total: indices.indexing?.index_total || 0,
      time: indices.indexing?.index_time_in_millis || 0,
      current: indices.indexing?.index_current || 0
    },
    {
      operation: '删除',
      total: indices.indexing?.delete_total || 0,
      time: indices.indexing?.delete_time_in_millis || 0,
      current: indices.indexing?.delete_current || 0
    },
    {
      operation: '查询',
      total: indices.search?.query_total || 0,
      time: indices.search?.query_time_in_millis || 0,
      current: indices.search?.query_current || 0
    },
    {
      operation: '获取',
      total: indices.get?.total || 0,
      time: indices.get?.time_in_millis || 0,
      current: indices.get?.current || 0
    },
    {
      operation: '合并',
      total: indices.merges?.total || 0,
      time: indices.merges?.total_time_in_millis || 0,
      current: indices.merges?.current || 0
    },
    {
      operation: '刷新',
      total: indices.refresh?.total || 0,
      time: indices.refresh?.total_time_in_millis || 0,
      current: indices.refresh?.listeners || 0
    },
    {
      operation: '刷盘',
      total: indices.flush?.total || 0,
      time: indices.flush?.total_time_in_millis || 0,
      current: 0
    }
  ]
}

// 获取缓存数据
const getCacheData = () => {
  if (!currentNode.value || !currentNode.value.stats || !currentNode.value.stats.indices) {
    return []
  }
  
  const indices = currentNode.value.stats.indices
  const cacheData = []
  
  if (indices.query_cache) {
    cacheData.push({
      name: '查询缓存',
      hitCount: indices.query_cache.hit_count || 0,
      missCount: indices.query_cache.miss_count || 0,
      memory: indices.query_cache.memory_size_in_bytes || 0,
      evictions: indices.query_cache.evictions || 0
    })
  }
  
  if (indices.request_cache) {
    cacheData.push({
      name: '请求缓存',
      hitCount: indices.request_cache.hit_count || 0,
      missCount: indices.request_cache.miss_count || 0,
      memory: indices.request_cache.memory_size_in_bytes || 0,
      evictions: indices.request_cache.evictions || 0
    })
  }
  
  if (indices.fielddata) {
    cacheData.push({
      name: '字段数据',
      hitCount: 0,
      missCount: 0,
      memory: indices.fielddata.memory_size_in_bytes || 0,
      evictions: indices.fielddata.evictions || 0
    })
  }
  
  return cacheData
}

// 计算缓存命中率
const getCacheHitRate = (hitCount, missCount) => {
  const total = (hitCount || 0) + (missCount || 0)
  if (total === 0) return 0
  return Math.round(((hitCount || 0) / total) * 100)
}

// 获取文件系统数据
const getFileSystemData = () => {
  if (!currentNode.value || !currentNode.value.stats || !currentNode.value.stats.fs || !currentNode.value.stats.fs.data) {
    return []
  }
  
  return currentNode.value.stats.fs.data.map(fs => ({
    path: fs.path || '',
    mount: fs.mount || '',
    type: fs.type || '',
    total: fs.total_in_bytes || 0,
    available: fs.available_in_bytes || 0,
    free: fs.free_in_bytes || 0
  }))
}

// 获取I/O设备数据
const getIODeviceData = () => {
  if (!currentNode.value || !currentNode.value.stats || !currentNode.value.stats.fs || !currentNode.value.stats.fs.io_stats || !currentNode.value.stats.fs.io_stats.devices) {
    return []
  }
  
  return currentNode.value.stats.fs.io_stats.devices.map(device => ({
    device: device.device_name || '',
    operations: device.operations || 0,
    readOps: device.read_operations || 0,
    writeOps: device.write_operations || 0,
    readKB: device.read_kilobytes || 0,
    writeKB: device.write_kilobytes || 0,
    ioTime: device.io_time_in_millis || 0
  }))
}

// 获取GC状态类型
const getGCStatusType = (collector) => {
  if (!collector || !collector.collection_count) return 'info'
  if (collector.collection_count > 1000) return 'warning'
  return 'success'
}

// 获取GC状态
const getGCStatus = (collector) => {
  if (!collector || !collector.collection_count) return '未运行'
  if (collector.collection_count > 1000) return '频繁'
  return '正常'
}

// 获取GC利用率
const getGCUtilization = (collector) => {
  if (!currentNode.value || !collector || collector.collection_time_in_millis === 0) return 0
  const uptime = (currentNode.value.stats && currentNode.value.stats.jvm && currentNode.value.stats.jvm.uptime_in_millis) || 
                 (currentNode.value.jvm && currentNode.value.jvm.uptime_in_millis) || 1
  return Math.round((collector.collection_time_in_millis / uptime) * 100)
}

// 获取GC频率
const getGCFrequency = (collector) => {
  if (!currentNode.value || !currentNode.value.jvm || !collector || collector.collection_count === 0) return '0/min'
  const uptimeMinutes = (currentNode.value.jvm.uptime_in_millis || 1) / (1000 * 60)
  const gcPerMinute = collector.collection_count / uptimeMinutes
  if (gcPerMinute > 10) return `${Math.round(gcPerMinute)}/min (高)`
  if (gcPerMinute > 5) return `${Math.round(gcPerMinute)}/min (中)`
  return `${Math.round(gcPerMinute)}/min (低)`
}

// 获取最近GC时间（模拟）
const getLastGCTime = (collector) => {
  // 这里是模拟数据，实际应该根据时间戳计算
  if (!collector || !collector.collection_count) return '-'
  const minutes = Math.floor(Math.random() * 60)
  return `${minutes}分钟前`
}



// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    // 使用真实API，最多重试3次
    await loadRealDataWithRetry()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 带重试机制的数据加载
const loadRealDataWithRetry = async (maxRetries = 3) => {
  let lastError = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await loadRealData()
      return // 成功则返回
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        // 不是最后一次尝试，等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  
  // 所有重试都失败了
  throw lastError
}

// 加载真实数据
const loadRealData = async () => {
  try {
    // 获取当前选中的实例ID
    const instanceId = getSelectedInstanceId() || 1
    
    if (!instanceId) {
      throw new Error('请先选择一个Elasticsearch实例')
    }
    
    // 并行获取节点基本信息和统计信息
    const [nodeInfoResponse, nodeStatsResponse] = await Promise.allSettled([
      getNodeInfo(instanceId),
      getNodeStats(instanceId)
    ])
    
    // 检查节点信息请求结果
    if (nodeInfoResponse.status === 'rejected') {
      throw new Error(`获取节点基本信息失败: ${nodeInfoResponse.reason.message || '网络错误'}`)
    }
    
    if (nodeInfoResponse.value.status !== 200) {
      throw new Error(`获取节点信息失败: ${nodeInfoResponse.value.status} - ${nodeInfoResponse.value.message || '未知错误'}`)
    }
    
    // 统计信息请求失败时给出警告但不中断流程
    if (nodeStatsResponse.status === 'rejected') {
      console.warn('获取节点统计信息失败，将使用基本信息:', nodeStatsResponse.reason)
      ElMessage.warning('获取实时统计信息失败，显示基本信息')
      // 解析节点数据（仅使用基本信息）
      parseNodeData(nodeInfoResponse.value, null)
    } else {
      // 检查统计信息响应状态
      if (nodeStatsResponse.value.status !== 200) {
        console.warn('节点统计信息响应异常:', nodeStatsResponse.value)
        ElMessage.warning('获取实时统计信息异常，显示基本信息')
        // 解析节点数据（仅使用基本信息）
        parseNodeData(nodeInfoResponse.value, null)
      } else {
        // 解析节点数据（使用完整信息）
        parseNodeData(nodeInfoResponse.value, nodeStatsResponse.value)
      }
    }
  } catch (error) {
    console.error('数据加载错误:', error)
    throw error
  }
}

// 解析节点数据
const parseNodeData = (infoResponse, statsResponse) => {
  try {
    // 检查响应格式
    if (!infoResponse || !infoResponse.data || !infoResponse.data.raw_response) {
      throw new Error('响应数据格式不正确')
    }
    
    const rawResponse = infoResponse.data.raw_response
    const nodesData = rawResponse.nodes
    
    if (!nodesData || typeof nodesData !== 'object') {
      throw new Error('响应中缺少节点数据或格式不正确')
    }
    
    // 获取统计数据
    let statsData = null
    if (statsResponse && statsResponse.status === 200 && statsResponse.data && statsResponse.data.raw_response) {
      statsData = statsResponse.data.raw_response
    }
    
    const nodeList = Object.keys(nodesData).map(nodeId => {
      const node = nodesData[nodeId]
      if (!node) {
        console.warn(`节点 ${nodeId} 数据为空，跳过`)
        return null
      }
      
      // 解析IP地址和端口
      let ip = '未知'
      let port = '9200'
      let transportAddress = ''
      let httpAddress = ''
      
      if (node.transport_address) {
        transportAddress = node.transport_address
        // 从transport_address中提取IP和端口
        const addressParts = node.transport_address.split(':')
        ip = addressParts[0] || '未知'
        port = addressParts[1] || '9300'
      } else if (node.host) {
        ip = node.host
      }
      
      if (node.http && node.http.publish_address) {
        httpAddress = node.http.publish_address
      }
      
      // 初始化资源使用率
      let cpuUsage = 0
      let memoryUsage = 0
      let diskUsage = 0
      let heapUsage = 0
      let loadAverage = 0
      
      // 从统计数据中获取更准确的资源使用率
      if (statsData && statsData.nodes && statsData.nodes[nodeId]) {
        const nodeStats = statsData.nodes[nodeId]
        
        // CPU使用率计算
        if (nodeStats.os && nodeStats.os.cpu) {
          const cpuPercent = nodeStats.os.cpu.percent
          if (Array.isArray(cpuPercent) && cpuPercent.length > 0) {
            // 取最近几个采样点的平均值
            const recentSamples = cpuPercent.slice(-5)
            cpuUsage = Math.round(recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length)
          } else if (typeof cpuPercent === 'number') {
            cpuUsage = Math.round(cpuPercent)
          }
        }
        
        // 系统负载
        if (nodeStats.os && nodeStats.os.load_average) {
          loadAverage = nodeStats.os.load_average
        }
        
        // JVM堆内存使用率
        if (nodeStats.jvm && nodeStats.jvm.mem && nodeStats.jvm.mem.heap_used_percent !== undefined) {
          heapUsage = Math.round(nodeStats.jvm.mem.heap_used_percent)
          memoryUsage = heapUsage
        }
        
        // 磁盘使用率
        if (nodeStats.fs && nodeStats.fs.total && nodeStats.fs.total.total_in_bytes) {
          const total = nodeStats.fs.total.total_in_bytes
          const available = nodeStats.fs.total.available_in_bytes || 0
          diskUsage = total > 0 ? Math.round(((total - available) / total) * 100) : 0
        }
        
        // 从统计信息中获取系统信息（如果基本信息中没有）
        if (!node.os || !node.os.uptime_in_millis) {
          if (nodeStats.os && nodeStats.os.uptime_in_millis) {
            node.os = node.os || {}
            node.os.uptime_in_millis = nodeStats.os.uptime_in_millis
          }
        }
        
        if (!node.os || !node.os.timestamp) {
          if (nodeStats.os && nodeStats.os.timestamp) {
            node.os = node.os || {}
            node.os.timestamp = nodeStats.os.timestamp
          }
        }
        
        if (!node.os || !node.os.timezone) {
          if (nodeStats.os && nodeStats.os.timezone) {
            node.os = node.os || {}
            node.os.timezone = nodeStats.os.timezone
          }
        }
      } else {
        // 如果没有统计数据，使用基本信息计算
        if (node.jvm && node.jvm.mem) {
          const heapUsed = node.jvm.mem.heap_used_in_bytes || 0
          const heapMax = node.jvm.mem.heap_max_in_bytes || 1
          memoryUsage = Math.round((heapUsed / heapMax) * 100)
        }
        
        if (node.fs && node.fs.total) {
          const total = node.fs.total.total_in_bytes || 1
          const available = node.fs.total.available_in_bytes || 0
          diskUsage = Math.round(((total - available) / total) * 100)
        }
      }

      // 优化节点状态判断逻辑
      let status = '正常'
      let statusReason = []

      // 基于多个指标综合评估节点状态
      if (cpuUsage > 95) {
        status = '故障'
        statusReason.push('CPU使用率过高')
      } else if (cpuUsage > 85) {
        if (status !== '故障') status = '警告'
        statusReason.push('CPU使用率较高')
      }

      if (memoryUsage > 95) {
        status = '故障'
        statusReason.push('内存使用率过高')
      } else if (memoryUsage > 85) {
        if (status !== '故障') status = '警告'
        statusReason.push('内存使用率较高')
      }

      if (diskUsage > 98) {
        status = '故障'
        statusReason.push('磁盘空间不足')
      } else if (diskUsage > 90) {
        if (status !== '故障') status = '警告'
        statusReason.push('磁盘空间较少')
      }

      // 检查JVM状态
      if (node.jvm && node.jvm.mem) {
        const oldGenUsage = node.jvm.mem.old_used_in_bytes || 0
        const oldGenMax = node.jvm.mem.old_max_in_bytes || 1
        const oldGenPercent = (oldGenUsage / oldGenMax) * 100

        if (oldGenPercent > 95) {
          status = '故障'
          statusReason.push('老年代内存使用率过高')
        } else if (oldGenPercent > 85) {
          if (status !== '故障') status = '警告'
          statusReason.push('老年代内存使用率较高')
        }
      }

      // 检查线程池状态
      if (statsData && statsData.nodes && statsData.nodes[nodeId] &&
          statsData.nodes[nodeId].thread_pool) {
        const threadPools = statsData.nodes[nodeId].thread_pool
        for (const [poolName, pool] of Object.entries(threadPools)) {
          if (pool.rejected > 0) {
            status = '故障'
            statusReason.push(`${poolName}线程池有拒绝任务`)
          } else if (pool.queue > 1000) {
            if (status !== '故障') status = '警告'
            statusReason.push(`${poolName}线程池队列较长`)
          }
        }
      }

      return {
        id: isNaN(parseInt(nodeId)) ? nodeId : parseInt(nodeId),
        name: node.name || `节点-${nodeId}`,
        ip: ip,
        port: port,
        status: status,
        statusReason: statusReason.join(', ') || '运行正常',
        version: node.version || '未知',
        build: node.build || {},
        roles: node.roles || [],
        attributes: node.attributes || {},
        settings: node.settings || {},
        cpuUsage: cpuUsage,
        memoryUsage: memoryUsage,
        diskUsage: diskUsage,
        heapUsage: heapUsage,
        loadAverage: loadAverage,
        lastHeartbeat: Date.now(),
        startTime: node.jvm && node.jvm.start_time_in_millis ?
          new Date(node.jvm.start_time_in_millis).getTime() : Date.now(),
        cpuCores: node.os && node.os.available_processors ? node.os.available_processors : 0,
        totalMemory: node.os && node.os.mem && node.os.mem.total_in_bytes ? node.os.mem.total_in_bytes : 0,
        availableMemory: node.os && node.os.mem && node.os.mem.free_in_bytes ? node.os.mem.free_in_bytes : 0,
        totalDisk: node.fs && node.fs.total && node.fs.total.total_in_bytes ? node.fs.total.total_in_bytes : 0,
        availableDisk: node.fs && node.fs.total && node.fs.total.available_in_bytes ? node.fs.total.available_in_bytes : 0,
        // 添加更多系统信息
        systemUptime: node.os && node.os.uptime_in_millis ? node.os.uptime_in_millis : 0,
        systemTimezone: node.os && node.os.timezone ? node.os.timezone : '',
        systemTimestamp: node.os && node.os.timestamp ? node.os.timestamp : 0,
        osName: node.os && node.os.name ? node.os.name : '',
        osVersion: node.os && node.os.version ? node.os.version : '',
        osArch: node.os && node.os.arch ? node.os.arch : '',
        // 详细信息
        host: node.host || '',
        transportAddress: transportAddress,
        httpAddress: httpAddress,
        jvm: node.jvm || {},
        os: node.os || {},
        process: node.process || {},
        network: node.network || {},
        plugins: node.plugins || [],
        ingest: node.ingest || {},
        totalIndexingBuffer: node.total_indexing_buffer || 0,
        // 统计数据
        stats: statsData && statsData.nodes && statsData.nodes[nodeId] ? statsData.nodes[nodeId] : null
      }
    }).filter(node => node !== null) // 过滤掉null值

    if (nodeList.length === 0) {
      throw new Error('没有有效的节点数据')
    }

    nodes.value = nodeList
    updateStats()
  } catch (error) {
    ElMessage.error('解析节点数据失败：' + error.message)
    console.error('解析错误:', error, '原始数据:', infoResponse)
    // 设置空数组避免页面崩溃
    nodes.value = []
    updateStats()
    throw error // 重新抛出错误以便上层处理
  }
}

// 更新节点统计信息
const updateNodeStats = (statsData) => {
  if (statsData && statsData.nodes) {
    Object.keys(statsData.nodes).forEach(nodeId => {
      const nodeStats = statsData.nodes[nodeId]
      const node = nodes.value.find(n => n.id === parseInt(nodeId) || n.id === nodeId)
      if (node) {
        // 更新CPU使用率
        if (nodeStats.os && nodeStats.os.cpu && nodeStats.os.cpu.percent) {
          const cpuPercent = nodeStats.os.cpu.percent
          node.cpuUsage = Array.isArray(cpuPercent) ?
            (cpuPercent.length > 0 ? Math.round(cpuPercent[cpuPercent.length - 1]) : 0) :
            Math.round(cpuPercent)
        }

        // 更新系统负载
        if (nodeStats.os && nodeStats.os.load_average) {
          node.loadAverage = nodeStats.os.load_average
        }

        // 更新内存使用率 - 使用JVM堆内存使用率
        if (nodeStats.jvm && nodeStats.jvm.mem && nodeStats.jvm.mem.heap_used_percent !== undefined) {
          node.memoryUsage = Math.round(nodeStats.jvm.mem.heap_used_percent)
          node.heapUsage = node.memoryUsage
        }

        // 更新磁盘使用率
        if (nodeStats.fs && nodeStats.fs.total && nodeStats.fs.total.total_in_bytes) {
          const total = nodeStats.fs.total.total_in_bytes
          const available = nodeStats.fs.total.available_in_bytes || 0
          node.diskUsage = total > 0 ? Math.round(((total - available) / total) * 100) : 0
        }

        // 更新统计数据引用
        node.stats = nodeStats
      }
    })

    // 更新节点状态
    updateNodeStatus()
  }
}

// 更新节点状态
const updateNodeStatus = () => {
  nodes.value.forEach(node => {
    let status = '正常'
    let statusReason = []

    // 基于多个指标综合评估节点状态
    if (node.cpuUsage > 95) {
      status = '故障'
      statusReason.push('CPU使用率过高')
    } else if (node.cpuUsage > 85) {
      if (status !== '故障') status = '警告'
      statusReason.push('CPU使用率较高')
    }

    if (node.memoryUsage > 95) {
      status = '故障'
      statusReason.push('内存使用率过高')
    } else if (node.memoryUsage > 85) {
      if (status !== '故障') status = '警告'
      statusReason.push('内存使用率较高')
    }

    if (node.diskUsage > 98) {
      status = '故障'
      statusReason.push('磁盘空间不足')
    } else if (node.diskUsage > 90) {
      if (status !== '故障') status = '警告'
      statusReason.push('磁盘空间较少')
    }

    // 检查系统负载
    if (node.loadAverage && node.cpuCores > 0) {
      const loadPerCore = node.loadAverage / node.cpuCores
      if (loadPerCore > 2.0) {
        status = '故障'
        statusReason.push('系统负载过高')
      } else if (loadPerCore > 1.5) {
        if (status !== '故障') status = '警告'
        statusReason.push('系统负载较高')
      }
    }

    // 检查线程池状态
    if (node.stats && node.stats.thread_pool) {
      const threadPools = node.stats.thread_pool
      for (const [poolName, pool] of Object.entries(threadPools)) {
        if (pool.rejected > 0) {
          status = '故障'
          statusReason.push(`${poolName}线程池有拒绝任务`)
        } else if (pool.queue > 1000) {
          if (status !== '故障') status = '警告'
          statusReason.push(`${poolName}线程池队列较长`)
        }
      }
    }

    node.status = status
    node.statusReason = statusReason.join(', ') || '运行正常'
  })
  updateStats()
}

// 更新统计数据
const updateStats = () => {
  stats.totalNodes = nodes.value.length
  stats.activeNodes = nodes.value.filter(node => node.status === '正常').length
  stats.warningNodes = nodes.value.filter(node => node.status === '警告').length
  stats.failedNodes = nodes.value.filter(node => node.status === '故障' || node.status === '离线').length
}

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在computed中实现
}

// 查看详情
const viewDetails = (node) => {
  // 直接使用已有的节点数据，因为我们已经在parseNodeData中获取了所有详细信息
  currentNode.value = node
  detailDialogVisible.value = true
}

// 重启节点
const restartNodeHandler = (node) => {
  ElMessageBox.confirm(
    `确定要重启节点 "${node.name}" 吗？此操作可能会影响服务可用性。`,
    '确认重启',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      // 模拟重启操作
      await new Promise(resolve => setTimeout(resolve, 1500))
      ElMessage.success(`节点 "${node.name}" 重启成功`)
      refreshData()
    } catch (error) {
      ElMessage.error('重启失败：' + error.message)
    }
  }).catch(() => {
    ElMessage.info('已取消重启操作')
  })
}

// 移除节点
const removeNode = (node) => {
  ElMessageBox.confirm(
    `确定要移除节点 "${node.name}" 吗？此操作不可恢复。`,
    '确认移除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'danger',
    }
  ).then(async () => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      const index = nodes.value.findIndex(n => n.id === node.id)
      if (index > -1) {
        nodes.value.splice(index, 1)
      }
      ElMessage.success(`节点 "${node.name}" 移除成功`)
      refreshData()
    } catch (error) {
      ElMessage.error('移除失败：' + error.message)
    }
  }).catch(() => {
    ElMessage.info('已取消移除操作')
  })
}



// 组件挂载时加载数据
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.node-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 40px;
  margin-right: 15px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.table-card {
  margin-bottom: 20px;
}

.node-name {
  display: flex;
}

.node-details {
  padding: 20px 0;
}

.detail-tabs {
  margin-top: 10px;
}

.plugins-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.plugin-tag {
  margin: 0;
}

.no-plugins {
  color: #909399;
  text-align: center;
  padding: 20px;
}

.node-name {
  display: flex;
  flex-direction: column;
}

.status-reason {
  margin-top: 4px;
}

.reason-text {
  font-size: 12px;
  color: #E6A23C;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.status-reason-detail {
  font-size: 12px;
  color: #E6A23C;
  margin-top: 4px;
  line-height: 1.4;
}

/* 弹窗样式优化 */
:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  color: #606266;
}

:deep(.el-descriptions__content) {
  color: #303133;
}

:deep(.el-tabs__content) {
  padding-top: 20px;
}

/* 进度条在弹窗中的样式 */
:deep(.el-dialog .el-progress) {
  margin: 8px 0;
}

.usage-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.usage-detail {
  font-size: 11px;
  color: #606266;
  text-align: center;
}

/* 线程池统计卡片 */
.thread-pool-stat {
  text-align: center;
  padding: 10px;
}

.thread-pool-stat .stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.thread-pool-stat .stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

/* 索引统计卡片 */
.indices-stat-card {
  text-align: center;
  padding: 15px;
}

.indices-stat-card .stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #409EFF;
}

.indices-stat-card .stat-label {
  font-size: 13px;
  color: #606266;
  margin-top: 8px;
}

/* GC卡片样式 */
.gc-card {
  margin-bottom: 20px;
}

.gc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gc-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.gc-stat {
  text-align: center;
}

.gc-stat .stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.gc-stat .stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.gc-chart {
  text-align: center;
}

.gc-chart .chart-label {
  font-size: 12px;
  color: #606266;
  margin-top: 8px;
}

/* 表格内进度条样式优化 */
:deep(.el-table .el-progress) {
  margin: 4px 0;
}

:deep(.el-table .el-progress-bar__outer) {
  border-radius: 3px;
}

/* 描述列表样式优化 */
:deep(.el-descriptions) {
  margin-bottom: 20px;
}

:deep(.el-descriptions__label) {
  width: 150px;
}

/* 卡片间距优化 */
.el-card {
  margin-bottom: 20px;
}

.el-card:last-child {
  margin-bottom: 0;
}

/* 分割线样式优化 */
.el-divider {
  margin: 20px 0 15px 0;
}

/* 标签样式优化 */
.el-tag {
  margin: 2px;
}
</style>