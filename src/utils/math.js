/**
 * General math and 3D vector helper functions
 */

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(start, end, t) {
  return start + (end - start) * clamp(t, 0, 1);
}

export function dist2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function dist3D(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Maps a gesture angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
 * to a 3D shot vector intention.
 */
export function gestureToShot(angleDeg, power) {
  // Normalize angle to 0..360
  let a = (angleDeg % 360 + 360) % 360;

  // Swipe Up (225°..315° in standard screen coords where Y is down, i.e., 270 deg)
  // Or in canvas angle: -Y is up (270 deg).
  // Swipe Down: +Y is down (90 deg).
  // Swipe Left: -X is left (180 deg).
  // Swipe Right: +X is right (0 deg).

  if (power < 0.25) {
    return { shotType: 'DROP', powerMult: 0.6 };
  }

  if (a >= 225 && a <= 315) { // Upward swipe
    return { shotType: 'CLEAR', powerMult: Math.max(0.8, power) };
  } else if (a >= 45 && a <= 135) { // Downward swipe
    return { shotType: 'SMASH', powerMult: Math.max(0.9, power) };
  } else if (a > 135 && a < 225) { // Left swipe
    return { shotType: 'DRIVE', sideBias: -1.0, powerMult: power };
  } else { // Right swipe
    return { shotType: 'DRIVE', sideBias: 1.0, powerMult: power };
  }
}
