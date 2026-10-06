/**
 * match.js — Match state machine
 *
 * Manages the full lifecycle of a badminton match:
 *   - Game scores, game count, which game we're in
 *   - Serving player and service court
 *   - Side switching
 *   - Match over detection
 *
 * Pure logic — no DOM or Canvas references.
 * The state object is immutable-style: functions return new state rather than mutating.
 */

import {
  applyPoint,
  isGameWon,
  nextServer,
  serviceCourtForServer,
  countGamesWon,
  isMatchOver,
  shouldSwitchSidesAtGameStart,
  shouldSwitchSidesMidGame,
  createGameScore,
  GAMES_TO_WIN,
} from './rules.js';
import { recoverBetweenPoints, recoverBetweenGames, MAX_STAMINA } from './stamina.js';
import { DEFAULT_PLAYER_ZONE, DEFAULT_OPPONENT_ZONE } from './court.js';

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a fresh match state.
 *
 * @param {object} p
 * @param {object} p.playerStats   — { name, control, speed, power, stamina, deception }
 * @param {object} p.opponentStats — same shape
 * @param {'player'|'opponent'} [p.firstServer] — who serves first (default: 'player')
 * @returns {MatchState}
 */
export function createMatch({ playerStats, opponentStats, firstServer = 'player' }) {
  return {
    // Match-level
    games: [],               // completed games: [{ playerScore, opponentScore }]
    playerGames: 0,
    opponentGames: 0,
    matchOver: false,
    matchWinner: null,       // 'player' | 'opponent' | null

    // Current game
    gameNumber: 1,
    currentGame: createGameScore(),
    sidesFlipped: false,     // whether player/opponent sides have been flipped this game
    hasSwitchedMidGame: false,

    // Current point / rally
    server: firstServer,
    serviceCourtSide: serviceCourtForServer(0), // 'left' | 'right'
    rallyInProgress: false,
    lastPointWinner: null,

    // Stamina
    playerStamina: MAX_STAMINA,
    opponentStamina: MAX_STAMINA,

    // Position
    playerZone: DEFAULT_PLAYER_ZONE,
    opponentZone: DEFAULT_OPPONENT_ZONE,

    // Shuttle
    opponentLastShot: 'CLEAR', // determines shuttle height at start of rally
    shuttleIsHigh: true,       // high shuttle at game start (serve)
    shuttleLandingZone: DEFAULT_PLAYER_ZONE,

    // Stats references
    playerStats,
    opponentStats,

    // Phase: 'pre_serve' | 'player_turn' | 'resolving' | 'point_over' | 'game_over' | 'match_over'
    phase: 'pre_serve',
  };
}

// ─── Point Resolution ─────────────────────────────────────────────────────────

/**
 * Apply the outcome of a completed rally (one side won a point).
 * Returns new match state.
 *
 * @param {MatchState} state
 * @param {'player'|'opponent'} pointWinner
 * @returns {MatchState}
 */
export function applyRallyResult(state, pointWinner) {
  if (state.matchOver) return state;

  // Update scores
  const { playerScore, opponentScore } = applyPoint({
    playerScore: state.currentGame.playerScore,
    opponentScore: state.currentGame.opponentScore,
    pointWinner,
  });

  const newServer = nextServer(pointWinner);
  const serverScore = newServer === 'player' ? playerScore : opponentScore;
  const newServiceCourt = serviceCourtForServer(serverScore);

  // Recover stamina between points
  const playerStamina = recoverBetweenPoints(state.playerStamina, state.playerStats.stamina);
  const opponentStamina = recoverBetweenPoints(state.opponentStamina, state.opponentStats.stamina);

  // Check for mid-game side switch (game 3 at 11)
  const hasSwitchedMidGame = state.hasSwitchedMidGame ||
    shouldSwitchSidesMidGame(state.gameNumber, playerScore, opponentScore, state.hasSwitchedMidGame);

  // Check game won
  if (isGameWon(playerScore, opponentScore) || isGameWon(opponentScore, playerScore)) {
    return _handleGameOver(state, { playerScore, opponentScore }, playerStamina, opponentStamina);
  }

  return {
    ...state,
    currentGame: { playerScore, opponentScore },
    server: newServer,
    serviceCourtSide: newServiceCourt,
    lastPointWinner: pointWinner,
    playerStamina,
    opponentStamina,
    hasSwitchedMidGame,
    playerZone: DEFAULT_PLAYER_ZONE,
    opponentZone: DEFAULT_OPPONENT_ZONE,
    shuttleIsHigh: true,
    opponentLastShot: 'CLEAR',
    phase: 'pre_serve',
  };
}

