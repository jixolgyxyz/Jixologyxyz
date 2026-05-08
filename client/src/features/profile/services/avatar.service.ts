import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

import type {
  AvatarCatalog,
  AvatarStyle,
  AtributoAvatar,
  ElementoInventarioAvatar,
  DynamicFeatures,
  FeatureMeta,
} from '../types/avatar.types';

const SEED = 'Juan Guarnizo';

// ── Type option display labels ────────────────────────────────────────────────
export const TYPE_LABELS: Record<string, string> = {
  solid:          'Sólido',
  gradientLinear: 'Degradado',
};

// ── Default overrides (applied when catalog default is not the desired pick) ──
const DEFAULT_VARIANT_OVERRIDES: Record<string, string> = {
  accessories: 'variant01',
  clothing:    'variant22',
  beard:       'variant01',
  eyes:        'variant03',
  glasses:     'dark01',
  hair:        'long05',
  hat:         'variant02',
  mouth:       'happy03',
};

const DEFAULT_COLOR_OVERRIDES: Record<string, string> = {
  backgroundColor: 'b6e3f4',
  skinColor:       'f5cfa0',
};

const DEFAULT_TYPE_OVERRIDES: Record<string, string> = {
  backgroundType: 'solid',
};

// ── Module-level cache — fetched once per session ─────────────────────────────
let catalogCache: AvatarCatalog | null = null;
let allElementsCache: ElementoInventarioAvatar[] | null = null;
let atributosCache: AtributoAvatar[] | null = null;

// ── Catalog builder ───────────────────────────────────────────────────────────
function buildCatalogFromData(
  styles:    AvatarStyle[],
  atributos: AtributoAvatar[],
  elementos: ElementoInventarioAvatar[],
  styleId:   number,
): AvatarCatalog {
  const style = styles.find(s => s.id === styleId);
  if (!style) throw new Error(`Avatar style ${styleId} not found`);

  const styleAttrs = atributos.filter(a => a.id_avatar_style === styleId);
  const attrByName = new Map(styleAttrs.map(a => [a.nombre, a]));

  const getElementNames = (attrNombre: string): string[] => {
    const attr = attrByName.get(attrNombre);
    if (!attr) return [];
    return elementos.filter(e => e.id_atributo_avatar === attr.id).map(e => e.nombre);
  };

  const getElementLabels = (attrNombre: string): Record<string, string> => {
    const attr = attrByName.get(attrNombre);
    if (!attr) return {};
    return Object.fromEntries(
      elementos
        .filter(e => e.id_atributo_avatar === attr.id && e.nombre_es)
        .map(e => [e.nombre, e.nombre_es!]),
    );
  };

  // Type attrs that merge into their matching Color tab
  const mergedTypeAttrs = new Set(
    styleAttrs
      .filter(a => {
        if (!a.nombre.endsWith('Type')) return false;
        const matchingColor = `${a.nombre.slice(0, -4)}Color`;
        const colorAttr = attrByName.get(matchingColor);
        if (!colorAttr) return false;
        const base = matchingColor.slice(0, -5);
        return !attrByName.has(base);
      })
      .map(a => a.nombre)
  );

  // Variant features (hair, clothing, eyes…)
  const variantAttrs = styleAttrs.filter(a =>
    !a.nombre.endsWith('Color') &&
    !a.nombre.endsWith('Probability') &&
    !mergedTypeAttrs.has(a.nombre)
  );

  const features: FeatureMeta[] = variantAttrs.map(attr => {
    const key      = attr.nombre;
    const colorProp = attrByName.has(`${key}Color`)       ? `${key}Color`       : undefined;
    const probProp  = attrByName.has(`${key}Probability`) ? `${key}Probability` : undefined;
    return {
      key,
      label:         attr.nombre_es ?? attr.nombre,
      variants:      getElementNames(key),
      variantLabels: getElementLabels(key),
      colorProp,
      colorOptions:  colorProp ? getElementNames(colorProp) : [],
      probProp,
      colorOnly:     false,
      typeProp:      undefined,
      typeOptions:   [],
    };
  });

  // Orphan color features (backgroundColor, skinColor…)
  const orphanColorAttrs = styleAttrs.filter(a =>
    a.nombre.endsWith('Color') &&
    !attrByName.has(a.nombre.slice(0, -5))
  );

  for (const colorAttr of orphanColorAttrs) {
    const key          = colorAttr.nombre;
    const typeAttrName = `${key.slice(0, -5)}Type`;
    const hasType      = mergedTypeAttrs.has(typeAttrName);
    features.push({
      key,
      label:         colorAttr.nombre_es ?? colorAttr.nombre,
      variants:      [],
      variantLabels: {},
      colorProp:     key,
      colorOptions:  getElementNames(key),
      probProp:      undefined,
      colorOnly:     true,
      typeProp:      hasType ? typeAttrName : undefined,
      typeOptions:  hasType ? getElementNames(typeAttrName) : [],
    });
  }

  // Build defaultFeatures
  const defaultFeatures: DynamicFeatures = {};
  for (const meta of features) {
    if (meta.colorOnly) {
      if (meta.colorProp && meta.colorOptions.length > 0) {
        const defaultColor = DEFAULT_COLOR_OVERRIDES[meta.colorProp] ?? meta.colorOptions[0];
        defaultFeatures[meta.colorProp] = [defaultColor];
      }
      if (meta.typeProp && meta.typeOptions.length > 0) {
        const defaultType = DEFAULT_TYPE_OVERRIDES[meta.typeProp] ?? meta.typeOptions[0];
        defaultFeatures[meta.typeProp] = [defaultType];
      }
    } else {
      const defaultVariant = DEFAULT_VARIANT_OVERRIDES[meta.key] ?? meta.variants[0];
      if (defaultVariant) defaultFeatures[meta.key] = [defaultVariant];
      if (meta.probProp)  defaultFeatures[meta.probProp] = 0;
    }
  }

  return { styleId, styleName: style.nombre, features, defaultFeatures };
}

