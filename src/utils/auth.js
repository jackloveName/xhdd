const TokenKey = 'App-Token'
const GuestModeKey = 'StyleBoard-Guest-Mode'

export function getToken () {
  return uni.getStorageSync(TokenKey)
}

export function setToken (token) {
  return uni.setStorageSync(TokenKey, token)
}

export function removeToken () {
  return uni.removeStorageSync(TokenKey)
}

export function getGuestMode () {
  return uni.getStorageSync(GuestModeKey) === '1'
}

export function setGuestMode () {
  return uni.setStorageSync(GuestModeKey, '1')
}

export function removeGuestMode () {
  return uni.removeStorageSync(GuestModeKey)
}

export function hasAppSession () {
  return Boolean(getToken() || getGuestMode())
}
