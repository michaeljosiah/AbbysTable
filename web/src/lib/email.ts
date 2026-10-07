/**
 * Email address shape, checked in time linear in the input.
 *
 * The pattern this replaces, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, backtracks
 * quadratically on an input like "a@x.x.x.…x.@": every dot in the domain is
 * tried as the split point against the rest of the string. A server action
 * accepts a field up to its 1MB body limit, so one crafted request held the
 * event loop for minutes. Over-long input is refused before anything else
 * runs, and the address is split once rather than matched.
 *
 * A shape check only, as before: whether the mailbox exists is Aonik's (and
 * the customer's) business.
 */

/** The longest address SMTP can carry (RFC 5321 forward-path, less the brackets). */
export const MAX_EMAIL_LENGTH = 254;

/**
 * `local@domain.tld`: one `@`, no whitespace, something before the `@`, and a
 * domain with a dot that has something on both sides of the last one.
 */
export function isEmailAddress(value: string): boolean {
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) return false;
  if (/\s/.test(value)) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}