// ── Public fetch (cached) ─────────────────────────────────────────────────────
export async function fetchCatalog(styleId = 1): Promise<{
  catalog:     AvatarCatalog;
  allElements: ElementoInventarioAvatar[];
  atributos:   AtributoAvatar[];
}> {
  if (catalogCache && allElementsCache && atributosCache) {
    return { catalog: catalogCache, allElements: allElementsCache, atributos: atributosCache };
  }

  const { supabase } = await import('../../../core/supabase/supabase.client');

  const [stylesRes, atributosRes, elementosRes] = await Promise.all([
    supabase.from('avatar_style').select('id, nombre'),
    supabase.from('atributo_avatar').select('id, nombre, nombre_es, id_avatar_style'),
    supabase.from('elemento_inventario_avatar').select('id, nombre, nombre_es, id_atributo_avatar'),
  ]);

  if (stylesRes.error || atributosRes.error || elementosRes.error) {
    throw new Error(
      stylesRes.error?.message ??
      atributosRes.error?.message ??
      elementosRes.error?.message ??
      'Failed to fetch avatar catalog'
    );
  }

  const atributos   = atributosRes.data as AtributoAvatar[];
  const allElements = elementosRes.data as ElementoInventarioAvatar[];

  catalogCache     = buildCatalogFromData(stylesRes.data as AvatarStyle[], atributos, allElements, styleId);
  allElementsCache = allElements;
  atributosCache   = atributos;

  return { catalog: catalogCache, allElements, atributos };
}

