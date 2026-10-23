<template>
  <view
    class="detail-page"
    :class="{ 'detail-page--fullscreen': fullscreen }"
  >
    <view class="detail-topbar">
      <button
        class="icon-button"
        hover-class="none"
        aria-label="返回"
        @tap="back"
      >
        <ArrowLeft :size="22" />
      </button>
      <view>
        <text>穿搭详情</text>
        <text>{{ outfit?.date || '未找到记录' }}</text>
      </view>
      <button
        class="top-text-button"
        hover-class="none"
        aria-label="全屏"
        @tap="toggleFullscreen"
      >
        全屏
      </button>
    </view>

    <view
      v-if="outfit"
      class="detail-content"
    >
      <view
        id="diaryDetailCanvas"
        class="outfit-canvas"
        :class="{ 'outfit-canvas--active': activeTarget === 'canvas' }"
        @tap="selectCanvas"
        @touchstart="startCanvasGesture"
        @touchmove.stop.prevent="moveGesture"
        @touchend="endGesture"
        @touchcancel="endGesture"
      >
        <button
          class="canvas-fullscreen"
          hover-class="none"
          @tap.stop="toggleFullscreen"
          @touchstart.stop
        >
          <text>{{ fullscreen ? '退出' : '全屏' }}</text>
        </button>
        <view
          class="preview-stage"
          :style="previewStageStyle"
        >
          <view
            v-for="slot in visibleOutfitSlots(outfit)"
            :key="slot.key"
            class="preview-layer"
            :class="[`preview-layer--${slot.key}`, { active: activeTarget === slot.key }]"
            :style="previewLayerStyle(slot.key)"
            @tap.stop="selectCanvasItem(slot.key)"
            @touchstart.stop="startItemGesture(slot.key, $event)"
            @touchmove.stop.prevent="moveGesture"
            @touchend.stop="endGesture"
            @touchcancel.stop="endGesture"
          >
            <view
              v-if="fullscreen && activeTarget === slot.key"
              class="layer-chip"
            >
              <text>{{ slot.label }}</text>
            </view>
            <image
              v-if="resolveSlot(outfit, slot.key)?.image"
              :src="resolvePhoto(resolveSlot(outfit, slot.key).image)"
              mode="aspectFit"
            />
          </view>
        </view>
        <view class="canvas-chip">
          <text>{{ gestureHint }}</text>
        </view>
      </view>

      <view class="detail-tools">
        <view>
          <text>{{ gestureTitle }}</text>
          <text>{{ fullscreen ? '调整会自动保存到这条日记' : '进入全屏后更方便微调' }}</text>
        </view>
        <view class="tool-actions">
          <view class="mode-switch">
            <button
              :class="{ active: editMode === 'item' }"
              hover-class="none"
              @tap="setEditMode('item')"
            >
              单件
            </button>
            <button
              :class="{ active: editMode === 'canvas' }"
              hover-class="none"
              @tap="setEditMode('canvas')"
            >
              整体
            </button>
          </view>
          <button
            class="reset-layout"
            hover-class="none"
            @tap="resetActiveLayout"
          >
            <RotateCcw :size="15" />
            <text>重置</text>
          </button>
        </view>
      </view>

      <view class="info-panel">
        <view class="info-title">
          <view>
            <text>{{ outfit.occasion }}</text>
            <text>{{ outfit.note || detailTip }}</text>
          </view>
          <view>
            <CalendarDays :size="17" />
            <text>{{ outfit.date }}</text>
          </view>
        </view>

        <view class="item-list">
          <view
            v-for="slot in slots"
            :key="slot.key"
            class="item-row"
          >
            <view>
              <text>{{ slot.label }}</text>
              <text>{{ resolveSlot(outfit, slot.key)?.title || '未记录' }}</text>
            </view>
            <view>
              <text>{{ wearText(resolveSlot(outfit, slot.key)) }}</text>
              <text>{{ costText(resolveSlot(outfit, slot.key)) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <button
      v-else
      class="empty-detail"
      hover-class="none"
      @tap="back"
    >
      <Sparkles :size="36" />
      <text>这套穿搭没有找到</text>
      <text>返回日记重新选择</text>
    </button>
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ArrowLeft, CalendarDays, RotateCcw, Sparkles } from '@/components/icons'
import { useUserStore } from '@/stores'
import { findOutfit, getCostPerWear, getItems, getWardrobeState, itemTypes, updateOutfit } from '@/utils/wardrobe-data'
import { resolveAttachmentUrl } from '@/utils/file-upload'
import { formatCurrency } from '@/utils/common'
import { getDiaryTip } from '@/utils/outfit-tips'

const CloudSyncKey = 'StyleBoard-Cloud-Sync'
const userStore = useUserStore()
const outfitId = ref('')
const outfit = ref(null)
const items = ref([])
const fullscreen = ref(false)
const editMode = ref('item')
const activeType = ref('top')
const activeTarget = ref('top')
const canvasRect = ref(null)
const slots = itemTypes
const fallbackLayout = {
  top: { x: 50, y: 25, scale: 100, z: 3 },
  bottom: { x: 50, y: 54, scale: 100, z: 2 },
  shoes: { x: 50, y: 80, scale: 100, z: 1 }
}
const fallbackCanvasLayout = { x: 0, y: 0, scale: 100 }
const canvasLayout = reactive({ ...fallbackCanvasLayout })
const itemLayouts = reactive(cloneLayout(fallbackLayout))
const detailTip = computed(() => getDiaryTip({ count: items.value.length }))
const activeTypeMeta = computed(() => slots.find((slot) => slot.key === activeType.value) || slots[0])
const gestureTitle = computed(() => editMode.value === 'canvas' ? '整体模式' : activeTypeMeta.value.label)
const gestureHint = computed(() => (
  editMode.value === 'canvas'
    ? '任意位置：移动 / 捏合整张图'
    : '点中单品：移动 / 捏合单品'
))
const previewStageStyle = computed(() => (
  `transform: translate(${canvasLayout.x}%, ${canvasLayout.y}%) scale(${canvasLayout.scale / 100})`
))
let gestureState = null

function cloneLayout (layout = {}) {
  return itemTypes.reduce((next, type) => {
    next[type.key] = {
      ...fallbackLayout[type.key],
      ...(layout[type.key] || {})
    }
    return next
  }, {})
}

function refresh () {
  items.value = getItems()
  outfit.value = findOutfit(outfitId.value)
  hydrateLayouts()
}

function back () {
  uni.navigateBack()
}

function hydrateLayouts () {
  const saved = outfit.value?.collageLayout || {}
  Object.assign(canvasLayout, { ...fallbackCanvasLayout, ...(saved.canvas || {}) })
  Object.assign(itemLayouts, cloneLayout(saved.items || saved))
  if (!isOutfitSlotVisible(outfit.value, activeTarget.value)) activeTarget.value = 'canvas'
  nextTick(measureCanvas)
}

function resolvePhoto (path) {
  return resolveAttachmentUrl(path)
}

function resolveSlot (targetOutfit, type) {
  return targetOutfit?.snapshot?.[type] || items.value.find((item) => item.id === targetOutfit?.itemIds?.[type]) || null
}

function isOutfitSlotVisible (targetOutfit, type) {
  return targetOutfit?.collageLayout?.visibility?.[type] !== false
}

function visibleOutfitSlots (targetOutfit) {
  return slots.filter((slot) => isOutfitSlotVisible(targetOutfit, slot.key))
}

function previewLayerStyle (type) {
  const layout = itemLayouts[type] || fallbackLayout[type]
  return [
    `left: ${layout.x}%`,
    `top: ${layout.y}%`,
    `z-index: ${editMode.value === 'item' && activeType.value === type ? 20 : layout.z}`,
    `transform: translate(-50%, -50%) scale(${layout.scale / 100})`
  ].join(';')
}

function wearText (item) {
  return item ? `已穿 ${item.wearCount || 0} 次` : '未记录'
}

function costText (item) {
  const cost = getCostPerWear(item)
  return cost ? `${formatCurrency(cost)}/次` : '单次未计算'
}

function clamp (value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

function getTouchPoints (event) {
  return Array.from(event?.touches || []).map((source) => ({
    x: Number(source.clientX || source.pageX || 0),
    y: Number(source.clientY || source.pageY || 0)
  }))
}

function getGestureCenter (points) {
  if (!points.length) return null
  const total = points.reduce((sum, point) => ({
    x: sum.x + point.x,
    y: sum.y + point.y
  }), { x: 0, y: 0 })
  return {
    x: total.x / points.length,
    y: total.y / points.length
  }
}

function getGestureDistance (points) {
  if (points.length < 2) return 0
  const [first, second] = points
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function measureCanvas () {
  return new Promise((resolve) => {
    uni.createSelectorQuery()
      .select('#diaryDetailCanvas')
      .boundingClientRect((rect) => {
        if (rect?.width && rect?.height) canvasRect.value = rect
        resolve(canvasRect.value)
      })
      .exec()
  })
}

function selectCanvas () {
  editMode.value = 'canvas'
  activeTarget.value = 'canvas'
}

function selectCanvasItem (type) {
  if (editMode.value === 'canvas') {
    activeTarget.value = 'canvas'
    return
  }
  activeType.value = type
  activeTarget.value = type
}

function setEditMode (mode) {
  editMode.value = mode
  activeTarget.value = mode === 'canvas' || !isOutfitSlotVisible(outfit.value, activeType.value) ? 'canvas' : activeType.value
}

function toggleFullscreen () {
  fullscreen.value = !fullscreen.value
  nextTick(measureCanvas)
}

async function startGesture (target, event) {
  const points = getTouchPoints(event)
  const center = getGestureCenter(points)
  if (!center) return
  const rect = canvasRect.value || await measureCanvas()
  if (!rect) return
  const isCanvas = target === 'canvas'
  const layout = isCanvas ? canvasLayout : itemLayouts[target]
  gestureState = {
    target,
    isCanvas,
    startCenterX: center.x,
    startCenterY: center.y,
    startDistance: getGestureDistance(points),
    startX: layout.x,
    startY: layout.y,
    startScale: layout.scale,
    width: rect.width,
    height: rect.height
  }
}

function startCanvasGesture (event) {
  editMode.value = 'canvas'
  activeTarget.value = 'canvas'
  startGesture('canvas', event)
}

function startItemGesture (type, event) {
  if (editMode.value === 'canvas') {
    activeTarget.value = 'canvas'
    startGesture('canvas', event)
    return
  }
  activeType.value = type
  activeTarget.value = type
  startGesture(type, event)
}

function moveGesture (event) {
  if (!gestureState) return
  const points = getTouchPoints(event)
  const center = getGestureCenter(points)
  if (!center) return
  const targetLayout = gestureState.isCanvas ? canvasLayout : itemLayouts[gestureState.target]
  const dx = ((center.x - gestureState.startCenterX) / gestureState.width) * 100
  const dy = ((center.y - gestureState.startCenterY) / gestureState.height) * 100
  targetLayout.x = clamp(
    gestureState.startX + dx,
    gestureState.isCanvas ? -70 : -35,
    gestureState.isCanvas ? 70 : 135
  )
  targetLayout.y = clamp(
    gestureState.startY + dy,
    gestureState.isCanvas ? -70 : -35,
    gestureState.isCanvas ? 70 : 135
  )

  if (points.length >= 2 && gestureState.startDistance > 0) {
    const nextScale = gestureState.startScale * (getGestureDistance(points) / gestureState.startDistance)
    targetLayout.scale = clamp(nextScale, gestureState.isCanvas ? 55 : 35, gestureState.isCanvas ? 240 : 240)
  }
}

async function syncIfNeeded () {
  if (userStore.isGuest) return
  if (uni.getStorageSync(CloudSyncKey) !== '1') return
  try {
    await userStore.saveStyleData(getWardrobeState())
  } catch {
    // 日记详情的拖拽保存不打断用户操作。
  }
}

function saveDetailLayout () {
  if (userStore.isGuest) return
  if (!outfit.value) return
  const next = updateOutfit(outfit.value.id, {
    collageLayout: {
      ...(outfit.value.collageLayout || {}),
      canvas: { ...canvasLayout },
      items: cloneLayout(itemLayouts)
    }
  })
  if (next) outfit.value = next
  syncIfNeeded()
}

function endGesture () {
  if (!gestureState) return
  saveDetailLayout()
  gestureState = null
}

function resetActiveLayout () {
  if (editMode.value === 'canvas' || activeTarget.value === 'canvas') {
    Object.assign(canvasLayout, fallbackCanvasLayout)
  } else {
    itemLayouts[activeType.value] = { ...fallbackLayout[activeType.value] }
  }
  saveDetailLayout()
}

onLoad((query = {}) => {
  outfitId.value = query.id || ''
  refresh()
})

onShow(refresh)
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 20rpx) 30rpx calc(52rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #fbfaf6 0%, #edf5f0 50%, #f8f3ee 100%);
  color: #18211d;
}

.detail-page--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999;
  padding: calc(var(--status-bar-height) + 18rpx) 24rpx 24rpx;
  overflow: hidden;
}

.detail-page--fullscreen .detail-content {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--status-bar-height) - 42rpx);
}

