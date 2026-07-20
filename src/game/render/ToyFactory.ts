import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import type { LevelConfig, ToyKind } from '../types'
import { TOY_DEFINITIONS, TOY_KINDS } from '../types'

type PetModel = LevelConfig['petModel']

interface ModelRequest {
  key: ToyKind | PetModel
  path: string
  type: 'toy' | 'pet'
}

export class ToyFactory {
  private readonly toyPrototypes = new Map<ToyKind, THREE.Group>()
  private readonly petPrototypes = new Map<PetModel, THREE.Group>()
  private readonly loader = new GLTFLoader()

  async load(onProgress: (progress: number) => void): Promise<void> {
    for (const kind of TOY_KINDS) {
      this.toyPrototypes.set(kind, this.createProceduralToy(kind))
    }

    for (const pet of ['cat', 'bunny', 'panda'] as const) {
      this.petPrototypes.set(pet, this.createFallbackPet(pet))
    }

    const baseUrl = import.meta.env.BASE_URL
    const requests: ModelRequest[] = [
      { key: 'car', path: `${baseUrl}models/toy-car-kit/toy-car.glb`, type: 'toy' },
      { key: 'brick', path: `${baseUrl}models/brick-kit/toy-brick.glb`, type: 'toy' },
      {
        key: 'monster',
        path: `${baseUrl}models/toy-car-kit/monster-truck.glb`,
        type: 'toy',
      },
      { key: 'spaceship', path: `${baseUrl}models/space-kit/space-racer.glb`, type: 'toy' },
      { key: 'rover', path: `${baseUrl}models/space-kit/moon-rover.glb`, type: 'toy' },
      { key: 'alien', path: `${baseUrl}models/space-kit/alien.glb`, type: 'toy' },
      {
        key: 'arcade',
        path: `${baseUrl}models/mini-arcade/arcade-machine.glb`,
        type: 'toy',
      },
      {
        key: 'claw',
        path: `${baseUrl}models/mini-arcade/claw-machine.glb`,
        type: 'toy',
      },
      { key: 'train', path: `${baseUrl}models/train-kit/toy-train.glb`, type: 'toy' },
      {
        key: 'lollipop',
        path: `${baseUrl}models/food-kit/toy-lollipop.glb`,
        type: 'toy',
      },
      {
        key: 'cupcake',
        path: `${baseUrl}models/food-kit/toy-cupcake.glb`,
        type: 'toy',
      },
      { key: 'banana', path: `${baseUrl}models/food-kit/toy-banana.glb`, type: 'toy' },
      {
        key: 'pineapple',
        path: `${baseUrl}models/food-kit/toy-pineapple.glb`,
        type: 'toy',
      },
      { key: 'cat', path: `${baseUrl}models/cube-pets/pet-cat.glb`, type: 'pet' },
      { key: 'bunny', path: `${baseUrl}models/cube-pets/pet-bunny.glb`, type: 'pet' },
      { key: 'panda', path: `${baseUrl}models/cube-pets/pet-panda.glb`, type: 'pet' },
    ]

    let loadedCount = 0
    await Promise.all(
      requests.map(async (request) => {
        try {
          const gltf = await this.loader.loadAsync(request.path)
          const fitted = this.fitModel(gltf.scene, request.type === 'pet' ? 1.9 : 1.25)
          if (request.type === 'toy') {
            this.toyPrototypes.set(request.key as ToyKind, fitted)
          } else {
            this.petPrototypes.set(request.key as PetModel, fitted)
          }
        } catch (error) {
          console.warn(`Using procedural fallback for ${request.key}`, error)
        } finally {
          loadedCount += 1
          onProgress(loadedCount / requests.length)
        }
      }),
    )
  }

  createToy(kind: ToyKind): THREE.Group {
    const prototype = this.toyPrototypes.get(kind) ?? this.createProceduralToy(kind)
    return this.cloneWithMaterials(prototype)
  }

  createPet(kind: PetModel): THREE.Group {
    const prototype = this.petPrototypes.get(kind) ?? this.createFallbackPet(kind)
    return this.cloneWithMaterials(prototype)
  }

