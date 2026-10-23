import request from '@/utils/request'

export function getAppUpdateConfig (appName) {
  return request({
    url: `/mall_admin/ua/app/sys_config/get/value/config/${encodeURIComponent(appName)}`,
    headers: { isToken: false },
    method: 'get',
    showError: false,
    timeout: 20000
  })
}
