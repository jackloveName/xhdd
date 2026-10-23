<template>
  <view class="closet-page">
    <view class="closet-header">
      <view>
        <text class="closet-title">
          衣橱
        </text>
        <text class="closet-subtitle">
          {{ items.length }} 件单品 · {{ totalValue }}
        </text>
      </view>
      <button
        v-if="!isGuest"
        class="add-button"
        hover-class="none"
        @tap="openAdd"
      >
        <Plus :size="19" />
        <text>上传</text>
      </button>
    </view>

    <view class="sync-panel">
      <view>
        <text>云端同步</text>
        <text>{{ lastSyncText }}</text>
      </view>
      <switch
        :checked="cloudSync"
        :disabled="Boolean(syncing) || isGuest"
        color="#24352d"
        @change="toggleCloudSync"
      />
    </view>

    <view class="type-tabs">
      <button
        class="type-chip"
        :class="{ active: activeType === 'all' }"
        hover-class="none"
        @tap="activeType = 'all'"
      >
        全部
      </button>
      <button
        v-for="item in itemTypes"
        :key="item.key"
        class="type-chip"
        :class="{ active: activeType === item.key }"
        hover-class="none"
        @tap="activeType = item.key"
      >
        {{ item.label }}
      </button>
    </view>

    <view
      v-if="filteredItems.length"
      class="closet-grid"
    >
      <button
        v-for="item in filteredItems"
        :key="item.id"
        class="closet-card"
        hover-class="none"
        @tap="openDetail(item)"
        @longpress="openMenu(item)"
      >
        <view class="photo-wrap">
          <image
            v-if="item.image"
            :src="resolvePhoto(item.image)"
            mode="aspectFit"
          />
          <ImagePlus
            v-else
            :size="28"
          />
        </view>
        <view class="card-copy">
          <text>{{ item.title }}</text>
          <text>{{ getItemType(item.type).label }} · {{ item.color || item.season }}</text>
        </view>
        <view class="card-stats">
          <text>穿 {{ item.wearCount }} 次</text>
          <text>{{ costText(item) }}/次</text>
        </view>
      </button>
    </view>

    <button
      v-else
      class="empty-closet"
      hover-class="none"
      @tap="openAdd"
    >
      <ImagePlus :size="38" />
      <text>还没有这个分类的单品</text>
      <text>上传一张照片开始搭配</text>
    </button>

    <view class="account-panel">
      <view>
        <text>{{ accountName }}</text>
        <text>衣橱数据本机加密保存</text>
      </view>
      <view class="account-actions">
        <button
          v-if="!isGuest"
          hover-class="none"
          @tap="saveCloud"
        >
          保存云端
        </button>
        <button
          v-if="!isGuest"
          hover-class="none"
          @tap="restoreCloud"
        >
          从云端取出
        </button>
      </view>
      <view class="account-links">
        <button
          class="account-link"
          hover-class="none"
          @tap="checkUpdate"
        >
          <view>
            <RefreshCw :size="19" />
            <text>{{ checkingUpdate ? '检查中' : '检查更新' }}</text>
          </view>
          <ChevronRight :size="17" />
        </button>
        <button
          class="account-link"
          hover-class="none"
          @tap="openLegal('privacy')"
        >
          <view>
            <FileText :size="19" />
            <text>隐私协议</text>
          </view>
          <ChevronRight :size="17" />
        </button>
        <button
          class="account-link"
          hover-class="none"
          @tap="openLegal('agreement')"
        >
          <view>
            <FileText :size="19" />
            <text>注册协议</text>
          </view>
          <ChevronRight :size="17" />
        </button>
        <button
          v-if="!isGuest"
          class="account-link account-link--danger"
          hover-class="none"
          @tap="openCancelAccount"
        >
          <view>
            <UserX :size="19" />
            <text>注销账号</text>
          </view>
          <ChevronRight :size="17" />
        </button>
      </view>
      <button
        class="logout"
        hover-class="none"
        @tap="confirmLogout"
      >
        {{ logoutText }}
      </button>
    </view>

    <AppUpdateDialog ref="appUpdateRef" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppUpdateDialog from '@/components/AppUpdateDialog.vue'
import { ChevronRight, FileText, ImagePlus, Plus, RefreshCw, UserX } from '@/components/icons'
import { useUserStore } from '@/stores'
import { getCostPerWear, getItemType, getItems, getWardrobeState, itemTypes, removeItem } from '@/utils/wardrobe-data'
import { resolveAttachmentUrl } from '@/utils/file-upload'
import { formatCurrency, showConfirm, toast } from '@/utils/common'

const CloudSyncKey = 'StyleBoard-Cloud-Sync'
const CloudSyncReadyKey = 'StyleBoard-Cloud-Sync-Remote-Ready'
const LastSyncKey = 'StyleBoard-Last-Sync'

const userStore = useUserStore()
const items = ref([])
const activeType = ref('all')
const cloudSync = ref(uni.getStorageSync(CloudSyncKey) === '1')
const lastSync = ref(uni.getStorageSync(LastSyncKey) || '')
const syncing = ref('')
const checkingUpdate = ref(false)
const appUpdateRef = ref(null)

