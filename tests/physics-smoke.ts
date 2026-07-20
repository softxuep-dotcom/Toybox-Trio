import assert from 'node:assert/strict'
import * as THREE from 'three'
import { PilePhysics } from '../src/game/physics/PilePhysics'

const physics = new PilePhysics()
await physics.init()

const ball = new THREE.Group()
physics.addItem(
  'physics-test-ball',
  'ball',
  ball,
  new THREE.Vector3(0, 3, 0),
  new THREE.Quaternion(),
)

for (let step = 0; step < 240; step += 1) physics.step(1 / 60)

assert.ok(Number.isFinite(ball.position.y), 'physics position should remain finite')
assert.ok(ball.position.y > -0.05 && ball.position.y < 0.4, 'ball should settle on the tray')

const restingHeight = ball.position.y
physics.rattle(() => 0.75)
physics.step(1 / 60)
assert.ok(ball.position.y > restingHeight, 'rattle should lift a settled toy')

physics.dispose()
console.log('PilePhysics smoke tests passed')
