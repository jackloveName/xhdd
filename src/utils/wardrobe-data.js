import { readEncrypted, saveEncrypted } from '@/utils/secure-storage'
import { getGuestMode } from '@/utils/auth'

const ItemsStorageKey = 'StyleBoard-Items'
const OutfitsStorageKey = 'StyleBoard-Outfits'
const SelectionStorageKey = 'StyleBoard-Selection'

export const itemTypes = [
  { key: 'top', label: '上身', shortLabel: '上身', hint: '上衣、外套、针织衫', icon: 'imagePlus' },
  { key: 'bottom', label: '下装', shortLabel: '下装', hint: '裤子、裙子、短裤', icon: 'archive' },
  { key: 'shoes', label: '鞋子', shortLabel: '鞋子', hint: '球鞋、皮鞋、靴子', icon: 'wallet' }
]

export const occasions = ['通勤', '约会', '休闲', '旅行', '正式', '运动']
export const seasons = ['春秋', '夏季', '冬季', '四季']

const defaultItems = [
  {
    id: 'sample-top',
    type: 'top',
    title: '奶油开衫',
    color: '奶油白',
    season: '春秋',
    price: 249,
    wearCount: 8,
    image: '/static/images/wardrobe/top-cardigan-cutout.png',
    note: '适合通勤和周末。'
  },
  {
    id: 'sample-bottom',
    type: 'bottom',
    title: '通勤西裤',
    color: '炭黑',
    season: '四季',
    price: 288,
    wearCount: 12,
    image: '/static/images/wardrobe/bottom-trousers-cutout.png',
    note: '直筒版型，和浅色上衣很搭。'
  },
  {
    id: 'sample-shoes',
    type: 'shoes',
    title: '白色球鞋',
    color: '白色',
    season: '四季',
    price: 349,
    wearCount: 19,
    image: '/static/images/wardrobe/shoes-sneakers-cutout.png',
    note: '默认百搭鞋。'
  }
]
const defaultItemIds = new Set(defaultItems.map((item) => item.id))
const GuestReadonlyMessage = '游客模式仅可查看默认衣橱'

function nowText () {
  return new Date().toISOString()
}

