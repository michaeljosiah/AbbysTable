'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import type { MappedFacetGroup } from '@/lib/aonik/map';
import { EATING_STYLE_DEFINITIONS, EATING_STYLE_NOTE_HEAD } from '@/lib/content/menu';
import { OVERLAY_OPEN_ATTR } from '@/lib/dom/documentFlag';
import { trapFocus } from '@/lib/dom/focusTrap';
import { useDocumentFlag, useMediaQuery } from '@/lib/dom/hooks';
import { readPageScroll } from '@/lib/dom/pageScroll';
import { FACET_KEY, heatChipPips, isHeatGroup } from '@/lib/menu/facets';
import { dishCount, type MenuFilters } from '@/lib/menu/filters';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';

import { FilterChip } from './FilterChip';
import styles from './MenuToolbar.module.css';

/** The panel's id — the Filters button's `aria-controls`. */
export const MENU_FILTERS_ID = 'menu-filters';

const STYLE_NOTE_ID = 'menu-style-note';

interface MenuFilterSheetProps {
  open: boolean;
  onClose: () => void;
  /** Where focus goes back to when the sheet closes: the Filters button. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  /** Tenant-authored groups, in Aonik's order. */
  groups: MappedFacetGroup[];
  filters: MenuFilters;
  onToggle: (key: string, value: string) => void;
  onClearGroup: (key: string) => void;
  onClearFilters: () => void;
  totalCount: number;
}

/**
 * The filter groups — ONE set of content in two compositions (Menu Landing
 * v3): a bottom sheet below 1024, an inline four-column panel inside the
 * filter card from 1024. Always mounted and closed with `display: none`, so
 * the Filters button's `aria-controls` always resolves and a shut panel is out
 * of the tab order and the accessibility tree.
 *
 * As a SHEET it is a modal dialog: focus moves into it and is trapped, the
 * page behind does not scroll, Escape closes it and focus returns to the
 * Filters button; it holds `data-overlay-open` on <html>, so the purchase bar
 * and ↑ Top yield to it. As an inline PANEL it is part of the page, so the
 * dialog role and `aria-modal` are swapped off at 1024 (an inline panel
 * announcing aria-modal would tell a screen reader the page is unavailable)
 * and back on below it — in React, from the same media query, never in markup
 * that differs between server and client.
 */
