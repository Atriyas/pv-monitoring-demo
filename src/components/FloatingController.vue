<template>
  <div>
    <div class="fab-container" :style="{ left: pos.x + 'px', top: pos.y + 'px' }" @mousedown="startDrag" @touchstart="startDrag" title="拖拽移动，点击打开控制台">
      <div class="fab-button" :class="{ 'is-dragging': isDragging }"><el-icon :size="28" color="#fff"><Operation /></el-icon></div>
    </div>
    <el-dialog v-model="dialogVisible" title="🎛️ 全局仿真控制中心" width="480px" append-to-body destroy-on-close>
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #606266;">🎆 目标节点：</div>
        <el-select v-model="selectedTargets" multiple clearable collapse-tags placeholder="默认对【全网设备】下发指令" style="width: 100%">
          <el-option v-for="d in deviceOptions" :key="d.deviceId" :label="d.deviceName + ' (' + d.deviceId + ')'" :value="d.deviceId" />
        </el-select>
        <div style="font-size: 12px; color: #909399; margin-top: 8px;">* 提示：如果不选择具体设备，以下指令将产生全网范围的全局影响。</div>
      </div>
      <el-divider border-style="dashed" />
      <div style="margin-bottom: 25px;">
        <div style="font-weight: bold; margin-bottom: 12px; color: #E6A23C; display: flex; align-items: center;">
          <el-icon style="font-size: 18px; margin-right: 6px;"><Sun /></el-icon><span>物理工况注入</span>
        </div>
        <el-row :gutter="12">
          <el-col :span="12" style="margin-bottom: 12px;"><el-button type="info" @click="setMode('CLOUDY')" style="width: 100%; height: 40px; font-weight: bold;">☁️ 模拟云层</el-button></el-col>
          <el-col :span="12" style="margin-bottom: 12px;"><el-button type="warning" @click="setMode('DIRTY')" style="width: 100%; height: 40px; font-weight: bold;">💬 模拟遮挡</el-button></el-col>
          <el-col :span="12"><el-button type="danger" @click="setMode('FAULT')" style="width: 100%; height: 40px; font-weight: bold;">🛜 线路故障</el-button></el-col>
          <el-col :span="12"><el-button type="success" @click="setMode('NORMAL')" style="width: 100%; height: 40px; font-weight: bold;">✅ 物理复位</el-button></el-col>
        </el-row>
      </div>
      <el-divider border-style="dashed" style="margin: 15px 0;" />
      <div style="margin-top: 5px;">
        <div style="font-weight: bold; margin-bottom: 12px; color: #F56C6C; display: flex; align-items: center;">
          <el-icon style="font-size: 18px; margin-right: 6px;"><Radar /></el-icon><span>网络通讯故障注入</span>
        </div>
        <div style="display: flex; gap: 12px;">
          <el-button type="danger" plain @click="simulateNetwork(true)" style="flex: 1; height: 40px; font-weight: bold;"><el-icon style="margin-right: 5px;"><Close /></el-icon> 强制断网</el-button>
          <el-button type="success" plain @click="simulateNetwork(false)" style="flex: 1; height: 40px; font-weight: bold;"><el-icon style="margin-right: 5px;"><Connection /></el-icon> 恢复通讯</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Operation, Close, Connection } from '@element-plus/icons-vue'
import request from '../utils/request'

const dialogVisible = ref(false)
const deviceOptions = ref([])
const selectedTargets = ref([])
const pos = reactive({ x: window.innerWidth - 80, y: window.innerHeight - 100 })
const isDragging = ref(false)
let startPos = { x: 0, y: 0 }
let startMouse = { x: 0, y: 0 }
let hasMoved = false

const clampPosition = () => { pos.x = Math.max(0, Math.min(window.innerWidth - 60, pos.x)); pos.y = Math.max(0, Math.min(window.innerHeight - 60, pos.y)) }
const handleResize = () => { clampPosition() }

const startDrag = (e) => {
  if (e.type === 'mousedown' && e.button !== 0) return
  e.preventDefault()
  isDragging.value = true; hasMoved = false
  const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
  const cy = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
  startPos = { x: pos.x, y: pos.y }; startMouse = { x: cx, y: cy }
  document.addEventListener('mousemove', onDrag); document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag); document.addEventListener('touchend', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return; e.preventDefault()
  const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
  const cy = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
  const dx = cx - startMouse.x, dy = cy - startMouse.y
  if (Math.sqrt(dx * dx + dy * dy) > 5) hasMoved = true
  pos.x = startPos.x + dx; pos.y = startPos.y + dy; clampPosition()
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag); document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', stopDrag); document.removeEventListener('touchend', stopDrag)
  if (!hasMoved) openConsole()
}

const openConsole = async () => {
  try { const res = await request.get('/device/list'); deviceOptions.value = Array.isArray(res.data) ? res.data : [] } catch (e) {}
  dialogVisible.value = true
}

const setMode = async (m) => {
  const ids = selectedTargets.value.join(',')
  await request.get('/data/setMode?mode=' + m + '&deviceIds=' + ids)
  ElMessage.success('物理工况下发成功: ' + m)
}

const simulateNetwork = async (isBlocked) => {
  if (selectedTargets.value.length === 0) return ElMessage.warning('进行网络模拟时，必须先在上方选择具体的目标节点！')
  await Promise.all(selectedTargets.value.map(id => request.get('/device/simulateDisconnect?deviceId=' + id + '&isBlocked=' + isBlocked)))
  ElMessage.success('网络工况下发成功：已' + (isBlocked ? '断开' : '恢复') + '所选节点通讯')
}

onMounted(() => { window.addEventListener('resize', handleResize) })
onUnmounted(() => { window.removeEventListener('resize', handleResize) })
</script>

<style scoped>
.fab-container { position: fixed; z-index: 9999; width: 56px; height: 56px; cursor: pointer; user-select: none; }
.fab-button { width: 100%; height: 100%; background: linear-gradient(135deg, #409EFF, #3a8ee6); border-radius: 50%; box-shadow: 0 4px 12px rgba(64,158,255,0.4); display: flex; justify-content: center; align-items: center; transition: transform 0.2s, box-shadow 0.2s; }
.fab-button:hover { transform: scale(1.08); box-shadow: 0 6px 16px rgba(64,158,255,0.6); }
.fab-button.is-dragging { transition: none !important; transform: scale(1.05); box-shadow: 0 8px 20px rgba(64,158,255,0.7); cursor: grabbing; }
</style>
