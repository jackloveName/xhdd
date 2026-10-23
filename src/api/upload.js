import request from '@/utils/request'

export function getBatchPreSignUrl (params) {
  return request({
    url: '/mall_biz/ua/oss/get_batch_pre_sign_url',
    method: 'get',
    params,
    timeout: 20000
  })
}

export function saveAttachmentsToPlatform (data) {
  return request({
    url: '/mall_biz/attach_file/save_to_platform',
    method: 'post',
    data,
    timeout: 20000
  })
}
