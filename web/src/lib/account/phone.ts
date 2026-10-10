/**
 * Phone numbers for the details form — React-free.
 *
 * Aonik stores E.164 (`+447700900123`) and refuses anything else, while a
 * customer types what they dial ("07700 900123"). A UK national number (a
 * leading 0) is read as +44; anything already starting with + is checked as
 * given; nothing else is guessed at.
 */

const E164 = /^\+[1-9]\d{7,14}$/;

/** Spaces, dashes, dots and brackets are formatting, never an error. */
function compact(raw: string): string {
  return raw.replace(/[\s\-.()]/g, '');
}

/** E.164 for what was typed, or null when it is not a phone number we can read. Empty is null too. */
export function toE164(raw: string | null | undefined): string | null {
  const typed = compact(String(raw ?? ''));
  if (!typed) return null;
  const candidate = typed.startsWith('00') ? `+${typed.slice(2)}` : typed.startsWith('0') ? `+44${typed.slice(1)}` : typed;
  return E164.test(candidate) ? candidate : null;
}

/**
 * What the field starts with: a UK number in the form it is dialled
 * ("+447700900123" → "07700 900123"), any other as stored.
 */
export function phoneForInput(e164: string | null | undefined): string {
  if (!e164) return '';
  const uk = /^\+44(\d{10})$/.exec(e164);
  return uk ? `0${uk[1].slice(0, 4)} ${uk[1].slice(4)}` : e164;
}
