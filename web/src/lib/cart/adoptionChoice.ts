/** Server-only snapshot of the two boxes actually offered at sign-in. */
import { cookies } from 'next/headers';
export const BOX_CHOICE_COOKIE = 'abbys-table-box-choice';
export interface BoxSnapshot {
  cartId: string;
  cartVersion: string;
  boxSize: number | null;
  lineCount: number;
  lastActivityAt: string;
}
export interface BoxChoice {
  guest: BoxSnapshot;
  saved: BoxSnapshot;
}
function snapshot(value: unknown): BoxSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Partial<BoxSnapshot>;
  return typeof s.cartId === 'string' &&
    typeof s.cartVersion === 'string' &&
    s.cartVersion &&
    typeof s.lineCount === 'number' &&
    s.lineCount >= 0
    ? {
        cartId: s.cartId,
        cartVersion: s.cartVersion,
        boxSize: s.boxSize ?? null,
        lineCount: s.lineCount,
        lastActivityAt: s.lastActivityAt ?? '',
      }
    : null;
}
export function choiceFromConflict(body: unknown): BoxChoice | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as {
    guest?: unknown;
    savedCandidates?: unknown[];
    hasMore?: boolean;
  };
  if (
    !Array.isArray(b.savedCandidates) ||
    b.savedCandidates.length !== 1 ||
    b.hasMore
  )
    return null;
  const guest = snapshot(b.guest),
    saved = snapshot(b.savedCandidates[0]);
  return guest && saved ? { guest, saved } : null;
}
export async function storeBoxChoice(choice: BoxChoice): Promise<void> {
  (await cookies()).set(BOX_CHOICE_COOKIE, JSON.stringify(choice), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 1800,
  });
}
export async function readBoxChoice(): Promise<BoxChoice | null> {
  const raw = (await cookies()).get(BOX_CHOICE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as BoxChoice;
    return choiceFromConflict({ guest: b.guest, savedCandidates: [b.saved] });
  } catch {
    return null;
  }
}
export async function clearBoxChoice(): Promise<void> {
  (await cookies()).set(BOX_CHOICE_COOKIE, 'deleted', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
