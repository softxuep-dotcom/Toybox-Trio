import assert from 'node:assert/strict'
import * as THREE from 'three'
import { ToyCollection } from '../src/game/simulation/ToyCollection'
import { RepairAssembly } from '../src/game/render/RepairAssembly'

let saved = '[]'
const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value } }
const shelf = new ToyCollection(storage)
shelf.unlock('car')
shelf.unlock('car')
assert.deepEqual(new ToyCollection(storage).toys, ['car'])
saved = '{broken'
assert.deepEqual(new ToyCollection(storage).toys, [])
saved = '["car", "bogus", "ball"]'
assert.deepEqual(new ToyCollection(storage).toys, ['car'])
const unavailable = new ToyCollection({ getItem: () => { throw Error() }, setItem: () => { throw Error() } })
unavailable.unlock('train')
assert.deepEqual(unavailable.toys, ['train'])

const toy = new THREE.Group()
toy.scale.setScalar(1.38)
const parts = [0, 1, 2].map((y) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
  mesh.position.y = y
  toy.add(mesh)
  return mesh
})
const assembly = new RepairAssembly(toy)
assert.ok(parts.every((part) => part.material.opacity < 0.2))
assembly.update(1 / 3)
assert.equal(parts[0].material.opacity, 1)
assert.equal(parts[1].material.opacity, 0.12)
assembly.update(1)
parts.forEach((part, index) => {
  assert.ok(part.position.distanceTo(new THREE.Vector3(0, index, 0)) < 1e-8)
  assert.equal(part.material.opacity, 1)
  assert.equal(part.material.depthWrite, true)
})
console.log('Collection persistence and repair assembly tests passed')
