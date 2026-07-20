import type { LevelConfig, ToyKind, TrayEntry } from '../types'
import { TOY_DEFINITIONS, TOY_KINDS } from '../types'

export interface UiActions {
  start: () => void
  restart: () => void
  next: () => void
  rattle: () => void
  undo: () => void
  sound: () => void
  pause: () => void
}

const isChinese = navigator.language.toLowerCase().startsWith('zh')

const toyIconUrl = (kind: ToyKind): string =>
  `${import.meta.env.BASE_URL}icons/toys/${kind}.png`

const copy = isChinese
  ? {
      tagline: '翻动玩具箱，凑齐三个相同玩具，救出箱底的小伙伴。',
      start: '开始整理',
      loading: '正在打开玩具箱',
      rescued: '救援成功！',
      full: '收纳槽满了',
      retry: '再试一次',
      next: '下一个玩具箱',
      pause: '暂停整理',
      resume: '继续',
      level: '箱子',
      remaining: '剩余',
      score: '得分',
      tray: '收纳槽 · 三个相同玩具会自动归位',
      tutorial: '点击玩具来收集 · 拖动画面旋转玩具堆',
      tutorialGroup: (group: number, collected: number) =>
        `教学 ${group}/2 · 点击发光黑边玩具（${collected}/3）`,
      tutorialDone: '就是这样！三个相同玩具会自动消除',
      rattle: '抖一抖',
      undo: '撤回',
      rescue: '救出',
    }
  : {
      tagline: 'Turn the toy pile, match three of a kind, and rescue the friend underneath.',
      start: 'Start tidying',
      loading: 'Opening the toybox',
      rescued: 'Friend rescued!',
      full: 'The tray is full',
      retry: 'Try again',
      next: 'Next toybox',
      pause: 'Tidy break',
      resume: 'Resume',
      level: 'Box',
      remaining: 'Left',
      score: 'Score',
      tray: 'Tidy tray · Three matching toys pack themselves away',
      tutorial: 'Tap a toy to collect it · Drag to turn the pile',
      tutorialGroup: (group: number, collected: number) =>
        `Tutorial ${group}/2 · Tap the glowing outlined toys (${collected}/3)`,
      tutorialDone: 'That’s it! Three matching toys clear automatically',
      rattle: 'Rattle',
      undo: 'Undo',
      rescue: 'Rescue',
    }

export class GameUI {
  readonly canvas: HTMLCanvasElement
  private readonly root: HTMLElement
  private readonly overlay: HTMLElement
  private readonly overlayEyebrow: HTMLElement
  private readonly overlayTitle: HTMLElement
  private readonly overlayCopy: HTMLElement
  private readonly primaryButton: HTMLButtonElement
  private readonly secondaryButton: HTMLButtonElement
  private readonly loadingBar: HTMLElement
  private readonly loadingText: HTMLElement
  private readonly levelLabel: HTMLElement
  private readonly scoreLabel: HTMLElement
  private readonly remainingLabel: HTMLElement
  private readonly progressBar: HTMLElement
  private readonly petGoal: HTMLElement
  private readonly toast: HTMLElement
  private readonly traySlotsRoot: HTMLElement
  private readonly traySlots: HTMLElement[]
  private readonly rattleButton: HTMLButtonElement
  private readonly undoButton: HTMLButtonElement
  private readonly soundButton: HTMLButtonElement
  private readonly pauseButton: HTMLButtonElement
  private readonly celebration: HTMLElement
  private actions: UiActions | null = null
  private overlayAction: 'start' | 'restart' | 'next' | 'resume' = 'start'
  private toastTimer = 0
  private totalItems = 1

