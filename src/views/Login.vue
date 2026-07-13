<template>
  <div class="login-container">
    <el-card class="login-box">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #409EFF; margin: 0;">☀️ 光伏云平台</h2>
        <p style="color: #999; font-size: 14px; margin-top: 5px;">云边协同智能运维管理系统</p>
      </div>

      <el-form :model="loginForm" @keyup.enter="handleLogin">
        <el-form-item>
          <el-input v-model="loginForm.username" placeholder="请输入账号 (admin/engineer/manager)" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-button type="primary" style="width: 100%; margin-top: 15px;" size="large" @click="handleLogin" :loading="loading">
          立 即 登 录
        </el-button>
      </el-form>

      <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
        提示：超级管理员(admin) | 运维(engineer) | 站长(manager)
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../utils/request'; // 引入你定义的 axios 实例

const router = useRouter();
const loginForm = ref({ username: 'admin', password: '' });
const loading = ref(false);

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('账号和密码不能为空！');
    return;
  }
  loading.value = true;
  try {
    // 发起登录请求
    const res = await request.post('/auth/login', loginForm.value);

    // 【重要修正】：由于你的 request.js 拦截器已经 return response.data
    // 这里的 res 直接就是后端传回的 Map，不需要写成 res.data.code
    if (res.code === 200) {
      ElMessage.success(`欢迎回来，${res.realName || '用户'}！`);

      // 1. 存储 Token (用于后续请求头鉴权)
      sessionStorage.setItem('token', res.token);

      // 2. 存储真实姓名 (用于顶部头像处显示)
      sessionStorage.setItem('realName', res.realName);

      // 3. 🌟【核心 RBAC 升级】：存储角色标识
      // 这里的角色将决定 Layout 侧边栏的显示以及路由的跳转权限
      sessionStorage.setItem('role', res.role);

      // 跳转到内部监控看板
      router.push('/layout/dashboard');
    } else {
      ElMessage.error(res.msg || '登录失败，请检查账号密码');
    }
  } catch (e) {
    console.error(e);
    ElMessage.error('网络连接异常或服务器未启动');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}
.login-box { width: 400px; padding: 20px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
</style>