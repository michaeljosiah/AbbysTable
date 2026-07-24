/**
 * Authors the personalisation option groups — portion, protein, side, heat.
 *
 * Without these every dish comes back with `effectiveOptionGroups: []`, and the
 * whole personaliser is dead in live mode: the storefront offers "Personalise
 * this dish", the customer says yes, and gets four headings with nothing under
 * them. Aonik has supported per-product option groups all along (Spec 066); the
 * seeders simply never wrote any.
 *
 * Two levels, in this order — a product can only reference a group that exists:
 *   1. tenant groups + their choices  (`/commerce/admin/option-groups`)
 *   2. attach per product            (`PUT /products/{id}/option-groups`)
 *
 * WHICH dishes get WHICH groups comes from each fixture's `personalisation`
 * array, so the seeded tenant offers exactly what the design does — "Fish
 * peppersoup bone broth" declares none and stays unpersonalisable.
 *
 * Idempotent: existing groups and choices are reused, so a re-run re-attaches
 * rather than duplicating.
 */
import { readFileSync } from 'node:fs';

const API = process.env.AONIK_API_URL ?? 'http://localhost:5050';
const T = process.env.TENANT_ID;
const TOK = process.env.ADMIN_TOKEN;
const h = { 'Content-Type': 'application/json', 'X-Tenant-Id': T, Authorization: `Bearer ${TOK}` };
const fixtures = JSON.parse(readFileSync(process.argv[2], 'utf8'));

