import { artPath } from '@/api/client';
import type { CatalogModel, Change, Colour, Dressing, DressingOption, Finish, Piece, Room } from '@/api/types';

import { formatEGP } from './format';
import { finishArea } from './rooms';

/** A change the user has picked but not rendered yet. */
export interface QueuedChange {
  /** One queued change per target: picking again for the same target replaces it. */
  target: string;
  /** Hotspot id in the room, so its dot can show as queued. */
  hotspotId: string;
  room: number;
  change: Change;
  /** "Sofa → Kivik sofa" */
  title: string;
  detail?: string;
  /** Price difference in EGP, when known. Always an estimate. */
  delta?: number;
  swatch?: string;
  /** Server path of a picture of the choice. */
  thumb?: string | null;
  /** Labels kept so later picks for the same target can merge. */
  meta?: Record<string, string>;
}

export const target = {
  model: (room: number, asset: string) => `${room}:${asset}:model`,
  colour: (room: number, asset: string) => `${room}:${asset}:colour`,
  dressing: (room: number, piece: string) => `${room}:dressing:${piece}`,
  finish: (room: number, surface: 'floor' | 'wall') => `${room}:${surface}`,
};

export const hotspotFor = {
  furniture: (asset: string) => `furniture:${asset}`,
  dressing: (piece: string) => `dressing:${piece}`,
  finish: (surface: 'floor' | 'wall') => surface,
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Replace every piece in the group with another model. */
export function swapChange(room: Room, pieces: Piece[], model: CatalogModel): QueuedChange {
  const asset = pieces[0].asset;
  return {
    target: target.model(room.index, asset),
    hotspotId: hotspotFor.furniture(asset),
    room: room.index,
    change: { kind: 'swap', items: pieces.map((p) => p.key), model: model.id },
    title: `${pieces[0].name} → ${model.name}`,
    detail: pieces.length > 1 ? `All ${plural(pieces.length, 'piece')} · ${formatEGP(model.price)} each` : formatEGP(model.price),
    delta: (model.price - pieces[0].price) * pieces.length,
    thumb: model.thumb,
  };
}

/** Recolour every piece in the group. */
export function colourChange(room: Room, pieces: Piece[], colour: Colour): QueuedChange {
  const asset = pieces[0].asset;
  return {
    target: target.colour(room.index, asset),
    hotspotId: hotspotFor.furniture(asset),
    room: room.index,
    change: { kind: 'colour', items: pieces.map((p) => p.key), colour: colour.hex, name: colour.name },
    title: `${pieces[0].name} in ${colour.name}`,
    detail: pieces.length > 1 ? `All ${plural(pieces.length, 'piece')}` : undefined,
    swatch: colour.hex,
  };
}

/**
 * A different print and/or frame for a picture. Picking a print and then a
 * frame for the same picture merges into one change.
 */
export function artChange(
  room: Room,
  d: Dressing,
  pick: { art?: DressingOption; frame?: { id: string; label: string } },
  queued?: QueuedChange,
): QueuedChange {
  const prev = queued?.change.kind === 'dressing' ? queued.change.choice : {};
  const art = pick.art?.id ?? prev.art;
  const frame = pick.frame?.id ?? prev.frame;
  const printLabel = pick.art?.label ?? queued?.meta?.printLabel;
  const frameLabel = pick.frame?.label ?? queued?.meta?.frameLabel;
  return {
    target: target.dressing(room.index, d.name),
    hotspotId: hotspotFor.dressing(d.name),
    room: room.index,
    change: { kind: 'dressing', room: room.index, piece: d.name, choice: { ...(art ? { art } : {}), ...(frame ? { frame } : {}) } },
    title: [printLabel ? `${d.label} → ${printLabel}` : d.label, frameLabel ? `${frameLabel} frame` : undefined].filter(Boolean).join(' · '),
    thumb: pick.art ? (pick.art.thumb ?? artPath(pick.art.id)) : queued?.thumb,
    meta: { ...(printLabel ? { printLabel } : {}), ...(frameLabel ? { frameLabel } : {}) },
  };
}

/** A different lamp, plant or rug in a styling slot. */
export function dressingModelChange(room: Room, d: Dressing, option: DressingOption): QueuedChange {
  return {
    target: target.dressing(room.index, d.name),
    hotspotId: hotspotFor.dressing(d.name),
    room: room.index,
    change: { kind: 'dressing', room: room.index, piece: d.name, choice: { model: option.id } },
    title: `${d.label} → ${option.label}`,
    detail: option.price != null ? formatEGP(option.price) : undefined,
    thumb: option.thumb,
  };
}

/** A new floor or wall finish for one room. Cost is the finish rate times an estimated area. */
export function finishChange(room: Room, surface: 'floor' | 'wall', finish: Finish): QueuedChange {
  const area = finishArea(room, surface);
  return {
    target: target.finish(room.index, surface),
    hotspotId: hotspotFor.finish(surface),
    room: room.index,
    change: { kind: 'finish', room: room.index, target: surface, finish: finish.id },
    title: `${surface === 'floor' ? 'Floor' : 'Walls'} → ${finish.label}`,
    detail: finish.rate ? `${formatEGP(finish.rate)}/m² · ≈ ${formatEGP(finish.rate * area)} for ${Math.round(area)} m²` : undefined,
    swatch: finish.hex,
  };
}
