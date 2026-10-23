import config from '@/config'
import { clearAccountData } from '@/utils/account-storage'
import { getToken, removeGuestMode, removeToken } from '@/utils/auth'
import { showConfirm, tansParams, toast } from '@/utils/common'
import errorCode from '@/utils/error-code'

const timeout = 10000
const baseUrl = config.baseUrl
let sessionPromptVisible = false

function resolveRequestUrl (url = '', requestBaseUrl = '') {
  if (/^https?:\/\//i.test(url)) return url

  const targetBaseUrl = requestBaseUrl || baseUrl
  return `${targetBaseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const request = (options = {}) => {
  const isToken = (options.headers || {}).isToken === false
  const showError = options.showError !== false
  const header = {
    ...(options.header || {}),
    ...(options.headers || {})
  }

  if (getToken() && !isToken) {
    header.Authorization = getToken()
  }

  delete header.isToken

  if (options.params) {
    const query = tansParams(options.params)
    const separator = String(options.url).includes('?') ? '&' : '?'
    options.url = query ? `${options.url}${separator}${query.slice(0, -1)}` : options.url
  }

  return new Promise((resolve, reject) => {
    uni.request({
      method: options.method || 'get',
      timeout: options.timeout || timeout,
      url: resolveRequestUrl(options.url, options.baseUrl),
      data: options.data,
      header,
      dataType: 'json',
      success: (response) => {
        const body = response.data || {}
        const code = body.code ?? response.statusCode ?? 200

        if (code === 401 || code === '401') {
          if (!sessionPromptVisible) {
            sessionPromptVisible = true
            showConfirm('登录状态已过期，是否重新登录？').then((result) => {
              if (!result.confirm) return
              clearLocalSession()
              uni.reLaunch({
                url: '/pages/login/index'
              })
            }).finally(() => {
              sessionPromptVisible = false
            })
          }
          reject(createRequestError(code, '无效的会话，或者会话已过期，请重新登录。'))
          return
        }

        if (code === 'A00005') {
          const message = body.msg || '当前请求暂时无法处理'
          if (showError) toast(message)
          reject(createRequestError('500', message))
          return
        }

        if (code === 'A00006') {
          const message = body.msg || '请求过于频繁，请稍后重试'
          if (showError) toast(message)
          reject(createRequestError('600', message))
          return
        }

        if (code === 'A00001') {
          const message = body.msg || '登录状态已失效'
          toast(message)
          clearLocalSession()
          uni.reLaunch({
            url: '/pages/login/index'
          })
          reject(createRequestError(code, message))
          return
        }

        if (code === '00000') {
          resolve(body.data)
          return
        }

        if (code !== 200 && code !== '200') {
          const message = body.msg || errorCode[String(code)] || errorCode.default
          if (showError) toast(message)
          reject(createRequestError(code, message))
          return
        }

        resolve(body.data ?? body)
      },
      fail: (error) => {
        const message = resolveNetworkErrorMessage(error)
        if (showError) toast(message)
        reject(createRequestError('NETWORK_ERROR', message, error))
      }
    })
  })
}

function createRequestError (code, message, cause) {
  const error = new Error(message)
  error.code = code
  error.handled = true
  if (cause) error.cause = cause
  return error
}

function clearLocalSession () {
  removeToken()
  removeGuestMode()
  uni.removeStorageSync('StyleBoard-User-Profile')
  clearAccountData()
}

function resolveNetworkErrorMessage (error = {}) {
  const message = error.errMsg || error.message || ''

  if (/timeout/i.test(message)) return '系统接口请求超时'
  if (/network|fail/i.test(message)) return '后端接口连接异常'
  if (/status code/i.test(message)) return `系统接口${message.slice(-3)}异常`

  return message || '网络连接异常'
}

export default request
