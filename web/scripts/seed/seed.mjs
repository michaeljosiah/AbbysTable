/**
 * Seeds the Abby's Table catalog into a local Aonik tenant.
 *
 * Source data is the design-template fixtures, so the seeded shop is the menu
 * Abby actually designed rather than placeholders.
 *
 * Two conventions this gets right, both of which fail SILENTLY if wrong:
 *  - money in admin requests is DECIMAL MAJOR UNITS (12.50 = £12.50), while the
 *    storefront stores pence — so every amount is divided by 100 on the way in;
 *  - a facet's `sourcePath` is a DOT path relative to attributesJson ("protein"),
 *    NOT JSONPath. "$.protein" would look for a property named `$` and match
 *    nothing, with no error anywhere.
 */
import { readFileSync } from 'node:fs';

const API = 'http://localhost:5050';
const TENANT = process.env.TENANT_ID;
const TOKEN = process.env.ADMIN_TOKEN;
const DATA = JSON.parse(readFileSync(process.argv[2], 'utf8'));

if (!TENANT || !TOKEN) throw new Error('TENANT_ID and ADMIN_TOKEN are required');

let failures = 0;

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT,
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) {
    failures += 1;
    console.log(`    FAIL ${method} ${path} -> ${res.status} ${String(text).slice(0, 220)}`);
    return null;
  }
  return parsed;
}

/** Money: storefront pence -> Aonik decimal major units. */
const major = (pence) => Number((pence / 100).toFixed(2));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

/* ---- 1. Category ---------------------------------------------------------- */

const categories = (await call('GET', '/commerce/admin/categories')) ?? [];
const food = categories.find((c) => c.slug === 'food') ?? categories[0];
console.log(`  category: ${food?.slug} (${food?.id})`);

/* ---- 2. Dishes ------------------------------------------------------------ */

console.log('\n  dishes');
const dishIdBySlug = new Map();

for (const d of DATA.dishes) {
  const product = await call('POST', '/commerce/admin/products', {
    slug: d.slug,
    name: d.name,
    kind: 'Simple',
    status: 'Active',
    description: d.description,
    categoryId: food?.id ?? null,
    tagsJson: JSON.stringify(d.tags ?? []),
    attributesJson: JSON.stringify(d.attributes),
  });
  if (!product) continue;
  dishIdBySlug.set(d.slug, product.id);

  // One variant per dish. There is no IsDefault concept in Aonik — consumers
  // take the oldest active variant by CreatedAt — so the intended default must
  // simply be created first. One variant makes that unambiguous.
  const variant = await call('POST', `/commerce/admin/products/${product.id}/variants`, {
    sku: d.slug.toUpperCase().slice(0, 32),
    name: 'Standard',
    optionsJson: '{}',
  });
  if (variant) {
    // Dishes never show a standalone price in the storefront (the summary DTO
    // has no price field), but a variant without one is unresolvable to any
    // consumer that asks, so it is priced anyway.
    await call('POST', `/commerce/admin/variants/${variant.id}/prices`, {
      currency: 'GBP',
      amount: major(1700),
    });
  }

  // Signature dishes carry an on-top-of-the-box surcharge.
  if (d.unitSurcharge !== null && d.unitSurcharge !== undefined) {
    await call('PUT', `/commerce/admin/products/${product.id}/surcharge`, {
      amount: Number(d.unitSurcharge),
      currency: 'GBP',
    });
  }
  console.log(`    ${d.slug}${d.unitSurcharge ? ` (+£${d.unitSurcharge})` : ''}`);
}

/* ---- 3. Extras ------------------------------------------------------------ */

console.log('\n  extras');
const extraIds = [];

for (const e of DATA.extras) {
  const slug = slugify(e.name);
  const product = await call('POST', '/commerce/admin/products', {
    slug,
    name: e.name,
    kind: 'Simple',
    status: 'Active',
    description: e.description,
    categoryId: food?.id ?? null,
    tagsJson: '[]',
    // `mapExtraRow` in the storefront reads these keys off attributesJson.
    attributesJson: JSON.stringify({
      category: e.category,
      longDescription: e.longDescription,
      serveStyle: e.serveStyle,
      heating: e.heating,
    }),
  });
  if (!product) continue;
  extraIds.push(product.id);

  const variant = await call('POST', `/commerce/admin/products/${product.id}/variants`, {
    sku: slug.toUpperCase().slice(0, 32),
    name: 'Standard',
    optionsJson: '{}',
  });
  if (variant) {
    // MUST be the tenant's default currency or the extras rail silently skips
    // the row (it counts as `skipped` and never reaches the customer).
    await call('POST', `/commerce/admin/variants/${variant.id}/prices`, {
      currency: 'GBP',
      amount: major(e.pricePence),
    });
  }
  console.log(`    ${slug} £${major(e.pricePence)}`);
}

/* ---- 4. The box bundle ---------------------------------------------------- */