.detail-page--fullscreen .info-panel {
  display: none;
}

.detail-page--fullscreen .detail-topbar {
  display: none;
}

.detail-page--fullscreen .outfit-canvas {
  flex: 1;
  height: auto;
  min-height: 0;
  margin-top: 0;
  border-radius: 32rpx;
}

.detail-page--fullscreen .detail-tools {
  flex: 0 0 auto;
  margin-top: 18rpx;
  margin-bottom: 0;
}

.detail-topbar {
  display: grid;
  grid-template-columns: 76rpx minmax(0, 1fr) 76rpx;
  align-items: center;
}

.detail-topbar view text {
  display: block;
  text-align: center;
}

.detail-topbar view text:first-child {
  font-size: 31rpx;
  font-weight: 900;
  line-height: 1.25;
}

.detail-topbar view text:last-child {
  margin-top: 6rpx;
  color: #76817b;
  font-size: 22rpx;
}

.icon-button,
.top-text-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 68rpx;
  border-radius: 20rpx;
  color: #20372f;
}

.icon-button {
  width: 68rpx;
}

.top-text-button {
  width: 76rpx;
  justify-self: end;
  background: rgba(255, 255, 255, 0.68);
  font-size: 22rpx;
  font-weight: 850;
}

.icon-button::after,
.top-text-button::after {
  border: 0;
}

