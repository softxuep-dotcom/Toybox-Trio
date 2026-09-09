import { REPAIR_PROJECTS, type ToyKind } from '../types'

const KEY = 'toybox-trio-collection-v1'

export class ToyCollection {
  private readonly collected = new Set<ToyKind>()
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null

  constructor(storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.storage = storage
    try {
      const saved: unknown = JSON.parse(storage?.getItem(KEY) ?? '[]')
      if (Array.isArray(saved)) {
        for (const project of REPAIR_PROJECTS) {
          if (saved.includes(project.model)) this.collected.add(project.model)
        }
      }
    } catch { /* Keep the shelf usable when storage is unavailable. */ }
  }

  get toys(): readonly ToyKind[] { return [...this.collected] }

  unlock(kind: ToyKind): void {
    if (!REPAIR_PROJECTS.some((project) => project.model === kind)) return
    this.collected.add(kind)
    try { this.storage?.setItem(KEY, JSON.stringify(this.toys)) } catch { /* Session only. */ }
  }
}
