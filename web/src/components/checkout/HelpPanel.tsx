'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';

import styles from './HelpPanel.module.css';

/**
 * The "Questions?" slide-over: searchable FAQs, live chat and an email form.
 *
 * Controlled by the caller so whatever owns the checkout chrome decides when it
 * opens; the panel owns everything inside it.
 */
interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

interface Faq {
  id: string;
  question: string;
  answer: string;
}

/** Verbatim from the step 1 design template. */
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
      'Yes. Every dish is labelled, and you can note things to leave out when you personalise your box. For severe allergies, email us before ordering and we’ll advise.',
  },
  {
    id: 'kitchen',
    question: 'Are your meals prepared in a kitchen that handles nuts or shellfish?',
    answer:
      'Our Kent kitchen handles nuts, shellfish and other allergens. We follow strict separation, but we can’t guarantee zero cross-contact.',
  },
  {
    id: 'remove',
    question: 'Can I remove an ingredient I’m allergic to?',
    answer:
      'Many dishes can be adapted. Add a note when personalising, or email us and we’ll confirm what’s possible for your box.',
  },
  {
    id: 'size',
    question: 'Which box size is right for me?',
    answer:
      'Most tables start with 12 dishes — a balanced week for two. Six is our minimum; eighteen suits larger households or cooking ahead.',
  },
  {
    id: 'build',
    question: 'What does ‘build your own’ mean?',
    answer:
      'Choose any number of dishes from six upwards. Your per-dish price is better than buying singly, and the saving grows as you add more.',
  },
  {
    id: 'delivery',
    question: 'When will my box be delivered?',
    answer:
      'Boxes are cooked to order and delivered chilled, UK-wide, on your chosen day. You’ll pick a delivery date at checkout.',
  },
  {
    id: 'keep',
    question: 'How long do the meals keep?',
    answer:
      'Chilled meals keep for up to 5 days in the fridge, or freeze on arrival for up to 3 months. Heating guidance is on every dish.',
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

const EMAIL_PATTERN = /.+@.+\..+/;

const EMPTY_MESSAGE = { name: '', email: '', question: '' };

export function HelpPanel({ open, onClose }: HelpPanelProps) {
  const titleId = useId();
  const fieldId = useId();

  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState(EMPTY_MESSAGE);

  // Escape closes; the page behind must not scroll while the panel is up.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const term = query.trim().toLowerCase();
  const matches = FAQS.filter(
    (faq) => !term || `${faq.question} ${faq.answer}`.toLowerCase().includes(term),
  );
  const shown = !term && !expanded ? matches.slice(0, POPULAR_COUNT) : matches;
  const showViewAll = !term && matches.length > POPULAR_COUNT;

  const countLabel = term
    ? `Showing ${matches.length} result${matches.length === 1 ? '' : 's'} for “${query.trim()}”`
    : 'Popular questions';

  const canSend =
    message.name.trim().length > 0 &&
    EMAIL_PATTERN.test(message.email) &&
    message.question.trim().length > 0;

  const toggleFaq = (id: string) =>
    setOpenIds((current) => ({ ...current, [id]: !current[id] }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;
    // TODO(aonik): post the message to the support inbox once the API exists.
    // Until then the form only confirms locally — nothing is transmitted.
    setSentTo(message.email);
  };

  const resetMessage = () => {
    setSentTo(null);
    setMessage(EMPTY_MESSAGE);
  };

  return (
    <div className={styles.root}>
      <button type="button" className={styles.scrim} aria-label="Close questions" onClick={onClose} />

      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
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
                <span id={`${fieldId}-hint`} role="tooltip" className={styles.hintTip}>
                  The questions customers ask most. Search above or view all for the full list.
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
                      <p id={`${fieldId}-${faq.id}`} className={styles.faqAnswer}>
                        {faq.answer}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.empty}>
              No matching questions. Try another search, or send us a message below.
            </p>
          )}

          {showViewAll ? (
            <button
              type="button"
              className={styles.viewAll}
              onClick={() => setExpanded((current) => !current)}
            >
              <span>{expanded ? 'Show fewer questions' : 'View all questions'}</span>
              <ArrowIcon />
            </button>
          ) : null}

          <p className={styles.stillNeedHelp}>Still need help?</p>

          {/* TODO(aonik): hand off to the live-chat provider. */}
          <button
            type="button"
            className={`${styles.action} ${styles.chat}`}
            onClick={() => setChatStarted(true)}
          >
            <span className={styles.actionIcon}>
              <ChatIcon />
            </span>
            <span className={styles.actionText}>
              <span className={styles.actionTitle}>Live chat</span>
              <span className={styles.actionSub}>
                {chatStarted
                  ? 'A team member will be with you shortly.'
                  : 'Typically replies in a few minutes'}
              </span>
            </span>
            <span className={styles.actionArrow}>
              <ArrowIcon />
            </span>
          </button>

          <div className={styles.email} data-open={emailOpen || undefined}>
            <button
              type="button"
              className={`${styles.action} ${styles.emailHead}`}
              onClick={() => setEmailOpen((current) => !current)}
              aria-expanded={emailOpen}
            >
              <span className={styles.actionIcon}>
                <MailIcon />
              </span>
              <span className={styles.actionText}>
                <span className={styles.actionTitle}>Email us</span>
                <span className={styles.actionSub}>
                  We&apos;ll get back to you as soon as we can.
                </span>
              </span>
              <ChevronIcon open={emailOpen} />
            </button>

            {emailOpen ? (
              sentTo === null ? (
                <form className={styles.form} onSubmit={onSubmit}>
                  <label className={styles.label} htmlFor={`${fieldId}-name`}>
                    Your name
                  </label>
                  <input
                    id={`${fieldId}-name`}
                    className={styles.input}
                    value={message.name}
                    onChange={(event) =>
                      setMessage((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="e.g. Esther"
                  />

                  <label className={styles.label} htmlFor={`${fieldId}-email`}>
                    Email address
                  </label>
                  <input
                    id={`${fieldId}-email`}
                    type="email"
                    className={styles.input}
                    value={message.email}
                    onChange={(event) =>
                      setMessage((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="e.g. esther@example.com"
                  />

                  <label className={styles.label} htmlFor={`${fieldId}-question`}>
                    Your question
                  </label>
                  <textarea
                    id={`${fieldId}-question`}
                    className={styles.input}
                    rows={3}
                    value={message.question}
                    onChange={(event) =>
                      setMessage((current) => ({ ...current, question: event.target.value }))
                    }
                    placeholder="Type your question here..."
                  />

                  <button type="submit" className={styles.send} disabled={!canSend}>
                    Send email
                  </button>
                </form>
              ) : (
                <div className={styles.sent}>
                  <span className={styles.sentTick}>
                    <CheckIcon />
                  </span>
                  <p className={styles.sentTitle}>Your message is on its way</p>
                  <p className={styles.sentBody}>
                    We&apos;ll reply to {sentTo} within a few hours.
                  </p>
                  <button type="button" className={styles.sentAgain} onClick={resetMessage}>
                    Send another message
                  </button>
                </div>
              )
            ) : null}
          </div>

          <p className={styles.footNote}>
            <ClockIcon />
            <span>We aim to reply within a few hours.</span>
          </p>
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

function ChatIcon() {
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
      <path d="M4 5h16v11H8l-4 4z" />
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

function CheckIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