.detail-content {
  margin-top: 24rpx;
}

.outfit-canvas {
  position: relative;
  height: 760rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.08);
  border-radius: 38rpx;
  background:
    linear-gradient(90deg, rgba(33, 47, 40, 0.045) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(33, 47, 40, 0.045) 1rpx, transparent 1rpx),
    radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.9), transparent 34%),
    #f8f7f1;
  background-size: 58rpx 58rpx, 58rpx 58rpx, 100% 100%, 100% 100%;
  box-shadow: 0 24rpx 70rpx rgba(39, 50, 45, 0.11);
  touch-action: none;
  overflow: hidden;
}

.outfit-canvas--active {
  box-shadow:
    inset 0 0 0 3rpx rgba(215, 109, 77, 0.16),
    0 24rpx 70rpx rgba(39, 50, 45, 0.11);
}

.preview-stage {
  position: absolute;
  inset: 0;
  transform-origin: center center;
}

.preview-layer {
  position: absolute;
  width: 470rpx;
  height: 236rpx;
  transform-origin: center center;
  will-change: left, top, transform;
}

.preview-layer.active {
  filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
}

.preview-layer image {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 20rpx 22rpx rgba(26, 31, 28, 0.14));
}

.preview-layer--bottom image {
  height: 276rpx;
}

