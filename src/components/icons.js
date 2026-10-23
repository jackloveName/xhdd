import { defineComponent, h } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

function createIcon (name) {
  return defineComponent({
    name: `AppIcon${name}`,
    inheritAttrs: false,
    props: {
      size: {
        type: [Number, String],
        default: 20
      },
      color: {
        type: String,
        default: ''
      },
      strokeWidth: {
        type: [Number, String],
        default: 2
      }
    },
    setup (props, { attrs }) {
      return () => h(AppIcon, {
        ...attrs,
        name,
        size: props.size,
        color: props.color
      })
    }
  })
}

export const Archive = createIcon('archive')
export const ArchiveRestore = createIcon('archiveRestore')
export const ArrowLeft = createIcon('arrowLeft')
export const ArrowRight = createIcon('arrowRight')
export const BadgePercent = createIcon('badgePercent')
export const BellPlus = createIcon('bellPlus')
export const BellRing = createIcon('bellRing')
export const CalendarCheck = createIcon('calendarCheck')
export const CalendarClock = createIcon('calendarClock')
export const CalendarDays = createIcon('calendarDays')
export const Check = createIcon('check')
export const ChevronRight = createIcon('chevronRight')
export const Clock3 = createIcon('clock')
export const ClockAlert = createIcon('clockAlert')
export const CloudCog = createIcon('cloudCog')
export const CloudDownload = createIcon('cloudDownload')
export const CloudUpload = createIcon('cloudUpload')
export const Download = createIcon('download')
export const Eye = createIcon('eye')
export const EyeOff = createIcon('eyeOff')
export const FileText = createIcon('fileText')
export const ImagePlus = createIcon('imagePlus')
export const LockKeyhole = createIcon('lock')
export const LogOut = createIcon('logout')
export const Minus = createIcon('minus')
export const MoreHorizontal = createIcon('more')
export const Pencil = createIcon('pencil')
export const Plus = createIcon('plus')
export const RefreshCw = createIcon('refresh')
export const RotateCcw = createIcon('rotateBack')
export const ShieldAlert = createIcon('shieldAlert')
export const ShieldCheck = createIcon('shieldCheck')
export const Smartphone = createIcon('smartphone')
export const Sparkles = createIcon('sparkles')
export const Trash2 = createIcon('trash')
export const UserX = createIcon('userRemove')
export const WalletCards = createIcon('wallet')
export const X = createIcon('x')
