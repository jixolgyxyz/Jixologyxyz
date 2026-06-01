import { useEffect, useState } from 'react';
import { fetchCatalog } from '../services/avatar.service';
import type { AvatarCatalog, AvatarStyle, AtributoAvatar, ElementoInventarioAvatar } from '../types/avatar.types';

export function useAvatarCatalog(styleId = 1) {
  const [catalog,       setCatalog]       = useState<AvatarCatalog | null>(null);
  const [allElements,   setAllElements]   = useState<ElementoInventarioAvatar[]>([]);
  const [atributos,     setAtributos]     = useState<AtributoAvatar[]>([]);
  const [styles,        setStyles]        = useState<AvatarStyle[]>([]);
  const [loadedStyleId, setLoadedStyleId] = useState<number | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchCatalog(styleId)
      .then(({ catalog, allElements, atributos, styles }) => {
        if (cancelled) return;
        setCatalog(catalog);
        setAllElements(allElements);
        setAtributos(atributos);
        setStyles(styles);
        setError(null);
        setLoadedStyleId(styleId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoadedStyleId(styleId);
      });

    return () => { cancelled = true; };
  }, [styleId]);

  // Derived — true while the requested style hasn't finished loading.
  // Avoids a synchronous setLoading(true) inside the effect (lint rule
  // react-hooks/set-state-in-effect).
  const loading = loadedStyleId !== styleId;

  return { catalog, allElements, atributos, styles, loading, error };
}