console.log('\n  box bundle');
const box = await call('POST', '/commerce/admin/products', {
  slug: 'abbys-box',
  name: "Abby's Box",
  kind: 'Bundle',
  status: 'Active',
  description: 'Chef-prepared Nigerian dishes, delivered chilled.',
  // Left null deliberately: the size-plan upsert adopts SizeTiered, whereas any
  // other explicit mode makes that upsert throw A3.
  bundleCurrency: 'GBP',
  tagsJson: '[]',
  attributesJson: '{}',
});

if (box) {
  const presets = DATA.box.presets.map((p, i) => ({
    size: p.dishCount,
    price: major(p.pricePence),
    badge: p.badge ?? null,
    blurb: p.blurb ?? null,
    savingAmount: p.savingPence ? major(p.savingPence) : null,
    sortOrder: i,
  }));

  // Presets override the formula at their own size; every other size prices as
  // basePrice + (size - baseSize) * perSpacePrice. Anchoring base at the
  // smallest preset makes the two agree at that point.
  const plan = await call('PUT', `/commerce/admin/products/${box.id}/size-plan`, {
    minSize: DATA.box.custom.minDishes,
    maxSize: DATA.box.custom.maxDishes,
    baseSize: DATA.box.custom.minDishes,
    basePrice: major(DATA.box.presets[0].pricePence),
    perSpacePrice: major(DATA.box.custom.perDishPence),
    currency: 'GBP',
    presets,
  });
  console.log(`    size plan: ${plan ? 'ok' : 'FAILED'} — presets ${presets.map((p) => p.size + '@£' + p.price).join(', ')}`);

  // ONE catch-all slot. With no options and no category filter every product is
  // eligible; two eligible slots would make an add ambiguous and error.
  const slot = await call('POST', `/commerce/admin/products/${box.id}/bundle-slots`, {
    name: 'Dishes',
    minItems: 0,
    maxItems: DATA.box.custom.maxDishes,
    fromCategoryId: null,
    allowDuplicates: true,
    sortOrder: 0,
    options: [],
  });
  console.log(`    slot: ${slot ? 'ok' : 'FAILED'}`);
}

/* ---- 5. Collections ------------------------------------------------------- */

console.log('\n  collections');
const featured = await call('POST', '/commerce/admin/collections', {
  slug: 'featured', title: 'A taste of the table', kind: 'Featured', sortOrder: 0,
});
if (featured) {
  const items = DATA.dishes
    .filter((d) => d.isFeatured)
    .map((d, i) => ({ productId: dishIdBySlug.get(d.slug), rank: i + 1 }))
    .filter((x) => x.productId);
  const set = await call('PUT', `/commerce/admin/collections/${featured.id}/items`, { items });
  console.log(`    featured: ${set ? items.length + ' dishes' : 'FAILED'}`);
}

const extrasCol = await call('POST', '/commerce/admin/collections', {
  slug: 'extras', title: 'Extras', subtitle: 'Add a little more', kind: 'Curated', sortOrder: 1,
});
if (extrasCol) {
  const items = extraIds.map((id, i) => ({ productId: id, rank: i + 1 }));
  const set = await call('PUT', `/commerce/admin/collections/${extrasCol.id}/items`, { items });
  console.log(`    extras: ${set ? items.length + ' items' : 'FAILED'}`);
}

/* ---- 6. Facets ------------------------------------------------------------ */

console.log('\n  facets');
const uniq = (fn) => [...new Set(DATA.dishes.flatMap(fn).filter(Boolean))];
const opts = (values) => JSON.stringify(values.map((v) => ({ value: v, label: v })));

const facets = [
  { key: 'protein', label: 'Protein', sourcePath: 'protein', values: uniq((d) => [d.attributes.protein]) },
  { key: 'meal', label: 'Meal type', sourcePath: 'meal', values: uniq((d) => [d.attributes.meal]) },
  { key: 'wellness', label: 'Wellness goal', sourcePath: 'wellness', values: uniq((d) => d.attributes.wellness) },
  { key: 'dietary', label: 'Dietary', sourcePath: 'dietary', values: uniq((d) => d.attributes.dietary) },
];

for (const [i, f] of facets.entries()) {
  if (!f.values.length) { console.log(`    ${f.key}: no values, skipped`); continue; }
  const made = await call('POST', '/commerce/admin/facet-groups', {
    key: f.key,
    label: f.label,
    matchKind: 'Attribute',
    // Dot path relative to attributesJson — never JSONPath.
    sourcePath: f.sourcePath,
    optionsJson: opts(f.values),
    sortOrder: i,
  });
  console.log(`    ${f.key}: ${made ? f.values.length + ' options' : 'FAILED'}`);
}

/* ---- 7. Storefront config ------------------------------------------------- */

console.log('\n  storefront config');
const cfg = await call('PUT', '/commerce/admin/storefront-config', {
  recommendedChoiceLabel: "Abby's choice",
  resultsPageSize: 6,
  deliveryListAmount: major(DATA.box.delivery.listPence),
  deliveryChargedAmount: major(DATA.box.delivery.pricePence),
  defaultBoxSlug: 'abbys-box',
  extrasCollectionSlug: 'extras',
});
console.log(`    ${cfg ? 'ok' : 'FAILED'}`);

console.log(`\n${failures ? failures + ' REQUEST(S) FAILED' : 'seed completed with no failures'}`);
