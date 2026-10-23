<template>
  <view
    class="style-page"
    :class="{ 'style-page--fullscreen': isFullscreen }"
  >
    <view class="hero-gradient" />

    <view class="style-header">
      <view>
        <text class="app-title">
          搭搭衣橱
        </text>
        <text class="app-subtitle">
          手动上传，先搭一套再出门
        </text>
      </view>
      <view class="header-actions">
        <button
          v-if="!isGuest"
          class="round-icon"
          hover-class="none"
          aria-label="上传单品"
          @tap="openAdd"
        >
          <ImagePlus :size="19" />
        </button>
        <button
          class="round-icon"
          hover-class="none"
          aria-label="更多"
          @tap="openMore"
        >
          <MoreHorizontal :size="19" />
        </button>
      </view>
    </view>

    <view class="workbench">
      <view class="section-title">
        <text>今日组合</text>
        <text>{{ wearSummary }}</text>
      </view>

      <view
        id="outfitCanvas"
        class="outfit-canvas"
        :class="{ 'outfit-canvas--active': activeTarget === 'canvas' }"
        @tap="selectCanvas"
        @touchstart="startCanvasGesture"
        @touchmove.stop.prevent="moveGesture"
        @touchend="endGesture"
        @touchcancel="endGesture"
      >
        <view
          class="collage-stage"
          :style="collageStageStyle"
        >
          <view
            v-for="slot in visibleSlots"
            :key="slot.key"
            class="collage-layer"
            :class="{ active: activeTarget === slot.key }"
            :style="collageItemStyle(slot.key)"
            @tap.stop="selectCanvasItem(slot.key)"
            @touchstart.stop="startItemGesture(slot.key, $event)"
            @touchmove.stop.prevent="moveGesture"
            @touchend.stop="endGesture"
            @touchcancel.stop="endGesture"
          >
            <button
              v-if="activeTarget === slot.key"
              class="canvas-visibility"
              hover-class="none"
              :aria-label="`${slot.label}隐藏`"
              @tap.stop="toggleSlotVisible(slot.key)"
              @touchstart.stop
            >
              <EyeOff :size="16" />
            </button>
            <view class="slot-copy">
              <text>{{ slot.label }}</text>
              <view />
              <text>{{ selectedItems[slot.key]?.title || '待选择' }}</text>
            </view>
            <view class="slot-photo">
              <image
                v-if="selectedItems[slot.key]?.image"
                :class="`slot-image slot-image--${slot.key}`"
                :src="resolvePhoto(selectedItems[slot.key].image)"
                mode="aspectFit"
              />
              <view
                v-else
                class="empty-photo"
              >
                <ImagePlus :size="24" />
                <text>添加{{ slot.label }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="canvas-hint">
          <text>{{ gestureHint }}</text>
        </view>
      </view>

      <view class="upload-note">
        <Sparkles :size="17" />
        <text>{{ builderTip }}</text>
      </view>

      <view class="gesture-tools">
        <view class="gesture-copy">
          <text>{{ gestureTitle }}</text>
          <text>{{ gestureHint }}</text>
        </view>
        <view class="gesture-actions">
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
            class="fullscreen-toggle"
            hover-class="none"
            @tap="toggleFullscreen"
          >
            <text>{{ isFullscreen ? '退出' : '全屏' }}</text>
          </button>
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

      <view class="slot-switcher">
        <view
          v-for="slot in slots"
          :key="slot.key"
          class="slot-toggle-card"
          :class="{ active: activeType === slot.key, muted: !slotVisibility[slot.key] }"
          @tap="selectTraySlot(slot.key)"
        >
          <view class="slot-toggle-thumb">
            <image
              v-if="selectedItems[slot.key]?.image"
              :src="resolvePhoto(selectedItems[slot.key].image)"
              mode="aspectFit"
            />
            <ImagePlus
              v-else
              :size="20"
            />
            <button
              class="slot-eye"
              hover-class="none"
              :aria-label="slotVisibility[slot.key] ? `${slot.label}隐藏` : `${slot.label}显示`"
              @tap.stop="toggleSlotVisible(slot.key)"
            >
              <Eye
                v-if="slotVisibility[slot.key]"
                :size="15"
              />
              <EyeOff
                v-else
                :size="15"
              />
            </button>
          </view>
          <text>{{ slot.shortLabel }}</text>
        </view>
      </view>

      <view class="tray-head">
        <view class="segments">
          <button
            v-for="item in slots"
            :key="item.key"
            :class="{ active: activeType === item.key }"
            hover-class="none"
            @tap="selectTraySlot(item.key)"
          >
            {{ item.label }}
          </button>
        </view>
        <button
          class="shuffle"
          hover-class="none"
          @tap="shuffleOutfit"
        >
          <RefreshCw :size="15" />
          <text>换一套</text>
        </button>
      </view>

      <scroll-view
        scroll-x
        class="item-tray"
        show-scrollbar="false"
      >
        <button
          v-for="item in activeItems"
          :key="item.id"
          class="mini-card"
          :class="{ active: selection[activeType] === item.id }"
          hover-class="none"
          @tap="chooseItem(item)"
        >
          <view class="mini-thumb">
            <image
              v-if="item.image"
              :src="resolvePhoto(item.image)"
              mode="aspectFit"
            />
            <ImagePlus
              v-else
              :size="22"
            />
          </view>
          <text>{{ item.title }}</text>
          <text>{{ item.wearCount }} 次 · {{ costText(item) }}/次</text>
        </button>
        <button
          v-if="!isGuest"
          class="mini-card mini-card--add"
          hover-class="none"
          @tap="openAddWithType(activeType)"
        >
          <view class="mini-thumb">
            <Plus :size="24" />
          </view>
          <text>添加{{ activeTypeMeta.label }}</text>
          <text>拍照或相册</text>
        </button>
      </scroll-view>
    </view>

    <view class="quick-form">
      <picker
        mode="date"
        :value="selectedDate"
        @change="selectedDate = $event.detail.value"
      >
        <view class="quick-row">
          <view>
            <CalendarDays :size="17" />
            <view>
              <text>穿搭日期</text>
              <text>保存到哪一天的日记</text>
            </view>
          </view>
          <text>{{ selectedDate }}</text>
        </view>
      </picker>
      <picker
        :range="occasions"
        :value="occasionIndex"
        @change="occasion = occasions[$event.detail.value]"
      >
        <view class="quick-row">
          <view>
            <Sparkles :size="17" />
            <view>
              <text>穿搭场合</text>
              <text>通勤、约会或休闲</text>
            </view>
          </view>
          <text>{{ occasion }}</text>
        </view>
      </picker>
      <view class="wear-note">
        <Check :size="17" />
        <text>{{ wearSummary }}</text>
      </view>
      <view class="note-wrap">
        <input
          v-model="note"
          class="note-input"
          maxlength="24"
          placeholder="备注：天气、心情或场合"
          placeholder-class="note-placeholder"
        >
      </view>
    </view>

    <view class="bottom-actions">
      <button
        v-if="!isGuest"
        class="secondary-action"
        hover-class="none"
        @tap="openAdd"
      >
        <ImagePlus :size="18" />
        <text>上传单品</text>
      </button>
      <button
        class="primary-action"
        :disabled="saving || isGuest"
        hover-class="none"
        @tap="saveOutfit"
      >
        <Check :size="18" />
        <text>{{ isGuest ? '游客仅预览' : (saving ? '保存中' : '保存今日穿搭') }}</text>
      </button>
    </view>

    <!-- #ifdef APP-PLUS -->
    <AppUpdateDialog ref="appUpdateRef" />
    <!-- #endif -->
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import {
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles
} from '@/components/icons'
import AppUpdateDialog from '@/components/AppUpdateDialog.vue'
import { useUserStore } from '@/stores'
import {
  getCostPerWear,
  getItemType,
  getItems,
  getSelectedItems,
  getSelection,
  getWardrobeState,
  itemTypes,
  occasions,
  saveSelection,
  saveTodayOutfit,
  todayText
} from '@/utils/wardrobe-data'
import { resolveAttachmentUrl } from '@/utils/file-upload'
import { formatCurrency, toast } from '@/utils/common'
import { getBuilderTip } from '@/utils/outfit-tips'

const CloudSyncKey = 'StyleBoard-Cloud-Sync'
const CloudSyncReadyKey = 'StyleBoard-Cloud-Sync-Remote-Ready'
const CollageLayoutKey = 'StyleBoard-Collage-Layout'
const defaultCanvasLayout = { x: 0, y: 0, scale: 100 }
const defaultCollageLayout = {
  top: { x: 50, y: 25, scale: 100, z: 3 },
  bottom: { x: 50, y: 54, scale: 100, z: 2 },
  shoes: { x: 50, y: 80, scale: 100, z: 1 }
}
const defaultSlotVisibility = { top: true, bottom: true, shoes: true }

const userStore = useUserStore()
const appUpdateRef = ref(null)
const isGuest = computed(() => userStore.isGuest)
const items = ref([])
const selection = reactive({ top: '', bottom: '', shoes: '' })
const canvasLayout = reactive({ ...defaultCanvasLayout })
const collageLayout = reactive(cloneLayout(defaultCollageLayout))
const slotVisibility = reactive({ ...defaultSlotVisibility })
const activeType = ref('top')
const activeTarget = ref('top')
const editMode = ref('item')
const isFullscreen = ref(false)
const occasion = ref('通勤')
const note = ref('')
const saving = ref(false)
const canvasRect = ref(null)
const selectedDate = ref(todayText())
const slots = itemTypes
let gestureState = null

const selectedItems = computed(() => getSelectedItems(selection, items.value))
const activeItems = computed(() => items.value.filter((item) => item.type === activeType.value))
const activeTypeMeta = computed(() => getItemType(activeType.value))
const visibleSlots = computed(() => slots.filter((slot) => slotVisibility[slot.key]))
const selectedVisibleItems = computed(() => slots
  .map((slot) => selectedItems.value[slot.key])
  .filter(Boolean)
)
const hiddenCount = computed(() => slots.filter((slot) => !slotVisibility[slot.key]).length)
const wearTotal = computed(() => selectedVisibleItems.value.reduce((sum, item) => sum + Number(item.wearCount || 0), 0))
const wearSummary = computed(() => {
  if (isGuest.value) return '游客模式仅可预览默认衣橱'
  if (!selectedVisibleItems.value.length) return '先选择单品'
  return `已穿 ${wearTotal.value} 次 · 保存后 +${selectedVisibleItems.value.length}`
})
const builderTip = computed(() => getBuilderTip({
  itemCount: items.value.length,
  hiddenCount: hiddenCount.value,
  wearTotal: wearTotal.value,
  date: selectedDate.value
}))
const gestureTitle = computed(() => editMode.value === 'canvas' ? '整体模式' : activeTypeMeta.value.label)
const gestureHint = computed(() => (
  editMode.value === 'canvas'
    ? '任意位置：移动 / 捏合整张图'
    : '点中单品：移动 / 捏合单品'
))
const collageStageStyle = computed(() => [
  `transform: translate(${canvasLayout.x}%, ${canvasLayout.y}%) scale(${canvasLayout.scale / 100})`
].join(';'))
const occasionIndex = computed(() => Math.max(0, occasions.indexOf(occasion.value)))

function cloneLayout (layout = {}) {
  return itemTypes.reduce((next, type) => {
    next[type.key] = {
      ...defaultCollageLayout[type.key],
      ...(layout[type.key] || {})
    }
    return next
  }, {})
}

function normalizeSlotVisibility (visibility = {}) {
  return itemTypes.reduce((next, type) => {
    next[type.key] = visibility[type.key] !== false
    return next
  }, {})
}

function readSavedCollage () {
  if (isGuest.value) {
    return {
      canvas: { ...defaultCanvasLayout },
      items: cloneLayout(defaultCollageLayout),
      visibility: normalizeSlotVisibility(defaultSlotVisibility)
    }
  }

  const saved = uni.getStorageSync(CollageLayoutKey) || {}
  return {
    canvas: { ...defaultCanvasLayout, ...(saved.canvas || {}) },
    items: cloneLayout(saved.items || saved),
    visibility: normalizeSlotVisibility(saved.visibility)
  }
}

function refreshLocal () {
  items.value = getItems()
  Object.assign(selection, getSelection())
  const saved = readSavedCollage()
  Object.assign(canvasLayout, saved.canvas)
  Object.assign(collageLayout, saved.items)
  Object.assign(slotVisibility, saved.visibility)
  if (!slotVisibility[activeTarget.value]) activeTarget.value = 'canvas'
}

function resolvePhoto (path) {
  return resolveAttachmentUrl(path)
}

function costText (item) {
  const cost = getCostPerWear(item)
  return cost ? formatCurrency(cost) : '未计算'
}

function clamp (value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

function toggleFullscreen () {
  isFullscreen.value = !isFullscreen.value
  nextTick(measureCanvas)
}

function saveCollageLayout () {
  if (isGuest.value) return
  uni.setStorageSync(CollageLayoutKey, {
    canvas: { ...canvasLayout },
    items: cloneLayout(collageLayout),
    visibility: normalizeSlotVisibility(slotVisibility)
  })
}

function collageItemStyle (type) {
  const layout = collageLayout[type] || defaultCollageLayout[type]
  return [
    `left: ${layout.x}%`,
    `top: ${layout.y}%`,
    `z-index: ${editMode.value === 'item' && activeType.value === type ? 20 : layout.z}`,
    `transform: translate(-50%, -50%) scale(${layout.scale / 100})`
  ].join(';')
}

function selectCanvasItem (type) {
  if (editMode.value === 'canvas') {
    activeTarget.value = 'canvas'
    return
  }
  activeType.value = type
  activeTarget.value = type
}

function selectCanvas () {
  editMode.value = 'canvas'
  activeTarget.value = 'canvas'
}

function setEditMode (mode) {
  editMode.value = mode
  activeTarget.value = mode === 'canvas' || !slotVisibility[activeType.value] ? 'canvas' : activeType.value
}

function selectTraySlot (type) {
  activeType.value = type
  editMode.value = 'item'
  activeTarget.value = slotVisibility[type] ? type : 'canvas'
}

function toggleSlotVisible (type) {
  slotVisibility[type] = !slotVisibility[type]
  activeType.value = type
  activeTarget.value = editMode.value === 'item' && slotVisibility[type] ? type : 'canvas'
  saveCollageLayout()
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
      .select('#outfitCanvas')
      .boundingClientRect((rect) => {
        if (rect?.width && rect?.height) canvasRect.value = rect
        resolve(canvasRect.value)
      })
      .exec()
  })
}

