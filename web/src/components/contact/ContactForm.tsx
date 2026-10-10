'use client';

import Link from 'next/link';
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';

import {
  addImages,
  asksForOrderNumber,
  EMPTY_ENQUIRY,
  ENQUIRY_FORM_FIELDS,
  ENQUIRY_IMAGE_ACCEPT,
  ENQUIRY_LIMITS,
  ENQUIRY_TOPICS,
  firstInvalidField,
  MAX_ENQUIRY_IMAGES,
  validateEnquiry,
  type EnquiryAction,
  type EnquiryDraft,
  type EnquiryErrors,
  type EnquiryField,
  type EnquiryState,
  ENQUIRY_ROUTE,
  readEnquiryAnswer,
} from '@/lib/contact/enquiry';
import { referenceFor, submissionKey } from '@/lib/contact/submission';
import { PRIVACY_ITEM } from '@/lib/content/navigation';
import { revealUnderHeader } from '@/lib/dom/reveal';

import styles from './ContactForm.module.css';

/** An attached image: the file to send, and a preview URL revoked when it goes. */
interface Attachment {
  key: number;
  file: File;
  name: string;
  size: number;
  type: string;
  /** With name and size, what tells two photos apart (`addImages`). */
  lastModified: number;
  url: string;
}

/** The error glyph — a triangle, never colour alone. */
function ErrorGlyph() {
  return (
    <svg
      className={styles.errorGlyph}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3.5l8.5 16h-17z" />
      <path d="M12 10v4M12 16.8h.01" />
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.error}>
      <ErrorGlyph />
      <span>{message}</span>
    </p>
  );
}

/**
 * "Send us a message" — the Contact page's form (design: Contact Us; build-handoff
 * "Contact — what was settled"; behaviour guide §10).
 *
 * Rendered only when the page has a REAL send action to give it (the
 * newsletter's rule, #6): live data and Aonik's enquiry endpoint (aonik#356);
 * in demo the page holds it back. It thanks the customer only when the action
 * answers `sent`, which the action does only after Aonik's 202. Each send
 * carries a submission reference, kept while the content is unchanged, so a
 * retry after a lost answer cannot send the message twice.
 *
 * - Validation is ours (`noValidate`): inline, persistent, `aria-invalid` +
 *   `aria-describedby`, cleared as the field is corrected. A failed submit
 *   moves focus to the first error in FIELD order and brings it clear of the
 *   header — on a phone the messages sit below the fold, so a submit that only
 *   paints red looks like nothing happened. The server action runs the same
 *   rules again (`@/lib/contact/enquiry`).
 * - The order number appears only for "An existing order", and is optional.
 * - Up to three JPG, PNG or HEIC images, 10MB each. "Choose images" is a real
 *   button, so the field works without a pointer; the drop zone is extra.
 *   Invalid files are reported by name and the valid ones still attach.
 * - Success REPLACES the form (leaving it up invites a second send), takes
 *   focus, and echoes the address. A failed send says so and keeps every
 *   field and image as it was.
 *
 * Two doors, one answer (`@/lib/contact/send`). Scripted, it posts a form
 * built by hand from state — so the attached images (picked and dropped over
 * several turns) are what is sent — to `/api/enquiries`, the only door photos
 * fit through (a server action takes 1MB). Without JavaScript the page posts
 * to the server action (`action`), text only, and comes back with its answer.
 */
