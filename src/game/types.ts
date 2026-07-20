export const TOY_KINDS = [
  'ball',
  'car',
  'brick',
  'rocket',
  'top',
  'gift',
  'robot',
  'drum',
  'star',
] as const

export type ToyKind = (typeof TOY_KINDS)[number]

export interface ToyDefinition {
  label: string
  icon: string
  color: string
}

export const TOY_DEFINITIONS: Record<ToyKind, ToyDefinition> = {
  ball: { label: 'Bouncy ball', icon: '⚽', color: '#ff6b6b' },
  car: { label: 'Toy racer', icon: '🏎️', color: '#4d96ff' },
  brick: { label: 'Building brick', icon: '🧱', color: '#ff9f1c' },
  rocket: { label: 'Pocket rocket', icon: '🚀', color: '#7b61ff' },
  top: { label: 'Spinning top', icon: '🌀', color: '#26c6a2' },
  gift: { label: 'Mystery gift', icon: '🎁', color: '#ff5ca8' },
  robot: { label: 'Tiny robot', icon: '🤖', color: '#73849a' },
  drum: { label: 'Toy drum', icon: '🥁', color: '#f4c542' },
  star: { label: 'Glow star', icon: '⭐', color: '#ffd84d' },
}

export interface TrayEntry {
  id: string
  kind: ToyKind
}

export interface SelectionResult {
  preResolutionTray: TrayEntry[]
  tray: TrayEntry[]
  matched: TrayEntry[]
  score: number
  combo: number
  lost: boolean
  won: boolean
  remaining: number
}

export interface LevelConfig {
  number: number
  kinds: ToyKind[]
  copiesPerKind: number
  petModel: 'cat' | 'bunny' | 'panda'
  petName: string
  rattles: number
  undos: number
}

export function getLevelConfig(level: number): LevelConfig {
  const kindCount = level === 1 ? 6 : level === 2 ? 7 : 9
  const pets = [
    { petModel: 'cat', petName: 'Mochi' },
    { petModel: 'bunny', petName: 'Pip' },
    { petModel: 'panda', petName: 'Bao' },
  ] as const
  const pet = pets[(level - 1) % pets.length]

  return {
    number: level,
    kinds: [...TOY_KINDS.slice(0, kindCount)],
    copiesPerKind: 6,
    petModel: pet.petModel,
    petName: pet.petName,
    rattles: level === 1 ? 2 : 1,
    undos: 1,
  }
}
