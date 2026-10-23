<template>
  <view class="diary-page">
    <view class="diary-header">
      <view>
        <text class="diary-title">日记</text>
        <text class="diary-subtitle">{{ outfits.length }} 套穿搭 · {{ mostUsedText }}</text>
      </view>
      <CalendarCheck
        :size="30"
        :stroke-width="1.6"
      />
    </view>

    <view class="summary-row">
      <view>
        <text>{{ monthCount }}</text>
        <text>本月记录</text>
      </view>
      <view>
        <text>{{ itemCount }}</text>
        <text>衣橱单品</text>
      </view>
      <view>
        <text>{{ averageCost }}</text>
        <text>平均单次</text>
      </view>
    </view>

    <view class="diary-tip">
      <text>{{ diaryTip }}</text>
    </view>

    <view
      v-if="outfits.length"
      class="diary-list"
    >
      <button
        v-for="outfit in outfits"
        :key="outfit.id"
        class="diary-card"
        hover-class="none"
        @tap="openDetail(outfit)"
      >
        <view class="date-column">
          <text>{{ monthText(outfit.date) }}</text>
          <text>{{ dayText(outfit.date) }}</text>
        </view>
        <view class="outfit-main">
          <view class="outfit-meta">
            <text>{{ outfit.occasion }}</text>
            <text>{{ outfit.note || '今日搭配已保存' }}</text>
          </view>
          <view class="outfit-preview">
            <view
              class="preview-stage"
              :style="previewStageStyle(outfit)"
            >
              <view
                v-for="slot in visibleOutfitSlots(outfit)"
                :key="slot.key"
                class="preview-layer"
                :style="previewLayerStyle(outfit, slot.key)"
              >
                <image
                  v-if="resolveSlot(outfit, slot.key)?.image"
                  :src="resolvePhoto(resolveSlot(outfit, slot.key).image)"
                  mode="aspectFit"
                />
              </view>
            </view>
          </view>
        </view>
      </button>
    </view>

    <button
      v-else
      class="empty-diary"
      hover-class="none"
      @tap="goBuilder"
    >
      <CalendarCheck :size="40" />
      <text>还没有穿搭日记</text>
      <text>先在搭搭衣橱保存今日穿搭</text>
    </button>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CalendarCheck } from '@/components/icons'
import { getCostPerWear, getItems, getOutfits, itemTypes } from '@/utils/wardrobe-data'
import { resolveAttachmentUrl } from '@/utils/file-upload'
import { formatCurrency } from '@/utils/common'
import { getDiaryTip } from '@/utils/outfit-tips'

const outfits = ref([])
const items = ref([])
const slots = itemTypes
const fallbackLayout = {
  top: { x: 50, y: 26, scale: 100, z: 3 },
  bottom: { x: 50, y: 55, scale: 100, z: 2 },
  shoes: { x: 50, y: 82, scale: 100, z: 1 }
}
const fallbackCanvasLayout = { x: 0, y: 0, scale: 100 }

const itemCount = computed(() => items.value.length)
const monthCount = computed(() => {
  const currentMonth = new Date().toISOString().slice(0, 7)
  return outfits.value.filter((outfit) => String(outfit.date).startsWith(currentMonth)).length
})
const averageCost = computed(() => {
  const costs = items.value.map(getCostPerWear).filter(Boolean)
  if (!costs.length) return '未计算'
  return formatCurrency(Math.round(costs.reduce((sum, item) => sum + item, 0) / costs.length))
})
const mostUsedText = computed(() => {
  const item = [...items.value].sort((a, b) => b.wearCount - a.wearCount)[0]
  return item ? `最常穿：${item.title}` : '从第一套开始'
})
const diaryTip = computed(() => getDiaryTip({ count: outfits.value.length }))

function refresh () {
  outfits.value = getOutfits()
  items.value = getItems()
}

function monthText (date) {
  return `${Number(String(date).slice(5, 7))}月`
}

function dayText (date) {
  return String(date).slice(8, 10)
}

function resolvePhoto (path) {
  return resolveAttachmentUrl(path)
}

function resolveSlot (outfit, type) {
  return outfit.snapshot?.[type] || items.value.find((item) => item.id === outfit.itemIds?.[type]) || null
}

function isOutfitSlotVisible (outfit, type) {
  return outfit.collageLayout?.visibility?.[type] !== false
}

function visibleOutfitSlots (outfit) {
  return slots.filter((slot) => isOutfitSlotVisible(outfit, slot.key))
}