export function ContactForm({ action }: { action: EnquiryAction }) {
  const [actionState, dispatch, actionPending] = useActionState<EnquiryState, FormData>(action, {
    status: 'idle',
  });
  /** The answer from `/api/enquiries`, once a scripted send has had one. */
  const [routeState, setRouteState] = useState<EnquiryState | null>(null);
  const [sending, setSending] = useState(false);
  const state = routeState ?? actionState;
  const isPending = actionPending || sending;
  const [draft, setDraft] = useState<EnquiryDraft>(EMPTY_ENQUIRY);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [imageProblems, setImageProblems] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  /**
   * The action's last answer once the customer has moved past it — by sending
   * again, or "Send another message" — so a stale "sent" or failure never
   * shows beside what they are doing now.
   */
  const [settled, setSettled] = useState<EnquiryState | null>(null);

  const id = useId();
  const ids = {
    name: `${id}-name`,
    email: `${id}-email`,
    topic: `${id}-topic`,
    order: `${id}-order`,
    message: `${id}-message`,
    upload: `${id}-upload`,
    uploadMeta: `${id}-upload-meta`,
  };

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLButtonElement>(null);
  const removeRefs = useRef(new Map<number, HTMLButtonElement>());
  const nextKey = useRef(0);
  const focusFrame = useRef(0);
  /**
   * The submission reference and the content it was sent with. A retry of the
   * same content reuses it — so a send whose answer was lost cannot become two
   * messages — and any change takes a fresh one (`@/lib/contact/submission`).
   */
  const submission = useRef<{ key: string; id: string } | null>(null);

  // Aonik refused the reference as belonging to other details: start afresh.
  useEffect(() => {
    if (state.newSubmission) submission.current = null;
  }, [state]);

  // Preview URLs are revoked when the page goes, or every attach-and-leave
  // would hold the image for the rest of the session.
  const liveAttachments = useRef<Attachment[]>([]);
  liveAttachments.current = attachments;
  useEffect(
    () => () => {
      cancelAnimationFrame(focusFrame.current);
      for (const attachment of liveAttachments.current) URL.revokeObjectURL(attachment.url);
    },
    [],
  );

  const fieldRefs: Record<EnquiryField, { current: HTMLElement | null }> = {
    name: nameRef,
    email: emailRef,
    topic: topicRef,
    message: messageRef,
  };

  /** Focus a field after the commit that mounts its message, then bring it into view. */
  const focusField = (field: EnquiryField) => {
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      const element = fieldRefs[field].current;
      if (!element) return;
      element.focus({ preventScroll: true });
      // The whole field — label, control and message — not just the control.
      revealUnderHeader(element.closest<HTMLElement>('[data-field]') ?? element);
    });
  };

  // Once sent, the images have gone with the enquiry: let their blobs go too,
  // rather than hold up to 30MB behind the confirmation.
  useEffect(() => {
    if (state.status !== 'sent') return;
    for (const attachment of liveAttachments.current) URL.revokeObjectURL(attachment.url);
    setAttachments([]);
  }, [state]);

  // The server's own verdict on the fields wins: show it, and focus the first.
  useEffect(() => {
    if (state.status !== 'invalid') return;
    const serverErrors = state.errors ?? {};
    setErrors(serverErrors);
    setImageProblems(state.imageError ? [state.imageError] : []);
    const first = firstInvalidField(serverErrors);
    if (first) focusField(first);
    // `focusField` reads only refs; this runs once per answer from the action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const current = state !== settled;
  const sent = current && state.status === 'sent';
  const failed = current && !isPending && (state.status === 'error' || state.status === 'unavailable');

  // Stable, so a re-render never takes focus back: it runs once, as the
  // confirmation mounts — announced, and where a keyboard user continues.
  const successRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    element.focus({ preventScroll: true });
    revealUnderHeader(element, 16);
  }, []);

  const update =
    (field: keyof EnquiryDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      // While sending, what was sent is what shows: an edit now would be lost
      // on success, or sit beside a message that never carried it.
      if (isPending) return;
      const value = event.target.value;
      setDraft((current) => ({ ...current, [field]: value }));
      // An error clears as soon as its field is being corrected, so it never
      // contradicts what is on screen.
      if (field !== 'orderNumber' && errors[field]) {
        setErrors((current) => {
          const next = { ...current };
          delete next[field as EnquiryField];
          return next;
        });
      }
    };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setSettled(state);
    const found = validateEnquiry(draft);
    const first = firstInvalidField(found);
    setErrors(found);
    if (first) {
      focusField(first);
      return;
    }
    const fields = {
      name: draft.name,
      email: draft.email,
      topic: draft.topic,
      orderNumber: asksForOrderNumber(draft.topic) ? draft.orderNumber : '',
      message: draft.message,
    };
    submission.current = referenceFor(submission.current, submissionKey(fields, attachments.map((a) => a.file)));
    const form = new FormData();
    form.set(ENQUIRY_FORM_FIELDS.submissionId, submission.current.id);
    form.set(ENQUIRY_FORM_FIELDS.name, draft.name);
    form.set(ENQUIRY_FORM_FIELDS.email, draft.email);
    form.set(ENQUIRY_FORM_FIELDS.topic, draft.topic);
    if (asksForOrderNumber(draft.topic)) form.set(ENQUIRY_FORM_FIELDS.orderNumber, draft.orderNumber);
    form.set(ENQUIRY_FORM_FIELDS.message, draft.message);
    for (const attachment of attachments) {
      form.append(ENQUIRY_FORM_FIELDS.images, attachment.file, attachment.name);
    }
    setSending(true);
    void fetch(ENQUIRY_ROUTE, { method: 'POST', body: form })
      .then(async (response) => readEnquiryAnswer(await response.json().catch(() => null)))
      // Offline, or the request never answered: not sent, and said so.
      .catch((): EnquiryState => ({ status: 'error' }))
      .then(setRouteState)
      .finally(() => setSending(false));
  };

  /* ---- Images ---- */

  const attach = (files: FileList | null) => {
    if (isPending) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const incoming = Array.from(files ?? []).map((file) => ({
      key: -1,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      url: '',
    }));
    if (incoming.length === 0) return;
    const result = addImages(attachments, incoming);
    setAttachments(
      result.attached.map((attachment) =>
        attachment.url
          ? attachment
          : { ...attachment, key: nextKey.current++, url: URL.createObjectURL(attachment.file) },
      ),
    );
    setImageProblems(result.problems);
    // The same file can be picked again after it is removed.
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = (key: number) => {
    if (isPending) return;
    const index = attachments.findIndex((attachment) => attachment.key === key);
    if (index === -1) return;
    URL.revokeObjectURL(attachments[index].url);
    const rest = attachments.filter((attachment) => attachment.key !== key);
    setAttachments(rest);
    setImageProblems([]);
    // Focus goes to the next image's remove button, or back to the picker —
    // never dropped to the page.
    const after = rest[index] ?? rest[index - 1];
    requestAnimationFrame(() => {
      (after ? removeRefs.current.get(after.key) : browseRef.current)?.focus();
    });
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragOver) setDragOver(true);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    attach(event.dataTransfer?.files ?? null);
  };

  /* ---- Success ---- */

  const sendAnother = () => {
    for (const attachment of attachments) URL.revokeObjectURL(attachment.url);
    setAttachments([]);
    setImageProblems([]);
    setDraft(EMPTY_ENQUIRY);
    setErrors({});
    setSettled(state);
    submission.current = null;
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  if (sent) {
    return (
      <div
        ref={successRef}
        className={styles.success}
        role="status"
        tabIndex={-1}
      >
        <span className={styles.successMark} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
        <p className={styles.successTitle}>Thank you — your message has been sent.</p>
        {/* Departure from the design ("We've sent a copy to …"): Aonik
            acknowledges receipt with a reference, not a copy of the message,
            and its 202 means that email is queued, not delivered. */}
        <p className={styles.successText}>
          We usually reply within two working days. We&rsquo;ll send a confirmation to{' '}
          <strong className={styles.successEmail}>{state.email}</strong>.
        </p>
        <button type="button" className={styles.again} onClick={sendAnother}>
          <span className={styles.againLabel}>Send another message</span>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </button>
      </div>
    );
  }

  const describedBy = (...parts: Array<string | false | undefined>) =>
    parts.filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <p className={styles.intro}>Tell us how we can help.</p>
      <p className={styles.introNote}>Fields marked with an asterisk are required.</p>

      {/* noValidate: the browser's own bubbles cannot be styled, are announced
          inconsistently and vanish on scroll. */}
      <form
        className={styles.form}
        action={dispatch}
        onSubmit={onSubmit}
        noValidate
        aria-busy={isPending || undefined}
      >
        <div className={styles.nameRow}>
          <div data-field="">
            <label htmlFor={ids.name} className={styles.label}>
              Your name <span aria-hidden="true">*</span>
            </label>
            <input
              ref={nameRef}
              id={ids.name}
              name={ENQUIRY_FORM_FIELDS.name}
              type="text"
              autoComplete="name"
              required
              maxLength={ENQUIRY_LIMITS.name}
              value={draft.name}
              onChange={update('name')}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy(errors.name && `${ids.name}-error`)}
              className={styles.field}
            />
            <FieldError id={`${ids.name}-error`} message={errors.name} />
          </div>

          <div data-field="">
            <label htmlFor={ids.email} className={styles.label}>
              Email address <span aria-hidden="true">*</span>
            </label>
            <input
              ref={emailRef}
              id={ids.email}
              name={ENQUIRY_FORM_FIELDS.email}
              type="email"
              autoComplete="email"
              required
              maxLength={ENQUIRY_LIMITS.email}
              value={draft.email}
              onChange={update('email')}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy(errors.email && `${ids.email}-error`)}
              className={styles.field}
            />
            <FieldError id={`${ids.email}-error`} message={errors.email} />
          </div>
        </div>

        {/* A native <select>, and it must stay one: style the closed control
            only, and let the device's own picker take over on tap
            (build-handoff — never a custom listbox here). */}
        <div data-field="">
          <label htmlFor={ids.topic} className={styles.label}>
            What&rsquo;s it about? <span aria-hidden="true">*</span>
          </label>
          <div className={styles.selectWrap}>
            <select
              ref={topicRef}
              id={ids.topic}
              name={ENQUIRY_FORM_FIELDS.topic}
              required
              value={draft.topic}
              onChange={update('topic')}
              aria-invalid={errors.topic ? true : undefined}
              aria-describedby={describedBy(errors.topic && `${ids.topic}-error`)}
              className={`${styles.field} ${styles.select}`}
            >
              {/* Empty value: it fails validation like an empty field. */}
              <option value="">Choose a subject</option>
              {ENQUIRY_TOPICS.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
            </select>
            <svg
              className={styles.selectChevron}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <FieldError id={`${ids.topic}-error`} message={errors.topic} />
        </div>

        {/* Only for an existing order, and optional: a reference saves a round
            trip, but a required one would block the person most likely to
            need help. Revealing it moves the fields below — the one deliberate
            layout shift on the page. */}
        {asksForOrderNumber(draft.topic) ? (
          <div data-field="">
            <label htmlFor={ids.order} className={styles.label}>
              Order number
            </label>
            <input
              id={ids.order}
              name={ENQUIRY_FORM_FIELDS.orderNumber}
              type="text"
              autoComplete="off"
              maxLength={ENQUIRY_LIMITS.orderNumber}
              value={draft.orderNumber}
              onChange={update('orderNumber')}
              aria-describedby={`${ids.order}-help`}
              className={styles.field}
            />
            <p id={`${ids.order}-help`} className={styles.help}>
              Optional. Your order number helps us find your order and respond more quickly.
            </p>
          </div>
        ) : null}

        <div data-field="">
          <label htmlFor={ids.message} className={styles.label}>
            Your message <span aria-hidden="true">*</span>
          </label>
          <textarea
            ref={messageRef}
            id={ids.message}
            name={ENQUIRY_FORM_FIELDS.message}
            rows={6}
            required
            maxLength={ENQUIRY_LIMITS.message}
            value={draft.message}
            onChange={update('message')}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy(errors.message && `${ids.message}-error`)}
            className={`${styles.field} ${styles.textarea}`}
          />
          <FieldError id={`${ids.message}-error`} message={errors.message} />
        </div>

        {/* Optional images: a photo is the fastest way to show a problem with
            a dish or a delivery. The drop zone is not the control — "Choose
            images" is a real button. */}
        <div>
          <span id={ids.upload} className={styles.label}>
            Upload up to {MAX_ENQUIRY_IMAGES} images (optional)
          </span>
          <div
            className={styles.drop}
            data-over={dragOver ? 'true' : undefined}
            onDragOver={onDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <svg
              className={styles.dropIcon}
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 15.5A4.5 4.5 0 0 1 6.2 7a5.6 5.6 0 0 1 10.7 1.2A3.9 3.9 0 0 1 20 15.5" />
              <path d="M12 12v7M9.2 14.4L12 11.6l2.8 2.8" />
            </svg>
            <span className={styles.dropText}>
              {/* Desktop only: there is nothing to drag on a phone. */}
              <span className={styles.dropLead}>Drag and drop your images here</span>
              <button
                ref={browseRef}
                type="button"
                className={styles.browse}
                onClick={() => fileRef.current?.click()}
                aria-describedby={`${ids.upload} ${ids.uploadMeta}`}
              >
                Choose images
              </button>
              <span id={ids.uploadMeta} className={styles.dropMeta}>
                JPG, PNG or HEIC <span className={styles.lozenge} aria-hidden="true">◆</span> Max 10MB each
                {/* A line break on a phone; a third lozenge from 1024. */}{' '}
                <span className={styles.dropBreak} aria-hidden="true">
                  {' '}
                  <span className={`${styles.lozenge} ${styles.dropDot}`}>◆</span>{' '}
                </span>
                Up to {MAX_ENQUIRY_IMAGES} images
              </span>
            </span>
          </div>
          {/* Operated through "Choose images"; out of the tab order and the
              accessibility tree, and unnamed, so only the attached list is sent. */}
          <input
            ref={fileRef}
            type="file"
            accept={ENQUIRY_IMAGE_ACCEPT}
            multiple
            tabIndex={-1}
            aria-hidden="true"
            className={styles.fileInput}
            onChange={(event) => attach(event.target.files)}
          />

          <div role="status" aria-live="polite" className={styles.uploadStatus}>
            {imageProblems.map((problem) => (
              <p key={problem} className={styles.error}>
                <ErrorGlyph />
                <span>{problem}</span>
              </p>
            ))}
          </div>

          {attachments.length > 0 ? (
            <ul className={styles.thumbs} role="list">
              {attachments.map((attachment) => (
                <li key={attachment.key} className={styles.thumb}>
                  {/* A local preview (a blob: URL), so not next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={attachment.url} alt={attachment.name} className={styles.thumbImage} />
                  <button
                    ref={(element) => {
                      if (element) removeRefs.current.set(attachment.key, element);
                      else removeRefs.current.delete(attachment.key);
                    }}
                    type="button"
                    className={styles.remove}
                    onClick={() => remove(attachment.key)}
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <span className={styles.removeDisc} aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          {/* The failure state is not in the design: a plain statement that
              nothing was sent, with everything typed still in place. */}
          {failed ? (
            <p className={styles.failure} role="alert">
              <ErrorGlyph />
              <span>
                {state.status === 'unavailable'
                  ? 'Messages can’t be sent from this page yet, so nothing was sent.'
                  : 'We couldn’t send your message just now. Everything you’ve written is still here, so please try again.'}
              </span>
            </p>
          ) : null}
          <button type="submit" className={styles.send} disabled={isPending}>
            {isPending ? 'Sending…' : 'Send message'}
          </button>
          <p className={styles.privacy}>
            We&rsquo;ll only use your details to reply to your message. See our{' '}
            <Link href={PRIVACY_ITEM.href} className={styles.privacyLink}>
              {PRIVACY_ITEM.label}
            </Link>
            .
          </p>
        </div>
      </form>
    </div>
  );
}
