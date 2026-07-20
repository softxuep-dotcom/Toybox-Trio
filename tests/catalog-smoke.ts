import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { getLevelConfig, TOY_DEFINITIONS, TOY_KINDS } from '../src/game/types.ts'

assert.equal(TOY_KINDS.length, 15, 'the catalog should contain 15 matching toy types')
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

const openingLevels = [1, 2, 3].map((level) => getLevelConfig(level))
for (const config of openingLevels) {
  assert.equal(new Set(config.kinds).size, config.kinds.length, `Box ${config.number} has duplicates`)
  assert.equal(config.copiesPerKind % 3, 0, `Box ${config.number} must remain divisible by three`)
}

const introducedKinds = new Set(openingLevels.flatMap((config) => config.kinds))
assert.deepEqual(
  [...introducedKinds].sort(),
  [...TOY_KINDS].sort(),
  'the first three boxes should introduce the complete catalog',
)
assert.equal(getLevelConfig(4).kinds.length, 9, 'later boxes should keep the pile at nine kinds')

console.log('Toy catalog smoke tests passed')
