'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DishInfoPanels } from '@/components/dish/DishInfoPanels';
import { Button, HeatPips, NutritionTag } from '@/components/ui';
import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from '@/components/ui/glyphs';
import {
  DIETARY_TAGS,
  HEAT_STEPS,
  MEAL_TYPES,
  type Dish,
  type DishOption,
  type HeatingInstruction,
  type PersonalisationOptions,
} from '@/lib/aonik/types';
import { useCart, type CartLine, type CartPersonalisation } from '@/lib/cart/CartProvider';
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
  personalisation: PersonalisationOptions;
  /** Reheating guidance for the personaliser's shared info panels. */
  heating: HeatingInstruction[];
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
function abbysChoice(dish: Dish, options: PersonalisationOptions): CartPersonalisation {
  return {
    portion: abbysKey(options.portions),
    protein: abbysKey(options.proteins),
    side: abbysKey(options.sides),
    heatStep: HEAT_STEPS[dish.heat],
  };
}

function sameChoice(a: CartPersonalisation, b: CartPersonalisation): boolean {
  return (
    a.portion === b.portion &&
    a.protein === b.protein &&
    a.side === b.side &&
    a.heatStep === b.heatStep
  );
}

/** Per-unit surcharge for a personalised line: the selected options, summed. */
function choiceSurcharge(choice: CartPersonalisation, options: PersonalisationOptions): number {
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

interface Editor {
  dish: Dish;
  /** Set when editing a line already in the box, rather than adding a new one. */
  lineId: string | null;
  quantity: number;
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
const CARD_HEAT_LABELS: Record<number, string> = { 1: 'Mild', 2: 'Medium', 3: 'Hot' };

export function DishPicker({ dishes, personalisation, heating }: DishPickerProps) {
  const router = useRouter();
  const { boxSize, lines, hydrated, addLine, removeLine, setQuantity } = useCart();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<PickerFilters>(NO_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [draft, setDraft] = useState<CartPersonalisation | null>(null);

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

  const openEditor = useCallback(
    (dish: Dish, line?: CartLine) => {
      editorOpenerRef.current = document.activeElement as HTMLElement | null;
      setEditor({ dish, lineId: line?.lineId ?? null, quantity: line?.quantity ?? 1 });
      setEnabled(Boolean(line?.personalisation));
      setDraft(line?.personalisation ?? abbysChoice(dish, personalisation));
    },
    [personalisation],
  );

  const closeEditor = useCallback(() => {
    setEditor(null);
    setDraft(null);
    setEnabled(false);
    // Hand focus back to the control that opened the dialog.
    editorOpenerRef.current?.focus();
    editorOpenerRef.current = null;
  }, []);

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

  const abbys = editor ? abbysChoice(editor.dish, personalisation) : null;
  const isCustom = Boolean(enabled && draft && abbys && !sameChoice(draft, abbys));
  const changePence = isCustom && draft ? choiceSurcharge(draft, personalisation) : 0;

  const commit = useCallback(() => {
    if (!editor || !draft || !abbys) return;
    const custom = enabled && !sameChoice(draft, abbys);
    const dish = editor.dish;

    if (editor.lineId) removeLine(editor.lineId);

    addLine({
      dishId: dish.id,
      slug: dish.slug,
      title: dish.title,
      imageUrl: dish.imageUrl,
      quantity: editor.quantity,
      personalisation: custom ? draft : undefined,
      surchargePence:
        (dish.upgradePence ?? 0) + (custom ? choiceSurcharge(draft, personalisation) : 0),
    });

    closeEditor();
  }, [editor, draft, abbys, enabled, personalisation, addLine, removeLine, closeEditor]);

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
                    onClick={() => router.push(`/menu/${dish.slug}`)}
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
                        onClick={() => router.push(`/menu/${dish.slug}`)}
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
                      <NutritionTag dot="protein">
                        Protein {dish.nutrition.proteinGrams}g
                      </NutritionTag>
                      <NutritionTag dot="fibre">Fibre {dish.nutrition.fibreGrams}g</NutritionTag>
                    </div>

                    <div className={styles.mMeta}>
                      <span className={styles.mMetaPips}>
                        {[1, 2, 3].map((step) => (
                          <CardPip key={step} size={13} lit={step <= heatStep} />
                        ))}
                      </span>
                      <span>{mMeta}</span>
                    </div>

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
                                onClick={() => openEditor(dish, single)}
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
                                  personalisation,
                                )}
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.persLink}
                            onClick={() => openEditor(dish, single ?? undefined)}
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

                    <div className={styles.actions}>
                      <Link href={`/menu/${dish.slug}`} className={styles.view}>
                        View
                      </Link>

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
              <Image
                src={editor.dish.imageUrl}
                alt=""
                width={44}
                height={44}
                className={styles.dialogThumb}
              />
              <div className={styles.dialogTitles}>
                <span className={styles.dialogEyebrow}>
                  {editor.lineId ? 'Personalise this dish' : 'Would you like to personalise this dish?'}
                </span>
                <span id="personalise-title" className={styles.dialogName}>
                  {editor.dish.title}
                </span>
              </div>
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

            <div className={styles.dialogBody}>
              <p className={styles.dialogIntro}>
                Choose your portion size, swap proteins, change sides or adjust heat.{' '}
                <span className={styles.dialogIntroSoft}>
                  Price and nutrition update as you personalise.
                </span>
              </p>

              <div className={styles.fork}>
                <button
                  type="button"
                  className={styles.forkOption}
                  data-selected={enabled || undefined}
                  aria-pressed={enabled}
                  onClick={() => setEnabled(true)}
                >
                  <span className={styles.forkLabel}>
                    Yes, I&apos;d like to personalise this dish
                  </span>
                  {isCustom ? (
                    <span className={styles.forkSummary}>
                      {personalisationSummary(draft, personalisation)}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={styles.forkOption}
                  data-selected={!enabled || undefined}
                  aria-pressed={!enabled}
                  onClick={() => {
                    setEnabled(false);
                    setDraft(abbys);
                  }}
                >
                  <span className={styles.forkLabel}>No, keep as Abby designed it</span>
                </button>
              </div>

              {enabled ? (
                <>
                  <p className={styles.optionsHead}>Personalisation options</p>

                  <OptionGroup
                    legend="Choose your portion size"
                    group={personalisation.portions}
                    selected={draft.portion}
                    onSelect={(portion) => setDraft({ ...draft, portion })}
                  />
                  <OptionGroup
                    legend="Choose your protein"
                    caption="Choose 1 or more"
                    group={personalisation.proteins}
                    selected={draft.protein}
                    onSelect={(protein) => setDraft({ ...draft, protein })}
                  />
                  <OptionGroup
                    legend="Choose your side"
                    group={personalisation.sides}
                    selected={draft.side}
                    onSelect={(side) => setDraft({ ...draft, side })}
                  />

                  <fieldset className={styles.group}>
                    <legend className={styles.groupTitle}>Choose your heat level</legend>
                    <div className={styles.groupChips}>
                      {personalisation.heatLevels.map((level) => (
                        <button
                          key={level.label}
                          type="button"
                          className={styles.optionChip}
                          data-selected={level.step === draft.heatStep || undefined}
                          aria-pressed={level.step === draft.heatStep}
                          onClick={() => setDraft({ ...draft, heatStep: level.step })}
                        >
                          <span className={styles.optionLabel}>{level.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className={styles.abbysNote}>
                      {personalisation.heatLevels.find((level) => level.step === abbys.heatStep)
                        ?.label ?? ''}{' '}
                      is Abby&apos;s choice.
                    </p>
                  </fieldset>

                  <div className={styles.readout}>
                    <div className={styles.readoutBlock}>
                      <span className={styles.readoutTitle}>Price change</span>
                      <span className={styles.readoutValue}>
                        {changePence > 0 ? `+${formatPrice(changePence)}` : '+£0'}
                      </span>
                    </div>
                    <div className={styles.readoutBlock}>
                      <span className={styles.readoutTitle}>Nutritional highlights</span>
                      <Nutrition dish={editor.dish} choice={draft} options={personalisation} />
                    </div>
                  </div>

                  <p className={styles.readoutNote}>
                    Price and nutrition update as you personalise.
                  </p>

                  <button
                    type="button"
                    className={styles.reset}
                    onClick={() => setDraft(abbys)}
                    disabled={sameChoice(draft, abbys)}
                  >
                    Reset to defaults
                  </button>
                </>
              ) : null}

              {/* The template's detail column: the dish's own facts, shown either
                  way, above the three shared info panels. */}
              <div className={styles.glance}>
                <p className={styles.glanceTitle}>At a glance</p>
                <div className={styles.glanceTags}>
                  {editor.dish.dietary.map((tag) => (
                    <span key={tag} className={styles.glanceTag}>
                      {tag}
                    </span>
                  ))}
                  {editor.dish.nutrition.calories !== undefined &&
                  CALORIE_BANDS[LOW_CALORIE_BAND](editor.dish.nutrition.calories) ? (
                    <span className={styles.glanceTag}>{LOW_CALORIE_BAND}</span>
                  ) : null}
                </div>
                <div className={styles.glanceHeat}>
                  <span className={styles.glanceHeatLabel}>Heat</span>
                  <HeatPips heat={editor.dish.heat} />
                </div>
              </div>

              {/* Nutrition, ingredients & allergens and reheating come from the
                  shared panels, which state plainly when allergens are unpublished
                  instead of guessing them. */}
              <DishInfoPanels dish={editor.dish} heating={heating} />
            </div>

            <div className={styles.dialogFoot}>
              <div className={styles.footNote}>
                <span className={styles.footTitle}>
                  {editor.dish.isSignature
                    ? "Abby's Signature"
                    : isCustom
                      ? 'Personalised your way'
                      : 'As Abby designed it'}
                </span>
                <span className={styles.footSub}>
                  {editor.dish.isSignature && editor.dish.upgradePence
                    ? `+${formatPrice(editor.dish.upgradePence)} signature upgrade${
                        changePence > 0 ? ` · +${formatPrice(changePence)} personalisation` : ''
                      }`
                    : changePence > 0
                      ? `+${formatPrice(changePence)} personalisation`
                      : 'No extra cost'}
                </span>
              </div>
              <Button variant="dark" onClick={commit}>
                {editor.lineId ? 'Save changes' : 'Add to your box'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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

function OptionGroup({
  legend,
  caption,
  group,
  selected,
  onSelect,
}: {
  legend: string;
  /** Secondary note beside the legend, e.g. the protein group's "Choose 1 or more". */
  caption?: string;
  group: DishOption[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const abbys = group.find((option) => option.isAbbysChoice);

  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupTitle}>
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
          </button>
        ))}
      </div>
      {abbys ? <p className={styles.abbysNote}>{abbys.label} is Abby&apos;s choice.</p> : null}
    </fieldset>
  );
}

/** Macros for the chosen portion, scaled from the catalogue's per-serving figures. */
function Nutrition({
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
    { label: 'Protein', value: `${scaled(dish.nutrition.proteinGrams, factor)}g` },
    dish.nutrition.carbsGrams === undefined
      ? null
      : { label: 'Carbs', value: `${scaled(dish.nutrition.carbsGrams, factor)}g` },
    { label: 'Fibre', value: `${scaled(dish.nutrition.fibreGrams, factor)}g` },
  ].filter((cell): cell is { label: string; value: string } => cell !== null);

  return (
    <>
      <span className={styles.nutritionCaption}>
        Per serving — {chosen?.label ?? ''} {chosen?.detail ?? ''}
      </span>
      <div className={styles.nutrition}>
        {cells.map((cell) => (
          <span key={cell.label} className={styles.nutritionCell}>
            <span className={styles.nutritionLabel}>{cell.label}</span>
            <span className={styles.nutritionValue}>{cell.value}</span>
          </span>
        ))}
      </div>
    </>
  );
}
