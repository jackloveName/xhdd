import { clearVaultSecurity } from '@/utils/secure-storage'
import { clearWardrobeData } from '@/utils/wardrobe-data'

const AccountStorageKeys = [
  'StyleBoard-Cloud-Sync',
  'StyleBoard-Cloud-Sync-Remote-Ready',
  'StyleBoard-Last-Sync',
  'StyleBoard-Last-Open',
  'styleBoardPrevPageUrl'
]

export function clearAccountData () {
  clearWardrobeData()
  clearVaultSecurity()
  AccountStorageKeys.forEach((key) => uni.removeStorageSync(key))
}