.preview-layer--shoes image {
  width: 440rpx;
  height: 190rpx;
}

.layer-chip {
  position: absolute;
  left: 50%;
  top: -16rpx;
  z-index: 8;
  padding: 9rpx 14rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.06);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.8);
  color: #20372f;
  font-size: 22rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 24rpx rgba(31, 40, 36, 0.06);
  transform: translateX(-50%);
  backdrop-filter: blur(14px);
}

.canvas-chip {
  position: absolute;
  right: 22rpx;
  bottom: 20rpx;
  z-index: 20;
  padding: 10rpx 16rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.06);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  color: #738079;
  font-size: 21rpx;
  line-height: 1.25;
  backdrop-filter: blur(12px);
}

.canvas-fullscreen {
  position: absolute;
  right: 22rpx;
  top: 20rpx;
  z-index: 24;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 54rpx;
  padding: 0 22rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.08);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.82);
  color: #20372f;
  font-size: 22rpx;
  font-weight: 850;
  box-shadow: 0 10rpx 22rpx rgba(31, 40, 36, 0.09);
  backdrop-filter: blur(14px);
}

.canvas-fullscreen::after {
  border: 0;
}

.info-panel {
  margin-top: 22rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(16px);
}

.detail-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
}

.detail-tools > view:first-child {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
}

