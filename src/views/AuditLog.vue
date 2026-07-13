<template>
  <div style="padding: 20px; background: transparent; min-height: calc(100vh - 100px);">
    <el-card shadow="hover">

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
        <h2 style="color: #303133; margin: 0; display: flex; align-items: center;">
          <el-icon style="margin-right: 10px; color: #409EFF;"><Monitor /></el-icon>
          系统安全操作审计 (Security Audit)
        </h2>
        <el-tag type="warning" effect="dark" style="font-weight: bold;">
          <el-icon><WarningFilled /></el-icon> 仅供系统安全管理员 (ADMIN) 查阅
        </el-tag>
      </div>

      <div style="margin-bottom: 20px; display: flex; gap: 15px;">
        <el-input
            v-model="searchTitle"
            placeholder="搜索操作模块 (如: 设备管理)"
            style="width: 250px;"
            clearable
            prefix-icon="Search"
            @keyup.enter="fetchLogs"
        />
        <el-select v-model="searchStatus" placeholder="所有执行状态" clearable style="width: 180px;" @change="fetchLogs">
          <el-option label="✅ 执行成功" :value="1" />
          <el-option label="❌ 执行拦截/异常" :value="0" />
        </el-select>
        <el-button type="primary" icon="Search" @click="fetchLogs">检索日志</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </div>

      <el-table
          :data="paginatedData"
          border
          stripe
          v-loading="loading"
          style="width: 100%; font-size: 13px;"
          :row-class-name="tableRowClassName"
      >
        <el-table-column label="审计时间" width="180" align="center">
          <template #default="scope">
            <span style="color: #909399;">{{ formatTime(scope.row.operTime) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作模块" width="160" align="center">
          <template #default="scope">
            <el-tag type="info" effect="plain" style="font-weight: bold;">
              {{ scope.row.title || '系统底层' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作行为" width="220">
          <template #default="scope">
            <strong>{{ scope.row.action || '未知操作' }}</strong>
          </template>
        </el-table-column>

        <el-table-column label="操作人账号" width="150" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.operName === '未知机器/未登录' ? 'info' : 'primary'" effect="light">
              <el-icon style="margin-right: 3px;"><User /></el-icon>
              {{ scope.row.operName }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="追踪 IP" width="140" align="center" prop="operIp" />

        <el-table-column label="执行状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" effect="dark">
              {{ scope.row.status === 1 ? '成功' : '异常/拦截' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="API 轨迹 (底层接口)" show-overflow-tooltip>
          <template #default="scope">
            <span style="color: #C0C4CC; font-family: monospace;">{{ scope.row.operUrl }}</span>
            <br/>
            <span v-if="scope.row.status === 0" style="color: #F56C6C; font-size: 12px; margin-top: 5px; display: inline-block;">
              <strong>拦截原因: </strong>{{ scope.row.errorMsg }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            background
            layout="total, prev, pager, next, jumper"
            :total="logData.length"
            :hide-on-single-page="true"
        />
      </div>

    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../utils/request';

const logData = ref([]);
const loading = ref(false);

const searchTitle = ref('');
const searchStatus = ref(null);

const currentPage = ref(1);
const pageSize = ref(15);

// 获取日志数据
const fetchLogs = async () => {
  loading.value = true;
  try {
    const res = await request.get('/log/list', {
      params: {
        title: searchTitle.value,
        status: searchStatus.value
      }
    });
    // 兼容层级脱壳
    if (res.code === 200 || (res.data && res.data.code === 200)) {
      logData.value = res.data.data || res.data || [];
      currentPage.value = 1; // 搜索后重置页码
    }
  } catch (error) {
    ElMessage.error('获取审计日志失败');
  } finally {
    loading.value = false;
  }
};

// 重置搜索
const resetSearch = () => {
  searchTitle.value = '';
  searchStatus.value = null;
  fetchLogs();
};

// 分页切片计算属性
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return logData.value.slice(start, end);
});

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  return timeStr.replace('T', ' ').substring(0, 19);
};

// 表格行高亮：如果是异常日志，给个微红的背景色
const tableRowClassName = ({ row }) => {
  if (row.status === 0) {
    return 'warning-row';
  }
  return '';
};

onMounted(() => {
  fetchLogs();
});
</script>

<style scoped>
.el-table .warning-row {
  --el-table-tr-bg-color: var(--el-color-danger-light-9);
}
</style>