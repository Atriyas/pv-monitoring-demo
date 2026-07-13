<template>
  <div style="background: transparent; min-height: calc(100vh - 100px);">
    <el-card shadow="hover">

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #303133; display: flex; align-items: center;">
          <el-icon style="margin-right: 8px; color: #409EFF;"><User /></el-icon>
          系统账号与权限分配
        </h3>
        <el-button type="primary" icon="Plus" @click="handleAdd">分配新账号</el-button>
      </div>

      <el-table
          :data="tableData"
          border stripe v-loading="loading"
          style="width: 100%;"
      >
        <el-table-column type="index" label="序号" width="70" align="center" />

        <el-table-column prop="username" label="登录账号" width="150" align="center">
          <template #default="scope"><strong>{{ scope.row.username }}</strong></template>
        </el-table-column>

        <el-table-column prop="realName" label="真实姓名" min-width="120" align="center" />

        <el-table-column label="系统角色" width="150" align="center">
          <template #default="scope">
            <el-tag :type="getRoleTagType(scope.row.role)" effect="dark">
              {{ getRoleName(scope.row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="启停状态" width="120" align="center">
          <template #default="scope">
            <el-switch
                v-model="scope.row.status"
                :active-value="1"
                :inactive-value="0"
                active-color="#13ce66"
                inactive-color="#ff4949"
                @change="handleStatusChange(scope.row)"
                :disabled="scope.row.id === 1"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" plain @click="handleEdit(scope.row)">编辑</el-button>

            <el-popconfirm title="确定要永久删除此账号吗？" @confirm="handleDelete(scope.row.id)" v-if="scope.row.id !== 1">
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
            <span v-else style="color: #999; font-size: 12px; margin-left: 10px;">保护</span>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog :title="dialogType === 'add' ? '✨ 分配新系统账号' : '📝 修改账号信息'" v-model="dialogVisible" width="450px" @close="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">

          <el-form-item label="登录账号" prop="username">
            <el-input v-model="form.username" placeholder="4-16位英文、数字、下划线" :disabled="dialogType === 'edit'" />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="6-20位，须包含字母和数字" show-password />
          </el-form-item>

          <el-form-item label="真实姓名" prop="realName">
            <el-input v-model="form.realName" placeholder="如: 张三" />
          </el-form-item>

          <el-form-item label="分配角色" prop="role">
            <el-select v-model="form.role" placeholder="请选择用户角色" style="width: 100%;" :disabled="form.id === 1">
              <el-option label="👨‍💻 超级管理员 (全量权限)" value="ADMIN" />
              <el-option label="🏢 电站站长 (偏重资产与报表)" value="MANAGER" />
              <el-option label="👷 运维工程师 (偏重监控与调试)" value="ENGINEER" />
            </el-select>
          </el-form-item>

        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取 消</el-button>
            <el-button type="primary" @click="submitForm">{{ dialogType === 'add' ? '确 认 分 配' : '保 存 修 改' }}</el-button>
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

const tableData = ref([]);
const loading = ref(false);

const dialogVisible = ref(false);
const dialogType = ref('add'); // 🌟 新增标识：'add' 或 'edit'
const formRef = ref(null);
const form = ref({ username: '', password: '', realName: '', role: 'ENGINEER' });

const rules = ref({
  username: [
    { required: true, message: '登录账号不能为空', trigger: 'blur' },
    { min: 4, max: 16, message: '长度必须在 4 到 16 个字符之间', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度不能小于 6 个字符', trigger: 'blur' },
    { pattern: /^(?=.*[a-zA-Z])(?=.*\d).*$/, message: '密码必须同时包含至少一个字母和一个数字', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '真实姓名不能为空', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符之间', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '必须为用户分配一个角色', trigger: 'change' }
  ]
});

const getRoleName = (role) => {
  const map = { 'ADMIN': '超级管理员', 'MANAGER': '电站站长', 'ENGINEER': '运维工程师' };
  return map[role] || '未知角色';
};

const getRoleTagType = (role) => {
  const map = { 'ADMIN': 'danger', 'MANAGER': 'success', 'ENGINEER': 'primary' };
  return map[role] || 'info';
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await request.get('/user/list');
    if (res.code === 200) tableData.value = res.data;
  } finally {
    loading.value = false;
  }
};

const handleStatusChange = async (row) => {
  try {
    const res = await request.post('/user/changeStatus', { id: row.id, status: row.status });
    if (res.code === 200) ElMessage.success(`已${row.status === 1 ? '解冻' : '冻结'}该账号`);
  } catch (e) {
    ElMessage.error('状态修改失败');
    row.status = row.status === 1 ? 0 : 1;
  }
};

const handleAdd = () => {
  dialogType.value = 'add';
  form.value = { username: '', password: '', realName: '', role: 'ENGINEER' };
  dialogVisible.value = true;
};

// 🌟 升级点 3：点击编辑按钮时，深拷贝数据回显到表单
const handleEdit = (row) => {
  dialogType.value = 'edit';
  // 使用 JSON 深拷贝防止在表单里修改时直接污染背后的表格数据
  form.value = JSON.parse(JSON.stringify(row));
  dialogVisible.value = true;
};

const resetForm = () => {
  if (formRef.value) formRef.value.clearValidate();
};

const submitForm = () => {
  if (!formRef.value) return;
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 🌟 升级点 4：根据 dialogType 决定请求哪个后端接口
        const url = dialogType.value === 'add' ? '/user/add' : '/user/update';
        const res = await request.post(url, form.value);

        if (res.code === 200) {
          ElMessage.success(res.msg || '操作成功！');
          dialogVisible.value = false;
          loadData();
        } else {
          ElMessage.error(res.msg);
        }
      } catch (e) {
        ElMessage.error('操作失败，服务器异常');
      }
    } else {
      ElMessage.warning('请检查并修正红框内的填写格式要求！');
      return false;
    }
  });
};

const handleDelete = async (id) => {
  try {
    const res = await request.get(`/user/delete?id=${id}`);
    if (res.code === 200) {
      ElMessage.success('删除成功');
      loadData();
    } else { ElMessage.error(res.msg); }
  } catch (e) { ElMessage.error('删除失败'); }
};

onMounted(() => { loadData(); });
</script>