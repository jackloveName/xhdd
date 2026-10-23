<template>
  <view class="login-page">
    <view class="login-shell">
      <view class="brand-row">
        <text class="brand-name">
          搭搭衣橱
        </text>
        <text class="brand-en">
          DADA CLOSET
        </text>
      </view>

      <text class="login-title">
        打开你的随身衣橱
      </text>

      <view class="wardrobe-preview">
        <view class="preview-label">
          <text>今日预览</text>
          <text>STYLE 01</text>
        </view>
        <image
          class="preview-item preview-item--top"
          src="/static/images/wardrobe/top-cardigan-cutout.png"
          mode="aspectFit"
        />
        <image
          class="preview-item preview-item--bottom"
          src="/static/images/wardrobe/bottom-trousers-cutout.png"
          mode="aspectFit"
        />
        <image
          class="preview-item preview-item--shoes"
          src="/static/images/wardrobe/shoes-sneakers-cutout.png"
          mode="aspectFit"
        />
      </view>

      <view class="login-panel">
        <view
          class="login-mode"
          role="tablist"
        >
          <button
            class="login-mode__item"
            :class="{ 'login-mode__item--active': mode === 'code' }"
            hover-class="none"
            @tap="setMode('code')"
          >
            验证码
          </button>
          <button
            class="login-mode__item"
            :class="{ 'login-mode__item--active': mode === 'password' }"
            hover-class="none"
            @tap="setMode('password')"
          >
            密码
          </button>
        </view>

        <view
          class="field-row field-row--phone"
          :class="{ 'field-row--focus': focusedField === 'mobile' }"
        >
          <view class="phone-prefix">
            <text>+86</text>
          </view>
          <input
            v-model="form.mobile"
            class="field-input"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-class="field-placeholder"
            confirm-type="next"
            @focus="focusedField = 'mobile'"
            @blur="focusedField = ''"
            @input="handleMobileInput"
          >
        </view>

        <view
          v-if="mode === 'code'"
          class="field-row"
          :class="{ 'field-row--focus': focusedField === 'code' }"
        >
          <input
            v-model="form.code"
            class="field-input"
            type="number"
            maxlength="6"
            placeholder="6位验证码"
            placeholder-class="field-placeholder"
            confirm-type="done"
            @focus="focusedField = 'code'"
            @blur="focusedField = ''"
            @input="handleCodeInput"
            @confirm="submitLogin"
          >
          <button
            class="code-button"
            :disabled="countdown > 0 || sendingCode"
            :loading="sendingCode"
            hover-class="none"
            @tap="sendCode"
          >
            {{ codeButtonText }}
          </button>
        </view>

        <view
          v-else
          class="field-row"
          :class="{ 'field-row--focus': focusedField === 'password' }"
        >
          <input
            v-model="form.password"
            class="field-input"
            :password="!passwordVisible"
            maxlength="32"
            placeholder="请输入登录密码"
            placeholder-class="field-placeholder"
            confirm-type="done"
            @focus="focusedField = 'password'"
            @blur="focusedField = ''"
            @confirm="submitLogin"
          >
          <button
            class="password-toggle"
            hover-class="none"
            :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
            @tap="passwordVisible = !passwordVisible"
          >
            <EyeOff
              v-if="passwordVisible"
              :size="19"
              :stroke-width="1.8"
            />
            <Eye
              v-else
              :size="19"
              :stroke-width="1.8"
            />
          </button>
        </view>

        <button
          class="login-submit"
          :loading="submitting"
          :disabled="submitting"
          hover-class="none"
          @tap="submitLogin"
        >
          {{ mode === 'code' ? '验证并进入' : '登录并进入' }}
        </button>

        <button
          class="guest-submit"
          :disabled="submitting"
          hover-class="none"
          @tap="enterGuestMode"
        >
          游客体验
        </button>

        <checkbox-group
          class="agreement"
          @change="handleAgreementChange"
        >
          <label class="agreement__label">
            <checkbox
              value="accepted"
              :checked="agreementAccepted"
              color="#c85f43"
            />
            <text>我已阅读并同意</text>
            <text
              class="agreement__link"
              @tap.stop="openLegal('privacy')"
            >《隐私协议》</text>
            <text>和</text>
            <text
              class="agreement__link"
              @tap.stop="openLegal('agreement')"
            >《注册协议》</text>
          </label>
        </checkbox-group>

        <view class="security-note">
          <LockKeyhole
            :size="17"
            :stroke-width="1.8"
          />
          <text>登录后同步你的衣橱和穿搭日记</text>
        </view>
      </view>
    </view>

    <AppUpdateDialog ref="appUpdateRef" />
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import AppUpdateDialog from '@/components/AppUpdateDialog.vue'
import { Eye, EyeOff, LockKeyhole } from '@/components/icons'
import { getLoginCode } from '@/api/account'
import { useUserStore } from '@/stores'
import { hasAppSession } from '@/utils/auth'
import { toast } from '@/utils/common'
import { isMobileNumber } from '@/utils/validate'

