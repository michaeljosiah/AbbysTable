import {
  decodeSelection,
  type MappedOptionGroup,
  type PersonalisationSelection,
} from './map';

/** Editable state keeps every group array-shaped; encoding restores One vs Multi. */
export type PersonalisationDraft = Record<string, string[]>;

/** True only when at least one effective group offers a selectable choice. */
export function hasOptionChoices(groups: MappedOptionGroup[] | undefined): boolean {
  return groups?.some((group) => group.choices.length > 0) ?? false;
}

export function defaultSelection(groups: MappedOptionGroup[]): PersonalisationDraft {
  return Object.fromEntries(
    groups.map((group) => [group.key, group.defaultChoiceKey ? [group.defaultChoiceKey] : []]),
  );
}

/** Stored choices win; groups absent from a stored selection use their authored default. */
export function selectionDraft(
  groups: MappedOptionGroup[],
  selection?: PersonalisationSelection,
): PersonalisationDraft {
  const stored = decodeSelection(selection);
  return Object.fromEntries(
    groups.map((group) => {
      const offered = new Set(group.choices.map((choice) => choice.key));
      const values = stored[group.key]?.filter((key) => Boolean(key) && offered.has(key)) ?? [];
      if (values.length === 0) return [group.key, group.defaultChoiceKey ? [group.defaultChoiceKey] : []];
      return [group.key, group.selectionMode === 'One' ? values.slice(0, 1) : values];
    }),
  );
}

/** One replaces; Multi toggles while retaining at least one valid choice. */
export function selectChoice(
  group: MappedOptionGroup,
  selected: string[],
  choiceKey: string,
): string[] {
  if (group.selectionMode === 'One') return [choiceKey];
  if (!selected.includes(choiceKey)) return [...selected, choiceKey];
  return selected.length > 1 ? selected.filter((key) => key !== choiceKey) : selected;
}

export function sameSelection(
  groups: MappedOptionGroup[],
  left: PersonalisationDraft,
  right: PersonalisationDraft,
): boolean {
  return groups.every((group) => {
    const a = left[group.key] ?? [];
    const b = right[group.key] ?? [];
    if (a.length !== b.length) return false;
    return a.every((key) => b.includes(key));
  });
}

/** Labels are presentation only; keys remain the stored identifiers. */
export function selectionSummary(
  groups: MappedOptionGroup[],
  selection?: PersonalisationSelection | PersonalisationDraft,
): string {
  if (!selection) return 'As Abby designed it';
  const draft = selectionDraft(groups, selection);
  const summary = groups
    .flatMap((group) => {
      const selected = new Set(draft[group.key] ?? []);
      return group.choices.filter((choice) => selected.has(choice.key)).map((choice) => choice.label);
    })
    .join(' · ');
  return summary || 'Personalised';
}

/**
 * A Multi adjustment subtracts its default once across the complete selection,
 * so any selected Multi value makes the aggregate unknowable client-side.
 */
export function localSurcharge(
  groups: MappedOptionGroup[],
  draft: PersonalisationDraft,
): number | undefined {
  if (
    groups.some(
      (group) => group.selectionMode === 'Multi' && (draft[group.key]?.length ?? 0) > 0,
    )
  ) {
    return undefined;
  }

  return groups.reduce((total, group) => {
    const selected = new Set(draft[group.key] ?? []);
    return (
      total +
      group.choices.reduce(
        (groupTotal, choice) => groupTotal + (selected.has(choice.key) ? choice.pricePence : 0),
        0,
      )
    );
  }, 0);
}
