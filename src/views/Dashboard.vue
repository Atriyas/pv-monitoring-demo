<template>
  <div style="padding: 20px; background: transparent; min-height: calc(100vh - 84px);">
    <el-card shadow="never" style="border-radius: 8px; border: none;">

      <el-alert
          v-if="hasAnomaly"
          title="⚠️ 实时监控雷达预警：检测到部分节点功率骤降或报出异常，请立即通过下方筛选器定位故障设备！"
          type="error"
          effect="dark"
          show-icon
          style="margin-bottom: 20px; border-radius: 8px;"
      />

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
        <h2 style="color: #409EFF; margin: 0; display: flex; align-items: center; font-size: 22px;">
          ☀️ 综合监控大盘 (Lite)
          <el-tag type="info" style="margin-left: 20px; font-weight: bold; font-size: 14px; padding: 0 15px;" effect="plain">
            📊 台账总计: {{ totalDevices }} | 🟢 实时在线: {{ onlineDevices }} | 🔴 离线断网: {{ offlineDevices }}
          </el-tag>
        </h2>

        <div style="display: flex; gap: 10px;">
          <el-tag :type="isServerOnline ? 'success' : 'danger'" style="font-weight: bold;" effect="dark">
            ● 云端服务: {{ isServerOnline ? '已连接' : '无法连接' }}
          </el-tag>
          <el-tag :type="isEdgeOnline ? 'success' : 'danger'" style="font-weight: bold;" effect="dark">
            ● 边缘设备: {{ isEdgeOnline ? '在线监测中' : '通讯中断' }}
          </el-tag>
        </div>
      </div>

      <div style="margin-bottom: 20px; padding: 15px 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #ebeef5; display: flex; align-items: center;">
        <span style="font-weight: bold; margin-right: 15px; color: #606266; display: flex; align-items: center;">
          <el-icon style="margin-right: 5px;"><Filter /></el-icon> 数据聚合视角：
        </span>
        <el-select
            v-model="selectedDevices"
            multiple
            clearable
            collapse-tags
            placeholder="默认聚合全网设备数据 (全选)"
            style="width: 450px;"
            @change="handleFilterChange"
        >
          <el-option
              v-for="item in deviceOptions"
              :key="item.deviceId"
              :label="`${item.deviceName} (${item.deviceId}) ${item.status === 'OFFLINE' ? ' ❌ [离线不可选]' : ''}`"
              :value="item.deviceId"
              :disabled="item.status === 'OFFLINE'"
          />
        </el-select>
        <span style="margin-left: 15px; font-size: 13px; color: #909399;">* 选择特定节点以实现数据下钻，图表将立刻响应并重绘</span>
      </div>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" style="border-radius: 8px;">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: #409EFF;">📊 周期发电量对比 (归档统计)</span>
                <el-select v-model="pType" @change="loadChart" size="small" style="width: 150px">
                  <el-option label="按日 (今日24H)" value="day" />
                  <el-option label="按周 (本周7天)" value="week" />
                  <el-option label="按月 (本年12月)" value="month" />
                  <el-option label="按年 (近 5 年)" value="year" />
                </el-select>
              </div>
            </template>
            <div id="bChart" style="height: 450px; width: 100%;"></div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="hover" style="border-radius: 8px;">
            <template #header>
              <div style="font-weight: bold; color: #67C23A;">⚡ 实时功率感应 (秒级波动)</div>
            </template>
            <div id="lChart" style="height: 450px; width: 100%;"></div>
          </el-card>
        </el-col>
      </el-row>

    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
import { Filter } from '@element-plus/icons-vue';
import request from '../utils/request';

const tData = ref([]);
const pType = ref('day');
const isServerOnline = ref(false);
const isEdgeOnline = ref(false);

const hasAnomaly = ref(false);
const deviceOptions = ref([]);
const selectedDevices = ref([]);

let bc = null;
let lc = null;
let mainTimer = null;
let connTimer = null;

const totalDevices = computed(() => deviceOptions.value.length);
const onlineDevices = computed(() => deviceOptions.value.filter(d => d.status === 'ONLINE').length);
const offlineDevices = computed(() => deviceOptions.value.filter(d => d.status === 'OFFLINE').length);

const getVal = (obj, key) => {
  if (!obj) return null;
  const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  return obj[key] !== undefined ? obj[key] : obj[snakeKey];
};

const safeExtract = (res) => {
  if (!res) return [];
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
};

