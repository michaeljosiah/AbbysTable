'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DishInfoPanels } from '@/components/dish/DishInfoPanels';
import { Button, HeatPips, NutritionTag } from '@/components/ui';
import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from '@/components/ui/glyphs';
import {
  DIETARY_TAGS,
  HEAT_STEPS,
  MEAL_TYPES,
  type BoxPricing,
  type Dish,
  type DishOption,
  type HeatingInstruction,
  type PersonalisationOptions,
} from '@/lib/aonik/types';
import {
  boxPricePence,
  cartTotals,
  useCart,
  type CartLine,
  type CartPersonalisation,
} from '@/lib/cart/CartProvider';
import { formatPrice } from '@/lib/format';

import styles from './DishPicker.module.css';

/**
 * Step 2's browsing surface: search, facets, the dish grid, and the per-dish
 * personaliser that writes lines into the cart.
 *
 * FACETS: the design template filters on a menu-section taxonomy (Mains, Soups &
 * Stews, Sides, Proteins, Swallows, Snacks) and on Vegetarian/Vegan/Protein
 * rich/Gluten-free, neither of which exists on `Dish`. The four columns keep the
 * template's shape and its exact spice and calorie chips; Category and Dietary
 * are driven by the catalogue's real `mealType` and `dietary` values rather than
 * inventing data. Because the chip set differs from `@/lib/menu/filters`, the
 * matching runs locally instead of bending the shared module.
 */
interface DishPickerProps {
  dishes: Dish[];
  /** Box pricing feeds the modal's totals, box-full copy and expand view. */
  pricing: BoxPricing;
  /**
   * Catalogue-wide options. Populated in demo; empty in live, where Aonik
   * attaches groups per product instead — see `optionsBySlug`.
   */
  personalisation: PersonalisationOptions;
  /**
   * Per-dish options, keyed by slug, resolved from Aonik's
   * `effectiveOptionGroups`. Takes precedence over `personalisation`, and a
   * dish absent here (or present with every group empty) offers no
   * personalisation at all — which is a real state, not a loading gap.
   */
  optionsBySlug?: Record<string, PersonalisationOptions>;
  /** Reheating guidance for the personaliser's shared info panels. */
  heating: HeatingInstruction[];
}

/** True when a dish has at least one thing a customer could actually choose. */
export function hasAnyOption(options: PersonalisationOptions | undefined): boolean {
  if (!options) return false;
  return (
    options.portions.length > 0 ||
    options.proteins.length > 0 ||
    options.sides.length > 0 ||
    options.heatLevels.length > 0
  );
}

/** Dishes revealed per "Load more" — the template's page size. */
const PAGE_SIZE = 8;

type FacetKey = 'category' | 'dietary' | 'spice' | 'calories';

type PickerFilters = Record<FacetKey, string[]>;

const NO_FILTERS: PickerFilters = { category: [], dietary: [], spice: [], calories: [] };

/** The template's spice chips, on the same 0-3 scale as `HEAT_STEPS`. */
const SPICE_CHIPS: { label: string; step: number }[] = [
  { label: 'Mild', step: 1 },
  { label: 'Medium', step: 2 },
  { label: 'Hot', step: 3 },
];

/** The template's two calorie bands. */
const CALORIE_BANDS: Record<string, (calories: number) => boolean> = {
  'Under 500 kcal': (calories) => calories < 500,
  '500+ kcal': (calories) => calories >= 500,
};

/** The band the template also shows as an "At a glance" pill. */
const LOW_CALORIE_BAND = 'Under 500 kcal';

const FACET_ICONS: Record<FacetKey, string[]> = {
  category: ['M5 11h14', 'M6 11a6 6 0 0012 0'],
  dietary: [
    'M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z',
    'M2 21c0-3 1.85-5.4 5-6',
  ],
  spice: [
    'M8.5 14.5A2.5 2.5 0 0011 12c0-1.4-.5-2-1-3-1-2-.2-3.8 2-5.5.5 2.3 2 4.6 3.7 6C17 11 18 12.7 18 14.5a6 6 0 11-9.5 0z',
  ],
  calories: ['M22 12h-4l-3 8L9 4l-3 8H2'],
};

/* -------------------------------------------------------------------------- */
/* Personalisation                                                             */
/* -------------------------------------------------------------------------- */

function findOption(group: DishOption[], key: string): DishOption | undefined {
  return group.find((option) => option.key === key);
}

/** Abby's pick for a group, falling back to the first option. */
function abbysKey(group: DishOption[]): string {
  return (group.find((option) => option.isAbbysChoice) ?? group[0])?.key ?? '';
}

/** The template's `DEFAULT`: Abby's choice per group, at the dish's own heat. */
export function abbysChoice(dish: Dish, options: PersonalisationOptions): CartPersonalisation {
  return {
    portion: abbysKey(options.portions),
    protein: abbysKey(options.proteins),
    side: abbysKey(options.sides),
    heatStep: HEAT_STEPS[dish.heat],
  };
}

export function sameChoice(a: CartPersonalisation, b: CartPersonalisation): boolean {
  return (
    a.portion === b.portion &&
    a.protein === b.protein &&
    a.side === b.side &&
    a.heatStep === b.heatStep
  );
}

/** Per-unit surcharge for a personalised line: the selected options, summed. */
export function choiceSurcharge(choice: CartPersonalisation, options: PersonalisationOptions): number {
  return (
    (findOption(options.portions, choice.portion)?.pricePence ?? 0) +
    (findOption(options.proteins, choice.protein)?.pricePence ?? 0) +
    (findOption(options.sides, choice.side)?.pricePence ?? 0)
  );
}

/**
 * How a line's personalisation reads in the box and on the card. Lines kept as
 * Abby designed them carry no `personalisation` at all.
 */
