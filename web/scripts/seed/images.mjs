/**
 * Generates catalog photography with the Higgsfield CLI and attaches it to the
 * Aonik products as media.
 *
 * Aonik stores media as URLs and does not host files ("upload wiring is out of
 * scope"), so images land in `public/assets/catalog/` and the stored URL is the
 * root-relative path the storefront serves. That keeps a local review
 * self-contained — no external host, nothing to expire.
 *
 * RESUMABLE, because generation costs real credits: an item whose .webp already
 * exists is re-attached but never re-generated. Delete the file to redo one.
 *
 * Dishes that shipped with photography in the design template keep it — those
 * are Abby's own assets and better than anything generated.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * The Higgsfield CLI's JS entry point, invoked through `node` directly.
 *
 * Spawning the `higgsfield` command itself does not work on Windows: the npm
 * global is a `.cmd` shim, which bare `execFileSync` cannot resolve (ENOENT),
 * and which Node 20+ refuses to spawn even when named explicitly (EINVAL — the
 * CVE-2024-27980 mitigation). `shell: true` would fix both and introduce a
 * worse problem, since these prompts contain apostrophes ("Abby's Table"),
 * colons and commas that would then need shell-correct quoting.
 *
 * Resolving the entry point and passing argv as an array avoids the shell
 * altogether, so the prompt reaches the CLI byte-for-byte.
 */
function resolveCli() {
  const override = process.env.HIGGSFIELD_CLI;
  if (override) return override;
  try {
    return createRequire(import.meta.url).resolve('@higgsfield/cli/bin/higgsfield.js');
  } catch {
    // npm's global root is not on the module path; fall back to its usual home.
    const globals = process.platform === 'win32'
      ? join(process.env.APPDATA ?? '', 'npm', 'node_modules')
      : '/usr/local/lib/node_modules';
    const guess = join(globals, '@higgsfield', 'cli', 'bin', 'higgsfield.js');
    if (existsSync(guess)) return guess;
    throw new Error(
      'Cannot find the Higgsfield CLI entry point. Set HIGGSFIELD_CLI to ' +
        '<npm global root>/@higgsfield/cli/bin/higgsfield.js',
    );
  }
}

const CLI = resolveCli();

const API = process.env.AONIK_API_URL ?? 'http://localhost:5050';
const T = process.env.TENANT_ID;
const DRY = process.argv.includes('--dry-run');

/**
 * This script outruns an access token.
 *
 * Aonik's dev tokens live 30 minutes and a full generation batch takes longer,
 * so a token captured up front expires mid-run — every remaining attach then
 * 401s AFTER its image was generated and paid for. Holding the credentials and
 * minting on demand is the only version that survives its own runtime.
 */
let cached = process.env.ADMIN_TOKEN ?? null;

async function token(force = false) {
  if (cached && !force) return cached;
  const res = await fetch(`${API}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'password',
      clientId: process.env.AONIK_AUTH_CLIENT_ID ?? 'aonik-spa',
      username: process.env.AONIK_ADMIN_USER,
      password: process.env.AONIK_ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status}. Set AONIK_ADMIN_USER/PASSWORD, or pass ADMIN_TOKEN.`);
  cached = (await res.json()).accessToken;
  return cached;
}

/** Fetches the rendered image, retrying transient CDN failures. */
async function download(url, attempts = 4) {
  let last;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      last = error;
      if (i < attempts) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw new Error(`download failed after ${attempts} attempts: ${last?.message}`);
}

/** One authenticated call, retried once against a freshly minted token on 401. */
async function api(path, init = {}) {
  const send = async (bearer) => fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': T, Authorization: `Bearer ${bearer}`, ...(init.headers ?? {}) },
  });

  let res = await send(await token());
  if (res.status === 401) res = await send(await token(true));
  return res;
}

const fixtures = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const OUT = 'public/assets/catalog';
const WEB = '/assets/catalog';
mkdirSync(OUT, { recursive: true });

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

/** Design-template photography, kept as-is. Key is the dish slug. */
const SHIPPED = {
  'wild-rice-goat-efo': '/assets/dish-goat-efo.png',
  'ata-dindin-lamb-shank': '/assets/dish-lamb-shank.png',
  'fish-peppersoup-bone-broth': '/assets/dish-fish-peppersoup.png',
};