const loadDeviceOptions = async () => {
  try {
    const res = await request.get('/device/list');
    deviceOptions.value = safeExtract(res);
    let changed = false;
    const newSelected = selectedDevices.value.filter(id => {
      const dev = deviceOptions.value.find(d => d.deviceId === id);
      if (dev && dev.status === 'OFFLINE') { changed = true; return false; }
      return true;
    });
    if (changed) {
      selectedDevices.value = newSelected;
      ElMessage.warning('⚠️ 检测到您当前选中的部分设备已离线，已自动将其从图表视图中移除！');
      handleFilterChange();
    }
  } catch (error) { console.error('获取设备列表失败'); }
};

const handleFilterChange = () => { refreshData(); loadChart(); };

const loadChart = async () => {
  if (!bc) return;
  bc.showLoading();
  try {
    const deviceIdsParam = selectedDevices.value.length > 0 ? selectedDevices.value.join(',') : '';
    const r = await request.get(`/data/chart?type=${pType.value}&deviceIds=${deviceIdsParam}`);
    const rawData = safeExtract(r);
    let xCategories = []; let yData = []; let dataMap = {};

    if (pType.value === 'day') {
      for (let i = 0; i < 24; i++) { xCategories.push(`${i.toString().padStart(2, '0')}:00`); dataMap[i.toString().padStart(2, '0')] = 0; }
    } else if (pType.value === 'week') {
      xCategories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      dataMap = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '0': 0 };
    } else if (pType.value === 'month') {
      for (let i = 1; i <= 12; i++) { xCategories.push(`${i}月`); dataMap[i.toString()] = 0; dataMap[i.toString().padStart(2,'0')] = 0; }
    } else if (pType.value === 'year') {
      const currentYear = new Date().getFullYear();
      for (let i = 4; i >= 0; i--) { xCategories.push(`${currentYear - i}年`); dataMap[(currentYear - i).toString()] = 0; }
    }

    rawData.forEach(item => {
      const key = String(item.period || item.PERIOD);
      if (dataMap[key] !== undefined) dataMap[key] = parseFloat(item.energy || item.ENERGY) || 0;
    });

    if (pType.value === 'day') { for (let i = 0; i < 24; i++) yData.push(dataMap[i.toString().padStart(2, '0')]);
    } else if (pType.value === 'week') { yData = [dataMap['1'], dataMap['2'], dataMap['3'], dataMap['4'], dataMap['5'], dataMap['6'], dataMap['0']];
    } else if (pType.value === 'month') { for (let i = 1; i <= 12; i++) yData.push(dataMap[i.toString()] || dataMap[i.toString().padStart(2,'0')]);
    } else if (pType.value === 'year') { const currentYear = new Date().getFullYear(); for (let i = 4; i >= 0; i--) yData.push(dataMap[(currentYear - i).toString()]); }

    bc.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '10%', right: '4%', bottom: '15%', top: '15%' },
      xAxis: { type: 'category', data: xCategories, axisLabel: { interval: 0, rotate: pType.value === 'day' ? 45 : 0, color: '#666' } },
      yAxis: { type: 'value', scale: true, name: 'Wh', splitLine: { lineStyle: { type: 'dashed' } } },
      series: [{ type: 'bar', data: yData, showBackground: true, itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#409EFF' }, { offset: 1, color: '#a0cfff' }]) } }]
    }, true);
  } catch (e) { console.error("柱状图加载失败", e); } finally { bc.hideLoading(); }
};

