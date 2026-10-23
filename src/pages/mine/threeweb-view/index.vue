<template>
  <view class="web-page">
    <web-view
      v-if="url"
      :src="url"
      :progress="false"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onBackPress, onLoad, onUnload } from '@dcloudio/uni-app'
import { toast } from '@/utils/common'

const url = ref('')
let returnTimer = null

function isSafeWebUrl (value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

function isExternalUrl (value) {
  return /apps\.apple\.com|open_external=true|\.(?:apk|plist)(?:$|[?#])/i.test(value)
}

function returnToAgreement (delay = 0) {
  clearTimeout(returnTimer)
  returnTimer = setTimeout(() => {
    uni.reLaunch({ url: '/pages/mine/agreement/agreement' })
  }, delay)
}

function openExternalUrl (target) {
  // #ifdef APP-PLUS
  plus.runtime.openURL(target, () => toast('无法打开外部链接'))
  // #endif

  // #ifdef H5
  window.open(target, '_blank', 'noopener,noreferrer')
  // #endif

  returnToAgreement(500)
}

onLoad((query = {}) => {
  let target = ''
  try {
    target = decodeURIComponent(query.url || '')
  } catch (error) {
    target = String(query.url || '')
  }

  if (!isSafeWebUrl(target)) {
    toast('链接地址无效')
    returnToAgreement(300)
    return
  }

  if (isExternalUrl(target)) {
    openExternalUrl(target)
    return
  }

  url.value = target
})

onBackPress(({ from }) => {
  if (from !== 'backbutton') return false
  returnToAgreement()
  return true
})

onUnload(() => clearTimeout(returnTimer))
</script>

<style lang="scss" scoped>
.web-page {
  min-height: 100vh;
  background: #f7f5ef;
}
</style>
