/**
 * Postcode coverage — frontend-backend-contract §3b. Powers the Delivery &
 * FAQs checker (#23); Choose Box's delivery checker (#28) should ask the same
 * question the same way.
 *
 * The authoritative source is the COURIER's coverage, not us, and the answer
 * has three outcomes: serves / does not serve / could not check. The third is
 * a technical failure with its own wording and a retry — never a "we don't
 * deliver" answer — so a lookup that cannot answer THROWS rather than
 * returning a refusal.
 *
 * Which lookup a request gets is the data mode's decision (`AonikClient
 * .coverage`):
 *   - demo: `DemoCoverageLookup` below, the design's own placeholder areas;
 *   - live: `HttpCoverageLookup`, Aonik's `GET /commerce/delivery/coverage`
 *     (michaeljosiah/aonik#352): the tenant's configured outward codes, after
 *     its postcode provider has confirmed the postcode exists. It has no
 *     coordinates lookup, so live offers no "Use my current location".
 *
 * Rate limiting (contract §3b): Aonik allows 30 checks a minute per tenant and
 * address, shared with checkout itself — and the address it sees is the
 * storefront's, not the customer's (it reads only the hop its ingress
 * appends), so the live lookup limits each customer and the site as a whole
 * before asking (`@/lib/delivery/rateLimit`). The customer's address still
 * goes as `X-Forwarded-For`, for a deployment where Aonik can trust it.
 *
 * SERVER-ONLY (the live lookup).
 */

import { normalisePostcode, postcodeArea } from '@/lib/delivery/postcode';
import { admitCoverageCheck } from '@/lib/delivery/rateLimit';
import { clientAddress } from '@/lib/request/clientAddress';

import type { AonikConfig } from './dataMode';
import { AonikError } from './errors';
import { aonikFetch } from './http';

export type CoverageAnswer =
  | {
      status: 'serves';
      /** Normalised for display; the page echoes it back. */
      postcode: string;
      /**
       * ISO date of the earliest delivery for this postcode, when the lookup
       * knows one. Absent: the page falls back to the tenant's delivery window.
       */
      earliestDeliveryDate?: string;
    }
  | { status: 'not-served'; postcode: string }
  /**
   * The lookup confirmed there is no such postcode (it is well formed, but
   * does not exist). The page says so as it says any invalid postcode.
   */
  | { status: 'invalid' };

export interface CoverageLookup {
  /**
   * Whether we deliver to a postcode (already normalised). THROWS when it
   * cannot tell — "could not check", which is never a refusal.
   */
  check(postcode: string): Promise<CoverageAnswer>;
  /**
   * The postcode at a point, for "Use my current location": the contract's
   * coordinates-to-postcode lookup. Null when no postcode can be placed there.
   * Absent when this source has no such lookup — the page then offers no
   * location control at all.
   */
  postcodeAt?(latitude: number, longitude: number): Promise<string | null>;
}

/* ---- Demo ------------------------------------------------------------------- */

/**
 * PLACEHOLDER coverage, verbatim from the design's not-yet list: the outward-code
 * AREAS not yet served. Demo data for review only — the real list is the
 * courier's. AB is in it so the design's sample "AB12 3CD" reads as not in the
 * area; "DA1 2AB" is served.
 */
export const DEMO_UNSERVED_AREAS: readonly string[] = [
  'AB',
  'BT',
  'GY',
  'HS',
  'IM',
  'IV',
  'JE',
  'KW',
  'ZE',
];

/**
 * Demo stand-ins for a coordinates-to-postcode lookup: the design's two
 * sample postcodes, each at a point in its area (Dartford, Aberdeen). A
 * location within `DEMO_LOCATION_RADIUS_KM` of one resolves to it; anywhere
 * else resolves to nothing, and the page says it could not use the location
 * — it never puts a postcode the customer is not at in their field.
 */
export const DEMO_LOCATIONS: ReadonlyArray<{ postcode: string; latitude: number; longitude: number }> = [
  { postcode: 'DA1 2AB', latitude: 51.4446, longitude: 0.2175 },
  { postcode: 'AB12 3CD', latitude: 57.1209, longitude: -2.0983 },
];

export const DEMO_LOCATION_RADIUS_KM = 25;

