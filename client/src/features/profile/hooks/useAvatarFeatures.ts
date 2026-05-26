import { useEffect, useMemo, useState } from 'react';

import { makeAvatarSvg } from '../services/avatar.service';
import type { AvatarCatalog, DynamicFeatures, FeatureMeta } from '../types/avatar.types';

export function useAvatarFeatures(
  catalog: AvatarCatalog,
  initialFeatures: DynamicFeatures
) {
  const [features, setFeatures] = useState<DynamicFeatures>(initialFeatures);

  useEffect(() => {
    setFeatures(initialFeatures);
  }, [catalog, initialFeatures]);

  const mainAvatarSvg = useMemo(
    () => makeAvatarSvg(features),
    [features]
  );

  const handleSelectVariant = (
    meta: FeatureMeta,
    value: string | null
  ) => {
    setFeatures((prev) => ({
      ...prev,
      [meta.key]: value !== null ? [value] : prev[meta.key],
      ...(meta.probProp
        ? { [meta.probProp]: value === null ? 0 : 100 }
        : {}),
    }));
  };

  const handleSelectColor = (
    meta: FeatureMeta,
    colorValue: string
  ) => {
    if (!meta.colorProp) return;

    setFeatures((prev) => {
      const isGradient =
        meta.typeProp &&
        (prev[meta.typeProp] as string[])?.[0] === 'gradientLinear';

      if (isGradient) {
        const current = (prev[meta.colorProp] as string[]) ?? [];

        let next: string[];

        if (current.includes(colorValue)) {
          next = current.filter(c => c !== colorValue);

          if (next.length === 0) {
            next = [colorValue];
          }
        } else if (current.length < 2) {
          next = [...current, colorValue];
        } else {
          next = [current[1], colorValue];
        }

        return {
          ...prev,
          [meta.colorProp]: next,
        };
      }

      return {
        ...prev,
        [meta.colorProp]: [colorValue],
        ...(meta.probProp
          ? { [meta.probProp]: 100 }
          : {}),
      };
    });
  };

  const handleSelectType = (
    meta: FeatureMeta,
    typeValue: string
  ) => {
    if (!meta.typeProp) return;

    setFeatures((prev) => ({
      ...prev,
      [meta.typeProp]: [typeValue],
    }));
  };

  return {
    catalog,
    features,
    mainAvatarSvg,
    handleSelectVariant,
    handleSelectColor,
    handleSelectType,
  };
}