const refreshData = async () => {
  try {
    const deviceIdsParam = selectedDevices.value.length > 0 ? selectedDevices.value.join(',') : '';
    const r = await request.get(`/data/history?deviceIds=${deviceIdsParam}`);
    tData.value = safeExtract(r);
    isServerOnline.value = true;

    const rawLiveItems = tData.value.filter(i => getVal(i, 'isAnomaly') === 3);
    hasAnomaly.value = rawLiveItems.slice(0, 15).some(i => getVal(i, 'power') < 100);

    if (lc && rawLiveItems.length > 0) {
      const sortedLive = [...rawLiveItems].sort((a, b) => new Date(getVal(a, 'createTime')) - new Date(getVal(b, 'createTime')));
      const bucketMap = new Map();
      const onlineDevIds = deviceOptions.value.filter(d => d.status === 'ONLINE').map(d => d.deviceId);

      sortedLive.forEach(item => {
        const timeStr = getVal(item, 'createTime');
        const devId = getVal(item, 'deviceId');
        const power = getVal(item, 'power');
        if (!timeStr || !devId) return;

        const timeStamp = new Date(timeStr).getTime();
        const bucketTime = Math.floor(timeStamp / 2000) * 2000;

        if (!bucketMap.has(bucketTime)) {
          const dateObj = new Date(bucketTime);
          const hh = String(dateObj.getHours()).padStart(2, '0');
          const mm = String(dateObj.getMinutes()).padStart(2, '0');
          const ss = String(dateObj.getSeconds()).padStart(2, '0');
          bucketMap.set(bucketTime, { label: `${hh}:${mm}:${ss}`, data: {} });
        }
        bucketMap.get(bucketTime).data[devId] = parseFloat(power.toFixed(2));
      });

      const sortedBuckets = Array.from(bucketMap.keys()).sort().slice(-15);
      const times = []; const deviceSeriesData = {}; const totalPowerData = []; const lastValTracker = {};
      const activeDevs = new Set();

      sortedBuckets.forEach(bTime => Object.keys(bucketMap.get(bTime).data).forEach(id => activeDevs.add(id)));
      activeDevs.forEach(id => { deviceSeriesData[id] = []; lastValTracker[id] = null; });

      sortedBuckets.forEach(bTime => {
        const bucket = bucketMap.get(bTime);
        times.push(bucket.label);
        let currentTotal = 0; let hasValidDataInBucket = false;

        activeDevs.forEach(devId => {
          if (!onlineDevIds.includes(devId)) lastValTracker[devId] = null;
          else if (bucket.data[devId] !== undefined) lastValTracker[devId] = bucket.data[devId];
          deviceSeriesData[devId].push(lastValTracker[devId]);
          if (lastValTracker[devId] !== null) { currentTotal += lastValTracker[devId]; hasValidDataInBucket = true; }
        });
        totalPowerData.push(hasValidDataInBucket ? parseFloat(currentTotal.toFixed(2)) : null);
      });

      const series = []; const legendData = [];
      const sortedDevIds = Object.keys(deviceSeriesData).sort();

      sortedDevIds.forEach(devId => {
        legendData.push(devId);
        series.push({
          name: devId,
          type: 'line',
          yAxisIndex: 0,
          smooth: true, // 🌟 恢复平滑曲线
          symbol: 'none',
          connectNulls: true,
          data: deviceSeriesData[devId],
          lineStyle: { width: 2 }
        });
      });

      legendData.push('⭐ 实时汇总总功率');
      series.push({ name: '⭐ 实时汇总总功率', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none', connectNulls: true, data: totalPowerData, lineStyle: { width: 4, type: 'dashed', color: '#F56C6C' }, itemStyle: { color: '#F56C6C' }, z: 10 });

      lc.setOption({
        animation: false, // 🌟 关闭动画，保持瞬间跳动刷新
        tooltip: { trigger: 'axis' },
        legend: { data: legendData, bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
        grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: times, axisLabel: { color: '#999' } },
        yAxis: [
          { type: 'value', name: '单点 (W)', splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } } },
          { type: 'value', name: '总计 (W)', splitLine: { show: false }, axisLabel: { color: '#F56C6C', fontWeight: 'bold' } }
        ],
        series: series
      }, false);
    }
    if (tData.value.some(i => getVal(i, 'isAnomaly') < 3)) loadChart();
  } catch (e) { isServerOnline.value = false; }
};

const checkConn = async () => {
  try {
    const res = await request.get('/data/connectionStatus');
    isEdgeOnline.value = res.online !== undefined ? res.online : (res.data && res.data.online);
  } catch (e) { isEdgeOnline.value = false; }
};

const handleResize = () => { bc?.resize(); lc?.resize(); };

onMounted(() => {
  bc = echarts.init(document.getElementById('bChart'));
  lc = echarts.init(document.getElementById('lChart'));
  lc.setOption({ xAxis: { type: 'category', data: [] }, yAxis: [{ type: 'value' }, { type: 'value' }], series: [] });
  bc.setOption({ xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [] });

  loadDeviceOptions().then(() => { refreshData(); loadChart(); });
  checkConn();

  mainTimer = setInterval(refreshData, 2000);
  connTimer = setInterval(() => { checkConn(); loadDeviceOptions(); }, 5000);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  clearInterval(mainTimer);
  clearInterval(connTimer);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
#bChart, #lChart { transition: all 0.3s; }
</style>