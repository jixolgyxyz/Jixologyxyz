import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GiftIcon, SparklesIcon, TrophyIcon, XCircleIcon } from '@heroicons/react/24/outline';

import { makeAvatarSvg } from '../../services/avatar.service';
import type { AtributoAvatar, DynamicFeatures, ElementoInventarioAvatar } from '../../types/avatar.types';
import './AvatarLootBox.css';

interface Props {
  unownedItems: ElementoInventarioAvatar[];
  atributos:    AtributoAvatar[];
  baseFeatures: DynamicFeatures;
  onOpen:       (item: ElementoInventarioAvatar) => Promise<void>;
  onClose?:     () => void;
  disabled?:    boolean;
}

// ── Layout & animation constants ──────────────────────────────────────────────
const TILE_W    = 84;
const TILE_H    = 96;
const VISIBLE   = 7;
const WIN_IDX   = 40;
const IDLE_IDX  = Math.floor(VISIBLE / 2); // 3

const MAX_SCALE = 1.40;
const MIN_SCALE = 0.70;
const MIN_OPAC  = 0.40;
const FADE_DIST = 3.0;    // tiles until min scale/opacity
const GAP_PX    = 10;     // constant visual gap between tile EDGES (not centers)

// Scale and opacity as a function of absolute distance from center
function getScale(abs: number): number {
  return Math.max(MIN_SCALE, MAX_SCALE - (MAX_SCALE - MIN_SCALE) * Math.min(abs / FADE_DIST, 1));
}
function getOpacity(abs: number): number {
  return Math.max(MIN_OPAC, 1 - (1 - MIN_OPAC) * Math.min(abs / FADE_DIST, 1));
}

// X-offset from carousel centre that keeps a constant GAP_PX between every
// pair of adjacent tile EDGES, regardless of their individual scales.
// For fractional dist (mid-animation) we interpolate into the next integer step.
function computeOffset(dist: number): number {
  if (dist === 0) return 0;
  const sign    = dist < 0 ? -1 : 1;
  const abs     = Math.abs(dist);
  const intPart = Math.floor(abs);
  const frac    = abs - intPart;

  let offset = 0;
  for (let d = 0; d < intPart; d++) {
    offset += TILE_W * getScale(d) / 2 + GAP_PX + TILE_W * getScale(d + 1) / 2;
  }
  if (frac > 0) {
    const step = TILE_W * getScale(intPart) / 2 + GAP_PX + TILE_W * getScale(intPart + 1) / 2;
    offset += frac * step;
  }
  return sign * offset;
}

// Half the carousel width needed to show tiles out to FADE_DIST
const CAROUSEL_RADIUS = (() => {
  let r = 0;
  for (let d = 0; d < Math.floor(FADE_DIST); d++) {
    r += TILE_W * getScale(d) / 2 + GAP_PX + TILE_W * getScale(d + 1) / 2;
  }
  return r + TILE_W * getScale(Math.floor(FADE_DIST)) / 2 + GAP_PX;
})();

// ── Per-tile inline style ─────────────────────────────────────────────────────
function tileStyle(dist: number): React.CSSProperties {
  const abs     = Math.abs(dist);
  const scale   = getScale(abs);
  const opacity = getOpacity(abs);
  const offsetX = computeOffset(dist);

  return {
    position:      'absolute',
    left:          '50%',
    top:           '50%',
    width:         TILE_W,
    height:        TILE_H,
    transform:     `translateX(calc(${offsetX}px - 50%)) translateY(-50%) scale(${scale})`,
    opacity,
    zIndex:        Math.round(100 - abs * 10),
    pointerEvents: 'none',
  };
}

// ── Easing ────────────────────────────────────────────────────────────────────
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 4);

// ── Strip builder ─────────────────────────────────────────────────────────────
function buildStrip(
  items:  ElementoInventarioAvatar[],
  winner: ElementoInventarioAvatar,
): ElementoInventarioAvatar[] {
  const pool   = [...items].sort(() => Math.random() - 0.5);
  const before = Array.from({ length: WIN_IDX }, (_, i) => pool[i % pool.length]);
  const after  = Array.from({ length: 5       }, (_, i) => pool[(i + 1) % pool.length]);
  return [...before, winner, ...after];
}

