export class AudioSystem {
  private context: AudioContext | null = null
  private masterBus: GainNode | null = null
  private effectsBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private musicSource: AudioBufferSourceNode | null = null
  private muted = false

  get isMuted(): boolean {
    return this.muted
  }

  unlock(): void {
    const context = this.ensureContext()
    this.startMusic(context)
    void context.resume()
  }

  toggle(): boolean {
    this.muted = !this.muted
    this.updateMasterVolume()
    if (!this.muted) void this.context?.resume()
    return this.muted
  }

  suspend(): void {
    void this.context?.suspend()
  }

  resume(): void {
    if (!this.muted) void this.context?.resume()
  }

  pick(): void {
    this.tone(360, 0.055, 'sine', 0.055)
  }

  place(): void {
    this.tone(720, 0.085, 'triangle', 0.045)
    this.tone(980, 0.12, 'sine', 0.035, 0.035)
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
    if (this.muted || !this.context || !this.effectsBus) return
    const start = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain).connect(this.effectsBus)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  private ensureContext(): AudioContext {
    if (this.context) return this.context

    const context = new AudioContext()
    const masterBus = context.createGain()
    const effectsBus = context.createGain()
    const musicBus = context.createGain()
    masterBus.gain.value = this.muted ? 0 : 1
    effectsBus.gain.value = 0.9
    musicBus.gain.value = 0.22
    effectsBus.connect(masterBus)
    musicBus.connect(masterBus)
    masterBus.connect(context.destination)

    this.context = context
    this.masterBus = masterBus
    this.effectsBus = effectsBus
    this.musicBus = musicBus
    return context
  }

  private updateMasterVolume(): void {
    if (!this.context || !this.masterBus) return
    const now = this.context.currentTime
    this.masterBus.gain.cancelScheduledValues(now)
    this.masterBus.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.012)
  }

  private startMusic(context: AudioContext): void {
    if (this.musicSource || !this.musicBus) return
    const source = context.createBufferSource()
    source.buffer = this.createToyboxLoop(context)
    source.loop = true
    source.connect(this.musicBus)
    source.start()
    this.musicSource = source
  }

  private createToyboxLoop(context: AudioContext): AudioBuffer {
    const tempo = 118
    const beat = 60 / tempo
    const duration = beat * 16
    const sampleRate = context.sampleRate
    const frameCount = Math.ceil(duration * sampleRate)
    const buffer = context.createBuffer(2, frameCount, sampleRate)
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)

    const addPluck = (
      midi: number,
      start: number,
      length: number,
      volume: number,
      pan: number,
    ): void => {
      const frequency = 440 * 2 ** ((midi - 69) / 12)
      const startFrame = Math.floor(start * sampleRate)
      const endFrame = Math.min(frameCount, Math.ceil((start + length) * sampleRate))
      for (let frame = startFrame; frame < endFrame; frame += 1) {
        const time = (frame - startFrame) / sampleRate
        const attack = Math.min(1, time / 0.008)
        const envelope = attack * Math.exp((-5.4 * time) / length)
        const phase = Math.PI * 2 * frequency * time
        const wave =
          Math.sin(phase) * 0.72 +
          Math.sin(phase * 2.01) * 0.2 +
          Math.sin(phase * 3.98) * 0.08
        const sample = wave * envelope * volume
        left[frame] += sample * (1 - pan * 0.35)
        right[frame] += sample * (1 + pan * 0.35)
      }
    }

    const addBass = (midi: number, start: number): void => {
      const frequency = 440 * 2 ** ((midi - 69) / 12)
      const startFrame = Math.floor(start * sampleRate)
      const length = beat * 0.82
      const endFrame = Math.min(frameCount, Math.ceil((start + length) * sampleRate))
      for (let frame = startFrame; frame < endFrame; frame += 1) {
        const time = (frame - startFrame) / sampleRate
        const release = Math.max(0, 1 - time / length)
        const envelope = Math.min(1, time / 0.018) * Math.exp(-3.8 * time) * release
        const phase = Math.PI * 2 * frequency * time
        const sample = (Math.sin(phase) + Math.sin(phase * 2) * 0.18) * envelope * 0.11
        left[frame] += sample
        right[frame] += sample
      }
    }

    let noiseState = 0x51f15e
    const nextNoise = (): number => {
      noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0
      return noiseState / 4294967296 - 0.5
    }
    const addShaker = (start: number, accent: boolean): void => {
      const startFrame = Math.floor(start * sampleRate)
      const length = accent ? 0.085 : 0.045
      const endFrame = Math.min(frameCount, Math.ceil((start + length) * sampleRate))
      let previous = 0
      for (let frame = startFrame; frame < endFrame; frame += 1) {
        const time = (frame - startFrame) / sampleRate
        const noise = nextNoise()
        const brightNoise = noise - previous * 0.72
        previous = noise
        const attack = Math.min(1, time / 0.002)
        const release = Math.max(0, 1 - time / length)
        const envelope =
          attack * release * Math.exp(-42 * time) * (accent ? 0.045 : 0.024)
        left[frame] += brightNoise * envelope
        right[frame] += brightNoise * envelope * 0.86
      }
    }

    const melody: Array<number | null> = [
      72, 76, 79, 76, 74, 77, 81, 77,
      72, 76, 79, 84, 81, 79, 76, null,
      74, 77, 81, 77, 72, 76, 79, 76,
      71, 74, 77, 81, 79, 77, 74, null,
    ]
    melody.forEach((note, step) => {
      if (note === null) return
      addPluck(note, step * beat * 0.5, beat * 0.72, 0.12, step % 2 === 0 ? -0.45 : 0.45)
    })

    const bass = [48, 48, 55, 55, 45, 45, 52, 52, 50, 50, 48, 48, 43, 43, 47, 47]
    bass.forEach((note, step) => addBass(note, step * beat))
    for (let step = 0; step < 32; step += 1) {
      addShaker(step * beat * 0.5, step % 4 === 0)
    }

    let peak = 0
    for (let frame = 0; frame < frameCount; frame += 1) {
      peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]))
    }
    const normalization = peak > 0.9 ? 0.9 / peak : 1
    for (let frame = 0; frame < frameCount; frame += 1) {
      left[frame] *= normalization
      right[frame] *= normalization
    }
    return buffer
  }
}
