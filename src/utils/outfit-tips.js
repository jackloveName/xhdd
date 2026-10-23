const BuilderTips = {
  empty: [
    '先放进三件常穿单品，搭配就会慢慢有自己的节奏。',
    '衣橱从第一件开始，今天先把最常穿的那件放进来。'
  ],
  hidden: [
    '隐藏单品适合先看轮廓，打开眼睛按钮就能把它带回来。',
    '想比较不同层次时，可以暂时藏起一件，画面会更清楚。'
  ],
  highWear: [
    '常穿不是重复，是这件衣服真的适合你。',
    '穿得多的单品更值得留下，它已经在替你省心。'
  ],
  default: [
    '把照片尽量换成透明底，拼图会更像真实试穿。',
    '先调整体比例，再细调单件位置，搭起来会顺很多。',
    '一套舒服的搭配，通常从一件确定想穿的单品开始。'
  ]
}

const DiaryTips = [
  '日记不是为了记录完美，是为了记住哪些搭配真的适合你。',
  '穿衣次数会慢慢告诉你：哪些单品值得，哪些只是占位置。',
  '回看旧搭配时，留意那些你愿意反复穿的组合。'
]

function pickTip (tips, seed = 0) {
  if (!tips.length) return ''
  return tips[Math.abs(seed) % tips.length]
}

export function getBuilderTip ({ itemCount = 0, hiddenCount = 0, wearTotal = 0, date = '' } = {}) {
  const seed = Number(String(date).replace(/\D/g, '').slice(-4)) || new Date().getDate()
  if (!itemCount) return pickTip(BuilderTips.empty, seed)
  if (hiddenCount) return pickTip(BuilderTips.hidden, seed + hiddenCount)
  if (wearTotal >= 30) return pickTip(BuilderTips.highWear, seed + wearTotal)
  return pickTip(BuilderTips.default, seed + itemCount)
}

export function getDiaryTip ({ count = 0 } = {}) {
  return pickTip(DiaryTips, count || new Date().getDate())
}