  constructor(root: HTMLElement) {
    this.root = root
    root.innerHTML = `
      <main class="game-shell">
        <canvas id="game-canvas" aria-label="Toybox Trio 3D playfield"></canvas>
        <div class="scene-vignette" aria-hidden="true"></div>

        <header class="hud-top">
          <div class="brand-chip">
            <span class="brand-mark" aria-hidden="true">◆</span>
            <span><strong>TOYBOX</strong><em>TRIO</em></span>
          </div>
          <div class="stat-strip" aria-live="polite">
            <span id="level-label">${copy.level} 1</span>
            <span><small>${copy.score}</small> <strong id="score-label">0</strong></span>
            <span><small>${copy.remaining}</small> <strong id="remaining-label">0</strong></span>
          </div>
          <button class="round-button" id="pause-button" type="button" aria-label="Pause">Ⅱ</button>
        </header>

        <section class="goal-chip" id="pet-goal" aria-live="polite"></section>
        <div class="progress-track" aria-hidden="true"><div id="progress-bar"></div></div>

        <aside class="tool-rail" aria-label="Toybox tools">
          <button class="tool-button" id="rattle-button" type="button" aria-label="${copy.rattle}">
            <span aria-hidden="true">🎲</span><b>${copy.rattle}</b><small>2</small>
          </button>
          <button class="tool-button" id="undo-button" type="button" aria-label="${copy.undo}">
            <span aria-hidden="true">↩</span><b>${copy.undo}</b><small>1</small>
          </button>
          <button class="tool-button compact" id="sound-button" type="button" aria-label="Toggle sound">🔊</button>
        </aside>

        <div class="tutorial-toast" id="tutorial-toast" role="status"></div>

        <section class="tray-panel" aria-label="Collected toys">
          <p>${copy.tray}</p>
          <div class="tray-slots" id="tray-slots">
            ${Array.from({ length: 7 }, (_, index) => `<div class="tray-slot" data-slot="${index}"></div>`).join('')}
          </div>
        </section>

        <div class="celebration" id="celebration" aria-hidden="true"></div>

        <section class="game-overlay visible" id="game-overlay">
          <div class="overlay-card">
            <div class="mini-toys" aria-hidden="true"><span>🧩</span><span>🤖</span><span>🎁</span></div>
            <p class="overlay-eyebrow" id="overlay-eyebrow">A POCKET-SIZED 3D PUZZLE</p>
            <h1 id="overlay-title"><span>TOYBOX</span> TRIO</h1>
            <p class="overlay-copy" id="overlay-copy">${copy.tagline}</p>
            <button class="primary-button" id="primary-button" type="button" disabled>${copy.loading}</button>
            <button class="secondary-button hidden" id="secondary-button" type="button">${copy.retry}</button>
            <div class="loading-row" id="loading-text"><span>${copy.loading}</span><b>0%</b></div>
            <div class="loading-track"><div id="loading-bar"></div></div>
            <p class="asset-note">Original game · CC0 models by Kenney</p>
          </div>
        </section>
      </main>
    `

    this.canvas = this.required<HTMLCanvasElement>('#game-canvas')
    this.overlay = this.required('#game-overlay')
    this.overlayEyebrow = this.required('#overlay-eyebrow')
    this.overlayTitle = this.required('#overlay-title')
    this.overlayCopy = this.required('#overlay-copy')
    this.primaryButton = this.required<HTMLButtonElement>('#primary-button')
    this.secondaryButton = this.required<HTMLButtonElement>('#secondary-button')
    this.loadingBar = this.required('#loading-bar')
    this.loadingText = this.required('#loading-text')
    this.levelLabel = this.required('#level-label')
    this.scoreLabel = this.required('#score-label')
    this.remainingLabel = this.required('#remaining-label')
    this.progressBar = this.required('#progress-bar')
    this.petGoal = this.required('#pet-goal')
    this.toast = this.required('#tutorial-toast')
    this.traySlotsRoot = this.required('#tray-slots')
    this.traySlots = Array.from(root.querySelectorAll<HTMLElement>('.tray-slot'))
    this.rattleButton = this.required<HTMLButtonElement>('#rattle-button')
    this.undoButton = this.required<HTMLButtonElement>('#undo-button')
    this.soundButton = this.required<HTMLButtonElement>('#sound-button')
    this.pauseButton = this.required<HTMLButtonElement>('#pause-button')
    this.celebration = this.required('#celebration')
    this.bindDomEvents()
    this.preloadToyIcons()
  }

  bind(actions: UiActions): void {
    this.actions = actions
  }

  setLoading(progress: number): void {
    const percent = Math.round(progress * 100)
    this.loadingBar.style.width = `${percent}%`
    this.loadingText.querySelector('b')!.textContent = `${percent}%`
  }

  showStart(): void {
    this.overlayAction = 'start'
    this.overlayEyebrow.textContent = 'A POCKET-SIZED 3D PUZZLE'
    this.overlayTitle.innerHTML = '<span>TOYBOX</span> TRIO'
    this.overlayCopy.textContent = copy.tagline
    this.primaryButton.textContent = copy.start
    this.primaryButton.disabled = false
    this.secondaryButton.classList.add('hidden')
    this.loadingText.classList.add('hidden')
    this.loadingBar.parentElement?.classList.add('hidden')
    this.setOverlayVisible(true)
  }

