<template>
  <view
    v-if="visible"
    class="update-overlay"
    @touchmove.stop.prevent
    @tap="handleOverlayTap"
  >
    <view
      class="update-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="发现新版本"
      @tap.stop
    >
      <view class="update-hero">
        <button
          v-if="canCancel && !downloading"
          class="update-close"
          hover-class="none"
          aria-label="稍后更新"
          @tap="cancelUpdate"
        >
          <X
            :size="19"
            :stroke-width="1.9"
          />
        </button>

        <view class="app-mark">
          <view class="mark-hanger" />
          <view class="mark-closet">
            <view class="mark-rail" />
            <view class="mark-grid">
              <view />
              <view />
              <view />
              <view />
            </view>
          </view>
        </view>
        <view class="update-kicker">
          <Sparkles
            :size="13"
            :stroke-width="1.9"
          />
          <text>版本整理</text>
        </view>
        <text class="update-title">
          搭搭衣橱有新版本了
        </text>
        <text class="update-subtitle">
          当前 {{ currentVersion }} · 最新 {{ targetVersion }}
        </text>
      </view>

      <view class="update-body">
        <view class="version-row">
          <view>
            <text>版本 {{ targetVersion }}</text>
            <text>{{ forceUpdate ? '需要更新后继续使用' : '更新后穿搭记录和拼图体验更稳定' }}</text>
          </view>
          <view
            class="version-badge"
            :class="{ 'version-badge--required': forceUpdate }"
          >
            {{ forceUpdate ? '必须更新' : '新版本' }}
          </view>
        </view>

        <view class="notes-block">
          <view class="notes-heading">
            <FileText
              :size="17"
              :stroke-width="1.8"
            />
            <text>本次更新</text>
          </view>
          <scroll-view
            class="notes-scroll"
            scroll-y
          >
            <text class="notes-content">
              {{ updateDescription }}
            </text>
          </scroll-view>
        </view>

        <view
          v-if="downloading"
          class="download-state"
        >
          <view class="progress-track">
            <view
              class="progress-value"
              :style="{ width: `${progress}%` }"
            />
          </view>
          <view class="progress-copy">
            <text>{{ statusMessage }}</text>
            <text>{{ progress }}%</text>
          </view>
        </view>

        <view
          v-else
          class="update-actions"
        >
          <button
            v-if="canCancel"
            class="update-action update-action--secondary"
            hover-class="none"
            @tap="cancelUpdate"
          >
            稍后更新
          </button>
          <button
            class="update-action update-action--primary"
            hover-class="none"
            @tap="confirmUpdate"
          >
            <Download
              :size="18"
              :stroke-width="1.9"
            />
            <text>{{ platformName === 'ios' ? '前往 App Store' : '立即更新' }}</text>
          </button>
        </view>

        <view class="security-line">
          <ShieldCheck
            :size="15"
            :stroke-width="1.8"
          />
          <text>更新由官方版本配置提供，数据仍保存在你的账号下</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { Download, FileText, ShieldCheck, Sparkles, X } from '@/components/icons'
import { getAppUpdateConfig } from '@/api/app-update'
import manifest from '@/manifest.json'
import { toast } from '@/utils/common'

const emit = defineEmits(['dismiss'])
const SkipUpdateKey = 'StyleBoard-Skipped-App-Update'
const SkipDuration = 24 * 60 * 60 * 1000
const isDevRuntime = import.meta.env.DEV

const visible = ref(false)
const downloading = ref(false)
const progress = ref(0)
const statusMessage = ref('正在下载更新包')
const currentVersion = ref(manifest.versionName || '1.0.0')
const targetVersion = ref('')
const updateDescription = ref('优化使用体验并修复已知问题。')
const platformName = ref('ios')
const updateConfig = ref({
  downloadUrl: '',
  updateType: 0,
  updateWay: 1
})

let downloadTask = null

const forceUpdate = computed(() => updateConfig.value.updateType === 2)
const canCancel = computed(() => updateConfig.value.updateType === 1)

function parseConfig (payload) {
  if (!payload) return {}
  if (typeof payload === 'object') return payload
  try {
    return JSON.parse(payload)
  } catch (error) {
    throw new Error('版本配置格式无效')
  }
}

