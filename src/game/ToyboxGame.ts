import * as THREE from 'three'
import { AudioSystem } from './audio/AudioSystem'
import { PilePhysics } from './physics/PilePhysics'
import { PokiBridge } from './platform/PokiBridge'
import { ToyFactory } from './render/ToyFactory'
import { easing, TweenSystem } from './render/TweenSystem'
import { GameState } from './simulation/GameState'
import type { LevelConfig, SelectionResult, ToyKind, TrayEntry } from './types'
import { getLevelConfig } from './types'
import type { GameUI } from './ui/GameUI'

interface PileItem {
  id: string
  kind: ToyKind
  object: THREE.Group
  selected: boolean
  removed: boolean
}

interface PointerGesture {
  pointerId: number
  startX: number
  startY: number
  previousX: number
  previousY: number
  dragged: boolean
}

const pileCenter = new THREE.Vector3(0, 1.15, 0)
const FIRST_LEVEL_HINT_DELAY_MS = 5_000

export class ToyboxGame {
  private readonly ui: GameUI
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80)
  private readonly pileRoot = new THREE.Group()
  private readonly environmentRoot = new THREE.Group()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly tweens = new TweenSystem()
  private readonly factory = new ToyFactory()
  private readonly physics = new PilePhysics()
  private readonly audio = new AudioSystem()
  private readonly poki = new PokiBridge()
  private readonly items = new Map<string, PileItem>()
  private state: GameState | null = null
  private config: LevelConfig = getLevelConfig(1)
  private currentLevel = 1
  private bankedScore = 0
  private completedLevelScore = 0
  private rattles = 0
  private undos = 0
  private playing = false
  private paused = false
  private inputLocked = true
  private transitionPending = false
  private gesture: PointerGesture | null = null
  private hoveredItem: PileItem | null = null
  private rescuedPet: THREE.Group | null = null
  private runSeed = createRandomSeed()
  private levelSeed = 0
  private firstLevelHintTimer = 0
  private firstLevelSelectionMade = false
  private rewardedContinueUsed = false
  private elapsed = 0
  private cameraYaw = 0
  private cameraHeight = 10.6
  private cameraDistance = 14.2
  private readonly cameraTarget = pileCenter.clone()
  private lastFrameTime = performance.now()

  constructor(canvas: HTMLCanvasElement, ui: GameUI) {
    this.ui = ui
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    const lowPower = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.65))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.shadowMap.enabled = !lowPower
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.scene.add(this.environmentRoot, this.pileRoot)
    this.createEnvironment()
    this.createLights()
    this.bindInput(canvas)
    this.resize()
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement ?? canvas)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing && !this.paused) this.togglePause()
    })
    this.renderer.setAnimationLoop(() => this.animate())
  }

  async init(): Promise<void> {
    await this.poki.init()
    await Promise.all([
      this.physics.init(),
      this.factory.load((progress) => this.ui.setLoading(progress)),
    ])
    this.poki.loadingFinished()
    this.ui.showStart()
  }

  start(): void {
    this.audio.unlock()
    void this.runAfterCommercialBreak(() => {
      this.runSeed = createRandomSeed()
      this.currentLevel = 1
      this.bankedScore = 0
      this.startLevel()
    })
  }

  restart(): void {
    this.audio.unlock()
    void this.runAfterCommercialBreak(() => {
      this.runSeed = createRandomSeed()
      this.startLevel()
    })
  }

  startAt(level: number): void {
    this.runSeed = createRandomSeed()
    this.currentLevel = Math.max(1, Math.floor(level))
    this.bankedScore = 0
    this.startLevel()
  }

  next(): void {
    void this.runAfterCommercialBreak(() => {
      this.bankedScore += this.completedLevelScore
      this.currentLevel += 1
      this.startLevel()
    })
  }

  toggleSound(): void {
    this.ui.setMuted(this.audio.toggle())
  }

  togglePause(): void {
    if (!this.playing || this.transitionPending) return
    this.paused = !this.paused
    if (this.paused) {
      this.cancelFirstLevelHint()
      this.poki.gameplayStop()
      this.audio.suspend()
      this.ui.showPause()
      this.ui.setToolsEnabled(false)
    } else {
      this.audio.resume()
      this.poki.gameplayStart()
      this.ui.hideOverlay()
      this.ui.setToolsEnabled(true)
      this.scheduleFirstLevelHint()
    }
  }

  rattle(): void {
    if (!this.canInteract() || this.rattles <= 0 || !this.state) return
    this.rattles -= 1
    this.inputLocked = true
    this.audio.rattle()
    this.ui.setToolCounts(this.rattles, this.undos)
    const random = mulberry32(
      (this.levelSeed ^ (this.state.remaining * 17 + this.rattles * 711)) >>> 0,
    )
    this.physics.rattle(random)
    this.tweens.add({
      duration: 0.68,
      update: () => undefined,
      complete: () => {
        this.inputLocked = false
      },
    })
  }

  undo(): void {
    if (!this.canInteract() || this.undos <= 0 || !this.state) return
    const entry = this.state.undo()
    if (!entry) {
      this.ui.showTrayEmpty()
      return
    }

    const item = this.items.get(entry.id)
    if (!item) return
    this.undos -= 1
    this.audio.undo()
    this.ui.setToolCounts(this.rattles, this.undos)
    this.ui.renderTray(this.state.tray)
    this.ui.updateStats(this.bankedScore + this.state.score, this.state.remaining)
    this.restoreItemToPile(entry)
  }

  rewardedContinue(): void {
    if (
      this.transitionPending ||
      this.playing ||
      !this.state ||
      this.rewardedContinueUsed ||
      this.state.tray.length < 2
    ) {
      return
    }
    void this.runRewardedContinue(this.state)
  }

  private startLevel(): void {
    this.clearLevel()
    this.config = getLevelConfig(this.currentLevel)
    this.rattles = this.config.rattles
    this.undos = this.config.undos
    this.completedLevelScore = 0
    this.firstLevelSelectionMade = false
    this.rewardedContinueUsed = false
    this.elapsed = 0
    this.levelSeed = mixSeed(this.runSeed, this.currentLevel)
    const deck = this.createDeck(this.config)
    this.state = new GameState(deck)
    this.ui.setLevel(this.config, deck.length)
    this.ui.renderTray([])
    this.ui.updateStats(this.bankedScore, deck.length)
    this.createPile(deck)
    this.playing = true
    this.paused = false
    this.inputLocked = true
    this.ui.hideOverlay()
    this.ui.setToolsEnabled(true)
    this.poki.gameplayStart()
    this.tweens.add({
      duration: 0.95,
      update: () => undefined,
      complete: () => {
        if (this.playing && !this.paused) {
          this.inputLocked = false
          this.scheduleFirstLevelHint()
        }
      },
    })
  }

  private createDeck(config: LevelConfig): TrayEntry[] {
    const deck: TrayEntry[] = []
    let id = 0
    for (const kind of config.kinds) {
      for (let copyIndex = 0; copyIndex < config.copiesPerKind; copyIndex += 1) {
        deck.push({ id: `level-${config.number}-toy-${id}`, kind })
        id += 1
      }
    }

    const random = mulberry32((this.levelSeed ^ 0x6ac690c5) >>> 0)
    shuffle(deck, random)
    return deck
  }

  private createPile(deck: TrayEntry[]): void {
    const random = mulberry32((this.levelSeed ^ 0x9e3779b9) >>> 0)
    deck.forEach((entry, index) => {
      const object = this.factory.createToy(entry.kind)
      const targetScale = 0.92
      object.position.copy(this.pilePosition(index, deck.length, random))
      object.rotation.set(
        (random() - 0.5) * 1.2,
        random() * Math.PI * 2,
        (random() - 0.5) * 1.2,
      )
      object.scale.setScalar(targetScale)
      object.userData.itemId = entry.id
      object.traverse((child) => {
        child.userData.itemId = entry.id
      })
      const item: PileItem = {
        id: entry.id,
        kind: entry.kind,
        object,
        selected: false,
        removed: false,
      }
      this.items.set(entry.id, item)
      this.pileRoot.add(object)
      this.physics.addItem(entry.id, entry.kind, object, object.position, object.quaternion)
    })
  }

  private pilePosition(
    index: number,
    total: number,
    random: () => number,
  ): THREE.Vector3 {
    if (this.currentLevel === 1 && total === 3) {
      return new THREE.Vector3(
        (index - 1) * 1.65,
        0.72,
        0.25 + (random() - 0.5) * 0.16,
      )
    }
    const perLayer = 12
    const layer = Math.floor(index / perLayer)
    const slot = index % perLayer
    const column = slot % 4
    const row = Math.floor(slot / 4)
    return new THREE.Vector3(
      (column - 1.5) * 1.34 + (random() - 0.5) * 0.22,
      0.58 + layer * 1.28 + random() * 0.08,
      (row - 1) * 1.3 + (random() - 0.5) * 0.22,
    )
  }

  private selectItem(item: PileItem): void {
    if (!this.canInteract() || !this.state || item.selected || item.removed) return
    const result = this.state.select(item.id)
    if (!result) return

    if (this.currentLevel === 1) {
      this.firstLevelSelectionMade = true
      this.cancelFirstLevelHint()
      this.ui.hideToast()
    }
    this.inputLocked = true
    item.selected = true
    this.clearHover()
    this.audio.pick()
    this.ui.updateStats(this.bankedScore + result.score, result.remaining)
    const trayIndex = Math.max(0, result.preResolutionTray.findIndex((entry) => entry.id === item.id))
    const slot = this.ui.getTraySlotCenter(trayIndex)
    const targetPosition = this.screenPointToWorld(slot.x, slot.y, 8.2)
    this.physics.removeItem(item.id)
    this.scene.attach(item.object)
    const startPosition = item.object.position.clone()
    const startScale = item.object.scale.clone()
    const targetScale = startScale.clone().multiplyScalar(0.48)
    const startQuaternion = item.object.quaternion.clone()
    const targetQuaternion = new THREE.Quaternion()

    this.tweens.add({
      duration: 0.24,
      ease: easing.outCubic,
      update: (progress) => {
        item.object.position.lerpVectors(startPosition, targetPosition, progress)
        item.object.scale.lerpVectors(startScale, targetScale, progress)
        item.object.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, progress)
      },
      complete: () => {
        item.object.visible = false
        this.ui.renderTray(result.preResolutionTray)
        this.audio.place()
        if (result.matched.length > 0) {
          this.tweens.add({
            duration: 0.08,
            update: () => undefined,
            complete: () => this.resolveMatch(result),
          })
        } else {
          this.completeSelection(result)
        }
      },
    })
  }

  private resolveMatch(result: SelectionResult): void {
    const kind = result.matched[0].kind
    this.ui.flashMatch(kind)
    this.audio.match(result.combo)
    for (const entry of result.matched) {
      const matchedItem = this.items.get(entry.id)
      if (matchedItem) matchedItem.removed = true
    }
    this.tweens.add({
      duration: 0.84,
      update: () => undefined,
      complete: () => {
        this.ui.renderTray(result.tray)
        this.completeSelection(result)
      },
    })
  }

  private completeSelection(result: SelectionResult): void {
    if (result.won) {
      this.finishLevel(true)
      return
    }
    if (result.lost) {
      this.finishLevel(false)
      return
    }
    this.inputLocked = false
  }

  private finishLevel(won: boolean): void {
    if (!this.state) return
    this.cancelFirstLevelHint()
    this.ui.hideToast()
    this.playing = false
    this.inputLocked = true
    this.completedLevelScore = this.state.score
    this.poki.gameplayStop()
    this.ui.setToolsEnabled(false)
    const totalScore = this.bankedScore + this.completedLevelScore
    this.saveBest(totalScore)

    if (won) {
      this.audio.win()
      this.revealPet()
      this.tweens.add({
        duration: 0.72,
        update: () => undefined,
        complete: () =>
          this.ui.showResult(true, this.currentLevel, totalScore, this.config.petName),
      })
    } else {
      this.audio.lose()
      this.tweens.add({
        duration: 0.28,
        update: () => undefined,
        complete: () =>
          this.ui.showResult(
            false,
            this.currentLevel,
            totalScore,
            this.config.petName,
            !this.rewardedContinueUsed && this.state!.tray.length >= 2,
          ),
      })
    }
  }

  private restoreItemToPile(entry: TrayEntry, offset = 0): void {
    const item = this.items.get(entry.id)
    if (!item || !this.state) return
    item.selected = false
    item.removed = false
    item.object.visible = true
    this.pileRoot.attach(item.object)
    item.object.scale.setScalar(0.92)
    const random = mulberry32(
      (this.levelSeed ^ (this.state.remaining * 991 + offset * 0x9e37)) >>> 0,
    )
    const spawnPosition = new THREE.Vector3(
      (random() - 0.5) * 2.2,
      5.2 + random() * 0.8 + offset * 0.18,
      (random() - 0.5) * 1.2,
    )
    item.object.position.copy(spawnPosition)
    item.object.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI)
    this.physics.addItem(
      item.id,
      item.kind,
      item.object,
      spawnPosition,
      item.object.quaternion,
    )
  }

  private revealPet(): void {
    const pet = this.factory.createPet(this.config.petModel)
    pet.position.set(0, 0.75, 0)
    pet.rotation.y = -0.25
    pet.scale.setScalar(0.001)
    this.scene.add(pet)
    this.rescuedPet = pet
    this.tweens.add({
      duration: 0.62,
      ease: easing.outBack,
      update: (progress) => pet.scale.setScalar(Math.max(0.001, progress)),
    })
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.canInteract()) return
      canvas.setPointerCapture(event.pointerId)
      this.gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        previousX: event.clientX,
        previousY: event.clientY,
        dragged: false,
      }
    })

    canvas.addEventListener('pointermove', (event) => {
      if (this.gesture?.pointerId === event.pointerId) {
        const totalDistance = Math.hypot(
          event.clientX - this.gesture.startX,
          event.clientY - this.gesture.startY,
        )
        if (totalDistance > 7) this.gesture.dragged = true
        if (this.gesture.dragged) {
          const deltaX = event.clientX - this.gesture.previousX
          this.cameraYaw -= deltaX * 0.009
          this.updateCamera()
          this.clearHover()
        }
        this.gesture.previousX = event.clientX
        this.gesture.previousY = event.clientY
      } else if (event.pointerType === 'mouse' && this.canInteract()) {
        this.updateHover(event.clientX, event.clientY)
      }
    })

    canvas.addEventListener('pointerup', (event) => {
      if (!this.gesture || this.gesture.pointerId !== event.pointerId) return
      if (!this.gesture.dragged) {
        const item = this.pick(event.clientX, event.clientY)
        if (item) this.selectItem(item)
      }
      this.gesture = null
    })

    canvas.addEventListener('pointercancel', () => {
      this.gesture = null
    })
    canvas.addEventListener('pointerleave', () => this.clearHover())
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      this.ui.showGraphicsRestoring()
    })
  }

  private updateHover(clientX: number, clientY: number): void {
    const next = this.pick(clientX, clientY)
    if (next === this.hoveredItem) return
    this.clearHover()
    if (!next) return
    this.hoveredItem = next
    this.setGlow(next.object, true)
    this.renderer.domElement.classList.add('is-hovering')
  }

  private clearHover(): void {
    if (this.hoveredItem) this.setGlow(this.hoveredItem.object, false)
    this.hoveredItem = null
    this.renderer.domElement.classList.remove('is-hovering')
  }

  private setGlow(object: THREE.Object3D, enabled: boolean): void {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue
        material.emissive.set(enabled ? '#8877ff' : '#000000')
        material.emissiveIntensity = enabled ? 0.18 : 0
      }
    })
  }

  private pick(clientX: number, clientY: number): PileItem | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const candidates = [...this.items.values()]
      .filter((item) => !item.selected && !item.removed && item.object.visible)
      .map((item) => item.object)
    const intersection = this.raycaster.intersectObjects(candidates, true)[0]
    if (!intersection) return null
    let object: THREE.Object3D | null = intersection.object
    while (object && !object.userData.itemId) object = object.parent
    return object?.userData.itemId ? (this.items.get(String(object.userData.itemId)) ?? null) : null
  }

  private screenPointToWorld(clientX: number, clientY: number, distance: number): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const point = new THREE.Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
      0.25,
    ).unproject(this.camera)
    return this.camera.position
      .clone()
      .add(point.sub(this.camera.position).normalize().multiplyScalar(distance))
  }

  private canInteract(): boolean {
    return this.playing && !this.paused && !this.inputLocked && !this.transitionPending
  }

  private async runAfterCommercialBreak(action: () => void): Promise<void> {
    if (this.transitionPending) return
    this.transitionPending = true
    this.inputLocked = true
    this.ui.setOverlayActionsEnabled(false)
    try {
      await this.poki.commercialBreak(() => {
        this.poki.gameplayStop()
        this.audio.suspend()
      })
    } finally {
      this.audio.resume()
      this.transitionPending = false
      this.ui.setOverlayActionsEnabled(true)
    }
    action()
  }

  private async runRewardedContinue(state: GameState): Promise<void> {
    this.transitionPending = true
    this.inputLocked = true
    this.ui.setOverlayActionsEnabled(false)
    let rewarded = false
    try {
      rewarded = await this.poki.rewardedBreak(() => {
        this.poki.gameplayStop()
        this.audio.suspend()
      })
    } finally {
      this.audio.resume()
      this.transitionPending = false
      this.ui.setOverlayActionsEnabled(true)
    }

    if (!rewarded || this.state !== state) {
      if (!rewarded) this.ui.showRewardUnavailable()
      return
    }

    const recovered = state.recoverTray(2)
    if (recovered.length < 2) {
      this.ui.showRewardUnavailable()
      return
    }

    this.rewardedContinueUsed = true
    recovered.forEach((entry, index) => this.restoreItemToPile(entry, index))
    this.ui.renderTray(state.tray)
    this.ui.updateStats(this.bankedScore + state.score, state.remaining)
    this.ui.hideOverlay()
    this.ui.showRewardGranted()
    this.ui.setToolsEnabled(true)
    this.playing = true
    this.paused = false
    this.inputLocked = false
    this.poki.gameplayStart()
  }

  private scheduleFirstLevelHint(): void {
    this.cancelFirstLevelHint()
    if (
      this.currentLevel !== 1 ||
      !this.playing ||
      this.paused ||
      this.firstLevelSelectionMade ||
      this.state?.remaining !== 3
    ) {
      return
    }
    this.firstLevelHintTimer = window.setTimeout(() => {
      this.firstLevelHintTimer = 0
      if (
        this.currentLevel === 1 &&
        this.playing &&
        !this.paused &&
        !this.firstLevelSelectionMade &&
        this.state?.remaining === 3
      ) {
        this.ui.showFirstLevelHint()
      }
    }, FIRST_LEVEL_HINT_DELAY_MS)
  }

  private cancelFirstLevelHint(): void {
    window.clearTimeout(this.firstLevelHintTimer)
    this.firstLevelHintTimer = 0
  }

  private clearLevel(): void {
    this.cancelFirstLevelHint()
    this.ui.hideToast()
    this.tweens.clear()
    this.clearHover()
    for (const item of this.items.values()) item.object.removeFromParent()
    this.physics.clearItems()
    this.items.clear()
    this.rescuedPet?.removeFromParent()
    this.rescuedPet = null
    this.cameraYaw = 0
    this.updateCamera()
    this.state = null
  }

  private createEnvironment(): void {
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: '#6758b7',
      roughness: 0.66,
      metalness: 0,
    })
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: '#dad3ff',
      roughness: 0.82,
    })
    const floor = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.42, 6.2), baseMaterial)
    floor.position.y = -0.72
    floor.receiveShadow = true
    const inset = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.12, 5.5), innerMaterial)
    inset.position.y = -0.45
    inset.receiveShadow = true
    this.environmentRoot.add(floor, inset)

    const wallGeometryX = new THREE.BoxGeometry(0.35, 0.75, 6.4)
    const wallGeometryZ = new THREE.BoxGeometry(8.2, 0.75, 0.35)
    const leftWall = new THREE.Mesh(wallGeometryX, baseMaterial)
    leftWall.position.set(-4.08, -0.29, 0)
    const rightWall = leftWall.clone()
    rightWall.position.x = 4.08
    const backWall = new THREE.Mesh(wallGeometryZ, baseMaterial)
    backWall.position.set(0, -0.29, -3.08)
    const frontLip = new THREE.Mesh(wallGeometryZ, baseMaterial)
    frontLip.position.set(0, -0.29, 3.08)
    this.environmentRoot.add(leftWall, rightWall, backWall, frontLip)

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.6, 0.72, 48),
      new THREE.MeshStandardMaterial({ color: '#f3c98b', roughness: 0.72 }),
    )
    table.position.y = -1.23
    table.receiveShadow = true
    this.environmentRoot.add(table)
  }

  private createLights(): void {
    const hemisphere = new THREE.HemisphereLight('#f8fbff', '#64508d', 2.45)
    const key = new THREE.DirectionalLight('#fff3dd', 3.15)
    key.position.set(-5, 10, 8)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -7
    key.shadow.camera.right = 7
    key.shadow.camera.top = 7
    key.shadow.camera.bottom = -7
    key.shadow.bias = -0.0006
    const fill = new THREE.DirectionalLight('#809cff', 1.1)
    fill.position.set(6, 5, -6)
    this.scene.add(hemisphere, key, fill)
  }

  private resize(): void {
    const width = this.renderer.domElement.clientWidth || window.innerWidth
    const height = this.renderer.domElement.clientHeight || window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    const portrait = width / Math.max(height, 1) < 0.82
    this.cameraHeight = portrait ? 13.8 : 10.6
    this.cameraDistance = portrait ? 18.5 : 14.2
    this.cameraTarget.set(0, portrait ? 1.25 : pileCenter.y, portrait ? 0.2 : 0)
    this.updateCamera()
    this.camera.updateProjectionMatrix()
  }

  private updateCamera(): void {
    this.camera.position.set(
      this.cameraTarget.x + Math.sin(this.cameraYaw) * this.cameraDistance,
      this.cameraHeight,
      this.cameraTarget.z + Math.cos(this.cameraYaw) * this.cameraDistance,
    )
    this.camera.lookAt(this.cameraTarget)
  }

  private animate(): void {
    const now = performance.now()
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05)
    this.lastFrameTime = now
    if (!this.paused) {
      this.elapsed += delta
      this.physics.step(delta)
      this.tweens.update(delta)
      if (this.rescuedPet) {
        this.rescuedPet.position.y = 0.78 + Math.sin(this.elapsed * 3.2) * 0.08
        this.rescuedPet.rotation.y += delta * 0.45
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  private saveBest(score: number): void {
    try {
      const best = Number(localStorage.getItem('toybox-trio-best') ?? 0)
      if (score > best) localStorage.setItem('toybox-trio-best', String(score))
    } catch {
      // Private browsing can disable storage; gameplay must continue regardless.
    }
  }
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createRandomSeed(): number {
  try {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] || 1
  } catch {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
  }
}

function mixSeed(seed: number, level: number): number {
  let value = (seed ^ Math.imul(level, 0x9e3779b1)) >>> 0
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b)
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35)
  return (value ^ (value >>> 16)) >>> 0
}

function shuffle<T>(items: T[], random: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[items[index], items[other]] = [items[other], items[index]]
  }
}
