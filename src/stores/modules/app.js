import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    appName: '搭搭衣橱',
    safeArea: {
      statusBarHeight: 0,
      windowWidth: 0,
      windowHeight: 0
    },
    lastSyncText: uni.getStorageSync('StyleBoard-Last-Sync') || ''
  }),
  actions: {
    setSystemInfo (info = {}) {
      this.safeArea = {
        statusBarHeight: info.statusBarHeight || 0,
        windowWidth: info.windowWidth || 0,
        windowHeight: info.windowHeight || 0
      }
    },
    setLastSyncText (text) {
      this.lastSyncText = text
      uni.setStorageSync('StyleBoard-Last-Sync', text)
    }
  }
})
