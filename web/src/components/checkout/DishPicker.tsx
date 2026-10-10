'use client';

import Image from 'next/image';
import { useEffect, useState, type ComponentProps } from 'react';
import { DishInfoPanels } from '@/components/dish/DishInfoPanels';
import { PortionCard, PortionMacros } from '@/components/dish/PortionCard';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { MenuTopButton } from '@/components/menu/MenuTopButton';
import { SignatureInfo } from '@/components/sections/SignatureInfo';
import { HeatPips } from '@/components/ui';
import { dishCardTags } from '@/lib/menu/cardTags';
import type { MappedOptionGroup } from '@/lib/aonik/map';
import type { PersonalisationDraft } from '@/lib/aonik/personalisation';
import type {
  BoxPricing,
  Dish,
  Extra,
  HeatingInstruction,
} from '@/lib/aonik/types';
import { useCart } from '@/lib/cart/CartProvider';
import {
  expandedBoxPrice,
  linePortion,
  portionModel,
  portionSelection,
  type PortionKey,
} from '@/lib/dish/portions';
import { formatPrice, formatSignedPrice } from '@/lib/format';
import { FlowActions, useFlowActions } from './FlowActions';
import { FlowDialog } from './FlowDialog';
import { FlowShell } from './FlowShell';
import { Stepper, useDishLineActions } from './FlowLines';
import { FlowBack } from './ReviewReturn';
import { QuickStandardsLink, useQuickReturn } from './QuickStandardsReturn';
import { ReplacementNotice } from './ReplacementNotice';
import { useStepGuard } from './useStepGuard';
import styles from './Flow.module.css';

type Browse = Omit<
  ComponentProps<typeof MenuBrowser>,
  'dishes' | 'renderDish' | 'gridClassName'
>;
interface DishPickerProps {
  dishes: Dish[];
  catalogue?: Dish[];
  extras?: Extra[];
  pricing: BoxPricing;
  optionGroupsBySlug: Record<string, MappedOptionGroup[]>;
  heating: HeatingInstruction[];
  browse?: Browse;
  earliestDeliveryLabel?: string | null;
}

export function DishPicker(props: DishPickerProps) {
  return (
    <FlowActions>
      <Picker {...props} />
    </FlowActions>
  );
}

