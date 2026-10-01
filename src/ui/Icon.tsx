import {
  ArrowDown,
  ArrowsClockwise,
  ArrowsSplit,
  ArrowUp,
  BookOpen,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  DownloadSimple,
  Ear,
  Eye,
  File,
  Flame,
  GameController,
  Gauge,
  GearSix,
  HandPalm,
  Headphones,
  HourglassMedium,
  House,
  Image,
  Info,
  Keyboard,
  Ladder,
  Lightning,
  List,
  MagicWand,
  Metronome,
  Microphone,
  MicrophoneSlash,
  Minus,
  MusicNote,
  MusicNotes,
  Pause,
  PencilSimple,
  Play,
  Plus,
  Record,
  Repeat,
  Sparkle,
  SpeakerHigh,
  Star,
  Stop,
  Sun,
  Target,
  Timer,
  Trash,
  Trophy,
  UploadSimple,
  X,
  type Icon as PhosphorIcon,
  type IconWeight,
} from '@phosphor-icons/react'
import type { SVGProps } from 'react'

/** One icon family (Phosphor), one stroke weight everywhere. */
const ICONS: Record<string, PhosphorIcon> = {
  home: House,
  book: BookOpen,
  target: Target,
  music: MusicNotes,
  note: MusicNote,
  chart: ChartBar,
  play: Play,
  pause: Pause,
  stop: Stop,
  mic: Microphone,
  micOff: MicrophoneSlash,
  repeat: Repeat,
  back: CaretLeft,
  next: CaretRight,
  check: Check,
  x: X,
  settings: GearSix,
  flame: Flame,
  star: Star,
  trophy: Trophy,
  upload: UploadSimple,
  edit: PencilSimple,
  trash: Trash,
  plus: Plus,
  minus: Minus,
  volume: SpeakerHigh,
  headphones: Headphones,
  loop: ArrowsClockwise,
  metronome: Metronome,
  tuner: Gauge,
  ear: Ear,
  gamepad: GameController,
  record: Record,
  timer: Timer,
  info: Info,
  hand: HandPalm,
  ladder: Ladder,
  calendar: CalendarBlank,
  sparkles: Sparkle,
  wand: MagicWand,
  file: File,
  image: Image,
  keyboard: Keyboard,
  eye: Eye,
  slow: HourglassMedium,
  fast: Lightning,
  up: ArrowUp,
  down: ArrowDown,
  menu: List,
  download: DownloadSimple,
  sun: Sun,
  split: ArrowsSplit,
}

export type IconName = keyof typeof ICONS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  name: IconName | string
  size?: number
  filled?: boolean
}

const SOLID = new Set(['play', 'pause', 'stop', 'record'])

/** The app's own mark: a whistle body with six holes (a simple geometric mark, not an icon). */
function WhistleMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="9.5" y="2" width="5" height="20" rx="2.5" fill="currentColor" opacity="0.28" />
      {[7, 9.8, 12.6, 15.4, 18.2].map((y) => (
        <circle key={y} cx="12" cy={y} r="1.15" fill="currentColor" />
      ))}
    </svg>
  )
}

export function Icon({ name, size = 22, filled, className, style }: IconProps) {
  if (name === 'whistle') return <WhistleMark size={size} />
  const Cmp = ICONS[name] ?? Info
  const weight: IconWeight = filled || SOLID.has(name) ? 'fill' : 'regular'
  return <Cmp size={size} weight={weight} className={className} style={style} aria-hidden="true" focusable="false" />
}
