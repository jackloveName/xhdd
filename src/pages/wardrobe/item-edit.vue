<template>
  <view class="item-edit-page">
    <view class="edit-topbar">
      <button
        class="icon-button"
        hover-class="none"
        aria-label="返回"
        @tap="back"
      >
        <ArrowLeft :size="22" />
      </button>
      <view>
        <text>{{ editing ? '编辑单品' : '上传单品' }}</text>
        <text>{{ editing ? '更新照片和穿搭信息' : '先选分类，再补充照片' }}</text>
      </view>
      <button
        class="save-top"
        :disabled="saving"
        hover-class="none"
        @tap="save"
      >
        保存
      </button>
    </view>

    <view class="edit-content">
      <view class="type-grid">
        <button
          v-for="item in itemTypes"
          :key="item.key"
          class="type-option"
          :class="{ active: form.type === item.key }"
          hover-class="none"
          @tap="form.type = item.key"
        >
          <component
            :is="iconMap[item.icon]"
            :size="22"
          />
          <view>
            <text>{{ item.label }}</text>
            <text>{{ item.hint }}</text>
          </view>
          <Check
            v-if="form.type === item.key"
            :size="17"
          />
        </button>
      </view>

      <view class="photo-section">
        <view class="section-head">
          <view>
            <text>单品照片</text>
            <text>暂不支持自动抠除背景，建议上传透明背景图片</text>
          </view>
          <text>{{ form.image ? '已添加' : '必填' }}</text>
        </view>

        <button
          class="photo-uploader"
          :class="{ 'photo-uploader--filled': form.image }"
          :disabled="uploading"
          hover-class="none"
          @tap="uploadImage"
        >
          <image
            v-if="form.image"
            :src="resolvePhoto(form.image)"
            mode="aspectFit"
          />
          <template v-else>
            <ImagePlus :size="34" />
            <text>{{ uploading ? '上传中' : '拍照或从相册选择' }}</text>
          </template>
        </button>
      </view>

      <view class="form-list">
        <label class="form-row">
          <text>名称</text>
          <input
            v-model="form.title"
            type="text"
            placeholder="例如 奶油开衫"
            placeholder-class="field-placeholder"
          >
        </label>
        <label class="form-row">
          <text>颜色</text>
          <input
            v-model="form.color"
            type="text"
            placeholder="例如 奶油白、炭黑"
            placeholder-class="field-placeholder"
          >
        </label>
        <picker
          :range="seasons"
          :value="seasonIndex"
          @change="form.season = seasons[$event.detail.value]"
        >
          <view class="form-row form-row--picker">
            <text>季节</text>
            <view>
              <text>{{ form.season }}</text>
              <ChevronRight :size="17" />
            </view>
          </view>
        </picker>
        <label class="form-row">
          <text>买入价格</text>
          <view class="input-with-unit">
            <input
              v-model="form.price"
              type="digit"
              placeholder="0"
              placeholder-class="field-placeholder"
            >
            <text>元</text>
          </view>
        </label>
        <label class="form-row">
          <text>已穿次数</text>
          <view class="input-with-unit">
            <input
              v-model="form.wearCount"
              type="number"
              placeholder="0"
              placeholder-class="field-placeholder"
            >
            <text>次</text>
          </view>
        </label>
        <label class="form-row form-row--textarea">
          <text>备注</text>
          <textarea
            v-model="form.note"
            maxlength="120"
            auto-height
            placeholder="版型、适合场合或搭配建议"
            placeholder-class="field-placeholder"
          />
        </label>
      </view>

      <view class="privacy-note">
        <LockKeyhole :size="18" />
        <text>照片使用现有账号上传通道保存；衣橱数据会在本机加密存储。</text>
      </view>

      <button
        class="primary-save"
        :disabled="saving"
        hover-class="none"
        @tap="save"
      >
        {{ saving ? '正在保存' : (editing ? '保存修改' : '加入衣橱') }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronRight,
  ImagePlus,
  LockKeyhole,
  WalletCards
} from '@/components/icons'
import { useUserStore } from '@/stores'
import { chooseAndUploadImages, resolveAttachmentUrl } from '@/utils/file-upload'
import { findItem, getWardrobeState, itemTypes, seasons, upsertItem } from '@/utils/wardrobe-data'
import { toast } from '@/utils/common'