function readRuntimeInfo () {
  const systemInfo = uni.getSystemInfoSync() || {}
  let version = systemInfo.appVersion || manifest.versionName || '1.0.0'
  let platform = String(systemInfo.osName || systemInfo.platform || 'ios').toLowerCase()
  let runtimeVersion = ''

  // #ifdef APP-PLUS
  runtimeVersion = plus.runtime.version || ''
  version = isDevRuntime
    ? manifest.versionName || version
    : runtimeVersion || version
  platform = String(plus.os.name || platform).toLowerCase()
  // #endif

  return {
    appName: '薪花记账',
    platform: platform.includes('ios') ? 'ios' : 'android',
    version,
    runtimeVersion,
    manifestVersion: manifest.versionName || ''
  }
}

function readSkippedUpdate () {
  const payload = uni.getStorageSync(SkipUpdateKey)
  if (!payload) return null
  try {
    return typeof payload === 'string' ? JSON.parse(payload) : payload
  } catch (error) {
    uni.removeStorageSync(SkipUpdateKey)
    return null
  }
}

function shouldSkipUpdate (version) {
  const skipped = readSkippedUpdate()
  return skipped?.version === version && Number(skipped.until || 0) > Date.now()
}

function applyPlatformConfig (payload, platform) {
  if (platform === 'ios') {
    return {
      updateType: Number(payload.iosUpdateType || 0),
      updateWay: Number(payload.iosUpdateWay ?? 1),
      targetVersion: String(payload.iosAppVersion || ''),
      downloadUrl: String(payload.iosAppDownloadUrl || payload.h5DownloadUrl || ''),
      description: payload.iosVersionDesc || payload.versionDesc
    }
  }

  return {
    updateType: Number(payload.androidUpdateType || 0),
    updateWay: Number(payload.androidUpdateWay || 0),
    targetVersion: String(payload.androidVersion || ''),
    downloadUrl: String(payload.androidAppDownloadUrl || payload.h5DownloadUrl || ''),
    description: payload.androidVersionDesc || payload.versionDesc
  }
}

function isDifferentVersion (current, target) {
  return String(current || '').trim() !== String(target || '').trim()
}

async function checkAppUpdate ({ manual = false } = {}) {
  let updateVisible = false

  // #ifdef APP-PLUS
  try {
    const runtime = readRuntimeInfo()
    const payload = parseConfig(await getAppUpdateConfig(runtime.appName))
    const next = applyPlatformConfig(payload, runtime.platform)
    const hasNewVersion = next.updateType > 0 &&
      next.targetVersion &&
      isDifferentVersion(runtime.version, next.targetVersion) &&
      next.downloadUrl

    logUpdateDebug(runtime, next, hasNewVersion)

    if (!hasNewVersion) {
      visible.value = false
      if (manual) toast('当前已是最新版本', 'success')
    } else if (!manual && next.updateType === 1 && shouldSkipUpdate(next.targetVersion)) {
      visible.value = false
    } else {
      currentVersion.value = runtime.version
      targetVersion.value = next.targetVersion
      platformName.value = runtime.platform
      updateDescription.value = String(next.description || '优化使用体验并修复已知问题。').trim()
      updateConfig.value = {
        downloadUrl: next.downloadUrl,
        updateType: next.updateType,
        updateWay: next.updateWay
      }
      visible.value = true
      updateVisible = true
      uni.hideTabBar()
    }
  } catch (error) {
    if (manual) toast(error?.message || '暂时无法检查更新')
  }
  // #endif

  // #ifndef APP-PLUS
  if (manual) toast('请在搭搭衣橱 App 内检查更新')
  // #endif

  return updateVisible
}

function logUpdateDebug (runtime, next, hasNewVersion) {
  if (!isDevRuntime) return

  console.info('[AppUpdate]', {
    appName: runtime.appName,
    platform: runtime.platform,
    checkVersion: runtime.version,
    runtimeVersion: runtime.runtimeVersion,
    manifestVersion: runtime.manifestVersion,
    targetVersion: next.targetVersion,
    updateType: next.updateType,
    updateWay: next.updateWay,
    hasDownloadUrl: Boolean(next.downloadUrl),
    hasNewVersion: Boolean(hasNewVersion)
  })
}

function handleOverlayTap () {
  if (forceUpdate.value || downloading.value) toast('请先完成版本更新')
}