const userStore = useUserStore()
const mode = ref('code')
const focusedField = ref('')
const passwordVisible = ref(false)
const agreementAccepted = ref(false)
const sendingCode = ref(false)
const submitting = ref(false)
const countdown = ref(0)
const appUpdateRef = ref(null)
const form = reactive({
  mobile: '',
  code: '',
  password: ''
})

let countdownTimer = null

const codeButtonText = computed(() => {
  if (countdown.value > 0) return `${countdown.value}s 后重发`
  return '发送验证码'
})

function setMode (value) {
  mode.value = value
  focusedField.value = ''
}

function handleMobileInput (event) {
  form.mobile = String(event.detail.value || '').replace(/\D/g, '').slice(0, 11)
}

function handleCodeInput (event) {
  form.code = String(event.detail.value || '').replace(/\D/g, '').slice(0, 6)
}

function validateMobile () {
  if (!form.mobile) {
    toast('请输入手机号')
    return false
  }
  if (!isMobileNumber(form.mobile)) {
    toast('请输入正确的手机号')
    return false
  }
  return true
}

async function sendCode () {
  if (sendingCode.value || countdown.value > 0 || !validateMobile()) return

  sendingCode.value = true
  try {
    await getLoginCode({ mobile: form.mobile })
    toast('验证码已发送', 'success')
    startCountdown()
    focusedField.value = 'code'
  } finally {
    sendingCode.value = false
  }
}

function startCountdown () {
  clearCountdown()
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearCountdown()
  }, 1000)
}

function clearCountdown () {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = null
  if (countdown.value < 0) countdown.value = 0
}

function handleAgreementChange (event) {
  agreementAccepted.value = event.detail.value.includes('accepted')
}

function openLegal (type) {
  uni.navigateTo({ url: `/pages/legal/index?type=${type}` })
}

async function submitLogin () {
  if (submitting.value || !validateMobile()) return
  if (mode.value === 'code' && form.code.length !== 6) {
    toast('请输入 6 位验证码')
    return
  }
  if (mode.value === 'password' && !form.password) {
    toast('请输入登录密码')
    return
  }
  if (!agreementAccepted.value) {
    toast('请先阅读并同意隐私协议和注册协议')
    return
  }

  submitting.value = true
  try {
    await userStore.login({
      mode: mode.value,
      mobile: form.mobile,
      code: form.code,
      password: form.password
    })

    toast('登录成功', 'success')
    uni.switchTab({ url: '/pages/outfit/index' })
  } catch (error) {
    if (error instanceof Error && !error.handled) {
      toast(error.message || '登录失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}

function enterGuestMode () {
  if (submitting.value) return
  if (!agreementAccepted.value) {
    toast('请先阅读并同意隐私协议和注册协议')
    return
  }

  userStore.startGuestSession()
  toast('已进入游客体验', 'success')
  uni.switchTab({ url: '/pages/outfit/index' })
}

onLoad(() => {
  if (hasAppSession()) uni.switchTab({ url: '/pages/outfit/index' })
})

onShow(() => {
  if (hasAppSession()) return

  nextTick(() => {
    appUpdateRef.value?.checkAppUpdate?.()
  })
})

onUnload(clearCountdown)
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #fbf7f0 0%, #eef5f1 48%, #fff8f3 100%);
  color: #17211d;
}

.login-shell {
  position: relative;
  width: 100%;
  max-width: 880rpx;
  min-height: 100vh;
  margin: 0 auto;
  padding: calc(var(--status-bar-height) + 60rpx) 0 54rpx;
  overflow: hidden;
}

.login-shell::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 310rpx;
  background:
    linear-gradient(135deg, rgba(200, 95, 67, 0.16), transparent 62%),
    linear-gradient(90deg, rgba(45, 80, 70, 0.12), transparent 70%);
  content: "";
  pointer-events: none;
}

.brand-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 34rpx;
  color: #1d3b32;
}

.brand-name {
  font-size: 42rpx;
  font-weight: 850;
  line-height: 1.12;
}

.brand-en {
  padding: 8rpx 14rpx;
  border: 1rpx solid rgba(29, 59, 50, 0.12);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.52);
  font-size: 20rpx;
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.25;
}

.login-title {
  position: relative;
  z-index: 1;
  display: block;
  max-width: 620rpx;
  padding: 0 34rpx;
  margin-top: 24rpx;
  font-size: 56rpx;
  font-weight: 900;
  line-height: 1.08;
}

