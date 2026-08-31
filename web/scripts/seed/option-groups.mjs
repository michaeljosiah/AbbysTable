/**
 * Authors and attaches fixture personalisation groups for dishes and extras.
 *
 * Dish groups retain their established tenant-global keys. Extra groups cannot:
 * fixture extras reuse keys and choice keys with different prices, so each is
 * namespaced before authoring and attached only to its matching product.
 *
 * Two levels, in this order — a product can only reference a group that exists:
 *   1. tenant groups + their choices  (`/commerce/admin/option-groups`)
 *   2. attach per product            (`PUT /products/{id}/option-groups`)
 *
 * Idempotent: existing owned groups and choices are reconciled to fixture truth;
 * missing records are created and every product attachment is replaced.
 */
import { readFileSync } from 'node:fs';

import { extraOptionGroupSeeds, slugify } from './extra-option-groups.mjs';

const API = (process.env.AONIK_API_URL ?? 'http://localhost:5050').replace(/\/$/, '');
const T = process.env.TENANT_ID;
const TOK = process.env.ADMIN_TOKEN;
const h = { 'Content-Type': 'application/json', 'X-Tenant-Id': T, Authorization: `Bearer ${TOK}` };
const fixtures = JSON.parse(readFileSync(process.argv[2], 'utf8'));

if (!T || !TOK) throw new Error('TENANT_ID and ADMIN_TOKEN are required');

