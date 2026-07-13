<template>
  <div style="background: transparent; min-height: calc(100vh - 100px);">
    <el-card shadow="hover">

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #303133; display: flex; align-items: center;">
          <el-icon style="margin-right: 8px; color: #409EFF;"><Monitor /></el-icon>
          边缘节点台账管理
        </h3>
        <el-button
            v-if="['ADMIN', 'MANAGER'].includes(userRole)"
            type="primary"
            icon="Plus"
            @click="handleAdd">
          注册新设备
        </el-button>
      </div>

      <el-table
          :data="tableData"
          border
          stripe
          style="width: 100%; margin-top: 20px;"
          :default-sort="{ prop: 'deviceId', order: 'ascending' }"
      >
        <el-table-column prop="deviceId" label="设备编号(MAC/SN)" width="180" align="center" sortable />
        <el-table-column prop="deviceName" label="设备名称" min-width="150" />
        <el-table-column prop="location" label="安装位置" min-width="150" />

        <el-table-column prop="capacity" label="装机容量(kW)" width="130" align="center" sortable>
          <template #default="scope">
            <strong style="color: #409EFF;">{{ scope.row.capacity }}</strong> kW
          </template>
        </el-table-column>

        <el-table-column prop="area" label="设备面积(m²)" width="130" align="center" sortable>
          <template #default="scope">
            <strong>{{ scope.row.area || 1.60 }}</strong> m²
          </template>
        </el-table-column>

        <el-table-column prop="efficiency" label="转换效率" width="120" align="center" sortable>
          <template #default="scope">
            <el-tag type="warning" effect="plain">
              {{ ((scope.row.efficiency || 0.20) * 100).toFixed(0) }} %
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="运行状态" width="110" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'ONLINE' ? 'success' : 'danger'" effect="dark">
              {{ scope.row.status === 'ONLINE' ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="接入时间" width="170" align="center" sortable>
          <template #default="scope">
            {{ formatTime(scope.row.createTime) }}
          </template>
        </el-table-column>

        <el-table-column
            v-if="['ADMIN', 'MANAGER'].includes(userRole)"
            label="资产操作"
            width="150"
            align="center"
            fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" plain @click="handleEdit(scope.row)">编辑</el-button>
            <el-popconfirm title="确定要注销此设备吗？数据将不可恢复！" @confirm="handleDelete(scope.row.deviceId)">
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>

        <el-table-column
            v-if="['ADMIN', 'ENGINEER'].includes(userRole)"
            label="网络故障模拟"
            width="130"
            align="center"
            fixed="right">
          <template #default="scope">
            <el-switch
                v-model="scope.row.isBlocked"
                active-color="#ff4949"
                inactive-color="#13ce66"
                active-text="断网"
                inactive-text="正常"
                inline-prompt
                @change="toggleNetwork(scope.row)"
            />
          </template>
        </el-table-column>
      </el-table>

      <el-dialog :title="dialogType === 'add' ? '✨ 注册新设备' : '📝 修改资产物理参数'" v-model="dialogVisible" width="550px">
        <el-form :model="form" label-width="120px">

          <el-divider content-position="left">基础信息</el-divider>
          <el-form-item label="设备编号">
            <el-input v-model="form.deviceId" placeholder="例如: PV-EDGE-003" :disabled="dialogType === 'edit'" />
          </el-form-item>
          <el-form-item label="设备名称">
            <el-input v-model="form.deviceName" placeholder="例如: 3号厂房光伏阵列" />
          </el-form-item>
          <el-form-item label="安装位置">
            <el-input v-model="form.location" placeholder="例如: 综合楼A栋屋顶" />
          </el-form-item>

          <el-divider content-position="left">物理性能参数 (影响 Pro 大屏计算)</el-divider>

          <el-form-item label="装机容量(kW)">
            <el-input-number v-model="form.capacity" :precision="2" :step="1.0" :min="0" style="width: 100%;" />
          </el-form-item>

          <el-form-item label="设备面积(m²)">
            <el-input-number v-model="form.area" :precision="2" :step="0.5" :min="0.1" style="width: 100%;" />
          </el-form-item>

          <el-form-item label="设计转换效率">
            <el-input-number v-model="form.efficiency" :precision="2" :step="0.01" :min="0.05" :max="1.00" style="width: 100%;" />
            <div style="font-size: 12px; color: #909399; margin-top: 5px; line-height: 1.2;">
              * 填入小数，例如 0.20 代表该型号光伏板有 20% 的光电转换效率
            </div>
          </el-form-item>

          <el-divider content-position="left">网络状态</el-divider>
          <el-form-item label="运行状态">
            <el-radio-group v-model="form.status">
              <el-radio value="ONLINE">正常在线</el-radio>
              <el-radio value="OFFLINE">下线维护</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取 消</el-button>
            <el-button type="primary" @click="submitForm">确 定</el-button>
          </span>
        </template>
      </el-dialog>

    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../utils/request';

const userRole = ref(sessionStorage.getItem('role') || 'GUEST');

const tableData = ref([]);
const loading = ref(false);

const dialogVisible = ref(false);
const dialogType = ref('add');

// 🌟 表单数据结构扩充，加入 area 和 efficiency 默认值
const form = ref({
  deviceId: '',
  deviceName: '',
  capacity: 0,
  area: 1.60,
  efficiency: 0.20,
  location: '',
  status: 'ONLINE'
});

const formatTime = (str) => {
  return str ? str.replace('T', ' ').substring(0, 19) : '-';
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await request.get('/device/list');
    if (res.code === 200) {
      tableData.value = res.data;
    }
  } catch (error) {
    ElMessage.error('获取设备列表失败');
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  dialogType.value = 'add';
  form.value = {
    deviceId: '',
    deviceName: '',
    capacity: 0,
    area: 1.60,        // 默认面积
    efficiency: 0.20,  // 默认效率
    location: '',
    status: 'ONLINE'
  };
  dialogVisible.value = true;
};

const toggleNetwork = async (row) => {
  try {
    const res = await request.get(`/device/simulateDisconnect?deviceId=${row.deviceId}&isBlocked=${row.isBlocked}`);
    if (res.code === 200) {
      ElMessage({
        message: res.msg,
        type: row.isBlocked ? 'warning' : 'success'
      });
      loadData();
    } else {
      ElMessage.error(res.msg || '操作被拒绝');
      row.isBlocked = !row.isBlocked;
    }
  } catch (error) {
    ElMessage.error('网络操作失败');
    row.isBlocked = !row.isBlocked;
  }
};

const handleEdit = (row) => {
  dialogType.value = 'edit';
  form.value = JSON.parse(JSON.stringify(row));

  // 兼容老数据：如果之前的设备没有面积和效率，编辑时给个默认值
  if (!form.value.area) form.value.area = 1.60;
  if (!form.value.efficiency) form.value.efficiency = 0.20;

  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!form.value.deviceId || !form.value.deviceName) {
    ElMessage.warning('设备编号和名称不能为空！');
    return;
  }

  try {
    const url = dialogType.value === 'add' ? '/device/add' : '/device/update';
    const res = await request.post(url, form.value);

    if (res.code === 200) {
      ElMessage.success(res.msg);
      dialogVisible.value = false;
      loadData();
    } else {
      ElMessage.error(res.msg);
    }
  } catch (error) {
    ElMessage.error('操作失败，请重试');
  }
};

const handleDelete = async (deviceId) => {
  try {
    const res = await request.get(`/device/delete?deviceId=${deviceId}`);
    if (res.code === 200) {
      ElMessage.success('删除成功');
      loadData();
    } else {
      ElMessage.error(res.msg);
    }
  } catch (error) {
    ElMessage.error('删除失败');
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
:deep(.el-table th.el-table__cell) {
  background-color: #f5f7fa !important;
  color: #606266;
}
</style>