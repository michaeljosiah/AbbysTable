import { SUPPORT_CONTACT, type SupportContact } from '@/lib/content/contact';
import {
  type NavItem,
  SOCIAL_LINKS,
  STATUS_FOOTER_LINKS,
} from '@/lib/content/navigation';
import { SOCIAL_GLYPHS } from '@/lib/content/socialGlyphs';
import { MAINTENANCE_COPY, SERVER_ERROR_COPY } from '@/lib/content/status';

import { FIGTREE_LATIN, PLAYFAIR_500_LATIN, PLAYFAIR_ITALIC_400_LATIN } from './fonts';
import { WORDMARK_SVG } from './wordmark';

/**
 * The two host-level status pages, as self-contained HTML strings:
 *
 *  - `error`       → `public/500.html`, "Something didn't go to plan." — for
 *                    the host / CDN to answer with, HTTP 500, when the APP
 *                    cannot (design: Something Went Wrong; build-handoff.md
 *                    §3ah). NOTHING SERVES IT THAT WAY YET: Azure Static Web
 *                    Apps cannot override a 500, so it needs a CDN / Front Door
 *                    rule, which is an owner decision. Until then it is only a
 *                    file at `/500.html`, answered with 200.
 *  - `maintenance` → `public/maintenance.html`, "We'll be back shortly." —
 *                    HTTP 503 + Retry-After for planned downtime, and the body
 *                    `src/middleware.ts` answers with when MAINTENANCE_MODE is
 *                    on (design: Back Shortly; build-handoff.md §3ai).
 *
 * They exist for when the application is down, so they depend on NOTHING from
 * it: CSS, fonts and the wordmark are inlined, there is no JavaScript, and no
 * request leaves the page. That is why the token VALUES are copied in here
 * (`TOKENS` below, checked against tokens.css by tests/status-pages.test.ts)
 * rather than read from tokens.css as every component does.
 *
 * The in-app 500 (`components/status/ServerErrorPage`) is the same design in
 * React. The copy for both comes from `@/lib/content/status`; keep the markup
 * in step by hand.
 *
 * The public files are GENERATED from this module — never edit them by hand.
 * Regenerate with `UPDATE_STATUS_PAGES=1 npm test`; the test fails while they
 * differ from what this renders.
 *
 * Pure string building with no Node APIs, so the Edge middleware can call it.
 */

export type StatusPageKind = 'error' | 'maintenance';

/**
 * Mirrors of web/src/styles/tokens.css, by name — the static pages cannot load
 * the stylesheet. Each value is asserted equal to tokens.css by the test.
 */
export const TOKENS = {
  'green-forest': '#1e3a2f',
  'green-deep': '#15291f',
  brass: '#c28e3c',
  'brass-ink': '#8a5f1f',
  terracotta: '#b7554e',
  'terracotta-deep': '#9c433d',
  gold: '#f6c33b',
  cream: '#f7f1e8',
  'cream-2': '#f7f2e8',
  'cream-3': '#fbf8f1',
  blush: '#e9cdb8',
  sand: '#e0d8c8',
  'sand-2': '#d6d0c6',
  brown: '#3b2c22',
  white: '#ffffff',
  'weight-medium': '500',
  'weight-semibold': '600',
  'radius-card': '18px',
  'radius-pill': '999px',
} as const;

interface PageCopy {
  title: string;
  eyebrow: string;
  heading: string;
  lede: string;
  /** Linked wordmarks, "Back to homepage →" and the footer's help links. */
  linksIntoSite: boolean;
  mark: string;
}

const COPY: Record<StatusPageKind, PageCopy> = {
  error: {
    title: SERVER_ERROR_COPY.title,
    eyebrow: SERVER_ERROR_COPY.eyebrow,
    heading: SERVER_ERROR_COPY.heading,
    lede: SERVER_ERROR_COPY.lede,
    linksIntoSite: true,
    // Triangle with an exclamation mark.
    mark: '<path d="M12 3.6 21.2 19.5H2.8z"/><path d="M12 9.6v4.6M12 16.9h.01" stroke-width="1.8"/>',
  },
  maintenance: {
    ...MAINTENANCE_COPY,
    // The whole site is down on purpose: every link into it would only show
    // this page again (design decision, 1 Oct 2026).
    linksIntoSite: false,
    // Gear.
    mark: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },
};

/** Matches the site footer. Bump with the brand's copyright line, not the clock. */
const COPYRIGHT_YEAR = 2026;

const ENVELOPE =
  '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>';
const PHONE =
  '<path d="M5 4h3.5l1.6 4.2-2.1 1.4a11 11 0 0 0 6.4 6.4l1.4-2.1L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** An SVG as a CSS url(): quotes swapped, whitespace collapsed, and only the
 *  characters a data: URI cannot carry escaped — far smaller than base64. */
