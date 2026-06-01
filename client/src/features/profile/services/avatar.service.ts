import { createAvatar } from '@dicebear/core';
import { pixelArt, notionists, miniavs } from '@dicebear/collection';

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
let stylesCache:      AvatarStyle[]                  | null = null;
let allElementsCache: ElementoInventarioAvatar[]     | null = null;
let atributosCache:   AtributoAvatar[]               | null = null;
const catalogByStyle  = new Map<number, AvatarCatalog>();

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
  styles:      AvatarStyle[];
}> {
  if (!stylesCache || !allElementsCache || !atributosCache) {
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

    stylesCache      = stylesRes.data as AvatarStyle[];
    atributosCache   = atributosRes.data as AtributoAvatar[];
    allElementsCache = elementosRes.data as ElementoInventarioAvatar[];
  }

  if (!catalogByStyle.has(styleId)) {
    catalogByStyle.set(
      styleId,
      buildCatalogFromData(stylesCache, atributosCache, allElementsCache, styleId),
    );
  }

  return {
    catalog:     catalogByStyle.get(styleId)!,
    allElements: allElementsCache,
    atributos:   atributosCache,
    styles:      stylesCache,
  };
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
// styleId: pass the target style to load that style's avatar;
//          omit to read the user's persisted current style (id_avatar_style_actual).
export async function fetchUserActiveAvatar(
  userId:      number,
  allElements: ElementoInventarioAvatar[],
  atributos:   AtributoAvatar[],
  styleId?:    number,
): Promise<{ features: DynamicFeatures; styleId: number } | null> {
  const { supabase } = await import('../../../core/supabase/supabase.client');

  // Resolve target style: caller-provided OR the user's saved "current" style
  let resolvedStyleId = styleId;
  if (resolvedStyleId === undefined) {
    const { data: userRow, error: userErr } = await supabase
      .from('usuario')
      .select('id_avatar_style_actual')
      .eq('id', userId)
      .single();
    if (userErr) throw new Error(userErr.message);
    resolvedStyleId = (userRow?.id_avatar_style_actual as number | undefined) ?? 1;
  }

  const { data, error } = await supabase
    .from('usuario_avatar')
    .select('id_elemento, id_avatar_style')
    .eq('id_usuario', userId)
    .eq('id_avatar_style', resolvedStyleId);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  const attrById = new Map(atributos.map(a => [a.id, a]));
  const elemById = new Map(allElements.map(e => [e.id, e]));

  const styleAtributos = atributos.filter(a => a.id_avatar_style === resolvedStyleId);

  const grouped = new Map<string, string[]>();
  for (const row of data as { id_elemento: number; id_avatar_style: number }[]) {
    if (row.id_avatar_style !== resolvedStyleId) continue;
    const elem = elemById.get(row.id_elemento);
    if (!elem) continue;
    const attr = attrById.get(elem.id_atributo_avatar);
    if (!attr) continue;
    const existing = grouped.get(attr.nombre) ?? [];
    grouped.set(attr.nombre, [...existing, elem.nombre]);
  }

  const features: DynamicFeatures = {};
  const presentVariants = new Set<string>();

  for (const [attrNombre, values] of grouped) {
    if (attrNombre.endsWith('Probability')) continue;
    features[attrNombre] = values;
    presentVariants.add(attrNombre);
    const probAttrName = `${attrNombre}Probability`;
    if (styleAtributos.some(a => a.nombre === probAttrName)) {
      features[probAttrName] = 100;
    }
  }

  for (const a of styleAtributos) {
    if (!a.nombre.endsWith('Probability')) continue;
    const baseKey = a.nombre.slice(0, -'Probability'.length);
    if (!presentVariants.has(baseKey)) {
      features[a.nombre] = 0;
    }
  }

  return { features, styleId: resolvedStyleId };
}

// ── Active avatar save ────────────────────────────────────────────────────────
export async function saveUserActiveAvatar(
  userId:      number,
  features:    DynamicFeatures,
  allElements: ElementoInventarioAvatar[],
  atributos:   AtributoAvatar[],
  styleId:     number,
): Promise<void> {
  const { supabase } = await import('../../../core/supabase/supabase.client');

  // Filter to only this style's atributos before building the lookup map.
  // Without this, shared attribute names (e.g. 'hair', 'eyes', 'mouth') across
  // styles would be overwritten by the highest-id style (miniavs), causing
  // element lookups to silently fail and those features to go unsaved.
  const styleAtributos = atributos.filter(a => a.id_avatar_style === styleId);
  const attrByName = new Map(styleAtributos.map(a => [a.nombre, a]));
  const elementIds: number[] = [];

  for (const [key, val] of Object.entries(features)) {
    if (key.endsWith('Probability')) continue;
    const attr = attrByName.get(key);
    if (!attr) continue;

    const probKey = `${key}Probability`;
    if (probKey in features && (features[probKey] as number) === 0) continue;

    const values = Array.isArray(val) ? val : [val];
    for (const v of values) {
      if (v === null || v === undefined) continue;
      const elem = allElements.find(e => e.id_atributo_avatar === attr.id && e.nombre === String(v));
      if (elem) elementIds.push(elem.id);
    }
  }

  // Delete only this style's rows — other styles are preserved
  const { error: delError } = await supabase
    .from('usuario_avatar')
    .delete()
    .eq('id_usuario', userId)
    .eq('id_avatar_style', styleId);
  if (delError) throw new Error(delError.message);

  if (elementIds.length > 0) {
    const { error: insError } = await supabase
      .from('usuario_avatar')
      .insert(elementIds.map(id => ({ id_usuario: userId, id_elemento: id, id_avatar_style: styleId })));
    if (insError) throw new Error(insError.message);
  }

  // Mark this style as the user's current — drives what UserCard and other
  // global displays show after a save.
  const { error: updError } = await supabase
    .from('usuario')
    .update({ id_avatar_style_actual: styleId })
    .eq('id', userId);
  if (updError) throw new Error(updError.message);
}

// ── Catalog filtered to user inventory ───────────────────────────────────────
export function filterCatalogByInventory(
  catalog:     AvatarCatalog,
  ownedIds:    Set<number>,
  allElements: ElementoInventarioAvatar[],
  atributos:   AtributoAvatar[],
): AvatarCatalog {
  // Filter to this style's atributos before building the lookup map. Attribute
  // names (hair, eyes, mouth, glasses, head) are shared across styles, so a map
  // over all atributos would let the highest-id style (miniavs) win and the
  // notionist/pixelArt variants would resolve to the wrong attribute id —
  // filtering every owned variant out and dropping the tab entirely.
  const styleAtributos = atributos.filter(a => a.id_avatar_style === catalog.styleId);
  const attrByNombre = new Map(styleAtributos.map(a => [a.nombre, a]));

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

// ── Full-visible base features for lootbox carousel ──────────────────────────
// Unlike defaultFeatures (all probabilities = 0), this sets every
// probability to 100 and picks the first valid variant/color per feature,
// so carousel tiles render a complete avatar instead of a bare head.
export function makeDefaultVisibleFeatures(catalog: AvatarCatalog): DynamicFeatures {
  const features: DynamicFeatures = {};

  for (const meta of catalog.features) {
    if (meta.colorOnly) {
      if (meta.colorProp && meta.colorOptions.length > 0) {
        features[meta.colorProp] = [meta.colorOptions[0]];
      }
      if (meta.typeProp && meta.typeOptions.length > 0) {
        features[meta.typeProp] = [meta.typeOptions[0]];
      }
    } else {
      if (meta.variants.length > 0) {
        features[meta.key] = [meta.variants[0]];
      }
      if (meta.probProp) {
        features[meta.probProp] = 100;
      }
      if (meta.colorProp && meta.colorOptions.length > 0) {
        features[meta.colorProp] = [meta.colorOptions[0]];
      }
    }
  }

  return features;
}

// ── SVG generation ────────────────────────────────────────────────────────────
const STYLE_COLLECTIONS: Record<string, Parameters<typeof createAvatar>[0]> = {
  pixelArt,
  notionist:  notionists,
  miniavs,
};

// Our catalogue models some notionist attributes with names that don't match
// DiceBear's actual option keys (clothing → body, eyebrows → brows, mouth → lips,
// head → base, clothingGraphic → bodyIcon). DiceBear silently ignores unknown
// keys, which would make every tile render the same default body. Remap to the
// real option names right before generating. Keyed by style so other styles
// (pixelArt, miniavs) — whose names already match — pass through untouched.
const STYLE_KEY_ALIASES: Record<string, Record<string, string>> = {
  notionist: {
    clothing:                   'body',
    clothingGraphic:            'bodyIcon',
    clothingGraphicProbability: 'bodyIconProbability',
    eyebrows:                   'brows',
    mouth:                      'lips',
    head:                       'base',
  },
};

function applyKeyAliases(features: DynamicFeatures, styleName: string): DynamicFeatures {
  const aliases = STYLE_KEY_ALIASES[styleName];
  if (!aliases) return features;

  const remapped: DynamicFeatures = {};
  for (const [key, value] of Object.entries(features)) {
    remapped[aliases[key] ?? key] = value;
  }
  return remapped;
}

// DiceBear emits a fixed, non-seed-dependent id="viewboxMask" (and references it
// via mask="url(#viewboxMask)") in every avatar. When several avatars are inlined
// on the same page, those ids collide and the browser resolves every url(#…) to
// the FIRST matching element in document order — so one avatar gets clipped by
// another avatar's mask (e.g. miniavs' 64×64 canvas masked by pixelArt's 16×16
// rect, hiding 75% of it). Namespacing each SVG's internal ids per render makes
// every avatar reference its own definitions, eliminating the collision.
let svgIdCounter = 0;

function uniquifySvgIds(svg: string): string {
  const prefix = `av${(svgIdCounter++).toString(36)}-`;
  return svg
    // id="x" / id='x' definitions
    .replace(/(\bid=["'])/g, `$1${prefix}`)
    // url(#x) references (with or without quotes)
    .replace(/url\((["']?)#/g, `url($1#${prefix}`)
    // href="#x" / xlink:href="#x" references (only same-document anchors)
    .replace(/(\b(?:xlink:)?href=["'])#/g, `$1#${prefix}`);
}

export function makeAvatarSvg(features: DynamicFeatures, styleName = 'pixelArt'): string {
  const collection = STYLE_COLLECTIONS[styleName] ?? pixelArt;
  const mapped = applyKeyAliases(features, styleName);
  const svg = createAvatar(collection, { seed: SEED, ...mapped } as Parameters<typeof createAvatar>[1]).toString();

  return uniquifySvgIds(svg);
}

export function makeVariantTileSvg(
  base:      DynamicFeatures,
  meta:      FeatureMeta,
  value:     string | null,
  styleName = 'pixelArt',
): string {
  const probOverride    = meta.probProp ? { [meta.probProp]: value === null ? 0 : 100 } : {};
  const variantOverride = value !== null ? { [meta.key]: [value] } : {};
  return makeAvatarSvg({ ...base, ...probOverride, ...variantOverride }, styleName);
}

export function makeColorTileSvg(
  base:       DynamicFeatures,
  meta:       FeatureMeta,
  colorValue: string,
  styleName = 'pixelArt',
): string {
  if (!meta.colorProp) return makeAvatarSvg(base, styleName);
  const probOverride  = meta.probProp ? { [meta.probProp]: 100 } : {};
  const colorOverride = { [meta.colorProp]: [colorValue] };
  // Force solid type in tile previews so each color swatch clearly shows its
  // own colour regardless of whether the user currently has gradient selected.
  const typeOverride  = meta.typeProp ? { [meta.typeProp]: ['solid'] } : {};
  return makeAvatarSvg({ ...base, ...probOverride, ...typeOverride, ...colorOverride }, styleName);
}
