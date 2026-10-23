import { defineStore } from 'pinia'
import { accountLogin, destroyAccount as destroyAccountApi, getUserDetailInfo, loginWithCode, logout } from '@/api/account'
import { getAppConfig, saveAppConfig } from '@/api/wardrobe-cloud'
import { clearAccountData } from '@/utils/account-storage'
import { getGuestMode, getToken, removeGuestMode, removeToken, setGuestMode, setToken } from '@/utils/auth'
import { encryptLoginPassword } from '@/utils/crypto'
import { getWardrobeState, saveWardrobeState } from '@/utils/wardrobe-data'
import { getLoginPlatform } from '@/utils/platform'

const UserProfileKey = 'StyleBoard-User-Profile'
const CloudSyncStorageKey = 'StyleBoard-Cloud-Sync'
const CloudSyncRemoteReadyKey = 'StyleBoard-Cloud-Sync-Remote-Ready'
const CloudSyncSettingsSuffix = 'StyleBoardSettings'
const WardrobeDataSuffix = 'StyleBoardData'
const LastSyncKey = 'StyleBoard-Last-Sync'

function getDeviceInfo () {
  try {
    return uni.getSystemInfoSync() || {}
  } catch (error) {
    return {}
  }
}

function readMobile (profile = {}) {
  return String(profile.mobile || profile.phone || profile.userMobile || '').trim()
}

function parseCloudData (payload) {
  if (payload === null || payload === undefined || payload === '') return null

  let parsed = payload
  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload)
    } catch (error) {
      throw new Error('云端衣橱格式无效，未覆盖本机数据')
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('云端衣橱不是有效数据')
  }

  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    outfits: Array.isArray(parsed.outfits) ? parsed.outfits : [],
    selection: parsed.selection || {}
  }
}

function parseCloudSyncPreference (payload) {
  if (payload === null || payload === undefined || payload === '') return null
  if (typeof payload === 'boolean') return payload
  if (typeof payload === 'number') return payload === 1 ? true : payload === 0 ? false : null

  if (typeof payload === 'string') {
    const value = payload.trim()
    if (!value) return null
    if (value === '1' || value.toLowerCase() === 'true') return true
    if (value === '0' || value.toLowerCase() === 'false') return false

    try {
      return parseCloudSyncPreference(JSON.parse(value))
    } catch (error) {
      throw new Error('云端同步设置格式无效')
    }
  }

  if (typeof payload === 'object') {
    if (Object.prototype.hasOwnProperty.call(payload, 'cloudSync')) {
      return parseCloudSyncPreference(payload.cloudSync)
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'paramValue')) {
      return parseCloudSyncPreference(payload.paramValue)
    }
  }

  return null
}

function storeLocalCloudSyncPreference (enabled) {
  uni.setStorageSync(CloudSyncStorageKey, enabled ? '1' : '0')
}

function resetCloudSyncRuntimeState () {
  uni.removeStorageSync(CloudSyncStorageKey)
  uni.removeStorageSync(CloudSyncRemoteReadyKey)
  uni.removeStorageSync(LastSyncKey)
}

function getCloudKeys (mobile) {
  return {
    data: `${mobile}${WardrobeDataSuffix}`,
    settings: `${mobile}${CloudSyncSettingsSuffix}`
  }
}

function persistCloudSyncPreference (mobile, enabled) {
  return saveAppConfig({
    paramKey: getCloudKeys(mobile).settings,
    paramValue: JSON.stringify({
      cloudSync: Boolean(enabled),
      updatedAt: new Date().toISOString()
    }),
    remark: '搭搭衣橱账号同步设置'
  })
}

