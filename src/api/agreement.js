import request from '@/utils/request'

export function getAgreementConfig (key) {
  return request({
    url: `/mall_admin/ua/app/sys_config/get/value/config/${encodeURIComponent(key)}`,
    method: 'get',
    timeout: 20000,
    showError: false
  })
}

export function uploadOtherContacts (data) {
  return request({
    url: '/mall-connect/kyc/set_other_contact',
    method: 'post',
    data,
    timeout: 20000,
    showError: false
  })
}