async function startGesture (target, event) {
  const points = getTouchPoints(event)
  const center = getGestureCenter(points)
  if (!center) return
  const rect = canvasRect.value || await measureCanvas()
  if (!rect) return
  const isCanvas = target === 'canvas'
  const layout = isCanvas ? canvasLayout : collageLayout[target]
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
  const targetLayout = gestureState.isCanvas ? canvasLayout : collageLayout[gestureState.target]
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

function endGesture () {
  if (!gestureState) return
  saveCollageLayout()
  gestureState = null
}

function resetActiveLayout () {
  if (editMode.value === 'canvas' || activeTarget.value === 'canvas') {
    Object.assign(canvasLayout, defaultCanvasLayout)
  } else {
    collageLayout[activeType.value] = { ...defaultCollageLayout[activeType.value] }
  }
  saveCollageLayout()
}

async function syncIfNeeded (fallbackMessage = '已保存到本机，云端同步失败') {
  if (isGuest.value) return
  if (uni.getStorageSync(CloudSyncKey) !== '1') return
  try {
    await userStore.saveStyleData(getWardrobeState())
  } catch (error) {
    if (!error?.handled) toast(fallbackMessage)
  }
}

async function loadData () {
  if (isGuest.value) {
    refreshLocal()
    return
  }
  const preference = uni.getStorageSync(CloudSyncKey)
  const ready = uni.getStorageSync(CloudSyncReadyKey) === '1'

  if (!userStore.styleSessionInitialized || !ready || (preference !== '1' && preference !== '0')) {
    try {
      await userStore.initializeStyleSession()
      refreshLocal()
    } catch (error) {
      if (!error?.handled) toast(error?.message || '云端同步设置读取失败')
      refreshLocal()
    }
    return
  }

  if (preference === '1') {
    try {
      await userStore.loadStyleData()
    } catch (error) {
      if (!error?.handled) toast(error?.message || '云端衣橱同步失败')
    }
  }
  refreshLocal()
}

function chooseItem (item) {
  selection[item.type] = item.id
  activeType.value = item.type
  editMode.value = 'item'
  activeTarget.value = slotVisibility[item.type] ? item.type : 'canvas'
  if (isGuest.value) return
  saveSelection(selection)
}

function shuffleOutfit () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  itemTypes.forEach((type) => {
    const pool = items.value.filter((item) => item.type === type.key)
    if (!pool.length) return
    const currentIndex = Math.max(0, pool.findIndex((item) => item.id === selection[type.key]))
    selection[type.key] = pool[(currentIndex + 1) % pool.length].id
  })
  saveSelection(selection)
  saveCollageLayout()
  toast('已换一套', 'success')
}

