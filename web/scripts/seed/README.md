# Seeding a local Aonik tenant

Stands up the Abby's Table catalog in a local Aonik so the storefront can run on
`AONIK_DATA_MODE=live` against real data instead of fixtures.

The source is the design-template fixtures in `src/lib/aonik/`, so the seeded
shop is the menu Abby actually designed — not placeholder data.

## Prerequisites

A running local Aonik with a tenant. See the platform repo; briefly:

1. Keycloak + Qdrant containers, then the API (`ASPNETCORE_URLS=http://localhost:5050`).
2. **Both** auth provider keys must be set on the API —
   `Settings__Auth.Provider=Keycloak` drives the token endpoint,
   `Auth__Provider=Keycloak` drives JWT scheme selection. Setting only one
   yields a 401 that reads like a bad token.
3. `POST /bootstrap` **with a bearer token**. Called anonymously it writes a
   placeholder identity and every later authenticated call fails with
   "Failed to resolve tenant"; bootstrap is single-shot, so recovering means
   linking `AnkUsers.ExternalSubject` by hand.

## Running

```bash
cd web

# One dump feeds every seeder below.
npx tsx scripts/seed/export-fixtures.ts > /tmp/fixtures.json

export TENANT_ID=<your tenant guid>
export ADMIN_TOKEN=$(curl -s -X POST http://localhost:5050/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"grantType":"password","clientId":"aonik-spa","username":"admin@aonik.local","password":"<dev password>"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(JSON.parse(d).accessToken))")

node scripts/seed/seed.mjs            /tmp/fixtures.json    # products, box, collections, facets, config
node scripts/seed/menu-collection.mjs /tmp/fixtures.json    # the curated `menu` collection
node scripts/seed/stock.mjs                                 # inventory for every variant
node scripts/seed/content.mjs         /tmp/fixtures.json    # extras: nutrition + declarations
node scripts/seed/dish-content.mjs    /tmp/fixtures.json    # dishes: nutrition, declarations where published
node scripts/seed/images.mjs          /tmp/fixtures.json    # attach catalog photography
```

`export-fixtures.ts` emits both shapes the seeders need: the raw fixture fields
the content seeders read, plus the derived `name` / `attributes` /
`unitSurcharge` that `seed.mjs` posts. It used to emit only the former while
`seed.mjs` was fed a hand-prepared `seed-data.json` that nothing in the repo
produced — so following these instructions from a clean clone could not rebuild
the catalog. The transform lives in `export-fixtures.ts` now, in TypeScript,
where it is checked against the fixture types.

`attributes` carries `kcal`, `proteinGrams` **and `fibreGrams`**, because a
browse row's nutrition can only come from `attributesJson` — Aonik's product
summary DTO has no nutrition fields. Omitting fibre is what made every menu card
read "Fibre 0g" over dishes with 9g.

Order matters — Aonik enforces most of it:

- product → variant → price
- bundle product (`kind: "Bundle"`) → size plan → slots
- product → collection membership
- **default content block → content variants** (`V-C8`)

## Four things that fail silently or confusingly

- **Admin money is decimal major units** (`12.50` = £12.50). The storefront
  stores pence, so divide by 100 on the way in.
- **A facet's `sourcePath` is a dot path** relative to `attributesJson`
  (`protein`), *not* JSONPath. `$.protein` looks for a property literally named
  `$`, matches nothing, and reports no error.
- **Every variant needs stock.** Without it each box add fails
  `R5: only 0 of this dish is available`. Aonik also enforces `R8` — the box
  must be full to continue or check out.
- **Recreating the Keycloak container rotates every user's `sub`**, orphaning
  the `AnkUsers.ExternalSubject` link. Every admin call then 401s in a way that
  looks like a bad token.

## Ingredients and allergens are not invented

`dish-content.mjs` authors nutrition and reheating for all ten dishes but
publishes ingredients and allergens for only the **two** whose design templates
actually declared them. The other eight are left null, which Aonik reports as
`declarationsWithheld` and the storefront renders as an explicit
"not yet published — contact us before ordering" notice.

That is the intended end state, not a gap to fill in later with something
plausible. Royal Seafood Okra declares mustard, peanuts, almonds and pistachio
alongside the shellfish; no inference from the dish name produces that list, and
somebody's allergy depends on it.

For extras, `content.mjs` distinguishes three states deliberately:

| fixture            | authored as | storefront renders          |
| ------------------ | ----------- | --------------------------- |
| `["Gluten"]`       | `"Gluten"`  | Allergens: Gluten           |
| `[]`               | `"None"`    | Allergens: None             |
| never authored     | `null`      | "not yet published" warning |