// ── Component ─────────────────────────────────────────────────────────────────
const AvatarLootBox: React.FC<Props> = ({
  unownedItems,
  atributos,
  baseFeatures,
  onOpen,
  onClose,
  disabled,
}) => {
  const [phase,        setPhase]        = useState<'idle' | 'spinning' | 'done'>('idle');
  const [winner,       setWinner]       = useState<ElementoInventarioAvatar | null>(null);
  const [strip,        setStrip]        = useState<{ elem: ElementoInventarioAvatar; svg: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(IDLE_IDX);

  const rafRef       = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // Cleanup rAF on unmount
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const attrById = useMemo(
    () => new Map(atributos.map(a => [a.id, a])),
    [atributos],
  );

  const elemToSvg = useCallback(
    (elem: ElementoInventarioAvatar): string => {
      const attr = attrById.get(elem.id_atributo_avatar);
      if (!attr) return makeAvatarSvg(baseFeatures);
      return makeAvatarSvg({ ...baseFeatures, [attr.nombre]: [elem.nombre] });
    },
    [attrById, baseFeatures],
  );

  // ── Open ──────────────────────────────────────────────────────────────────
  const handleOpen = useCallback(async () => {
    if (phase !== 'idle' || unownedItems.length === 0) return;

    setPhase('spinning');
    setWinner(null);

    const randomIndex = Math.floor(Math.random() * unownedItems.length);
    const wonItem = unownedItems[randomIndex];
    await onOpen(wonItem);
    if (!wonItem) {
      setPhase('idle');
      return;
    }

    const items = buildStrip(unownedItems, wonItem);
    setStrip(items.map(elem => ({ elem, svg: elemToSvg(elem) })));
    setWinner(wonItem);

    // Animate currentIndex from IDLE_IDX → WIN_IDX using rAF
    const startIdx = IDLE_IDX;
    const duration = 4000;
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t       = Math.min(elapsed / duration, 1);
      setCurrentIndex(startIdx + (WIN_IDX - startIdx) * easeOut(t));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCurrentIndex(WIN_IDX);
        setPhase('done');
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [phase, unownedItems, onOpen, elemToSvg]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('idle');
    setWinner(null);
    setStrip([]);
    setCurrentIndex(IDLE_IDX);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const viewportWidth = Math.ceil(CAROUSEL_RADIUS * 2);
  const allOwned      = unownedItems.length === 0;

  // Only render tiles close enough to be visible
  const renderItems: { i: number; dist: number; item: { elem: ElementoInventarioAvatar; svg: string } | null }[] =
    strip.length > 0
      ? strip
          .map((item, i) => ({ i, dist: i - currentIndex, item }))
          .filter(({ dist }) => Math.abs(dist) <= FADE_DIST + 0.5)
      : Array.from({ length: VISIBLE }, (_, i) => ({
          i,
          dist: i - currentIndex,
          item: null,
        }));

  return (
    <div className="lootbox">

      {/* ── Header: title + close ── */}
      <div className="lootbox__header">
        <h2 className="lootbox__title">Lootbox</h2>
        {onClose && (
          <button className="lootbox__close" onClick={onClose} aria-label="Cerrar">
            <XCircleIcon />
          </button>
        )}
      </div>

      {/* ── Roulette carousel ── */}
      <div className="lootbox__viewport" style={{ width: viewportWidth }}>
        <div className="lootbox__center-indicator" />

        <div className="lootbox__carousel">
          {renderItems.map(({ i, dist, item }) => (
            <div
              key={i}
              className={`lootbox__tile${
                !item                              ? ' lootbox__tile--placeholder' : ''
              }${
                phase === 'done' && i === WIN_IDX  ? ' lootbox__tile--winner'      : ''
              }`}
              style={tileStyle(dist)}
            >
              {item ? (
                <>
                  <div
                    className="lootbox__tile-avatar"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                  <span className="lootbox__tile-label">{item.elem.nombre_es ?? item.elem.nombre}</span>
                </>
              ) : (
                <div className="lootbox__tile-avatar" />
              )}
            </div>
          ))}
        </div>

        <div className="lootbox__fade lootbox__fade--left"  />
        <div className="lootbox__fade lootbox__fade--right" />
      </div>

      {/* ── Winner name (shown below roulette after spin) ── */}
      <p className={`lootbox__winner-name${phase === 'done' && winner ? ' lootbox__winner-name--visible' : ''}`}>
        {phase === 'done' && winner ? (winner.nombre_es ?? winner.nombre) : '\u00A0'}
      </p>

      {/* ── Button ── */}
      {phase === 'done' ? (
        <button className="lootbox__btn lootbox__btn--secondary" onClick={handleReset}>
          Abrir otra vez
        </button>
      ) : (
        <button
          className="lootbox__btn"
          onClick={handleOpen}
          disabled={disabled || phase === 'spinning' || allOwned}
        >
          {allOwned
            ? <><TrophyIcon   className="lootbox__btn-icon" /> Inventario completo</>
            : phase === 'spinning'
            ? <><SparklesIcon className="lootbox__btn-icon lootbox__btn-icon--spin" /> Abriendo…</>
            : <><GiftIcon     className="lootbox__btn-icon" /> Abrir</>}
        </button>
      )}
    </div>
  );
};

export default AvatarLootBox;
