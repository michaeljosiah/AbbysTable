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
  STOREFRONT_CONFIG_FIXTURE,
} from './fixtures';
import { aonikFetch } from './http';
import { mapStorefrontConfig, type StorefrontConfigDto } from './map';
import type {
  BoxOffer,
  BoxPricing,
  DeliveryWindow,
  Dish,
  Extra,
  HeatingInstruction,
  HomepageData,
  PersonalisationOptions,
  StorefrontConfig,
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
  /**
   * Tenant-authored storefront settings: currency, labels, page size, delivery
   * display amounts, the default box slug and its size plan. Never 404s.
   */
  getStorefrontConfig(): Promise<StorefrontConfig>;
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

  async getStorefrontConfig(): Promise<StorefrontConfig> {
    return STOREFRONT_CONFIG_FIXTURE;
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
 * Transport is complete: `aonikFetch` owns URL joining, the tenant header,
 * cache policy and the `AonikError` taxonomy, and `map.ts` owns the pence
 * adapter and DTO mapping.
 *
 * CATALOGUE MAPPING IS NOT. The reads below that still throw are waiting on
 * SPEC-2026-07-22-catalog-browse, which maps Aonik's product/facet/content DTOs
 * onto `Dish` and friends — a substantial surface with its own safety rules
 * (withheld allergens, standard-preparation captions) that must not be
 * half-done. They throw rather than returning fixtures because silently serving
 * demo data from a client labelled "live" is the one failure mode that would
 * make every downstream test a lie.
 */
export class HttpAonikClient implements AonikClient {
  constructor(private readonly options: HttpAonikClientOptions) {}

  private get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return aonikFetch<T>(path, {
      baseUrl: this.options.baseUrl,
      tenantId: this.options.tenantId,
      policy: 'catalog',
      query,
    });
  }

  /** Not yet mapped — see the class note. */
  private notYetMapped(surface: string): never {
    throw new Error(
      `Live mode cannot serve ${surface} yet: the catalogue mapping is ` +
        'SPEC-2026-07-22-catalog-browse. Switch the dev data-mode badge to demo, or ' +
        'implement the mapper.',
    );
  }

  async getStorefrontConfig(): Promise<StorefrontConfig> {
    return mapStorefrontConfig(
      await this.get<StorefrontConfigDto>('/commerce/config/storefront'),
    );
  }

  getDishes(): Promise<Dish[]> {
    return this.notYetMapped('the dish catalogue');
  }

  getFeaturedDishes(): Promise<Dish[]> {
    return this.notYetMapped('the featured rail');
  }

  getDishBySlug(): Promise<Dish | null> {
    return this.notYetMapped('a dish page');
  }

  getPersonalisationOptions(): Promise<PersonalisationOptions> {
    // Retired by catalog-browse: option groups are per-product, not global.
    return this.notYetMapped('personalisation options');
  }

  getHeatingInstructions(): Promise<HeatingInstruction[]> {
    // Retired by catalog-browse: heating rides each dish's resolved content.
    return this.notYetMapped('heating instructions');
  }

  getBoxOffers(): Promise<BoxOffer[]> {
    return this.notYetMapped('box offers');
  }

  getBoxPricing(): Promise<BoxPricing> {
    return this.notYetMapped('box pricing');
  }

  getDeliveryWindow(): Promise<DeliveryWindow> {
    // Lands with review-checkout, including the 404 "no promise" state.
    return this.notYetMapped('the delivery promise');
  }

  getExtras(): Promise<Extra[]> {
    return this.notYetMapped('extras');
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