/** Great-circle distance in km (haversine). */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The demo lookup. Deterministic and network-free, like every demo read. It
 * names no delivery date of its own: the page takes the tenant's delivery
 * window, which is what demo mode shows everywhere else.
 */
export class DemoCoverageLookup implements CoverageLookup {
  async check(postcode: string): Promise<CoverageAnswer> {
    const normalised = normalisePostcode(postcode);
    // The action validates first; a malformed postcode reaching here is a
    // fault, and a fault is "could not check", never an answer.
    if (!normalised) throw new Error(`Not a postcode: ${postcode}`);
    return DEMO_UNSERVED_AREAS.includes(postcodeArea(normalised))
      ? { status: 'not-served', postcode: normalised }
      : { status: 'serves', postcode: normalised };
  }

  async postcodeAt(latitude: number, longitude: number): Promise<string | null> {
    let nearest: { postcode: string; km: number } | null = null;
    for (const place of DEMO_LOCATIONS) {
      const km = distanceKm({ latitude, longitude }, place);
      if (!nearest || km < nearest.km) nearest = { postcode: place.postcode, km };
    }
    return nearest && nearest.km <= DEMO_LOCATION_RADIUS_KM ? nearest.postcode : null;
  }
}

/* ---- Live (Aonik) ------------------------------------------------------------ */

export const COVERAGE_PATH = '/commerce/delivery/coverage';

/**
 * How long a check may take. Aonik's own postcode provider allows five
 * seconds; past this the page says it could not check, and offers a retry.
 */
export const COVERAGE_TIMEOUT_MS = 8000;

/** Aonik's answer: `serves`, `not_served` or `unavailable`. */
interface CoverageDto {
  status?: unknown;
  normalisedPostcode?: unknown;
  earliestDate?: unknown;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Aonik's coverage answer as ours. `unavailable` — no coverage configured, no
 * postcode provider, or a lookup that failed — THROWS: it is "could not
 * check", never a refusal. So does anything unrecognised.
 */
export function readCoverage(body: unknown, asked: string): CoverageAnswer {
  const dto = (body ?? {}) as CoverageDto;
  // Aonik answers for the postcode asked ("never redirect the decision"). An
  // answer about another one — or one that is not a postcode at all — is no
  // answer: never "we deliver to" a postcode the customer did not enter,
  // handed on to the box builder.
  if (typeof dto.normalisedPostcode === 'string' && normalisePostcode(dto.normalisedPostcode) !== normalisePostcode(asked)) {
    throw new Error('Coverage answered for a different postcode');
  }
  const postcode = normalisePostcode(asked) ?? asked;
  if (dto.status === 'serves') {
    const earliest = typeof dto.earliestDate === 'string' && ISO_DATE.test(dto.earliestDate) ? dto.earliestDate : undefined;
    return earliest ? { status: 'serves', postcode, earliestDeliveryDate: earliest } : { status: 'serves', postcode };
  }
  if (dto.status === 'not_served') return { status: 'not-served', postcode };
  throw new Error(`Coverage could not be checked (${String(dto.status)})`);
}

/** Aonik's 400 for a postcode it found malformed or nonexistent. */
const INVALID_POSTCODE = 'commerce.invalid_postcode';

export class HttpCoverageLookup implements CoverageLookup {
  constructor(private readonly config: AonikConfig) {}

  async check(postcode: string): Promise<CoverageAnswer> {
    // Aonik's allowance is checkout's too: past the customer's or the site's
    // pace, could not check — without asking.
    if (!(await admitCoverageCheck())) throw new Error('Too many postcode checks; not asked');
    try {
      const body = await aonikFetch<unknown>(COVERAGE_PATH, {
        baseUrl: this.config.baseUrl,
        tenantId: this.config.tenantId,
        // Aonik answers no-store: coverage can change, and the provider's
        // answer is per request.
        policy: 'volatile',
        query: { postcode },
        signal: AbortSignal.timeout(COVERAGE_TIMEOUT_MS),
        forwardedFor: (await clientAddress()) ?? undefined,
      });
      return readCoverage(body, postcode);
    } catch (error) {
      if (error instanceof AonikError && error.status === 400 && error.code === INVALID_POSTCODE) {
        return { status: 'invalid' };
      }
      // A 429, a timeout, an outage: could not check — the caller says so.
      throw error;
    }
  }
}