const CloudSyncKey = 'StyleBoard-Cloud-Sync'
const userStore = useUserStore()
const isGuest = computed(() => userStore.isGuest)
const editing = ref(false)
const saving = ref(false)
const uploading = ref(false)
const form = reactive({
  id: '',
  type: 'top',
  title: '',
  color: '',
  season: '四季',
  price: '',
  wearCount: '',
  image: '',
  attachments: [],
  note: ''
})

const iconMap = {
  imagePlus: ImagePlus,
  archive: Archive,
  wallet: WalletCards
}

const seasonIndex = computed(() => Math.max(0, seasons.indexOf(form.season)))

function resolvePhoto (path) {
  return resolveAttachmentUrl(path)
}

function back () {
  uni.navigateBack()
}

async function uploadImage () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  if (uploading.value) return
  uploading.value = true
  try {
    const [attachment] = await chooseAndUploadImages({ count: 1 })
    if (!attachment) return
    form.image = attachment.url || attachment.filePath
    form.attachments = [attachment]
  } catch (error) {
    if (!error?.errMsg?.includes('cancel')) toast(error?.message || '图片上传失败')
  } finally {
    uploading.value = false
  }
}

async function syncIfNeeded () {
  if (uni.getStorageSync(CloudSyncKey) !== '1') return
  try {
    await userStore.saveStyleData(getWardrobeState())
  } catch (error) {
    if (!error?.handled) toast('已保存到本机，云端同步失败')
  }
}