export function todayText () {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

function normalizeItem (item = {}) {
  const type = itemTypes.some((entry) => entry.key === item.type) ? item.type : 'top'
  const wearCount = Math.max(0, Number.parseInt(item.wearCount || 0, 10) || 0)
  const price = Math.max(0, Number(item.price || 0))
  return {
    id: item.id || `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title: String(item.title || '').trim() || getItemType(type).label,
    color: String(item.color || '').trim(),
    season: String(item.season || '').trim() || '四季',
    price,
    wearCount,
    image: item.image || item.cover || '',
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
    note: String(item.note || item.notes || '').trim(),
    createdAt: item.createdAt || nowText(),
    updatedAt: item.updatedAt || nowText()
  }
}

function normalizeOutfit (outfit = {}) {
  return {
    id: outfit.id || `outfit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: String(outfit.date || todayText()).slice(0, 10),
    occasion: String(outfit.occasion || '通勤'),
    weather: String(outfit.weather || '').trim(),
    note: String(outfit.note || '').trim(),
    itemIds: {
      top: outfit.itemIds?.top || outfit.topId || '',
      bottom: outfit.itemIds?.bottom || outfit.bottomId || '',
      shoes: outfit.itemIds?.shoes || outfit.shoesId || ''
    },
    collageLayout: outfit.collageLayout || {},
    snapshot: outfit.snapshot || {},
    createdAt: outfit.createdAt || nowText()
  }
}

function uniqueById (list) {
  const map = new Map()
  list.forEach((item) => map.set(item.id, item))
  return Array.from(map.values())
}

export function getItemType (type) {
  return itemTypes.find((item) => item.key === type) || itemTypes[0]
}

function getStoredItems () {
  if (getGuestMode()) return []
  const items = readEncrypted(ItemsStorageKey, null)
  if (!Array.isArray(items)) return []
  return uniqueById(items.map(normalizeItem)).filter((item) => !defaultItemIds.has(item.id))
}

function ensureWardrobeWritable () {
  if (getGuestMode()) throw new Error(GuestReadonlyMessage)
}

export function getItems () {
  const items = getStoredItems()
  if (!items.length) return defaultItems.map(normalizeItem)
  return items
}

export function saveItems (items) {
  ensureWardrobeWritable()
  if (!Array.isArray(items)) throw new TypeError('衣橱单品数据必须是数组')
  const normalized = uniqueById(items.map(normalizeItem)).filter((item) => !defaultItemIds.has(item.id))
  saveEncrypted(ItemsStorageKey, normalized)
  return normalized
}

export function getOutfits () {
  if (getGuestMode()) return []
  const outfits = readEncrypted(OutfitsStorageKey, [])
  if (!Array.isArray(outfits)) return []
  return outfits.map(normalizeOutfit).sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function findOutfit (id) {
  return getOutfits().find((outfit) => outfit.id === id) || null
}

export function saveOutfits (outfits) {
  ensureWardrobeWritable()
  if (!Array.isArray(outfits)) throw new TypeError('穿搭日记数据必须是数组')
  const normalized = uniqueById(outfits.map(normalizeOutfit))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  saveEncrypted(OutfitsStorageKey, normalized)
  return normalized
}

export function updateOutfit (id, patch = {}) {
  ensureWardrobeWritable()
  const outfits = getOutfits()
  const index = outfits.findIndex((outfit) => outfit.id === id)
  if (index < 0) return null
  const nextOutfit = normalizeOutfit({
    ...outfits[index],
    ...patch,
    id: outfits[index].id,
    createdAt: outfits[index].createdAt
  })
  outfits.splice(index, 1, nextOutfit)
  saveOutfits(outfits)
  return nextOutfit
}

export function getSelection () {
  const stored = readEncrypted(SelectionStorageKey, {})
  const items = getItems()
  const fallback = {
    top: items.find((item) => item.type === 'top')?.id || '',
    bottom: items.find((item) => item.type === 'bottom')?.id || '',
    shoes: items.find((item) => item.type === 'shoes')?.id || ''
  }
  const isValid = (type, id) => items.some((item) => item.id === id && item.type === type)
  return {
    top: isValid('top', stored?.top) ? stored.top : fallback.top,
    bottom: isValid('bottom', stored?.bottom) ? stored.bottom : fallback.bottom,
    shoes: isValid('shoes', stored?.shoes) ? stored.shoes : fallback.shoes
  }
}

export function saveSelection (selection) {
  ensureWardrobeWritable()
  const next = {
    top: selection?.top || '',
    bottom: selection?.bottom || '',
    shoes: selection?.shoes || ''
  }
  saveEncrypted(SelectionStorageKey, next)
  return next
}

export function getWardrobeState () {
  return {
    items: getStoredItems(),
    outfits: getOutfits(),
    selection: getSelection()
  }
}

export function saveWardrobeState (state = {}) {
  ensureWardrobeWritable()
  const items = saveItems(state.items || [])
  const outfits = saveOutfits(state.outfits || [])
  const selection = saveSelection(state.selection || {})
  return { items, outfits, selection }
}

export function findItem (id) {
  return getItems().find((item) => item.id === id) || null
}

export function getSelectedItems (selection = getSelection(), items = getItems()) {
  return {
    top: items.find((item) => item.id === selection.top) || null,
    bottom: items.find((item) => item.id === selection.bottom) || null,
    shoes: items.find((item) => item.id === selection.shoes) || null
  }
}

function replaceOutfitSnapshotItem (outfit, item) {
  let changed = false
  const snapshot = { ...(outfit.snapshot || {}) }

  itemTypes.forEach((type) => {
    const key = type.key
    if (outfit.itemIds?.[key] !== item.id && snapshot[key]?.id !== item.id) return
    snapshot[key] = {
      ...(snapshot[key] || {}),
      ...item
    }
    changed = true
  })

  return changed
    ? {
        ...outfit,
        snapshot
      }
    : outfit
}

function updateOutfitSnapshots (item) {
  const outfits = getOutfits()
  if (!outfits.length) return outfits
  return saveOutfits(outfits.map((outfit) => replaceOutfitSnapshotItem(outfit, item)))
}

export function upsertItem (payload) {
  ensureWardrobeWritable()
  const items = getStoredItems()
  const itemPayload = defaultItemIds.has(payload?.id)
    ? { ...payload, id: undefined, wearCount: 0 }
    : payload
  const nextItem = normalizeItem({
    ...itemPayload,
    updatedAt: nowText()
  })
  const index = items.findIndex((item) => item.id === nextItem.id)
  if (index >= 0) items.splice(index, 1, nextItem)
  else items.unshift(nextItem)
  const savedItems = saveItems(items)
  updateOutfitSnapshots(nextItem)
  return {
    item: nextItem,
    items: savedItems
  }
}

export function removeItem (id) {
  ensureWardrobeWritable()
  const item = findItem(id)
  if (!item) return null
  saveItems(getItems().filter((entry) => entry.id !== id))
  saveOutfits(getOutfits().filter((outfit) => !Object.values(outfit.itemIds).includes(id)))
  const selection = getSelection()
  Object.keys(selection).forEach((type) => {
    if (selection[type] === id) selection[type] = getItems().find((entry) => entry.type === type)?.id || ''
  })
  saveSelection(selection)
  return item
}

export function saveTodayOutfit ({ date = todayText(), occasion = '通勤', weather = '', note = '', selection = getSelection(), collageLayout = {} } = {}) {
  ensureWardrobeWritable()
  const items = getItems()
  const selected = getSelectedItems(selection, items)
  if (!selected.top || !selected.bottom || !selected.shoes) {
    throw new Error('请先选好上身、下装和鞋子')
  }

  const outfit = normalizeOutfit({
    date,
    occasion,
    weather,
    note,
    itemIds: {
      top: selected.top.id,
      bottom: selected.bottom.id,
      shoes: selected.shoes.id
    },
    collageLayout,
    snapshot: selected
  })

  const updatedItems = items.map((item) => (
    [selected.top.id, selected.bottom.id, selected.shoes.id].includes(item.id)
      ? { ...item, wearCount: item.wearCount + 1, updatedAt: nowText() }
      : item
  ))
  saveItems(updatedItems)
  saveOutfits([outfit, ...getOutfits()])
  saveSelection(selection)
  return outfit
}

export function getCostPerWear (item) {
  const price = Number(item?.price || 0)
  const count = Number(item?.wearCount || 0)
  if (!price || !count) return 0
  return Math.round(price / count)
}

export function clearWardrobeData () {
  uni.removeStorageSync(ItemsStorageKey)
  uni.removeStorageSync(OutfitsStorageKey)
  uni.removeStorageSync(SelectionStorageKey)
}