if (!T || !TOK) throw new Error('TENANT_ID and ADMIN_TOKEN are required');

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: h, body: body && JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) {
    console.log(`    FAIL ${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
    return null;
  }
  return text ? JSON.parse(text) : {};
}

/** Aonik money is decimal major units; the fixtures are pence. */
const major = (pence) => Number((pence / 100).toFixed(2));

/**
 * `HEAT_STEPS` in the storefront: the choice key IS the step, as a string, and
 * `map.ts` parses it straight back into `heatStep`. Keep them in step.
 */
const HEAT_STEPS = { low: 1, medium: 2, high: 3 };

/**
 * Mirrors `fixtureOptionGroups` in `src/lib/aonik/fixtureFacets.ts` — the demo
 * analogue of exactly this data. Keys must match `KNOWN_GROUP_KEYS` in
 * `map.ts` (`portion`, `protein`, `side`, `heat`) or the storefront drops the
 * group as one it does not know how to render.
 */
const GROUPS = [
  {
    key: 'portion',
    label: 'Choose your portion size',
    selectionMode: 'One',
    // `fixtureKey` names the array on PERSONALISATION_FIXTURE this mirrors.
    choices: fixtures.personalisation.portions,
  },
  {
    key: 'protein',
    label: 'Choose your protein',
    helpText: 'Choose 1 or more',
    selectionMode: 'Multi',
    choices: fixtures.personalisation.proteins,
  },
  {
    key: 'side',
    label: 'Choose your side',
    selectionMode: 'One',
    choices: fixtures.personalisation.sides,
  },
  {
    key: 'heat',
    label: 'Choose your heat level',
    selectionMode: 'One',
    // Heat carries no surcharge and is keyed by step, so it is built rather
    // than copied. The DEFAULT is per dish, applied at attach time below —
    // but the GROUP still needs a recommended default of its own (see
    // `recommendedDefaultKey`), even though every product overrides it.
    choices: fixtures.personalisation.heatLevels.map((level) => ({
      key: String(level.step),
      label: level.label,
      pricePence: 0,
      // Medium: the catalogue-wide middle, and only a placeholder — each dish
      // attaches its own heat as the product-level default below.
      isAbbysChoice: level.step === 2,
    })),
  },
];

/* ---- 1. Tenant groups + choices ------------------------------------------- */

console.log('  option groups');
const existing = (await call('GET', '/commerce/admin/option-groups')) ?? [];
const existingList = Array.isArray(existing) ? existing : (existing.items ?? []);
const idByKey = new Map(existingList.map((g) => [g.key, g.id]));
const choiceKeysByGroup = new Map(
  existingList.map((g) => [g.key, new Set((g.choices ?? []).map((c) => c.key))]),
);

for (const group of GROUPS) {
  let id = idByKey.get(group.key);

  if (!id) {
    const created = await call('POST', '/commerce/admin/option-groups', {
      key: group.key,
      label: group.label,
      helpText: group.helpText ?? null,
      selectionMode: group.selectionMode,
      currency: 'GBP',
      sortOrder: GROUPS.indexOf(group),
    });
    if (!created) continue;
    id = created.id;
    idByKey.set(group.key, id);
    choiceKeysByGroup.set(group.key, new Set());
  }

  const already = choiceKeysByGroup.get(group.key) ?? new Set();
  let added = 0;

  for (const [index, choice] of group.choices.entries()) {
    if (already.has(choice.key)) continue;
    const ok = await call('POST', `/commerce/admin/option-groups/${id}/choices`, {
      key: choice.key,
      label: choice.label,
      note: choice.detail ?? null,
      price: major(choice.pricePence ?? 0),
      // Abby's choice is the recommended default the storefront labels.
      isRecommendedDefault: Boolean(choice.isAbbysChoice),
      sortOrder: index,
      isActive: true,
    });
    if (ok) added += 1;
  }

  /*
   * Every group needs a recommended default, even where the product overrides
   * it. A group without one is DROPPED from `effectiveOptionGroups` silently:
   * `defaultChoiceKey: null` on the attach answers
   * "V8: … the group's recommended default is not among the allowed choices",
   * but supplying an explicit product-level default makes it vanish with a 200
   * and no mention in the response. That silence is why the heat group went
   * missing while the seeder reported success.
   *
   * Sent on every run rather than only at creation, so a group authored before
   * this line existed is repaired by re-running.
   */
  const recommended = group.choices.find((choice) => choice.isAbbysChoice) ?? group.choices[0];
  await call('PUT', `/commerce/admin/option-groups/${id}/recommended-default`, {
    choiceKey: recommended.key,
  });

  console.log(
    `    ${group.key} (${group.selectionMode}) — ${group.choices.length} choices, ` +
      `${added} new, default "${recommended.key}"`,
  );
}

/* ---- 2. Attach to each dish ----------------------------------------------- */

console.log('\n  per-dish attachment');
const all = await call('GET', '/commerce/admin/products?pageSize=100');
const bySlug = new Map((all?.items ?? []).map((p) => [p.slug, p.id]));

/**
 * Every dish gets every group, because that is what the design does.
 *
 * All three templates — Step 2's personaliser and both dish-detail pages —
 * render "Choose your portion size / protein / side / heat level"
 * unconditionally. The only `sc-if` near the card's personalise block is
 * `d.notPersonalised`, which is a STATE (has this dish been personalised yet)
 * and not a capability.
 *
 * The fixtures' per-dish `personalisation` arrays say otherwise — some dishes
 * list two groups, three list none — but no template supports that, and the
 * fixture header claims only to lift values from the templates. Seeding from
 * them left dishes with a portion heading and no portions.
 */
const ALL_GROUP_KEYS = ['portion', 'protein', 'side', 'heat'];

const defaultChoiceKey = (groupKey, dish) => {
  if (groupKey === 'heat') return String(HEAT_STEPS[dish.heat] ?? 2);
  const group = GROUPS.find((g) => g.key === groupKey);
  const abbys = group.choices.find((c) => c.isAbbysChoice);
  return (abbys ?? group.choices[0]).key;
};

let attached = 0;

for (const dish of fixtures.dishes) {
  const id = bySlug.get(dish.slug);
  if (!id) { console.log(`    SKIP ${dish.slug} — no product`); continue; }

  const ok = await call('PUT', `/commerce/admin/products/${id}/option-groups`, {
    groups: ALL_GROUP_KEYS.map((groupKey, index) => ({
      groupKey,
      allowedChoiceKeys: null, // null = every choice on the group
      defaultChoiceKey: defaultChoiceKey(groupKey, dish),
      selectionModeOverride: null,
      sortOrder: index,
    })),
  });

  if (ok) { attached += 1; console.log(`    ${dish.slug} — ${ALL_GROUP_KEYS.join(', ')}`); }
}

console.log(`\n  attached all four groups to ${attached}/${fixtures.dishes.length} dishes`);
