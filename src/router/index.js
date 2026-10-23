import uniCrazyRouter, { afterEach, afterNotNext, beforeEach, onError } from 'uni-crazy-router'
import { hasAppSession } from '@/utils/auth'

const LoginPage = 'pages/login/index'
const HomePage = 'pages/outfit/index'
const PublicPages = [LoginPage, 'pages/legal/index']
let accessRedirectPending = false

function normalizeRoute (url = '') {
  return String(url).replace(/^\//, '').split('?')[0]
}

function getCurrentRoute () {
  const pages = getCurrentPages()
  return normalizeRoute(pages[pages.length - 1]?.route)
}

function redirectPage (method, url) {
  if (accessRedirectPending) return

  accessRedirectPending = true
  uni[method]({
    url,
    fail: () => {},
    complete: () => {
      accessRedirectPending = false
    }
  })
}

export function enforcePageAccess () {
  const target = getCurrentRoute()
  if (!target) return false

  if (!hasAppSession() && !PublicPages.includes(target)) {
    redirectPage('reLaunch', `/${LoginPage}`)
    return false
  }

  if (hasAppSession() && target === LoginPage) {
    redirectPage('switchTab', `/${HomePage}`)
    return false
  }

  return true
}

export function setupRouter (app) {
  app.use(uniCrazyRouter)

  // uni-crazy-router only intercepts navigation API calls. A page lifecycle
  // check also protects cold starts and direct H5 hash navigation.
  app.mixin({
    onLoad () {
      enforcePageAccess()
    }
  })

  beforeEach((to, from, next) => {
    const target = normalizeRoute(to.url)

    if (!hasAppSession() && !PublicPages.includes(target)) {
      afterNotNext(() => {
        redirectPage('reLaunch', `/${LoginPage}`)
      })
      return
    }

    if (hasAppSession() && target === LoginPage) {
      afterNotNext(() => {
        redirectPage('switchTab', `/${HomePage}`)
      })
      return
    }

    next()
  })

  afterEach((to) => {
    uni.setStorageSync('styleBoardPrevPageUrl', to.url)
  })

  onError((to) => {
    uni.showToast({
      title: `${to.url} 不存在`,
      icon: 'none'
    })
  })
}
