// Shared colour palettes + a stable colour assigner for dashboard charts.
//
// Centralised so the same palette isn't redefined per hook, and so a label
// (status, type, project) always renders in the same colour regardless of
// sort order or how many items happen to be present.

/** Priority name → fixed colour. Priorities are a known, closed set. */
export const PRIORITY_COLORS: Record<string, string> = {
  'Crítica': '#E31837',
  'Alta':    '#f97316',
  'Media':   '#6b7280',
  'Baja':    '#3b82f6',
  'Mínima':  '#1d4ed8',
};

/** General-purpose palette for statuses. */
export const STATUS_PALETTE = [
  '#0A0838', '#3b82f6', '#10b981', '#f59e0b',
  '#E31837', '#8b5cf6', '#ec4899', '#6b7280',
];

/** Palette for item types. */
export const TYPE_PALETTE = [
  '#0A0838', '#3b82f6', '#10b981', '#f59e0b', '#E31837', '#8b5cf6', '#ec4899',
];

/** Palette for per-project series (e.g. stacked sprint hours). */
export const PROJECT_PALETTE = [
  '#3b82f6', '#f59e0b', '#E31837', '#10b981', '#8b5cf6', '#0A0838',
];

/**
 * Builds a `key → colour` map. Each key gets a colour by its position in the
 * sorted key list, so the colour is:
 *  - stable for a given key regardless of counts or sort order, and
 *  - distinct within a single render (until the palette wraps).
 * Colours only shift if the SET of keys itself changes.
 */
export function colorMap(keys: string[], palette: string[]): Map<string, string> {
  const sorted = [...new Set(keys)].sort();
  return new Map(sorted.map((k, i) => [k, palette[i % palette.length]]));
}
