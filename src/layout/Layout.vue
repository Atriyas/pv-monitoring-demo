<template>
  <el-container style="height: 100vh;">
    <el-aside width="240px" style="background-color: #304156; box-shadow: 2px 0 6px rgba(0,21,41,.35);">
      <div style="height: 60px; line-height: 60px; text-align: center; color: white; font-size: 18px; font-weight: bold; border-bottom: 1px solid #1f2d3d;">⚡ 光伏云协同平台</div>
      <el-menu active-text-color="#409EFF" background-color="#304156" text-color="#bfcbd9" :default-active="route.path" router style="border-right: none;" unique-opened>
        <el-sub-menu index="data-center">
          <template #title><el-icon><DataAnalysis /></el-icon><span>📳 数据情报中心</span></template>
          <el-menu-item index="/layout/dashboard"><el-icon><Monitor /></el-icon> 实时监控大盘(Lite)</el-menu-item>
          <el-menu-item index="/layout/dashboard-pro" v-if="['ADMIN', 'MANAGER'].includes(userRole)"><el-icon><PieChart /></el-icon> 决策分析大屏(Pro)</el-menu-item>
          <el-menu-item index="/layout/history-log"><el-icon><Files /></el-icon> 全量数据档案</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/layout/device"><el-icon><Setting /></el-icon> <span>边缘节点台账</span></el-menu-item>
        <el-menu-item index="/layout/workflow"><el-icon><List /></el-icon> <span>智能运维工单</span></el-menu-item>
        <el-sub-menu index="sys-security" v-if="userRole === 'ADMIN'">
          <template #title><el-icon><Lock /></el-icon><span>🛡️ 系统安全与审计</span></template>
          <el-menu-item index="/layout/user"><el-icon><User /></el-icon> 账号分配管理</el-menu-item>
          <el-menu-item index="/layout/audit"><el-icon><DocumentChecked /></el-icon> 操作审计日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background-color: white; border-bottom: 1px solid #e6e6e6; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,21,41,.08);">
        <div style="font-weight: bold; color: #606266; font-size: 16px; display: flex; align-items: center;">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>云边协同监测平台</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentRouteName }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div style="display: flex; align-items: center;">
          <el-tag :type="roleTagType" effect="dark" style="margin-right: 15px;">{{ roleName }}</el-tag>
          <el-dropdown>
            <span style="cursor: pointer; color: #409EFF; font-weight: bold; display: flex; align-items: center;">
              <el-avatar :size="30" style="margin-right: 10px;">{{ adminName.charAt(0) }}</el-avatar>
              {{ adminName }} <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu><el-dropdown-item @click="logout">退出登录</el-dropdown-item></el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main style="background-color: #f0f2f5; padding: 20px;"><router-view /></el-main>
    </el-container>
    <FloatingController v-if="['ADMIN'].includes(userRole)" />
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FloatingController from '../components/FloatingController.vue'

const router = useRouter()
const route = useRoute()
const adminName = ref(sessionStorage.getItem('realName') || '管理员')
const userRole = ref(sessionStorage.getItem('role') || 'ENGINEER')

const currentRouteName = computed(() => {
  const map = { '/layout/dashboard': '实时监控大盘(Lite)', '/layout/dashboard-pro': '决策分析大屏(Pro)', '/layout/history-log': '全量数据档案', '/layout/device': '边缘节点台账', '/layout/user': '系统账号管理', '/layout/audit': '操作审计日志', '/layout/workflow': '智能运维工单' }
  return map[route.path] || '欢迎回来'
})
const roleName = computed(() => {
  const map = { 'ADMIN': '超级管理员', 'MANAGER': '电站站长', 'ENGINEER': '运维工程师' }
  return map[userRole.value] || '普通用户'
})
const roleTagType = computed(() => {
  if (userRole.value === 'ADMIN') return 'danger'
  if (userRole.value === 'MANAGER') return 'success'
  return 'primary'
})
const logout = () => { sessionStorage.clear(); router.push('/login') }
</script>
