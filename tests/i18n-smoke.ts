import assert from 'node:assert/strict'
import { GAME_COPY, resolveLocale, SUPPORTED_LOCALES } from '../src/game/i18n.ts'

assert.deepEqual(SUPPORTED_LOCALES, [
  'en',
  'fr',
  'it',
  'de',
  'es',
  'zh-CN',
  'ja',
  'ko',
  'pt-BR',
  'ru',
  'tr',
])

const englishKeys = Object.keys(GAME_COPY.en).sort()
for (const locale of SUPPORTED_LOCALES) {
  assert.deepEqual(Object.keys(GAME_COPY[locale]).sort(), englishKeys, `${locale} copy is incomplete`)
  for (const [key, value] of Object.entries(GAME_COPY[locale])) {
    assert.ok(value.trim().length > 0, `${locale}.${key} should not be empty`)
  }
}

assert.equal(resolveLocale(['fr-FR']), 'fr')
assert.equal(resolveLocale(['zh-Hans-CN']), 'zh-CN')
assert.equal(resolveLocale(['zh-TW']), 'en')
assert.equal(resolveLocale(['pt-BR']), 'pt-BR')
assert.equal(resolveLocale(['pt-PT']), 'en')
assert.equal(resolveLocale(['nl-NL']), 'en')
assert.equal(resolveLocale(['nl-NL', 'de-DE']), 'de')
assert.equal(resolveLocale([]), 'en')

console.log('Localization smoke tests passed')
