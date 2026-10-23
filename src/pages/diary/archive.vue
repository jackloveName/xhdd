<template>
  <view class="history-page">
    <view class="history-topbar">
      <button
        class="icon-button"
        hover-class="none"
        aria-label="返回"
        @tap="back"
      >
        <ArrowLeft :size="22" />
      </button>
      <view>
        <text>全部穿搭</text>
        <text>{{ outfits.length }} 套已保存记录</text>
      </view>
      <CalendarCheck :size="24" />
    </view>

    <view class="history-content">
      <view
        v-if="outfits.length"
        class="history-list"
      >
        <button
          v-for="outfit in outfits"
          :key="outfit.id"
          class="history-card"
          hover-class="none"
          @tap="openDetail(outfit)"
        >
          <view>
            <text>{{ outfit.date }}</text>
            <text>{{ outfit.occasion }} · {{ outfit.note || '已保存' }}</text>
          </view>
        </button>
      </view>
      <view
        v-else
        class="empty-history"
      >
        <CalendarCheck :size="38" />
        <text>暂无穿搭记录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ArrowLeft, CalendarCheck } from '@/components/icons'
import { getOutfits } from '@/utils/wardrobe-data'

const outfits = ref([])

function refresh () {
  outfits.value = getOutfits()
}

function back () {
  uni.navigateBack()
}

function openDetail (outfit) {
  uni.navigateTo({ url: `/pages/diary/detail?id=${outfit.id}` })
}

onShow(refresh)
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #f7f5ef;
  color: #202624;
}

.history-topbar {
  display: grid;
  grid-template-columns: 76rpx minmax(0, 1fr) 76rpx;
  align-items: center;
  min-height: calc(var(--status-bar-height) + 112rpx);
  padding: var(--status-bar-height) 30rpx 0;
}

.history-topbar view text {
  display: block;
  text-align: center;
}

.history-topbar view text:first-child {
  font-size: 30rpx;
  font-weight: 900;
}

.history-topbar view text:last-child {
  margin-top: 6rpx;
  color: #7d8681;
  font-size: 21rpx;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 68rpx;
  color: #24352d;
}

.history-topbar > :last-child {
  justify-self: center;
  color: #24352d;
}

.history-content {
  padding: 24rpx 30rpx 50rpx;
}

.history-card {
  display: block;
  width: 100%;
  margin-bottom: 18rpx;
  padding: 24rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.76);
  text-align: left;
}

.history-card::after {
  border: 0;
}

.history-card text {
  display: block;
}

.history-card text:first-child {
  color: #25312c;
  font-size: 29rpx;
  font-weight: 900;
}

.history-card text:last-child {
  margin-top: 8rpx;
  color: #7d8681;
  font-size: 24rpx;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 520rpx;
  color: #7d8681;
}

.empty-history text {
  margin-top: 18rpx;
  font-size: 25rpx;
  font-weight: 850;
}
</style>
