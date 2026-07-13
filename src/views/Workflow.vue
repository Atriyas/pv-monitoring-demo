<template>
  <div style="padding: 20px; background-color: #f5f7fa; min-height: calc(100vh - 84px);">

    <el-card shadow="never" style="margin-bottom: 20px; border: none; border-radius: 8px;" :body-style="{ padding: '20px' }">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <h2 style="margin: 0; color: #303133; font-size: 20px; display: flex; align-items: center;">
            <el-icon style="margin-right: 8px; color: #409EFF;"><List /></el-icon>
            智能运维工单流转中心
          </h2>
          <el-tag v-if="userRole !== 'ENGINEER'" type="danger" effect="plain" style="font-weight: bold;">
            待分配 {{ pendingCount }}
          </el-tag>
          <el-tag type="warning" effect="plain" style="font-weight: bold;">
            处理中 {{ processingCount }}
          </el-tag>
          <el-tag type="success" effect="plain" style="font-weight: bold;">
            已结案 {{ resolvedCount }}
          </el-tag>
        </div>

        <div v-if="['ADMIN', 'MANAGER'].includes(userRole)">
          <el-button type="danger" icon="WarnTriangleFilled" @click="simulateNewOrder" plain :loading="simulating">
            模拟大屏捕获异常
          </el-button>
        </div>
      </div>

      <el-divider border-style="dashed" />

      <div style="display: flex; align-items: center; justify-content: space-between;">
        <el-radio-group v-model="filterStatus" @change="currentPage = 1">
          <el-radio-button value="ALL">📪 全部工单</el-radio-button>
          <el-radio-button v-if="userRole !== 'ENGINEER'" value="PENDING">🛠 待分配</el-radio-button>
          <el-radio-button value="PROCESSING">⚙ 处理中</el-radio-button>
          <el-radio-button value="RESOLVED">✅ 已结案</el-radio-button>
        </el-radio-group>

        <div style="color: #909399; font-size: 13px;">
          当前角色：<strong style="color: #409EFF;">{{ roleName }}</strong>
          <span v-if="userRole === 'ENGINEER'"> (仅显示派发给您的工单)</span>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" style="border: none; border-radius: 8px;" v-loading="loading">
      <el-table :data="paginatedData" border stripe style="width: 100%;" :header-cell-style="{ background: '#f8f9fa', color: '#606266' }">
        <el-table-column prop="id" label="工单编号" width="180" align="center">
          <template #default="scope">
            <span style="font-family: monospace; font-weight: bold; color: #606266;">{{ scope.row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="deviceId" label="故障节点" width="150" align="center">
          <template #default="scope">
            <el-tag effect="plain" type="info">{{ scope.row.deviceId }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="紧急程度" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getUrgencyType(scope.row.urgency)" effect="dark" size="small">
              {{ getUrgencyLabel(scope.row.urgency) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="异常描述诊断" min-width="200" show-overflow-tooltip />

        <el-table-column label="工单状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" effect="light" style="font-weight: bold;">
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="assignee" label="责任工程师" width="130" align="center">
          <template #default="scope">
            <span v-if="scope.row.assignee">
              <el-icon style="color: #409EFF; margin-right: 3px;"><Avatar /></el-icon>
              {{ scope.row.assignee }}
            </span>
            <span v-else style="color: #C0C4CC;">待指派</span>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="生成时间" width="170" align="center">
          <template #default="scope">
            {{ formatTime(scope.row.createTime) }}
          </template>
        </el-table-column>

        <el-table-column label="流转操作" width="160" align="center" fixed="right">
          <template #default="scope">
            <el-button
                v-if="['ADMIN', 'MANAGER'].includes(userRole) && scope.row.status === 'PENDING'"
                type="primary" size="small" @click="openDispatchDialog(scope.row)">
              <el-icon style="margin-right: 3px;"><UserFilled /></el-icon>派发
            </el-button>
            <el-button
                v-else-if="userRole === 'ENGINEER' && scope.row.status === 'PROCESSING' && (scope.row.assignee === sessionStorage.getItem('realName') || scope.row.assignee === sessionStorage.getItem('username'))"
                type="success" size="small" @click="openResolveDialog(scope.row)">
              <el-icon style="margin-right: 3px;"><Select /></el-icon>结案
            </el-button>
            <el-button
                v-else-if="scope.row.status === 'RESOLVED'"
                size="small" @click="viewReport(scope.row)">
              <el-icon style="margin-right: 3px;"><Document /></el-icon>报告
            </el-button>
            <span v-else style="color: #C0C4CC; font-size: 12px;">——</span>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: center; margin-top: 20px;">
        <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :total="filteredData.length"
            layout="total, prev, pager, next, jumper"
            @current-change="currentPage = $event" />
      </div>
    </el-card>

    <!-- 派发对话框 -->
    <el-dialog v-model="dispatchDialogVisible" title="指派工程师" width="420px" :close-on-click-modal="false">
      <el-form label-width="100px">
        <el-form-item label="工单编号">
          <el-input :model-value="currentOrder?.id" disabled />
        </el-form-item>
        <el-form-item label="选择工程师">
          <el-select v-model="selectedEngineer" placeholder="请选择要指派的工程师" style="width: 100%;">
            <el-option v-for="e in engineerList" :key="e.realName" :label="e.realName + ' (' + e.area + ')'" :value="e.realName" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDispatch" :loading="dispatching">确认派发</el-button>
      </template>
    </el-dialog>

    <!-- 结案对话框 -->
    <el-dialog v-model="resolveDialogVisible" title="现场维修诊断报告" width="550px" :close-on-click-modal="false">
      <el-form label-width="100px">
        <el-form-item label="工单编号">
          <el-input :model-value="currentOrder?.id" disabled />
        </el-form-item>
        <el-form-item label="故障设备">
          <el-input :model-value="currentOrder?.deviceId" disabled />
        </el-form-item>
        <el-form-item label="异常描述">
          <el-input :model-value="currentOrder?.description" type="textarea" :rows="3" disabled />
        </el-form-item>
        <el-form-item label="维修报告">
          <el-input
              v-model="repairReport"
              type="textarea"
              :rows="5"
              placeholder="请详细填写现场排查过程、诊断结论及处理措施..."
              clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveDialogVisible = false">取消</el-button>
        <el-button type="success" @click="confirmResolve" :loading="resolving">确认结案归档</el-button>
      </template>
    </el-dialog>

    <!-- 查看报告对话框 -->
    <el-dialog v-model="reportDialogVisible" title="维修报告详情" width="550px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="工单编号">{{ currentOrder?.id }}</el-descriptions-item>
        <el-descriptions-item label="故障设备">{{ currentOrder?.deviceId }}</el-descriptions-item>
        <el-descriptions-item label="责任工程师">{{ currentOrder?.assignee }}</el-descriptions-item>
        <el-descriptions-item label="异常描述">{{ currentOrder?.description }}</el-descriptions-item>
        <el-descriptions-item label="维修报告">
          <div style="white-space: pre-wrap; background: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 14px; line-height: 1.6;">
            {{ currentOrder?.repairReport }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="结案时间">{{ formatTime(currentOrder?.createTime) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { List, Avatar, UserFilled, Select, Document, WarnTriangleFilled } from '@element-plus/icons-vue'
import request from '../utils/request.js'

const loading = ref(false)
const ordersData = ref([])
const userRole = ref(sessionStorage.getItem('role') || '')
const simulating = ref(false)
const dispatching = ref(false)
const resolving = ref(false)

const roleName = computed(() => {
  const map = { ADMIN: '超级管理员', MANAGER: '区域站长', ENGINEER: '运维工程师' }
  return map[userRole.value] || userRole.value
})

const engineerList = ref([])

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await request.get('/workorder/list')
    if (res.code === 200) ordersData.value = res.data
  } catch (e) {
    ElMessage.error('获取工单列表失败')
  } finally {
    loading.value = false
  }
}

const fetchEngineers = async () => {
  try {
    const res = await request.get('/user/list')
    if (res.code === 200) {
      engineerList.value = res.data.filter(u => u.role === 'ENGINEER')
    }
  } catch (e) {}
}

onMounted(() => {
  fetchOrders()
  fetchEngineers()
})

watch(userRole, (val) => {
  if (val === 'ENGINEER' && filterStatus.value === 'PENDING') {
    filterStatus.value = 'ALL'
  }
})

const filterStatus = ref('ALL')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredData = computed(() => {
  let data = ordersData.value

  if (userRole.value === 'ENGINEER') {
    const currentRealName = sessionStorage.getItem('realName')
    const currentUsername = sessionStorage.getItem('username')
    data = data.filter(item => {
      if (!item.assignee) return false
      return (currentRealName && item.assignee === currentRealName) ||
          (currentUsername && item.assignee === currentUsername)
    })
  }

  if (filterStatus.value !== 'ALL') {
    data = data.filter(item => item.status === filterStatus.value)
  }
  return data
})

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const pendingCount = computed(() => ordersData.value.filter(i => i.status === 'PENDING').length)
const processingCount = computed(() => ordersData.value.filter(i => i.status === 'PROCESSING').length)
const resolvedCount = computed(() => ordersData.value.filter(i => i.status === 'RESOLVED').length)

const getUrgencyLabel = (u) => ({ HIGH: '紧急', MEDIUM: '一般', LOW: '提示' }[u] || '一般')
const getUrgencyType = (u) => ({ HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' }[u] || 'info')
const getStatusLabel = (s) => ({ PENDING: '待分配', PROCESSING: '处理中', RESOLVED: '已结案' }[s] || '未知')
const getStatusType = (s) => ({ PENDING: 'danger', PROCESSING: 'warning', RESOLVED: 'success' }[s] || 'info')

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return timeStr.replace('T', ' ').substring(0, 19)
}

const simulateNewOrder = async () => {
  simulating.value = true
  try {
    await request.post('/data/report', {})
    ElMessage.success('异常模拟数据已生成，系统将自动创建工单！')
    filterStatus.value = 'PENDING'
    setTimeout(() => fetchOrders(), 500)
  } catch (error) {
    ElMessage.error('模拟触发失败')
  } finally {
    simulating.value = false
  }
}

const dispatchDialogVisible = ref(false)
const currentOrder = ref(null)
const selectedEngineer = ref('')

const openDispatchDialog = (row) => {
  currentOrder.value = row
  selectedEngineer.value = ''
  dispatchDialogVisible.value = true
}

const confirmDispatch = async () => {
  if (!selectedEngineer.value) return ElMessage.warning('请选择要指派的工程师！')
  dispatching.value = true
  try {
    await request.post('/workorder/dispatch', {
      id: currentOrder.value.id,
      assignee: selectedEngineer.value
    })
    ElMessage.success(`工单已成功派发给：${selectedEngineer.value}`)
    dispatchDialogVisible.value = false
    fetchOrders()
  } catch (error) {
    ElMessage.error('派发失败')
  } finally {
    dispatching.value = false
  }
}

const resolveDialogVisible = ref(false)
const repairReport = ref('')

const openResolveDialog = (row) => {
  currentOrder.value = row
  repairReport.value = ''
  resolveDialogVisible.value = true
}

const confirmResolve = async () => {
  if (!repairReport.value.trim()) return ElMessage.warning('必须填写现场维修诊断报告！')
  resolving.value = true
  try {
    await request.post('/workorder/resolve', {
      id: currentOrder.value.id,
      repairReport: repairReport.value
    })
    ElMessage.success('工单已完成，数据已永久归档。')
    resolveDialogVisible.value = false
    fetchOrders()
  } catch (error) {
    ElMessage.error('结案提交失败')
  } finally {
    resolving.value = false
  }
}

const reportDialogVisible = ref(false)
const viewReport = (row) => {
  currentOrder.value = row
  reportDialogVisible.value = true
}
</script>

<style scoped>
:deep(.el-table .cell) {
  white-space: nowrap;
}
</style>