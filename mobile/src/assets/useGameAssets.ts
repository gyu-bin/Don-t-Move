import { useEffect, useState } from 'react';
import { Skia, loadData } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

import { buildGameAssets, referencedImages } from './buildSprites';
import type { GameAssets } from './buildSprites';
import { IMAGE_SOURCES } from './manifest';
import type { AssetManifest, ImageKey } from './manifest';

/** Decodes every image the manifest references, then builds runtime sprite data. */
export function useGameAssets(manifest: AssetManifest): GameAssets | null {
  const [assets, setAssets] = useState<GameAssets | null>(null);

  useEffect(() => {
    let alive = true;
    const keys = referencedImages(manifest);
    Promise.all(
      keys.map((k) =>
        loadData<SkImage>(IMAGE_SOURCES[k], (d) => Skia.Image.MakeImageFromEncoded(d)).then(
          (img) => [k, img] as const,
        ),
      ),
    ).then((pairs) => {
      if (!alive) return;
      const images: Partial<Record<ImageKey, SkImage>> = {};
      for (const [k, img] of pairs) {
        if (img) images[k] = img;
        else console.warn(`[assets] failed to decode ${k}`);
      }
      setAssets(buildGameAssets(manifest, images));
    });
    return () => {
      alive = false;
    };
  }, [manifest]);

  return assets;
}