function openAdd () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  uni.navigateTo({ url: `/pages/wardrobe/item-edit?type=${activeType.value}` })
}

function openAddWithType (type) {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  uni.navigateTo({ url: `/pages/wardrobe/item-edit?type=${type}` })
}

function openMore () {
  uni.showActionSheet({
    itemList: isGuest.value ? ['查看衣橱', '查看日记'] : ['查看衣橱', '查看日记', '同步设置'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) uni.switchTab({ url: '/pages/wardrobe/index' })
      if (tapIndex === 1) uni.switchTab({ url: '/pages/diary/index' })
      if (tapIndex === 2) uni.switchTab({ url: '/pages/wardrobe/index' })
    }
  })
}

async function saveOutfit () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  if (saving.value) return
  saving.value = true
  try {
    saveTodayOutfit({
      date: selectedDate.value,
      occasion: occasion.value,
      note: note.value,
      selection,
      collageLayout: {
        canvas: { ...canvasLayout },
        items: cloneLayout(collageLayout),
        visibility: normalizeSlotVisibility(slotVisibility)
      }
    })
    note.value = ''
    refreshLocal()
    await syncIfNeeded()
    toast('已保存到日记', 'success')
  } catch (error) {
    toast(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function runAppUpdateCheck () {
  return Boolean(await appUpdateRef.value?.checkAppUpdate?.())
}

async function handleBorrowAgreementRedirect () {
  try {
    const profile = await userStore.getInfo()
    if (Number(profile?.borrowFlag) !== 1) return false

    const updateVisible = await runAppUpdateCheck()
    if (!updateVisible) {
      uni.reLaunch({ url: '/pages/mine/agreement/agreement' })
    }
    return true
  } catch (error) {
    if (!error?.handled) toast(error?.message || '用户信息读取失败')
    return false
  }
}

onShow(async () => {
  const redirected = await handleBorrowAgreementRedirect()
  if (redirected) return

  await loadData()
  nextTick(measureCanvas)
  await runAppUpdateCheck()
})

onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.style-page {
  position: relative;
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 28rpx) 30rpx 34rpx;
  overflow: hidden;
  background:
    linear-gradient(180deg, #fbfaf6 0%, #eef5f0 46%, #f8f3ee 100%);
  color: #18211d;
}

.style-page--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999;
  padding: calc(var(--status-bar-height) + 18rpx) 24rpx 24rpx;
  overflow: hidden;
}

.style-page--fullscreen .hero-gradient,
.style-page--fullscreen .style-header,
.style-page--fullscreen .upload-note,
.style-page--fullscreen .slot-switcher,
.style-page--fullscreen .tray-head,
.style-page--fullscreen .item-tray,
.style-page--fullscreen .quick-form,
.style-page--fullscreen .bottom-actions {
  display: none;
}

.style-page--fullscreen .workbench {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--status-bar-height) - 42rpx);
  margin-top: 0;
}

