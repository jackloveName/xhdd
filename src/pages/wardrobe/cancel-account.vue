<template>
  <view class="cancel-page">
    <view class="cancel-topbar">
      <button
        class="back-button"
        hover-class="none"
        aria-label="返回"
        @tap="back"
      >
        <ArrowLeft
          :size="22"
          :stroke-width="1.8"
        />
      </button>
      <text>注销账号</text>
      <view class="topbar-spacer" />
    </view>

    <view class="warning-header">
      <view class="warning-mark">
        <ShieldAlert
          :size="34"
          :stroke-width="1.7"
        />
      </view>
      <text class="warning-title">
        这是不可恢复的操作
      </text>
      <text class="warning-description">
        注销完成后，当前账号将无法继续登录，本机内与该账号关联的衣橱数据和安全设置也会被清除。
      </text>
    </view>

    <view class="notice-list">
      <text class="notice-title">
        注销前请确认
      </text>
      <view
        v-for="item in notices"
        :key="item"
        class="notice-row"
      >
        <view class="notice-dot" />
        <text>{{ item }}</text>
      </view>
    </view>

    <button
      class="agree-row"
      hover-class="none"
      @tap="agreed = !agreed"
    >
      <view
        class="checkbox"
        :class="{ 'checkbox--checked': agreed }"
      >
        <Check
          v-if="agreed"
          :size="15"
          :stroke-width="2.4"
        />
      </view>
      <text>我已了解注销后的影响，并确认继续</text>
    </button>

    <button
      class="submit-button"
      :class="{ 'submit-button--disabled': !agreed }"
      :disabled="submitting"
      hover-class="none"
      @tap="confirmCancel"
    >
      {{ submitting ? '正在注销账号' : '确认注销账号' }}
    </button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowLeft, Check, ShieldAlert } from '@/components/icons'
import { useUserStore } from '@/stores'
import { toast } from '@/utils/common'

const userStore = useUserStore()
const agreed = ref(false)
const submitting = ref(false)
const notices = [
  '账号注销后无法使用原登录方式恢复',
  '本机衣橱、穿搭日记和加密密钥会被清除',
  '需要保留的内容请先返回衣橱确认云端同步已保存'
]

function back () {
  uni.navigateBack()
}

function showFinalConfirm () {
  return new Promise((resolve) => {
    uni.showModal({
      title: '最后确认',
      content: '注销后无法恢复当前账号，确定继续吗？',
      confirmText: '确认注销',
      confirmColor: '#d7675a',
      success: resolve,
      fail: () => resolve({ confirm: false, cancel: true })
    })
  })
}

async function confirmCancel () {
  if (submitting.value) return
  if (userStore.isGuest) {
    toast('游客模式没有账号可注销，请登录账号后再操作')
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  if (!agreed.value) {
    toast('请先勾选确认')
    return
  }

  const result = await showFinalConfirm()
  if (!result.confirm) return

  submitting.value = true
  try {
    await userStore.destroyAccount()
    toast('账号已注销', 'success')
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/index' })
    }, 300)
  } catch (error) {
    if (!error?.handled) toast(error?.message || '注销失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.cancel-page {
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 18rpx) 32rpx 80rpx;
  background: #f7f5ef;
  color: #15382d;
}

.cancel-topbar {
  display: grid;
  grid-template-columns: 70rpx 1fr 70rpx;
  align-items: center;
  min-height: 76rpx;
  font-size: 28rpx;
  font-weight: 750;
  text-align: center;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70rpx;
  height: 70rpx;
  padding: 0;
  border: 0;
  background: transparent;
  color: #456b5b;
  line-height: 1.35;
}

.back-button::after,
.agree-row::after {
  border: 0;
}

.warning-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72rpx 18rpx 56rpx;
  text-align: center;
}

.warning-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  border: 1rpx solid rgba(215, 103, 90, 0.34);
  border-radius: 50%;
  background: rgba(215, 103, 90, 0.12);
  color: #d7675a;
}

.warning-title,
.warning-description,
.notice-title {
  display: block;
}

.warning-title {
  margin-top: 30rpx;
  font-size: 38rpx;
  font-weight: 850;
  line-height: 1.25;
}

.warning-description {
  max-width: 610rpx;
  margin-top: 18rpx;
  color: #727a75;
  font-size: 25rpx;
  line-height: 1.7;
}

.notice-list {
  padding: 30rpx 28rpx;
  border-top: 1rpx solid #d9d6cd;
  border-bottom: 1rpx solid #d9d6cd;
}

.notice-title {
  margin-bottom: 20rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.notice-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 16rpx;
  color: #626c67;
  font-size: 24rpx;
  line-height: 1.6;
}

.notice-dot {
  flex: 0 0 9rpx;
  width: 9rpx;
  height: 9rpx;
  margin-top: 15rpx;
  border-radius: 50%;
  background: #d7675a;
}

.agree-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  min-height: 54rpx;
  padding: 0;
  border: 0;
  margin-top: 30rpx;
  background: transparent;
  color: #626c67;
  font-size: 24rpx;
  line-height: 1.5;
  text-align: left;
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38rpx;
  width: 38rpx;
  height: 38rpx;
  border: 2rpx solid #bbb9b1;
  border-radius: 6px;
  color: #fff;
}

.checkbox--checked {
  border-color: #456b5b;
  background: #456b5b;
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 90rpx;
  margin-top: 34rpx;
  border-radius: 8px;
  background: #d7675a;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}

.submit-button--disabled {
  background: #e1dfd8;
  color: #a09f99;
}
</style>
