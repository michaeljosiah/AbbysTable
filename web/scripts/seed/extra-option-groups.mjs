/** Same product slug rule used by seed.mjs, content.mjs and images.mjs. */
export const slugify = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

/** Storefront pence -> Aonik admin decimal major units. */
const major = (pence) => Number((pence / 100).toFixed(2));

/**
 * Turns authored extra groups into tenant-global groups plus product attachments.
 * Group and choice order remains fixture order; only the globally-conflicting
 * group key is namespaced.
 */
export function extraOptionGroupSeeds(extras) {
  return extras.flatMap((extra) => {
    const productSlug = slugify(extra.name);
    return (extra.optionGroups ?? []).map((group, groupIndex) => {
      const groupKey = slugify(`${extra.id}-${group.key}`);
      return {
        extraId: extra.id,
        productSlug,
        group: {
          key: groupKey,
          label: group.label,
          helpText: group.helpText ?? null,
          selectionMode: group.selectionMode,
          defaultChoiceKey: group.defaultChoiceKey,
          sortOrder: groupIndex,
          choices: group.choices.map((choice, choiceIndex) => ({
            key: choice.key,
            label: choice.label,
            note: choice.detail ?? null,
            // Extra fixtures author absolute adjustments in pence.
            price: major(choice.pricePence),
            sortOrder: choiceIndex,
          })),
        },
        attachment: {
          groupKey,
          allowedChoiceKeys: group.choices.map((choice) => choice.key),
          defaultChoiceKey: group.defaultChoiceKey,
          selectionModeOverride: null,
          sortOrder: groupIndex,
        },
      };
    });
  });
}
