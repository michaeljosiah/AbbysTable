/**
 * Authors the default content block for each dish.
 *
 * SAFETY — nutrition and reheating are authored for all ten; ingredients and
 * allergens are authored for the TWO the design templates actually published
 * and left null for the other eight.
 *
 * That asymmetry is the whole point. Every dish here is real Nigerian food
 * whose likely ingredients are easy to guess, and guessing is exactly the
 * failure mode: "Royal seafood okra" declares shellfish, mustard, peanuts,
 * almonds and pistachio — a list no amount of plausible inference would have
 * produced, and one somebody's allergy depends on. An honest "not yet
 * published" sends that customer to ask; an invented list sends them to eat.
 *
 * Aonik treats a null declaration as WITHHELD rather than inherited, and the
 * storefront renders its explicit not-published notice, so leaving them null
 * is a working state — not a gap to be filled later with something plausible.
 */
import { readFileSync } from 'node:fs';

const API = 'http://localhost:5050';
const T = process.env.TENANT_ID;
const TOK = process.env.ADMIN_TOKEN;
const h = { 'Content-Type': 'application/json', 'X-Tenant-Id': T, Authorization: `Bearer ${TOK}` };
const fixtures = JSON.parse(readFileSync(process.argv[2], 'utf8'));

/** Generic reheating guidance — catalogue-wide in the design, not per-dish. */
const HEATING = [
  { method: 'Microwave', body: 'Pierce film and heat on high for 4–5 mins. Stir halfway through and serve hot.' },
  { method: 'Hob / stovetop', body: 'Empty into a pan and heat on medium for 6–7 mins. Stir halfway through and serve hot.' },
  { method: 'Oven', body: 'Empty into an ovenproof dish and heat at 180°C for 15–18 mins. Stir halfway through and serve hot.' },
];

const all = await (await fetch(`${API}/commerce/admin/products?pageSize=100`, { headers: h })).json();
const bySlug = new Map(all.items.map((p) => [p.slug, p.id]));

let declared = 0, withheld = 0, fail = 0;

for (const d of fixtures.dishes) {
  const id = bySlug.get(d.slug);
  if (!id) { console.log(`    SKIP ${d.slug} — no product`); continue; }

  // Published only where the source template published it. Never derived from
  // the dish name, its protein type, or anything else.
  const hasDeclarations = Boolean(d.ingredients && d.allergens);

  const body = {
    servingLabel: 'Per serving',
    kcal: d.nutrition?.calories ?? null,
    proteinGrams: d.nutrition?.proteinGrams ?? null,
    carbsGrams: d.nutrition?.carbsGrams ?? null,
    fatGrams: d.nutrition?.fatGrams ?? null,
    fibreGrams: d.nutrition?.fibreGrams ?? null,
    sugarsGrams: d.nutrition?.sugarsGrams ?? null,
    saltGrams: d.nutrition?.saltGrams ?? null,
    // null, NOT "None": nobody has declared these, which is a different claim
    // from declaring that there are none.
    ingredients: hasDeclarations ? d.ingredients : null,
    allergens: hasDeclarations ? d.allergens : null,
    heatingJson: JSON.stringify(HEATING),
  };

  const res = await fetch(`${API}/commerce/admin/products/${id}/content`, {
    method: 'PUT', headers: h, body: JSON.stringify(body),
  });

  if (res.ok) {
    if (hasDeclarations) { declared += 1; console.log(`    ${d.slug} — declarations PUBLISHED`); }
    else { withheld += 1; console.log(`    ${d.slug} — nutrition only, declarations left unpublished`); }
  } else {
    fail += 1;
    console.log(`    FAIL ${d.slug} -> ${res.status} ${(await res.text()).slice(0, 170)}`);
  }
}

console.log(`\n  ${declared} dish(es) with published declarations, ${withheld} nutrition-only${fail ? `, ${fail} failed` : ''}`);
console.log('  the nutrition-only dishes render the explicit "not yet published" notice — by design');
