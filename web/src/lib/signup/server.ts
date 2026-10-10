/**
 * Reading the published sign-up lists for a page, and reading Aonik's refusal
 * of a sign-up (michaeljosiah/aonik#357; `@/lib/aonik/signupLists`).
 *
 * SERVER-ONLY: reads the data mode.
 */

import { getAonikClient, type AonikClient } from '@/lib/aonik/client';
import { AonikError } from '@/lib/aonik/errors';
import { publishedList, type SignupList, type SignupListType } from '@/lib/aonik/signupLists';

import type { SignupConsent } from './consent';

/**
 * The list of one type as the tenant published it, or null — no lists in this
 * data mode (demo never pretends a write), not published, or a read that
 * failed. Never throws: a failure only ever holds a form back, never shows one
 * that cannot work, and never turns the page into an error.
 */
export async function publishedSignupList(
  listType: SignupListType,
  client: () => Promise<Pick<AonikClient, 'signupLists'>> = getAonikClient,
): Promise<SignupList | null> {
  try {
    const { signupLists } = await client();
    if (!signupLists) return null;
    return publishedList(await signupLists.published(), listType);
  } catch (error) {
    console.error(`[signup-lists] published lists unavailable; the ${listType} form is held back`, error);
    return null;
  }
}

/** What the form needs from a published list. */
export function consentOf(list: SignupList): SignupConsent {
  return { text: list.consentText, version: list.consentVersion };
}

/**
 * Aonik's 422 on a sign-up. The action has already run the same field rules
 * Aonik does, so what is left is the list itself: withdrawn, or its consent
 * wording (and version) changed since the page was rendered. Answered with
 * `SIGNUP_FORM_CHANGED`, never "try again" — the same post would fail again.
 */
export function isSignupRefused(error: unknown): boolean {
  return error instanceof AonikError && error.status === 422;
}
