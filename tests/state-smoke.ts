import assert from 'node:assert/strict'
import { GameState } from '../src/game/simulation/GameState.ts'
import type { ToyKind, TrayEntry } from '../src/game/types.ts'

function entries(kinds: ToyKind[]): TrayEntry[] {
  return kinds.map((kind, index) => ({ id: `toy-${index}`, kind }))
}

const matchState = new GameState(entries(['ball', 'ball', 'ball']))
assert.equal(matchState.select('toy-0')?.matched.length, 0)
assert.equal(matchState.select('toy-1')?.matched.length, 0)
const winningPick = matchState.select('toy-2')
assert.equal(winningPick?.matched.length, 3)
assert.equal(winningPick?.won, true)
assert.equal(winningPick?.score, 100)
assert.equal(matchState.tray.length, 0)

const losingKinds: ToyKind[] = ['ball', 'car', 'brick', 'rocket', 'top', 'gift', 'robot']
const losingState = new GameState(entries(losingKinds))
let finalLoss = false
for (let index = 0; index < losingKinds.length; index += 1) {
  finalLoss = losingState.select(`toy-${index}`)?.lost ?? false
}
assert.equal(finalLoss, true)
assert.equal(losingState.tray.length, 7)
const recovered = losingState.recoverTray(2)
assert.deepEqual(recovered, [
  { id: 'toy-5', kind: 'gift' },
  { id: 'toy-6', kind: 'robot' },
])
assert.equal(losingState.tray.length, 5)
assert.equal(losingState.remaining, 2)
assert.equal(losingState.select('toy-5')?.lost, false)
assert.equal(losingState.select('toy-6')?.lost, true)

const undoState = new GameState(entries(['ball', 'car', 'brick']))
undoState.select('toy-0')
assert.equal(undoState.remaining, 2)
assert.deepEqual(undoState.undo(), { id: 'toy-0', kind: 'ball' })
assert.equal(undoState.remaining, 3)
assert.equal(undoState.tray.length, 0)
assert.deepEqual(undoState.recoverTray(2), [])

console.log('GameState smoke tests passed')
