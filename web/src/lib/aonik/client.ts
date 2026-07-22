/**
 * Aonik client — the single seam between the storefront and commerce data.
 *
 * Components never import fixtures or call `fetch` directly; they receive data
 * resolved through this interface in a Server Component. Which implementation
 * they get is decided by the data mode (see `dataMode.ts`): demo serves the
 * design-template fixtures, live talks to Aonik.
 *
 * SERVER-ONLY: configuration is read from non-`NEXT_PUBLIC_` variables, so it
 * cannot be bundled into client JavaScript. Keep calls to `getAonikClient()` in
 * Server Components or Route Handlers.
 */

import { readAonikConfig, resolveDataMode } from './dataMode';
import { EXTRA_FIXTURES } from './extras';
import {
  BOX_FIXTURES,
  BOX_PRICING_FIXTURE,
  DELIVERY_FIXTURE,
  DISH_FIXTURES,
  HEATING_FIXTURE,
  PERSONALISATION_FIXTURE,
} from './fixtures';
import type {
  BoxOffer,
  BoxPricing,
  DeliveryWindow,
  Dish,
  Extra,
  HeatingInstruction,
  HomepageData,
  PersonalisationOptions,
} from './types';

export interface AonikClient {
  /** The full catalogue, as shown on /menu. */
  getDishes(): Promise<Dish[]>;
  /** The curated subset the homepage rail shows. */
  getFeaturedDishes(): Promise<Dish[]>;
  /** One dish by slug, or null when it does not exist. */
  getDishBySlug(slug: string): Promise<Dish | null>;
  getBoxOffers(): Promise<BoxOffer[]>;
  /** Preset tiers, build-your-own scale and the extra-dish surcharge. */
  getBoxPricing(): Promise<BoxPricing>;
  getDeliveryWindow(): Promise<DeliveryWindow>;
  /** Selectable portions, proteins, sides and heat for the dish personaliser. */
  getPersonalisationOptions(): Promise<PersonalisationOptions>;
  getHeatingInstructions(): Promise<HeatingInstruction[]>;
  /** À-la-carte extras sold alongside the box (Step 3). */
  getExtras(): Promise<Extra[]>;
}

/** Serves the design-template fixtures. Used until Aonik is reachable. */
export class MockAonikClient implements AonikClient {
  async getDishes(): Promise<Dish[]> {
    return DISH_FIXTURES;
  }

  async getFeaturedDishes(): Promise<Dish[]> {
    return DISH_FIXTURES.filter((dish) => dish.isFeatured);
  }

  async getDishBySlug(slug: string): Promise<Dish | null> {
    return DISH_FIXTURES.find((dish) => dish.slug === slug) ?? null;
  }

  async getBoxOffers(): Promise<BoxOffer[]> {
    return BOX_FIXTURES;
  }

  async getBoxPricing(): Promise<BoxPricing> {
    return BOX_PRICING_FIXTURE;
  }

  async getDeliveryWindow(): Promise<DeliveryWindow> {
    return DELIVERY_FIXTURE;
  }

  async getPersonalisationOptions(): Promise<PersonalisationOptions> {
    return PERSONALISATION_FIXTURE;
  }

  async getHeatingInstructions(): Promise<HeatingInstruction[]> {
    return HEATING_FIXTURE;
  }

  async getExtras(): Promise<Extra[]> {
    return EXTRA_FIXTURES;
  }
}

export interface HttpAonikClientOptions {
  baseUrl: string;
  /** Aonik partitions every storefront read by tenant; required on all requests. */
  tenantId: string;
  /** Seconds to cache each response; 0 disables caching. */
  revalidateSeconds?: number;
}

/**
 * Talks to the real Aonik commerce API.
 *
 * TRANSPORT IS HALF-BUILT. The request plumbing below is correct — base URL
 * join, `X-Tenant-Id` on every call, anonymous catalog reads, cache policy. The
 * PATHS are still the pre-Aonik guesses (`/dishes`, `/box-pricing`, …) and do
 * not exist on the real API, which serves everything under `/commerce/…`.
 * Replacing them, plus the DTO mapping and the pence adapter, is
 * SPEC-2026-07-22-aonik-transport. Until that lands, live mode reaches Aonik and
 * gets 404s — which is the point of having the seam wired and the mode
 * switchable before the mapping exists.
 */
export class HttpAonikClient implements AonikClient {
  constructor(private readonly options: HttpAonikClientOptions) {}