function Picker({
  dishes,
  catalogue = dishes,
  extras = [],
  pricing,
  optionGroupsBySlug,
  heating,
  browse,
  earliestDeliveryLabel,
}: DishPickerProps) {
  const cart = useCart();
  const actions = useFlowActions();
  const { change } = useDishLineActions();
  const guard = useStepGuard('dishes');
  const [detail, setDetail] = useState<{
    dish: Dish;
    portion: PortionKey;
  } | null>(null);
  const [full, setFull] = useState<{ dish: Dish; portion: PortionKey } | null>(
    null,
  );
  const [message, setMessage] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slug = params.get('dish');
    const portion = params.get('portion');
    if (!slug || (portion !== 'light' && portion !== 'full') || !cart.hydrated)
      return;
    const dish = catalogue.find((item) => item.slug === slug);
    params.delete('dish');
    params.delete('portion');
    history.replaceState(
      history.state,
      '',
      `${location.pathname}${params.size ? `?${params}` : ''}`,
    );
    if (!dish || !portionModel(optionGroupsBySlug[slug] ?? [])) return;
    setDetail({ dish, portion });
    if (cart.boxSize !== null && cart.dishCount >= cart.boxSize)
      setFull({ dish, portion });
  }, [
    catalogue,
    optionGroupsBySlug,
    cart.hydrated,
    cart.boxSize,
    cart.dishCount,
  ]);
  useQuickReturn('dishes', (record) => {
    const dish = catalogue.find((item) => item.slug === record.id);
    const portion = linePortion(record.selection);
    if (dish && portion && portionModel(optionGroupsBySlug[dish.slug] ?? []))
      setDetail({ dish, portion });
  });
  const nextSize = (cart.boxSize ?? pricing.custom.minDishes) + 1;
  const nextPrice = expandedBoxPrice(pricing, nextSize);
  const add = async (dish: Dish, portion: PortionKey, expanded = false) => {
    const model = portionModel(optionGroupsBySlug[dish.slug] ?? []);
    if (!model || actions.busy) return;
    if (!expanded && cart.boxSize !== null && cart.dishCount >= cart.boxSize) {
      setFull({ dish, portion });
      return;
    }
    actions.commitDishUndo();
    if (
      await actions.run(() =>
        cart.addLine({
          dishId: dish.id,
          slug: dish.slug,
          title: dish.title,
          imageUrl: dish.imageUrl,
          quantity: 1,
          personalisation: portionSelection(portion),
          surchargePence:
            model.choices.find((choice) => choice.key === portion)!.pricePence +
            (dish.upgradePence ?? 0),
        }),
      )
    )
      setMessage(`${dish.title} added to your box`);
  };
  const card = (dish: Dish) => {
    const tags = dishCardTags(dish);
    const groups = optionGroupsBySlug[dish.slug] ?? [];
    const model = portionModel(groups);
    return (
      <article className={styles.card}>
        <div className={styles.badges}>
          {tags.cream.map((tag) => (
            <span className={styles.tag} key={tag}>
              {tag}
            </span>
          ))}
          {tags.isNew && <span className={styles.newTag}>New</span>}
          {dish.isSignature && (
            <>
              <SignatureInfo wholePill />
              {dish.upgradePence ? (
                <span className={styles.signature}>
                  {formatSignedPrice(dish.upgradePence)} upgrade
                </span>
              ) : null}
            </>
          )}
        </div>
        <div className={styles.cardUpper}>
          <Image
            className={styles.photo}
            src={dish.imageUrl}
            alt={dish.imageAlt ?? dish.title}
            width={500}
            height={375}
          />
          <div className={styles.cardBody}>
            <h2 className={styles.cardTitle}>{dish.title}</h2>
            {dish.parts && <p>{dish.parts}</p>}
            <div className={styles.heatRow}>{dish.heat && <HeatPips heat={dish.heat} />}
            <button
              className={styles.detailsTrigger}
              type="button"
              aria-label={`View details for ${dish.title}`}
              onClick={() => setDetail({ dish, portion: 'light' })}
            >
              View details →
            </button>
            </div>
          </div>
        </div>
        <div className={styles.portionRows}>
          {model ? (
            model.choices.map((choice) => {
              const portion = choice.key as PortionKey;
              const lines = cart.lines.filter(
                (line) =>
                  line.dishId === dish.id &&
                  linePortion(line.personalisation) === portion,
              );
              const quantity = lines.reduce((n, line) => n + line.quantity, 0);
              return (
                <div className={styles.portionRow} key={choice.key}>
                  <div>
                    <strong>{choice.label}</strong>
                    <small>{choice.detail}</small>
                  </div>
                  <span
                    className={styles.portionPrice}
                    data-included={choice.pricePence === 0 || undefined}
                  >
                    {choice.pricePence === 0
                      ? 'Included'
                      : formatSignedPrice(choice.pricePence)}
                  </span>
                  {quantity ? (
                    <Stepper
                      quantity={quantity}
                      label={`${dish.title}, ${choice.label}`}
                      disabled={actions.busy}
                      focusKey={`dish-${dish.id}-${portion}`}
                      onChange={(next) => {
                        setMessage('');
                        if (next > quantity) void add(dish, portion);
                        else {
                          const line = lines[lines.length - 1];
                          change(line, line.quantity - 1);
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={styles.add}
                      aria-label={`Add ${choice.label} ${dish.title} to your box`}
                      disabled={actions.busy}
                      onClick={() => {
                        setMessage('');
                        void add(dish, portion);
                      }}
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className={styles.notice}>
              Portion options are currently unavailable.
            </p>
          )}
        </div>
      </article>
    );
  };
  const menu = browse ?? {
    totalCount: dishes.length,
    limit: dishes.length,
    facetGroups: [],
    filters: {},
    query: '',
    sort: 'recommended' as const,
    sorts: ['recommended'] as const,
  };
  return (
    <div className={styles.page}>
      <FlowBack step="dishes" className={styles.back} />
      <FlowShell
        step="dishes"
        pricing={pricing}
        dishes={catalogue}
        extras={extras}
        groups={optionGroupsBySlug}
        blocked={guard.blocked}
        earliestDeliveryLabel={earliestDeliveryLabel}
      >
        <h1 className={styles.heading} id="menu-title" tabIndex={-1}>
          Add dishes
        </h1>
        <p className={styles.intro}>
          Choose from our chef-prepared dishes. Pick a portion and add it to
          your box.
        </p>
        <ReplacementNotice />
        {cart.lines.some(
          (line) => linePortion(line.personalisation) === null,
        ) && (
          <p className={styles.notice}>
            Some dishes have previous choices. We’ve kept the rest of your box.
            Remove each affected dish and choose its replacement below.
          </p>
        )}
        <MenuBrowser
          {...menu}
          dishes={dishes}
          renderDish={card}
          gridClassName={styles.grid}
        />
        <MenuTopButton label="Back to top of dishes" />
      </FlowShell>
      <p className="visuallyHidden" role="status">
        {message}
      </p>
      {detail && !full && (
        <FlowDialog
          title={detail.dish.title}
          onClose={() => setDetail(null)}
          media={
            <Image
              className={styles.detailPhoto}
              src={detail.dish.imageUrl}
              alt={detail.dish.imageAlt ?? detail.dish.title}
              width={700}
              height={480}
            />
          }
        >
          {detail.dish.parts && <p>{detail.dish.parts}</p>}
          <p>{detail.dish.description}</p>
          {detail.dish.heat && <HeatPips heat={detail.dish.heat} />}
          <p>
            Flavour built properly.{' '}
            <QuickStandardsLink
              source="dishes"
              id={detail.dish.slug}
              name={detail.dish.title}
              selection={{ portion: detail.portion }}
            />
          </p>
          <DishInfoPanels
            key={detail.dish.id}
            dish={detail.dish}
            heating={heating}
            compact
            selection={portionSelection(detail.portion) ?? null}
            optionGroups={optionGroupsBySlug[detail.dish.slug] ?? []}
            afterNutrition={
              <>
                <PortionCard
                  groups={optionGroupsBySlug[detail.dish.slug] ?? []}
                  value={detail.portion}
                  onChange={(portion) => setDetail({ ...detail, portion })}
                  disabled={actions.busy}
                />
                <button
                  type="button"
                  className={styles.cta}
                  disabled={
                    actions.busy ||
                    !portionModel(optionGroupsBySlug[detail.dish.slug] ?? [])
                  }
                  onClick={() => void add(detail.dish, detail.portion)}
                >
                  Add to your box
                </button>
              </>
            }
          />
          <h3>You might also like</h3>
          <div className={styles.chips}>
            {catalogue
              .filter((dish) => dish.id !== detail.dish.id)
              .slice(0, 4)
              .map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => setDetail({ dish, portion: 'light' })}
                >
                  {dish.title}
                </button>
              ))}
          </div>
        </FlowDialog>
      )}
      {full && (
        <FlowDialog
          title={`Your ${cart.boxSize}-dish box is full`}
          short
          onClose={() => setFull(null)}
        >
          <p>Increase your box size or remove a dish to add another.</p>
          {nextPrice !== null && (
            <>
              <p>
                Box price before upgrades and extras: {formatPrice(nextPrice)}.
              </p>
              <button
                type="button"
                className={styles.cta}
                disabled={actions.busy}
                onClick={async () => {
                  const intended = full;
                  if (
                    await actions.run(() =>
                      cart.setBoxSize(
                        nextSize,
                        !pricing.presets.some(
                          (preset) => preset.dishCount === nextSize,
                        ),
                      ),
                    )
                  ) {
                    setFull(null);
                    await add(intended.dish, intended.portion, true);
                  }
                }}
              >
                Expand to {nextSize} dishes · {formatPrice(nextPrice)}
              </button>
            </>
          )}
          <button
            className={styles.textButton}
            type="button"
            onClick={() => setFull(null)}
          >
            Keep my current box
          </button>
        </FlowDialog>
      )}
    </div>
  );
}

/** Kept for legacy editor consumers while its old component is retired. Never scales nutrition. */
export function Nutrition({
  dish,
  choice,
}: {
  dish: Dish;
  choice: PersonalisationDraft;
  optionGroups: MappedOptionGroup[];
}) {
  return (
    <PortionMacros
      dish={dish}
      portion={choice.portion?.[0] === 'full' ? 'full' : 'light'}
    />
  );
}
export const CARD_HEAT_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Mild',
  2: 'Medium',
  3: 'Hot',
};
