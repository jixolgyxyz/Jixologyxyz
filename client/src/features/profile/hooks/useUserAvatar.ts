import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchUserInventory,
  fetchUserActiveAvatar,
  saveUserActiveAvatar,
  filterCatalogByInventory,
  addElementToInventory,
} from '../services/avatar.service';
import type {
  AvatarCatalog,
  AtributoAvatar,
  DynamicFeatures,
  ElementoInventarioAvatar,
} from '../types/avatar.types';

interface UseUserAvatarResult {
  filteredCatalog:  AvatarCatalog | null;
  initialFeatures:  DynamicFeatures;
  saveAvatar:       (features: DynamicFeatures) => Promise<void>;
  addRandomItem:    (item: ElementoInventarioAvatar) => Promise<void>;
  unownedItems:     ElementoInventarioAvatar[];
  saving:           boolean;
  loadingAvatar:    boolean;
  addingItem:       boolean;
}

export function useUserAvatar(
  userId:      number,
  catalog:     AvatarCatalog | null,
  allElements: ElementoInventarioAvatar[],
  atributos:   AtributoAvatar[],
): UseUserAvatarResult {
  const [filteredCatalog, setFilteredCatalog] = useState<AvatarCatalog | null>(null);
  const [initialFeatures, setInitialFeatures] = useState<DynamicFeatures>({});
  const [ownedIds,        setOwnedIds]        = useState<Set<number>>(new Set());
  const [loadingAvatar,   setLoadingAvatar]   = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [addingItem,      setAddingItem]      = useState(false);

  useEffect(() => {
    if (!catalog || allElements.length === 0 || atributos.length === 0) return;

    setLoadingAvatar(true);

    Promise.all([
      fetchUserInventory(userId),
      fetchUserActiveAvatar(userId, allElements, atributos, catalog.styleId),
    ])
      .then(([ids, activeResult]) => {
        setOwnedIds(ids);
        const narrowed = filterCatalogByInventory(catalog, ids, allElements, atributos);
        setFilteredCatalog(narrowed);
        setInitialFeatures(activeResult?.features ?? narrowed.defaultFeatures);
      })
      .catch(console.error)
      .finally(() => setLoadingAvatar(false));
  }, [userId, catalog, allElements, atributos]);

  const saveAvatar = useCallback(async (features: DynamicFeatures) => {
    if (!filteredCatalog) return;
    setSaving(true);
    try {
      const styleAtributos = atributos.filter(a => a.id_avatar_style === filteredCatalog.styleId);
      await saveUserActiveAvatar(userId, features, allElements, styleAtributos, filteredCatalog.styleId);
    } finally {
      setSaving(false);
    }
  }, [userId, allElements, atributos, filteredCatalog]);

  const addRandomItem = useCallback(async (
    item: ElementoInventarioAvatar
  ): Promise<void> => {
  
    setAddingItem(true);
  
    try {
      await addElementToInventory(userId, item.id);
  
      const updated = new Set([...ownedIds, item.id]);
  
      setOwnedIds(updated);
  
      if (catalog) {
        const updatedCatalog = filterCatalogByInventory(
          catalog,
          updated,
          allElements,
          atributos
        );
  
        setFilteredCatalog(updatedCatalog);
      }
  
    } finally {
      setAddingItem(false);
    }
  
  }, [userId, catalog, allElements, atributos, ownedIds]);

  const unownedItems = useMemo(
    () => allElements.filter(e => !ownedIds.has(e.id)),
    [allElements, ownedIds],
  );

  return { filteredCatalog, initialFeatures, saveAvatar, addRandomItem, unownedItems, saving, loadingAvatar, addingItem };
}
