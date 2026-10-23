<template>
  <!-- eslint-disable vue/multiline-html-element-content-newline -->
  <text
    class="app-icon lucide"
    :style="iconStyle"
    aria-hidden="true"
  >{{ glyph }}</text>
  <!-- eslint-enable vue/multiline-html-element-content-newline -->
</template>

<script setup>
import { computed } from 'vue'

const glyphs = {
  archive: '\ue6a9',
  archiveRestore: '\ue64f',
  arrowLeft: '\ue6bc',
  arrowRight: '\ue6bb',
  badgePercent: '\ue6a8',
  bellPlus: '\ue6c1',
  bellRing: '\ue6a6',
  calendarCheck: '\ue6c0',
  calendarClock: '\ue6a0',
  calendarDays: '\ue6a0',
  check: '\ue65c',
  chevronRight: '\ue6b5',
  clock: '\ue6a0',
  clockAlert: '\ue6c1',
  cloudCog: '\ue653',
  cloudDownload: '\ue647',
  cloudUpload: '\ue645',
  download: '\ue68d',
  eye: '\ue651',
  eyeOff: '\ue6b3',
  fileText: '\ue644',
  imagePlus: '\ue670',
  lock: '\ue66b',
  logout: '\ue6ba',
  minus: '\ue66f',
  more: '\ue64d',
  pencil: '\ue67f',
  plus: '\ue676',
  refresh: '\ue657',
  rotateBack: '\ue64f',
  shieldAlert: '\ue6cc',
  shieldCheck: '\ue6ab',
  smartphone: '\ue69c',
  sparkles: '\ue68f',
  trash: '\ue687',
  userRemove: '\ue693',
  wallet: '\ue6b1',
  x: '\ue66c'
}

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 20
  },
  color: {
    type: String,
    default: ''
  }
})

const glyph = computed(() => glyphs[props.name] || glyphs.archive)
const iconSize = computed(() => {
  const value = String(props.size)
  return /^\d+(?:\.\d+)?$/.test(value) ? `${value}px` : value
})
const iconStyle = computed(() => ({
  color: props.color || 'inherit',
  fontSize: iconSize.value,
  height: iconSize.value,
  lineHeight: iconSize.value,
  width: iconSize.value
}))
</script>

<style lang="scss" scoped>
@font-face {
  font-family: 'AppIcons';
  src: url('./app-icons.ttf') format('truetype');
}

.app-icon {
  display: inline-block;
  overflow: hidden;
  flex: 0 0 auto;
  font-family: 'AppIcons';
  font-style: normal;
  font-weight: normal;
  text-align: center;
  vertical-align: middle;
}
</style>