.style-page--fullscreen .section-title {
  flex: 0 0 auto;
}

.style-page--fullscreen .outfit-canvas {
  flex: 1;
  height: auto;
  min-height: 0;
  border-radius: 32rpx;
}

.style-page--fullscreen .gesture-tools {
  flex: 0 0 auto;
  margin-top: 18rpx;
  margin-bottom: 0;
}

.hero-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 238rpx;
  background:
    linear-gradient(135deg, rgba(211, 104, 76, 0.16), transparent 58%),
    linear-gradient(90deg, rgba(64, 104, 92, 0.13), transparent 68%);
  pointer-events: none;
}

.style-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-title,
.app-subtitle {
  display: block;
}

.app-title {
  font-size: 52rpx;
  font-weight: 900;
  line-height: 1.12;
}

.app-subtitle {
  margin-top: 12rpx;
  color: #68746d;
  font-size: 24rpx;
  line-height: 1.35;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.round-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border: 1rpx solid rgba(24, 33, 29, 0.08);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #203f35;
  box-shadow: 0 14rpx 34rpx rgba(33, 47, 40, 0.08);
}

.workbench {
  position: relative;
  z-index: 1;
  margin-top: 30rpx;
}

.section-title,
.tray-head,
.bottom-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  margin-bottom: 18rpx;
}

