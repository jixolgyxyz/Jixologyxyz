import { useEffect, useMemo, useState } from 'react';

import { fetchUserActiveAvatar, makeAvatarSvg } from '../services/avatar.service';
import { useAvatarCatalog } from './useAvatarCatalog';
import type { DynamicFeatures } from '../types/avatar.types';

/**
 * Loads the active avatar for a given user from the DB and returns a ready SVG string.
 * Detects which style the saved avatar belongs to and renders with the correct DiceBear collection.
 */
export function useUserAvatarSvg(userId: number) {
  const { catalog, allElements, atributos, styles, loading: loadingCatalog } = useAvatarCatalog();
  const [features,   setFeatures]   = useState<DynamicFeatures | null>(null);
  const [styleName,  setStyleName]  = useState<string>('pixelArt');
  const [fetched,    setFetched]    = useState(false);

  useEffect(() => {
    if (!catalog || allElements.length === 0 || atributos.length === 0) return;

    fetchUserActiveAvatar(userId, allElements, atributos)
      .then(result => {
        if (result) {
          const name = styles.find(s => s.id === result.styleId)?.nombre ?? 'pixelArt';
          setFeatures(result.features);
          setStyleName(name);
        } else {
          setFeatures(catalog.defaultFeatures);
          setStyleName(catalog.styleName);
        }
      })
      .catch(() => {
        setFeatures(catalog.defaultFeatures);
        setStyleName(catalog.styleName);
      })
      .finally(() => setFetched(true));
  }, [userId, catalog, allElements, atributos, styles]);

  const avatarSvg = useMemo(
    () => (features ? makeAvatarSvg(features, styleName) : ''),
    [features, styleName],
  );

  const loading = loadingCatalog || !fetched;

  return { avatarSvg, loading };
}
