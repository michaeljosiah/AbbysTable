/**
 * Authors the standard-preparation content block for each extra: nutrition,
 * ingredients, allergens and serving guidance.
 *
 * SAFETY — the allergen field carries three distinct meanings and only two are
 * expressible as a string, so the mapping is deliberate:
 *
 *   fixture ["Gluten (wheat)"] -> "Gluten (wheat)"  a declaration, listing them
 *   fixture []                 -> "None"            a declaration of NO allergens
 *   never authored             -> null              NOT DECLARED
 *
 * Eight of the thirteen extras have an empty array. Writing null for those would
 * turn "we checked, there are none" into "nobody has said", and the storefront
 * would render the not-yet-published warning over food that is actually fine.
 * Writing "None" where nothing was ever declared would be the far worse inverse.
 */
import { readFileSync } from 'node:fs';

const API = 'http://localhost:5050';
const T = process.env.TENANT_ID;
const TOK = process.env.ADMIN_TOKEN;
const h = { 'Content-Type': 'application/json', 'X-Tenant-Id': T, Authorization: `Bearer ${TOK}` };
const fixtures = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

const all = await (await fetch(`${API}/commerce/admin/products?pageSize=100`, { headers: h })).json();
const bySlug = new Map(all.items.map((p) => [p.slug, p.id]));

let ok = 0, fail = 0, declaredNone = 0;

for (const e of fixtures.extras) {
  const id = bySlug.get(slugify(e.name));
  if (!id) { console.log(`    SKIP ${e.name} — no product`); continue; }

  const hasAllergens = Array.isArray(e.allergens) && e.allergens.length > 0;
  if (!hasAllergens) declaredNone += 1;

  const body = {
    // The DEFAULT content block, not a per-selection variant. An extra has no
    // option groups, so there is exactly one preparation and this is it — and
    // Aonik requires the default to exist first anyway (V-C8), as the baseline
    // any later variant is validated against.
    servingLabel: 'Per serving',
    kcal: e.nutrition.calories ?? null,
    proteinGrams: e.nutrition.proteinGrams ?? null,
    carbsGrams: e.nutrition.carbsGrams ?? null,
    fatGrams: e.nutrition.fatGrams ?? null,
    fibreGrams: e.nutrition.fibreGrams ?? null,
    sugarsGrams: e.nutrition.sugarsGrams ?? null,
    saltGrams: e.nutrition.saltGrams ?? null,
    ingredients: e.ingredients,
    allergens: hasAllergens ? e.allergens.join(', ') : 'None',
    heatingJson: JSON.stringify([{ method: 'Serving', body: e.heating }]),
  };

  const res = await fetch(`${API}/commerce/admin/products/${id}/content`, {
    method: 'PUT', headers: h, body: JSON.stringify(body),
  });

  if (res.ok) {
    ok += 1;
    console.log(`    ${e.name} — allergens: ${body.allergens}`);
  } else {
    fail += 1;
    console.log(`    FAIL ${e.name} -> ${res.status} ${(await res.text()).slice(0, 180)}`);
  }
}

console.log(`\n  authored ${ok}/${fixtures.extras.length}${fail ? `, ${fail} failed` : ''}`);
console.log(`  of those, ${declaredNone} declare "None" (explicit, not absent)`);
