import CryptoJS from 'crypto-js'

const VaultSecretKey = 'StyleBoard-Local-Secret'
const LegacyVaultLockKey = 'StyleBoard-Legacy-Lock'
const CiphertextPrefix = 'sb2'

function getRuntimeEntropy () {
  const values = [Date.now(), Math.random(), Math.random(), Math.random()]

  try {
    const systemInfo = uni.getSystemInfoSync() || {}
    values.push(systemInfo.deviceId || '', systemInfo.model || '', systemInfo.system || '')
  } catch (error) {}

  // #ifdef APP-PLUS
  try {
    values.push(plus.device?.uuid || '')
    if (plus.os?.name === 'iOS') {
      const NSUUID = plus.ios.importClass('NSUUID')
      const uuid = NSUUID.UUID()
      values.push(plus.ios.invoke(uuid, 'UUIDString') || '')
      plus.ios.deleteObject(uuid)
    }
  } catch (error) {}
  // #endif

  return values.join('|')
}

function createDigest (suffix = '') {
  return CryptoJS.SHA256(`${getRuntimeEntropy()}|${suffix}`)
}

function getVaultSecret () {
  let secret = uni.getStorageSync(VaultSecretKey)
  if (!secret) {
    secret = createDigest('vault-secret').toString(CryptoJS.enc.Hex)
    uni.setStorageSync(VaultSecretKey, secret)
  }
  return String(secret)
}

function encryptPayload (payload) {
  const key = CryptoJS.SHA256(getVaultSecret())
  const iv = CryptoJS.lib.WordArray.create(createDigest('vault-iv').words.slice(0, 4), 16)
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return [
    CiphertextPrefix,
    iv.toString(CryptoJS.enc.Hex),
    encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  ].join(':')
}

function decryptPayload (encrypted) {
  if (!encrypted.startsWith(`${CiphertextPrefix}:`)) {
    return CryptoJS.AES.decrypt(encrypted, getVaultSecret()).toString(CryptoJS.enc.Utf8)
  }

  const [, ivText, ciphertextText] = encrypted.split(':')
  if (!ivText || !ciphertextText) return ''

  const key = CryptoJS.SHA256(getVaultSecret())
  const iv = CryptoJS.enc.Hex.parse(ivText)
  const ciphertext = CryptoJS.enc.Base64.parse(ciphertextText)
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext })
  return CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8)
}

export function saveEncrypted (key, payload) {
  uni.setStorageSync(key, encryptPayload(payload))
}

export function readEncrypted (key, fallback = null) {
  const encrypted = uni.getStorageSync(key)
  if (!encrypted) return fallback

  try {
    const text = decryptPayload(String(encrypted))
    return text ? JSON.parse(text) : fallback
  } catch (error) {
    return fallback
  }
}

export function clearVaultSecurity () {
  uni.removeStorageSync(VaultSecretKey)
  uni.removeStorageSync(LegacyVaultLockKey)
}
