/**
 * Maps one pane's scroll position onto another's, given matched anchor points.
 *
 * Piecewise-linear interpolation makes the follower's *speed* jump at every
 * anchor (the slope changes abruptly), which reads as jerk. This uses monotone
 * cubic interpolation (Fritsch–Carlson): C1-continuous, so speed changes
 * gradually, and monotone, so the follower never backs up or overshoots.
 * No DOM, no React.
 */

/** `[sourceScrollTop, targetScrollTop]`, strictly increasing on both axes. */
export type ScrollAnchor = [number, number];

export interface ScrollMapper {
  forward: (value: number) => number;
  backward: (value: number) => number;
}

/** Average of the neighbouring secants, flattened at local extrema. */
function initialSlopes(secants: number[]): number[] {
  const slopes = [secants[0]];
  for (let i = 1; i < secants.length; i += 1) {
    const before = secants[i - 1];
    const after = secants[i];
    slopes.push(before * after <= 0 ? 0 : (before + after) / 2);
  }
  slopes.push(secants[secants.length - 1]);
  return slopes;
}

/** Fritsch–Carlson: clamp the slopes so no segment can overshoot. */
function limitSlopes(slopes: number[], secants: number[]): void {
  for (let i = 0; i < secants.length; i += 1) {
    const secant = secants[i];
    if (secant === 0) {
      slopes[i] = 0;
      slopes[i + 1] = 0;
      continue;
    }
    const alpha = slopes[i] / secant;
    const beta = slopes[i + 1] / secant;
    const scale = Math.hypot(alpha, beta);
    if (scale > 3) {
      slopes[i] = (3 / scale) * alpha * secant;
      slopes[i + 1] = (3 / scale) * beta * secant;
    }
  }
}

/** Slopes that keep a cubic through these points monotone. */
function monotoneSlopes(xs: number[], ys: number[]): number[] {
  const secants: number[] = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    secants.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }

  const slopes = initialSlopes(secants);
  limitSlopes(slopes, secants);
  return slopes;
}

function evaluate(
  xs: number[],
  ys: number[],
  slopes: number[],
  value: number,
): number {
  if (value <= xs[0]) return ys[0];
  const last = xs.length - 1;
  if (value >= xs[last]) return ys[last];

  let index = 0;
  while (index < last && value > xs[index + 1]) index += 1;

  const span = xs[index + 1] - xs[index];
  const t = (value - xs[index]) / span;
  const t2 = t * t;
  const t3 = t2 * t;

  // Hermite basis
  return (
    (2 * t3 - 3 * t2 + 1) * ys[index] +
    (t3 - 2 * t2 + t) * span * slopes[index] +
    (-2 * t3 + 3 * t2) * ys[index + 1] +
    (t3 - t2) * span * slopes[index + 1]
  );
}

function linear(xs: number[], ys: number[], value: number): number {
  if (value <= xs[0]) return ys[0];
  const last = xs.length - 1;
  if (value >= xs[last]) return ys[last];
  let index = 0;
  while (index < last && value > xs[index + 1]) index += 1;
  const ratio = (value - xs[index]) / (xs[index + 1] - xs[index]);
  return ys[index] + ratio * (ys[index + 1] - ys[index]);
}

export function createScrollMapper(anchors: ScrollAnchor[]): ScrollMapper {
  const xs = anchors.map(([source]) => source);
  const ys = anchors.map(([, target]) => target);

  // Two points is a straight line; a cubic needs three to be worth building.
  if (anchors.length < 3) {
    return {
      forward: (value) => linear(xs, ys, value),
      backward: (value) => linear(ys, xs, value),
    };
  }

  const forwardSlopes = monotoneSlopes(xs, ys);
  const backwardSlopes = monotoneSlopes(ys, xs);

  return {
    forward: (value) => evaluate(xs, ys, forwardSlopes, value),
    backward: (value) => evaluate(ys, xs, backwardSlopes, value),
  };
}
