<template>
  <div style="padding: 20px; background-color: #f5f7fa; min-height: calc(100vh - 84px);">

    <el-card shadow="never" style="margin-bottom: 20px; border: none; border-radius: 8px;" :body-style="{ padding: '20px' }">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <h2 style="margin: 0; color: #303133; font-size: 20px; display: flex; align-items: center;">
            <el-icon style="margin-right: 8px; color: #409EFF;"><Files /></el-icon>
            全量数据档案中心
          </h2>
          <el-tag type="info" effect="plain">历史流水深度检索与导出</el-tag>
        </div>

        <div>
          <el-button type="primary" icon="Refresh" @click="loadData" :loading="loading" plain>
            刷新数据
          </el-button>
          <el-button
              v-if="['ADMIN', 'MANAGER'].includes(userRole)"
              type="warning"
              icon="Download"
              @click="handleExport">
            导出历史报表
          </el-button>
        </div>
      </div>

      <el-divider border-style="dashed" />

      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
        <div style="display: flex; align-items: center;">
          <span style="font-weight: bold; margin-right: 15px; color: #606266;">🎯 节点检索：</span>
          <el-select
              v-model="selectedDevices"
              multiple
              clearable
              collapse-tags
              placeholder="默认检索全网节点流水"
              style="width: 350px;"
              @change="handleFilterChange"
          >
            <el-option
                v-for="item in deviceOptions"
                :key="item.deviceId"
                :label="`${item.deviceName} (${item.deviceId})`"
                :value="item.deviceId"
            />
          </el-select>
        </div>

        <el-radio-group v-model="selectedLogType" @change="handleLogTypeChange" size="default">
          <el-radio-button value="ALL">🌐 全部记录</el-radio-button>
          <el-radio-button value="0">✅ 正常汇总</el-radio-button>
          <el-radio-button value="1">⚠️ 异常汇总</el-radio-button>
          <el-radio-button value="2">ℹ️ 能效摘要</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <el-card shadow="never" style="border: none; border-radius: 8px;">
      <el-table
          v-loading="loading"
          :data="paginatedTableData"
          border
          stripe
          style="width: 100%;"
          :header-cell-style="{ background: '#f8f9fa', color: '#606266' }"
      >
        <el-table-column label="归档时间" width="200" align="center">
          <template #default="scope">
            <el-icon style="margin-right: 5px; color: #909399;"><Clock /></el-icon>
            {{ formatTime(getVal(scope.row, 'createTime')) }}
          </template>
        </el-table-column>

        <el-table-column label="归档类型" width="140" align="center">
          <template #default="scope">
            <el-tag :type="getTagType(scope.row)" effect="dark">{{ getStatusLabel(scope.row) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="设备编号(MAC/SN)" width="180" align="center">
          <template #default="scope">
            <strong style="color: #409EFF;">{{ getVal(scope.row, 'deviceId') || '-' }}</strong>
          </template>
        </el-table-column>

        <el-table-column label="平均电压(V)" width="120" align="center">
          <template #default="scope">{{ (getVal(scope.row, 'voltage') || 0).toFixed(1) }} V</template>
        </el-table-column>

        <el-table-column label="平均功率(W)" width="120" align="center">
          <template #default="scope">
            <strong>{{ (getVal(scope.row, 'power') || 0).toFixed(2) }}</strong> W
          </template>
        </el-table-column>

        <el-table-column label="运维诊断结论" min-width="250">
          <template #default="scope">
            <span :style="{ color: getVal(scope.row, 'isAnomaly') === 1 ? '#F56C6C' : '#606266', fontWeight: getVal(scope.row, 'isAnomaly') === 1 ? 'bold' : 'normal' }">
              {{ getInfoDescription(scope.row) }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[15, 30, 50, 100]"
            background
            layout="total, sizes, prev, pager, next, jumper"
            :total="displayTableData.length"
        />
      </div>
    </el-card>

    <el-dialog v-model="exportDialogVisible" title="📊 导出历史数据报表" width="500px" destroy-on-close>
      <div style="margin-bottom: 15px; color: #606266;">
        请选择需要导出的数据时间范围：
      </div>
      <el-date-picker
          v-model="exportDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          :clearable="false"
      />
      <div style="margin-top: 15px; font-size: 13px; color: #909399; background: #f4f4f5; padding: 10px; border-radius: 4px;">
        <el-icon style="margin-right: 5px;"><InfoFilled /></el-icon>
        提示：导出的 CSV 数据报表将根据您上方选中的【特定节点】进行自动过滤。如果未选择，则导出全网数据。
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmExport" :loading="exporting">
            确认导出
          </el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Files, Clock, InfoFilled, Download, Refresh } from '@element-plus/icons-vue';
import request from '../utils/request';

const userRole = ref(sessionStorage.getItem('role') || 'GUEST');

// --- 状态数据 ---
const tData = ref([]);
const deviceOptions = ref([]);
const selectedDevices = ref([]);
const loading = ref(false);

// --- 过滤与分页控制 ---
const selectedLogType = ref('ALL');
const currentPage = ref(1);
const pageSize = ref(15);

// 兼容大小写提取器
const getVal = (obj, key) => {
  if (!obj) return null;
  const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  return obj[key] !== undefined ? obj[key] : obj[snakeKey];
};

const safeExtract = (res) => {
  if (!res) return [];
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
};

// --- 计算属性 (前端过滤) ---
const displayTableData = computed(() => {
  // 过滤掉纯实时波动数据 (isAnomaly === 3)
  let baseData = tData.value.filter(i => getVal(i, 'isAnomaly') !== 3);
  if (selectedLogType.value !== 'ALL') {
    baseData = baseData.filter(i => getVal(i, 'isAnomaly') === parseInt(selectedLogType.value));
  }
  return baseData;
});

const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return displayTableData.value.slice(start, start + pageSize.value);
});

