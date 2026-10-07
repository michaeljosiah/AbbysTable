'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

import {
  groupIndexOf,
  groupRange,
  resolveLegalAnchor,
  sectionByNumber,
  sectionsOf,
  type LegalDocument,
} from '@/lib/legal/document';

import { LEGAL_INDEX_ID, LEGAL_TOP_ID } from './ids';
import styles from './LegalDocument.module.css';

/*
 * The navigation layer over a legal document: the grouped index, the phone's
 * bottom sheet and floating Sections / Top pair, the scroll-spy and the URL.
 * The document itself is server-rendered and always complete; everything here
 * is enhancement over it (design/CLAUDE.md, "Long documents"):
 *
 * - Group row = disclosure; numbered row = navigation. Opening or closing a
 *   group never moves the page, the active section or the URL.
 * - A deliberate section click (an index row, a cross-reference in the copy)
 *   is `pushState`, so Back steps through the reader's choices. Passive scroll
 *   tracking is `replaceState`, so ordinary reading never fills the history.
 * - The spy is an IntersectionObserver TRIGGER plus a scroll-STOP pass: the
 *   observer can fire no event at the final resting position, so the settle
 *   pass makes the last decision. Never per-frame measurement.
 * - A deliberate click locks the spy out until its scroll settles, or every
 *   section the scroll passes would `replaceState` over the click's
 *   `pushState`. A timeout releases the lock only if no scroll happened (a
 *   scroll that does not move fires no event) — never mid-flight.
 * - Legacy number anchors (`#s30`, `#30`) resolve to their slug with
 *   `replaceState`, so the durable form is what gets copied and shared.
 *
 * History goes through `window.history`, which Next.js patches so its router
 * stays in step with the URL (the documented integration for native
 * pushState/replaceState).
 */

/** A section is the current one once its top has passed this line (px from the viewport top). */
const READING_LINE = 150;
/** Scrolling has stopped once no scroll event has arrived for this long. */
const SETTLE_MS = 140;
/** Releases a click's spy lock when its scroll never moved (so fired no event). */
const LOCK_FALLBACK_MS = 1200;
const DESKTOP_QUERY = '(min-width: 1024px)';

type HistoryMode = 'push' | 'replace';

interface LegalNavigationApi {
  doc: LegalDocument;
  inlineOpen: boolean;
  sheetOpen: boolean;
  /** The height the index held in the page when it lifted into the sheet, so nothing below moves. */
  sheetReserve: number | null;
  floatOn: boolean;
  /** The group whose rows are showing, or -1 for none. */
  openGroup: number;
  toggleInline: () => void;
  toggleGroup: (index: number) => void;
  openSheet: () => void;
  closeSheet: (options?: { returnFocus?: boolean }) => void;
  goTop: () => void;
  navRef: RefObject<HTMLElement | null>;
  navheadRef: RefObject<HTMLDivElement | null>;
  sectionsButtonRef: RefObject<HTMLButtonElement | null>;
}

const LegalNavigationContext = createContext<LegalNavigationApi | null>(null);

