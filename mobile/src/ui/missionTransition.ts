/** Time the finished mission stays on screen, dimming, before the result is shown. */
export const MISSION_FINISH_HOLD_MS = 250;

/**
 * The cover between two missions is black but never fully opaque.
 *
 * Measured (iOS simulator, main-thread stack sample): with a completely opaque view over the Skia canvas, the
 * canvas's draw blocks in -[CAMetalLayer nextDrawable] until its one-second timeout — the layer is fully hidden,
 * its drawables are not taken, and after three frames none is left. Every mission mounted under an opaque cover
 * froze the UI thread for one second. At 98.5 % the scene behind is not visible to the eye and the layer is still
 * composited, so drawables keep coming back.
 */
export const MISSION_COVER_OPACITY = 0.985;