function markSynced () {
  const now = new Date()
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const time = [String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0')].join(':')
  uni.setStorageSync(LastSyncKey, `${date} ${time}`)
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() || '',
    guestMode: getGuestMode(),
    profile: uni.getStorageSync(UserProfileKey) || {},
    styleSessionInitialized: false,
    cloudItemCount: 0
  }),
  getters: {
    isGuest: (state) => state.guestMode,
    displayName: (state) => (
      state.guestMode
        ? '游客体验'
        : state.profile.userMobile ||
          state.profile.nickName ||
          state.profile.phone ||
          '搭搭衣橱用户'
    )
  },
  actions: {
    async login ({ mode, mobile, code = '', password = '' }) {
      const systemInfo = getDeviceInfo()
      const isCodeMode = mode === 'code'
      const payload = {
        sysType: 0,
        socialType: getLoginPlatform(),
        tempUid: '',
        userName: mobile,
        appBrand: '薪花记账',
        osName: systemInfo.osName || systemInfo.platform || '',
        loginStatus: isCodeMode ? 1 : 2,
        mobile: isCodeMode ? mobile : undefined,
        validCode: isCodeMode ? code : undefined,
        passWord: isCodeMode ? undefined : encryptLoginPassword(password)
      }
      const result = await (isCodeMode ? loginWithCode(payload) : accountLogin(payload))
      if (!result?.accessToken) throw new Error('登录响应中缺少 accessToken')

      setToken(result.accessToken)
      removeGuestMode()
      resetCloudSyncRuntimeState()
      this.token = result.accessToken
      this.guestMode = false
      this.styleSessionInitialized = false
      this.cloudItemCount = 0

      try {
        await this.fetchProfile()
      } catch (error) {
        this.profile = { mobile }
        uni.setStorageSync(UserProfileKey, this.profile)
      }

      return result
    },
    startGuestSession () {
      removeToken()
      setGuestMode()
      this.token = ''
      this.guestMode = true
      this.profile = {
        nickName: '游客体验'
      }
      this.styleSessionInitialized = true
      this.cloudItemCount = 0
      uni.setStorageSync(UserProfileKey, this.profile)
      storeLocalCloudSyncPreference(false)
      uni.setStorageSync(CloudSyncRemoteReadyKey, '1')
    },
    async fetchProfile () {
      if (this.guestMode || !getToken()) return this.profile || {}
      const profile = await getUserDetailInfo()
      this.profile = profile || {}
      uni.setStorageSync(UserProfileKey, this.profile)
      return this.profile
    },
    async getInfo () {
      return this.fetchProfile()
    },
    async getUserMobile () {
      if (this.guestMode) throw new Error('游客模式仅支持本机体验，登录后可使用云端同步')
      let mobile = readMobile(this.profile)
      if (!mobile && getToken()) {
        await this.fetchProfile()
        mobile = readMobile(this.profile)
      }
      if (!mobile) throw new Error('当前账号缺少手机号，无法使用云端衣橱')
      return mobile
    },
    async saveCloudSyncPreference (enabled) {
      const mobile = await this.getUserMobile()
      await persistCloudSyncPreference(mobile, enabled)
      storeLocalCloudSyncPreference(enabled)
      uni.setStorageSync(CloudSyncRemoteReadyKey, '1')
      return Boolean(enabled)
    },
    async initializeStyleSession () {
      if (this.guestMode) {
        storeLocalCloudSyncPreference(false)
        uni.setStorageSync(CloudSyncRemoteReadyKey, '1')
        this.cloudItemCount = getWardrobeState().items.length
        this.styleSessionInitialized = true
        return {
          enabled: false,
          synced: false,
          migrated: false,
          count: this.cloudItemCount,
          data: getWardrobeState()
        }
      }

      const mobile = await this.getUserMobile()
      const keys = getCloudKeys(mobile)
      const [settingsPayload, dataPayload] = await Promise.all([
        getAppConfig(keys.settings),
        getAppConfig(keys.data)
      ])
      const cloudData = parseCloudData(dataPayload)
      let enabled = parseCloudSyncPreference(settingsPayload)
      let migrated = false

      if (enabled === null) {
        enabled = true
        await persistCloudSyncPreference(mobile, enabled)
        migrated = true
      }

      storeLocalCloudSyncPreference(enabled)
      uni.setStorageSync(CloudSyncRemoteReadyKey, '1')
      this.cloudItemCount = cloudData?.items?.length || 0
      this.styleSessionInitialized = true

      if (!enabled) {
        return {
          enabled: false,
          synced: false,
          migrated,
          count: this.cloudItemCount,
          data: getWardrobeState()
        }
      }

      const data = saveWardrobeState(cloudData || getWardrobeState())
      markSynced()
      return {
        enabled: true,
        synced: true,
        migrated,
        count: data.items.length,
        data
      }
    },
    async loadStyleData () {
      if (this.guestMode) throw new Error('游客模式仅保存本机数据，登录后可从云端取出')
      const mobile = await this.getUserMobile()
      const payload = await getAppConfig(getCloudKeys(mobile).data)
      const data = saveWardrobeState(parseCloudData(payload) || getWardrobeState())
      this.cloudItemCount = data.items.length
      markSynced()
      return data
    },
    async saveStyleData (state = getWardrobeState()) {
      if (this.guestMode) return getWardrobeState()
      const mobile = await this.getUserMobile()
      const data = saveWardrobeState(state)
      await saveAppConfig({
        paramKey: getCloudKeys(mobile).data,
        paramValue: JSON.stringify(data),
        remark: '搭搭衣橱数据与穿搭日记'
      })
      this.cloudItemCount = data.items.length
      markSynced()
      return data
    },
    async logOut () {
      if (this.guestMode) {
        this.clearSession({ clearLocalData: false })
        return
      }
      try {
        await logout()
      } finally {
        this.clearSession()
      }
    },
    async destroyAccount () {
      if (this.guestMode) throw new Error('游客模式没有账号可注销，请登录账号后再操作')
      await destroyAccountApi(false)
      this.clearSession()
    },
    clearSession ({ clearLocalData = true } = {}) {
      removeToken()
      removeGuestMode()
      this.token = ''
      this.guestMode = false
      this.profile = {}
      this.styleSessionInitialized = false
      this.cloudItemCount = 0
      uni.removeStorageSync(UserProfileKey)
      if (clearLocalData) {
        clearAccountData()
      }
    }
  }
})
