import { Renderer } from './rendering/renderer.js';
import { InputManager } from './core/input.js';
import { GameEngine } from './core/game-loop.js';
import { TitleScreen } from './screens/title-screen.js';
import { DifficultyScreen } from './screens/difficulty-screen.js';
import { ResultScreen } from './screens/result-screen.js';

const threeCanvas = document.getElementById('three-canvas');
const gameCanvas  = document.getElementById('game-canvas');

// Initialize graphics and input
const renderer     = new Renderer(threeCanvas, gameCanvas);
const inputManager = new InputManager(gameCanvas);

// Initialize game engine
const game = new GameEngine(renderer, inputManager);

// Handle window resizing
window.addEventListener('resize', () => {
  renderer.resize();
});

// UI Screen Controllers
let currentScreen = null;

function showTitle() {
  if (currentScreen) currentScreen.destroy();
  currentScreen = new TitleScreen(document.body, () => {
    showDifficultySelect();
  });
  document.body.appendChild(currentScreen.el);
}

function showDifficultySelect() {
  if (currentScreen) currentScreen.destroy();
  currentScreen = new DifficultyScreen(document.body, (difficultyKey) => {
    startGame(difficultyKey);
  });
  document.body.appendChild(currentScreen.el);
}

function showResult(score) {
  if (currentScreen) currentScreen.destroy();
  currentScreen = new ResultScreen(
    document.body,
    score,
    game.opponent.name,
    () => startGame(game.opponent.difficultyKey), // Rematch
    () => showTitle()                             // Menu
  );
  document.body.appendChild(currentScreen.el);
}

function startGame(difficultyKey) {
  if (currentScreen) {
    currentScreen.destroy();
    currentScreen = null;
  }
  game.startMatch(difficultyKey);
}

game.onMatchOver = (score) => {
  showResult(score);
};

// Main Animation Loop
function loop(timestamp) {
  game.update(timestamp);
  requestAnimationFrame(loop);
}

// Boot game!
showTitle();
requestAnimationFrame(loop);
