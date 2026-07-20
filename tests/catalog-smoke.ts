import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { getLevelConfig, TOY_DEFINITIONS, TOY_KINDS } from '../src/game/types.ts'

assert.equal(TOY_KINDS.length, 20, 'the catalog should contain 20 matching toy types')
assert.deepEqual(
  Object.keys(TOY_DEFINITIONS).sort(),
  [...TOY_KINDS].sort(),
  'every toy kind should have a tray definition',
)

for (const kind of TOY_KINDS) {
  const icon = new URL(`../public/icons/toys/${kind}.png`, import.meta.url)
  assert.ok(existsSync(icon), `${kind} should have a rendered tray icon`)
  assert.ok(statSync(icon).size > 5_000, `${kind} tray icon should not be empty`)
}

const tutorialLevel = getLevelConfig(1)
assert.deepEqual(tutorialLevel.kinds, ['car'], 'Box 1 should contain only cars')
assert.equal(tutorialLevel.copiesPerKind, 3, 'Box 1 should contain exactly three cars')
assert.equal(tutorialLevel.rattles, 0, 'Box 1 should not expose the rattle tool')
assert.equal(tutorialLevel.undos, 0, 'Box 1 should not need undo')

const openingLevels = [1, 2, 3, 4].map((level) => getLevelConfig(level))
for (const config of openingLevels) {
  assert.equal(new Set(config.kinds).size, config.kinds.length, `Box ${config.number} has duplicates`)
  assert.equal(config.copiesPerKind % 3, 0, `Box ${config.number} must remain divisible by three`)
}

const introducedKinds = new Set(openingLevels.flatMap((config) => config.kinds))
assert.deepEqual(
  [...introducedKinds].sort(),
  [...TOY_KINDS].sort(),
  'the first four boxes should introduce the complete catalog',
)
assert.equal(getLevelConfig(5).kinds.length, 9, 'later boxes should keep the pile at nine kinds')

console.log('Toy catalog smoke tests passed')
