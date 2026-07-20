export class AudioSystem {
  private context: AudioContext | null = null
  private muted = false

  get isMuted(): boolean {
    return this.muted
  }

  unlock(): void {
    if (!this.context) this.context = new AudioContext()
    void this.context.resume()
  }

  toggle(): boolean {
    this.muted = !this.muted
    return this.muted
  }

  pick(): void {
    this.tone(360, 0.055, 'sine', 0.055)
  }

  match(combo: number): void {
    const lift = Math.min(combo, 4) * 35
    this.tone(520 + lift, 0.09, 'sine', 0.07, 0)
    this.tone(660 + lift, 0.11, 'sine', 0.065, 0.07)
    this.tone(820 + lift, 0.15, 'triangle', 0.06, 0.14)
  }

  rattle(): void {
    this.tone(170, 0.07, 'square', 0.035, 0)
    this.tone(220, 0.08, 'square', 0.03, 0.08)
    this.tone(285, 0.08, 'square', 0.025, 0.16)
  }

  undo(): void {
    this.tone(420, 0.08, 'sine', 0.04, 0)
    this.tone(300, 0.12, 'sine', 0.04, 0.06)
  }

  win(): void {
    ;[523, 659, 784, 1047].forEach((frequency, index) => {
      this.tone(frequency, 0.22, 'triangle', 0.055, index * 0.1)
    })
  }

  lose(): void {
    this.tone(260, 0.18, 'sawtooth', 0.035, 0)
    this.tone(190, 0.3, 'sawtooth', 0.03, 0.14)
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    if (this.muted || !this.context) return
    const start = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }
}
