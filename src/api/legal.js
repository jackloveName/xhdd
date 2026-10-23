import request from '@/utils/request'

export const LegalDocumentKeys = {
  privacy: 'HJYX_PRIVACY_PROTOC',
  agreement: 'HJYX_REGISTER_PROTOC'
}

export function getLegalDocument (key) {
  return request({
    url: `/mall_admin/ua/app/sys_config/get/value/config/${key}`,
    headers: { isToken: false },
    method: 'get'
  })
}