function _handleGameOver(state, finalScore, playerStamina, opponentStamina) {
  const gameWinner = finalScore.playerScore > finalScore.opponentScore ? 'player' : 'opponent';
  const completedGames = [...state.games, finalScore];
  const { playerGames, opponentGames } = countGamesWon(completedGames);

  if (isMatchOver(playerGames, opponentGames)) {
    return {
      ...state,
      games: completedGames,
      currentGame: finalScore,
      playerGames,
      opponentGames,
      matchOver: true,
      matchWinner: playerGames >= GAMES_TO_WIN ? 'player' : 'opponent',
      playerStamina,
      opponentStamina,
      phase: 'match_over',
    };
  }

  // Start new game
  const newGameNumber = state.gameNumber + 1;
  const newPlayerStamina = recoverBetweenGames(playerStamina);
  const newOpponentStamina = recoverBetweenGames(opponentStamina);

  return {
    ...state,
    games: completedGames,
    currentGame: createGameScore(),
    playerGames,
    opponentGames,
    gameNumber: newGameNumber,
    sidesFlipped: shouldSwitchSidesAtGameStart(newGameNumber) ? !state.sidesFlipped : state.sidesFlipped,
    hasSwitchedMidGame: false,
    server: gameWinner,     // winner of last game serves first
    serviceCourtSide: serviceCourtForServer(0),
    playerStamina: newPlayerStamina,
    opponentStamina: newOpponentStamina,
    playerZone: DEFAULT_PLAYER_ZONE,
    opponentZone: DEFAULT_OPPONENT_ZONE,
    shuttleIsHigh: true,
    opponentLastShot: 'CLEAR',
    lastPointWinner: gameWinner,
    phase: 'pre_serve',
  };
}

// ─── Rally Start / Update ─────────────────────────────────────────────────────

/**
 * Begin a rally (transition from pre_serve → player_turn).
 * @param {MatchState} state
 * @returns {MatchState}
 */
export function startRally(state) {
  return { ...state, rallyInProgress: true, phase: 'player_turn' };
}

/**
 * Update positions and stamina mid-rally after an exchange.
 * Called when outcome is RETURNED.
 *
 * @param {MatchState} state
 * @param {object} exchangeResult — from resolveExchange()
 * @returns {MatchState}
 */
export function applyExchangeResult(state, exchangeResult) {
  return {
    ...state,
    playerZone: exchangeResult.newPlayerZone,
    opponentZone: exchangeResult.newOpponentZone,
    playerStamina: exchangeResult.playerStaminaAfter,
    opponentStamina: exchangeResult.opponentStaminaAfter,
    shuttleLandingZone: exchangeResult.shuttleLandingZone,
    opponentLastShot: exchangeResult.opponentLastShot,
    shuttleIsHigh: exchangeResult.shuttleIsHighForPlayer,
    phase: 'player_turn',
  };
}

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Human-readable score string, e.g. "15 – 12" */
export function scoreString(state) {
  const { playerScore, opponentScore } = state.currentGame;
  return `${playerScore} – ${opponentScore}`;
}

/** e.g. "Game 2" */
export function gameLabel(state) {
  return `Game ${state.gameNumber}`;
}

/** e.g. "You lead 1–0" */
export function matchScoreLabel(state) {
  return `${state.playerGames}–${state.opponentGames}`;
}

/** True if it's currently match point for the player */
export function isMatchPoint(state) {
  if (!state.currentGame) return false;
  const { playerScore, opponentScore } = state.currentGame;
  return (
    state.playerGames === GAMES_TO_WIN - 1 &&
    playerScore >= 20 &&
    playerScore >= opponentScore
  );
}