  hideOverlay(): void {
    this.setOverlayVisible(false)
  }

  showPause(): void {
    this.overlayAction = 'resume'
    this.overlayEyebrow.textContent = 'PAUSED'
    this.overlayTitle.textContent = copy.pause
    this.overlayCopy.textContent = copy.tagline
    this.primaryButton.textContent = copy.resume
    this.secondaryButton.textContent = copy.retry
    this.secondaryButton.classList.remove('hidden')
    this.setOverlayVisible(true)
  }

  showResult(won: boolean, level: number, score: number, petName: string): void {
    this.overlayAction = won ? 'next' : 'restart'
    this.overlayEyebrow.textContent = won ? `${petName.toUpperCase()} IS SAFE` : 'ONE MORE TRY'
    this.overlayTitle.textContent = won ? copy.rescued : copy.full
    this.overlayCopy.textContent = won
      ? `${copy.level} ${level} · ${copy.score} ${score}`
      : `${copy.score} ${score} · ${copy.remaining} ${this.remainingLabel.textContent}`
    this.primaryButton.textContent = won ? copy.next : copy.retry
    this.secondaryButton.textContent = copy.retry
    this.secondaryButton.classList.toggle('hidden', !won)
    this.setOverlayVisible(true)
    if (won) this.launchCelebration()
  }

  setLevel(config: LevelConfig, totalItems: number): void {
    this.totalItems = totalItems
    this.levelLabel.textContent = `${copy.level} ${config.number}`
    const petIcon = config.petModel === 'cat' ? '🐱' : config.petModel === 'bunny' ? '🐰' : '🐼'
    this.petGoal.innerHTML = `<span>${petIcon}</span><p><small>${copy.rescue}</small><strong>${config.petName}</strong></p>`
    this.setToolCounts(config.rattles, config.undos)
    this.updateStats(0, totalItems)
  }

  updateStats(score: number, remaining: number): void {
    this.scoreLabel.textContent = score.toLocaleString()
    this.remainingLabel.textContent = String(remaining)
    const progress = Math.max(0, Math.min(1, 1 - remaining / this.totalItems))
    this.progressBar.style.width = `${progress * 100}%`
  }

  renderTray(entries: readonly TrayEntry[]): void {
    this.traySlots.forEach((slot, index) => {
      const entry = entries[index]
      slot.className = 'tray-slot'
      slot.replaceChildren()
      delete slot.dataset.kind
      slot.style.removeProperty('--toy-color')
      slot.style.removeProperty('--match-x')
      slot.style.removeProperty('--match-delay')
      slot.removeAttribute('aria-label')
      if (!entry) return
      const definition = TOY_DEFINITIONS[entry.kind]
      slot.dataset.kind = entry.kind
      slot.style.setProperty('--toy-color', definition.color)
      slot.innerHTML = `<span aria-hidden="true"><img src="${toyIconUrl(entry.kind)}" alt="" draggable="false"></span><i></i>`
      slot.setAttribute('aria-label', definition.label)
      requestAnimationFrame(() => slot.classList.add('filled'))
    })
  }

  flashMatch(kind: ToyKind): void {
    const matchingSlots = this.traySlots.filter((slot) => slot.dataset.kind === kind)
    if (matchingSlots.length === 0) return

    const slotsRect = this.traySlotsRoot.getBoundingClientRect()
    const slotRects = matchingSlots.map((slot) => slot.getBoundingClientRect())
    const centerX =
      slotRects.reduce((sum, rect) => sum + rect.left + rect.width / 2, 0) / slotRects.length
    const centerY =
      slotRects.reduce((sum, rect) => sum + rect.top + rect.height / 2, 0) / slotRects.length

    matchingSlots.forEach((slot, index) => {
      const rect = slotRects[index]
      const slotCenter = rect.left + rect.width / 2
      slot.style.setProperty('--match-x', `${centerX - slotCenter}px`)
      slot.style.setProperty('--match-delay', `${index * 0.035}s`)
      slot.classList.add('matching')
    })
    this.launchMatchBurst(kind, centerX - slotsRect.left, centerY - slotsRect.top)
  }

