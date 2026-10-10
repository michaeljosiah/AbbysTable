'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import { CONTACT_HREF } from '@/lib/content/navigation';
import { useOverlay } from './checkout/useOverlay';

import styles from './HelpPanel.module.css';

/**
 * The "Questions?" slide-over: searchable FAQs and the published contact route.
 *
 * Controlled by the caller so whatever owns the checkout chrome decides when it
 * opens; the panel owns everything inside it.
 */
interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  /** The page's own questions (the payment pages'); the box steps' by default. */
  faqs?: readonly Faq[];
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

/** Approved FAQ structure, with answers limited to supported storefront behaviour. */
const FAQS: Faq[] = [
  {
    id: 'allergens',
    question: 'Where can I see allergens?',
    answer:
      'You can view allergens on each dish page under the Allergens section. Allergens are also shown in your box summary before checkout.',
  },
  {
    id: 'cater',
    question: 'Can Abby’s Table cater for allergies?',
    answer:
      'If you have a food allergy or intolerance, please review the allergen information carefully before placing your order. If anything is unclear, contact us before ordering.',
  },
  {
    id: 'kitchen',
    question:
      'Are your meals prepared in a kitchen that handles nuts or shellfish?',
    answer:
      'Different allergens are handled within our kitchen. Please check the current allergen information and precautionary wording for each dish before ordering.',
  },
  {
    id: 'remove',
    question: 'Can I remove an ingredient I’m allergic to?',
    answer:
      'The portion choice changes the amount of food, not the recipe. Check each dish’s current ingredients and allergen information, and contact us before ordering if anything is unclear.',
  },
  {
    id: 'size',
    question: 'Which box size is right for me?',
    answer:
      'Choose a set box size or set your own quantity. The available sizes and prices are shown on Build your box.',
  },
  {
    id: 'build',
    question: 'What does ‘build your own’ mean?',
    answer:
      'Set your own dish quantity on Build your box. The price and any available savings update with your choice.',
  },
  {
    id: 'delivery',
    question: 'When will my box be delivered?',
    answer:
      'Check your postcode for delivery coverage. You’ll choose an available delivery date at checkout.',
  },
  {
    id: 'keep',
    question: 'How long do the meals keep?',
    answer:
      'Follow the storage, use-by and heating instructions supplied with your dish. Dishes suitable for home freezing are clearly marked.',
  },
  {
    id: 'change',
    question: 'Can I change my box later?',
    answer:
      'Yes — you can adjust your box size or dishes at any point before checkout.',
  },
];

/** How many questions show before "View all questions". */
const POPULAR_COUNT = 4;

export function HelpPanel({ open, onClose, faqs = FAQS }: HelpPanelProps) {
  const titleId = useId();
  const fieldId = useId();

  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open]);
  useOverlay({ open, modal: true, onClose, panel, scrim, opener });

  if (!open) return null;

  const term = query.trim().toLowerCase();
  const matches = faqs.filter(
    (faq) =>
      !term || `${faq.question} ${faq.answer}`.toLowerCase().includes(term),
  );
  const shown = !term && !expanded ? matches.slice(0, POPULAR_COUNT) : matches;
  const showViewAll = !term && matches.length > POPULAR_COUNT;

  const countLabel = term
    ? `Showing ${matches.length} result${matches.length === 1 ? '' : 's'} for “${query.trim()}”`
    : 'Popular questions';

  const toggleFaq = (id: string) =>
    setOpenIds((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div className={styles.root}>
      <button
        ref={scrim}
        type="button"
        className={styles.scrim}
        aria-label="Close questions"
        onClick={onClose}
      />

      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            Questions about your order?
          </h2>
          <p className={styles.intro}>
            Find quick answers here or contact us if you need more help.
          </p>

          <div className={styles.search}>
            <SearchIcon />
            <input
              type="text"
              className={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search questions..."
              aria-label="Search questions"
            />
            {term ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className={styles.countRow}>
            <span className={styles.count}>{countLabel}</span>
            {!term ? (
              <span className={styles.hint}>
                <button
                  type="button"
                  className={styles.hintMark}
                  aria-label="About popular questions"
                  aria-describedby={`${fieldId}-hint`}
                >
                  ?
                </button>
                <span
                  id={`${fieldId}-hint`}
                  role="tooltip"
                  className={styles.hintTip}
                >
                  The questions customers ask most. Search above or view all for
                  the full list.
                </span>
              </span>
            ) : null}
          </div>

          {shown.length > 0 ? (
            <div className={styles.faqs}>
              {shown.map((faq) => {
                const isOpen = Boolean(openIds[faq.id]);
                return (
                  <div key={faq.id} className={styles.faq}>
                    <button
                      type="button"
                      className={styles.faqQuestion}
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${fieldId}-${faq.id}`}
                    >
                      <span>{faq.question}</span>
                      <ChevronIcon open={isOpen} />
                    </button>
                    {isOpen ? (
                      <p
                        id={`${fieldId}-${faq.id}`}
                        className={styles.faqAnswer}
                      >
                        {faq.answer}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.empty}>
              No matching questions. Try another search, or send us a message
              below.
            </p>
          )}

          {showViewAll ? (
            <button
              type="button"
              className={styles.viewAll}
              onClick={() => setExpanded((current) => !current)}
            >
              <span>
                {expanded ? 'Show fewer questions' : 'View all questions'}
              </span>
              <ArrowIcon />
            </button>
          ) : null}

          <p className={styles.stillNeedHelp}>Still need help?</p>

          <Link
            href={CONTACT_HREF}
            className={`${styles.action} ${styles.chat}`}
            onClick={onClose}
          >
            <span className={styles.actionIcon}>
              <MailIcon />
            </span>
            <span className={styles.actionText}>
              <span className={styles.actionTitle}>Contact us</span>
              <span className={styles.actionSub}>
                View our contact details and message form.
              </span>
            </span>
            <span className={styles.actionArrow}>
              <ArrowIcon />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---- Glyphs ------------------------------------------------------------------- */

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-open={open || undefined}
      className={styles.chevron}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="12" x2="19" y2="12" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