function cancelUpdate () {
  if (!canCancel.value || downloading.value) return
  uni.setStorageSync(SkipUpdateKey, JSON.stringify({
    version: targetVersion.value,
    until: Date.now() + SkipDuration
  }))
  visible.value = false
  uni.showTabBar()
  emit('dismiss')
}

function openDownloadUrl () {
  if (!updateConfig.value.downloadUrl) {
    toast('更新地址暂未配置')
    return
  }

  // #ifdef APP-PLUS
  plus.runtime.openURL(updateConfig.value.downloadUrl, () => {
    toast('无法打开更新地址')
  })
  // #endif
}

function confirmUpdate () {
  // #ifdef APP-PLUS
  if (platformName.value === 'ios' || updateConfig.value.updateWay === 1) {
    openDownloadUrl()
    return
  }

  if (!updateConfig.value.downloadUrl) {
    toast('更新地址暂未配置')
    return
  }

  downloading.value = true
  progress.value = 0
  statusMessage.value = '正在下载更新包'
  downloadTask = uni.downloadFile({
    url: updateConfig.value.downloadUrl,
    success: installDownloadedPackage,
    fail: () => resetDownload('更新包下载失败')
  })
  downloadTask.onProgressUpdate((result) => {
    progress.value = Math.min(100, Math.max(0, Math.floor(result.progress || 0)))
    if (progress.value >= 100) statusMessage.value = '下载完成，正在准备安装'
  })
  // #endif
}

function installDownloadedPackage (result) {
  // #ifdef APP-PLUS
  if (result.statusCode !== 200) {
    resetDownload('更新包下载失败')
    return
  }

  progress.value = 100
  statusMessage.value = '正在安装新版本'
  plus.runtime.install(result.tempFilePath, { force: false }, () => {
    downloading.value = false
    uni.showModal({
      title: '更新已安装',
      content: '重启搭搭衣橱即可使用新版本。',
      showCancel: false,
      confirmText: '立即重启',
      confirmColor: '#24352d',
      success: () => plus.runtime.restart()
    })
  }, () => resetDownload('新版本安装失败'))
  // #endif
}

function resetDownload (message) {
  downloading.value = false
  progress.value = 0
  statusMessage.value = '正在下载更新包'
  toast(message)
}

onUnmounted(() => {
  downloadTask?.abort?.()
  if (visible.value) uni.showTabBar()
})

defineExpose({
  checkAppUpdate
})
</script>

<style lang="scss" scoped>
.update-overlay {
  position: fixed;
  z-index: 9999;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  background: rgba(25, 34, 29, 0.52);
  backdrop-filter: blur(14px);
}

.update-dialog {
  width: 100%;
  max-width: 650rpx;
  overflow: hidden;
  border: 1rpx solid rgba(33, 47, 40, 0.08);
  border-radius: 34rpx;
  background: #fbfaf6;
  box-shadow: 0 38rpx 110rpx rgba(18, 31, 25, 0.28);
}

.update-hero {
  position: relative;
  padding: 46rpx 42rpx 36rpx;
  background:
    linear-gradient(90deg, rgba(33, 47, 40, 0.05) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(33, 47, 40, 0.05) 1rpx, transparent 1rpx),
    radial-gradient(circle at 78% 18%, rgba(225, 104, 79, 0.16), transparent 23%),
    radial-gradient(circle at 14% 86%, rgba(168, 186, 170, 0.22), transparent 26%),
    linear-gradient(135deg, #fff8ea 0%, #f4f8ef 58%, #f8eee7 100%);
  background-size: 54rpx 54rpx, 54rpx 54rpx, 100% 100%, 100% 100%, 100% 100%;
  color: #17231e;
}

.update-close {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border: 1rpx solid rgba(32, 55, 47, 0.1);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  color: #253a31;
  box-shadow: 0 14rpx 32rpx rgba(25, 32, 28, 0.08);
}

.app-mark {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 126rpx;
  height: 126rpx;
  border: 1rpx solid rgba(32, 55, 47, 0.08);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 20rpx 46rpx rgba(32, 55, 47, 0.13);
}

.mark-hanger {
  position: absolute;
  top: 22rpx;
  width: 38rpx;
  height: 34rpx;
  border-top: 12rpx solid #174236;
  border-right: 12rpx solid #174236;
  border-radius: 50% 50% 0 0;
  transform: rotate(42deg);
}

.mark-closet {
  position: absolute;
  bottom: 22rpx;
  left: 25rpx;
  right: 25rpx;
  height: 58rpx;
  border-radius: 13rpx;
  background: #174236;
}

.mark-rail {
  position: absolute;
  top: 14rpx;
  left: 12rpx;
  right: 12rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #dfe8dc;
}

.mark-grid {
  position: absolute;
  right: 12rpx;
  bottom: 10rpx;
  left: 12rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6rpx;
}

.mark-grid view {
  height: 20rpx;
  border-radius: 5rpx;
  background: #a8baaa;
}

.mark-grid view:nth-child(2),
.mark-grid view:nth-child(4) {
  background: #e1684f;
}

.update-kicker,
.notes-heading,
.progress-copy,
.security-line,
.update-action {
  display: flex;
  align-items: center;
}

.update-kicker {
  align-self: flex-start;
  gap: 9rpx;
  margin-top: 28rpx;
  padding: 9rpx 15rpx;
  border: 1rpx solid rgba(225, 104, 79, 0.16);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.68);
  color: #c45b43;
  font-size: 20rpx;
  font-weight: 850;
}