const BRAND =
  "Abby's Table — deep forest green, cream and brass palette, calm editorial styling";

/** Staging differs by what the thing physically is; a drink is not a stew. */
function staging(category) {
  switch (category) {
    case 'Drinks':
      return 'served in a clear glass with ice, on a warm cream linen surface';
    case 'Sauces':
      return 'in a small open glass jar with a spoon beside it, on a warm cream linen surface';
    case 'Small chops':
    case 'Snacks':
      return 'piled on a small ceramic plate, on a warm cream linen surface';
    default:
      return 'in a small shallow ceramic bowl, on a warm cream linen surface';
  }
}

const items = [
  ...fixtures.dishes.map((d) => ({
    slug: d.slug,
    name: d.title,
    description: d.description,
    shipped: SHIPPED[d.slug],
    prompt: `Overhead hero shot of a Nigerian dish: ${d.title}. ${d.description} Served in a shallow ceramic bowl on warm cream linen, soft natural daylight, editorial food photography. No text, no labels, no packaging.`,
  })),
  ...fixtures.extras.map((e) => ({
    slug: slugify(e.name),
    name: e.name,
    description: e.description,
    prompt: `Overhead hero shot of a Nigerian ${e.category.toLowerCase()} item: ${e.name}. ${e.description} Presented ${staging(e.category)}, soft natural daylight, editorial food photography. No text, no labels, no packaging.`,
  })),
];

const all = await (await api('/commerce/admin/products?pageSize=100')).json();
const bySlug = new Map(all.items.map((p) => [p.slug, p.id]));

const toGenerate = items.filter((i) => !i.shipped && !existsSync(join(OUT, `${i.slug}.webp`)));
console.log(`  ${items.length} items | ${items.filter((i) => i.shipped).length} keep shipped art | ` +
  `${toGenerate.length} to generate (~${toGenerate.length * 7} credits)`);
const plan = () => toGenerate.forEach((i) => console.log(`    would generate: ${i.slug}`));

let generated = 0, attached = 0, failed = 0;

for (const item of DRY ? [] : items) {
  const id = bySlug.get(item.slug);
  if (!id) { console.log(`    SKIP ${item.slug} — no product`); continue; }

  let url = item.shipped;

  if (!url) {
    const file = join(OUT, `${item.slug}.webp`);

    if (!existsSync(file)) {
      try {
        const raw = execFileSync(process.execPath, [
          CLI,
          'product-photoshoot', 'create',
          '--mode', 'product_shot',
          '--prompt', item.prompt,
          '--product_context', 'Chef-prepared Nigerian food, delivered chilled, clean-label',
          '--brand_context', BRAND,
          '--count', '1', '--json',
        ], { encoding: 'utf8', timeout: 15 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });

        const remote = JSON.parse(raw).urls?.[0];
        if (!remote) throw new Error('no url in response');

        // Retried, because a failure here is the expensive kind: the image has
        // already been generated and charged, and losing the download throws
        // that away — the next run pays again for the same picture.
        const bytes = await download(remote);
        // Written only after a successful fetch AND encode, so a partial run
        // never leaves a half-file that the resume logic would skip.
        const webp = await sharp(bytes).resize(1000, 1000, { fit: 'cover' }).webp({ quality: 78 }).toBuffer();
        writeFileSync(file, webp);
        generated += 1;
        console.log(`    generated ${item.slug} (${(webp.length / 1024).toFixed(0)} KB)`);
      } catch (error) {
        failed += 1;
        console.log(`    FAIL generate ${item.slug}: ${String(error.message).slice(0, 140)}`);
        continue;
      }
    } else {
      console.log(`    reuse ${item.slug} (already on disk)`);
    }

    url = `${WEB}/${item.slug}.webp`;
  }

  // `kind` must be "image" or "doc" — anything else is rejected.
  const res = await api(`/commerce/admin/products/${id}/media`, {
    method: 'PUT',
    body: JSON.stringify({ items: [{ url, kind: 'image' }] }),
  });
  if (res.ok) { attached += 1; }
  else { failed += 1; console.log(`    FAIL media ${item.slug} -> ${res.status} ${(await res.text()).slice(0, 140)}`); }
}

if (DRY) plan();
else console.log(`\n  generated ${generated}, attached ${attached}/${items.length}${failed ? `, ${failed} failed` : ''}`);