let failures = 0;

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: h, body: body && JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) {
    failures += 1;
    console.log(`    FAIL ${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
    return null;
  }
  return text ? JSON.parse(text) : {};
}

/**
 * `HEAT_STEPS` in the storefront: the choice key IS the step, as a string, and
 * `map.ts` parses it straight back into `heatStep`. Keep them in step.
 */
const HEAT_STEPS = { low: 1, medium: 2, high: 3 };

/**
 * This is the same absolute-price DTO source that demo mode passes through the
 * live mapper. Adding an authored group does not require a parallel hierarchy.
 */
const GROUPS = fixtures.optionGroups;
const EXTRA_GROUP_SEEDS = extraOptionGroupSeeds(fixtures.extras);
const GROUPS_TO_AUTHOR = [
  ...GROUPS.map((group, index) => ({ group, tenantSortOrder: index })),
  ...EXTRA_GROUP_SEEDS.map((seed, index) => ({
    group: seed.group,
    tenantSortOrder: GROUPS.length + index,
  })),
];

/* ---- 1. Tenant groups + choices ------------------------------------------- */

console.log('  option groups');
const existing = (await call('GET', '/commerce/admin/option-groups')) ?? [];
const existingList = Array.isArray(existing) ? existing : (existing.items ?? []);
const existingByKey = new Map(existingList.map((group) => [group.key, group]));
const staleChoiceDeactivations = [];

for (const { group, tenantSortOrder } of GROUPS_TO_AUTHOR) {
  let persisted = existingByKey.get(group.key);
  let id = persisted?.id;

  if (!id) {
    const created = await call('POST', '/commerce/admin/option-groups', {
      key: group.key,
      label: group.label,
      helpText: group.helpText ?? null,
      selectionMode: group.selectionMode,
      currency: 'GBP',
      sortOrder: tenantSortOrder,
    });
    if (!created) continue;
    id = created.id;
    persisted = { ...created, choices: created.choices ?? [] };
    existingByKey.set(group.key, persisted);
  } else {
    await call('PUT', `/commerce/admin/option-groups/${id}`, {
      label: group.label,
      helpText: group.helpText ?? null,
      selectionMode: group.selectionMode,
      currency: 'GBP',
      sortOrder: tenantSortOrder,
      isActive: true,
    });
  }

  const existingChoices = new Map((persisted?.choices ?? []).map((choice) => [choice.key, choice]));
  const authoredChoiceKeys = new Set(group.choices.map((choice) => choice.key));
  let added = 0;
  let reconciled = 0;
  let staleQueued = 0;

  for (const [index, choice] of group.choices.entries()) {
    const current = existingChoices.get(choice.key);
    if (current) {
      const ok = await call('PUT', `/commerce/admin/option-choices/${current.id}`, {
        label: choice.label,
        note: choice.note,
        // Already an absolute decimal major-unit price, exactly as Aonik stores it.
        price: choice.price,
        sortOrder: index,
        isActive: true,
      });
      if (ok) reconciled += 1;
    } else {
      const ok = await call('POST', `/commerce/admin/option-groups/${id}/choices`, {
        key: choice.key,
        label: choice.label,
        note: choice.note,
        price: choice.price,
        // Default ownership always moves through the dedicated endpoint below.
        isRecommendedDefault: false,
        sortOrder: index,
        isActive: true,
      });
      if (ok) added += 1;
    }
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
  await call('PUT', `/commerce/admin/option-groups/${id}/recommended-default`, {
    choiceKey: group.defaultChoiceKey,
  });

  // Fixture-owned groups are source-of-truth, but V9 prevents deactivation while
  // an old product attachment still names the choice. Queue these until every
  // fixture product has received its full replacement attachment below.
  for (const choice of existingChoices.values()) {
    if (authoredChoiceKeys.has(choice.key)) continue;
    staleChoiceDeactivations.push({
      groupKey: group.key,
      choiceKey: choice.key,
      id: choice.id,
      body: {
        label: choice.label,
        note: choice.note ?? null,
        price: choice.price,
        sortOrder: choice.sortOrder,
        isActive: false,
      },
    });
    staleQueued += 1;
  }

  console.log(
    `    ${group.key} (${group.selectionMode}) — ${group.choices.length} choices, ` +
      `${added} new, ${reconciled} reconciled, ${staleQueued} stale queued, ` +
      `default "${group.defaultChoiceKey}"`,
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
const ALL_GROUP_KEYS = GROUPS.map((group) => group.key);

const defaultChoiceKey = (groupKey, dish) => {
  if (groupKey === 'heat') return String(HEAT_STEPS[dish.heat] ?? 2);
  const group = GROUPS.find((g) => g.key === groupKey);
  return group.defaultChoiceKey;
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

/* ---- 3. Attach each extra's own namespaced groups -------------------------- */

console.log('\n  per-extra attachment');
const extraGroupsBySlug = new Map();
for (const seed of EXTRA_GROUP_SEEDS) {
  const productGroups = extraGroupsBySlug.get(seed.productSlug) ?? [];
  productGroups.push(seed);
  extraGroupsBySlug.set(seed.productSlug, productGroups);
}

let extrasAttached = 0;
for (const extra of fixtures.extras) {
  const slug = slugify(extra.name);
  const seeds = extraGroupsBySlug.get(slug) ?? [];
  const id = bySlug.get(slug);
  if (!id) { console.log(`    SKIP ${slug} — no product`); continue; }

  const ok = await call('PUT', `/commerce/admin/products/${id}/option-groups`, {
    groups: seeds.map((seed) => seed.attachment),
  });
  if (ok) {
    extrasAttached += 1;
    console.log(`    ${slug} — ${seeds.map((seed) => seed.group.key).join(', ') || '(none)'}`);
  }
}

console.log(
  `\n  replaced fixture groups on ${extrasAttached}/${fixtures.extras.length} extras`,
);

/* ---- 4. Deactivate choices removed from fixture-owned groups --------------- */

console.log('\n  stale option choices');
let staleChoicesDeactivated = 0;
for (const stale of staleChoiceDeactivations) {
  const ok = await call('PUT', `/commerce/admin/option-choices/${stale.id}`, stale.body);
  if (ok) {
    staleChoicesDeactivated += 1;
    console.log(`    ${stale.groupKey}/${stale.choiceKey} — deactivated`);
  }
}
console.log(
  `\n  deactivated ${staleChoicesDeactivated}/${staleChoiceDeactivations.length} stale choices`,
);
if (failures) process.exitCode = 1;