.section-title text:first-child {
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.25;
}

.section-title text:last-child {
  color: #748079;
  font-size: 23rpx;
  line-height: 1.3;
}

.outfit-canvas {
  position: relative;
  height: 680rpx;
  padding: 18rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.08);
  border-radius: 42rpx;
  background:
    linear-gradient(90deg, rgba(33, 47, 40, 0.045) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(33, 47, 40, 0.045) 1rpx, transparent 1rpx),
    radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.9), transparent 34%),
    #f8f7f1;
  background-size: 58rpx 58rpx, 58rpx 58rpx, 100% 100%, 100% 100%;
  box-shadow: 0 28rpx 76rpx rgba(39, 50, 45, 0.11);
  touch-action: none;
  overflow: hidden;
}

.outfit-canvas::before {
  position: absolute;
  left: 50%;
  top: 34rpx;
  width: 230rpx;
  height: 596rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, rgba(214, 226, 218, 0.72), rgba(229, 205, 190, 0.4));
  content: "";
  filter: blur(24rpx);
  opacity: 0.9;
  transform: translateX(-50%);
}

.outfit-canvas--active {
  box-shadow:
    inset 0 0 0 3rpx rgba(215, 109, 77, 0.16),
    0 28rpx 76rpx rgba(39, 50, 45, 0.11);
}

