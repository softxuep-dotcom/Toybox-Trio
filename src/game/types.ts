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
  'spaceship',
  'rover',
  'alien',
  'arcade',
  'claw',
  'monster',
  'train',
  'lollipop',
  'cupcake',
  'banana',
  'pineapple',
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
  spaceship: { label: 'Space racer', icon: '🛸', color: '#ff9f1c' },
  rover: { label: 'Moon rover', icon: '🛰️', color: '#9aa8b8' },
  alien: { label: 'Pocket alien', icon: '👽', color: '#51d9c5' },
  arcade: { label: 'Mini arcade', icon: '🕹️', color: '#6f7cff' },
  claw: { label: 'Claw machine', icon: '🧸', color: '#ff6f91' },
  monster: { label: 'Monster truck', icon: '🛻', color: '#8c63e6' },
  train: { label: 'Toy train', icon: '🚂', color: '#e85d75' },
  lollipop: { label: 'Swirl lollipop', icon: '🍭', color: '#ff4fa3' },
  cupcake: { label: 'Toy cupcake', icon: '🧁', color: '#f26b8a' },
  banana: { label: 'Toy banana', icon: '🍌', color: '#ffd43b' },
  pineapple: { label: 'Toy pineapple', icon: '🍍', color: '#ff9f43' },
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

const TUTORIAL_LEVEL_KINDS: ToyKind[] = ['car']
const LEVEL_TWO_KINDS: ToyKind[] = ['ball', 'car', 'brick', 'rocket', 'top', 'gift']
const LEVEL_THREE_KINDS: ToyKind[] = [
  'robot',
  'drum',
  'star',
  'spaceship',
  'rover',
  'alien',
  'monster',
]
const LEVEL_FOUR_KINDS: ToyKind[] = [
  'arcade',
  'claw',
  'train',
  'lollipop',
  'cupcake',
  'banana',
  'pineapple',
  'robot',
  'star',
]

export function getLevelConfig(level: number): LevelConfig {
  const pets = [
    { petModel: 'cat', petName: 'Mochi' },
    { petModel: 'bunny', petName: 'Pip' },
    { petModel: 'panda', petName: 'Bao' },
  ] as const
  const pet = pets[(level - 1) % pets.length]
  const kinds =
    level === 1
      ? TUTORIAL_LEVEL_KINDS
      : level === 2
        ? LEVEL_TWO_KINDS
        : level === 3
          ? LEVEL_THREE_KINDS
          : level === 4
            ? LEVEL_FOUR_KINDS
            : rotatingKinds(level, 9)

  return {
    number: level,
    kinds: [...kinds],
    copiesPerKind: level === 1 ? 3 : 6,
    petModel: pet.petModel,
    petName: pet.petName,
    rattles: level === 1 ? 0 : 1,
    undos: level === 1 ? 0 : 1,
  }
}

function rotatingKinds(level: number, count: number): ToyKind[] {
  const start =
    (((level - 5) * 5) % TOY_KINDS.length + TOY_KINDS.length) % TOY_KINDS.length
  return Array.from({ length: count }, (_, index) => TOY_KINDS[(start + index) % TOY_KINDS.length])
}
