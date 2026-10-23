export function toast (title, icon = 'none') {
  uni.showToast({
    title,
    icon,
    duration: 1800
  })
}

export function showConfirm (content, title = '搭搭衣橱', options = {}) {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      cancelText: options.cancelText || '取消',
      confirmText: options.confirmText || '确定',
      confirmColor: '#24352d',
      success: resolve,
      fail: () => resolve({ confirm: false, cancel: true })
    })
  })
}

export function tansParams (params = {}) {
  let result = ''
  Object.keys(params).forEach((propName) => {
    const value = params[propName]
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.keys(value).forEach((key) => {
          const nestedValue = value[key]
          if (nestedValue !== undefined && nestedValue !== null && nestedValue !== '') {
            result += `${encodeURIComponent(`${propName}[${key}]`)}=${encodeURIComponent(nestedValue)}&`
          }
        })
        return
      }

      result += `${encodeURIComponent(propName)}=${encodeURIComponent(value)}&`
    }
  })
  return result
}

export function formatCurrency (value) {
  return Number(value || 0).toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  })
}

export function daysBetween (dateText) {
  if (!dateText) return null
  const today = new Date()
  const target = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export function formatDate (dateText) {
  if (!dateText) return '未设置'
  const date = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateText
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
