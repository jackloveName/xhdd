import config from '@/config'
import { getBatchPreSignUrl, saveAttachmentsToPlatform } from '@/api/upload'

const ImageExtensions = ['jpg', 'jpeg', 'png']
const DefaultMaxImageSize = 10 * 1024 * 1024
const CompressibleExtensions = ['jpg', 'jpeg']

function chooseImages (count) {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ['original'],
      sourceType: ['camera', 'album'],
      success: resolve,
      fail: reject
    })
  })
}

function getLocalPath (file = {}) {
  return file.path || file.tempFilePath || ''
}

function getFileName (file = {}, index = 0) {
  const path = getLocalPath(file).split('?')[0]
  return file.name || path.split('/').pop() || `dada-closet-${Date.now()}-${index}`
}

function getExtension (fileName = '') {
  return fileName.split('.').pop().toLowerCase()
}

function getExtensionFromMime (mime = '') {
  const type = String(mime).toLowerCase()
  if (type.includes('png')) return 'png'
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  return ''
}

function getExtensionFromBytes (data) {
  const bytes = new Uint8Array(data || [])
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return 'png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  return ''
}

function normalizeFileName (fileName = '', extension = 'jpg', index = 0) {
  const safeExtension = extension === 'jpeg' ? 'jpg' : extension
  const fallbackName = `dada-closet-${Date.now()}-${index}`
  const cleanName = String(fileName || fallbackName)
    .split('?')[0]
    .split('/')
    .pop()
    .replace(/\.[^.]*$/, '') || fallbackName
  return `${cleanName}.${safeExtension}`
}

function getContentType (extension) {
  return extension === 'png' ? 'image/png' : 'image/jpeg'
}

function formatFileSize (size = 0) {
  return `${(Number(size || 0) / 1024 / 1024).toFixed(1)}MB`
}

function readH5File (filePath) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: filePath,
      method: 'GET',
      responseType: 'arraybuffer',
      success: (response) => resolve(response.data),
      fail: reject
    })
  })
}

function readAppFile (filePath) {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.io) {
      reject(new Error('当前 App 环境无法读取所选图片'))
      return
    }

    plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
      entry.file((file) => {
        const reader = new plus.io.FileReader()
        reader.onload = function () {
          const base64 = String(this.result || '').split(',')[1]
          resolve(uni.base64ToArrayBuffer(base64))
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      }, reject)
    }, reject)
  })
}

function readMiniProgramFile (filePath) {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath,
      success: (result) => resolve(result.data),
      fail: reject
    })
  })
}

function readFileBytes (filePath) {
  let reader = () => Promise.reject(new Error('当前平台暂不支持图片上传'))

  // #ifdef H5
  reader = readH5File
  // #endif

  // #ifdef APP-PLUS
  reader = readAppFile
  // #endif

  // #ifdef MP-WEIXIN
  reader = readMiniProgramFile
  // #endif

  return reader(filePath)
}

function compressImage (filePath, quality = 78) {
  return new Promise((resolve, reject) => {
    if (!uni.compressImage) {
      reject(new Error('当前平台不支持图片压缩'))
      return
    }

    uni.compressImage({
      src: filePath,
      quality,
      success: (result) => resolve(result.tempFilePath),
      fail: reject
    })
  })
}

async function prepareUploadFile (file, index, maxSize) {
  const filePath = getLocalPath(file)
  let bytes = await readFileBytes(filePath)
  const rawFileName = getFileName(file, index)
  let extension = (
    getExtensionFromBytes(bytes) ||
    getExtensionFromMime(file.type) ||
    getExtension(rawFileName)
  ).toLowerCase()

  if (!ImageExtensions.includes(extension)) throw new Error('仅支持 JPG、JPEG、PNG 图片')

  if (bytes.byteLength > maxSize && CompressibleExtensions.includes(extension)) {
    try {
      const compressedPath = await compressImage(filePath)
      const compressedBytes = await readFileBytes(compressedPath)
      const compressedExtension = getExtensionFromBytes(compressedBytes) || extension
      if (compressedBytes.byteLength < bytes.byteLength) {
        bytes = compressedBytes
        extension = compressedExtension
      }
    } catch (error) {
      throw new Error(`图片超过 ${formatFileSize(maxSize)}，当前平台压缩失败，请换一张更小的图片`)
    }
  }

  if (bytes.byteLength > maxSize) {
    const message = extension === 'png'
      ? `透明 PNG 不能压缩成 JPG，否则会变白底。请上传 ${formatFileSize(maxSize)} 以内的透明 PNG`
      : `图片不能超过 ${formatFileSize(maxSize)}，请换一张更小的图片`
    throw new Error(message)
  }

  return {
    file,
    bytes,
    extension,
    fileName: normalizeFileName(rawFileName, extension, index)
  }
}

function uploadToPreSignedUrl (url, data, contentType) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'PUT',
      data,
      header: {
        'Content-Type': contentType
      },
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve()
          return
        }
        reject(new Error(`图片上传失败（${response.statusCode}）`))
      },
      fail: reject
    })
  })
}

function buildRemotePath (sign = {}) {
  const dir = String(sign.dir || '').replace(/^\/+|\/+$/g, '')
  const fileName = String(sign.fileName || '').replace(/^\/+/, '')
  return `/${[dir, fileName].filter(Boolean).join('/')}`
}

export async function chooseAndUploadImages ({ count = 3, maxSize = DefaultMaxImageSize } = {}) {
  const selection = await chooseImages(count)
  const files = selection.tempFiles || (selection.tempFilePaths || []).map((path) => ({ path }))
  if (!files.length) return []

  const uploadFiles = await Promise.all(files.map((file, index) => prepareUploadFile(file, index, maxSize)))

  const signs = await getBatchPreSignUrl({ fileNames: uploadFiles.map((file) => file.fileName).join(',') })
  if (!Array.isArray(signs) || signs.length !== files.length) {
    throw new Error('图片上传签名返回不完整')
  }

  const attachments = await Promise.all(uploadFiles.map(async ({ file, bytes, extension, fileName }, index) => {
    await uploadToPreSignedUrl(signs[index].preSignUrl, bytes, getContentType(extension))

    const remotePath = buildRemotePath(signs[index])
    return {
      type: 1,
      fileType: extension,
      fileName,
      filePath: remotePath,
      url: remotePath,
      fileSize: file.size || bytes.byteLength || 0
    }
  }))

  await saveAttachmentsToPlatform(attachments.map(({ type, fileType, fileName, filePath, fileSize }) => ({
    type,
    fileType,
    fileName,
    filePath,
    fileSize
  })))
  return attachments
}

export function resolveAttachmentUrl (path = '') {
  if (!path) return ''
  if (/^(https?:|blob:|data:)/i.test(path)) return path
  if (/^\/?static\//i.test(path)) return `/${String(path).replace(/^\/+/, '')}`
  return `${config.ossUrl.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`
}
