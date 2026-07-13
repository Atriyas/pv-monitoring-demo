// Mock data for the standalone frontend demo

export const mockUsers = [
  { id: 1, username: 'admin', password: 'a123456', realName: '超级管理员', role: 'ADMIN', area: '全局', status: 1, createTime: '2025-01-01T00:00:00' },
  { id: 2, username: 'manager', password: 'm123456', realName: '张站长', role: 'MANAGER', area: '华东区域', status: 1, createTime: '2025-02-01T00:00:00' },
  { id: 3, username: 'engineer', password: 'e123456', realName: '李工', role: 'ENGINEER', area: '华东-上海', status: 1, createTime: '2025-03-01T00:00:00' },
  { id: 4, username: 'wang_gc', password: '123456', realName: '王工', role: 'ENGINEER', area: '华东-南京', status: 1, createTime: '2025-03-15T00:00:00' }
]

export const mockDevices = Array.from({ length: 20 }, (_, i) => ({
  deviceId: 'PV-EDGE-' + String(i + 1).padStart(3, '0'),
  deviceName: (i < 5 ? '分布式' : '集中式') + '光伏阵列' + (i + 1) + '号',
  location: ['综合楼A栋屋顶', '厂房B栋南侧', '办公楼C栋屋顶', '仓库D区', '停车场顶棚', '生产基地E区', '物流中心F栋', '研发中心G栋', '宿舍H栋', '园区西门'][i % 10] + '',
  capacity: parseFloat((5 + Math.random() * 45).toFixed(2)),
  area: parseFloat((1.5 + Math.random() * 3).toFixed(2)),
  efficiency: parseFloat((0.15 + Math.random() * 0.15).toFixed(4)),
  status: i < 17 ? 'ONLINE' : 'OFFLINE',
  isBlocked: i > 18,
  createTime: new Date(Date.now() - Math.random() * 365 * 24 * 3600 * 1000).toISOString()
}))

export const mockWorkOrders = Array.from({ length: 35 }, (_, i) => ({
  id: 'WO-2025-' + String(i + 1).padStart(4, '0'),
  deviceId: 'PV-EDGE-' + String(Math.floor(Math.random() * 20) + 1).padStart(3, '0'),
  urgency: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)],
  description: ['组串I-V曲线异常畸变', '通信链路间歇性中断', '逆变器输出功率骤降', '组件温度异常升高', '旁路二极管击穿故障'][Math.floor(Math.random() * 5)] + '（模拟数据）',
  status: ['PENDING', 'PROCESSING', 'RESOLVED'][Math.floor(Math.random() * 3)],
  assignee: i % 3 === 0 ? '李工' : i % 3 === 1 ? '王工' : null,
  createTime: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString(),
  repairReport: i % 3 === 2 ? '已完成现场检修，更换旁路二极管，IV曲线恢复正常。' : null
}))

export const mockAuditLogs = Array.from({ length: 30 }, (_, i) => ({
  operId: i + 1,
  title: ['登录系统', '修改设备参数', '派发工单', '处理工单', '删除设备', '新增用户', '导出报表'][Math.floor(Math.random() * 7)],
  action: ['登录操作', '更新设备配置', '指派工程师', '完成维修报告', '注销设备资产', '创建新账号', '导出历史报表'][Math.floor(Math.random() * 7)],
  operName: ['超级管理员', '张站长', '李工'][Math.floor(Math.random() * 3)],
  operIp: '192.168.1.' + Math.floor(Math.random() * 255),
  operTime: new Date(Date.now() - Math.random() * 14 * 24 * 3600 * 1000).toISOString(),
  status: Math.random() > 0.15 ? 1 : 0,
  operUrl: '/api/' + ['auth/login', 'device/update', 'workorder/dispatch', 'workorder/resolve', 'device/delete', 'user/add', 'history/export'][Math.floor(Math.random() * 7)],
  errorMsg: Math.random() > 0.85 ? '查询数据库超时' : ''
}))



// Regenerate history data with real-time items on each page load
export const mockDashboardLiteData = {
  totalPower: 158.6,
  dailyPower: 2850,
  onlineRate: '95.2%',
  anomalyCount: 3,
  anomalyTrend: [
    { date: '01/01', count: 5 }, { date: '01/02', count: 3 }, { date: '01/03', count: 7 },
    { date: '01/04', count: 2 }, { date: '01/05', count: 4 }, { date: '01/06', count: 1 },
    { date: '01/07', count: 3 }, { date: '01/08', count: 0 }, { date: '01/09', count: 2 }
  ],
  deviceList: [
    { id: 'PV-EDGE-001', name: '1号光伏阵列', power: 45.2, status: 'ONLINE', anomaly: false },
    { id: 'PV-EDGE-002', name: '2号光伏阵列', power: 38.7, status: 'ONLINE', anomaly: false },
    { id: 'PV-EDGE-003', name: '3号光伏阵列', power: 42.1, status: 'ONLINE', anomaly: true },
    { id: 'PV-EDGE-004', name: '4号光伏阵列', power: 0, status: 'OFFLINE', anomaly: true },
    { id: 'PV-EDGE-005', name: '5号光伏阵列', power: 32.6, status: 'ONLINE', anomaly: false }
  ]
}

export const mockDashboardProData = {
  techKpis: [
    { title: '并网总容量', value: '3.2', unit: 'MW', icon: 'Management', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { title: '今日发电量', value: '12,580', unit: 'kWh', icon: 'Timer', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { title: '综合效率', value: '82.6', unit: '%', icon: 'Odometer', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { title: '平均功率', value: '524', unit: 'kW', icon: 'DataLine', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
  ],
  ivData: Array.from({ length: 20 }, (_, i) => ({ voltage: 50 + i * 10, current: 8 * Math.exp(-i * i / 400) })),
  barData: [
    { name: 'PID效应', value: 86 },
    { name: '旁路二极管', value: 52 },
    { name: '接地故障', value: 32 },
    { name: '局部遮挡', value: 42 }
  ],
  realtimeData: Array.from({ length: 20 }, (_, i) => ({
    time: (i * 2) + 's',
    totalPower: 400 + Math.random() * 200,
    device1: 100 + Math.random() * 60,
    device2: 80 + Math.random() * 50,
    device3: 120 + Math.random() * 70
  }))
}

export const mockHistoryData = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  deviceId: 'PV-EDGE-' + String(Math.floor(Math.random() * 20) + 1).padStart(3, '0'),
  voltage: parseFloat((200 + Math.random() * 100).toFixed(2)),
  current: parseFloat((5 + Math.random() * 10).toFixed(2)),
  power: parseFloat((1000 + Math.random() * 1500).toFixed(2)),
  temperature: parseFloat((25 + Math.random() * 20).toFixed(1)),
  isAnomaly: Math.random() > 0.85 ? 1 : 0,
  createTime: new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000).toISOString()
}))
