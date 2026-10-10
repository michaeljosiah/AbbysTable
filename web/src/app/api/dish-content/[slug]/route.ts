/**
 * `GET /api/dish-content/{slug}?selection=` — a dish's content for the
 * customer's own choices (`@/lib/dish/selectionContent`): Aonik's resolution
 * for exactly that selection, mapped through `mapResolvedContent` (so a
 * withheld or unreadable declaration is never passed on). A read, with no
 * customer data in it; never cached here, as a correction must show at once.
 *
 * Demo has no per-selection content — its fixtures describe the standard
 * recipe only — so it answers `unavailable`, and the panels withhold the
 * declaration for the customer's choices.
 */

import { NextResponse } from 'next/server';

import { getAonikClient } from '@/lib/aonik/client';
import { resolveDataMode, readAonikConfig } from '@/lib/aonik/dataMode';
import type { ResolvedContentDto } from '@/lib/aonik/dto';
import { AonikError } from '@/lib/aonik/errors';
import { aonikFetch } from '@/lib/aonik/http';
import { mapResolvedContent } from '@/lib/aonik/map';
import { readSelection, type SelectionContentAnswer } from '@/lib/dish/selectionContent';

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** As long as a page waits for a dish's own content before saying it is not published. */
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
  if (mode !== 'live' || !config) return answer({ status: 'unavailable' });

  try {
    const dto = await aonikFetch<ResolvedContentDto>(`/commerce/catalog/products/${encodeURIComponent(slug)}/content`, {
      baseUrl: config.baseUrl,
      tenantId: config.tenantId,
      policy: 'volatile',
      query: { selection: JSON.stringify(selection) },
      signal: AbortSignal.timeout(CONTENT_TIMEOUT_MS),
    });
    const content = mapResolvedContent(dto);
    // Withheld reheating is shown as general guidance, framed as such.
    const heating = content.state.heatingWithheld ? await (await getAonikClient()).getHeatingInstructions() : content.heating;
    return answer({
      status: 'resolved',
      content: {
        ingredients: content.ingredients,
        allergens: content.allergens,
        precautionaryStatement: content.precautionaryStatement,
        nutrition: content.nutrition,
        state: content.state,
        heating,
      },
    });
  } catch (error) {
    if (!(error instanceof AonikError && error.isNotFound)) {
      console.error('[dish-content] content for a selection could not be read', error);
    }
    return answer({ status: 'unavailable' });
  }
}
