const AppType = {
  H5: 4,
  ANDROID: 5,
  IOS: 6
}

export function getLoginPlatform () {
  let type = AppType.H5

  // #ifdef APP-PLUS
  const systemInfo = uni.getSystemInfoSync()
  type = systemInfo.platform === 'android' ? AppType.ANDROID : AppType.IOS
  // #endif

  return type
}