// --- 事件处理 ---
const handleLogTypeChange = () => {
  currentPage.value = 1;
};

const handleFilterChange = () => {
  currentPage.value = 1;
  loadData();
};

const formatTime = (str) => {
  return str ? str.replace('T', ' ').substring(0, 19) : '-';
};

const getInfoDescription = (i) => {
  const s = getVal(i, 'isAnomaly');
  if (s === 1) return "⚠️ 周期异常：监测到显著电气波动或设备离线";
  if (s === 2) return "ℹ️ 能效摘要：系统结算摘要包";
  return "✅ 环境良好：光伏阵列运行状态稳定";
};

const getStatusLabel = (i) => {
  const map = { 0: '正常汇总', 1: '异常汇总', 2: '能效摘要' };
  return map[getVal(i, 'isAnomaly')] || '记录包';
};

const getTagType = (i) => {
  const map = { 0: 'success', 1: 'danger', 2: 'primary' };
  return map[getVal(i, 'isAnomaly')] || 'info';
};

// --- 数据加载 ---
const loadDeviceOptions = async () => {
  try {
    const res = await request.get('/device/list');
    deviceOptions.value = safeExtract(res);
  } catch (error) {
    console.error('获取设备列表失败');
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const deviceIdsParam = selectedDevices.value.length > 0 ? selectedDevices.value.join(',') : '';
    // 从后端拉取流水历史
    const r = await request.get(`/data/history?deviceIds=${deviceIdsParam}`);
    tData.value = safeExtract(r);
  } catch (e) {
    ElMessage.error('流水数据加载异常');
  } finally {
    loading.value = false;
  }
};

// --- 导出功能 ---
const exportDialogVisible = ref(false);
const exportDateRange = ref([]);
const exporting = ref(false);

const handleExport = () => {
  const t = new Date();
  const d = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  exportDateRange.value = [d, d];
  exportDialogVisible.value = true;
};

const confirmExport = async () => {
  if (!exportDateRange.value || exportDateRange.value.length !== 2) {
    return ElMessage.warning('请选择有效的时间范围');
  }
  exporting.value = true;
  try {
    const startDate = exportDateRange.value[0];
    const endDate = exportDateRange.value[1];
    const deviceIdsParam = selectedDevices.value.length > 0 ? selectedDevices.value.join(',') : '';

    const res = await request.get(`/data/export?startDate=${startDate}&endDate=${endDate}&deviceIds=${deviceIdsParam}`, {
      responseType: 'blob'
    });

    const blob = new Blob([res.data ? res.data : res], { type: 'text/csv;charset=utf-8' });
    const href = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `PV_Archive_Report_${startDate}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(href);

    exportDialogVisible.value = false;
    ElMessage.success('历史报表下载成功！');
  } catch (error) {
    ElMessage.error('导出失败，请检查网络');
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  loadDeviceOptions();
  loadData();
});
</script>

<style scoped>
:deep(.el-table th.el-table__cell) {
  font-weight: bold;
}
</style>