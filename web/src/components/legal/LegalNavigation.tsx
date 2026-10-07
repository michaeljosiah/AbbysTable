'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';

import { CONSENT_READY_ATTRIBUTE } from '@/lib/consent/consent';
import {
  groupIndexOf,
  groupRange,
  resolveLegalAnchor,
  sectionsOf,
  type LegalDocument,
  type LegalSection,
} from '@/lib/legal/document';
import { fragmentUrl, linkTarget } from '@/lib/legal/history';

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
 * - A deliberate section click (an index row, a cross-reference in the copy, a
 *   link anywhere to this page's own sections) is `pushState`, so Back steps
 *   through the reader's choices.
 * - Passive tracking keeps the index's current row live, but writes the URL
 *   (`replaceState`) only once scrolling has STOPPED, only when the section
 *   has changed, and at most once a second. Reading never fills the history,
 *   and never trips WebKit's limit on history calls (it throws a SecurityError
 *   after 100 in a short window; Next's patched history makes each write two).
 * - The spy is an IntersectionObserver TRIGGER plus that scroll-stop pass: the
 *   observer can fire no event at the final resting position, so the settle
 *   pass makes the last decision. Never per-frame measurement.
 * - A deliberate click locks the spy out until its scroll settles. A timeout
 *   releases the lock only if no scroll happened (a scroll that does not move
 *   fires no event) — never mid-flight.
 * - Legacy number anchors (`#s30`, `#30`) resolve to their slug with
 *   `replaceState`, so the durable form is what gets copied and shared.
 * - Nothing is written once the reader has left: Next pushes the next page's
 *   URL before this one unmounts (`fragmentUrl`).
 *
 * History goes through `window.history`, which Next.js patches so its router
 * stays in step with the URL (the documented integration for native
 * pushState/replaceState).
 */

/** A section is the current one once its top has passed this line (px from the viewport top). */
const READING_LINE = 150;
/** Scrolling has stopped once no scroll event has arrived for this long. */
const SETTLE_MS = 200;
/** Releases a click's spy lock when its scroll never moved (so fired no event). */
const LOCK_FALLBACK_MS = 1200;
/** The fewest milliseconds between two passive URL writes. */
const URL_INTERVAL_MS = 1000;
const DESKTOP_QUERY = '(min-width: 1024px)';
/** The sheet's accessible name: the index's own "On this page" title. */
const SHEET_TITLE_ID = `${LEGAL_INDEX_ID}-title`;

type HistoryMode = 'push' | 'replace';

interface LegalNavigationApi {
  doc: LegalDocument;
  /** False on the server and until hydration: the disclosure buttons exist only once they can work. */
  hydrated: boolean;
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
  panelRef: RefObject<HTMLDivElement | null>;
  navRef: RefObject<HTMLElement | null>;
  navheadRef: RefObject<HTMLDivElement | null>;
  sectionsButtonRef: RefObject<HTMLButtonElement | null>;
  backdropRef: RefObject<HTMLButtonElement | null>;
}

const LegalNavigationContext = createContext<LegalNavigationApi | null>(null);

function useLegalNavigation(): LegalNavigationApi {
  const api = useContext(LegalNavigationContext);
  if (!api) throw new Error('LegalIndex and LegalFloat must be rendered inside LegalNavigation.');
  return api;
}

const noSubscription = () => () => {};

/** True once hydrated on the client; false on the server and during hydration. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
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
  const firstN = sections[0]?.n ?? 1;
  const hydrated = useHydrated();

  const [active, setActive] = useState(firstN);
  /** A group the reader opened or closed by hand: -1 for "all closed", null to follow reading. */
  const [manualGroup, setManualGroup] = useState<number | null>(null);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetReserve, setSheetReserve] = useState<number | null>(null);
  const [floatOn, setFloatOn] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navheadRef = useRef<HTMLDivElement>(null);
  const sectionsButtonRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);

  /** The pathname this document was mounted under: the only URL it may ever write to. */
  const documentPath = useRef<string | null>(null);
  /** The highlighted section, mirrored for listeners. */
  const activeRef = useRef(firstN);
  /** The group being read when the reader last pinned one: the pin lifts once they read past it. */
  const pinFromRef = useRef(0);
  const lockRef = useRef(false);
  const sawScrollRef = useRef(false);
  const sheetOpenRef = useRef(false);
  /** Whether the index was open in the page when the sheet took it, to put it back as it was. */
  const inlineBeforeSheet = useRef(false);
  const lastUrlWrite = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollFrame = useRef(0);

  const openGroup = manualGroup ?? groupIndexOf(doc, active);

  /* ---- The URL ------------------------------------------------------------- */

  /**
   * True while this document is the page being read: mounted, still under the
   * pathname it was mounted under, and with its sections in the DOM.
   */
  const isCurrent = useCallback(() => {
    if (documentPath.current === null || window.location.pathname !== documentPath.current) return false;
    return sections.some((section) => document.getElementById(section.slug) !== null);
  }, [sections]);

  /** Writes the reading position into the URL; false when nothing was (or may be) written. */
  const writeUrl = useCallback(
    (slug: string | null, mode: HistoryMode): boolean => {
      if (!isCurrent()) return false;
      const url = fragmentUrl(window.location, documentPath.current!, slug);
      if (url === null) return false;
      if (mode === 'push') window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
      lastUrlWrite.current = Date.now();
      return true;
    },
    [isCurrent],
  );

  /* ---- Index state, written to the DOM ------------------------------------- */

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

  /** The last section whose top has passed the reading line; null above the first. */
  const readPosition = useCallback((): LegalSection | null => {
    let passed: LegalSection | null = null;
    for (const section of sections) {
      const element = document.getElementById(section.slug);
      if (element && element.getBoundingClientRect().top <= READING_LINE) passed = section;
    }
    return passed;
  }, [sections]);

  /** Moves the index's current row. Live while scrolling — it touches no history. */
  const highlight = useCallback(
    (n: number) => {
      if (n === activeRef.current) return;
      activeRef.current = n;
      markActive(n);
      setActive(n);
      // A pinned group lets go once the reader has read into a different one.
      const group = groupIndexOf(doc, n);
      setManualGroup((pinned) => (pinned !== null && group !== pinFromRef.current ? null : pinned));
    },
    [doc, markActive],
  );

  /**
   * The passive URL write, from the scroll-stop pass only: the section being
   * read, or no fragment above the first one (the reader is at the top of the
   * document, not in clause 1). At most one write a second; a write held back
   * re-reads the position when it runs. A deliberate move (a click, Back or
   * Forward) cancels a held-back write, and one that fires while such a move
   * still has the spy locked writes nothing: mid-scroll it would replace the
   * entry the reader just chose with whatever section was passing. The settle
   * pass that releases the lock calls this again.
   */
  const syncUrl = useCallback(() => {
    clearTimeout(urlTimer.current);
    const write = () => {
      if (lockRef.current) return;
      writeUrl(readPosition()?.slug ?? null, 'replace');
    };
    const wait = lastUrlWrite.current + URL_INTERVAL_MS - Date.now();
    if (wait <= 0) write();
    else urlTimer.current = setTimeout(write, wait);
  }, [readPosition, writeUrl]);

  const focusTop = useCallback(() => {
    document.getElementById(LEGAL_TOP_ID)?.focus({ preventScroll: true });
  }, []);

  /* ---- Moving through the document ----------------------------------------- */

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

  /** Shows a section as the one being read, and pins its group open. */
  const select = useCallback(
    (section: LegalSection) => {
      const group = groupIndexOf(doc, section.n);
      pinFromRef.current = group;
      activeRef.current = section.n;
      setActive(section.n);
      setManualGroup(group);
      markActive(section.n);
    },
    [doc, markActive],
  );

  /** A deliberate move to a section: lock the spy, write the URL, scroll, focus. */
  const goSection = useCallback(
    (section: LegalSection, mode: HistoryMode, behavior: ScrollBehavior) => {
      closeSheet({ returnFocus: false });
      clearTimeout(urlTimer.current);
      lockRef.current = true;
      select(section);
      writeUrl(section.slug, mode);
      scrollToSection(section.slug, behavior);
    },
    [closeSheet, select, writeUrl, scrollToSection],
  );

  const goTop = useCallback(() => {
    closeSheet({ returnFocus: false });
    clearTimeout(urlTimer.current);
    window.scrollTo({ top: 0, behavior: motion() });
    // Focus travels with the scroll, or Tab would resume thirty screens down.
    focusTop();
  }, [closeSheet, focusTop]);

  /**
   * The Sections / Top pair shows once the whole of the inline index — its
   * "Jump to a section" head and, when it is open, the list under it — has
   * scrolled away, and never over the footer.
   */
  const floatCheck = useCallback(() => {
    const head = navheadRef.current;
    const nav = navRef.current;
    const root = rootRef.current;
    if (!head) return;
    let bottom = head.getBoundingClientRect().bottom;
    if (nav && !sheetOpenRef.current && nav.getClientRects().length > 0) {
      bottom = Math.max(bottom, nav.getBoundingClientRect().bottom);
    }
    let on = bottom < 0;
    // Never over the footer: the document has ended, and the pair would sit on
    // the footer's links.
    if (on && root && root.getBoundingClientRect().bottom < window.innerHeight - 40) on = false;
    // While the sheet is up the pair stays as it was, under the scrim.
    if (sheetOpenRef.current) return;
    setFloatOn(on);
  }, []);

  /* ---- Controls -------------------------------------------------------------- */

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
    // The sheet is the same index lifted out of the page. If it was open in
    // the page, hold its height, or everything below would jump up by it — and
    // the spy would read the jump as reading.
    const panel = panelRef.current;
    const inline = Boolean(navRef.current && navRef.current.getClientRects().length > 0);
    inlineBeforeSheet.current = inline;
    setSheetReserve(inline && panel ? panel.offsetHeight : null);
    sheetOpenRef.current = true;
    setSheetOpen(true);
    setInlineOpen(true);
  }, []);

  /* ---- Effects ---------------------------------------------------------------- */

  // On desktop the index scrolls on its own only when an open group makes it
  // taller than the window. Keep the current row inside it — the index's own
  // scroll, never the page's — once its group has rendered open.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || panel.scrollHeight <= panel.clientHeight + 1) return;
    const row = panel.querySelector<HTMLElement>('a[aria-current]');
    if (!row || row.getClientRects().length === 0) return;
    const panelBox = panel.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    if (rowBox.top < panelBox.top) panel.scrollTop -= panelBox.top - rowBox.top + 8;
    else if (rowBox.bottom > panelBox.bottom) panel.scrollTop += rowBox.bottom - panelBox.bottom + 8;
  }, [active, openGroup]);

  // Arrival: resolve the fragment. The document is server-rendered, so the
  // browser has already jumped to a slug; the jump is re-asserted (without
  // animation) in case anything above it moved, and focus follows it. A legacy
  // number anchor is rewritten to its slug.
  useEffect(() => {
    documentPath.current = window.location.pathname;
    const resolved = resolveLegalAnchor(doc, window.location.hash);
    if (resolved) {
      lockRef.current = true;
      select(resolved.section);
      if (resolved.legacy) writeUrl(resolved.section.slug, 'replace');
      scrollToSection(resolved.section.slug, 'instant');
    } else {
      markActive(activeRef.current);
    }
    return () => {
      // Unmounted: write nothing more, whatever is still in flight.
      documentPath.current = null;
    };
    // Only on arrival: later fragments are handled by clicks and popstate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The spy: an IntersectionObserver trigger keeps the current row live; the
  // scroll-stop pass settles it and writes the URL. Also the pair's visibility.
  useEffect(() => {
    const onSettled = () => {
      lockRef.current = false;
      clearTimeout(lockTimer.current);
      if (!isCurrent()) return;
      highlight(readPosition()?.n ?? firstN);
      syncUrl();
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
          if (!lockRef.current && isCurrent()) highlight(readPosition()?.n ?? firstN);
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
      clearTimeout(urlTimer.current);
      cancelAnimationFrame(scrollFrame.current);
    };
  }, [sections, firstN, isCurrent, highlight, readPosition, syncUrl, floatCheck]);

  // The pair's threshold moves with the inline index: re-check once it opens,
  // closes or comes back from the sheet.
  useEffect(() => {
    floatCheck();
  }, [inlineOpen, sheetOpen, floatCheck]);

  // Links to this page's own sections, wherever they are — the index rows,
  // cross-references in the copy, Back to top, and links outside the document
  // that point at it (the cookie panel's "section 7" while already on
  // /privacy). All are real links, so this only enhances them: a deliberate
  // jump, with the URL pushed and focus on the heading. Captured before the
  // link's own handlers, so `next/link` sees it handled and does not navigate;
  // never a modified, non-primary or new-tab click.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      // A consent trigger belongs to the consent manager while it runs; only
      // without it is the footer's "Cookie preferences" a link to section 7.
      if (link.closest('[data-consent-open]') && document.documentElement.hasAttribute(CONSENT_READY_ATTRIBUTE)) {
        return;
      }
      if (!isCurrent()) return;
      const target = linkTarget(doc, link.href, window.location, LEGAL_TOP_ID);
      if (!target) return;
      event.preventDefault();
      if (target === 'top') goTop();
      else goSection(target, 'push', motion());
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [doc, isCurrent, goSection, goTop]);

  // Back / Forward through the reader's selections.
  useEffect(() => {
    const onPopState = () => {
      // A held-back passive write would land on the entry just returned to.
      clearTimeout(urlTimer.current);
      // Back to another page (client-side history): not ours to resolve, even
      // where its fragment looks like one of this document's.
      if (!isCurrent()) return;
      const resolved = resolveLegalAnchor(doc, window.location.hash);
      // Back to the bare address: the browser restores that entry's position.
      if (!resolved) return;
      lockRef.current = true;
      select(resolved.section);
      if (resolved.legacy) writeUrl(resolved.section.slug, 'replace');
      scrollToSection(resolved.section.slug, motion());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [doc, isCurrent, select, writeUrl, scrollToSection]);

  // The sheet is a true modal: focus in and trapped, Escape closes, the page
  // behind is inert and does not scroll. It is a phone presentation only, so
  // widening past 1024 closes it — at desktop both its scrim and the control
  // that dismisses it are hidden — and with it go the dialog role and `inert`.
  useEffect(() => {
    const panel = panelRef.current;
    if (!sheetOpen || !panel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const releaseInert = inertOutside([panel, backdropRef.current]);

    // The sheet was not laid out until this commit; take focus once it is.
    let frame = 0;
    let tries = 12;
    const takeFocus = () => {
      const firstControl = panel.querySelector<HTMLElement>('button, a[href]');
      if (firstControl && firstControl.getClientRects().length > 0) {
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
        trapFocus(event, panel);
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
      releaseInert();
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen, closeSheet]);

  const api = useMemo<LegalNavigationApi>(
    () => ({
      doc,
      hydrated,
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
      panelRef,
      navRef,
      navheadRef,
      sectionsButtonRef,
      backdropRef,
    }),
    [
      doc,
      hydrated,
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

/**
 * Without JavaScript nothing can toggle, so the whole index shows under its
 * own title, the "Jump to a section" head goes, and the group rows (rendered
 * as plain labels until hydration — see `LegalIndex`) lose their chevrons.
 */
const NO_SCRIPT_INDEX =
  `.${styles.navhead}{display:none}` +
  `.${styles.nav},.${styles.groupList},.${styles.navTitle}{display:block}` +
  `.${styles.groupToggle} .${styles.chevron}{display:none}`;

/**
 * The grouped index. FIRST in the DOM at every width, so focus order matches
 * what is on screen: collapsed under "Jump to a section" on a phone, a bottom
 * sheet (a modal dialog) when opened from the floating Sections control, a
 * sticky column from 1024 — one nav element, never a second copy.
 */
export function LegalIndex() {
  const api = useLegalNavigation();
  const { doc, hydrated, inlineOpen, sheetOpen, sheetReserve, openGroup, toggleInline, toggleGroup } = api;
  const reserve = sheetReserve ? { paddingBottom: sheetReserve } : undefined;

  return (
    <div className={styles.indexColumn} style={reserve}>
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

      {/* The frame the index is positioned by: in the page on a phone, a modal
          sheet from the Sections control, sticky from 1024. The dialog role
          belongs here (a <nav> cannot take it), and only while it is a sheet. */}
      <div
        ref={api.panelRef}
        className={styles.indexPanel}
        data-sheet={sheetOpen || undefined}
        role={sheetOpen ? 'dialog' : undefined}
        aria-modal={sheetOpen || undefined}
        aria-labelledby={sheetOpen ? SHEET_TITLE_ID : undefined}
      >
        <nav
          ref={api.navRef}
          id={LEGAL_INDEX_ID}
          className={styles.nav}
          aria-label={doc.navLabel}
          data-open={inlineOpen || undefined}
        >
          <div className={styles.navTitle}>
            <p id={SHEET_TITLE_ID} className={styles.eyebrow}>
              On this page
            </p>
          </div>
          {doc.groups.map((group, index) => {
            const open = openGroup === index;
            const listId = `${LEGAL_INDEX_ID}-${index}`;
            const row = (
              <>
                <span className={styles.chevron} aria-hidden="true" />
                <span className={styles.groupLabel}>{group.title}</span>
                <span className={styles.groupRange} aria-hidden="true">
                  {groupRange(group)}
                </span>
              </>
            );
            return (
              <div key={group.title} className={styles.group} data-open={open || undefined}>
                {/* A disclosure only once it can work: before hydration (and
                    without JavaScript) the row is a plain label. */}
                {hydrated ? (
                  <button
                    type="button"
                    className={styles.groupToggle}
                    onClick={() => toggleGroup(index)}
                    aria-expanded={open}
                    aria-controls={listId}
                  >
                    {row}
                  </button>
                ) : (
                  <div className={styles.groupToggle}>{row}</div>
                )}
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
  const { sheetOpen, floatOn, openSheet, closeSheet, goTop, sectionsButtonRef, backdropRef } =
    useLegalNavigation();

  return (
    <>
      {sheetOpen ? (
        <button
          ref={backdropRef}
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

/**
 * Makes everything outside `keep` inert — every sibling of each kept element
 * and of each of its ancestors, up to <body> — and returns the undo. Only
 * elements this call made inert are released, so one already inert stays so.
 */
function inertOutside(keep: ReadonlyArray<Element | null>): () => void {
  const kept = keep.filter((element): element is Element => element !== null);
  const chain = new Set<Element>();
  for (const element of kept) {
    for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
      chain.add(node);
    }
  }
  const changed: Element[] = [];
  for (const node of chain) {
    const parent = node.parentElement;
    if (!parent) continue;
    for (const sibling of Array.from(parent.children)) {
      if (chain.has(sibling) || sibling.hasAttribute('inert')) continue;
      if (sibling instanceof HTMLScriptElement || sibling instanceof HTMLStyleElement) continue;
      sibling.setAttribute('inert', '');
      changed.push(sibling);
    }
  }
  return () => {
    for (const element of changed) element.removeAttribute('inert');
  };
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
