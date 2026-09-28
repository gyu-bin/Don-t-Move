import { useEffect, useState } from 'react';
import { Skia, loadData } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

import { buildGameAssets, referencedImages } from './buildSprites';
import type { GameAssets } from './buildSprites';
import { IMAGE_SOURCES } from './manifest';
import type { AssetManifest, ImageKey } from './manifest';
import { markStartup } from '../ui/branding/startupMetrics';

const cache = new WeakMap<AssetManifest, Promise<GameAssets>>();
const ready = new WeakMap<AssetManifest, GameAssets>();
export function preloadGameAssets(manifest: AssetManifest): Promise<GameAssets> {
  const existing = cache.get(manifest);
  if (existing) return existing;
  markStartup('sprite-preload-start');
  const promise = Promise.all(referencedImages(manifest).map(async k => {
    const start = performance.now();
    const img = await loadData<SkImage>(IMAGE_SOURCES[k], d => Skia.Image.MakeImageFromEncoded(d));
    if (!img) throw new Error(`Unable to decode game image: ${k}`);
    markStartup(`image-ready:${k}`, { duration: performance.now() - start });
    return [k, img] as const;
  })).then(pairs => {
    const images: Partial<Record<ImageKey, SkImage>> = Object.fromEntries(pairs);
    const assets = buildGameAssets(manifest, images);
    ready.set(manifest, assets);
    markStartup('sprite-preload-ready');
    return assets;
  }).catch(error => { cache.delete(manifest); throw error; });
  cache.set(manifest, promise);
  return promise;
}

/** Decodes every image the manifest references, then builds runtime sprite data. */
export function useGameAssets(manifest: AssetManifest): GameAssets | null {
  const [assets, setAssets] = useState<GameAssets | null>(() => ready.get(manifest) ?? null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    preloadGameAssets(manifest).then(value => {
      if (alive) setAssets(value);
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason : new Error(String(reason))); });
    return () => {
      alive = false;
    };
  }, [manifest]);

  if (error) throw error;
  return assets;
}