async function save () {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    return
  }
  if (saving.value) return
  if (!form.title.trim()) {
    toast('请填写单品名称')
    return
  }
  if (!form.image) {
    toast('请先上传单品照片')
    return
  }

  saving.value = true
  try {
    upsertItem({
      id: form.id,
      type: form.type,
      title: form.title,
      color: form.color,
      season: form.season,
      price: form.price,
      wearCount: form.wearCount,
      image: form.image,
      attachments: form.attachments,
      note: form.note
    })
    await syncIfNeeded()
    toast(editing.value ? '单品已更新' : '已加入衣橱', 'success')
    setTimeout(() => uni.navigateBack(), 350)
  } catch (error) {
    toast(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onLoad((query = {}) => {
  if (isGuest.value) {
    toast('游客模式仅可查看默认衣橱')
    uni.navigateBack()
    return
  }
  if (query.type && itemTypes.some((item) => item.key === query.type)) form.type = query.type
  if (!query.id) return
  const item = findItem(query.id)
  if (!item) {
    toast('未找到这件单品')
    return
  }
  editing.value = true
  Object.assign(form, {
    ...item,
    price: item.price ? String(item.price) : '',
    wearCount: item.wearCount ? String(item.wearCount) : ''
  })
})
</script>

<style lang="scss" scoped>
.item-edit-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #fbfaf6 0%, #eef5f0 50%, #f8f3ee 100%);
  color: #18211d;
}

.edit-topbar {
  display: grid;
  grid-template-columns: 80rpx minmax(0, 1fr) 108rpx;
  align-items: center;
  min-height: calc(var(--status-bar-height) + 112rpx);
  padding: var(--status-bar-height) 30rpx 0;
  column-gap: 12rpx;
}

.edit-topbar view text {
  display: block;
  text-align: center;
}

.edit-topbar view text:first-child {
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.25;
}

.edit-topbar view text:last-child {
  margin-top: 6rpx;
  color: #77817c;
  font-size: 21rpx;
  line-height: 1.3;
}

.icon-button,
.save-top {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 68rpx;
  border-radius: 20rpx;
  color: #20372f;
  white-space: nowrap;
  word-break: keep-all;
}

.icon-button {
  width: 68rpx;
  justify-self: start;
}

.save-top {
  width: 108rpx;
  justify-self: end;
  background: #20372f;
  color: #fff;
  font-size: 24rpx;
  font-weight: 850;
  line-height: 68rpx;
  box-shadow: 0 12rpx 28rpx rgba(32, 55, 47, 0.14);
}

.edit-content {
  padding: 22rpx 30rpx 52rpx;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.type-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 132rpx;
  padding: 16rpx;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  color: #20372f;
  text-align: left;
}

.type-option.active {
  border-color: rgba(200, 94, 67, 0.48);
  background: rgba(255, 248, 242, 0.82);
  box-shadow: inset 0 0 0 2rpx rgba(200, 94, 67, 0.12);
}

.type-option :deep(.lucide:last-child) {
  position: absolute;
  right: 14rpx;
  top: 14rpx;
}

.type-option > :deep(.lucide:first-child) {
  display: block;
  margin-bottom: 10rpx;
}

.type-option text {
  display: block;
}

.type-option text:first-child {
  font-size: 26rpx;
  font-weight: 900;
  line-height: 1.25;
}

.type-option text:last-child {
  margin-top: 6rpx;
  color: #7a837e;
  font-size: 19rpx;
  line-height: 1.3;
}

.photo-section,
.form-list,
.privacy-note {
  margin-top: 24rpx;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-head text {
  display: block;
}

.section-head view text:first-child {
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.25;
}

.section-head view text:last-child,
.section-head > text {
  margin-top: 6rpx;
  color: #818a85;
  font-size: 22rpx;
  line-height: 1.3;
}

.photo-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 430rpx;
  border: 2rpx dashed rgba(32, 55, 47, 0.16);
  border-radius: 34rpx;
  background:
    linear-gradient(90deg, rgba(33, 47, 40, 0.04) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(33, 47, 40, 0.04) 1rpx, transparent 1rpx),
    #f9f8f2;
  background-size: 58rpx 58rpx;
  color: #6b746f;
  overflow: hidden;
}

.photo-uploader image {
  width: 100%;
  height: 100%;
}

.photo-uploader text {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.35;
}

.form-list {
  overflow: hidden;
  border: 1rpx solid rgba(33, 47, 40, 0.07);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(16px);
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 100rpx;
  padding: 0 24rpx;
  border-bottom: 1rpx solid rgba(36, 53, 45, 0.07);
}

.form-row:last-child {
  border-bottom: 0;
}

.form-row > text:first-child {
  color: #25312c;
  font-size: 27rpx;
  font-weight: 850;
  line-height: 1.35;
}

.form-row input,
.input-with-unit {
  flex: 1;
  min-width: 0;
  color: #202624;
  font-size: 27rpx;
  line-height: 1.35;
  text-align: right;
}

.field-placeholder {
  color: #9aa19d;
}

.form-row--picker view,
.input-with-unit {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  color: #59635e;
}

.input-with-unit input {
  flex: 1;
  min-width: 0;
  height: 100rpx;
  line-height: 100rpx;
}

.form-row--textarea {
  display: block;
  padding: 22rpx 24rpx;
}

.form-row--textarea textarea {
  width: 100%;
  margin-top: 18rpx;
  color: #202624;
  font-size: 26rpx;
  line-height: 1.45;
}

.privacy-note {
  display: flex;
  gap: 14rpx;
  padding: 18rpx 20rpx;
  border-radius: 24rpx;
  background: rgba(232, 241, 235, 0.78);
  color: #53605a;
  font-size: 24rpx;
  line-height: 1.45;
}

.privacy-note > :first-child {
  margin-top: 4rpx;
  color: #3e685b;
}

.primary-save {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  margin-top: 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #d76d4d, #bd4f37);
  color: #fffaf4;
  font-size: 30rpx;
  font-weight: 900;
  box-shadow: 0 22rpx 48rpx rgba(195, 87, 60, 0.23);
}
</style>
