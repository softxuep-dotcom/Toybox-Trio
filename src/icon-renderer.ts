import * as THREE from 'three'
import { ToyFactory } from './game/render/ToyFactory'
import type { ToyKind } from './game/types'
import { TOY_KINDS } from './game/types'

declare global {
  interface Window {
    __toyIconReady: boolean
    __toyIconDataUrl: () => string
  }
}

const canvas = document.querySelector<HTMLCanvasElement>('#icon-canvas')
const output = document.querySelector<HTMLImageElement>('#icon-output')
if (!canvas || !output) throw new Error('Missing icon render surface')

const requestedKind = new URLSearchParams(window.location.search).get('kind') as ToyKind | null
const kind = requestedKind && TOY_KINDS.includes(requestedKind) ? requestedKind : 'ball'
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
})
renderer.setSize(512, 512, false)
renderer.setPixelRatio(1)
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.14

const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-0.92, 0.92, 0.92, -0.92, 0.1, 30)
camera.position.set(3.2, 2.65, 4.4)
camera.lookAt(0, 0, 0)

scene.add(new THREE.HemisphereLight('#fffaf0', '#7d72aa', 2.15))
const keyLight = new THREE.DirectionalLight('#fff3d6', 3.4)
keyLight.position.set(4, 7, 6)
const rimLight = new THREE.DirectionalLight('#8fdcff', 2.1)
rimLight.position.set(-5, 3, -4)
scene.add(keyLight, rimLight)

const factory = new ToyFactory()
window.__toyIconReady = false
window.__toyIconDataUrl = () => renderer.domElement.toDataURL('image/png')

void factory.load(() => undefined).then(() => {
  const toy = factory.createToy(kind)
  toy.rotation.set(0.08, 0.42, -0.035)
  scene.add(toy)
  renderer.render(scene, camera)
  requestAnimationFrame(() => {
    renderer.render(scene, camera)
    output.src = renderer.domElement.toDataURL('image/png')
    window.__toyIconReady = true
    document.title = `${kind} icon ready`
  })
})
