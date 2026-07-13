// Mock request handler - replaces axios calls with mock data
import { ElMessage } from 'element-plus'
import router from '../router'
import * as mock from '../mock/data.js'

const mockHandlers = {
  '/auth/login': (params) => {
    const user = mock.mockUsers.find(u => u.username === params.username && u.password === params.password)
    if (user) {
      return { code: 200, msg: '登录成功', token: 'mock_token_' + user.role, realName: user.realName, role: user.role }
    }
    return { code: 401, msg: '账号或密码错误' }
  },
  '/device/list': () => ({ code: 200, data: mock.mockDevices }),
  '/device/add': (body) => { mock.mockDevices.unshift({ ...body, createTime: new Date().toISOString() }); return { code: 200, msg: '注册成功' } },
  '/device/update': (body) => { const idx = mock.mockDevices.findIndex(d => d.deviceId === body.deviceId); if (idx >= 0) { mock.mockDevices[idx] = { ...mock.mockDevices[idx], ...body } }; return { code: 200, msg: '更新成功' } },
  '/device/delete': (params) => { const idx = mock.mockDevices.findIndex(d => d.deviceId === params.deviceId); if (idx >= 0) mock.mockDevices.splice(idx, 1); return { code: 200, msg: '删除成功' } },
  '/device/simulateDisconnect': () => ({ code: 200, msg: '网络状态已切换' }),
  '/device/setBlocked': () => ({ code: 200, msg: '状态已更新' }),
  '/data/setMode': () => ({ code: 200, msg: '模式设置成功' }),
  '/data/report': () => ({ code: 200, msg: '模拟数据发送成功' }),
  '/data/chart': (params) => {
    const pType = params.type || 'day';
    const count = pType === 'day' ? 24 : pType === 'week' ? 7 : pType === 'month' ? 12 : 5;
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        period: pType === 'day' ? String(i).padStart(2,'0') : pType === 'week' ? String(i+1) : pType === 'month' ? String(i+1) : String(new Date().getFullYear() - 4 + i),
        energy: parseFloat((2000 + Math.random() * 3000).toFixed(2))
      });
    }
    return { code: 200, data: data };
  },
  '/data/live': () => {
    const now = Date.now(); const points = [];
    for (let i = 0; i < 10; i++) {
      points.push({ deviceId: 'PV-EDGE-' + String(Math.floor(Math.random()*5)+1).padStart(3,'0'), power: parseFloat((200+Math.random()*300).toFixed(2)), createTime: new Date(now-(9-i)*2000).toISOString() });
    }
    return { code: 200, data: points };
  },
  '/data/connectionStatus': () => ({ code: 200, online: true, data: { online: true } }),
  '/data/history': () => {
    const now = Date.now();
    const liveData = [];
    for (let i = 0; i < 15; i++) {
      liveData.push({
        id: 1000 + i,
        deviceId: 'PV-EDGE-' + String(Math.floor(Math.random() * 5) + 1).padStart(3, '0'),
        voltage: parseFloat((210 + Math.random() * 40).toFixed(2)),
        current: parseFloat((4 + Math.random() * 6).toFixed(2)),
        power: parseFloat((800 + Math.random() * 800).toFixed(2)),
        temperature: parseFloat((28 + Math.random() * 12).toFixed(1)),
        isAnomaly: 3,
        createTime: new Date(now - (14 - i) * 2000).toISOString()
      });
    }
    return { code: 200, data: [...mock.mockHistoryData, ...liveData] };
  },
  '/data/export': () => ({ code: 200, msg: '导出任务已提交' }),
  '/data/trend': (params) => {
    const pType = params.pType || 'day';
    const data = [];
    const count = pType === 'day' ? 24 : pType === 'week' ? 7 : pType === 'month' ? 12 : 5;
    for (let i = 0; i < count; i++) {
      data.push({
        period: pType === 'day' ? String(i).padStart(2,'0') : pType === 'week' ? String(i+1) : pType === 'month' ? String(i+1) : String(new Date().getFullYear() - 4 + i),
        energy: parseFloat((2000 + Math.random() * 3000).toFixed(2))
      });
    }
    return { code: 200, data: data };
  },
  '/workorder/list': () => ({ code: 200, data: mock.mockWorkOrders }),
  '/workorder/dispatch': (body) => { const o = mock.mockWorkOrders.find(w => w.id === body.id); if (o) { o.assignee = body.assignee; o.status = 'PROCESSING' }; return { code: 200, msg: '派发成功' } },
  '/workorder/resolve': (body) => { const o = mock.mockWorkOrders.find(w => w.id === body.id); if (o) { o.repairReport = body.repairReport; o.status = 'RESOLVED' }; return { code: 200, msg: '结案成功' } },
  '/user/list': () => ({ code: 200, data: mock.mockUsers }),
  '/user/add': (body) => { mock.mockUsers.push({ ...body, status: body.status !== undefined ? body.status : 1, id: mock.mockUsers.length + 1, createTime: new Date().toISOString() }); return { code: 200, msg: '添加成功' } },
  '/user/update': (body) => { const idx = mock.mockUsers.findIndex(u => u.username === body.username); if (idx >= 0) mock.mockUsers[idx] = { ...mock.mockUsers[idx], ...body }; return { code: 200, msg: '更新成功' } },
  '/user/delete': (params) => { const u = mock.mockUsers.find(u => u.username === params.username); if (u && u.id === 1) return { code: 403, msg: '保护用户不能删除' }; const idx = mock.mockUsers.findIndex(u => u.username === params.username); if (idx >= 0) mock.mockUsers.splice(idx, 1); return { code: 200, msg: '删除成功' } },
  '/user/changeStatus': (body) => { const u = mock.mockUsers.find(u => u.id === body.id); if (u) u.status = body.status; return { code: 200, msg: '帐号状态已更新' } },
  '/audit/list': () => ({ code: 200, data: mock.mockAuditLogs }),
  '/log/list': (params) => {
    let data = mock.mockAuditLogs.slice();
    if (params.title) data = data.filter(i => i.title && i.title.includes(params.title));
    if (params.status !== null && params.status !== undefined && params.status !== '') data = data.filter(i => i.status === parseInt(params.status));
    return { code: 200, data: { data: data } };
  },
  '/history/list': () => ({ code: 200, data: mock.mockHistoryData }),
  '/history/export': () => ({ code: 200, msg: '导出任务已提交' }),
}

const request = {
  post: async (url, body) => {
    await new Promise(r => setTimeout(r, 10 + Math.random() * 40))
    const handler = mockHandlers[url]
    if (handler) return handler(body || {})
    return { code: 200, data: [] }
  },
  get: async (url, config) => {
    await new Promise(r => setTimeout(r, 10 + Math.random() * 40))
    try {
      const urlObj = new URL(url, 'http://localhost')
      const path = urlObj.pathname
      const params = Object.fromEntries(urlObj.searchParams.entries())
      const handler = mockHandlers[path]
      if (handler) return handler(params)
    } catch (e) {}
    return { code: 200, data: [] }
  }
}

export default request
