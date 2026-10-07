import { DEFAULT_TILT, response } from './tilt';

/** Drag distance, in screen points, that is full speed. */
export const STICK_RADIUS = 56;
/** Share of the radius around the touch-down point that is "not moving". */
export const STICK_DEAD = 0.14;

export interface StickState {
  /** Finger is down. */
  on: boolean;
  /** Where the finger went down (screen points). */
  ox: number; oy: number;
  /** Knob offset from there, limited to the radius: what is drawn. */
  kx: number; ky: number;
  /** Movement input, same unit as the tilt controller output: direction × share of top speed. */
  x: number; y: number;
}
export const STICK_IDLE: StickState = { on: false, ox: 0, oy: 0, kx: 0, ky: 0, x: 0, y: 0 };

/**
 * Drag vector → movement input. The thumb gives direction and speed continuously, on the same speed curve as the
 * tilt (short drag sneaks, half walks, full radius runs), and feeds the same movement step. Letting go is zero.
 */
export function stickVector(dx: number, dy: number, radius = STICK_RADIUS): { x: number; y: number; kx: number; ky: number } {
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance <= 0 || !(radius > 0)) return { x: 0, y: 0, kx: 0, ky: 0 };
  const reach = Math.min(1, distance / radius);
  const kx = dx / distance * reach * radius, ky = dy / distance * reach * radius;
  if (reach <= STICK_DEAD) return { x: 0, y: 0, kx, ky };
  const speed = response((reach - STICK_DEAD) / (1 - STICK_DEAD), DEFAULT_TILT);
  return { x: dx / distance * speed, y: dy / distance * speed, kx, ky };
}

export function stickDown(x: number, y: number): StickState {
  return { ...STICK_IDLE, on: true, ox: x, oy: y };
}
/** A move without a touch-down (the finger landed on something else first) is ignored. */
export function stickMove(state: StickState, x: number, y: number): StickState {
  if (!state.on) return state;
  return { ...state, ...stickVector(x - state.ox, y - state.oy) };
}