  getTraySlotCenter(index: number): { x: number; y: number } {
    const slot = this.traySlots[Math.min(index, this.traySlots.length - 1)]
    const rect = slot.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  setToolCounts(rattles: number, undos: number): void {
    this.rattleButton.querySelector('small')!.textContent = String(rattles)
    this.undoButton.querySelector('small')!.textContent = String(undos)
    this.rattleButton.disabled = rattles <= 0
    this.undoButton.disabled = undos <= 0
  }

  setToolsEnabled(enabled: boolean): void {
    const rattleCount = Number(this.rattleButton.querySelector('small')!.textContent)
    const undoCount = Number(this.undoButton.querySelector('small')!.textContent)
    this.rattleButton.disabled = !enabled || rattleCount <= 0
    this.undoButton.disabled = !enabled || undoCount <= 0
  }

  setMuted(muted: boolean): void {
    this.soundButton.textContent = muted ? '🔇' : '🔊'
  }

  showTutorial(): void {
    this.showToast(copy.tutorial, 4800)
  }

  showTutorialStep(group: 1 | 2, collected: number): void {
    this.showToast(copy.tutorialGroup(group, collected), 0)
  }

  showTutorialComplete(): void {
    this.showToast(copy.tutorialDone, 3200)
  }

  showToast(message: string, duration = 1800): void {
    window.clearTimeout(this.toastTimer)
    this.toast.textContent = message
    this.toast.classList.add('visible')
    if (duration > 0) {
      this.toastTimer = window.setTimeout(() => this.toast.classList.remove('visible'), duration)
    }
  }

  private launchMatchBurst(kind: ToyKind, x: number, y: number): void {
    this.traySlotsRoot.querySelector('.tray-match-burst')?.remove()
    const burst = document.createElement('div')
    burst.className = 'tray-match-burst'
    burst.style.left = `${x}px`
    burst.style.top = `${y}px`
    burst.style.setProperty('--toy-color', TOY_DEFINITIONS[kind].color)
    burst.innerHTML = `<strong aria-hidden="true"><img src="${toyIconUrl(kind)}" alt="" draggable="false"></strong>${Array.from(
      { length: 9 },
      (_, index) => {
        const angle = (index / 9) * Math.PI * 2
        const distance = 28 + (index % 3) * 7
        return `<i style="--burst-x:${Math.cos(angle) * distance}px;--burst-y:${Math.sin(angle) * distance}px"></i>`
      },
    ).join('')}`
    this.traySlotsRoot.append(burst)
    requestAnimationFrame(() => burst.classList.add('active'))
    window.setTimeout(() => burst.remove(), 900)
  }

  private preloadToyIcons(): void {
    for (const kind of TOY_KINDS) {
      const image = new Image()
      image.decoding = 'async'
      image.src = toyIconUrl(kind)
    }
  }

  private launchCelebration(): void {
    this.celebration.replaceChildren()
    const colors = ['#ff6b6b', '#ffd84d', '#26c6a2', '#4d96ff', '#ff5ca8', '#ffffff']
    for (let index = 0; index < 28; index += 1) {
      const piece = document.createElement('i')
      piece.style.setProperty('--x', `${5 + Math.random() * 90}vw`)
      piece.style.setProperty('--delay', `${Math.random() * 0.6}s`)
      piece.style.setProperty('--spin', `${180 + Math.random() * 540}deg`)
      piece.style.background = colors[index % colors.length]
      this.celebration.append(piece)
    }
    this.celebration.classList.remove('active')
    requestAnimationFrame(() => this.celebration.classList.add('active'))
  }

  private setOverlayVisible(visible: boolean): void {
    this.overlay.classList.toggle('visible', visible)
    this.overlay.inert = !visible
    this.overlay.setAttribute('aria-hidden', String(!visible))
  }

  private bindDomEvents(): void {
    this.primaryButton.addEventListener('click', () => {
      if (!this.actions) return
      if (this.overlayAction === 'start') this.actions.start()
      if (this.overlayAction === 'restart') this.actions.restart()
      if (this.overlayAction === 'next') this.actions.next()
      if (this.overlayAction === 'resume') this.actions.pause()
    })
    this.secondaryButton.addEventListener('click', () => this.actions?.restart())
    this.rattleButton.addEventListener('click', () => this.actions?.rattle())
    this.undoButton.addEventListener('click', () => this.actions?.undo())
    this.soundButton.addEventListener('click', () => this.actions?.sound())
    this.pauseButton.addEventListener('click', () => this.actions?.pause())
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.actions?.pause()
    })
  }

  private required<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector)
    if (!element) throw new Error(`Missing UI element: ${selector}`)
    return element
  }
}
