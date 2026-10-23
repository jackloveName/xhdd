import request from '@/utils/request'

export function getLoginCode (data) {
  return request({
    url: '/mall_biz/ua/sms/verification_code/login_whocode',
    headers: { isToken: false },
    method: 'put',
    timeout: 20000,
    data
  })
}

export function loginWithCode (data) {
  console.log(data)
  return request({
    url: '/mall_auth/ua/login_with_code',
    headers: { isToken: false },
    method: 'post',
    data
  })
}

export function accountLogin (data) {
  return request({
    url: '/mall_auth/ua/login',
    headers: { isToken: false },
    method: 'post',
    data
  })
}

export function getUserDetailInfo () {
  return request({
    url: '/mall_user/user/ma/user_detail_info',
    method: 'get'
  })
}

export function logout () {
  return request({
    url: '/mall_auth/ma/login_out',
    method: 'post'
  })
}

export function destroyAccount (forceDestroy = false) {
  return request({
    url: '/mall_user/user/destroy_user',
    method: 'get',
    params: {
      forceDestroy
    }
  })
}
