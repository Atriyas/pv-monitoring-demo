import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '../layout/Layout.vue'

const routes = [
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
    {
        path: '/layout',
        component: Layout,
        redirect: '/layout/dashboard',
        children: [
            { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
            { path: 'dashboard-pro', name: 'DashboardPro', component: () => import('../views/DashboardPro.vue') },
            { path: 'workflow', name: 'Workflow', component: () => import('../views/Workflow.vue') },
            { path: 'history-log', name: 'HistoryLog', component: () => import('../views/HistoryLog.vue') },
            { path: 'device', name: 'Device', component: () => import('../views/Device.vue') },
            { path: 'user', name: 'User', component: () => import('../views/User.vue') },
            { path: 'audit', name: 'AuditLog', component: () => import('../views/AuditLog.vue') }
        ]
    },
    { path: '/', redirect: '/login' },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to, from, next) => {
    const token = sessionStorage.getItem('token')
    if (to.path === '/login') return next()
    if (!token) return next('/login')
    next()
})

export default router