const filteredItems = computed(() => (
  activeType.value === 'all'
    ? items.value
    : items.value.filter((item) => item.type === activeType.value)
))
const totalValue = computed(() => formatCurrency(items.value.reduce((sum, item) => sum + Number(item.price || 0), 0)))
const isGuest = computed(() => userStore.isGuest)
const accountName = computed(() => userStore.displayName)
const logoutText = computed(() => (isGuest.value ? '退出游客体验' : '退出登录'))
const lastSyncText = computed(() => {
  if (isGuest.value) return '游客模式仅保存在本机'
  if (!cloudSync.value) return '关闭时仅保存在本机'
  return lastSync.value ? `上次同步 ${lastSync.value}` : '等待首次同步'
})

function refresh () {
  items.value = getItems()
  cloudSync.value = uni.getStorageSync(CloudSyncKey) === '1'
  lastSync.value = uni.getStorageSync(LastSyncKey) || ''
}

async function refreshWithCloudSync () {
  if (isGuest.value) {
    refresh()
    return
  }

  const preference = uni.getStorageSync(CloudSyncKey)
  const ready = uni.getStorageSync(CloudSyncReadyKey) === '1'
  if (!userStore.styleSessionInitialized || !ready || (preference !== '1' && preference !== '0')) {
    try {
      await userStore.initializeStyleSession()
    } catch (error) {
      if (!error?.handled) toast(error?.message || '云端同步设置读取失败')
    }
    refresh()
    return
  }

  if (preference === '1') {
    try {
      await userStore.loadStyleData()
    } catch (error) {
      if (!error?.handled) toast(error?.message || '云端衣橱同步失败')
    }
  }

  refresh()
}

function resolvePhoto (path) {
  return resolveAttachmentUrl(path)
}

function costText (item) {
  const cost = getCostPerWear(item)
  return cost ? formatCurrency(cost) : '未计算'
}

function openAdd () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  uni.navigateTo({ url: '/pages/wardrobe/item-edit' })
}

function openDetail (item) {
  uni.navigateTo({ url: `/pages/wardrobe/item-detail?id=${item.id}` })
}

