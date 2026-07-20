import assert from 'node:assert/strict'
import { PokiBridge } from '../src/game/platform/PokiBridge.ts'

const calls: string[] = []
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    PokiSDK: {
      init: async () => {
        calls.push('init')
      },
      gameLoadingFinished: () => calls.push('loading-finished'),
      gameplayStart: () => calls.push('gameplay-start'),
      gameplayStop: () => calls.push('gameplay-stop'),
      commercialBreak: async (onStart?: () => void) => {
        onStart?.()
        calls.push('commercial-break')
      },
    },
  },
})

const bridge = new PokiBridge()
await bridge.init()
bridge.loadingFinished()
bridge.gameplayStart()
bridge.gameplayStart()
bridge.gameplayStop()
bridge.gameplayStop()
await bridge.commercialBreak(() => calls.push('ad-start'))

assert.deepEqual(calls, [
  'init',
  'loading-finished',
  'gameplay-start',
  'gameplay-stop',
  'ad-start',
  'commercial-break',
])

Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
const noSdkBridge = new PokiBridge()
await noSdkBridge.init()
noSdkBridge.loadingFinished()
noSdkBridge.gameplayStart()
noSdkBridge.gameplayStop()
await noSdkBridge.commercialBreak()

console.log('Poki bridge smoke tests passed')
