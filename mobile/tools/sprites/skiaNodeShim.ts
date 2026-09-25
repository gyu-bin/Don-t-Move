/**
 * Node stand-in for '@shopify/react-native-skia' (mapped via tools/sprites/tsconfig.runtime.json).
 * Exposes the same `Skia` API backed by CanvasKit so game drawing code can run
 * headless in tooling. Call `initSkiaNode()` before touching `Skia`.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const types = require('@shopify/react-native-skia/lib/commonjs/skia/types/index.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const web = require('@shopify/react-native-skia/lib/commonjs/skia/web/index.js');

module.exports = { ...types };
let api: unknown = null;
Object.defineProperty(module.exports, 'Skia', {
  get() {
    if (!api) {
      const ck = (globalThis as { CanvasKit?: unknown }).CanvasKit;
      if (!ck) throw new Error('initSkiaNode() must run before using Skia');
      api = web.JsiSkApi(ck);
    }
    return api;
  },
});
