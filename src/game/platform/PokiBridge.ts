interface RewardedBreakOptions {
  size?: 'small' | 'medium' | 'large'
  onStart?: () => void
}

interface PokiSdkLike {
  init?: () => Promise<unknown>
  gameLoadingFinished?: () => void
  gameplayStart?: () => void
  gameplayStop?: () => void
  commercialBreak?: (onStart?: () => void) => Promise<unknown>
  rewardedBreak?: (options?: RewardedBreakOptions | (() => void)) => Promise<boolean>
}

declare global {
  interface Window {
    PokiSDK?: PokiSdkLike
  }
}

export class PokiBridge {
  private playing = false
  private initialization: Promise<void> | null = null

  init(): Promise<void> {
    this.initialization ??= this.initialize()
    return this.initialization
  }

  loadingFinished(): void {
    this.safeCall('gameLoadingFinished')
  }

  gameplayStart(): void {
    if (this.playing) return
    this.playing = true
    this.safeCall('gameplayStart')
  }

  gameplayStop(): void {
    if (!this.playing) return
    this.playing = false
    this.safeCall('gameplayStop')
  }

  async commercialBreak(onStart?: () => void): Promise<void> {
    await this.init()
    try {
      await window.PokiSDK?.commercialBreak?.(onStart)
    } catch (error) {
      console.warn('Poki SDK commercial break failed', error)
    }
  }

  async rewardedBreak(onStart?: () => void): Promise<boolean> {
    await this.init()
    try {
      const sdk = window.PokiSDK
      if (!sdk?.rewardedBreak) return false
      return (await sdk.rewardedBreak({ size: 'medium', onStart })) === true
    } catch (error) {
      console.warn('Poki SDK rewarded break failed', error)
      return false
    }
  }

  private async initialize(): Promise<void> {
    try {
      await window.PokiSDK?.init?.()
    } catch (error) {
      console.warn('Poki SDK initialization failed; continuing without Poki services', error)
    }
  }

  private safeCall(name: 'gameLoadingFinished' | 'gameplayStart' | 'gameplayStop'): void {
    try {
      window.PokiSDK?.[name]?.()
    } catch (error) {
      console.warn(`Poki SDK event ${name} failed`, error)
    }
  }
}
