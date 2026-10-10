/**
 * The submission reference Aonik's enquiry endpoint requires (michaeljosiah/
 * aonik#356): a UUID the browser keeps while it retries UNCHANGED content, so
 * an answer lost on the way back cannot turn one message into two — a retry
 * with the same reference returns the original receipt. Sending the same
 * reference with different content is refused (409), so any change to what is
 * being sent takes a fresh one.
 *
 * React-free, so the form and the action share it (tests/contact.test.tsx).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A non-nil UUID, as Aonik accepts it. */
export function isSubmissionId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/**
 * A fresh random (v4) reference. `crypto.randomUUID` exists only in secure
 * contexts; `getRandomValues` everywhere.
 */
export function newSubmissionId(): string {
  const source = globalThis.crypto;
  if (typeof source?.randomUUID === 'function') return source.randomUUID();
  const bytes = new Uint8Array(16);
  source.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** What an attempt sends, as far as a retry is concerned: equal keys, same content. */
export function submissionKey(
  fields: Readonly<Record<string, string>>,
  images: ReadonlyArray<{ name: string; size: number; lastModified?: number }>,
): string {
  return JSON.stringify([fields, images.map(({ name, size, lastModified }) => [name, size, lastModified ?? 0])]);
}

/**
 * The reference for an attempt: the last one again while the content is the
 * same, a fresh one as soon as it is not (or once Aonik asked for one).
 */
export function referenceFor(
  last: { key: string; id: string } | null,
  key: string,
): { key: string; id: string } {
  return last && last.key === key ? last : { key, id: newSubmissionId() };
}
