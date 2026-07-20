import './style.css'
import { ToyboxGame } from './game/ToyboxGame'
import { GameUI } from './game/ui/GameUI'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('Missing app root')

const ui = new GameUI(root)
const game = new ToyboxGame(ui.canvas, ui)

ui.bind({
  start: () => game.start(),
  restart: () => game.restart(),
  next: () => game.next(),
  rattle: () => game.rattle(),
  undo: () => game.undo(),
  sound: () => game.toggleSound(),
  pause: () => game.togglePause(),
})

void game.init().catch((error: unknown) => {
  console.error('Toybox Trio failed to start', error)
  ui.showToast('Could not open the toybox. Please refresh.', 6000)
})
