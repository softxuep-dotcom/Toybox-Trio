import RAPIER from '@dimforge/rapier3d-compat'
import type * as THREE from 'three'
import type { ToyKind } from '../types'

interface PhysicsItem {
  body: RAPIER.RigidBody
  object: THREE.Object3D
}

const FIXED_STEP = 1 / 60

export class PilePhysics {
  private world: RAPIER.World | null = null
  private readonly items = new Map<string, PhysicsItem>()
  private accumulator = 0

  async init(): Promise<void> {
    await RAPIER.init()
    this.world = new RAPIER.World({ x: 0, y: -13.5, z: 0 })
    this.world.timestep = FIXED_STEP
    this.createContainerColliders()
  }

  addItem(
    id: string,
    kind: ToyKind,
    object: THREE.Object3D,
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
  ): void {
    const world = this.requireWorld()
    this.removeItem(id)

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
        .setLinearDamping(0.28)
        .setAngularDamping(0.72)
        .setCanSleep(true)
        .setCcdEnabled(true),
    )
    const collider = this.createItemCollider(kind)
      .setDensity(0.85)
      .setFriction(0.82)
      .setRestitution(kind === 'ball' ? 0.24 : 0.06)
    world.createCollider(collider, body)
    this.items.set(id, { body, object })
  }

  removeItem(id: string): void {
    const item = this.items.get(id)
    if (!item || !this.world) return
    this.world.removeRigidBody(item.body)
    this.items.delete(id)
  }

  placeItem(id: string, position: THREE.Vector3, rotation: THREE.Quaternion): void {
    const item = this.items.get(id)
    if (!item) return
    item.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true)
    item.body.setRotation(
      { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
      true,
    )
    item.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    item.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  clearItems(): void {
    if (!this.world) return
    for (const item of this.items.values()) this.world.removeRigidBody(item.body)
    this.items.clear()
    this.accumulator = 0
  }

  rattle(random: () => number): void {
    for (const { body } of this.items.values()) {
      const position = body.translation()
      const length = Math.hypot(position.x, position.z) || 1
      const mass = body.mass()
      body.applyImpulse(
        {
          x: mass * ((position.x / length) * 0.35 + (random() - 0.5) * 1.6),
          y: mass * (2.6 + random()),
          z: mass * ((position.z / length) * 0.35 + (random() - 0.5) * 1.6),
        },
        true,
      )
      body.applyTorqueImpulse(
        {
          x: mass * (random() - 0.5) * 1.2,
          y: mass * (random() - 0.5) * 1.2,
          z: mass * (random() - 0.5) * 1.2,
        },
        true,
      )
    }
  }

  step(delta: number): void {
    if (!this.world) return
    this.accumulator = Math.min(this.accumulator + delta, FIXED_STEP * 4)
    while (this.accumulator >= FIXED_STEP) {
      this.world.step()
      this.accumulator -= FIXED_STEP
    }

    for (const { body, object } of this.items.values()) {
      const position = body.translation()
      const rotation = body.rotation()
      object.position.set(position.x, position.y, position.z)
      object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }
  }

  dispose(): void {
    this.clearItems()
    this.world?.free()
    this.world = null
  }

  private createItemCollider(kind: ToyKind): RAPIER.ColliderDesc {
    switch (kind) {
      case 'ball':
        return RAPIER.ColliderDesc.ball(0.48)
      case 'car':
        return RAPIER.ColliderDesc.cuboid(0.59, 0.25, 0.38)
      case 'brick':
        return RAPIER.ColliderDesc.cuboid(0.58, 0.29, 0.38)
      case 'rocket':
        return RAPIER.ColliderDesc.capsule(0.34, 0.27)
      case 'top':
        return RAPIER.ColliderDesc.cone(0.46, 0.46)
      case 'gift':
        return RAPIER.ColliderDesc.cuboid(0.4, 0.44, 0.38)
      case 'robot':
        return RAPIER.ColliderDesc.cuboid(0.36, 0.54, 0.28)
      case 'drum':
        return RAPIER.ColliderDesc.cylinder(0.38, 0.46)
      case 'star':
        return RAPIER.ColliderDesc.ball(0.43)
      case 'spaceship':
        return RAPIER.ColliderDesc.cuboid(0.38, 0.25, 0.6)
      case 'rover':
        return RAPIER.ColliderDesc.cuboid(0.48, 0.42, 0.5)
      case 'alien':
        return RAPIER.ColliderDesc.capsule(0.31, 0.31)
      case 'arcade':
        return RAPIER.ColliderDesc.cuboid(0.34, 0.59, 0.44)
      case 'claw':
        return RAPIER.ColliderDesc.cuboid(0.42, 0.59, 0.44)
      case 'monster':
        return RAPIER.ColliderDesc.cuboid(0.44, 0.51, 0.59)
      case 'train':
        return RAPIER.ColliderDesc.cuboid(0.58, 0.39, 0.34)
      case 'lollipop':
        return RAPIER.ColliderDesc.capsule(0.42, 0.13)
      case 'cupcake':
        return RAPIER.ColliderDesc.cone(0.43, 0.38)
      case 'banana':
        return RAPIER.ColliderDesc.capsule(0.38, 0.2)
      case 'pineapple':
        return RAPIER.ColliderDesc.capsule(0.38, 0.29)
    }
  }

  private createContainerColliders(): void {
    const world = this.requireWorld()
    const fixedColliders = [
      RAPIER.ColliderDesc.cuboid(3.78, 0.08, 2.63).setTranslation(0, -0.47, 0),
      RAPIER.ColliderDesc.cuboid(0.16, 1.8, 2.95).setTranslation(-3.92, 1.24, 0),
      RAPIER.ColliderDesc.cuboid(0.16, 1.8, 2.95).setTranslation(3.92, 1.24, 0),
      RAPIER.ColliderDesc.cuboid(3.92, 1.8, 0.16).setTranslation(0, 1.24, -2.92),
      RAPIER.ColliderDesc.cuboid(3.92, 1.8, 0.16).setTranslation(0, 1.24, 2.92),
    ]
    for (const collider of fixedColliders) {
      world.createCollider(collider.setFriction(0.9).setRestitution(0.04))
    }
  }

  private requireWorld(): RAPIER.World {
    if (!this.world) throw new Error('Pile physics has not been initialized')
    return this.world
  }
}
