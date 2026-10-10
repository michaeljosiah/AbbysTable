'use client';

import Image from 'next/image';
import { useMemo, useState, type ReactNode } from 'react';
import { DishInfoPanels } from '@/components/dish/DishInfoPanels';
import { encodeSelection, type MappedOptionGroup } from '@/lib/aonik/map';
import { extraOptionKind } from '@/lib/aonik/extra-options';
import {
  localSurcharge,
  selectionDraft,
  type PersonalisationDraft,
} from '@/lib/aonik/personalisation';
import type { BoxPricing, Dish, Extra } from '@/lib/aonik/types';
import { extraUnitPence, useCart } from '@/lib/cart/CartProvider';
import { extraLinePersonalisation } from '@/lib/cart/demoStorage';
import { formatPrice } from '@/lib/format';
import { allergenLine } from '@/lib/allergens';
import { FlowActions, useFlowActions } from './FlowActions';
import { useReviewReturn } from './ReviewReturn';
import { FlowShell } from './FlowShell';
import { FlowDialog } from './FlowDialog';
import { ContinueLink } from './ContinueLink';
import { Stepper, useExtraLineActions } from './FlowLines';
import { useStepGuard } from './useStepGuard';
import { QuickStandardsLink, useQuickReturn } from './QuickStandardsReturn';
import styles from './Flow.module.css';

interface ExtrasStepProps {
  extras: Extra[];
  pricing: BoxPricing;
  dishes?: Dish[];
  optionGroupsBySlug?: Record<string, MappedOptionGroup[]>;
  earliestDeliveryLabel: string | null;
  heading: ReactNode;
}
type Modal = {
  extra: Extra;
  kind: 'details' | 'options';
  draft: PersonalisationDraft;
};
export function ExtrasStep(props: ExtrasStepProps) {
  return (
    <FlowActions>
      <Extras {...props} />
    </FlowActions>
  );
}