.wardrobe-preview {
  position: relative;
  height: 500rpx;
  margin: 30rpx 34rpx 0;
  border: 1rpx solid rgba(31, 49, 43, 0.08);
  border-radius: 42rpx;
  background:
    linear-gradient(90deg, rgba(31, 49, 43, 0.045) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(31, 49, 43, 0.045) 1rpx, transparent 1rpx),
    radial-gradient(circle at 52% 30%, rgba(255, 255, 255, 0.92), transparent 38%),
    linear-gradient(135deg, #f7efe6, #e8f1eb 68%, #fff8f2);
  background-size: 58rpx 58rpx, 58rpx 58rpx, 100% 100%, 100% 100%;
  box-shadow: 0 34rpx 80rpx rgba(42, 53, 48, 0.1);
  overflow: hidden;
}

.preview-label {
  position: absolute;
  left: 26rpx;
  top: 24rpx;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 16rpx;
  border: 1rpx solid rgba(31, 49, 43, 0.07);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #20372f;
  box-shadow: 0 10rpx 22rpx rgba(31, 40, 36, 0.06);
}

.preview-label text:first-child {
  font-size: 22rpx;
  font-weight: 900;
}

.preview-label text:last-child {
  color: #c85f43;
  font-size: 19rpx;
  font-weight: 850;
}

.preview-item {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  filter: drop-shadow(0 18rpx 20rpx rgba(26, 31, 28, 0.13));
}

.preview-item--top {
  top: 76rpx;
  width: 318rpx;
  height: 176rpx;
  z-index: 3;
}

.preview-item--bottom {
  top: 206rpx;
  width: 300rpx;
  height: 214rpx;
  z-index: 2;
}

.preview-item--shoes {
  top: 382rpx;
  width: 260rpx;
  height: 84rpx;
  z-index: 1;
}

.login-panel {
  position: relative;
  z-index: 2;
  margin: -22rpx 20rpx 0;
  padding: 30rpx 28rpx 34rpx;
  border: 1rpx solid rgba(31, 49, 43, 0.08);
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 26rpx 80rpx rgba(37, 49, 43, 0.1);
  backdrop-filter: blur(18px);
}

.login-mode {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  height: 78rpx;
  padding: 6rpx;
  border: 1rpx solid rgba(31, 49, 43, 0.08);
  border-radius: 999rpx;
  background: rgba(31, 49, 43, 0.07);
}

.login-mode__item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 66rpx;
  border-radius: 999rpx;
  color: #69746f;
  font-size: 26rpx;
  font-weight: 750;
}

.login-mode__item::after,
.code-button::after,
.password-toggle::after,
.login-submit::after,
.guest-submit::after {
  border: 0;
}

.login-mode__item--active {
  background: #20372f;
  color: #fffaf4;
  box-shadow: 0 10rpx 22rpx rgba(32, 55, 47, 0.16);
}

.field-row {
  display: flex;
  align-items: center;
  height: 98rpx;
  margin-top: 26rpx;
  padding: 0 22rpx;
  border: 1rpx solid rgba(31, 49, 43, 0.1);
  border-radius: 24rpx;
  background: rgba(250, 249, 244, 0.84);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.field-row + .field-row {
  margin-top: 22rpx;
}

.field-row--focus {
  border-color: rgba(200, 95, 67, 0.62);
  box-shadow: 0 0 0 5rpx rgba(200, 95, 67, 0.1);
}

.field-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  color: #18211d;
  font-size: 29rpx;
  line-height: 98rpx;
}

.field-placeholder {
  color: #9a9b95;
}

.phone-prefix {
  display: flex;
  align-items: center;
  align-self: stretch;
  min-width: 126rpx;
  margin-right: 22rpx;
  border-right: 1rpx solid rgba(31, 49, 43, 0.1);
  color: #18211d;
  font-size: 29rpx;
  font-weight: 850;
}

.code-button,
.password-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin-left: 18rpx;
  border-left: 1rpx solid rgba(31, 49, 43, 0.1);
  background: transparent;
  color: #c85f43;
}

.code-button {
  min-width: 190rpx;
  height: 58rpx;
  padding-left: 20rpx;
  font-size: 25rpx;
  font-weight: 750;
}

.code-button[disabled] {
  color: #989b96;
  opacity: 1;
}

.password-toggle {
  width: 64rpx;
  height: 58rpx;
  padding-left: 18rpx;
}

.login-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  margin-top: 34rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #d56b4d, #bb4c35);
  color: #fffaf4;
  font-size: 30rpx;
  font-weight: 800;
  box-shadow: 0 18rpx 42rpx rgba(187, 76, 53, 0.24);
}

.login-submit[disabled] {
  background: #bd7d68;
  opacity: 1;
}

.guest-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  margin-top: 18rpx;
  border: 1rpx solid rgba(32, 55, 47, 0.16);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #20372f;
  font-size: 28rpx;
  font-weight: 800;
}

.guest-submit[disabled] {
  color: #8b928e;
  opacity: 1;
}

.agreement {
  margin-top: 32rpx;
}

.agreement__label {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  min-height: 48rpx;
  color: #777f7a;
  font-size: 21rpx;
  line-height: 1.5;
}

.agreement__label checkbox {
  margin-right: 8rpx;
  transform: scale(0.72);
}

.agreement__link {
  color: #20372f;
  border-bottom: 1rpx solid rgba(32, 55, 47, 0.35);
  font-weight: 750;
}

.security-note {
  display: none;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-top: 28rpx;
  color: #7d8581;
  font-size: 22rpx;
}

@media (min-width: 700px) {
  .login-page {
    background: #eef3ef;
  }

  .login-shell {
    background:
      linear-gradient(180deg, #fbf7f0 0%, #eef5f1 48%, #fff8f3 100%);
    box-shadow: 0 0 80rpx rgba(31, 49, 43, 0.08);
  }
}
</style>
