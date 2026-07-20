export type EaseFunction = (value: number) => number

interface TweenOptions {
  duration: number
  delay?: number
  ease?: EaseFunction
  update: (progress: number) => void
  complete?: () => void
}

interface ActiveTween extends TweenOptions {
  elapsed: number
}

const easeOutBack: EaseFunction = (value) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2)
}

const easeInOutCubic: EaseFunction = (value) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2

export const easing = {
  linear: (value: number): number => value,
  outBack: easeOutBack,
  inOutCubic: easeInOutCubic,
  outCubic: (value: number): number => 1 - Math.pow(1 - value, 3),
}

export class TweenSystem {
  private tweens: ActiveTween[] = []

  add(options: TweenOptions): void {
    this.tweens.push({ ...options, elapsed: -(options.delay ?? 0) })
  }

  clear(): void {
    this.tweens = []
  }

  update(deltaSeconds: number): void {
    const finished: ActiveTween[] = []
    for (const tween of this.tweens) {
      tween.elapsed += deltaSeconds
      if (tween.elapsed < 0) continue
      const rawProgress = Math.min(tween.elapsed / tween.duration, 1)
      tween.update((tween.ease ?? easing.linear)(rawProgress))
      if (rawProgress >= 1) finished.push(tween)
    }

    if (finished.length === 0) return
    this.tweens = this.tweens.filter((tween) => !finished.includes(tween))
    for (const tween of finished) tween.complete?.()
  }
}
