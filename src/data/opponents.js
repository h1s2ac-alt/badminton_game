/**
 * opponents.js — Pre-built opponent roster
 *
 * Defines opponent characters with profile bindings and display info.
 */

export const OPPONENTS = [
  {
    id: 'lin_chen',
    name: 'Lin Chen',
    profileId: 'THE_WALL',
    tagline: '"Patience wins."',
    bio: 'A veteran defender who has outlasted dozens of rivals through sheer consistency. Never spectacular, always solid.',
    ranking: 12,
    wins: 108,
    losses: 34,
  },
  {
    id: 'marcus_bolt',
    name: 'Marcus Bolt',
    profileId: 'THUNDER',
    tagline: '"I don\'t rally — I finish."',
    bio: 'A power hitter who overwhelms opponents early. If you survive the first game, his stamina starts to crack.',
    ranking: 5,
    wins: 143,
    losses: 61,
  },
  {
    id: 'yuki_tanaka',
    name: 'Yuki Tanaka',
    profileId: 'THE_FOX',
    tagline: '"I knew what you\'d do before you did."',
    bio: 'A deceptive tactician who studies opponents relentlessly. Vary your shots or face a humbling defeat.',
    ranking: 2,
    wins: 189,
    losses: 42,
  },
];

/**
 * Get an opponent by ID.
 * @param {string} id
 * @returns {object}
 */
export function getOpponent(id) {
  const opp = OPPONENTS.find(o => o.id === id);
  if (!opp) throw new Error(`Unknown opponent: ${id}`);
  return opp;
}
