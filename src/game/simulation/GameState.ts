import type { SelectionResult, ToyKind, TrayEntry } from '../types'

export class GameState {
  readonly capacity = 7
  private readonly remainingItems = new Map<string, ToyKind>()
  private trayItems: TrayEntry[] = []
  private scoreValue = 0
  private comboValue = 0

  constructor(items: TrayEntry[]) {
    for (const item of items) this.remainingItems.set(item.id, item.kind)
  }

  get score(): number {
    return this.scoreValue
  }

  get combo(): number {
    return this.comboValue
  }

  get remaining(): number {
    return this.remainingItems.size
  }

  get tray(): readonly TrayEntry[] {
    return this.trayItems
  }

  select(id: string): SelectionResult | null {
    const kind = this.remainingItems.get(id)
    if (!kind) return null

    this.remainingItems.delete(id)
    const selected = { id, kind }
    this.trayItems.push(selected)
    const preResolutionTray = [...this.trayItems]
    const sameKind = this.trayItems.filter((entry) => entry.kind === kind)
    let matched: TrayEntry[] = []

    if (sameKind.length === 3) {
      matched = sameKind
      const matchedIds = new Set(matched.map((entry) => entry.id))
      this.trayItems = this.trayItems.filter((entry) => !matchedIds.has(entry.id))
      this.comboValue += 1
      this.scoreValue += 100 + Math.min(this.comboValue - 1, 5) * 25
    } else {
      this.comboValue = 0
    }

    const lost = matched.length === 0 && this.trayItems.length >= this.capacity
    const won = this.remainingItems.size === 0 && this.trayItems.length === 0

    return {
      preResolutionTray,
      tray: [...this.trayItems],
      matched,
      score: this.scoreValue,
      combo: this.comboValue,
      lost,
      won,
      remaining: this.remainingItems.size,
    }
  }

  undo(): TrayEntry | null {
    const entry = this.trayItems.pop()
    if (!entry) return null
    this.remainingItems.set(entry.id, entry.kind)
    this.comboValue = 0
    return entry
  }

  recoverTray(count: number): TrayEntry[] {
    const recoveryCount = Math.max(0, Math.min(Math.floor(count), this.trayItems.length))
    if (recoveryCount === 0) return []

    const recovered = this.trayItems.splice(this.trayItems.length - recoveryCount, recoveryCount)
    for (const entry of recovered) this.remainingItems.set(entry.id, entry.kind)
    this.comboValue = 0
    return recovered
  }
}