.update-title,
.update-subtitle,
.version-row text,
.notes-content {
  display: block;
}

.update-title {
  margin-top: 18rpx;
  color: #17231e;
  font-size: 42rpx;
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: 0;
}

.update-subtitle {
  margin-top: 12rpx;
  color: #728078;
  font-size: 23rpx;
  line-height: 1.35;
}

.update-body {
  padding: 30rpx 34rpx 30rpx;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.68);
}

.version-row > view:first-child {
  flex: 1;
  min-width: 0;
}

.version-row text:first-child {
  color: #1d2b25;
  font-size: 28rpx;
  font-weight: 850;
}

.version-row text:last-child {
  margin-top: 8rpx;
  color: #7a857e;
  font-size: 21rpx;
  line-height: 1.35;
  white-space: normal;
}

.version-badge {
  flex: 0 0 auto;
  padding: 10rpx 16rpx;
  border: 1rpx solid rgba(69, 107, 91, 0.18);
  border-radius: 999rpx;
  background: rgba(69, 107, 91, 0.1);
  color: #315f4c;
  font-size: 20rpx;
  font-weight: 850;
}

.version-badge--required {
  border-color: rgba(225, 104, 79, 0.22);
  background: rgba(225, 104, 79, 0.12);
  color: #c6533b;
}

.notes-block {
  margin-top: 28rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background:
    radial-gradient(circle at 100% 0%, rgba(168, 186, 170, 0.14), transparent 28%),
    rgba(244, 247, 241, 0.92);
}

.notes-heading {
  gap: 10rpx;
  color: #315f4c;
  font-size: 23rpx;
  font-weight: 850;
}

.notes-scroll {
  max-height: 220rpx;
  margin-top: 15rpx;
}

.notes-content {
  color: #5f6963;
  font-size: 23rpx;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
}

.download-state {
  margin-top: 30rpx;
}

.progress-track {
  width: 100%;
  height: 14rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #e0e5dc;
}

.progress-value {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #315f4c, #e1684f);
  transition: width 0.25s ease;
}

.progress-copy {
  justify-content: space-between;
  margin-top: 13rpx;
  color: #707a73;
  font-size: 21rpx;
}

.update-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 30rpx;
}

.update-actions > .update-action:only-child {
  grid-column: 1 / -1;
}

.update-action {
  justify-content: center;
  gap: 10rpx;
  width: 100%;
  height: 88rpx;
  border-radius: 999rpx;
  font-size: 25rpx;
  font-weight: 900;
  line-height: 1.25;
}

.update-action--secondary {
  border: 1rpx solid rgba(33, 47, 40, 0.1);
  background: rgba(255, 255, 255, 0.7);
  color: #536058;
}

.update-action--primary {
  background: #d35d45;
  color: #fff;
  box-shadow: 0 18rpx 36rpx rgba(211, 93, 69, 0.22);
}

.security-line {
  justify-content: center;
  gap: 8rpx;
  margin-top: 22rpx;
  color: #89928c;
  font-size: 19rpx;
  line-height: 1.4;
  text-align: center;
  white-space: normal;
}
</style>
