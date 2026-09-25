/**
 * Guard perception + reaction tuning. Distances are world units (1 tile = 40).
 * Suspicion is 0..1 (shown as 0..100 %).
 */
/** Core Rules V1 §33: difficulty scales only the final suspicion gain. */
export const DIFFICULTY_GAIN = { easy: 0.65, normal: 1, hard: 1.4 } as const;
export type Difficulty = keyof typeof DIFFICULTY_GAIN;

export const GUARD_TUNING = {
  // --- vision geometry
  /** Evenly spaced rays across the cone; corner rays are added on top. */
  visionRays: 33,
  /** Hard cap on fan vertices (even rays + wall/cover corner rays). */
  maxFanPoints: 160,
  /** Player body samples: centre, and ± this offset perpendicular to the line of sight. */
  playerSampleHalfWidth: 6,

  // --- suspicion gain = base × movement × distance × cone × visibility (per second)
  baseGain: 0.55,
  /** Indexed by player gait 0 Idle, 1 Sneak, 2 Walk, 3 Run (interpolated). */
  movementFactor: [0.08, 0.35, 0.8, 1.6],
  /** Inside this distance even a motionless player is noticed. */
  closeDetectionRadius: 60,
  closeMovementFloor: 0.7,
  distanceFactorNear: 1.8,
  distanceFactorFar: 0.35,
  /** Cone factor at the very edge (1 at dead centre). */
  coneFactorEdge: 0.4,

  // --- memory / decay
  memorySeconds: 0.5,
  decayPerSecond: 0.2,

  // --- reactions
  glanceThreshold: 0.25,
  stopThreshold: 0.6,
  glanceSpeedScale: 0.5,
  /** Max head-and-body turn toward the player while still walking (rad). */
  glanceMaxAngle: 0.52,
  turnRatePatrol: 3.2,
  turnRateGlance: 1.6,
  turnRateNotice: 2.4,
  turnRateAlert: 7,
  /** Whistle starts only once the guard faces the player within this angle. */
  whistleFacingTolerance: 0.12,
  whistleDuration: 0.6,
  /** Sound lands after the visible raise-to-mouth motion and before Global Alert. */
  whistleSoundAt: 0.34,
  alertLoseSightSeconds: 2.5,
  searchSeconds: 4,
  /** Suspicion level a guard keeps when it starts searching. */
  searchSuspicion: 0.6,

  // --- movement
  walkSpeed: 52,
  accel: 200,
  decel: 500,
  runSpeed: 116,
  investigateSpeed: 88,
  searchSpeed: 42,
  searchRadius: 64,
  searchPause: 0.45,
  repathSeconds: 0.4,
  repathDistance: 12,
  arrivalDistance: 2,
} as const;

/** Floor-plane body footprints, independent of sprite height and legacy units. */
export const BODY = { playerRadius: 9, guardRadius: 8, captureTolerance: 0.5 } as const;