.collage-stage {
  position: absolute;
  inset: 0;
  z-index: 2;
  transform-origin: center center;
  will-change: transform;
}

.collage-layer {
  position: absolute;
  z-index: 1;
  width: 470rpx;
  height: 236rpx;
  transform-origin: center center;
  transition:
    box-shadow 160ms ease,
    opacity 160ms ease;
  will-change: left, top, transform;
}

.collage-layer.active {
  filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
}

.canvas-visibility {
  position: absolute;
  right: 34rpx;
  top: -18rpx;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  padding: 0;
  border: 1rpx solid rgba(33, 47, 40, 0.08);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #20372f;
  box-shadow: 0 12rpx 24rpx rgba(31, 40, 36, 0.12);
  backdrop-filter: blur(14px);
}

.canvas-visibility::after {
  border: 0;
}

.slot-copy {
  position: absolute;
  left: 50%;
  top: -16rpx;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10rpx;
  max-width: 260rpx;
  padding: 9rpx 14rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.06);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(14px);
  box-shadow: 0 10rpx 24rpx rgba(31, 40, 36, 0.06);
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
}

.collage-layer.active .slot-copy,
.outfit-canvas--active .canvas-hint {
  opacity: 1;
}

.slot-copy text:first-child {
  color: #1d2a25;
  font-size: 23rpx;
  font-weight: 900;
}

