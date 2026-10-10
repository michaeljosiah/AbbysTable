/** Local catalogue setup; not a migration for existing customer selections. */
export function dishPortionGroup(groups) {
  const portions = groups.filter((group) => group.key === 'portion');
  const group = portions[0];
  const light = group?.choices.find((choice) => choice.key === 'light');
  const full = group?.choices.find((choice) => choice.key === 'full');
  // Owner approval, 10 October 2026: a uniform £5 per dish unit. Prices here
  // are absolute major units; the storefront maps them relative to Light.
  if (
    portions.length !== 1 ||
    group.selectionMode !== 'One' ||
    group.defaultChoiceKey !== 'light' ||
    group.currency !== 'GBP' ||
    group.choices.length !== 2 ||
    !Number.isFinite(light?.price) ||
    !Number.isFinite(full?.price) ||
    Math.round((full.price - light.price) * 100) !== 500
  ) {
    throw new Error(
      'Dish setup requires Light/Full in GBP with a £5 Full Table delta.',
    );
  }
  return group;
}
