import type { MappedOptionGroup, PersonalisationSelection } from '../aonik/map';

import type { ProjectedExtraLine } from './convergence';

export interface DemoCartLine {
  lineId: string;
  dishId: string;
  slug: string;
  title: string;
  imageUrl: string;
  quantity: number;
  personalisation?: PersonalisationSelection;
  surchargePence: number | undefined;
}

export interface DemoCartState {
  boxSize: number | null;
  isCustom: boolean;
  lines: DemoCartLine[];
  extras: ProjectedExtraLine[];
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function money(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Decodes canonical selections and the fixed four-field selection shipped in demo v1. */
function selection(value: unknown): PersonalisationSelection | undefined {
  const source = record(value);
  if (!source) return undefined;

  if ('heatStep' in source) {
    const legacy: PersonalisationSelection = {};
    const portion = text(source.portion);
    const protein = text(source.protein);
    const side = text(source.side);
    const heat =
      typeof source.heatStep === 'number' && Number.isFinite(source.heatStep)
        ? String(source.heatStep)
        : undefined;
    if (portion) legacy.portion = portion;
    if (protein) legacy.protein = protein;
    if (side) legacy.side = side;
    if (heat) legacy.heat = heat;
    return legacy;
  }

  const canonical: PersonalisationSelection = {};
  for (const [key, choice] of Object.entries(source)) {
    if (typeof choice === 'string') canonical[key] = choice;
    else if (Array.isArray(choice) && choice.every((item) => typeof item === 'string')) {
      canonical[key] = [...choice] as string[];
    } else {
      return undefined;
    }
  }
  return canonical;
}

function line(value: unknown): DemoCartLine | null {
  const source = record(value);
  if (!source) return null;
  const lineId = text(source.lineId);
  const dishId = text(source.dishId);
  const slug = text(source.slug);
  const title = text(source.title);
  const imageUrl = text(source.imageUrl);
  const quantity = positiveInteger(source.quantity);
  if (!lineId || !dishId || !slug || !title || !imageUrl || !quantity) return null;

  return {
    lineId,
    dishId,
    slug,
    title,
    imageUrl,
    quantity,
    personalisation: selection(source.personalisation),
    surchargePence: money(source.surchargePence),
  };
}

function extra(value: unknown, index: number): ProjectedExtraLine | null {
  const source = record(value);
  if (!source) return null;
  const variantId = text(source.variantId) ?? text(source.extraId);
  const quantity = positiveInteger(source.quantity);
  if (!variantId || !quantity) return null;

  return {
    lineId: text(source.lineId) ?? `${variantId}-${index + 1}`,
    variantId,
    quantity,
    personalisation: selection(source.personalisation),
    unitPricePence: money(source.unitPricePence),
    legacyOptionKey: text(source.legacyOptionKey) ?? text(source.optionKey),
  };
}

/** Small, demo-only boundary decoder. Invalid records are ignored, never cast. */
export function decodeDemoCart(value: unknown): DemoCartState | null {
  const source = record(value);
  if (!source || !Array.isArray(source.lines)) return null;

  const boxSize = source.boxSize === null ? null : positiveInteger(source.boxSize);
  if (boxSize === undefined) return null;

  const extras = Array.isArray(source.extras)
    ? source.extras.flatMap((value, index) => {
        const decoded = extra(value, index);
        return decoded ? [decoded] : [];
      })
    : [];

  return {
    boxSize,
    isCustom: source.isCustom === true,
    lines: source.lines.flatMap((value) => {
      const decoded = line(value);
      return decoded ? [decoded] : [];
    }),
    extras,
  };
}

/** Resolves the one lossy field from demo v1 against the authored catalogue. */
export function extraLinePersonalisation(
  line: ProjectedExtraLine,
  groups: MappedOptionGroup[],
): PersonalisationSelection | undefined {
  if (line.personalisation !== undefined) return line.personalisation;
  if (!line.legacyOptionKey || groups.length !== 1) return undefined;
  const [group] = groups;
  if (!group.choices.some((choice) => choice.key === line.legacyOptionKey)) return undefined;
  return {
    [group.key]: group.selectionMode === 'Multi' ? [line.legacyOptionKey] : line.legacyOptionKey,
  };
}