.slot-copy view {
  width: 8rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #d76d4d;
}

.slot-copy text:last-child {
  overflow: hidden;
  color: #66726d;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  overflow: visible;
}

.slot-photo::after {
  border: 0;
}

.slot-image {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 20rpx 22rpx rgba(26, 31, 28, 0.16));
  pointer-events: none;
}

.slot-image--top {
  height: 236rpx;
}

.slot-image--bottom {
  height: 276rpx;
}

.slot-image--shoes {
  width: 440rpx;
  height: 190rpx;
}

.empty-photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 100%;
  color: #8b938e;
  font-size: 23rpx;
}

.canvas-hint {
  position: absolute;
  right: 22rpx;
  bottom: 20rpx;
  z-index: 30;
  padding: 10rpx 16rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.06);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  color: #738079;
  font-size: 21rpx;
  line-height: 1.25;
  backdrop-filter: blur(12px);
  opacity: 0.94;
}

.upload-note {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin: 18rpx 0 20rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid rgba(58, 96, 84, 0.09);
  border-radius: 24rpx;
  background: rgba(232, 241, 235, 0.74);
  color: #40514a;
  font-size: 23rpx;
  line-height: 1.45;
}

.upload-note > :first-child {
  margin-top: 4rpx;
  color: #3e685b;
}

.gesture-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16rpx;
  margin: 0 0 20rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.6);
}

.gesture-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}

.gesture-copy text:first-child {
  color: #25312c;
  font-size: 25rpx;
  font-weight: 900;
  line-height: 1.22;
}

.gesture-copy text:last-child {
  margin-top: 5rpx;
  overflow: hidden;
  color: #7a8580;
  font-size: 21rpx;
  line-height: 1.22;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gesture-actions {
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
.fullscreen-toggle::after,
.reset-layout::after {
  border: 0;
}

.fullscreen-toggle,
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

.fullscreen-toggle {
  padding: 0 22rpx;
}

.slot-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.slot-toggle-card {
  min-width: 0;
  padding: 10rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.58);
  transition:
    opacity 160ms ease,
    box-shadow 160ms ease;
}

.slot-toggle-card.active {
  border-color: rgba(216, 111, 79, 0.44);
  box-shadow: inset 0 0 0 2rpx rgba(216, 111, 79, 0.12);
}

.slot-toggle-card.muted {
  opacity: 0.48;
}

.slot-toggle-thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 94rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #f8f6ef, #eaf1ec);
  overflow: hidden;
}

.slot-toggle-thumb image {
  width: 122rpx;
  height: 86rpx;
}

.slot-eye {
  position: absolute;
  right: 8rpx;
  top: 8rpx;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42rpx;
  height: 42rpx;
  padding: 0;
  border: 1rpx solid rgba(33, 47, 40, 0.08);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.86);
  color: #20372f;
  box-shadow: 0 8rpx 18rpx rgba(31, 40, 36, 0.08);
}

.slot-eye::after {
  border: 0;
}

