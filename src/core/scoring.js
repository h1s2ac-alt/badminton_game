import { SCORING } from '../utils/constants.js';

export class ScoreTracker {
  constructor() {
    this.resetMatch();
  }

  resetMatch() {
    this.playerGames = 0;
    this.opponentGames = 0;
    this.currentGameNumber = 1;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.server = 'player'; // 'player' or 'opponent'
    this.matchWinner = null; // null, 'player', or 'opponent'
  }

  resetGame() {
    this.playerScore = 0;
    this.opponentScore = 0;
  }

  /**
   * Record a point for winner ('player' or 'opponent')
   * Returns event object describing state changes.
   */
  addPoint(winner) {
    if (this.matchWinner) return { type: 'MATCH_ALREADY_OVER' };

    if (winner === 'player') {
      this.playerScore++;
    } else {
      this.opponentScore++;
    }

    this.server = winner; // Winner serves next

    // Check game win condition (first to 7, must win by at least 2 or hard cap at 11)
    const pScore = this.playerScore;
    const oScore = this.opponentScore;

    let gameWonBy = null;
    if ((pScore >= SCORING.POINTS_TO_WIN && pScore - oScore >= 2) || pScore >= 11) {
      gameWonBy = 'player';
    } else if ((oScore >= SCORING.POINTS_TO_WIN && oScore - pScore >= 2) || oScore >= 11) {
      gameWonBy = 'opponent';
    }

    if (gameWonBy) {
      if (gameWonBy === 'player') this.playerGames++;
      else this.opponentGames++;

      // Check match win condition
      if (this.playerGames >= SCORING.GAMES_TO_WIN) {
        this.matchWinner = 'player';
        return { type: 'MATCH_WON', winner: 'player' };
      } else if (this.opponentGames >= SCORING.GAMES_TO_WIN) {
        this.matchWinner = 'opponent';
        return { type: 'MATCH_WON', winner: 'opponent' };
      } else {
        this.currentGameNumber++;
        this.resetGame();
        return { type: 'GAME_WON', winner: gameWonBy };
      }
    }

    return { type: 'POINT_SCORED', winner };
  }

  getServeCourtSide() {
    const serverScore = this.server === 'player' ? this.playerScore : this.opponentScore;
    return serverScore % 2 === 0 ? 'right' : 'left';
  }
}