  private cloneWithMaterials(source: THREE.Group): THREE.Group {
    const result = cloneSkeleton(source) as THREE.Group
    result.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => material.clone())
      } else {
        child.material = child.material.clone()
      }
      child.castShadow = true
      child.receiveShadow = true
    })
    return result
  }

  private fitModel(source: THREE.Object3D, targetSize: number): THREE.Group {
    const wrapper = new THREE.Group()
    wrapper.add(source)
    source.updateMatrixWorld(true)
    const initialBox = new THREE.Box3().setFromObject(source)
    const size = initialBox.getSize(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    source.scale.multiplyScalar(targetSize / maxDimension)
    source.updateMatrixWorld(true)
    const centeredBox = new THREE.Box3().setFromObject(source)
    const center = centeredBox.getCenter(new THREE.Vector3())
    source.position.sub(center)
    this.prepareMeshes(wrapper)
    return wrapper
  }

  private createProceduralToy(kind: ToyKind): THREE.Group {
    switch (kind) {
      case 'ball':
        return this.createBall()
      case 'rocket':
        return this.createRocket()
      case 'top':
        return this.createTop()
      case 'gift':
        return this.createGift()
      case 'robot':
        return this.createRobot()
      case 'drum':
        return this.createDrum()
      case 'star':
        return this.createStar()
      case 'spaceship':
        return this.createFallbackSpaceship()
      case 'rover':
        return this.createFallbackRover()
      case 'alien':
        return this.createFallbackAlien()
      case 'arcade':
        return this.createFallbackArcade()
      case 'claw':
        return this.createFallbackClawMachine()
      case 'monster':
        return this.createFallbackMonsterTruck()
      case 'car':
        return this.createFallbackCar()
      case 'brick':
        return this.createFallbackBrick()
      case 'train':
        return this.createFallbackTrain()
      case 'lollipop':
        return this.createFallbackLollipop()
      case 'cupcake':
        return this.createFallbackCupcake()
      case 'banana':
        return this.createFallbackBanana()
      case 'pineapple':
        return this.createFallbackPineapple()
    }
  }

  private material(color: THREE.ColorRepresentation, roughness = 0.52): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 })
  }

  private mesh(
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    roughness?: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material(color, roughness))
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  private prepareMeshes(group: THREE.Group): THREE.Group {
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
    })
    return group
  }

  private createBall(): THREE.Group {
    const group = new THREE.Group()
    const ball = this.mesh(new THREE.SphereGeometry(0.52, 20, 14), '#ff6b6b')
    const ring = this.mesh(new THREE.TorusGeometry(0.525, 0.035, 8, 28), '#fff2d8')
    ring.rotation.x = Math.PI / 2
    group.add(ball, ring)
    return group
  }

  private createRocket(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.78, 16), '#f7f4ff')
    const nose = this.mesh(new THREE.ConeGeometry(0.31, 0.42, 16), '#7b61ff')
    nose.position.y = 0.6
    const windowMesh = this.mesh(new THREE.SphereGeometry(0.13, 12, 8), '#4d96ff', 0.25)
    windowMesh.position.set(0, 0.18, 0.26)
    const flame = this.mesh(new THREE.ConeGeometry(0.18, 0.36, 12), '#ff9f1c')
    flame.rotation.z = Math.PI
    flame.position.y = -0.57
    group.add(body, nose, windowMesh, flame)
    for (const side of [-1, 1]) {
      const fin = this.mesh(new THREE.BoxGeometry(0.16, 0.36, 0.48), '#ff5ca8')
      fin.position.set(side * 0.31, -0.25, 0)
      fin.rotation.z = side * 0.25
      group.add(fin)
    }
    return group
  }

  private createTop(): THREE.Group {
    const group = new THREE.Group()
    const cone = this.mesh(new THREE.ConeGeometry(0.55, 0.72, 18), '#26c6a2')
    cone.rotation.z = Math.PI
    const rim = this.mesh(new THREE.TorusGeometry(0.43, 0.09, 8, 24), '#fff2d8')
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.08
    const handle = this.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 12), '#7b61ff')
    handle.position.y = 0.5
    group.add(cone, rim, handle)
    return group
  }

  private createGift(): THREE.Group {
    const group = new THREE.Group()
    const box = this.mesh(new THREE.BoxGeometry(0.82, 0.7, 0.76), '#ff5ca8')
    const ribbonX = this.mesh(new THREE.BoxGeometry(0.18, 0.74, 0.8), '#ffe36e')
    const ribbonZ = this.mesh(new THREE.BoxGeometry(0.86, 0.74, 0.18), '#ffe36e')
    const bowLeft = this.mesh(new THREE.TorusGeometry(0.18, 0.055, 8, 16, Math.PI * 1.65), '#ffe36e')
    bowLeft.position.set(-0.12, 0.47, 0)
    bowLeft.rotation.z = -0.55
    const bowRight = bowLeft.clone()
    bowRight.position.x = 0.12
    bowRight.rotation.z = Math.PI + 0.55
    group.add(box, ribbonX, ribbonZ, bowLeft, bowRight)
    return group
  }

  private createRobot(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.BoxGeometry(0.72, 0.66, 0.46), '#73849a')
    body.position.y = -0.1
    const head = this.mesh(new THREE.BoxGeometry(0.62, 0.48, 0.5), '#a9b7c6')
    head.position.y = 0.5
    for (const x of [-0.16, 0.16]) {
      const eye = this.mesh(new THREE.SphereGeometry(0.065, 10, 8), '#4d96ff', 0.2)
      eye.position.set(x, 0.54, 0.25)
      group.add(eye)
    }
    const antenna = this.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8), '#ff5ca8')
    antenna.position.y = 0.87
    const tip = this.mesh(new THREE.SphereGeometry(0.085, 10, 8), '#ff5ca8')
    tip.position.y = 1.02
    group.add(body, head, antenna, tip)
    for (const side of [-1, 1]) {
      const arm = this.mesh(new THREE.CapsuleGeometry(0.08, 0.34, 4, 8), '#a9b7c6')
      arm.position.set(side * 0.48, -0.05, 0)
      arm.rotation.z = side * 0.18
      group.add(arm)
    }
    return this.fitModel(group, 1.25)
  }

  private createDrum(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.66, 20), '#f4c542')
    body.rotation.z = Math.PI / 2
    const left = this.mesh(new THREE.TorusGeometry(0.46, 0.055, 8, 24), '#ff6b6b')
    left.rotation.y = Math.PI / 2
    left.position.x = -0.34
    const right = left.clone()
    right.position.x = 0.34
    const strap = this.mesh(new THREE.TorusGeometry(0.53, 0.04, 8, 28, Math.PI * 1.35), '#7b61ff')
    strap.rotation.x = Math.PI / 2
    strap.rotation.z = -0.8
    group.add(body, left, right, strap)
    return group
  }

  private createStar(): THREE.Group {
    const shape = new THREE.Shape()
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 === 0 ? 0.58 : 0.27
      const angle = -Math.PI / 2 + (index * Math.PI) / 5
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (index === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.06,
      bevelThickness: 0.05,
    })
    geometry.center()
    const group = new THREE.Group()
    group.add(this.mesh(geometry, '#ffd84d', 0.35))
    return group
  }

  private createFallbackSpaceship(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.BoxGeometry(0.54, 0.28, 1.04), '#ff9f1c')
    const nose = this.mesh(new THREE.ConeGeometry(0.34, 0.48, 4), '#ffc45c')
    nose.rotation.x = Math.PI / 2
    nose.position.z = -0.7
    const canopy = this.mesh(new THREE.SphereGeometry(0.24, 12, 8), '#6fd8ff', 0.22)
    canopy.scale.set(1, 0.68, 1.15)
    canopy.position.set(0, 0.2, -0.12)
    group.add(body, nose, canopy)
    for (const side of [-1, 1]) {
      const wing = this.mesh(new THREE.BoxGeometry(0.48, 0.09, 0.62), '#6f7cff')
      wing.position.set(side * 0.42, -0.03, 0.12)
      wing.rotation.y = side * 0.2
      group.add(wing)
    }
    return group
  }

  private createFallbackRover(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.BoxGeometry(0.78, 0.32, 0.68), '#a9b7c6')
    const cabin = this.mesh(new THREE.BoxGeometry(0.48, 0.3, 0.44), '#ff9f1c')
    cabin.position.y = 0.3
    const antenna = this.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 8), '#59677a')
    antenna.position.set(0.18, 0.65, 0)
    const dish = this.mesh(
      new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      '#f7f4ff',
    )
    dish.position.set(0.18, 0.88, 0)
    group.add(body, cabin, antenna, dish)
    for (const x of [-0.5, 0.5]) {
      for (const z of [-0.23, 0.23]) {
        const wheel = this.mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12),
          '#384258',
        )
        wheel.position.set(x, -0.16, z)
        wheel.rotation.z = Math.PI / 2
        group.add(wheel)
      }
    }
    return this.fitModel(group, 1.25)
  }

  private createFallbackAlien(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.CapsuleGeometry(0.22, 0.38, 4, 10), '#39cdb8')
    body.position.y = -0.2
    const head = this.mesh(new THREE.SphereGeometry(0.38, 16, 10), '#58e3cd')
    head.scale.set(0.9, 1.08, 0.72)
    head.position.y = 0.42
    group.add(body, head)
    for (const x of [-0.13, 0.13]) {
      const eye = this.mesh(new THREE.SphereGeometry(0.065, 10, 8), '#192033', 0.2)
      eye.scale.set(0.72, 1.35, 0.45)
      eye.position.set(x, 0.47, 0.27)
      group.add(eye)
    }
    return this.fitModel(group, 1.25)
  }

  private createFallbackArcade(): THREE.Group {
    const group = new THREE.Group()
    const cabinet = this.mesh(new THREE.BoxGeometry(0.72, 1.15, 0.72), '#6f7cff')
    const screen = this.mesh(new THREE.BoxGeometry(0.5, 0.35, 0.06), '#20304e', 0.22)
    screen.position.set(0, 0.25, 0.39)
    const controls = this.mesh(new THREE.BoxGeometry(0.56, 0.12, 0.25), '#ff6f91')
    controls.position.set(0, -0.08, 0.45)
    const stick = this.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8), '#f7f4ff')
    stick.position.set(-0.14, 0.07, 0.49)
    group.add(cabinet, screen, controls, stick)
    return group
  }

  private createFallbackClawMachine(): THREE.Group {
    const group = new THREE.Group()
    const cabinet = this.mesh(new THREE.BoxGeometry(0.82, 1.18, 0.82), '#ff6f91')
    const windowMesh = this.mesh(new THREE.BoxGeometry(0.62, 0.54, 0.05), '#9ce9ff', 0.18)
    windowMesh.position.set(0, 0.2, 0.44)
    const prize = this.mesh(new THREE.SphereGeometry(0.16, 12, 8), '#ffe36e')
    prize.position.set(0.14, 0.08, 0.48)
    const controls = this.mesh(new THREE.BoxGeometry(0.62, 0.13, 0.22), '#8c63e6')
    controls.position.set(0, -0.28, 0.48)
    group.add(cabinet, windowMesh, prize, controls)
    return group
  }

  private createFallbackMonsterTruck(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.BoxGeometry(0.88, 0.38, 0.74), '#8c63e6')
    body.position.y = 0.12
    const cabin = this.mesh(new THREE.BoxGeometry(0.58, 0.36, 0.62), '#c9b8ff')
    cabin.position.y = 0.46
    group.add(body, cabin)
    for (const x of [-0.48, 0.48]) {
      for (const z of [-0.29, 0.29]) {
        const wheel = this.mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 0.15, 14),
          '#20263a',
        )
        wheel.position.set(x, -0.12, z)
        wheel.rotation.z = Math.PI / 2
        group.add(wheel)
      }
    }
    return this.fitModel(group, 1.25)
  }

  private createFallbackCar(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.BoxGeometry(1.05, 0.34, 0.58), '#4d96ff')
    const cabin = this.mesh(new THREE.BoxGeometry(0.48, 0.3, 0.5), '#c8ecff', 0.28)
    cabin.position.set(-0.05, 0.3, 0)
    group.add(body, cabin)
    for (const x of [-0.36, 0.36]) {
      for (const z of [-0.34, 0.34]) {
        const wheel = this.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), '#24324a')
        wheel.position.set(x, -0.22, z)
        wheel.rotation.x = Math.PI / 2
        group.add(wheel)
      }
    }
    return group
  }

  private createFallbackBrick(): THREE.Group {
    const group = new THREE.Group()
    const base = this.mesh(new THREE.BoxGeometry(1.05, 0.38, 0.56), '#ff9f1c')
    group.add(base)
    for (const x of [-0.35, 0, 0.35]) {
      for (const z of [-0.17, 0.17]) {
        const stud = this.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), '#ffb648')
        stud.position.set(x, 0.24, z)
        group.add(stud)
      }
    }
    return group
  }

  private createFallbackTrain(): THREE.Group {
    const group = new THREE.Group()
    const body = this.mesh(new THREE.BoxGeometry(0.98, 0.42, 0.58), '#e85d75')
    const cabin = this.mesh(new THREE.BoxGeometry(0.42, 0.5, 0.5), '#7b61ff')
    cabin.position.set(0.25, 0.42, 0)
    const boiler = this.mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.58, 14), '#4d96ff')
    boiler.rotation.z = Math.PI / 2
    boiler.position.set(-0.28, 0.28, 0)
    const chimney = this.mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.38, 12), '#ff9f1c')
    chimney.position.set(-0.38, 0.66, 0)
    group.add(body, cabin, boiler, chimney)
    for (const x of [-0.34, 0.34]) {
      for (const z of [-0.33, 0.33]) {
        const wheel = this.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), '#24324a')
        wheel.position.set(x, -0.25, z)
        wheel.rotation.x = Math.PI / 2
        group.add(wheel)
      }
    }
    return this.fitModel(group, 1.25)
  }

  private createFallbackLollipop(): THREE.Group {
    const group = new THREE.Group()
    const candy = this.mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 20), '#ff4fa3')
    candy.rotation.x = Math.PI / 2
    candy.position.y = 0.32
    const center = this.mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 20), '#fff2d8')
    center.rotation.x = Math.PI / 2
    center.position.set(0, 0.32, 0.01)
    const stick = this.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.76, 10), '#f2c894')
    stick.position.y = -0.3
    group.add(candy, center, stick)
    return this.fitModel(group, 1.25)
  }

  private createFallbackCupcake(): THREE.Group {
    const group = new THREE.Group()
    const wrapper = this.mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.52, 16), '#8c63e6')
    wrapper.position.y = -0.2
    const frosting = this.mesh(new THREE.SphereGeometry(0.39, 16, 10), '#ff8fbd')
    frosting.scale.y = 0.72
    frosting.position.y = 0.22
    const cherry = this.mesh(new THREE.SphereGeometry(0.1, 12, 8), '#ff5252')
    cherry.position.y = 0.55
    group.add(wrapper, frosting, cherry)
    return this.fitModel(group, 1.25)
  }

  private createFallbackBanana(): THREE.Group {
    const group = new THREE.Group()
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, 0.15, 0),
      new THREE.Vector3(-0.2, -0.12, 0),
      new THREE.Vector3(0.2, -0.12, 0),
      new THREE.Vector3(0.55, 0.15, 0),
    ])
    group.add(this.mesh(new THREE.TubeGeometry(curve, 20, 0.16, 10, false), '#ffd43b'))
    for (const x of [-0.57, 0.57]) {
      const tip = this.mesh(new THREE.SphereGeometry(0.08, 10, 8), '#7d5a2f')
      tip.position.set(x, 0.17, 0)
      group.add(tip)
    }
    return this.fitModel(group, 1.25)
  }

  private createFallbackPineapple(): THREE.Group {
    const group = new THREE.Group()
    const fruit = this.mesh(new THREE.SphereGeometry(0.38, 14, 10), '#ffb01f')
    fruit.scale.y = 1.25
    fruit.position.y = -0.12
    group.add(fruit)
    for (let index = 0; index < 5; index += 1) {
      const leaf = this.mesh(new THREE.ConeGeometry(0.12, 0.55, 5), '#2bb673')
      const angle = (index / 5) * Math.PI * 2
      leaf.position.set(Math.cos(angle) * 0.12, 0.58, Math.sin(angle) * 0.12)
      leaf.rotation.z = Math.cos(angle) * 0.25
      leaf.rotation.x = Math.sin(angle) * 0.25
      group.add(leaf)
    }
    return this.fitModel(group, 1.25)
  }

  private createFallbackPet(kind: PetModel): THREE.Group {
    const palette = {
      cat: ['#f4a261', '#fff0d5'],
      bunny: ['#f7d9e9', '#fff7fb'],
      panda: ['#2f3442', '#f4f1ea'],
    }[kind]
    const group = new THREE.Group()
    const body = this.mesh(new THREE.BoxGeometry(1, 0.8, 0.72), palette[1])
    body.position.y = -0.2
    const head = this.mesh(new THREE.BoxGeometry(0.84, 0.72, 0.74), palette[1])
    head.position.y = 0.55
    group.add(body, head)
    for (const x of [-0.21, 0.21]) {
      const eye = this.mesh(new THREE.SphereGeometry(0.055, 10, 8), '#202433')
      eye.position.set(x, 0.6, 0.39)
      group.add(eye)
    }
    if (kind === 'bunny') {
      for (const x of [-0.23, 0.23]) {
        const ear = this.mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), palette[0])
        ear.position.set(x, 1.15, 0)
        group.add(ear)
      }
    } else {
      for (const x of [-0.3, 0.3]) {
        const ear = this.mesh(new THREE.ConeGeometry(0.2, 0.35, 4), palette[0])
        ear.position.set(x, 1.02, 0)
        ear.rotation.y = Math.PI / 4
        group.add(ear)
      }
    }
    return this.fitModel(group, 1.9)
  }
}

export function toyAccent(kind: ToyKind): string {
  return TOY_DEFINITIONS[kind].color
}
