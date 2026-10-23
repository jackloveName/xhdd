import CryptoJS from 'crypto-js'

const LoginPasswordKey = '-mall--password-'

export function encryptLoginPassword (password) {
  const key = CryptoJS.enc.Utf8.parse(LoginPasswordKey)
  const source = CryptoJS.enc.Utf8.parse(`${Date.now()}${password}`)
  return CryptoJS.AES.encrypt(source, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString()
}
