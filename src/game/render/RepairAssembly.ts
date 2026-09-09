import * as THREE from 'three'

/** Turns the existing model's mesh parts into a bottom-to-top assembly. */
export class RepairAssembly {
  private readonly parts: { mesh: THREE.Mesh; home: THREE.Vector3; offset: THREE.Vector3 }[] = []

  constructor(toy: THREE.Group) {
    toy.updateMatrixWorld(true)
    const meshes: THREE.Mesh[] = []
    toy.traverse((child) => { if (child instanceof THREE.Mesh) meshes.push(child) })
    meshes.sort((a, b) =>
      new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3()).y -
      new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3()).y,
    )
    meshes.forEach((mesh, index) => {
      const home = mesh.position.clone()
      const world = mesh.getWorldPosition(new THREE.Vector3())
      const destination = world.clone().add(new THREE.Vector3(index % 2 ? 0.5 : -0.5, 0.6, 0))
      const offset = mesh.parent!.worldToLocal(destination).sub(home)
      this.parts.push({ mesh, home, offset })
    })
    this.update(0)
  }

  update(progress: number): void {
    this.parts.forEach(({ mesh, home, offset }, index) => {
      const amount = THREE.MathUtils.clamp(progress * this.parts.length - index, 0, 1)
      const eased = 1 - Math.pow(1 - amount, 3)
      mesh.position.copy(home).addScaledVector(offset, 1 - eased)
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        material.transparent = amount < 1
        material.opacity = 0.12 + amount * 0.88
        material.depthWrite = amount >= 1
      }
    })
  }
}
