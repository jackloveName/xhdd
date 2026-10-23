<script>
import { useAppStore } from '@/stores'
import { hasAppSession } from '@/utils/auth'
import { enforcePageAccess } from '@/router'

const LoginPage = 'pages/login/index'

export default {
  onLaunch () {
    uni.setStorageSync('StyleBoard-Last-Open', Date.now())
    uni.getSystemInfo({
      success: (res) => {
        useAppStore().setSystemInfo(res)
      }
    })
  },
  onShow () {
    enforcePageAccess()
  },
  onPageNotFound () {
    uni.reLaunch({
      url: hasAppSession() ? '/pages/outfit/index' : `/${LoginPage}`
    })
  },
  globalData: {
    requestQueue: [],
    requestAbortQueue: [],
    currentReqCounts: 0,
    isLanding: false,
    sysInfo: {}
  }
}
</script>

<style lang="scss">
@import '@/styles/index.scss';
</style>
