<template>
  <view class="legal-page">
    <view class="legal-topbar">
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
      <text>{{ pageTitle }}</text>
      <view class="topbar-spacer" />
    </view>

    <view class="legal-content">
      <view class="document-heading">
        <view class="document-icon">
          <FileText
            :size="27"
            :stroke-width="1.6"
          />
        </view>
        <view>
          <text class="legal-title">
            {{ pageTitle }}
          </text>
          <text class="legal-caption">
            请仔细阅读全部条款
          </text>
        </view>
      </view>

      <view
        v-if="loading"
        class="legal-state"
      >
        <view class="loading-ring" />
        <text>正在加载协议内容</text>
      </view>

      <button
        v-else-if="loadFailed"
        class="legal-state legal-retry"
        hover-class="none"
        @tap="loadDocument"
      >
        <RefreshCw
          :size="24"
          :stroke-width="1.7"
        />
        <text>加载失败，点击重试</text>
      </button>

      <rich-text
        v-else
        class="legal-document"
        :nodes="content"
      />
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ArrowLeft, FileText, RefreshCw } from '@/components/icons'
import { getLegalDocument, LegalDocumentKeys } from '@/api/legal'

const type = ref('privacy')
const content = ref('')
const loading = ref(true)
const loadFailed = ref(false)

const pageTitle = computed(() => (type.value === 'agreement' ? '注册协议' : '隐私协议'))

function back () {
  uni.navigateBack()
}

function replaceDocumentVariables (value) {
  const systemInfo = uni.getSystemInfoSync()
  const isIos = systemInfo.osName === 'ios' || systemInfo.platform === 'ios'
  const operator = isIos ? 'Weston Grant' : '扬州言范软科技有限公司'
  const email = isIos ? 'westongrant43@icloud.com' : 'lisaXking789@outlook.com'
  return String(value || '')
    .replace(/\$\{name\}/g, operator)
    .replace(/\$\{email\}/g, email)
    .replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/i, '')
}

async function loadDocument () {
  loading.value = true
  loadFailed.value = false
  try {
    const result = await getLegalDocument(LegalDocumentKeys[type.value])
    const html = typeof result === 'string' ? result : (result?.value || result?.content || '')
    content.value = replaceDocumentVariables(html)
    loadFailed.value = !content.value.trim()
  } catch (error) {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

onLoad((query) => {
  type.value = query.type === 'agreement' ? 'agreement' : 'privacy'
  loadDocument()
})
</script>

<style lang="scss" scoped>
.legal-page {
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 18rpx) 32rpx 72rpx;
  background: #f7f5ef;
  color: #15382d;
}

.legal-topbar {
  display: grid;
  grid-template-columns: 70rpx 1fr 70rpx;
  align-items: center;
  min-height: 76rpx;
  font-size: 28rpx;
  font-weight: 800;
  text-align: center;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70rpx;
  height: 70rpx;
  margin: 0;
  color: #315f4c;
}

.legal-content {
  max-width: 840rpx;
  margin: 38rpx auto 0;
}

.document-heading {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding-bottom: 28rpx;
  border-bottom: 1rpx solid #d9d6cd;
}

.document-icon {
  display: flex;
  flex: 0 0 68rpx;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  height: 68rpx;
  border: 1rpx solid #d6d4cb;
  border-radius: 8px;
  background: #eef1ec;
  color: #315f4c;
}

.legal-title,
.legal-caption {
  display: block;
}

.legal-title {
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1.2;
}

.legal-caption {
  margin-top: 8rpx;
  color: #7d8581;
  font-size: 20rpx;
}

.legal-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  width: 100%;
  min-height: 360rpx;
  margin: 0;
  color: #7a827e;
  font-size: 23rpx;
}

.legal-retry {
  color: #315f4c;
}

.loading-ring {
  width: 42rpx;
  height: 42rpx;
  border: 4rpx solid #d8ddd9;
  border-top-color: #315f4c;
  border-radius: 50%;
  animation: legal-loading 800ms linear infinite;
}

.legal-document {
  display: block;
  padding: 30rpx 0;
  color: #4f5e58;
  font-size: 25rpx;
  line-height: 1.85;
}

.legal-document :deep(h1) {
  margin: 4rpx 0 24rpx;
  color: #15382d;
  font-size: 36rpx;
  line-height: 1.35;
}

.legal-document :deep(h2) {
  margin: 32rpx 0 12rpx;
  color: #263f36;
  font-size: 28rpx;
  line-height: 1.5;
}

.legal-document :deep(p) {
  margin: 12rpx 0;
}

@keyframes legal-loading {
  to { transform: rotate(360deg); }
}
</style>