function svgDataUri(svg: string): string {
  const compact = svg.replace(/\s+/g, ' ').replace(/"/g, "'").trim();
  const escaped = compact
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');
  return `url("data:image/svg+xml,${escaped}")`;
}

function lineIcon(paths: string, size: number, strokeWidth: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function styles(kind: StatusPageKind): string {
  const tokens = Object.entries(TOKENS)
    .map(([name, value]) => `    --${name}: ${value};`)
    .join('\n');

  // Layout differences are the design's own: the maintenance band hugs its
  // content on a phone and its wordmarks are not links.
  const band =
    kind === 'error'
      ? `.se-sec { padding: 56px 0 64px; min-height: calc(100dvh - 260px); }`
      : `.se-sec { padding: 48px 0 56px; }`;
  const bandDesktop =
    kind === 'error'
      ? `.se-sec { padding: 104px 0 112px; }`
      : `.se-sec { padding: 104px 0 112px; min-height: calc(100dvh - 260px); }`;
  const footColumns = kind === 'error' ? 'auto minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto';

  return `
  @font-face { font-family: "Figtree"; font-style: normal; font-weight: 300 900; font-display: swap; src: url(data:font/woff2;base64,${FIGTREE_LATIN}) format("woff2"); }
  @font-face { font-family: "Playfair Display"; font-style: normal; font-weight: 500; font-display: swap; src: url(data:font/woff2;base64,${PLAYFAIR_500_LATIN}) format("woff2"); }
  @font-face { font-family: "Playfair Display"; font-style: italic; font-weight: 400; font-display: swap; src: url(data:font/woff2;base64,${PLAYFAIR_ITALIC_400_LATIN}) format("woff2"); }

  /* Token values, mirrored by name from web/src/styles/tokens.css. */
  :root {
${tokens}
    --font-display: "Playfair Display", ui-serif, Georgia, "Times New Roman", serif;
    --font-sans: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --wordmark: ${svgDataUri(WORDMARK_SVG)};
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; background: var(--cream); color-scheme: light; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: var(--font-sans); color: var(--brown); }
  a { color: var(--green-forest); }
  a:hover { color: var(--terracotta-deep); }

  /* Focus standard (design/at-focus.css): brass ring, transparent outline for forced colours. */
  :where(a[href]):focus-visible { outline: 2px solid transparent; outline-offset: 2px; box-shadow: 0 0 0 3px rgba(194, 142, 60, .4); }
  @media (forced-colors: active) { :where(a[href]):focus-visible { outline-color: Highlight; } }

  /* The wordmark: one mask, tinted by colour. */
  .wm { display: block; aspect-ratio: 186 / 32; background: currentColor; -webkit-mask: var(--wordmark) center / contain no-repeat; mask: var(--wordmark) center / contain no-repeat; }

  .se-hdr { border-bottom: 1px solid var(--sand); background: var(--cream); }
  .se-hdr-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; max-width: 1280px; min-height: 70px; margin: 0 auto; padding: 13px 22px; }
  .se-logo { display: inline-flex; align-items: center; min-height: 44px; color: var(--green-forest); text-decoration: none; transition: opacity .16s ease; }
  a.se-logo:hover { color: var(--green-forest); opacity: .78; }
  .se-logo .wm { width: clamp(108px, 36vw, 168px); }
  .se-q { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; font-size: 16px; color: var(--green-forest); text-decoration: none; transition: color .16s ease; }
  .se-q svg { flex: 0 0 auto; color: var(--brass-ink); }
  .se-q span { border-bottom: 1px solid var(--brass); padding-bottom: 1px; transition: border-color .16s ease; }
  .se-q:hover span { border-bottom-color: var(--terracotta-deep); }

  .se-sec { display: flex; align-items: center; background: var(--cream); }
  ${band}
  .se-in { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 22px; }
  .se-body { max-width: 640px; margin: 0 auto; text-align: center; }
  .se-mark { display: flex; align-items: center; justify-content: center; width: 72px; height: 72px; margin: 0 auto 20px; border-radius: 50%; background: var(--blush); color: var(--brass-ink); }
  .se-eyebrow { margin: 0 0 16px; font-weight: var(--weight-semibold); font-size: 13px; letter-spacing: .24em; text-transform: uppercase; color: var(--brass-ink); }
  .se-h1 { margin: 0; font-family: var(--font-display); font-weight: var(--weight-medium); font-size: clamp(38px, 11.6vw, 56px); line-height: 1.06; letter-spacing: -0.015em; color: var(--green-forest); text-wrap: balance; }
  .se-lede { margin: 18px auto 0; max-width: 36ch; font-size: 18px; line-height: 1.55; color: var(--brown); text-wrap: pretty; }
  .se-acts { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 32px; }
  .se-cta { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 52px; padding: 0 32px; border-radius: var(--radius-pill); background: var(--green-forest); color: var(--white); font-weight: var(--weight-semibold); font-size: 14px; letter-spacing: .12em; text-transform: uppercase; text-decoration: none; transition: background .16s ease; }
  .se-cta:hover { background: var(--green-deep); color: var(--white); }
  .se-cta:active { filter: brightness(.94); }
  .se-link { display: inline-flex; align-items: center; min-height: 44px; font-weight: var(--weight-semibold); font-size: 16px; color: var(--green-forest); text-decoration: none; }
  .se-link > span { display: inline-flex; align-items: center; gap: 8px; border-bottom: 1.5px solid var(--brass); padding-bottom: 3px; transition: border-color .16s ease; }
  .se-link:hover > span { border-bottom-color: var(--terracotta-deep); }

  .se-help { max-width: 520px; margin: 40px auto 0; padding: 20px 20px 18px; border-radius: var(--radius-card); background: var(--cream-2); border: 1px solid var(--sand); text-align: center; scroll-margin-top: 24px; }
  .se-help-h { margin: 0; font-family: var(--font-display); font-weight: var(--weight-medium); font-size: 22px; line-height: 1.25; color: var(--green-forest); }
  .se-help-p { margin: 6px 0 0; font-size: 16px; line-height: 1.5; color: var(--brown); }
  .se-help-ways { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-top: 10px; }
  .se-way { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font-weight: var(--weight-semibold); font-size: 16px; color: var(--green-forest); text-decoration: none; overflow-wrap: anywhere; transition: color .16s ease; }
  .se-way svg { flex: 0 0 auto; color: var(--brass-ink); }
  .se-way > span { border-bottom: 1px solid var(--brass); padding-bottom: 1px; }

  .se-foot { border-top: 2px solid var(--brass); background: var(--green-deep); }
  .se-foot-in { display: grid; gap: 14px; justify-items: center; max-width: 1280px; margin: 0 auto; padding: 30px 22px 34px; text-align: center; }
  .se-foot-logo { display: inline-flex; align-items: center; min-height: 44px; color: var(--blush); }
  a.se-foot-logo:hover { color: var(--blush); }
  .se-foot-logo .wm { width: 156px; }
  .se-foot-nav { display: grid; grid-template-columns: 1fr 1fr; justify-items: center; column-gap: 18px; }
  .se-foot-link { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; font-size: 16px; color: var(--blush); text-decoration: none; transition: color .16s ease; }
  .se-foot-link:hover { color: var(--brass); }
  .se-socs { display: flex; gap: 20px; align-items: center; padding: 10px; }
  .se-soc { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin: -10px; color: var(--blush); transition: color .16s ease; }
  .se-soc:hover { color: var(--brass); }
  .se-soc svg { display: block; }
  .se-foot-base { display: grid; gap: 6px; justify-items: center; }
  .se-foot-legal { margin: 0; font-size: 14px; color: var(--sand-2); }
  .se-foot-sign { margin: 0; font-family: var(--font-display); font-style: italic; font-size: 20px; color: var(--terracotta); }
  .se-foot a:focus-visible { outline: 2px solid var(--cream-3); outline-offset: 0; box-shadow: 0 0 0 3px var(--gold); }

  @media (min-width: 640px) {
    .se-hdr-row { padding: 15px 34px; }
    .se-in { padding: 0 34px; }
    .se-sec { padding: 80px 0 88px; }
    .se-cta { width: auto; }
    .se-help { padding: 22px 28px 20px; }
    .se-help-ways { flex-direction: row; justify-content: center; flex-wrap: wrap; gap: 4px 28px; }
    .se-foot-in { grid-template-columns: ${footColumns}; align-items: center; justify-items: start; gap: 14px 28px; padding: 32px 34px 36px; text-align: left; }
    .se-foot-nav { display: flex; flex-wrap: wrap; gap: 4px 26px; justify-self: end; }
    .se-socs { justify-self: end; }
    .se-foot-base { grid-column: 1 / -1; grid-template-columns: 1fr auto; width: 100%; align-items: center; justify-items: start; }
    .se-foot-sign { justify-self: end; }
  }
  @media (min-width: 1024px) {
    .se-hdr-row { padding: 17px 48px; }
    .se-in { padding: 0 48px; }
    ${bandDesktop}
    .se-foot-in { padding: 36px 48px 40px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .se-logo, .se-q, .se-q span, .se-cta, .se-link > span, .se-way, .se-foot-link, .se-soc { transition: none !important; }
  }`;
}

function header(copy: PageCopy, contact: SupportContact | null): string {
  const wordmark = '<span class="wm" aria-hidden="true"></span>';
  const logo = copy.linksIntoSite
    ? `<a class="se-logo" href="/" aria-label="Abby’s Table — home">${wordmark}</a>`
    : `<span class="se-logo" role="img" aria-label="Abby’s Table">${wordmark}</span>`;
  // An in-page jump to the direct-contact panel — only when there is one.
  const jump = contact
    ? `<a class="se-q" href="#se-help">${lineIcon(ENVELOPE, 20, '1.7')}<span>Contact us</span></a>`
    : '';
  return `<header class="se-hdr">
  <div class="se-hdr-row">
    ${logo}${jump ? `\n    ${jump}` : ''}
  </div>
</header>`;
}

function helpPanel(contact: SupportContact | null): string {
  if (!contact) return '';
  return `
        <section class="se-help" id="se-help" aria-labelledby="se-help-h">
          <h2 class="se-help-h" id="se-help-h">Need help with an order?</h2>
          <p class="se-help-p">Contact us directly and we’ll help.</p>
          <div class="se-help-ways">
            <a class="se-way" href="mailto:${escapeHtml(contact.email)}">${lineIcon(ENVELOPE, 18, '1.7')}<span>${escapeHtml(contact.email)}</span></a>
            <a class="se-way" href="tel:${escapeHtml(contact.phone.e164)}">${lineIcon(PHONE, 18, '1.7')}<span>${escapeHtml(contact.phone.display)}</span></a>
          </div>
        </section>`;
}

function body(copy: PageCopy, contact: SupportContact | null): string {
  // TRY AGAIN reloads the current URL with no JavaScript: an empty href.
  const homeLink = copy.linksIntoSite
    ? `\n          <a class="se-link" href="/"><span>${SERVER_ERROR_COPY.home}<span aria-hidden="true">→</span></span></a>`
    : '';
  return `<main>
  <section class="se-sec">
    <div class="se-in">
      <div class="se-body">
        <div class="se-mark" aria-hidden="true">${lineIcon(copy.mark, 34, '1.5')}</div>
        <p class="se-eyebrow">${copy.eyebrow}</p>
        <h1 class="se-h1">${copy.heading}</h1>
        <p class="se-lede">${copy.lede}</p>
        <div class="se-acts">
          <a class="se-cta" href="">${SERVER_ERROR_COPY.retry}</a>${homeLink}
        </div>${helpPanel(contact)}
      </div>
    </div>
  </section>
</main>`;
}

function footer(copy: PageCopy): string {
  const wordmark = '<span class="wm" aria-hidden="true"></span>';
  const logo = copy.linksIntoSite
    ? `<a class="se-foot-logo" href="/" aria-label="Abby’s Table — home">${wordmark}</a>`
    : `<span class="se-foot-logo" role="img" aria-label="Abby’s Table">${wordmark}</span>`;
  const nav = copy.linksIntoSite
    ? `\n    <nav class="se-foot-nav" aria-label="Help and legal">\n${STATUS_FOOTER_LINKS.map(
        (link: NavItem) =>
          `      <a class="se-foot-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`,
      ).join('\n')}\n    </nav>`
    : '';
  // The socials stay on both pages: they are where status updates are posted.
  const socials = SOCIAL_LINKS.map(({ network, label, href }) => {
    const glyph = SOCIAL_GLYPHS[network];
    return `      <a class="se-soc" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}"><svg width="20" height="20" viewBox="${glyph.viewBox}" aria-hidden="true" focusable="false"><path fill="currentColor" d="${glyph.path}"/></svg></a>`;
  }).join('\n');
  return `<footer class="se-foot">
  <div class="se-foot-in">
    ${logo}${nav}
    <div class="se-socs">
${socials}
    </div>
    <div class="se-foot-base">
      <p class="se-foot-legal">© ${COPYRIGHT_YEAR} Abby’s Table</p>
      <p class="se-foot-sign">Abby x</p>
    </div>
  </div>
</footer>`;
}

/** The complete page. `contact` defaults to the site's (currently none). */
export function renderStatusPage(
  kind: StatusPageKind,
  contact: SupportContact | null = SUPPORT_CONTACT,
): string {
  const copy = COPY[kind];
  return `<!DOCTYPE html>
<!--
  GENERATED by web/src/lib/status-pages/render.ts — do not edit by hand.
  Regenerate: cd web && UPDATE_STATUS_PAGES=1 npm test
  Self-contained on purpose (CSS, fonts and wordmark inlined, no JavaScript):
  it is served when the application cannot be.
-->
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(copy.title)}</title>
<style>${styles(kind)}
</style>
</head>
<body>
${header(copy, contact)}

${body(copy, contact)}

${footer(copy)}
</body>
</html>
`;
}