function Extras({
  extras,
  pricing,
  dishes = [],
  optionGroupsBySlug = {},
  heading,
  earliestDeliveryLabel,
}: ExtrasStepProps) {
  const cart = useCart();
  const actions = useFlowActions();
  const { change } = useExtraLineActions();
  const editing = useReviewReturn();
  const guard = useStepGuard('extras');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recommended');
  const [modal, setModal] = useState<Modal | null>(null);
  const [message, setMessage] = useState('');
  useQuickReturn('extras', (record) => {
    const extra = extras.find((item) => item.id === record.id);
    if (extra)
      setModal({
        extra,
        kind: 'details',
        draft: selectionDraft(extra.optionGroups, record.selection),
      });
  });
  const searched = useMemo(
    () =>
      extras.filter((extra) =>
        `${extra.name} ${extra.description} ${extra.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [extras, query],
  );
  const categories = [
    ...new Set(extras.map((extra) => extra.category).filter(Boolean)),
  ];
  const priceFrom = (extra: Extra) =>
    extra.pricePence +
    (extra.optionGroups[0]?.choices.length
      ? Math.min(
          ...extra.optionGroups[0].choices.map((choice) => choice.pricePence),
        )
      : 0);
  const visible = searched
    .filter((extra) => !category || extra.category === category)
    .sort((a, b) =>
      sort === 'low'
        ? priceFrom(a) - priceFrom(b)
        : sort === 'high'
          ? priceFrom(b) - priceFrom(a)
          : 0,
    );
  const supported = (extra: Extra) =>
    extra.optionGroups.length === 0 ||
    (extra.optionGroups.length === 1 &&
      extra.optionGroups[0].selectionMode === 'One' &&
      extra.optionGroups[0].choices.length > 0 &&
      extra.optionGroups[0].valid !== false);
  const open = (extra: Extra, kind: Modal['kind']) => {
    const group = extra.optionGroups[0];
    const selected = cart.extras.filter((line) => line.variantId === extra.id);
    const draft = selectionDraft(extra.optionGroups);
    if (group && kind === 'options') {
      const first = group.choices.find(
        (choice) =>
          !selected.some((line) =>
            selectionDraft(
              extra.optionGroups,
              extraLinePersonalisation(line, extra.optionGroups),
            )[group.key]?.includes(choice.key),
          ),
      );
      if (first) draft[group.key] = [first.key];
    } else if (selected[0])
      Object.assign(
        draft,
        selectionDraft(
          extra.optionGroups,
          extraLinePersonalisation(selected[0], extra.optionGroups),
        ),
      );
    setModal({ extra, kind, draft });
  };
  const add = async (
    extra: Extra,
    draft = selectionDraft(extra.optionGroups),
  ) => {
    if (!supported(extra)) return;
    const selection = encodeSelection(extra.optionGroups, draft);
    if (await actions.run(() => cart.addExtra(extra.id, 1, selection))) {
      setMessage(`${extra.name} added to your box`);
      setModal(null);
      const key = `extra-${extra.id}-${JSON.stringify(selection ?? {})}`;
      setTimeout(
        () =>
          Array.from(
            document.querySelectorAll<HTMLElement>(
              `[data-flow-increase="${CSS.escape(key)}"]`,
            ),
          )
            .find(
              (element) =>
                element.getClientRects().length && !element.closest('[inert]'),
            )
            ?.focus(),
        0,
      );
    }
  };
  const row = (extra: Extra, choiceKey?: string) => {
    const group = extra.optionGroups[0];
    const line = cart.extras.find(
      (candidate) =>
        candidate.variantId === extra.id &&
        (!group ||
          selectionDraft(
            extra.optionGroups,
            extraLinePersonalisation(candidate, extra.optionGroups),
          )[group.key]?.includes(choiceKey ?? group.defaultChoiceKey)),
    );
    if (!line) return null;
    const choice = group?.choices.find(
      (candidate) => candidate.key === choiceKey,
    );
    const unit = cart.isServerCart
      ? line.unitPricePence
      : extraUnitPence(line, extra);
    return (
      <div className={styles.portionRow} key={line.lineId}>
        <div>
          {choice && <strong>{choice.label}</strong>}
          <small>
            {unit === undefined ? 'Price unavailable' : formatPrice(unit)}
          </small>
        </div>
        <Stepper
          quantity={line.quantity}
          label={[extra.name, choice?.label].filter(Boolean).join(', ')}
          disabled={actions.busy}
          focusKey={`extra-${extra.id}-${JSON.stringify(line.personalisation ?? {})}`}
          onChange={(quantity) => {
            setMessage('');
            change(line, quantity, extra.name);
          }}
        />
      </div>
    );
  };
  const countChoice = (extra: Extra, key: string) =>
    cart.extras
      .filter(
        (line) =>
          line.variantId === extra.id &&
          selectionDraft(
            extra.optionGroups,
            extraLinePersonalisation(line, extra.optionGroups),
          )[extra.optionGroups[0].key]?.includes(key),
      )
      .reduce((total, line) => total + line.quantity, 0);
  const modalExtra = modal?.extra;
  const modalDish: Dish | null = modalExtra
    ? {
        id: modalExtra.id,
        slug: modalExtra.slug ?? '',
        title: modalExtra.name,
        description: modalExtra.longDescription,
        imageUrl: modalExtra.imageUrl,
        tags: [],
        isSignature: false,
        isFeatured: false,
        wellness: [],
        dietary: [],
        nutrition: modalExtra.nutrition,
        ingredients: modalExtra.ingredients,
        allergens:
          modalExtra.allergens === undefined
            ? undefined
            : allergenLine(modalExtra.allergens),
        precautionaryStatement: modalExtra.precautionaryStatement,
        contentState: modalExtra.contentState,
      }
    : null;
  return (
    <FlowShell
      step="extras"
      pricing={pricing}
      dishes={dishes}
      extras={extras}
      groups={optionGroupsBySlug}
      blocked={guard.blocked}
      earliestDeliveryLabel={earliestDeliveryLabel}
    >
      {heading}
      {!editing && cart.extras.length === 0 && (
        <ContinueLink
          className={styles.textButton}
          href="/box/review"
          disabled={actions.busy || guard.blocked}
        >
          No extras? Skip →
        </ContinueLink>
      )}
      <div className={styles.search}>
        <input
          type="search"
          aria-label="Search extras"
          placeholder="Search extras"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Sort extras"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="recommended">Recommended</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      <div className={styles.chips} aria-label="Extra categories">
        <button
          type="button"
          aria-pressed={!category}
          onClick={() => setCategory('')}
        >
          All ({searched.length})
        </button>
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            {name} ({searched.filter((extra) => extra.category === name).length}
            )
          </button>
        ))}
      </div>
      <p role="status">
        Showing {visible.length} {visible.length === 1 ? 'extra' : 'extras'}
      </p>
      <ul className={styles.grid}>
        {visible.map((extra) => {
          const group = extra.optionGroups[0];
          const selected = cart.extras.filter(
            (line) => line.variantId === extra.id,
          );
          const rows = group
            ? group.choices
                .map((choice) => row(extra, choice.key))
                .filter(Boolean)
            : [row(extra)].filter(Boolean);
          const kind = group ? extraOptionKind(group) : 'option';
          return (
            <li key={extra.id}>
              <article className={styles.card}>
                <div className={styles.cardUpper}>
                  {extra.imageUrl && (
                    <Image
                      className={styles.photo}
                      src={extra.imageUrl}
                      alt={extra.name}
                      width={500}
                      height={375}
                    />
                  )}
                  <div className={styles.cardBody}>
                    {extra.category && (
                      <span className={styles.eyebrow}>{extra.category}</span>
                    )}
                    <h2 className={styles.cardTitle}>{extra.name}</h2>
                    <p>{extra.description}</p>
                    <button
                      type="button"
                      className={styles.detailsTrigger}
                      onClick={() => open(extra, 'details')}
                      aria-label={`View details for ${extra.name}`}
                    >
                      View details →
                    </button>
                  </div>
                </div>
                <div className={styles.portionRows}>
                  {!supported(extra) ? (
                    <p className={styles.notice}>
                      Options are currently unavailable.
                    </p>
                  ) : (
                    <>
                      {rows}
                      {group ? (
                        rows.length === 0 ? (
                          <div className={styles.portionRow}>
                            <div>
                              <strong>
                                From {formatPrice(priceFrom(extra))}
                              </strong>
                              <small>
                                {group.choices.length}{' '}
                                {kind === 'heat'
                                  ? 'heat levels'
                                  : kind === 'size'
                                    ? 'sizes'
                                    : 'options'}
                              </small>
                            </div>
                            <button
                              className={styles.add}
                              type="button"
                              disabled={actions.busy}
                              onClick={() => open(extra, 'options')}
                            >
                              Choose {kind}
                            </button>
                          </div>
                        ) : (
                          selected.length < group.choices.length && (
                            <button
                              className={styles.textButton}
                              type="button"
                              disabled={actions.busy}
                              onClick={() => open(extra, 'options')}
                            >
                              + Add another{' '}
                              {kind === 'heat' ? 'heat level' : kind}
                            </button>
                          )
                        )
                      ) : (
                        rows.length === 0 && (
                          <div className={styles.portionRow}>
                            <strong>{formatPrice(extra.pricePence)}</strong>
                            <button
                              className={styles.add}
                              type="button"
                              disabled={actions.busy}
                              onClick={() => void add(extra)}
                            >
                              Add
                            </button>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p>
          No extras match your search or category.{' '}
          <button
            className={styles.textButton}
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('');
            }}
          >
            Clear search and category
          </button>
        </p>
      )}
      <p className="visuallyHidden" role="status">
        {message}
      </p>
      {modal && modalDish && (
        <FlowDialog
          title={modal.extra.name}
          short={modal.kind === 'options'}
          onClose={() => setModal(null)}
          media={
            modal.kind === 'details' && modal.extra.imageUrl ? (
              <Image
                className={styles.detailPhoto}
                src={modal.extra.imageUrl}
                alt={modal.extra.name}
                width={700}
                height={480}
              />
            ) : undefined
          }
        >
          {modal.kind === 'details' && (
            <>
              {modal.extra.category && (
                <span className={styles.tag}>{modal.extra.category}</span>
              )}
              <p>{modal.extra.longDescription}</p>
              {modal.extra.optionGroups
                .filter((group) => extraOptionKind(group) === 'heat')
                .map((group) => (
                  <p key={group.key}>
                    Heat:{' '}
                    {
                      group.choices.find((choice) =>
                        modal.draft[group.key]?.includes(choice.key),
                      )?.label
                    }
                  </p>
                ))}
              <p>
                Flavour built properly.{' '}
                <QuickStandardsLink
                  source="extras"
                  id={modal.extra.id}
                  name={modal.extra.name}
                  selection={encodeSelection(
                    modal.extra.optionGroups,
                    modal.draft,
                    false,
                  )}
                />
              </p>
            </>
          )}
          {supported(modal.extra) &&
            modal.extra.optionGroups.map((group) => (
              <fieldset className={styles.options} key={group.key}>
                <legend>
                  {extraOptionKind(group) === 'option'
                    ? group.label
                    : `Choose your ${extraOptionKind(group)}`}
                </legend>
                {group.choices.map((choice) => (
                  <label key={choice.key}>
                    <input
                      type="radio"
                      name="extra-choice"
                      checked={
                        modal.draft[group.key]?.includes(choice.key) ?? false
                      }
                      onChange={() =>
                        setModal({
                          ...modal,
                          draft: { [group.key]: [choice.key] },
                        })
                      }
                    />
                    <span>
                      <strong>{choice.label}</strong>
                      {choice.detail && <small>{choice.detail}</small>}
                      {countChoice(modal.extra, choice.key) > 0 && (
                        <small>
                          In your box: {countChoice(modal.extra, choice.key)}
                        </small>
                      )}
                    </span>
                    <span>
                      {formatPrice(modal.extra.pricePence + choice.pricePence)}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          <button
            className={styles.cta}
            type="button"
            disabled={actions.busy || !supported(modal.extra)}
            onClick={() => void add(modal.extra, modal.draft)}
          >
            Add to your box ·{' '}
            {formatPrice(
              modal.extra.pricePence +
                (localSurcharge(modal.extra.optionGroups, modal.draft) ?? 0),
            )}
          </button>
          {modal.kind === 'details' && (
            <>
              <DishInfoPanels
                key={modal.extra.id}
                dish={modalDish}
                optionGroups={modal.extra.optionGroups}
                heating={
                  modal.extra.heating
                    ? [{ method: 'Serving', body: modal.extra.heating }]
                    : []
                }
                compact
                selection={
                  encodeSelection(modal.extra.optionGroups, modal.draft) ?? null
                }
              />
              <h3>You might also like</h3>
              <div className={styles.chips}>
                {extras
                  .filter((extra) => extra.id !== modal.extra.id)
                  .sort(
                    (a, b) =>
                      Number(b.category === modal.extra.category) -
                      Number(a.category === modal.extra.category),
                  )
                  .slice(0, 4)
                  .map((extra) => (
                    <button
                      type="button"
                      key={extra.id}
                      onClick={() => open(extra, 'details')}
                    >
                      {extra.name}
                    </button>
                  ))}
              </div>
            </>
          )}
        </FlowDialog>
      )}
    </FlowShell>
  );
}