.detail-tools > view:first-child text:first-child {
  color: #25312c;
  font-size: 25rpx;
  font-weight: 900;
  line-height: 1.22;
}

.detail-tools > view:first-child text:last-child {
  margin-top: 5rpx;
  overflow: hidden;
  color: #7a8580;
  font-size: 21rpx;
  line-height: 1.22;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10rpx;
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 5rpx;
  border-radius: 999rpx;
  background: rgba(32, 55, 47, 0.08);
}

.mode-switch button {
  min-width: 68rpx;
  height: 44rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  color: #66726d;
  font-size: 21rpx;
  font-weight: 850;
  line-height: 44rpx;
}

.mode-switch button.active {
  background: #20372f;
  color: #fff;
}

.mode-switch button::after,
.reset-layout::after {
  border: 0;
}

.reset-layout {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 52rpx;
  padding: 0 18rpx;
  border: 1rpx solid rgba(32, 55, 47, 0.12);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.64);
  color: #3e685b;
  font-size: 23rpx;
  font-weight: 850;
}

.info-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.info-title text {
  display: block;
}

.info-title > view:first-child {
  min-width: 0;
}

.info-title > view:first-child text:first-child {
  color: #25312c;
  font-size: 31rpx;
  font-weight: 900;
}

.info-title > view:first-child text:last-child {
  margin-top: 8rpx;
  color: #738079;
  font-size: 23rpx;
  line-height: 1.4;
}

.info-title > view:last-child {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8rpx;
  color: #3e685b;
  font-size: 22rpx;
  font-weight: 850;
}

.item-list {
  margin-top: 20rpx;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 18rpx 0;
  border-top: 1rpx solid rgba(36, 53, 45, 0.07);
}

.item-row text {
  display: block;
}

.item-row > view:first-child {
  min-width: 0;
}

.item-row > view:first-child text:first-child,
.item-row > view:last-child text:first-child {
  color: #25312c;
  font-size: 24rpx;
  font-weight: 900;
}

.item-row > view:first-child text:last-child,
.item-row > view:last-child text:last-child {
  margin-top: 6rpx;
  color: #7d8681;
  font-size: 21rpx;
}

.item-row > view:last-child {
  flex: 0 0 auto;
  text-align: right;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 620rpx;
  margin-top: 30rpx;
  border: 1rpx dashed rgba(32, 55, 47, 0.16);
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.5);
  color: #7d8681;
}

.empty-detail::after {
  border: 0;
}

.empty-detail text {
  display: block;
  margin-top: 18rpx;
  font-size: 26rpx;
  font-weight: 850;
}

.empty-detail text:last-child {
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
}
</style>