function previewLayerStyle (outfit, type) {
  const itemLayouts = outfit.collageLayout?.items || outfit.collageLayout || {}
  const layout = {
    ...fallbackLayout[type],
    ...(itemLayouts[type] || {})
  }
  return [
    `left: ${layout.x}%`,
    `top: ${layout.y}%`,
    `z-index: ${layout.z}`,
    `transform: translate(-50%, -50%) scale(${layout.scale / 100})`
  ].join(';')
}

function previewStageStyle (outfit) {
  const layout = {
    ...fallbackCanvasLayout,
    ...(outfit.collageLayout?.canvas || {})
  }
  return `transform: translate(${layout.x}%, ${layout.y}%) scale(${layout.scale / 100})`
}

function goBuilder () {
  uni.switchTab({ url: '/pages/outfit/index' })
}

function openDetail (outfit) {
  uni.navigateTo({ url: `/pages/diary/detail?id=${outfit.id}` })
}

onShow(refresh)
</script>

<style lang="scss" scoped>
.diary-page {
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 28rpx) 30rpx calc(176rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #fbfaf6 0%, #edf5f0 50%, #f8f3ee 100%);
  color: #18211d;
}

.diary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diary-header > :last-child {
  color: #20372f;
}

.diary-title,
.diary-subtitle {
  display: block;
}

.diary-title {
  font-size: 52rpx;
  font-weight: 900;
  line-height: 1.12;
}

.diary-subtitle {
  margin-top: 10rpx;
  color: #66736d;
  font-size: 24rpx;
  line-height: 1.35;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 28rpx;
}

.summary-row view {
  min-width: 0;
  padding: 22rpx 10rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.06);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  text-align: center;
  backdrop-filter: blur(16px);
}

.summary-row text {
  display: block;
}

.summary-row text:first-child {
  color: #20372f;
  font-size: 34rpx;
  font-weight: 900;
}

.summary-row text:last-child {
  margin-top: 8rpx;
  color: #7d8681;
  font-size: 21rpx;
}

.diary-tip {
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid rgba(58, 96, 84, 0.09);
  border-radius: 24rpx;
  background: rgba(232, 241, 235, 0.7);
  color: #40514a;
  font-size: 23rpx;
  line-height: 1.45;
}

.diary-list {
  position: relative;
  margin-top: 30rpx;
}

.diary-list::before {
  position: absolute;
  top: 18rpx;
  bottom: 18rpx;
  left: 42rpx;
  width: 2rpx;
  background: rgba(32, 55, 47, 0.12);
  content: "";
}

.diary-card {
  position: relative;
  display: grid;
  grid-template-columns: 86rpx minmax(0, 1fr);
  gap: 18rpx;
  width: 100%;
  margin-bottom: 22rpx;
  padding: 0;
  text-align: left;
}

.diary-card::after {
  border: 0;
}

.date-column {
  position: relative;
  z-index: 1;
  padding-top: 16rpx;
  text-align: center;
}

.date-column text {
  display: block;
}

.date-column text:first-child {
  color: #7d8781;
  font-size: 22rpx;
}

.date-column text:last-child {
  margin-top: 4rpx;
  color: #20372f;
  font-size: 40rpx;
  font-weight: 900;
}

.outfit-main {
  min-width: 0;
  padding: 20rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 16rpx 42rpx rgba(31, 40, 36, 0.055);
  backdrop-filter: blur(16px);
}

.outfit-meta text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outfit-meta text:first-child {
  color: #25312c;
  font-size: 29rpx;
  font-weight: 900;
}

.outfit-meta text:last-child {
  margin-top: 8rpx;
  color: #7d8681;
  font-size: 23rpx;
}

.outfit-preview {
  position: relative;
  height: 260rpx;
  margin-top: 18rpx;
  border-radius: 22rpx;
  background:
    linear-gradient(90deg, rgba(33, 47, 40, 0.04) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(33, 47, 40, 0.04) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(255, 255, 255, 0.8), transparent 54%),
    linear-gradient(135deg, #f3eee6, #e8f0eb);
  background-size: 42rpx 42rpx, 42rpx 42rpx, 100% 100%, 100% 100%;
  overflow: hidden;
}

.preview-stage {
  position: absolute;
  inset: 0;
  transform-origin: center center;
}

.preview-layer {
  position: absolute;
  width: 292rpx;
  height: 150rpx;
  transform-origin: center center;
}

.preview-layer image {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 10rpx 12rpx rgba(26, 31, 28, 0.11));
}

.empty-diary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 560rpx;
  margin-top: 30rpx;
  border: 1rpx dashed rgba(32, 55, 47, 0.16);
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.5);
  color: #7d8681;
}

.empty-diary text {
  display: block;
  margin-top: 18rpx;
  font-size: 26rpx;
  font-weight: 850;
}

.empty-diary text:last-child {
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
}
</style>
