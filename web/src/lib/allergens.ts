/**
 * The 14 regulated food allergen groups as Aonik declares them
 * (michaeljosiah/aonik#351, `allergensPresent`) and as the storefront names
 * them. React-free; `tests/allergens.test.ts`.
 *
 * A declaration is the CONTROLLED list an operator reviewed: `[]` records a
 * reviewed list with none of the 14 declared, and is NOT an allergen-free
 * claim (Aonik's words) — so it is never shown as "None" or "free from". A
 * value this storefront does not know (a group added later, a typo in a
 * migration) makes the whole declaration unreadable: dropping one allergen
 * from a list is the failure that hurts someone, so the page says the
 * information is not yet published and sends the customer to a person.
 */

/** Aonik's value → the name a customer reads. */
export const ALLERGEN_NAMES: Readonly<Record<string, string>> = {
  Celery: 'Celery',
  CerealsContainingGluten: 'Cereals containing gluten',
  Crustaceans: 'Crustaceans',
  Eggs: 'Eggs',
  Fish: 'Fish',
  Lupin: 'Lupin',
  Milk: 'Milk',
  Molluscs: 'Molluscs',
  Mustard: 'Mustard',
  Peanuts: 'Peanuts',
  Sesame: 'Sesame',
  Soybeans: 'Soya',
  SulphurDioxideAndSulphites: 'Sulphur dioxide and sulphites',
  TreeNuts: 'Tree nuts',
};

/** What a reviewed list with none of the 14 says — never "None", never "allergen-free". */
export const NONE_DECLARED = 'None of the 14 regulated allergens declared';

/**
 * The declared groups' names in Aonik's order, `[]` for a reviewed list with
 * none declared, or null when the declaration cannot be read whole.
 */
export function declaredAllergens(values: unknown): string[] | null {
  if (!Array.isArray(values)) return null;
  const names: string[] = [];
  for (const value of values) {
    const name = typeof value === 'string' ? ALLERGEN_NAMES[value] : undefined;
    if (!name) return null;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/** The allergen line: the names, or the reviewed-and-none wording. */
export function allergenLine(names: readonly string[]): string {
  return names.length > 0 ? names.join(', ') : NONE_DECLARED;
}

/**
 * A free-text declaration from a source without the controlled list — an
 * older Aonik — as names: undefined when absent, `[]` for a declaration of
 * none ("None", or Aonik's own reviewed-and-none wording).
 */
export function splitAllergenText(declaration: string | undefined): string[] | undefined {
  if (declaration === undefined) return undefined;
  const text = declaration.trim();
  if (/^none$/i.test(text) || text.toLowerCase() === NONE_DECLARED.toLowerCase()) return [];
  return text
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
