import request from '@/utils/request'

export function getAppConfig (key) {
  return request({
    url: `/mall_admin/ua/app/sys_config/get/other/value/config/${encodeURIComponent(key)}`,
    method: 'get',
    timeout: 20000
  })
}

export function saveAppConfig (data) {
  return request({
    url: '/mall_admin/p/sys_config/ua/other/save',
    method: 'post',
    data,
    timeout: 20000
  })
}