  private async get<T>(path: string): Promise<T> {
    const { baseUrl, tenantId, revalidateSeconds = 300 } = this.options;
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        // Catalog reads are anonymous — Aonik's storefront surface takes no
        // service credential. Customer-authenticated calls will carry a session
        // bearer instead (see SPEC-2026-07-22-customer-identity).
        'X-Tenant-Id': tenantId,
        Accept: 'application/json',
      },
      next: { revalidate: revalidateSeconds },
    });

    if (!response.ok) {
      throw new Error(`Aonik ${path} failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  getDishes(): Promise<Dish[]> {
    return this.get<Dish[]>('/dishes');
  }

  getFeaturedDishes(): Promise<Dish[]> {
    return this.get<Dish[]>('/dishes?featured=true');
  }

  async getDishBySlug(slug: string): Promise<Dish | null> {
    try {
      return await this.get<Dish>(`/dishes/${encodeURIComponent(slug)}`);
    } catch {
      return null;
    }
  }

  getPersonalisationOptions(): Promise<PersonalisationOptions> {
    return this.get<PersonalisationOptions>('/personalisation-options');
  }

  getHeatingInstructions(): Promise<HeatingInstruction[]> {
    return this.get<HeatingInstruction[]>('/heating-instructions');
  }

  getBoxOffers(): Promise<BoxOffer[]> {
    return this.get<BoxOffer[]>('/boxes');
  }

  getBoxPricing(): Promise<BoxPricing> {
    return this.get<BoxPricing>('/box-pricing');
  }

  getDeliveryWindow(): Promise<DeliveryWindow> {
    return this.get<DeliveryWindow>('/delivery-window');
  }

  getExtras(): Promise<Extra[]> {
    return this.get<Extra[]>('/extras');
  }
}

/**
 * Resolves the client for this request: fixtures in demo mode, HTTP in live.
 * This is the only place that decides.
 *
 * Async because the development-only mode override lives in a cookie. In
 * production it resolves from configuration alone.
 */
export async function getAonikClient(): Promise<AonikClient> {
  const { mode } = await resolveDataMode();

  if (mode === 'demo') {
    return new MockAonikClient();
  }

  const config = readAonikConfig();
  if (!config) {
    // resolveDataMode only returns 'live' when the config is complete, so this
    // is unreachable in practice — it exists so a future caller that skips the
    // resolver fails loudly rather than silently serving demo data as if real.
    throw new Error('Live data mode requires AONIK_API_URL and AONIK_TENANT_ID.');
  }

  return new HttpAonikClient(config);
}

/** Resolves everything the homepage renders in one concurrent pass. */
export async function getHomepageData(): Promise<HomepageData> {
  const client = await getAonikClient();

  const [dishes, boxes, delivery] = await Promise.all([
    client.getFeaturedDishes(),
    client.getBoxOffers(),
    client.getDeliveryWindow(),
  ]);

  return { dishes, boxes, delivery };
}

/** How many "You might also like" cards a dish page shows. */
const RELATED_COUNT = 4;

/**
 * Resolves a dish page. Returns null when the slug does not exist so the route
 * can render a 404 rather than an empty shell.
 */
export async function getDishPageData(slug: string) {
  const client = await getAonikClient();

  const [dish, allDishes, boxes, delivery, personalisation, heating] = await Promise.all([
    client.getDishBySlug(slug),
    client.getDishes(),
    client.getBoxOffers(),
    client.getDeliveryWindow(),
    client.getPersonalisationOptions(),
    client.getHeatingInstructions(),
  ]);

  if (!dish) return null;

  // Prefer dishes sharing a wellness goal, then fill from the rest of the menu.
  const others = allDishes.filter((candidate) => candidate.id !== dish.id);
  const sameGoal = others.filter((candidate) =>
    candidate.wellness.some((goal) => dish.wellness.includes(goal)),
  );
  const related = [...sameGoal, ...others.filter((d) => !sameGoal.includes(d))].slice(
    0,
    RELATED_COUNT,
  );

  return { dish, related, boxes, delivery, personalisation, heating };
}

/** Resolves everything the /menu page renders in one concurrent pass. */
export async function getMenuPageData(): Promise<{
  dishes: Dish[];
  delivery: DeliveryWindow;
}> {
  const client = await getAonikClient();

  const [dishes, delivery] = await Promise.all([
    client.getDishes(),
    client.getDeliveryWindow(),
  ]);

  return { dishes, delivery };
}