function useLegalNavigation(): LegalNavigationApi {
  const api = useContext(LegalNavigationContext);
  if (!api) throw new Error('LegalIndex and LegalFloat must be rendered inside LegalNavigation.');
  return api;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Smooth unless the reader asked for reduced motion (`instant` beats the global smooth scrolling). */
function motion(): ScrollBehavior {
  return prefersReducedMotion() ? 'instant' : 'smooth';
}

export function LegalNavigation({
  doc,
  linkTone,
  children,
}: {
  doc: LegalDocument;
  /** In-copy link ink: brass-ink on Terms of Sale, green-forest on the Privacy Policy. */
  linkTone: 'brass' | 'green';
  children: ReactNode;
}) {
  const sections = useMemo(() => sectionsOf(doc), [doc]);
  const first = sections[0];

  const [active, setActive] = useState(first?.n ?? 1);
  /** A group the reader opened or closed by hand: -1 for "all closed", null to follow reading. */
  const [manualGroup, setManualGroup] = useState<number | null>(null);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetReserve, setSheetReserve] = useState<number | null>(null);
  const [floatOn, setFloatOn] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navheadRef = useRef<HTMLDivElement>(null);
  const sectionsButtonRef = useRef<HTMLButtonElement>(null);

  /** The highlighted section, mirrored for listeners. */
  const activeRef = useRef(first?.n ?? 1);
  /** The slug the URL currently carries for the reading position ('' at the top). */
  const readingRef = useRef('');
  /** The group being read when the reader last pinned one: the pin lifts once they read past it. */
  const pinFromRef = useRef(0);
  const lockRef = useRef(false);
  const sawScrollRef = useRef(false);
  const sheetOpenRef = useRef(false);
  /** Whether the index was open in the page when the sheet took it, to put it back as it was. */
  const inlineBeforeSheet = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollFrame = useRef(0);

  const openGroup = manualGroup ?? groupIndexOf(doc, active);

  /* ---- Index state, written to the DOM ---------------------------------- */

  /**
   * `aria-current` is written to the links directly: re-rendering every index
   * row on each change of reading position is work the page does not need.
   */
  const markActive = useCallback((n: number) => {
    navRef.current?.querySelectorAll<HTMLElement>('a[data-n]').forEach((link) => {
      if (Number(link.dataset.n) === n) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, []);

  const writeHash = useCallback((slug: string | null, mode: HistoryMode) => {
    const current = window.location.hash.replace(/^#/, '');
    if ((slug ?? '') === current && mode === 'replace') return;
    const url = slug ? `#${slug}` : `${window.location.pathname}${window.location.search}`;
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }, []);

  const focusTop = useCallback(() => {
    document.getElementById(LEGAL_TOP_ID)?.focus({ preventScroll: true });
  }, []);

  /* ---- Moving through the document ------------------------------------- */

  /**
   * Scrolls a section to its anchor offset (its own `scroll-margin-top`, the
   * one value native jumps use too) and moves focus to its heading, so
   * keyboard and screen-reader users land where sighted readers do.
   */
  const scrollToSection = useCallback((slug: string, behavior: ScrollBehavior) => {
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      const target = document.getElementById(slug);
      if (!target) return;
      const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      sawScrollRef.current = false;
      window.scrollTo({ top: Math.max(0, top), behavior });
      clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => {
        // Bail if the page moved: the settle pass releases the lock once a
        // long smooth scroll actually ends.
        if (!sawScrollRef.current) lockRef.current = false;
      }, LOCK_FALLBACK_MS);
      const heading = target.querySelector<HTMLElement>('h3');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    });
  }, []);

  const closeSheet = useCallback(
    ({ returnFocus = true }: { returnFocus?: boolean } = {}) => {
      if (!sheetOpenRef.current) return;
      sheetOpenRef.current = false;
      setSheetOpen(false);
      // Back exactly as it was: an index that was open in the page returns to
      // the space held for it, so closing the sheet moves nothing either.
      setInlineOpen(inlineBeforeSheet.current);
      setSheetReserve(null);
      if (!returnFocus) return;
      requestAnimationFrame(() => {
        // The Sections button is `visibility: hidden` when the pair is off, and
        // a hidden element cannot take focus; the page heading is the fallback.
        const button = sectionsButtonRef.current;
        const visible = button?.offsetParent && getComputedStyle(button).visibility !== 'hidden';
        if (button && visible) {
          button.focus();
        } else {
          focusTop();
        }
      });
    },
    [focusTop],
  );

  /** A deliberate move to a section: lock the spy, write the URL, scroll, focus. */
  const goSection = useCallback(
    (n: number, mode: HistoryMode, behavior: ScrollBehavior) => {
      const section = sectionByNumber(doc, n);
      if (!section) return;
      const group = groupIndexOf(doc, n);
      closeSheet({ returnFocus: false });
      pinFromRef.current = group;
      lockRef.current = true;
      activeRef.current = n;
      readingRef.current = section.slug;
      setActive(n);
      setManualGroup(group);
      markActive(n);
      writeHash(section.slug, mode);
      scrollToSection(section.slug, behavior);
    },
    [doc, closeSheet, markActive, writeHash, scrollToSection],
  );

  const goTop = useCallback(() => {
    closeSheet({ returnFocus: false });
    window.scrollTo({ top: 0, behavior: motion() });
    // Focus travels with the scroll, or Tab would resume thirty screens down.
    focusTop();
  }, [closeSheet, focusTop]);

  /**
   * The spy's decision: the last section whose top has passed the reading
   * line. One pass over the list, called from a trigger — never per frame.
   * Above the first section the URL carries no fragment at all: the reader is
   * at the top of the document, not in clause 1.
   */
  const spyEval = useCallback(() => {
    let passed: (typeof sections)[number] | null = null;
    for (const section of sections) {
      const element = document.getElementById(section.slug);
      if (element && element.getBoundingClientRect().top <= READING_LINE) passed = section;
    }
    const slug = passed?.slug ?? '';
    if (slug === readingRef.current) return;
    readingRef.current = slug;

    const n = passed?.n ?? first?.n ?? 1;
    if (n !== activeRef.current) {
      activeRef.current = n;
      markActive(n);
      setActive(n);
      // A pinned group lets go once the reader has read into a different one.
      const group = groupIndexOf(doc, n);
      setManualGroup((pinned) => (pinned !== null && group !== pinFromRef.current ? null : pinned));
    }
    writeHash(passed?.slug ?? null, 'replace');
  }, [doc, sections, first, markActive, writeHash]);

  const floatCheck = useCallback(() => {
    const head = navheadRef.current;
    const root = rootRef.current;
    let on = Boolean(head) && head!.getBoundingClientRect().bottom < 0;
    // Never over the footer: the document has ended, and the pair would sit on
    // the footer's links.
    if (on && root && root.getBoundingClientRect().bottom < window.innerHeight - 40) on = false;
    setFloatOn(on);
  }, []);

  /* ---- Controls ------------------------------------------------------------ */

  const toggleInline = useCallback(() => {
    sheetOpenRef.current = false;
    setSheetOpen(false);
    setSheetReserve(null);
    setInlineOpen((open) => !open);
  }, []);

  const toggleGroup = useCallback(
    (index: number) => {
      pinFromRef.current = groupIndexOf(doc, activeRef.current);
      setManualGroup(openGroup === index ? -1 : index);
    },
    [doc, openGroup],
  );

  const openSheet = useCallback(() => {
    // The sheet is the same nav lifted out of the page. If it was open in the
    // page, hold its height, or everything below would jump up by it — and the
    // spy would read the jump as reading.
    const nav = navRef.current;
    const inline = Boolean(nav && nav.offsetParent !== null);
    inlineBeforeSheet.current = inline;
    setSheetReserve(inline && nav ? nav.offsetHeight : null);
    sheetOpenRef.current = true;
    setSheetOpen(true);
    setInlineOpen(true);
  }, []);

  /* ---- Effects ------------------------------------------------------------- */

  // On desktop the index scrolls on its own only when an open group makes it
  // taller than the window. Keep the current row inside it — the index's own
  // scroll, never the page's — once its group has rendered open.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.scrollHeight <= nav.clientHeight + 1) return;
    const row = nav.querySelector<HTMLElement>('a[aria-current]');
    if (!row || row.offsetParent === null) return;
    const navBox = nav.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    if (rowBox.top < navBox.top) nav.scrollTop -= navBox.top - rowBox.top + 8;
    else if (rowBox.bottom > navBox.bottom) nav.scrollTop += rowBox.bottom - navBox.bottom + 8;
  }, [active, openGroup]);

  // Arrival: resolve the fragment. The document is server-rendered, so the
  // browser has already jumped to a slug; the jump is re-asserted (without
  // animation) in case anything above it moved, and focus follows it. A legacy
  // number anchor is rewritten to its slug.
  useEffect(() => {
    const resolved = resolveLegalAnchor(doc, window.location.hash);
    if (resolved) {
      const { section, legacy } = resolved;
      const group = groupIndexOf(doc, section.n);
      pinFromRef.current = group;
      lockRef.current = true;
      activeRef.current = section.n;
      readingRef.current = section.slug;
      setActive(section.n);
      setManualGroup(group);
      markActive(section.n);
      if (legacy) writeHash(section.slug, 'replace');
      scrollToSection(section.slug, 'instant');
    } else {
      markActive(activeRef.current);
    }
    // Only on arrival: later fragments are handled by clicks and popstate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The spy: an IntersectionObserver trigger, a scroll-stop settle pass, and
  // the floating pair's visibility.
  useEffect(() => {
    const onSettled = () => {
      lockRef.current = false;
      clearTimeout(lockTimer.current);
      spyEval();
    };
    const onScroll = () => {
      sawScrollRef.current = true;
      floatCheck();
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(onSettled, SETTLE_MS);
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        () => {
          if (!lockRef.current) spyEval();
        },
        { rootMargin: `-${READING_LINE}px 0px -60% 0px`, threshold: 0 },
      );
      for (const section of sections) {
        const element = document.getElementById(section.slug);
        if (element) observer.observe(element);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', floatCheck);
    floatCheck();

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', floatCheck);
      clearTimeout(settleTimer.current);
      clearTimeout(lockTimer.current);
      cancelAnimationFrame(scrollFrame.current);
    };
  }, [sections, spyEval, floatCheck]);

  // Clicks inside the page: index rows, cross-references in the copy, and the
  // Back to top links. All are real fragment links, so this only enhances them
  // — and never a modified or non-primary click (a new tab must just work).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || !root.contains(link)) return;
      const href = link.getAttribute('href') ?? '';
      if (href === `#${LEGAL_TOP_ID}`) {
        event.preventDefault();
        goTop();
        return;
      }
      const resolved = resolveLegalAnchor(doc, href);
      if (!resolved) return;
      event.preventDefault();
      goSection(resolved.section.n, 'push', motion());
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [doc, goSection, goTop]);

  // Back / Forward through the reader's selections.
  useEffect(() => {
    const pathname = window.location.pathname;
    const onPopState = () => {
      // Back to another page (client-side history): not ours to resolve, even
      // where its fragment looks like one of this document's.
      if (window.location.pathname !== pathname) return;
      const resolved = resolveLegalAnchor(doc, window.location.hash);
      // Back to the bare address: the browser restores that entry's position.
      if (!resolved) return;
      const { section, legacy } = resolved;
      const group = groupIndexOf(doc, section.n);
      pinFromRef.current = group;
      lockRef.current = true;
      activeRef.current = section.n;
      readingRef.current = section.slug;
      setActive(section.n);
      setManualGroup(group);
      markActive(section.n);
      if (legacy) writeHash(section.slug, 'replace');
      scrollToSection(section.slug, motion());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [doc, markActive, writeHash, scrollToSection]);

  // The sheet: focus in, Tab trapped, Escape closes, the page behind locked.
  // It is a phone presentation only, so widening past 1024 closes it — at
  // desktop both its scrim and the control that dismisses it are hidden.
  useEffect(() => {
    const nav = navRef.current;
    if (!sheetOpen || !nav) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // The nav was display: none until this commit; take focus once it is laid out.
    let frame = 0;
    let tries = 12;
    const takeFocus = () => {
      const firstControl = nav.querySelector<HTMLElement>('button, a[href]');
      if (firstControl && firstControl.offsetParent !== null) {
        firstControl.focus();
        return;
      }
      if (tries-- > 0) frame = requestAnimationFrame(takeFocus);
    };
    frame = requestAnimationFrame(takeFocus);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSheet();
      } else if (event.key === 'Tab') {
        trapFocus(event, nav);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onDesktop = () => {
      if (desktop.matches) closeSheet({ returnFocus: false });
    };
    desktop.addEventListener('change', onDesktop);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onDesktop);
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen, closeSheet]);

  const api = useMemo<LegalNavigationApi>(
    () => ({
      doc,
      inlineOpen,
      sheetOpen,
      sheetReserve,
      floatOn,
      openGroup,
      toggleInline,
      toggleGroup,
      openSheet,
      closeSheet,
      goTop,
      navRef,
      navheadRef,
      sectionsButtonRef,
    }),
    [
      doc,
      inlineOpen,
      sheetOpen,
      sheetReserve,
      floatOn,
      openGroup,
      toggleInline,
      toggleGroup,
      openSheet,
      closeSheet,
      goTop,
    ],
  );

  return (
    <LegalNavigationContext.Provider value={api}>
      <div ref={rootRef} className={styles.root} data-link-tone={linkTone}>
        {children}
      </div>
    </LegalNavigationContext.Provider>
  );
}

const NO_SCRIPT_INDEX =
  `.${styles.nav},.${styles.groupList}{display:block}` +
  `.${styles.jumpToggle} .${styles.chevron}{display:none}`;

/**
 * The grouped index. FIRST in the DOM at every width, so focus order matches
 * what is on screen: collapsed under "Jump to a section" on a phone, a bottom
 * sheet when opened from the floating Sections control, a sticky column from
 * 1024 — one nav element, never a second copy.
 */
export function LegalIndex() {
  const api = useLegalNavigation();
  const { doc, inlineOpen, sheetOpen, sheetReserve, openGroup, toggleInline, toggleGroup } = api;
  const reserve = sheetReserve ? { paddingBottom: sheetReserve } : undefined;

  return (
    <div className={styles.indexColumn} style={reserve}>
      {/* Without JavaScript the toggles cannot work, so the whole index shows. */}
      <noscript>
        <style>{NO_SCRIPT_INDEX}</style>
      </noscript>

      <div ref={api.navheadRef} className={styles.navhead}>
        <p className={styles.eyebrow}>On this page</p>
        <button
          type="button"
          className={styles.jumpToggle}
          onClick={toggleInline}
          aria-expanded={inlineOpen}
          aria-controls={LEGAL_INDEX_ID}
        >
          <span>Jump to a section</span>
          <span className={styles.chevron} aria-hidden="true" />
        </button>
      </div>

      <nav
        ref={api.navRef}
        id={LEGAL_INDEX_ID}
        className={styles.nav}
        aria-label={doc.navLabel}
        data-open={inlineOpen || undefined}
        data-sheet={sheetOpen || undefined}
      >
        <div className={styles.navTitle}>
          <p className={styles.eyebrow}>On this page</p>
        </div>
        {doc.groups.map((group, index) => {
          const open = openGroup === index;
          const listId = `${LEGAL_INDEX_ID}-${index}`;
          return (
            <div key={group.title} className={styles.group} data-open={open || undefined}>
              <button
                type="button"
                className={styles.groupToggle}
                onClick={() => toggleGroup(index)}
                aria-expanded={open}
                aria-controls={listId}
              >
                <span className={styles.chevron} aria-hidden="true" />
                <span className={styles.groupLabel}>{group.title}</span>
                <span className={styles.groupRange} aria-hidden="true">
                  {groupRange(group)}
                </span>
              </button>
              <ul id={listId} className={styles.groupList}>
                {group.sections.map((section) => (
                  <li key={section.slug}>
                    <a className={styles.jump} href={`#${section.slug}`} data-n={section.n}>
                      <span className={styles.jumpNumber} aria-hidden="true">
                        {section.n}.
                      </span>
                      <span>{section.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * The floating Sections / Top pair (phone only), after the document in the
 * DOM so it comes last in the tab order, as it is last on screen. Suppressed
 * until the inline index has scrolled away, over the footer, and while the
 * cookie banner is up (`data-consent-yield`: the consent layer has priority).
 */
export function LegalFloat() {
  const { sheetOpen, floatOn, openSheet, closeSheet, goTop, sectionsButtonRef } =
    useLegalNavigation();

  return (
    <>
      {sheetOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close the section list"
          tabIndex={-1}
          onClick={() => closeSheet()}
        />
      ) : null}
      <div className={styles.float} data-on={floatOn || undefined} data-consent-yield>
        <button
          ref={sectionsButtonRef}
          type="button"
          className={`${styles.floatButton} ${styles.sections}`}
          onClick={openSheet}
          aria-expanded={sheetOpen}
          aria-controls={LEGAL_INDEX_ID}
        >
          <span className={styles.sectionsGlyph} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Sections</span>
        </button>
        <button type="button" className={`${styles.floatButton} ${styles.top}`} onClick={goTop}>
          <span className={styles.topArrow} aria-hidden="true">
            &#8593;
          </span>
          <span>Top</span>
        </button>
      </div>
    </>
  );
}

/** Keeps Tab and Shift+Tab inside the open sheet. */
function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  const controls = Array.from(container.querySelectorAll<HTMLElement>('button, a[href]')).filter(
    (element) => element.getClientRects().length > 0,
  );
  if (controls.length === 0) {
    event.preventDefault();
    return;
  }
  const firstControl = controls[0];
  const lastControl = controls[controls.length - 1];
  const activeElement = document.activeElement;

  if (!container.contains(activeElement)) {
    event.preventDefault();
    (event.shiftKey ? lastControl : firstControl).focus();
    return;
  }
  if (event.shiftKey && activeElement === firstControl) {
    event.preventDefault();
    lastControl.focus();
  } else if (!event.shiftKey && activeElement === lastControl) {
    event.preventDefault();
    firstControl.focus();
  }
}