.slot-toggle-card > text {
  display: block;
  margin-top: 9rpx;
  overflow: hidden;
  color: #34423c;
  font-size: 22rpx;
  font-weight: 850;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.segments {
  display: flex;
  gap: 6rpx;
  padding: 7rpx;
  border-radius: 999rpx;
  background: rgba(32, 55, 47, 0.08);
}

.segments button {
  min-width: 86rpx;
  height: 46rpx;
  border-radius: 999rpx;
  color: #606b65;
  font-size: 23rpx;
  font-weight: 750;
  line-height: 46rpx;
}

.segments button.active {
  background: #20372f;
  color: #fff;
}

.shuffle {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: #d86f4f;
  font-size: 24rpx;
  font-weight: 850;
  line-height: 1.25;
}

.item-tray {
  width: 100%;
  margin-top: 18rpx;
  white-space: nowrap;
}

.mini-card {
  display: inline-flex;
  flex-direction: column;
  width: 204rpx;
  height: 208rpx;
  margin-right: 16rpx;
  padding: 14rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.66);
  vertical-align: top;
}

.mini-card.active {
  border-color: rgba(216, 111, 79, 0.55);
  box-shadow: inset 0 0 0 2rpx rgba(216, 111, 79, 0.16);
}

.mini-card--add {
  color: #3e685b;
}

.mini-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 102rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #f8f6ef, #eaf1ec);
}

.mini-thumb image {
  width: 142rpx;
  height: 96rpx;
}

.mini-card > text {
  display: block;
  margin-top: 10rpx;
  overflow: hidden;
  color: #2d3733;
  font-size: 24rpx;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-card > text:last-child {
  margin-top: 6rpx;
  color: #8b938e;
  font-size: 20rpx;
  font-weight: 500;
}

.quick-form {
  margin-top: 18rpx;
  padding: 8rpx 18rpx 16rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(16px);
}

.quick-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  min-height: 82rpx;
  border-bottom: 1rpx solid rgba(36, 53, 45, 0.07);
  color: #24352d;
}

.quick-row > view,
.quick-row > view > view {
  min-width: 0;
}

.quick-row > view {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.quick-row > view > :first-child {
  color: #3e685b;
}

.quick-row text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-row > view text:first-child {
  color: #25312c;
  font-size: 25rpx;
  font-weight: 900;
  line-height: 1.25;
}

.quick-row > view text:last-child {
  margin-top: 5rpx;
  color: #8a938e;
  font-size: 21rpx;
  line-height: 1.25;
}

.quick-row > text {
  flex: 0 0 auto;
  max-width: 220rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(32, 55, 47, 0.08);
  color: #24352d;
  font-size: 23rpx;
  font-weight: 850;
}

.wear-note {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(232, 241, 235, 0.74);
  color: #3e685b;
  font-size: 22rpx;
  line-height: 1.35;
}

.wear-note > :first-child {
  margin-top: 3rpx;
  flex: 0 0 auto;
}

.note-wrap {
  min-width: 0;
}

.note-input {
  height: 56rpx;
  margin-top: 12rpx;
  padding: 0 4rpx;
  color: #202624;
  font-size: 24rpx;
}

.note-placeholder {
  color: #9aa19d;
}

.bottom-actions {
  gap: 18rpx;
  margin-top: 18rpx;
  padding-bottom: calc(128rpx + env(safe-area-inset-bottom));
}

.secondary-action,
.primary-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 92rpx;
  border-radius: 28rpx;
  font-size: 28rpx;
  font-weight: 900;
}

.secondary-action {
  width: 286rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.1);
  background: rgba(255, 255, 255, 0.68);
  color: #26342e;
}

.primary-action {
  flex: 1;
  background: linear-gradient(135deg, #d76d4d, #bd4f37);
  color: #fffaf4;
  box-shadow: 0 20rpx 46rpx rgba(195, 87, 60, 0.24);
}
</style>