// ── User inventory ────────────────────────────────────────────────────────────
export async function addElementToInventory(userId: number, elementId: number): Promise<void> {
  const { supabase } = await import('../../../core/supabase/supabase.client');
  const { error } = await supabase
    .from('usuario_inventario_avatar')
    .insert({ id_usuario: userId, id_elemento: elementId, fecha_obtencion: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function fetchUserInventory(userId: number): Promise<Set<number>> {
  const { supabase } = await import('../../../core/supabase/supabase.client');
  const { data, error } = await supabase
    .from('usuario_inventario_avatar')
    .select('id_elemento')
    .eq('id_usuario', userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r: { id_elemento: number }) => r.id_elemento));
}

// ── Active avatar load ────────────────────────────────────────────────────────
export async function fetchUserActiveAvatar(
  userId:      number,
  allElements: ElementoInventarioAvatar[],
  atributos:   AtributoAvatar[],
): Promise<DynamicFeatures | null> {
  const { supabase } = await import('../../../core/supabase/supabase.client');
  const { data, error } = await supabase
    .from('usuario_avatar')
    .select('id_elemento')
    .eq('id_usuario', userId);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  const attrById = new Map(atributos.map(a => [a.id, a]));
  const elemById = new Map(allElements.map(e => [e.id, e]));

  // Group element names by their atributo nombre
  const grouped = new Map<string, string[]>();
  for (const row of data as { id_elemento: number }[]) {
    const elem = elemById.get(row.id_elemento);
    if (!elem) continue;
    const attr = attrById.get(elem.id_atributo_avatar);
    if (!attr) continue;
    const existing = grouped.get(attr.nombre) ?? [];
    grouped.set(attr.nombre, [...existing, elem.nombre]);
  }

  // Build DynamicFeatures — probability is inferred from presence of a variant row
  const features: DynamicFeatures = {};
  const presentVariants = new Set<string>();

  for (const [attrNombre, values] of grouped) {
    if (attrNombre.endsWith('Probability')) continue; // never stored directly
    features[attrNombre] = values;
    presentVariants.add(attrNombre);
    const probAttrName = `${attrNombre}Probability`;
    if (atributos.some(a => a.nombre === probAttrName)) {
      features[probAttrName] = 100; // stored variant → visible
    }
  }

  // Features with a probability attribute that are absent from DB must be
  // explicitly hidden (probability = 0) so DiceBear does not fall back to its
  // seed-based default and show them unexpectedly.
  for (const a of atributos) {
    if (!a.nombre.endsWith('Probability')) continue;
    const baseKey = a.nombre.slice(0, -'Probability'.length);
    if (!presentVariants.has(baseKey)) {
      features[a.nombre] = 0; // absent from DB → hidden
    }
  }

  return features;
}

// ── Active avatar save ────────────────────────────────────────────────────────
export async function saveUserActiveAvatar(
  userId:      number,
  features:    DynamicFeatures,
  allElements: ElementoInventarioAvatar[],
  atributos:   AtributoAvatar[],
): Promise<void> {
  const { supabase } = await import('../../../core/supabase/supabase.client');

  const attrByName = new Map(atributos.map(a => [a.nombre, a]));
  const elementIds: number[] = [];

  for (const [key, val] of Object.entries(features)) {
    if (key.endsWith('Probability')) continue; // inferred from presence — not stored
    const attr = attrByName.get(key);
    if (!attr) continue;

    // If this feature has a probability and it is explicitly 0, skip it — element
    // must NOT be saved so that on reload the absence is interpreted as "hidden".
    const probKey = `${key}Probability`;
    if (probKey in features && (features[probKey] as number) === 0) continue;

    const values = Array.isArray(val) ? val : [val];
    for (const v of values) {
      if (v === null || v === undefined) continue;
      const elem = allElements.find(e => e.id_atributo_avatar === attr.id && e.nombre === String(v));
      if (elem) elementIds.push(elem.id);
    }
  }

  const { error: delError } = await supabase
    .from('usuario_avatar')
    .delete()
    .eq('id_usuario', userId);
  if (delError) throw new Error(delError.message);

  if (elementIds.length === 0) return;

  const { error: insError } = await supabase
    .from('usuario_avatar')
    .insert(elementIds.map(id => ({ id_usuario: userId, id_elemento: id })));
  if (insError) throw new Error(insError.message);
}

// ── Catalog filtered to user inventory ───────────────────────────────────────
export function filterCatalogByInventory(
  catalog:     AvatarCatalog,
  ownedIds:    Set<number>,
  allElements: ElementoInventarioAvatar[],
  atributos:   AtributoAvatar[],
): AvatarCatalog {
  const attrByNombre = new Map(atributos.map(a => [a.nombre, a]));

  // Build owned element names per atributo id
  const ownedByAttrId = new Map<number, Set<string>>();
  for (const elem of allElements) {
    if (!ownedIds.has(elem.id)) continue;
    const s = ownedByAttrId.get(elem.id_atributo_avatar) ?? new Set<string>();
    s.add(elem.nombre);
    ownedByAttrId.set(elem.id_atributo_avatar, s);
  }

  const filteredFeatures = catalog.features
    .map(meta => {
      const variantAttrId   = attrByNombre.get(meta.key)?.id;
      const colorAttrId     = meta.colorProp ? attrByNombre.get(meta.colorProp)?.id : undefined;
      const ownedVariants   = variantAttrId ? (ownedByAttrId.get(variantAttrId) ?? new Set()) : new Set();
      const ownedColors     = colorAttrId   ? (ownedByAttrId.get(colorAttrId)   ?? new Set()) : new Set();
      return {
        ...meta,
        variants:     meta.variants.filter(v => ownedVariants.has(v)),
        colorOptions: meta.colorOptions.filter(c => ownedColors.has(c)),
      };
    })
    .filter(meta => meta.colorOnly ? meta.colorOptions.length > 0 : meta.variants.length > 0);

  return { ...catalog, features: filteredFeatures };
}

// ── SVG generation ────────────────────────────────────────────────────────────
export function makeAvatarSvg(features: DynamicFeatures): string {
  return createAvatar(pixelArt, { seed: SEED, ...features } as Parameters<typeof createAvatar>[1]).toString();
}

export function makeVariantTileSvg(
  base:  DynamicFeatures,
  meta:  FeatureMeta,
  value: string | null,
): string {
  const probOverride    = meta.probProp ? { [meta.probProp]: value === null ? 0 : 100 } : {};
  const variantOverride = value !== null ? { [meta.key]: [value] } : {};
  return makeAvatarSvg({ ...base, ...probOverride, ...variantOverride });
}

export function makeColorTileSvg(
  base:       DynamicFeatures,
  meta:       FeatureMeta,
  colorValue: string,
): string {
  if (!meta.colorProp) return makeAvatarSvg(base);
  const probOverride  = meta.probProp ? { [meta.probProp]: 100 } : {};
  const colorOverride = { [meta.colorProp]: [colorValue] };
  // Force solid type in tile previews so each color swatch clearly shows its
  // own colour regardless of whether the user currently has gradient selected.
  const typeOverride  = meta.typeProp ? { [meta.typeProp]: ['solid'] } : {};
  return makeAvatarSvg({ ...base, ...probOverride, ...typeOverride, ...colorOverride });
}
