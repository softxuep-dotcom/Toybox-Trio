interface PokiSdkLike {
  gameLoadingFinished?: () => void
  gameplayStart?: () => void
  gameplayStop?: () => void
}

declare global {
  interface Window {
    PokiSDK?: PokiSdkLike
  }
}

export class PokiBridge {
  private playing = false

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

  private safeCall(name: keyof PokiSdkLike): void {
    try {
      window.PokiSDK?.[name]?.()
    } catch (error) {
      console.warn(`Poki SDK event ${name} failed`, error)
    }
  }
}