export function MenuFilterSheet({
  open,
  onClose,
  returnFocusRef,
  groups,
  filters,
  onToggle,
  onClearGroup,
  onClearFilters,
  totalCount,
}: MenuFilterSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const sheet = open && !desktop;
  const [noteOpen, setNoteOpen] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLButtonElement>(null);
  const hasActive = Object.values(filters).some((values) => values.length > 0);

  useDocumentFlag(OVERLAY_OPEN_ATTR, sheet);

  const close = useCallback(() => {
    setNoteOpen(false);
    onClose();
    // Back to the Filters button — once it is laid out again under a scroll
    // lock that has just been released.
    requestAnimationFrame(() => returnFocusRef.current?.focus({ preventScroll: true }));
  }, [onClose, returnFocusRef]);

  // Opening takes focus into the panel: it left `display: none` in this commit.
  useEffect(() => {
    if (!open) {
      setNoteOpen(false);
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    let tries = 12;
    let frame = 0;
    const take = () => {
      if (panel.getClientRects().length > 0) {
        panel.focus({ preventScroll: desktop });
        return;
      }
      if (tries-- > 0) frame = requestAnimationFrame(take);
    };
    take();
    return () => cancelAnimationFrame(frame);
    // Only on opening: a resize across 1024 must not pull focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The sheet is modal: Tab stays inside and the page behind does not scroll —
  // the body, and the ancestor that holds the page when one does (a host
  // preview, an embed: the shared tracker's scroller).
  useEffect(() => {
    const panel = panelRef.current;
    if (!sheet || !panel) return;
    const tracked = readPageScroll()?.scroller;
    const held = tracked instanceof HTMLElement && tracked.isConnected ? [document.body, tracked] : [document.body];
    const previous = held.map((element) => element.style.overflow);
    for (const element of held) element.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') trapFocus(event, panel);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      held.forEach((element, index) => {
        element.style.overflow = previous[index];
      });
    };
  }, [sheet]);

  // Escape: the open note first, then the sheet. The inline panel closes too
  // while focus is inside it — at desktop it is part of the page, so an Escape
  // pressed elsewhere is not its business.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (noteOpen) {
        event.preventDefault();
        setNoteOpen(false);
        infoRef.current?.focus();
        return;
      }
      if (!desktop || panelRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, noteOpen, desktop, close]);

  // The note closes on a press anywhere but itself and its "i" — including the
  // chips in its own group.
  useEffect(() => {
    if (!noteOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (noteRef.current?.contains(target) || infoRef.current?.contains(target)) return;
      setNoteOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [noteOpen]);

  return (
    <div className={styles.sheetWrap} data-open={open || undefined}>
      <div className={styles.scrim} onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        id={MENU_FILTERS_ID}
        className={styles.sheet}
        role={desktop ? 'group' : 'dialog'}
        aria-modal={desktop ? undefined : true}
        aria-label="Filter the menu"
        tabIndex={-1}
      >
        <div className={styles.sheetHead}>
          <p className={styles.sheetTitle}>Filters</p>
          <button type="button" className={styles.close} onClick={close} aria-label="Close filters">
            {/* An SVG cross, never a text × (design/CLAUDE.md, "Close controls"). */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className={styles.sheetBody}>
          <div className={styles.groups}>
            {groups.map((group) => {
              const selected = filters[group.key] ?? [];
              const titleId = `menu-filter-${group.key}`;
              const heat = isHeatGroup(group.key);
              // The note defines only the styles this group offers.
              const definitions =
                group.key === FACET_KEY.style
                  ? group.options.flatMap((option) =>
                      EATING_STYLE_DEFINITIONS[option.label]
                        ? [{ term: option.label, body: EATING_STYLE_DEFINITIONS[option.label] }]
                        : [],
                    )
                  : [];

              return (
                <div key={group.key} className={styles.group} role="group" aria-labelledby={titleId}>
                  <div className={styles.groupHead}>
                    <span id={titleId} className={styles.groupTitle}>
                      {group.label}
                    </span>
                    {definitions.length > 0 ? (
                      <button
                        ref={infoRef}
                        type="button"
                        className={styles.info}
                        aria-label="What do these eating styles mean?"
                        aria-controls={STYLE_NOTE_ID}
                        aria-expanded={noteOpen}
                        onClick={() => setNoteOpen((value) => !value)}
                      >
                        <span aria-hidden="true">i</span>
                      </button>
                    ) : null}
                  </div>

                  {/* In the flow of its own group, between the head and the
                      chips, so it can never cover them or be clipped by the
                      sheet's scroll box. Click-only: hover-to-open fires while
                      scrolling a sheet. */}
                  {definitions.length > 0 ? (
                    <div
                      ref={noteRef}
                      id={STYLE_NOTE_ID}
                      className={styles.note}
                      data-open={noteOpen || undefined}
                    >
                      <span className={styles.noteTop}>
                        <span className={styles.noteHead}>{EATING_STYLE_NOTE_HEAD}</span>
                        <button
                          type="button"
                          className={styles.noteClose}
                          onClick={() => {
                            setNoteOpen(false);
                            infoRef.current?.focus();
                          }}
                          aria-label="Close the eating style note"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d="m6 6 12 12M18 6 6 18" />
                          </svg>
                        </button>
                      </span>
                      {definitions.map(({ term, body }) => (
                        <span key={term} className={styles.definition}>
                          <b>{term}</b>
                          {body}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className={styles.chips}>
                    <FilterChip
                      label="All"
                      selected={selected.length === 0}
                      onClick={() => onClearGroup(group.key)}
                    />
                    {group.options.map((option) => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        selected={selected.includes(option.value)}
                        onClick={() => onToggle(group.key, option.value)}
                        pips={heat ? heatChipPips(option.value) : 0}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.sheetFoot}>
          {hasActive ? (
            <button type="button" className={styles.textButton} onClick={onClearFilters}>
              <span>Clear all filters</span>
            </button>
          ) : null}
          <button type="button" className={styles.apply} onClick={close}>
            Show {dishCount(totalCount)}
          </button>
        </div>
      </div>
    </div>
  );
}
