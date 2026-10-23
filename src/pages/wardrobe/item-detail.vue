<template>
  <view class="item-detail-page">
    <view class="detail-topbar">
      <button
        class="icon-button"
        hover-class="none"
        aria-label="返回"
        @tap="back"
      >
        <ArrowLeft :size="22" />
      </button>
      <text>单品详情</text>
      <button
        v-if="!isGuest"
        class="icon-button"
        hover-class="none"
        aria-label="编辑"
        @tap="editItem"
      >
        <Pencil :size="20" />
      </button>
    </view>

    <view
      v-if="item"
      class="detail-content"
    >
      <view class="photo-hero">
        <image
          v-if="item.image"
          :src="resolvePhoto(item.image)"
          mode="aspectFit"
        />
      </view>

      <view class="title-block">
        <view>
          <text>{{ item.title }}</text>
          <text>{{ getItemType(item.type).label }} · {{ item.color || '未填颜色' }} · {{ item.season }}</text>
        </view>
      </view>

      <view class="stats-band">
        <view>
          <text>已穿</text>
          <text>{{ item.wearCount }} 次</text>
        </view>
        <view>
          <text>买入价格</text>
          <text>{{ formatCurrency(item.price) }}</text>
        </view>
        <view>
          <text>单次成本</text>
          <text>{{ costText }}</text>
        </view>
      </view>

      <view class="detail-section">
        <text class="section-title">
          记录信息
        </text>
        <view class="detail-list">
          <view class="detail-row">
            <text>分类</text>
            <text>{{ getItemType(item.type).label }}</text>
          </view>
          <view class="detail-row">
            <text>颜色</text>
            <text>{{ item.color || '未填写' }}</text>
          </view>
          <view class="detail-row">
            <text>季节</text>
            <text>{{ item.season }}</text>
          </view>
          <view class="detail-row">
            <text>创建时间</text>
            <text>{{ formatDate(item.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view
        v-if="item.note"
        class="detail-section"
      >
        <text class="section-title">
          备注
        </text>
        <text class="note-text">
          {{ item.note }}
        </text>
      </view>

      <view class="detail-actions">
        <button
          v-if="!isGuest"
          class="primary-action"
          hover-class="none"
          @tap="editItem"
        >
          <Pencil :size="18" />
          <text>编辑单品</text>
        </button>
        <button
          v-if="!isGuest"
          class="danger-action"
          hover-class="none"
          @tap="deleteItem"
        >
          <Trash2 :size="19" />
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ArrowLeft, Pencil, Trash2 } from '@/components/icons'
import { useUserStore } from '@/stores'
import { findItem, getCostPerWear, getItemType, getWardrobeState, removeItem } from '@/utils/wardrobe-data'
import { resolveAttachmentUrl } from '@/utils/file-upload'
import { formatCurrency, showConfirm, toast } from '@/utils/common'

const CloudSyncKey = 'StyleBoard-Cloud-Sync'
const userStore = useUserStore()
const isGuest = computed(() => userStore.isGuest)
const item = ref(null)
const itemId = ref('')

const costText = computed(() => {
  const cost = getCostPerWear(item.value)
  return cost ? formatCurrency(cost) : '未计算'
})

function resolvePhoto (path) {
  return resolveAttachmentUrl(path)
}

function formatDate (value) {
  if (!value) return '未记录'
  return String(value).slice(0, 10).replace(/-/g, '.')
}

function back () {
  uni.navigateBack()
}

function editItem () {
  if (isGuest.value) return
  if (!item.value) return
  uni.navigateTo({ url: `/pages/wardrobe/item-edit?id=${item.value.id}` })
}

function refreshItem () {
  if (!itemId.value) return
  item.value = findItem(itemId.value)
  if (!item.value) toast('未找到这件单品')
}

async function syncIfNeeded () {
  if (uni.getStorageSync(CloudSyncKey) !== '1') return
  try {
    await userStore.saveStyleData(getWardrobeState())
  } catch (error) {
    if (!error?.handled) toast('本机已删除，云端同步失败')
  }
}

async function deleteItem () {
  if (isGuest.value) return
  if (!item.value) return
  const result = await showConfirm(`删除“${item.value.title}”吗？相关穿搭日记也会移除。`, '删除单品')
  if (!result.confirm) return
  removeItem(item.value.id)
  await syncIfNeeded()
  toast('已删除', 'success')
  setTimeout(() => uni.navigateBack(), 350)
}

onLoad((query = {}) => {
  itemId.value = query.id || ''
  refreshItem()
})

onShow(refreshItem)
</script>

<style lang="scss" scoped>
.item-detail-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #fbfaf6 0%, #eef5f0 50%, #f8f3ee 100%);
  color: #18211d;
}

.detail-topbar {
  display: grid;
  grid-template-columns: 76rpx minmax(0, 1fr) 76rpx;
  align-items: center;
  min-height: calc(var(--status-bar-height) + 112rpx);
  padding: var(--status-bar-height) 30rpx 0;
}

.detail-topbar > text {
  text-align: center;
  font-size: 30rpx;
  font-weight: 900;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 68rpx;
  border-radius: 20rpx;
  color: #20372f;
}

.detail-content {
  padding: 22rpx 30rpx 50rpx;
}

.photo-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 560rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.08);
  border-radius: 38rpx;
  background:
    linear-gradient(90deg, rgba(33, 47, 40, 0.04) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(33, 47, 40, 0.04) 1rpx, transparent 1rpx),
    radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.86), transparent 36%),
    #f8f7f1;
  background-size: 58rpx 58rpx, 58rpx 58rpx, 100% 100%, 100% 100%;
  box-shadow: 0 24rpx 68rpx rgba(31, 40, 36, 0.09);
  overflow: hidden;
}

.photo-hero image {
  width: 94%;
  height: 94%;
  filter: drop-shadow(0 20rpx 24rpx rgba(26, 31, 28, 0.14));
}

.title-block,
.stats-band,
.detail-section {
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(16px);
}

.title-block text,
.stats-band text,
.detail-row text,
.section-title,
.note-text {
  display: block;
}

.title-block text:first-child {
  color: #25312c;
  font-size: 38rpx;
  font-weight: 900;
}

.title-block text:last-child {
  margin-top: 10rpx;
  color: #7d8681;
  font-size: 24rpx;
}

.stats-band {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.stats-band view {
  min-width: 0;
}

.stats-band text:first-child {
  color: #8a938e;
  font-size: 21rpx;
}

.stats-band text:last-child {
  margin-top: 10rpx;
  color: #20372f;
  font-size: 27rpx;
  font-weight: 900;
}

.section-title {
  margin-bottom: 16rpx;
  color: #25312c;
  font-size: 29rpx;
  font-weight: 900;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58rpx;
  color: #5d6762;
  font-size: 24rpx;
}

.detail-row text:last-child {
  color: #25312c;
  font-weight: 800;
}

.note-text {
  color: #5d6762;
  font-size: 25rpx;
  line-height: 1.5;
}

.detail-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 28rpx;
}

.primary-action,
.danger-action {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 94rpx;
  border-radius: 30rpx;
}

.primary-action {
  flex: 1;
  gap: 12rpx;
  background: linear-gradient(135deg, #d76d4d, #bd4f37);
  color: #fffaf4;
  font-size: 29rpx;
  font-weight: 900;
  box-shadow: 0 20rpx 44rpx rgba(195, 87, 60, 0.22);
}

.danger-action {
  width: 96rpx;
  background: rgba(244, 226, 219, 0.82);
  color: #b45642;
}
</style>