export function personalisationSummary(
  choice: CartPersonalisation | undefined,
  options: PersonalisationOptions,
): string {
  if (!choice) return 'As Abby designed it';

  return [
    findOption(options.portions, choice.portion)?.label,
    findOption(options.proteins, choice.protein)?.label,
    findOption(options.sides, choice.side)?.label,
    options.heatLevels.find((level) => level.step === choice.heatStep)?.label,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Portion weight in grams, read from the option's detail line ("225g"). */
function gramsOf(option: DishOption | undefined): number {
  const grams = Number.parseInt(option?.detail ?? '', 10);
  return Number.isFinite(grams) && grams > 0 ? grams : 0;
}

function scaled(value: number, factor: number): string {
  const result = Math.round(value * factor * 10) / 10;
  return result % 1 === 0 ? result.toFixed(0) : result.toFixed(1);
}

/* -------------------------------------------------------------------------- */

/**
 * The modal's navigable state, snapshotted into `hist` on every choice so the
 * header's back button retraces steps exactly as the template's `modalBack`.
 */
interface EditorNav {
  /** What the customer is doing with an in-box dish. Not-in-box is always 'add'. */
  mode: 'update' | 'add' | 'view' | null;
  /** A mode has been committed (the chooser may still be open for its pickers). */
  chosen: boolean;
  /** The "What would you like to do?" card is expanded. */
  whatOpen: boolean;
  /** The line being updated; null while the version picker awaits a choice. */
  targetLineId: string | null;
  /** How many units of the target line the update applies to. */
  updateCount: number;
  /** The Yes side of the personalise fork. */
  personalise: boolean;
  draft: CartPersonalisation;
}

interface Editor extends EditorNav {
  dish: Dish;
  /** The personalise panel accordion. */
  persOpen: boolean;
  /** The in-modal "Make your box larger?" view replacing the right column. */
  expandOpen: boolean;
  expandQty: number;
  hist: EditorNav[];
}

function navSnapshot(editor: Editor): EditorNav {
  return {
    mode: editor.mode,
    chosen: editor.chosen,
    whatOpen: editor.whatOpen,
    targetLineId: editor.targetLineId,
    updateCount: editor.updateCount,
    personalise: editor.personalise,
    draft: editor.draft,
  };
}

/**
 * Chilli pip as the template draws it on picker cards: lit pips get a
 * terracotta body on a forest stem, unlit go green-mist.
 */
function CardPip({ size, lit }: { size: number; lit: boolean }) {
  return (
    <svg width={size} height={size} viewBox={CHILLI_VIEW_BOX} aria-hidden="true" style={{ display: 'block' }}>
      <path fill={lit ? 'var(--green-forest)' : 'var(--green-mist)'} d={CHILLI_STEM_PATH} />
      <path fill={lit ? 'var(--terracotta)' : 'var(--green-mist)'} d={CHILLI_BODY_PATH} />
    </svg>
  );
}

/** The step-2 template names the top heat "Hot" (the dish page says "High"). */
export const CARD_HEAT_LABELS: Record<number, string> = { 1: 'Mild', 2: 'Medium', 3: 'Hot' };

export function DishPicker({
  dishes,
  pricing,
  personalisation,
  optionsBySlug,
  heating,
}: DishPickerProps) {
  const { boxSize, isCustom: boxIsCustom, lines, hydrated, addLine, removeLine, setQuantity, setBoxSize } =
    useCart();

  /** This dish's options, falling back to the catalogue-wide set (demo mode). */
  const optionsFor = useCallback(
    (dish: Dish): PersonalisationOptions => optionsBySlug?.[dish.slug] ?? personalisation,
    [optionsBySlug, personalisation],
  );

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<PickerFilters>(NO_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const [editor, setEditor] = useState<Editor | null>(null);
  /**
   * Extra dish spaces consented to via "Make your box larger?". Display-only:
   * billing already prices dishes beyond the box at `pricing.extraDishPence`,
   * exactly the template's expanded-box price (box price + £N per added space).
   */
  const [expandedTo, setExpandedTo] = useState(0);
  /** The count stepper's "you can update up to N" tooltip. */
  const [updTip, setUpdTip] = useState(false);
  const updTipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The template's flash toast ("NAME added to your box"). */
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  /** Which card's signature ⓘ tooltip is open (tap support; hover is CSS). */
  const [sigTipFor, setSigTipFor] = useState<string | null>(null);

  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  /** Whatever opened the personaliser, so focus can go back there on close. */
  const editorOpenerRef = useRef<HTMLElement | null>(null);

  /** Name elements, per dish, so truncation can toggle the hover tooltip. */
  const nameRefs = useRef(new Map<string, HTMLHeadingElement>());
  const [truncated, setTruncated] = useState<Record<string, boolean>>({});

  const measureTruncation = useCallback(() => {
    const next: Record<string, boolean> = {};
    nameRefs.current.forEach((el, id) => {
      next[id] = el.scrollHeight > el.clientHeight + 1;
    });
    setTruncated((current) => {
      const keys = Object.keys(next);
      if (keys.length === Object.keys(current).length && keys.every((k) => current[k] === next[k])) {
        return current;
      }
      return next;
    });
  }, []);

  // The sticky filter bar and the box summary hang from the real header
  // height, exactly as the template computes `--stick-top`.
  useEffect(() => {
    const set = () => {
      const header = document.querySelector('header');
      if (header instanceof HTMLElement) {
        document.documentElement.style.setProperty('--stick-top', `${header.offsetHeight - 1}px`);
      }
    };
    set();
    window.addEventListener('resize', set);
    return () => {
      window.removeEventListener('resize', set);
      document.documentElement.style.removeProperty('--stick-top');
    };
  }, []);

  const facets = useMemo(() => {
    // Only offer a category chip the catalogue can actually satisfy.
    const present = new Set(dishes.map((dish) => dish.mealType).filter(Boolean));
    return [
      {
        key: 'category' as const,
        title: 'Category',
        options: MEAL_TYPES.filter((type) => present.has(type)) as readonly string[],
      },
      { key: 'dietary' as const, title: 'Dietary', options: DIETARY_TAGS as readonly string[] },
      {
        key: 'spice' as const,
        title: 'Spice level',
        options: SPICE_CHIPS.map((chip) => chip.label) as readonly string[],
      },
      {
        key: 'calories' as const,
        title: 'Calories',
        options: Object.keys(CALORIE_BANDS) as readonly string[],
      },
    ];
  }, [dishes]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return dishes.filter((dish) => {
      if (needle) {
        const corpus = [
          dish.title,
          dish.description,
          ...dish.tags,
          ...dish.dietary,
          ...dish.wellness,
          dish.proteinType ?? '',
          dish.mealType ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!corpus.includes(needle)) return false;
      }

      if (filters.category.length && (!dish.mealType || !filters.category.includes(dish.mealType))) {
        return false;
      }

      if (
        filters.dietary.length &&
        !filters.dietary.some((tag) => (dish.dietary as string[]).includes(tag))
      ) {
        return false;
      }

      if (
        filters.spice.length &&
        !filters.spice.some(
          (label) => SPICE_CHIPS.find((chip) => chip.label === label)?.step === HEAT_STEPS[dish.heat],
        )
      ) {
        return false;
      }

      if (filters.calories.length) {
        const calories = dish.nutrition.calories;
        // A dish with no calorie figure cannot satisfy a calorie band.
        if (calories === undefined) return false;
        if (!filters.calories.some((label) => CALORIE_BANDS[label]?.(calories))) return false;
      }

      return true;
    });
  }, [dishes, filters, query]);

  const visible = filtered.slice(0, visibleCount);

  const active = useMemo(
    () => facets.flatMap((facet) => filters[facet.key].map((value) => ({ key: facet.key, value }))),
    [facets, filters],
  );

  /** Lines in the box, grouped by dish. */
  const linesByDish = useMemo(() => {
    const map = new Map<string, CartLine[]>();
    if (!hydrated) return map;
    for (const line of lines) {
      const existing = map.get(line.dishId);
      if (existing) existing.push(line);
      else map.set(line.dishId, [line]);
    }
    return map;
  }, [lines, hydrated]);

  /**
   * Lines that spill past the box size, attributed in the order they were
   * added — these cards flag "Extra dish" instead of "In your box".
   */
  const extraLineIds = useMemo(() => {
    const ids = new Set<string>();
    if (boxSize === null) return ids;
    let seen = 0;
    for (const line of lines) {
      if (seen + line.quantity > boxSize) ids.add(line.lineId);
      seen += line.quantity;
    }
    return ids;
  }, [lines, boxSize]);

  useEffect(() => {
    measureTruncation();
    window.addEventListener('resize', measureTruncation);
    return () => window.removeEventListener('resize', measureTruncation);
  }, [measureTruncation, visibleCount, query, filters]);

  /* ---- Filtering ------------------------------------------------------------ */

  const handleQuery = useCallback((next: string) => {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleToggle = useCallback((key: FacetKey, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...current[key], value],
    }));
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters(NO_FILTERS);
    setQuery('');
    setVisibleCount(PAGE_SIZE);
  }, []);

  /* ---- Cart ----------------------------------------------------------------- */

  const addPlain = useCallback(
    (dish: Dish) => {
      addLine({
        dishId: dish.id,
        slug: dish.slug,
        title: dish.title,
        imageUrl: dish.imageUrl,
        quantity: 1,
        // A signature upgrade is a per-unit surcharge on the line, like
        // personalisation; `cartTotals` bills both through `surchargePence`.
        surchargePence: dish.upgradePence ?? 0,
      });
    },
    [addLine],
  );

  const increment = useCallback(
    (dish: Dish) => {
      const dishLines = linesByDish.get(dish.id) ?? [];
      // Prefer the untouched line, so "+" never silently duplicates a
      // personalisation the customer set up deliberately.
      const target =
        dishLines.find((line) => !line.personalisation) ?? dishLines[dishLines.length - 1];
      if (target) setQuantity(target.lineId, target.quantity + 1);
      else addPlain(dish);
    },
    [linesByDish, setQuantity, addPlain],
  );

  const decrement = useCallback(
    (dish: Dish) => {
      const dishLines = linesByDish.get(dish.id) ?? [];
      const target = dishLines[dishLines.length - 1];
      if (target) setQuantity(target.lineId, target.quantity - 1);
    },
    [linesByDish, setQuantity],
  );

  /* ---- Personaliser --------------------------------------------------------- */

  // The template's `openModal`: an in-box dish opens on the mode chooser with
  // nothing selected; `personalise` in opts (the card's Edit / Personalise
  // links) jumps straight into update mode, via the pickers when needed.
  const openEditor = useCallback(
    (dish: Dish, line?: CartLine, opts?: { personalise?: boolean }) => {
      editorOpenerRef.current = document.activeElement as HTMLElement | null;
      const dishLines = linesByDish.get(dish.id) ?? [];
      const inBox = dishLines.length > 0;
      const target = line ?? (inBox ? dishLines[0] : undefined);
      const seedPers = target?.personalisation ?? abbysChoice(dish, optionsFor(dish));
      const chosen = inBox ? opts?.personalise !== undefined : true;
      const needPicker = dishLines.length > 1 || (target?.quantity ?? 0) > 1;
      setEditor({
        dish,
        mode: inBox ? (chosen ? 'update' : null) : 'add',
        chosen,
        whatOpen: inBox ? !chosen || needPicker : true,
        targetLineId: target?.lineId ?? null,
        updateCount: target?.quantity ?? 1,
        personalise: opts?.personalise ?? Boolean(target?.personalisation),
        draft: seedPers,
        persOpen: true,
        expandOpen: false,
        expandQty: 1,
        hist: [],
      });
      setUpdTip(false);
    },
    [linesByDish, optionsFor],
  );

  const closeEditor = useCallback(() => {
    setEditor(null);
    // Hand focus back to the control that opened the dialog.
    editorOpenerRef.current?.focus();
    editorOpenerRef.current = null;
  }, []);

  /** Apply a navigation step, snapshotting the previous one for Back. */
  const navSet = useCallback((patch: Partial<EditorNav>) => {
    setEditor((current) =>
      current ? { ...current, ...patch, hist: [...current.hist, navSnapshot(current)] } : current,
    );
  }, []);

  /** Patch without recording history (drafts, accordions, steppers). */
  const patchEditor = useCallback((patch: Partial<Editor>) => {
    setEditor((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const setDraft = useCallback((draft: CartPersonalisation) => {
    setEditor((current) => (current ? { ...current, draft } : current));
  }, []);

  // The head's back button retraces choices; from the first screen it closes.
  const modalBack = useCallback(() => {
    if (!editor) return;
    if (editor.expandOpen) {
      patchEditor({ expandOpen: false });
      return;
    }
    if (editor.hist.length) {
      const previous = editor.hist[editor.hist.length - 1];
      setEditor({ ...editor, ...previous, hist: editor.hist.slice(0, -1) });
      return;
    }
    closeEditor();
  }, [editor, patchEditor, closeEditor]);

  // Escape closes the personaliser, focus moves into it, and the page behind it
  // must not scroll.
  useEffect(() => {
    if (!editor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogCloseRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [editor, closeEditor]);

  // The floating "Top" control appears once the grid has scrolled a screenful
  // away, which is the template's cue for it.
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* ---- Modal derivations (template `renderVals` locals) ---------------------- */

  /*
   * The open dish's own options. Everything below derives from these rather
   * than the catalogue-wide prop: Abby's default, the surcharge and the chips
   * all have to describe THIS dish, whose groups and defaults are its own —
   * its heat default is its own heat level, and it may offer no side at all.
   */
  const dishOptions = editor ? optionsFor(editor.dish) : personalisation;

  const abbys = editor ? abbysChoice(editor.dish, dishOptions) : null;
  const enabled = editor?.personalise ?? false;
  const draft = editor?.draft ?? null;
  const isCustom = Boolean(enabled && draft && abbys && !sameChoice(draft, abbys));
  const changePence = isCustom && draft ? choiceSurcharge(draft, dishOptions) : 0;

  const editorLines = editor ? (linesByDish.get(editor.dish.id) ?? []) : [];
  const inBox = editorLines.length > 0;
  const editing = editor?.mode === 'update';
  const adding = editor?.mode === 'add';
  const viewing = editor?.mode === 'view';
  const targetLine = editor?.targetLineId
    ? (editorLines.find((line) => line.lineId === editor.targetLineId) ?? null)
    : null;
  const updCount = Math.min(Math.max(1, editor?.updateCount ?? 1), targetLine?.quantity ?? 1);
  const dishInBoxQty = editorLines.reduce((total, line) => total + line.quantity, 0);

  const usedCount = lines.reduce((total, line) => total + line.quantity, 0);
  /** Box capacity including spaces consented to via the expand view. */
  const effectiveSize = Math.max(boxSize ?? 0, expandedTo);
  const boxLabel = `${effectiveSize}-dish box`;
  const boxFull = boxSize !== null && usedCount >= effectiveSize;
  const remaining = Math.max(0, effectiveSize - usedCount);

  // "Updated estimated total": box + surcharges + extra dishes, as the summary bills them.
  const grandTotalPence =
    boxSize === null ? 0 : cartTotals({ boxSize, isCustom: boxIsCustom, lines }, pricing).totalPence;
  const origPers = targetLine?.personalisation ?? abbys;
  const changedFromOrig =
    targetLine && draft && origPers ? !sameChoice(draft, origPers) : true;
  // The template prices the change against the whole line, not the chosen count.
  const deltaPence =
    draft && origPers
      ? (choiceSurcharge(draft, dishOptions) - choiceSurcharge(origPers, dishOptions)) *
        (targetLine?.quantity ?? 1)
      : 0;

  /* ---- Mode handlers (template `setModeUpdate` / `setModeAdd` / …) ----------- */

  const setModeUpdate = useCallback(() => {
    if (!editor || !abbys) return;
    if (editor.mode === 'update') {
      navSet({ mode: null, chosen: false, whatOpen: true });
      return;
    }
    const dishLines = linesByDish.get(editor.dish.id) ?? [];
    const multi = dishLines.length > 1;
    const target =
      (editor.targetLineId
        ? dishLines.find((line) => line.lineId === editor.targetLineId)
        : undefined) ?? dishLines[0];
    const needPicker = multi || (target?.quantity ?? 0) > 1;
    navSet({
      mode: 'update',
      chosen: true,
      whatOpen: needPicker,
      targetLineId: multi ? null : (target?.lineId ?? null),
      updateCount: multi ? 1 : (target?.quantity ?? 1),
      personalise: !multi,
      draft: multi ? abbys : (target?.personalisation ?? abbys),
    });
  }, [editor, abbys, linesByDish, navSet]);

  const setModeAdd = useCallback(() => {
    if (!editor || !abbys) return;
    if (editor.mode === 'add') {
      navSet({ mode: null, chosen: false, whatOpen: true, personalise: false });
      return;
    }
    navSet({ mode: 'add', chosen: true, whatOpen: true, personalise: false, draft: abbys });
  }, [editor, abbys, navSet]);

  const onJustViewing = useCallback(() => {
    if (!editor) return;
    if (editor.mode === 'view') navSet({ mode: null, chosen: false, whatOpen: true });
    else navSet({ mode: 'view', chosen: true, whatOpen: false });
  }, [editor, navSet]);

  const selectVersion = useCallback(
    (lineId: string) => {
      if (!editor || !abbys) return;
      const seed = (linesByDish.get(editor.dish.id) ?? []).find(
        (line) => line.lineId === lineId,
      );
      navSet({
        targetLineId: lineId,
        updateCount: seed?.quantity ?? 1,
        draft: seed?.personalisation ?? abbys,
        personalise: true,
      });
      setUpdTip(false);
    },
    [editor, abbys, linesByDish, navSet],
  );

  const incUpdateCount = useCallback(() => {
    if (!editor) return;
    const max = targetLine?.quantity ?? 1;
    if (editor.updateCount >= max) {
      setUpdTip(true);
      if (updTipTimer.current) clearTimeout(updTipTimer.current);
      updTipTimer.current = setTimeout(() => setUpdTip(false), 2600);
      return;
    }
    patchEditor({ updateCount: editor.updateCount + 1 });
    setUpdTip(false);
  }, [editor, targetLine, patchEditor]);

  const decUpdateCount = useCallback(() => {
    if (!editor) return;
    patchEditor({ updateCount: Math.max(1, editor.updateCount - 1) });
    setUpdTip(false);
  }, [editor, patchEditor]);

  /* ---- Commit + expand ------------------------------------------------------- */

  const commit = useCallback(() => {
    if (!editor || !draft || !abbys) return;
    const custom = enabled && !sameChoice(draft, abbys);
    const dish = editor.dish;
    const pers = enabled ? draft : abbys;
    const surcharge =
      (dish.upgradePence ?? 0) + (custom ? choiceSurcharge(pers, dishOptions) : 0);

    if (editor.mode !== 'update') {
      // Add (in-box "Add another" and every not-in-box add).
      if (boxFull) {
        patchEditor({ expandOpen: true, expandQty: 1 });
        return;
      }
      addLine({
        dishId: dish.id,
        slug: dish.slug,
        title: dish.title,
        imageUrl: dish.imageUrl,
        quantity: 1,
        personalisation: custom ? pers : undefined,
        surchargePence: surcharge,
      });
      closeEditor();
      flash(dish.title + (custom ? ' added — personalised' : ' added to your box'));
      return;
    }

    // Update: move `updCount` units of the target line onto the new
    // personalisation. `addLine` merges into a twin line when one exists.
    if (!targetLine) {
      closeEditor();
      return;
    }
    const count = updCount;
    if (count >= targetLine.quantity) removeLine(targetLine.lineId);
    else setQuantity(targetLine.lineId, targetLine.quantity - count);
    addLine({
      dishId: dish.id,
      slug: dish.slug,
      title: dish.title,
      imageUrl: dish.imageUrl,
      quantity: count,
      personalisation: custom ? pers : undefined,
      surchargePence: surcharge,
    });
    closeEditor();
    flash(
      dish.title +
        (targetLine.quantity > 1
          ? ` — ${count} ${count === 1 ? 'dish' : 'dishes'} updated`
          : ' updated'),
    );
  }, [
    editor,
    draft,
    abbys,
    enabled,
    dishOptions,
    boxFull,
    targetLine,
    updCount,
    addLine,
    removeLine,
    setQuantity,
    patchEditor,
    closeEditor,
    flash,
  ]);

  const openExpand = useCallback(
    () => patchEditor({ expandOpen: true, expandQty: 1 }),
    [patchEditor],
  );

  // "Make your box larger?" — consent to more dish spaces. Billing needs no
  // mutation (`cartTotals` already prices overflow at `extraDishPence`); the
  // consented size drives the capacity gate and the labels.
  const expandRoom = Math.max(1, pricing.custom.maxDishes - effectiveSize);
  const expandQty = Math.max(1, Math.min(expandRoom, editor?.expandQty ?? 1));
  const expandNewSize = effectiveSize + expandQty;
  const expandNewPricePence =
    boxSize === null
      ? 0
      : boxPricePence(boxSize, boxIsCustom, pricing) +
        Math.max(0, expandNewSize - boxSize) * pricing.extraDishPence;

  const confirmExpand = useCallback(() => {
    if (!editor) return;
    setExpandedTo(expandNewSize);
    patchEditor({
      expandOpen: false,
      mode: 'add',
      chosen: true,
      personalise: false,
      whatOpen: false,
    });
    flash(`Your box is now ${expandNewSize} dishes`);
  }, [editor, expandNewSize, patchEditor, flash]);

  const chooseExpandPreset = useCallback(
    (dishCount: number) => {
      setBoxSize(dishCount, false);
      setExpandedTo(0);
      patchEditor({
        expandOpen: false,
        mode: 'add',
        chosen: true,
        personalise: false,
        whatOpen: false,
      });
      flash(`Your box is now ${dishCount} dishes`);
    },
    [setBoxSize, patchEditor, flash],
  );

  /* ---- Foot CTA machine (template lines 3846-3864) --------------------------- */

  const cta = (() => {
    if (!editor) {
      return { title: '', sub: '', sub2: '', label: '', disabled: false, ghost: false, action: commit };
    }
    const dish = editor.dish;
    const sigUp = dish.isSignature ? (dish.upgradePence ?? 0) : 0;

    if (inBox) {
      if (!editor.chosen || !editor.mode) {
        return {
          title: 'Select an action to continue',
          sub: 'No changes yet',
          sub2: '',
          label: 'Choose an action',
          disabled: true,
          ghost: false,
          action: commit,
        };
      }
      if (viewing) {
        return {
          title: 'No changes will be made',
          sub: 'Your box stays the same',
          sub2: '',
          label: 'Back to dishes',
          disabled: false,
          ghost: true,
          action: closeEditor,
        };
      }
      if (editing) {
        const saveLabel =
          updCount > 1
            ? `Save changes to ${updCount} dishes`
            : targetLine && targetLine.quantity > 1
              ? 'Save changes to 1 dish'
              : 'Save changes';
        if (!changedFromOrig) {
          return {
            title: 'No changes made',
            sub: 'Your dish will stay the same',
            sub2: '',
            label: saveLabel,
            disabled: true,
            ghost: false,
            action: commit,
          };
        }
        if (deltaPence > 0) {
          return {
            title: `Personalisation +${formatPrice(deltaPence)}`,
            sub: `Updated estimated total ${formatPrice(grandTotalPence + deltaPence)}`,
            sub2: 'This will replace your current dish',
            label: saveLabel,
            disabled: false,
            ghost: false,
            action: commit,
          };
        }
        if (deltaPence < 0) {
          return {
            title: `Reset to Abby’s choice · ${formatPrice(-deltaPence)} removed`,
            sub: `Updated estimated total ${formatPrice(grandTotalPence + deltaPence)}`,
            sub2: 'This will replace your current dish',
            label: saveLabel,
            disabled: false,
            ghost: false,
            action: commit,
          };
        }
        return {
          title: 'Changes ready to save',
          sub: 'Your updated dish will replace the current one',
          sub2: '',
          label: saveLabel,
          disabled: false,
          ghost: false,
          action: commit,
        };
      }
      // mode === 'add'
      if (boxFull) {
        return {
          title: 'More box space is needed',
          sub: `Your ${boxLabel} is full`,
          sub2: 'Choose a larger box to continue',
          label: 'Make box larger',
          disabled: false,
          ghost: false,
          action: openExpand,
        };
      }
      return {
        title: 'Included in your box',
        sub: `1 of ${remaining} remaining ${remaining === 1 ? 'space' : 'spaces'} will be used`,
        sub2:
          `This will add another ${dish.title}` +
          (sigUp ? ` (+${formatPrice(sigUp)} signature upgrade)` : ''),
        label: 'Add another to box',
        disabled: false,
        ghost: false,
        action: commit,
      };
    }

    // Not in the box yet: the template's footNote branch.
    if (boxFull) {
      return {
        title: `Your ${boxLabel} is full`,
        sub: 'Make it larger to add more',
        sub2: '',
        label: 'Make your box larger',
        disabled: false,
        ghost: false,
        action: openExpand,
      };
    }
    if (dish.isSignature && sigUp) {
      return {
        title: 'Abby’s Signature',
        sub:
          `+${formatPrice(sigUp)} signature upgrade` +
          (isCustom && changePence !== 0 ? ` · +${formatPrice(changePence)} personalisation` : ''),
        sub2: 'Added on top of your box price',
        label: `Add to your box · +${formatPrice(sigUp)}`,
        disabled: false,
        ghost: false,
        action: commit,
      };
    }
    if (isCustom) {
      return {
        title: 'Personalised your way',
        sub: changePence !== 0 ? `+${formatPrice(changePence)} personalisation` : 'No extra cost',
        sub2: changePence > 0 ? 'Added to base price' : '',
        label: `Add to your box${changePence > 0 ? ` · +${formatPrice(changePence)} extra` : ''}`,
        disabled: false,
        ghost: false,
        action: commit,
      };
    }
    return {
      title: 'As Abby designed it',
      sub: 'No extra cost',
      sub2: '',
      label: 'Add to your box',
      disabled: false,
      ghost: false,
      action: commit,
    };
  })();

  /* ---- Right-column visibility (template `showPersonalise` etc.) ------------- */

  const showPersonalise = inBox
    ? Boolean(
        editor &&
          editor.chosen &&
          !viewing &&
          !(adding && boxFull) &&
          !(adding && !editor.personalise) &&
          !(editing && editorLines.length > 1 && !editor.targetLineId),
      )
    : true;
  const showSpaceBanner = inBox && adding && !boxFull;
  const showInBoxHeader = inBox && !showSpaceBanner;
  const showVersionPicker = editing && editorLines.length > 1;
  const showCountPicker = editing && Boolean(targetLine && targetLine.quantity > 1);

  // Someone deep-linked past step 1: there is no box to fill yet.
  if (hydrated && boxSize === null) {
    return (
      <div className={styles.noBox}>
        <p className={styles.noBoxTitle}>Choose your box size first</p>
        <p className={styles.noBoxCopy}>
          Pick how many dishes you would like, then add them here.
        </p>
        <Button href="/box" variant="dark">
          Back to choose box
        </Button>
      </div>
    );
  }

  const resultLabel = `Showing ${visible.length} of ${filtered.length} ${
    filtered.length === 1 ? 'dish' : 'dishes'
  }`;

  return (
    <div className={styles.picker}>
      {/* The template keeps box progress in the summary column and the mobile
          bar — the main column goes straight from the intro to the filters. */}

      {/* ---- Search + filters ---------------------------------------------- */}

      <div className={styles.sticky}>
        <div className={styles.toolbar}>
          <div className={styles.bar}>
            <div className={styles.search}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => handleQuery(event.target.value)}
                placeholder="Search dishes, proteins or goals"
                aria-label="Search dishes"
                className={styles.input}
              />
              {query ? (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => handleQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className={styles.toggle}
              onClick={() => setPanelOpen(!panelOpen)}
              aria-expanded={panelOpen}
              aria-controls="dish-filters"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--green-forest)"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 5h18l-7 8v5l-4 2v-7z" />
              </svg>
              <span>Filters</span>
              {active.length > 0 ? <span className={styles.count}>{active.length}</span> : null}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--taupe)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.chevron}
                data-open={panelOpen || undefined}
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <span className={styles.showing}>{resultLabel}</span>
          </div>

          {panelOpen ? (
            <>
              <div
                className={styles.backdrop}
                onClick={() => setPanelOpen(false)}
                aria-hidden="true"
              />

              <div className={styles.panel} id="dish-filters">
                <div className={styles.sheetHead}>
                  <span className={styles.sheetTitle}>Filters</span>
                  <button
                    type="button"
                    className={styles.clear}
                    onClick={() => setPanelOpen(false)}
                    aria-label="Close filters"
                  >
                    ×
                  </button>
                </div>

                <div className={styles.sheetBody}>
                  <div className={styles.columns}>
                    {facets.map((facet) => (
                      <fieldset key={facet.key} className={styles.facet}>
                        <legend className={styles.facetHead}>
                          <span className={styles.facetIcon} aria-hidden="true">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--green-forest)"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {FACET_ICONS[facet.key].map((d) => (
                                <path key={d} d={d} />
                              ))}
                            </svg>
                          </span>
                          <span className={styles.facetTitle}>{facet.title}</span>
                        </legend>

                        <div className={styles.chips}>
                          {facet.options.map((option) => {
                            const selected = filters[facet.key].includes(option);
                            return (
                              <button
                                key={option}
                                type="button"
                                className={styles.chip}
                                data-selected={selected || undefined}
                                aria-pressed={selected}
                                onClick={() => handleToggle(facet.key, option)}
                              >
                                <span>{option}</span>
                                {selected ? (
                                  <span className={styles.chipX} aria-hidden="true">
                                    ×
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </div>

                <div className={styles.sheetFoot}>
                  <button type="button" className={styles.clearAll} onClick={handleClearAll}>
                    Clear all
                  </button>
                  <Button variant="dark" className={styles.apply} onClick={() => setPanelOpen(false)}>
                    Show {filtered.length} {filtered.length === 1 ? 'dish' : 'dishes'}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ---- Result bar ------------------------------------------------------ */}

      <div className={styles.resultBar}>
        <span className={styles.resultCount}>{resultLabel}</span>
        {active.length > 0 ? (
          <div className={styles.activeRow}>
            {active.map(({ key, value }) => (
              <button
                key={`${key}-${value}`}
                type="button"
                className={styles.activeChip}
                onClick={() => handleToggle(key, value)}
              >
                <span>{value}</span>
                <span className={styles.remove} aria-hidden="true">
                  ×
                </span>
                <span className="visuallyHidden">Remove filter</span>
              </button>
            ))}
            <button type="button" className={styles.clearAll} onClick={handleClearAll}>
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {/* ---- Grid ------------------------------------------------------------ */}

      {visible.length > 0 ? (
        <ul className={styles.grid}>
          {visible.map((dish) => {
            const dishLines = linesByDish.get(dish.id) ?? [];
            const quantity = dishLines.reduce((total, line) => total + line.quantity, 0);
            const personalised = dishLines.filter((line) => line.personalisation);
            const single = dishLines.length === 1 ? dishLines[0] : null;
            const anyExtra = dishLines.some((line) => extraLineIds.has(line.lineId));
            const heatStep = HEAT_STEPS[dish.heat];
            const heatLabel = CARD_HEAT_LABELS[heatStep];
            const kcal = dish.nutrition.calories;
            const mMeta = [heatLabel, kcal !== undefined ? `${kcal} kcal` : null,
              `${dish.nutrition.proteinGrams}g protein`]
              .filter(Boolean)
              .join(' · ');

            return (
              <li key={dish.id} className={styles.cell}>
                <article
                  className={styles.dishCard}
                  data-selected={quantity > 0 || undefined}
                >
                  <div
                    className={styles.media}
                    onClick={() => openEditor(dish, single ?? undefined)}
                    aria-hidden="true"
                  >
                    <Image
                      src={dish.imageUrl}
                      alt={dish.title}
                      width={720}
                      height={576}
                      className={styles.mediaImage}
                      sizes="(max-width: 860px) 100vw, 33vw"
                    />

                    {dish.tags.length ? (
                      <div className={styles.mediaBadges}>
                        {dish.tags.map((tag) => (
                          <span
                            key={tag}
                            className={styles.mediaBadge}
                            data-tone={tag === 'Under 500 kcal' ? 'light' : 'dark'}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {quantity > 0 ? (
                      <span className={styles.inBox}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                        {anyExtra ? 'Extra dish' : 'In your box'}
                      </span>
                    ) : null}

                    {dish.isSignature ? (
                      <>
                        <div className={styles.sigBadges}>
                          <span className={styles.sigPill}>
                            <span className={styles.sigLozenge} aria-hidden="true">
                              ⬥
                            </span>
                            Signature
                            <span
                              className={styles.sigInfo}
                              data-open={sigTipFor === dish.id || undefined}
                              tabIndex={0}
                              role="button"
                              aria-label="About signature dishes"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSigTipFor((open) => (open === dish.id ? null : dish.id));
                              }}
                            >
                              i
                              <span className={styles.sigTip} role="tooltip">
                                One of Abby&apos;s specials. Counts as one of your box dishes —
                                the upgrade is added on top.
                              </span>
                            </span>
                          </span>
                          {dish.upgradePence ? (
                            <span className={styles.sigPill}>+{formatPrice(dish.upgradePence)}</span>
                          ) : null}
                        </div>
                        <div className={styles.sigBanner}>
                          <Image src="/assets/floral-mark.png" alt="" width={14} height={14} />
                          <span>Abby&apos;s Signature</span>
                          <Image src="/assets/floral-mark.png" alt="" width={14} height={14} />
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className={styles.cardBody}>
                    <div
                      className={styles.nameWrap}
                      data-truncated={truncated[dish.id] || undefined}
                    >
                      <h3
                        className={styles.name}
                        ref={(el) => {
                          if (el) nameRefs.current.set(dish.id, el);
                          else nameRefs.current.delete(dish.id);
                        }}
                        onClick={() => openEditor(dish, single ?? undefined)}
                      >
                        {dish.title}
                      </h3>
                      <span className={styles.nameTip} role="tooltip">
                        {dish.title}
                      </span>
                    </div>

                    <p className={styles.desc}>{dish.description}</p>

                    <div className={styles.statsRow}>
                      <span className={styles.heatStat}>
                        <span className={styles.heatPips}>
                          {[1, 2, 3].map((step) => (
                            <CardPip key={step} size={15} lit={step <= heatStep} />
                          ))}
                        </span>
                        <span className={styles.heatLabel}>{heatLabel}</span>
                      </span>
                      {dish.nutrition.proteinGrams !== undefined ? (
                        <NutritionTag dot="protein">
                          Protein {dish.nutrition.proteinGrams}g
                        </NutritionTag>
                      ) : null}
                      {dish.nutrition.fibreGrams !== undefined ? (
                        <NutritionTag dot="fibre">Fibre {dish.nutrition.fibreGrams}g</NutritionTag>
                      ) : null}
                    </div>

                    <div className={styles.mMeta}>
                      <span className={styles.mMetaPips}>
                        {[1, 2, 3].map((step) => (
                          <CardPip key={step} size={13} lit={step <= heatStep} />
                        ))}
                      </span>
                      <span>{mMeta}</span>
                    </div>

                    {/*
                      Only offered when this dish actually has options.

                      Gated on the resolved options rather than
                      `dish.personalisation`, which a browse row cannot fill —
                      the summary DTO carries no groups, so it is always empty
                      on this grid and would hide the block for every dish.
                      Three of the seeded ten genuinely offer nothing, and
                      inviting "Personalise this dish" there opened a dialog
                      with no choices in it.
                    */}
                    {hasAnyOption(optionsFor(dish)) ? (
                    <div className={styles.persBlock}>
                      {personalised.length > 0 ? (
                        <>
                          <div className={styles.persDone}>
                            <span className={styles.persDoneHead}>
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M5 12.5l4.5 4.5L19 7" />
                              </svg>
                              Personalised
                            </span>
                            {single ? (
                              <button
                                type="button"
                                className={styles.editLine}
                                onClick={() => openEditor(dish, single, { personalise: true })}
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                          <div className={styles.persAction}>
                            {personalised.length > 1
                              ? `${personalised.length} versions in your box`
                              : personalisationSummary(
                                  personalised[0].personalisation,
                                  optionsFor(dish),
                                )}
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.persLink}
                            onClick={() => openEditor(dish, single ?? undefined, { personalise: true })}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <line x1="4" y1="8" x2="20" y2="8" />
                              <circle cx="10" cy="8" r="2.4" fill="var(--surface-card)" />
                              <line x1="4" y1="16" x2="20" y2="16" />
                              <circle cx="15" cy="16" r="2.4" fill="var(--surface-card)" />
                            </svg>
                            <span>Personalise this dish</span>
                          </button>
                          <div className={styles.persSub}>
                            Portion, protein, side &amp; heat — your way.
                          </div>
                        </>
                      )}
                    </div>
                    ) : null}

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.view}
                        onClick={() => openEditor(dish, single ?? undefined)}
                      >
                        View
                      </button>

                      {quantity > 0 ? (
                        <span className={styles.cardStep} role="group" aria-label="Quantity">
                          <button
                            type="button"
                            onClick={() => decrement(dish)}
                            aria-label={`Remove one ${dish.title}`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                          <span className={styles.cardStepQty}>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => increment(dish)}
                            aria-label={`Add one ${dish.title}`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                        </span>
                      ) : (
                        <button type="button" className={styles.add} onClick={() => addPlain(dish)}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                          Add
                          {dish.isSignature && dish.upgradePence ? (
                            <span className={styles.addUpgrade}>
                              · +{formatPrice(dish.upgradePence)}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No dishes match your search or filters.</p>
          <button type="button" className={styles.emptyAction} onClick={handleClearAll}>
            Clear search &amp; filters
          </button>
        </div>
      )}

      {visible.length < filtered.length ? (
        <div className={styles.more}>
          <button
            type="button"
            className={styles.loadMore}
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load more dishes
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <span className={styles.moreLabel}>{resultLabel}</span>
        </div>
      ) : null}

      {/* ---- Personaliser ---------------------------------------------------- */}

      {editor && draft && abbys ? (
        <div className={styles.overlay} onClick={closeEditor}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="personalise-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHead}>
              <button
                type="button"
                className={styles.dialogBack}
                onClick={modalBack}
                aria-label="Back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <Image
                src={editor.dish.imageUrl}
                alt=""
                width={46}
                height={46}
                className={styles.dialogThumb}
              />
              <span id="personalise-title" className={styles.dialogName}>
                {editor.dish.title}
              </span>
              <button
                ref={dialogCloseRef}
                type="button"
                className={styles.dialogClose}
                onClick={closeEditor}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.dialogBody} id="dm-body">
              <div className={styles.dmCols} data-inbox={inBox || undefined}>
                {/* ---- Left: the dish itself -------------------------------- */}
                <div className={styles.dmLeft}>
                  <div className={styles.dmHero}>
                    <Image
                      src={editor.dish.imageUrl}
                      alt={editor.dish.title}
                      width={860}
                      height={688}
                      className={styles.dmHeroImage}
                      sizes="(max-width: 860px) 100vw, 45vw"
                    />
                    {editor.dish.tags.length ? (
                      <div className={styles.dmBadges}>
                        {editor.dish.tags.map((tag) => (
                          <span
                            key={tag}
                            className={styles.mediaBadge}
                            data-tone={tag === 'Under 500 kcal' ? 'light' : 'dark'}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {(linesByDish.get(editor.dish.id) ?? []).length > 0 ? (
                      <span className={styles.dmInBox}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--blush)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                        In your box
                      </span>
                    ) : null}
                    {editor.dish.isSignature ? (
                      <div className={styles.sigBanner}>
                        <Image src="/assets/floral-mark.png" alt="" width={14} height={14} />
                        <span>Abby&apos;s Signature</span>
                        <Image src="/assets/floral-mark.png" alt="" width={14} height={14} />
                      </div>
                    ) : null}
                  </div>

                  <p className={styles.dmLong}>{editor.dish.description}</p>
                  {editor.dish.isSignature ? (
                    <p className={styles.dmSigNote}>
                      <strong className={styles.dmSigNavy}>Abby&apos;s Signature</strong> — counts
                      as one of your box dishes
                      {editor.dish.upgradePence ? (
                        <>
                          , with the{' '}
                          <strong className={styles.dmSigForest}>
                            +{formatPrice(editor.dish.upgradePence)} upgrade
                          </strong>{' '}
                          added on top
                        </>
                      ) : null}
                      .
                    </p>
                  ) : null}

                  <button
                    type="button"
                    className={styles.dmShortcut}
                    onClick={() =>
                      document
                        .getElementById('dm-personalise')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                      <line x1="4" y1="8" x2="20" y2="8" />
                      <circle cx="10" cy="8" r="2.4" fill="var(--surface-bright)" />
                      <line x1="4" y1="16" x2="20" y2="16" />
                      <circle cx="15" cy="16" r="2.4" fill="var(--surface-bright)" />
                    </svg>
                    <span className={styles.dmShortcutText}>
                      <span className={styles.dmShortcutTitle}>Personalise this dish</span>
                      <span className={styles.dmShortcutSub}>
                        Portion, protein, side &amp; heat — your way.
                      </span>
                    </span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>

                  <div className={styles.dmJumps}>
                    {[
                      { label: 'Nutrition', target: 'dish-nutrition' },
                      { label: 'Ingredients & allergens', target: 'dish-ingredients' },
                      { label: 'How to heat', target: 'dish-heating' },
                    ].map((jump, index) => (
                      <span key={jump.target} className={styles.dmJumpWrap}>
                        {index > 0 ? (
                          <span className={styles.dmJumpSep} aria-hidden="true">
                            ·
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={styles.dmJump}
                          onClick={() =>
                            document
                              .getElementById(jump.target)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        >
                          {jump.label}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 5v14" />
                            <path d="M6 13l6 6 6-6" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className={styles.dmDetails}>
                    <p className={styles.dmDetailsTitle}>At a glance</p>
                    <div className={styles.dmHlGrid}>
                      {(
                        [
                          editor.dish.nutrition.calories !== undefined
                            ? { label: 'kcal', value: String(editor.dish.nutrition.calories) }
                            : null,
                          { label: 'Protein', value: `${editor.dish.nutrition.proteinGrams}g` },
                          editor.dish.nutrition.carbsGrams !== undefined
                            ? { label: 'Carbs', value: `${editor.dish.nutrition.carbsGrams}g` }
                            : null,
                          editor.dish.nutrition.fatGrams !== undefined
                            ? { label: 'Fat', value: `${editor.dish.nutrition.fatGrams}g` }
                            : null,
                        ].filter(Boolean) as { label: string; value: string }[]
                      ).map((cell) => (
                        <div key={cell.label} className={styles.dmHlCell}>
                          <span className={styles.dmHlLabel}>{cell.label}</span>
                          <span className={styles.dmHlValue}>{cell.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.dmMetaRow}>
                      <div className={styles.dmCatPills}>
                        {editor.dish.dietary.map((tag) => (
                          <span key={tag} className={styles.dmCatPill}>
                            {tag}
                          </span>
                        ))}
                        {editor.dish.nutrition.calories !== undefined &&
                        CALORIE_BANDS[LOW_CALORIE_BAND](editor.dish.nutrition.calories) ? (
                          <span className={styles.dmCatPill}>{LOW_CALORIE_BAND}</span>
                        ) : null}
                      </div>
                      <div className={styles.dmHeatRow}>
                        <span className={styles.dmHeatLabel}>Heat</span>
                        <HeatPips heat={editor.dish.heat} />
                        <span className={styles.dmSpiceLabel}>
                          {CARD_HEAT_LABELS[HEAT_STEPS[editor.dish.heat]] ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nutrition, ingredients & allergens and reheating come from the
                      shared panels, which state plainly when allergens are
                      unpublished instead of guessing them. */}
                  <DishInfoPanels
                    dish={editor.dish}
                    heating={heating}
                    compact
                    onBackToTop={() =>
                      document
                        .getElementById('dm-body')
                        ?.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  />
                </div>

                {/* ---- Right: actions + personalise ------------------------- */}
                <div className={styles.dmRight}>
                  {editor.expandOpen ? (
                    /* ---- "Make your box larger?" swaps the whole column ----- */
                    <div className={styles.expandView}>
                      <button
                        type="button"
                        className={styles.expandBack}
                        onClick={() => patchEditor({ expandOpen: false })}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                        Back to {editor.dish.title}
                      </button>
                      <h3 className={styles.expandTitle}>Make your box larger?</h3>
                      <p className={styles.expandIntro}>
                        Your {boxLabel} is full. Add more dish spaces and your total updates
                        immediately.
                      </p>
                      <div className={styles.expandCard}>
                        <div className={styles.expandCardTitle}>
                          How many more dish spaces would you like?
                        </div>
                        <div className={styles.expandStepper}>
                          <button
                            type="button"
                            className={styles.expandStepBtn}
                            onClick={() => patchEditor({ expandQty: Math.max(1, expandQty - 1) })}
                            disabled={expandQty <= 1}
                            aria-label="Fewer dishes"
                          >
                            −
                          </button>
                          <div className={styles.expandCount}>
                            <input
                              className={styles.expandInput}
                              value={expandQty}
                              inputMode="numeric"
                              aria-label="Extra dishes"
                              onChange={(event) => {
                                const parsed = Number.parseInt(event.target.value, 10);
                                patchEditor({
                                  expandQty: Number.isFinite(parsed)
                                    ? Math.max(1, Math.min(expandRoom, parsed))
                                    : 1,
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className={styles.expandStepBtn}
                            onClick={() =>
                              patchEditor({ expandQty: Math.min(expandRoom, expandQty + 1) })
                            }
                            disabled={expandQty >= expandRoom}
                            aria-label="More dishes"
                          >
                            +
                          </button>
                        </div>
                        <div className={styles.expandRule} aria-hidden="true" />
                        <div className={styles.expandRow}>
                          <span>New box size</span>
                          <span className={styles.expandRowValue}>{expandNewSize} dishes</span>
                        </div>
                        <div className={styles.expandRow}>
                          <span>Updated box price</span>
                          <span className={styles.expandRowValue}>
                            {formatPrice(expandNewPricePence)}
                          </span>
                        </div>
                      </div>
                      <button type="button" className={styles.expandCta} onClick={confirmExpand}>
                        Expand to {expandNewSize} dishes — {formatPrice(expandNewPricePence)}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="4" y1="12" x2="19" y2="12" />
                          <path d="M13 6l6 6-6 6" />
                        </svg>
                      </button>
                      {pricing.presets.some((offer) => offer.dishCount > effectiveSize) ? (
                        <>
                          <div className={styles.expandOr} aria-hidden="true">
                            <span className={styles.expandOrLine} />
                            <span className={styles.expandOrLabel}>Or choose a preset</span>
                            <span className={styles.expandOrLine} />
                          </div>
                          <div className={styles.expandPresets}>
                            {pricing.presets
                              .filter((offer) => offer.dishCount > effectiveSize)
                              .map((offer) => (
                                <button
                                  key={offer.id}
                                  type="button"
                                  className={styles.expandPreset}
                                  onClick={() => chooseExpandPreset(offer.dishCount)}
                                >
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M3 8l9-4 9 4-9 4-9-4z" />
                                    <path d="M3 8v8l9 4 9-4V8" />
                                    <path d="M12 12v8" />
                                  </svg>
                                  <span className={styles.expandPresetLabel}>{offer.name}</span>
                                  <span className={styles.expandPresetPrice}>
                                    {formatPrice(offer.pricePence)}
                                  </span>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M9 6l6 6-6 6" />
                                  </svg>
                                </button>
                              ))}
                          </div>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className={styles.expandKeep}
                        onClick={() => patchEditor({ expandOpen: false })}
                      >
                        Keep my current box
                      </button>
                    </div>
                  ) : (
                    <>
                      {inBox ? (
                        <>
                          {/* Mobile in-box hero (CSS shows it ≤760 only). */}
                          <div className={styles.dmMobHero} aria-hidden="true">
                            <Image
                              src={editor.dish.imageUrl}
                              alt=""
                              width={430}
                              height={150}
                              className={styles.dmMobHeroImage}
                            />
                            <span className={styles.dmMobHeroPill}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blush)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M5 12.5l4.5 4.5L19 7" />
                              </svg>
                              In your box
                            </span>
                          </div>

                          {showSpaceBanner ? (
                            <div className={styles.spaceBanner}>
                              <span className={styles.spaceBannerCheck} aria-hidden="true">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blush)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12.5l4.5 4.5L19 7" />
                                </svg>
                              </span>
                              <span className={styles.spaceBannerText}>
                                <span className={styles.spaceBannerTitle}>Box updated</span>
                                <span className={styles.spaceBannerSub}>
                                  {usedCount} of {effectiveSize} dishes selected ·{' '}
                                  {remaining} {remaining === 1 ? 'space' : 'spaces'} remaining
                                </span>
                              </span>
                            </div>
                          ) : null}

                          {showInBoxHeader ? (
                            <div className={styles.inBoxHead}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M2.5 11.5h19" />
                                <path d="M4 11.5a8 8 0 0 0 16 0" />
                                <path d="M8.8 3.4c-.9 1.1.9 1.9 0 3" />
                                <path d="M14 3.4c-.9 1.1.9 1.9 0 3" />
                              </svg>
                              <span className={styles.inBoxHeadText}>
                                {dishInBoxQty}{' '}
                                <span className={styles.inBoxHeadName}>{editor.dish.title}</span>{' '}
                                already in your box
                              </span>
                            </div>
                          ) : null}

                          {/* ---- "What would you like to do?" ----------------- */}
                          <div className={styles.whatCard}>
                            <div className={styles.whatHead}>
                              <span className={styles.whatTitle}>What would you like to do?</span>
                            </div>

                            {editor.whatOpen ? (
                              <div className={styles.whatBody}>
                                <div className={styles.whatList}>
                                  {!(editor.chosen && adding) ? (
                                    /* Update card, holding version + count pickers. */
                                    <div
                                      className={styles.modeCard}
                                      data-selected={editing || undefined}
                                    >
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        className={styles.modeCardHead}
                                        onClick={setModeUpdate}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setModeUpdate();
                                          }
                                        }}
                                      >
                                        <span className={styles.modeDot} aria-hidden="true">
                                          {editing ? (
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                          ) : null}
                                        </span>
                                        <span className={styles.modeText}>
                                          <span className={styles.modeLabel}>
                                            {editorLines.length > 1
                                              ? 'Update an existing dish'
                                              : 'Update the dish already in your box'}
                                          </span>
                                          <span className={styles.modeSub}>
                                            {editorLines.length > 1
                                              ? 'Change one or more dishes already in your box.'
                                              : 'Make changes to the dish you’ve already added.'}
                                          </span>
                                        </span>
                                      </div>

                                      {showVersionPicker ? (
                                        <div className={styles.versionPicker}>
                                          <div className={styles.pickerRule} aria-hidden="true" />
                                          <span className={styles.pickerTitle}>
                                            Which dish would you like to update?
                                          </span>
                                          <div className={styles.versionList}>
                                            {editorLines.map((line) => (
                                              <button
                                                key={line.lineId}
                                                type="button"
                                                className={styles.versionRow}
                                                data-selected={
                                                  line.lineId === editor.targetLineId || undefined
                                                }
                                                onClick={() => selectVersion(line.lineId)}
                                              >
                                                <span className={styles.forkDot} aria-hidden="true">
                                                  {line.lineId === editor.targetLineId ? (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="M20 6L9 17l-5-5" />
                                                    </svg>
                                                  ) : null}
                                                </span>
                                                <span className={styles.versionText}>
                                                  <span className={styles.versionLabel}>
                                                    {personalisationSummary(
                                                      line.personalisation,
                                                      dishOptions,
                                                    )}
                                                  </span>
                                                  <span className={styles.versionQty}>
                                                    {line.quantity}{' '}
                                                    {line.quantity === 1
                                                      ? 'dish in your box'
                                                      : 'dishes in your box'}
                                                  </span>
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}

                                      {showCountPicker ? (
                                        <div className={styles.countPicker}>
                                          <div className={styles.pickerRuleWide} aria-hidden="true" />
                                          <span className={styles.pickerTitleWide}>
                                            How many would you like to update?
                                          </span>
                                          <div className={styles.countRow}>
                                            <button
                                              type="button"
                                              className={styles.countBtn}
                                              onClick={decUpdateCount}
                                              disabled={updCount <= 1}
                                              aria-label="Fewer dishes"
                                            >
                                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                                <path d="M5 12h14" />
                                              </svg>
                                            </button>
                                            <div className={styles.countValue}>
                                              <span className={styles.countNumber}>{updCount}</span>
                                              <span className={styles.countOf}>
                                                of {targetLine?.quantity ?? 0} dishes
                                              </span>
                                            </div>
                                            <span className={styles.countIncWrap}>
                                              <button
                                                type="button"
                                                className={styles.countBtn}
                                                onClick={incUpdateCount}
                                                aria-label="More dishes"
                                              >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                                  <path d="M12 5v14M5 12h14" />
                                                </svg>
                                              </button>
                                              {updTip ? (
                                                <span className={styles.countTip} role="status">
                                                  You can update up to {targetLine?.quantity ?? 0}{' '}
                                                  currently in your box.
                                                  <span
                                                    className={styles.countTipArrow}
                                                    aria-hidden="true"
                                                  />
                                                </span>
                                              ) : null}
                                            </span>
                                          </div>
                                          <div className={styles.countHelper}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                                              <path d="M21 3.5v4.2h-4.2" />
                                            </svg>
                                            <span>
                                              You can update all {targetLine?.quantity ?? 0}{' '}
                                              <span className={styles.countHelperName}>
                                                {editor.dish.title}
                                              </span>{' '}
                                              already in your box.
                                            </span>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {!editor.chosen || adding ? (
                                    <>
                                      {/* Add another card. */}
                                      <button
                                        type="button"
                                        className={styles.modeCard}
                                        data-selected={adding || undefined}
                                        onClick={setModeAdd}
                                      >
                                        <span className={styles.modeCardHead}>
                                          <span className={styles.modeDot} aria-hidden="true">
                                            {adding ? (
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 6L9 17l-5-5" />
                                              </svg>
                                            ) : null}
                                          </span>
                                          <span className={styles.modeText}>
                                            <span className={styles.modeLabel}>
                                              Add another of this dish
                                            </span>
                                            <span className={styles.modeSub}>
                                              {editorLines.length > 1
                                                ? 'Keep your current dishes and add a new one.'
                                                : 'Keep your current dish and add another, personalised to your preferences below.'}
                                            </span>
                                          </span>
                                        </span>
                                      </button>

                                      {adding ? (
                                        <div className={styles.addPanel}>
                                          {!boxFull ? (
                                            <>
                                              <div className={styles.addPanelTitle}>
                                                Personalise this one?
                                              </div>
                                              <div className={styles.addForkList}>
                                                <button
                                                  type="button"
                                                  className={styles.addForkOption}
                                                  data-selected={editor.personalise || undefined}
                                                  onClick={() => navSet({ personalise: true })}
                                                >
                                                  <span
                                                    className={styles.addForkDot}
                                                    aria-hidden="true"
                                                  >
                                                    {editor.personalise ? (
                                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M20 6L9 17l-5-5" />
                                                      </svg>
                                                    ) : null}
                                                  </span>
                                                  Yes, personalise it
                                                </button>
                                                <button
                                                  type="button"
                                                  className={styles.addForkOption}
                                                  data-selected={!editor.personalise || undefined}
                                                  onClick={() =>
                                                    navSet({ personalise: false, draft: abbys })
                                                  }
                                                >
                                                  <span
                                                    className={styles.addForkDot}
                                                    aria-hidden="true"
                                                  >
                                                    {!editor.personalise ? (
                                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M20 6L9 17l-5-5" />
                                                      </svg>
                                                    ) : null}
                                                  </span>
                                                  No — keep as Abby designed it
                                                </button>
                                              </div>
                                            </>
                                          ) : (
                                            <div
                                              role="button"
                                              tabIndex={0}
                                              className={styles.addFullCard}
                                              onClick={openExpand}
                                              onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                  event.preventDefault();
                                                  openExpand();
                                                }
                                              }}
                                            >
                                              <span
                                                className={styles.addFullCircle}
                                                aria-hidden="true"
                                              >
                                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M3 8l9-4 9 4-9 4-9-4z" />
                                                  <path d="M3 8v8l9 4 9-4V8" />
                                                  <path d="M12 12v8" />
                                                </svg>
                                              </span>
                                              <span className={styles.addFullTitle}>
                                                Your {boxLabel} is full
                                              </span>
                                              <span className={styles.addFullSub}>
                                                Make it larger to add another {editor.dish.title}.{' '}
                                                <span className={styles.addFullStrong}>
                                                  Your personalisation opens once there’s room.
                                                </span>
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ) : null}

                                      {editor.chosen && adding ? (
                                        <button
                                          type="button"
                                          className={styles.viewLink}
                                          onClick={() =>
                                            navSet({
                                              chosen: false,
                                              mode: null,
                                              personalise: false,
                                            })
                                          }
                                        >
                                          View other options
                                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M9 6l6 6-6 6" />
                                          </svg>
                                        </button>
                                      ) : null}
                                    </>
                                  ) : null}

                                  {!editor.chosen ? (
                                    /* Just browsing card. */
                                    <button
                                      type="button"
                                      className={styles.modeCard}
                                      data-selected={viewing || undefined}
                                      onClick={onJustViewing}
                                    >
                                      <span className={styles.modeCardHead}>
                                        <span className={styles.modeDot} aria-hidden="true">
                                          {viewing ? (
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                          ) : null}
                                        </span>
                                        <span className={styles.modeText}>
                                          <span className={styles.modeLabel}>
                                            Just browsing — no changes
                                          </span>
                                          <span className={styles.modeSub}>
                                            View details without making any changes.
                                          </span>
                                        </span>
                                      </span>
                                    </button>
                                  ) : null}

                                  {editor.chosen && !adding ? (
                                    <button
                                      type="button"
                                      className={styles.viewLink}
                                      onClick={() =>
                                        navSet({ chosen: false, mode: null, personalise: false })
                                      }
                                    >
                                      View other options
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M9 6l6 6-6 6" />
                                      </svg>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ) : editor.chosen ? (
                              /* Collapsed: the committed choice + reopen link. */
                              <div className={styles.whatClosed}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className={styles.chosenCard}
                                  onClick={() =>
                                    navSet({ mode: null, chosen: false, whatOpen: true })
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      navSet({ mode: null, chosen: false, whatOpen: true });
                                    }
                                  }}
                                >
                                  <span
                                    className={`${styles.modeDot} ${styles.modeDotChecked}`}
                                    aria-hidden="true"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                  </span>
                                  <span className={styles.modeText}>
                                    <span className={styles.modeLabel}>
                                      {adding
                                        ? 'Add another of this dish'
                                        : viewing
                                          ? 'Just browsing — no changes'
                                          : editorLines.length > 1
                                            ? 'Update an existing dish'
                                            : 'Update the dish already in your box'}
                                    </span>
                                    <span className={styles.modeSub}>
                                      {adding
                                        ? editorLines.length > 1
                                          ? 'Keep your current dishes and add a new one.'
                                          : 'Keep your current dish and add another.'
                                        : viewing
                                          ? 'View details without making any changes.'
                                          : editorLines.length > 1
                                            ? 'Change one or more dishes already in your box.'
                                            : 'Make changes to the dish you’ve already added.'}
                                    </span>
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className={styles.viewLink}
                                  onClick={() => navSet({ whatOpen: true, chosen: false })}
                                >
                                  View other options
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M9 6l6 6-6 6" />
                                  </svg>
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      {showPersonalise ? (
                  <div className={styles.persPanel} id="dm-personalise">
                    <button
                      type="button"
                      className={styles.persPanelHead}
                      onClick={() => patchEditor({ persOpen: !editor.persOpen })}
                      aria-expanded={editor.persOpen}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <line x1="4" y1="8" x2="20" y2="8" />
                        <circle cx="10" cy="8" r="2.4" fill="var(--surface-card)" />
                        <line x1="4" y1="16" x2="20" y2="16" />
                        <circle cx="15" cy="16" r="2.4" fill="var(--surface-card)" />
                      </svg>
                      <span className={styles.persPanelTitles}>
                        <span className={styles.persPanelTitle}>
                          {inBox && (editing || adding)
                            ? 'Personalise this dish'
                            : 'Would you like to personalise this dish?'}
                        </span>
                        {!editor.persOpen ? (
                          <span className={styles.persPanelSummary}>
                            {personalisationSummary(
                              enabled && isCustom ? draft : undefined,
                              dishOptions,
                            )}
                          </span>
                        ) : null}
                      </span>
                      {inBox && editing ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className={styles.persReset}
                          onClick={(event) => {
                            event.stopPropagation();
                            patchEditor({ personalise: true, draft: abbys });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.stopPropagation();
                              patchEditor({ personalise: true, draft: abbys });
                            }
                          }}
                        >
                          Reset to Abby&apos;s choice
                        </span>
                      ) : null}
                      <svg
                        className={styles.persPanelChevron}
                        data-open={editor.persOpen || undefined}
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--taupe)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {editor.persOpen ? (
                    <div className={styles.persPanelBody}>
              {inBox && editing ? (
                <p className={styles.dialogIntro}>
                  Your current choices are shown below.
                  <br />
                  <span className={styles.dialogIntroSoft}>
                    Price and nutrition update as you personalise.
                  </span>
                </p>
              ) : (
                <p className={styles.dialogIntro}>
                  Choose your portion size, swap proteins, change sides or adjust heat.{' '}
                  <span className={styles.dialogIntroSoft}>
                    Price and nutrition update as you personalise.
                  </span>
                </p>
              )}

              {!inBox ? (
              <div className={styles.fork}>
                <button
                  type="button"
                  className={styles.forkOption}
                  data-selected={enabled || undefined}
                  aria-pressed={enabled}
                  onClick={() => navSet({ personalise: true })}
                >
                  <span className={styles.forkDot} aria-hidden="true">
                    {enabled ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : null}
                  </span>
                  <span className={styles.forkText}>
                    <span className={styles.forkLabel}>
                      Yes, I&apos;d like to personalise this dish
                    </span>
                    {isCustom ? (
                      <span className={styles.forkSummary}>
                        {personalisationSummary(draft, dishOptions)}
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.forkOption}
                  data-selected={!enabled || undefined}
                  aria-pressed={!enabled}
                  onClick={() => navSet({ personalise: false, draft: abbys })}
                >
                  <span className={styles.forkDot} aria-hidden="true">
                    {!enabled ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : null}
                  </span>
                  <span className={styles.forkLabel}>No, keep as Abby designed it</span>
                </button>
              </div>
              ) : null}

              {enabled ? (
                <>
                  <div className={styles.persDivider} aria-hidden="true">
                    <span className={styles.persDividerLine} />
                    <span className={styles.persDividerMark}>⬥</span>
                    <span className={styles.persDividerLine} />
                  </div>

                  <div className={styles.optionsCard}>
                    <div className={styles.optionsHead}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                        <line x1="4" y1="8" x2="20" y2="8" />
                        <circle cx="10" cy="8" r="2.4" fill="var(--surface-raised)" />
                        <line x1="4" y1="16" x2="20" y2="16" />
                        <circle cx="15" cy="16" r="2.4" fill="var(--surface-raised)" />
                      </svg>
                      <span className={styles.optionsHeadLabel}>Personalisation options</span>
                    </div>

                    <OptionGroup
                      legend="Choose your portion size"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 11h18" />
                          <path d="M4.5 11a7.5 7.5 0 0 0 15 0" />
                          <path d="M12 3.5v2" />
                          <path d="M9 5.5h6" />
                        </svg>
                      }
                      group={dishOptions.portions}
                      selected={draft.portion}
                      onSelect={(portion) => setDraft({ ...draft, portion })}
                    />
                    <OptionGroup
                      legend="Choose your protein"
                      caption="Choose 1 or more"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 3C8 3 6 6 6 9c0 4 3 7 6 12 3-5 6-8 6-12 0-3-2-6-6-6z" />
                        </svg>
                      }
                      group={dishOptions.proteins}
                      selected={draft.protein}
                      onSelect={(protein) => setDraft({ ...draft, protein })}
                    />
                    <OptionGroup
                      legend="Choose your side"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 11h16M6 11c0-3 2.5-5 6-5s6 2 6 5M8 15h8M9 19h6" />
                        </svg>
                      }
                      group={dishOptions.sides}
                      selected={draft.side}
                      onSelect={(side) => setDraft({ ...draft, side })}
                    />

                    <fieldset className={`${styles.group} ${styles.groupRuled}`}>
                      <legend className={styles.groupTitle}>
                        <svg width="18" height="18" viewBox={CHILLI_VIEW_BOX} aria-hidden="true" style={{ display: 'block' }}>
                          <path fill="var(--green-forest)" d={CHILLI_STEM_PATH} />
                          <path fill="var(--terracotta)" d={CHILLI_BODY_PATH} />
                        </svg>
                        Choose your heat level
                      </legend>
                      <div className={styles.groupChips}>
                        {dishOptions.heatLevels.map((level) => (
                          <button
                            key={level.label}
                            type="button"
                            className={styles.optionChip}
                            data-selected={level.step === draft.heatStep || undefined}
                            aria-pressed={level.step === draft.heatStep}
                            onClick={() => setDraft({ ...draft, heatStep: level.step })}
                          >
                            <span className={styles.optionLabel}>{level.label}</span>
                            {level.step === draft.heatStep ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <p className={styles.abbysNote}>
                        {dishOptions.heatLevels.find((level) => level.step === abbys.heatStep)
                          ?.label ?? ''}{' '}
                        is Abby&apos;s choice.
                      </p>
                    </fieldset>

                    <div className={styles.readout}>
                      <div>
                        <span className={styles.readoutTitle}>Price change</span>
                        <span className={styles.readoutPriceRow}>
                          <span className={styles.readoutValue}>
                            {changePence > 0 ? `+${formatPrice(changePence)}` : '£0'}
                          </span>
                          <span className={styles.readoutValueSub}>
                            {changePence === 0
                              ? 'Abby’s choice — no extra cost'
                              : changePence > 0
                                ? 'Added to base price'
                                : 'Below base price'}
                          </span>
                        </span>
                      </div>
                      <div className={styles.readoutRule} aria-hidden="true" />
                      <div>
                        <span className={styles.readoutTitle}>Nutritional highlights</span>
                        <Nutrition dish={editor.dish} choice={draft} options={personalisation} />
                      </div>
                    </div>

                    <p className={styles.readoutNote}>
                      Price and nutrition update as you personalise.
                    </p>

                    <div className={styles.resetRule} aria-hidden="true" />
                    <button
                      type="button"
                      className={styles.reset}
                      onClick={() => setDraft(abbys)}
                      disabled={sameChoice(draft, abbys)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 8h9" />
                        <path d="M17 8h3" />
                        <circle cx="15" cy="8" r="2.2" fill="var(--surface-raised)" />
                        <path d="M4 16h3" />
                        <path d="M11 16h9" />
                        <circle cx="9" cy="16" r="2.2" fill="var(--surface-raised)" />
                      </svg>
                      Reset to defaults
                    </button>
                  </div>
                </>
              ) : null}
                    </div>
                    ) : null}
                  </div>
                      ) : null}

                      {inBox ? (
                        <div className={styles.dmMobJumps}>
                          {[
                            { label: 'Nutrition', target: 'dish-nutrition' },
                            { label: 'Ingredients & allergens', target: 'dish-ingredients' },
                            { label: 'How to heat', target: 'dish-heating' },
                          ].map((jump, index) => (
                            <span key={jump.target} className={styles.dmJumpWrap}>
                              {index > 0 ? (
                                <span className={styles.dmJumpSep} aria-hidden="true">
                                  ·
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className={styles.dmJump}
                                onClick={() =>
                                  document
                                    .getElementById(jump.target)
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
                              >
                                {jump.label}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M12 5v14" />
                                  <path d="M6 13l6 6 6-6" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            {!editor.expandOpen ? (
              <div className={styles.dialogFoot}>
                <div className={styles.dmCtaRow}>
                  <div className={styles.footNote}>
                    <span className={styles.footTitle}>{cta.title}</span>
                    <span className={styles.footSub}>{cta.sub}</span>
                    {cta.sub2 ? <span className={styles.footSub2}>{cta.sub2}</span> : null}
                  </div>
                  <span className={styles.footDivider} aria-hidden="true" />
                  <span className={styles.dmCtaWrap}>
                    <button
                      type="button"
                      className={styles.dmCta}
                      data-ghost={cta.ghost || undefined}
                      onClick={cta.action}
                      disabled={cta.disabled}
                    >
                      {cta.label}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="4" y1="12" x2="19" y2="12" />
                        <path d="M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* The template's flash toast: fixed above the mobile bar, slides away. */}
      <div className={styles.toast} data-show={toast || undefined} role="status">
        {toast}
      </div>

      {/* Floating "Top": kept in the DOM so it can fade rather than pop. */}
      <button
        type="button"
        className={styles.toTop}
        data-show={showTop || undefined}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={showTop ? undefined : -1}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
        <span className={styles.toTopLabel}>Top</span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function OptionGroup({
  legend,
  caption,
  icon,
  group,
  selected,
  onSelect,
}: {
  legend: string;
  /** Secondary note beside the legend, e.g. the protein group's "Choose 1 or more". */
  caption?: string;
  /** The template's 18px glyph beside the group title. */
  icon?: ReactNode;
  group: DishOption[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const abbys = group.find((option) => option.isAbbysChoice);

  /*
   * A group with nothing in it is not a group.
   *
   * This rendered the legend regardless, so a tenant with no authored option
   * groups produced four headings — "Choose your portion size", "Choose your
   * protein" — with no chips beneath any of them. It asked a question it had no
   * answers to, and it hid the real fault: the seeders never wrote option
   * groups at all, and the UI looked close enough to working to mask it.
   */
  if (group.length === 0) return null;

  return (
    <fieldset className={`${styles.group} ${styles.groupRuled}`}>
      <legend className={styles.groupTitle}>
        {icon}
        {legend}
        {caption ? <span className={styles.groupCaption}>{caption}</span> : null}
      </legend>
      <div className={styles.groupChips}>
        {group.map((option) => (
          <button
            key={option.key}
            type="button"
            className={styles.optionChip}
            data-selected={option.key === selected || undefined}
            aria-pressed={option.key === selected}
            onClick={() => onSelect(option.key)}
          >
            <span className={styles.optionLabel}>{option.label}</span>
            {option.detail ? <span className={styles.optionDetail}>{option.detail}</span> : null}
            {option.pricePence > 0 ? (
              <span className={styles.optionPrice}>+{formatPrice(option.pricePence)}</span>
            ) : null}
            {option.key === selected ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : null}
          </button>
        ))}
      </div>
      {abbys ? <p className={styles.abbysNote}>{abbys.label} is Abby&apos;s choice.</p> : null}
    </fieldset>
  );
}

/** Macros for the chosen portion, scaled from the catalogue's per-serving figures. */
export function Nutrition({
  dish,
  choice,
  options,
}: {
  dish: Dish;
  choice: CartPersonalisation;
  options: PersonalisationOptions;
}) {
  const chosen = findOption(options.portions, choice.portion);
  const base = gramsOf(findOption(options.portions, abbysKey(options.portions)));
  const grams = gramsOf(chosen);
  const factor = base > 0 && grams > 0 ? grams / base : 1;

  const cells = [
    dish.nutrition.calories === undefined
      ? null
      : { label: 'kcal', value: scaled(dish.nutrition.calories, factor) },
    dish.nutrition.proteinGrams === undefined
      ? null
      : { label: 'Protein', value: `${scaled(dish.nutrition.proteinGrams, factor)}g` },
    dish.nutrition.carbsGrams === undefined
      ? null
      : { label: 'Carbs', value: `${scaled(dish.nutrition.carbsGrams, factor)}g` },
    dish.nutrition.fatGrams === undefined
      ? null
      : { label: 'Fat', value: `${scaled(dish.nutrition.fatGrams, factor)}g` },
  ].filter((cell): cell is { label: string; value: string } => cell !== null);

  return (
    <div className={styles.nutrition}>
      {cells.map((cell) => (
        <span key={cell.label} className={styles.nutritionCell}>
          <span className={styles.nutritionLabel}>{cell.label}</span>
          <span className={styles.nutritionValue}>{cell.value}</span>
        </span>
      ))}
    </div>
  );
}
