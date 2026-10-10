/**
 * `GET /api/dish-content/{slug}?selection=` — a dish's content for the
 * customer's own choices (`@/lib/dish/selectionContent`): Aonik's resolution
 * for exactly that selection, mapped through `mapResolvedContent` (so a
 * withheld or unreadable declaration is never passed on). A read, with no
 * customer data in it; never cached here, as a correction must show at once.
 *
 * Demo has no per-selection content — its fixtures describe the standard
 * recipe only — so it answers `unpublished`, as does a dish Aonik does not
 * know; the panels withhold the declaration for the customer's choices.
 * `unavailable` is kept for "could not be asked": Aonik down, slow or failing.
 *
 * Withheld reheating stays withheld: the catalogue's general steps are not
 * passed off as these choices' own, and the standard recipe's need not hold.
 */

import { NextResponse } from 'next/server';

import { resolveDataMode, readAonikConfig } from '@/lib/aonik/dataMode';
import type { ResolvedContentDto } from '@/lib/aonik/dto';
import { AonikError } from '@/lib/aonik/errors';
import { aonikFetch } from '@/lib/aonik/http';
import { mapResolvedContent } from '@/lib/aonik/map';
import { readSelection, type SelectionContentAnswer } from '@/lib/dish/selectionContent';

export const dynamic = 'force-dynamic';

/** A catalogue slug: lower-case words joined by hyphens. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,159}$/;

/** As long as a page waits for a dish's own content before saying it couldn't check. */
const CONTENT_TIMEOUT_MS = 4000;

function answer(body: SelectionContentAnswer, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const selection = readSelection(new URL(request.url).searchParams.get('selection'));
  if (!SLUG.test(slug) || !selection) return answer({ status: 'unavailable' }, 400);

  const { mode } = await resolveDataMode();
  const config = readAonikConfig();
  if (mode !== 'live' || !config) return answer({ status: 'unpublished' });

  try {
    const dto = await aonikFetch<ResolvedContentDto>(`/commerce/catalog/products/${encodeURIComponent(slug)}/content`, {
      baseUrl: config.baseUrl,
      tenantId: config.tenantId,
      policy: 'volatile',
      query: { selection: JSON.stringify(selection) },
      signal: AbortSignal.timeout(CONTENT_TIMEOUT_MS),
    });
    const content = mapResolvedContent(dto);
    return answer({
      status: 'resolved',
      content: {
        ingredients: content.ingredients,
        allergens: content.allergens,
        precautionaryStatement: content.precautionaryStatement,
        nutrition: content.nutrition,
        state: content.state,
        heating: content.state.heatingWithheld ? [] : content.heating,
      },
    });
  } catch (error) {
    if (error instanceof AonikError && error.isNotFound) {
      // Safe to say, but noted: every choice reading "not published" would
      // otherwise hide a missing endpoint.
      console.warn('[dish-content] no content for a selection', { slug, status: error.status });
      return answer({ status: 'unpublished' });
    }
    // A selection Aonik rejects is this request's own; anything else — an
    // outage, a refusal, a limit — is a fault to see.
    if (!(error instanceof AonikError && (error.status === 400 || error.status === 422))) {
      console.error('[dish-content] content for a selection could not be read', error);
    }
    return answer({ status: 'unavailable' });
  }
}
