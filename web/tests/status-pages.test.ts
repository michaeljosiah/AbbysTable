import './support/runtime';

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import type { SupportContact } from '../src/lib/content/contact';
import { renderStatusPage, type StatusPageKind, TOKENS } from '../src/lib/status-pages/render';
import { WORDMARK_SVG } from '../src/lib/status-pages/wordmark';
import { config, middleware } from '../src/middleware';

/*
 * The host-level status pages (design/build-handoff.md §3ah–§3ai) and the
 * maintenance switch.
 *
 * `public/500.html` and `public/maintenance.html` are generated from
 * `src/lib/status-pages/render.ts`. To regenerate after changing it, or the
 * navigation, social links, contact details or wordmark it reads:
 *
 *   UPDATE_STATUS_PAGES=1 npm test
 */

// `.test-dist/tests` → `web`
const WEB_ROOT = path.resolve(__dirname, '..', '..');

const PAGES: Array<[StatusPageKind, string]> = [
  ['error', 'public/500.html'],
  ['maintenance', 'public/maintenance.html'],
];

const SAMPLE_CONTACT: SupportContact = {
  email: 'help@example.test',
  phone: { display: '020 0000 0000', e164: '+442000000000' },
};

function read(relative: string): string {
  return readFileSync(path.join(WEB_ROOT, relative), 'utf8');
}

// assert.match would print the whole ~120KB page on failure; name the pattern instead.
function has(html: string, pattern: RegExp): void {
  assert.ok(pattern.test(html), `expected ${pattern}`);
}

function lacks(html: string, pattern: RegExp): void {
  assert.ok(!pattern.test(html), `unexpected ${pattern}`);
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/\shref="([^"]*)"/g)].map((match) => match[1]);
}

const originalFlag = process.env.MAINTENANCE_MODE;

afterEach(() => {
  if (originalFlag === undefined) delete process.env.MAINTENANCE_MODE;
  else process.env.MAINTENANCE_MODE = originalFlag;
});

for (const [kind, file] of PAGES) {
  test(`${file} is exactly what render.ts produces`, () => {
    const rendered = renderStatusPage(kind);
    if (process.env.UPDATE_STATUS_PAGES === '1') {
      writeFileSync(path.join(WEB_ROOT, file), rendered);
    }
    assert.ok(
      read(file) === rendered,
      `${file} is stale — regenerate it with UPDATE_STATUS_PAGES=1 npm test`,
    );
  });

  test(`${file} loads nothing: no scripts, stylesheets, images or remote fonts`, () => {
    const html = renderStatusPage(kind, SAMPLE_CONTACT);
    lacks(html, /<script/i);
    lacks(html, /<link/i);
    lacks(html, /<img/i);
    lacks(html, /\ssrc=/i);
    lacks(html, /@import/i);
    for (const match of html.matchAll(/url\(\s*["']?([^"')]*)/g)) {
      assert.ok(match[1].startsWith('data:'), `non-inline url(): ${match[1].slice(0, 60)}`);
    }
  });

  test(`${file} is noindex and has TRY AGAIN reload the current URL`, () => {
    const html = renderStatusPage(kind);
    has(html, /<meta name="robots" content="noindex">/);
    has(html, /<a class="se-cta" href="">Try again<\/a>/);
  });

  test(`${file} shows the contact panel only when there are contact details`, () => {
    const without = renderStatusPage(kind, null);
    assert.ok(!without.includes('id="se-help"'), 'no panel');
    assert.deepEqual(
      hrefs(without).filter((href) => href === '#se-help' || /^(mailto|tel):/.test(href)),
      [],
    );

    const withContact = renderStatusPage(kind, SAMPLE_CONTACT);
    assert.ok(hrefs(withContact).includes('#se-help'), 'header jump to the panel');
    assert.ok(hrefs(withContact).includes('mailto:help@example.test'));
    assert.ok(hrefs(withContact).includes('tel:+442000000000'));
  });
}

test('the 500 page carries the design copy and a way home', () => {
  const html = renderStatusPage('error');
  has(html, /<p class="se-eyebrow">Error 500<\/p>/);
  has(html, /<h1 class="se-h1">Something didn’t go to plan\.<\/h1>/);
  has(html, /We’re having trouble loading this page right now\. Please try again in a moment\./);
  has(html, /Back to homepage/);
  assert.ok(hrefs(html).includes('/'));
});

test('the maintenance page carries the design copy and links nowhere into the site', () => {
  const html = renderStatusPage('maintenance', SAMPLE_CONTACT);
  has(html, /<p class="se-eyebrow">Temporarily unavailable<\/p>/);
  has(html, /<h1 class="se-h1">We’ll be back shortly\.<\/h1>/);
  lacks(html, /Back to homepage/);
  for (const href of hrefs(html)) {
    assert.ok(
      href === '' || href === '#se-help' || /^(https:|mailto:|tel:)/.test(href),
      `link into the site: "${href}"`,
    );
  }
});

test('the inlined token values match tokens.css', () => {
  const tokensCss = read('src/styles/tokens.css');
  for (const [name, value] of Object.entries(TOKENS)) {
    const declared = tokensCss.match(new RegExp(`--${name}:\\s*([^;]+);`));
    assert.ok(declared, `--${name} is not declared in tokens.css`);
    assert.equal(declared[1].trim().toLowerCase(), value, `--${name}`);
  }
});

test('the inlined wordmark is the public logo file', () => {
  assert.equal(WORDMARK_SVG, read('public/assets/logo-wordmark.svg'));
});

test('maintenance mode is off unless MAINTENANCE_MODE is exactly "true"', () => {
  for (const value of [undefined, '', 'false', '1', 'TRUE']) {
    if (value === undefined) delete process.env.MAINTENANCE_MODE;
    else process.env.MAINTENANCE_MODE = value;
    const response = middleware();
    assert.equal(response.headers.get('x-middleware-next'), '1', `MAINTENANCE_MODE=${value}`);
    assert.equal(response.status, 200);
  }
});

test('maintenance mode answers with the page, 503, Retry-After and no-store', async () => {
  process.env.MAINTENANCE_MODE = 'true';
  const response = middleware();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '3600');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('x-middleware-next'), null);
  assert.equal(await response.text(), renderStatusPage('maintenance'));
});

test('the middleware matches every path except Azure SWA’s /.swa health check', () => {
  // The matcher is also a valid regular expression with the same meaning.
  const [matcher] = config.matcher;
  const matches = (pathname: string) => new RegExp(`^${matcher}$`).test(pathname);

  for (const pathname of ['/', '/menu', '/api/cart', '/_next/static/x.js', '/500.html', '/swa']) {
    assert.ok(matches(pathname), pathname);
  }
  for (const pathname of ['/.swa', '/.swa/health.html']) {
    assert.ok(!matches(pathname), pathname);
  }
});