function openLegal (type) {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` })
}

function openCancelAccount () {
  if (isGuest.value) {
    toast('游客模式没有账号可注销，登录后可在这里注销账号')
    return
  }
  uni.navigateTo({ url: '/pages/wardrobe/cancel-account' })
}

async function checkUpdate () {
  if (checkingUpdate.value) return
  checkingUpdate.value = true
  try {
    await appUpdateRef.value?.checkAppUpdate?.({ manual: true })
  } finally {
    checkingUpdate.value = false
  }
}

async function toggleCloudSync (event) {
  if (isGuest.value) {
    cloudSync.value = false
    uni.setStorageSync(CloudSyncKey, '0')
    toast('游客模式仅保存本机数据，登录后可开启云端同步')
    refresh()
    return
  }

  const previousValue = cloudSync.value
  const nextValue = event.detail.value
  cloudSync.value = nextValue
  syncing.value = 'preference'
  try {
    await userStore.saveCloudSyncPreference(nextValue)
    if (nextValue) await saveCloud()
    toast(nextValue ? '云端同步已开启' : '已关闭云端同步', 'success')
  } catch (error) {
    cloudSync.value = previousValue
    uni.setStorageSync(CloudSyncKey, previousValue ? '1' : '0')
    toast(error?.message || '同步设置保存失败')
  } finally {
    syncing.value = ''
    refresh()
  }
}

async function saveCloud () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }

  syncing.value = 'save'
  try {
    await userStore.saveStyleData(getWardrobeState())
    refresh()
    toast('已保存到云端', 'success')
  } catch (error) {
    toast(error?.message || '云端保存失败')
  } finally {
    syncing.value = ''
  }
}

async function restoreCloud () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }

  const result = await showConfirm('取出后会用云端衣橱覆盖本机数据，是否继续？', '从云端取出')
  if (!result.confirm) return
  syncing.value = 'load'
  try {
    await userStore.loadStyleData()
    refresh()
    toast('已从云端取出', 'success')
  } catch (error) {
    toast(error?.message || '云端取出失败')
  } finally {
    syncing.value = ''
  }
}

function openMenu (item) {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  uni.showActionSheet({
    itemList: ['编辑单品', '删除单品'],
    success: async ({ tapIndex }) => {
      if (tapIndex === 0) {
        uni.navigateTo({ url: `/pages/wardrobe/item-edit?id=${item.id}` })
        return
      }
      const result = await showConfirm(`删除“${item.title}”吗？相关穿搭日记也会移除。`, '删除单品')
      if (!result.confirm) return
      removeItem(item.id)
      refresh()
      if (cloudSync.value) await saveCloud()
      toast('已删除', 'success')
    }
  })
}

async function confirmLogout () {
  if (!isGuest.value && !cloudSync.value) {
    const saveResult = await showConfirm(
      '当前账号已关闭云端同步，退出前请先手动保存到云端，避免本机衣橱数据丢失。',
      '退出前提醒',
      {
        confirmText: '去保存云端',
        cancelText: '继续退出'
      }
    )
    if (saveResult.confirm) {
      await saveCloud()
      return
    }
  }

  const result = await showConfirm(
    isGuest.value ? '退出游客体验后，将返回登录页。' : '退出后将返回登录页，请确认需要保留的数据已经保存到云端。',
    isGuest.value ? '退出游客体验' : '退出登录'
  )
  if (!result.confirm) return
  await userStore.logOut()
  uni.reLaunch({ url: '/pages/login/index' })
}

onShow(refreshWithCloudSync)
</script>

<style lang="scss" scoped>
.closet-page {
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 28rpx) 30rpx calc(176rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #fbfaf6 0%, #eef5f0 48%, #f8f3ee 100%);
  color: #18211d;
}

.closet-header,
.sync-panel,
.card-stats,
.account-panel,
.account-actions,
.account-link,
.account-link view {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.closet-title,
.closet-subtitle,
.sync-panel text,
.account-panel text {
  display: block;
}

.closet-title {
  font-size: 52rpx;
  font-weight: 900;
  line-height: 1.12;
}

.closet-subtitle {
  margin-top: 10rpx;
  color: #68746d;
  font-size: 24rpx;
  line-height: 1.35;
}

.add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 74rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #20372f;
  color: #fff;
  font-size: 25rpx;
  font-weight: 850;
  line-height: 1.25;
  box-shadow: 0 16rpx 34rpx rgba(32, 55, 47, 0.16);
}

.sync-panel,
.account-panel {
  margin-top: 26rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.64);
  box-shadow: 0 18rpx 52rpx rgba(31, 40, 36, 0.05);
  backdrop-filter: blur(16px);
}

.sync-panel text:first-child,
.account-panel text:first-child {
  color: #25312c;
  font-size: 28rpx;
  font-weight: 900;
}

.sync-panel text:last-child,
.account-panel text:last-child {
  margin-top: 8rpx;
  color: #7c8580;
  font-size: 22rpx;
}

.type-tabs {
  display: flex;
  gap: 12rpx;
  margin: 28rpx 0 24rpx;
  overflow-x: auto;
}

.type-chip {
  flex: 0 0 auto;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: rgba(32, 55, 47, 0.08);
  color: #606b65;
  font-size: 24rpx;
  font-weight: 800;
  line-height: 56rpx;
}

.type-chip.active {
  background: #20372f;
  color: #fff;
}

.closet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  align-items: stretch;
}

.closet-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 438rpx;
  padding: 14rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 16rpx 42rpx rgba(31, 40, 36, 0.055);
  text-align: left;
  overflow: hidden;
}

.photo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 274rpx;
  border-radius: 20rpx;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), transparent 50%),
    linear-gradient(135deg, #f4efe7, #e8f0eb);
  color: #87918b;
}

.photo-wrap image {
  width: 96%;
  height: 96%;
  filter: drop-shadow(0 14rpx 18rpx rgba(26, 31, 28, 0.12));
}

.card-copy {
  margin-top: 16rpx;
}

.card-copy text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-copy text:first-child {
  color: #25312c;
  font-size: 28rpx;
  font-weight: 900;
}

.card-copy text:last-child,
.card-stats {
  margin-top: 9rpx;
  color: #7d8681;
  font-size: 22rpx;
}

.card-stats text:last-child {
  color: #c95f43;
  font-weight: 850;
}

.empty-closet {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 520rpx;
  color: #7d8681;
}

.empty-closet text {
  display: block;
  margin-top: 18rpx;
  font-size: 25rpx;
  font-weight: 850;
}

.empty-closet text:last-child {
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.account-panel {
  display: block;
}

.account-actions {
  gap: 16rpx;
  margin-top: 22rpx;
}

.account-links {
  overflow: hidden;
  margin-top: 20rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.54);
}

.account-link {
  width: 100%;
  height: 84rpx;
  padding: 0 20rpx;
  border-bottom: 1rpx solid rgba(33, 47, 40, 0.07);
  color: #20372f;
  font-size: 24rpx;
  font-weight: 820;
}

.account-link:last-child {
  border-bottom: 0;
}

.account-link view {
  justify-content: flex-start;
  gap: 12rpx;
  min-width: 0;
}

.account-link text {
  color: inherit;
  font-size: 24rpx;
  line-height: 1.35;
}

.account-link--danger {
  color: #b45642;
}

.account-actions button,
.logout {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76rpx;
  border-radius: 24rpx;
  background: rgba(232, 241, 235, 0.78);
  color: #20372f;
  font-size: 24rpx;
  font-weight: 850;
}

.account-actions button {
  flex: 1;
}

.logout {
  width: 100%;
  margin-top: 16rpx;
  color: #b45642;
  background: rgba(244, 226, 219, 0.8);
}
</style>
