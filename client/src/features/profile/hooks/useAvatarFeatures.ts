import { useMemo, useState } from 'react';

import { makeAvatarSvg } from '../services/avatar.service';
import type { AvatarCatalog, DynamicFeatures, FeatureMeta } from '../types/avatar.types';

export function useAvatarFeatures(
  catalog: AvatarCatalog,
  initialFeatures: DynamicFeatures
) {
  const [features, setFeatures] = useState<DynamicFeatures>(initialFeatures);

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
    const colorProp = meta.colorProp;
    const typeProp = meta.typeProp;
    const probProp = meta.probProp;
  
    if (!colorProp) return;
  
    setFeatures((prev) => {
      const isGradient =
        typeProp &&
        (prev[typeProp] as string[])?.[0] === 'gradientLinear';
  
      if (isGradient) {
        const current = (prev[colorProp] as string[]) ?? [];
  
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
          [colorProp]: next,
        };
      }
  
      return {
        ...prev,
        [colorProp]: [colorValue],
        ...(probProp
          ? { [probProp]: 100 }
          : {}),
      };
    });
  };

  const handleSelectType = (
    meta: FeatureMeta,
    typeValue: string
  ) => {
    const typeProp = meta.typeProp;
  
    if (!typeProp) return;
  
    setFeatures((prev) => ({
      ...prev,
      [typeProp]: [typeValue],
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