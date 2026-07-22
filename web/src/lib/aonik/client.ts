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
import type {
  BoxPlanDto,
  FacetGroupDto,
  PagedResultDto,
  ProductDto,
  ProductSummaryDto,
  PublicCollectionDto,
} from './dto';
import { AonikError } from './errors';
import { EXTRA_FIXTURES } from './extras';
import { FACET_FIXTURES, fixtureMatchesFacet, fixtureOptionGroups } from './fixtureFacets';
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
import {
  mapBoxPlan,
  mapFacetGroups,
  mapProductToDish,
  mapOptionGroups,
  mapStorefrontConfig,
  mapSummaryToDish,
  type MappedBoxPlan,
  type MappedFacetGroup,
  type MappedOptionGroup,
  type StorefrontConfigDto,
} from './map';
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
  /**
   * The tenant's filter rail. Demo serves the fixture facets; live reads them
   * from Aonik so a group can be added or retired with no deploy.
   */
  getFacetGroups(): Promise<MappedFacetGroup[]>;
  /**
   * Browse with server-side facet filtering. Demo filters the fixtures locally
   * so both modes behave identically from the caller's point of view.
   */
  listProducts(options?: ProductBrowseOptions): Promise<ProductPage>;
  /**
   * A dish's own personalisation groups. Empty means "not personalisable" —
   * hide the panel entirely rather than rendering an empty one.
   */
  getDishOptionGroups(slug: string): Promise<MappedOptionGroup[]>;
}

export interface ProductPage {
  dishes: Dish[];
  totalCount: number;
  page: number;
  pageSize: number;
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

  async getFacetGroups(): Promise<MappedFacetGroup[]> {
    return FACET_FIXTURES;
  }

  /**
   * Mirrors Aonik's browse semantics locally: OR within a facet group, AND
   * across groups. Keeping the contract identical in both modes is what lets
   * the menu drop its client-side filtering entirely.
   */
  async listProducts(options: ProductBrowseOptions = {}): Promise<ProductPage> {
    const facets = options.facets ?? {};
    let dishes = DISH_FIXTURES;

    if (options.collection === FEATURED_COLLECTION_SLUG) {
      dishes = dishes.filter((dish) => dish.isFeatured);
    }

    const needle = options.search?.trim().toLowerCase();
    if (needle) {
      dishes = dishes.filter((dish) =>
        `${dish.title} ${dish.description} ${dish.tags.join(' ')}`.toLowerCase().includes(needle),
      );
    }

    for (const [key, values] of Object.entries(facets)) {
      if (values.length === 0) continue;
      dishes = dishes.filter((dish) => values.some((value) => fixtureMatchesFacet(dish, key, value)));
    }

    const pageSize = options.pageSize ?? STOREFRONT_CONFIG_FIXTURE.resultsPageSize;
    const page = options.page ?? 1;
    const start = (page - 1) * pageSize;

    return {
      dishes: dishes.slice(start, start + pageSize),
      totalCount: dishes.length,
      page,
      pageSize,
    };
  }

  async getDishOptionGroups(slug: string): Promise<MappedOptionGroup[]> {
    const dish = DISH_FIXTURES.find((candidate) => candidate.slug === slug);
    if (!dish) return [];
    return fixtureOptionGroups(dish);
  }
}

/**
 * The tenant's curated homepage rail. A collection slug, not a product flag —
 * `Dish.isFeatured` now reflects membership rather than owning the decision.
 */
const FEATURED_COLLECTION_SLUG = 'featured';

/** Browse parameters. Facet values must be tokens the facets read advertised. */
export interface ProductBrowseOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  collection?: string;
  /** `name` | `newest` | `rank` — rank is the curated order inside a collection. */
  sort?: 'name' | 'newest' | 'rank';
  facets?: Record<string, string[]>;
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
  private notYetMapped(surface: string, spec: string): never {
    throw new Error(
      `Live mode cannot serve ${surface} yet: that mapping is ${spec}. Switch the dev ` +
        'data-mode badge to demo, or implement the mapper.',
    );
  }

  async getStorefrontConfig(): Promise<StorefrontConfig> {
    return mapStorefrontConfig(
      await this.get<StorefrontConfigDto>('/commerce/config/storefront'),
    );
  }

  /** The browse read, with optional facet/collection/sort/paging parameters. */
  async listProducts(options: ProductBrowseOptions = {}): Promise<ProductPage> {
    const query: Record<string, string | number | undefined> = {
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      collection: options.collection,
      sort: options.sort,
    };

    // Repeatable `facet.<key>=v1,v2`. Values are option tokens the facets read
    // advertised — Aonik 400s on anything it did not publish, deliberately.
    for (const [key, values] of Object.entries(options.facets ?? {})) {
      if (values.length > 0) query[`facet.${key}`] = values.join(',');
    }

    const page = await this.get<PagedResultDto<ProductSummaryDto>>(
      '/commerce/catalog/products',
      query,
    );

    return {
      dishes: page.items.map(mapSummaryToDish),
      totalCount: page.totalCount,
      page: page.page,
      pageSize: page.pageSize,
    };
  }

  async getDishes(): Promise<Dish[]> {
    const { dishes } = await this.listProducts();
    return dishes;
  }

  /** The curated `featured` collection, in rank order — not a derived flag. */
  async getFeaturedDishes(): Promise<Dish[]> {
    const collection = await this.get<PublicCollectionDto>(
      `/commerce/catalog/collections/${encodeURIComponent(FEATURED_COLLECTION_SLUG)}`,
    );
    return collection.products.map((product) => ({
      ...mapSummaryToDish(product),
      isFeatured: true,
    }));
  }

  async getDishBySlug(slug: string): Promise<Dish | null> {
    try {
      return mapProductToDish(
        await this.get<ProductDto>(`/commerce/catalog/products/${encodeURIComponent(slug)}`),
      );
    } catch (error) {
      // 404 is "no such dish" — the route renders not-found. Anything else is a
      // real fault and must not be disguised as an empty page.
      if (error instanceof AonikError && error.isNotFound) return null;
      throw error;
    }
  }

  /** The tenant's filter rail, so a facet can be added or retired without a deploy. */
  async getFacetGroups(): Promise<MappedFacetGroup[]> {
    return mapFacetGroups(await this.get<FacetGroupDto[]>('/commerce/catalog/facets'));
  }

  async getDishOptionGroups(slug: string): Promise<MappedOptionGroup[]> {
    try {
      const product = await this.get<ProductDto>(
        `/commerce/catalog/products/${encodeURIComponent(slug)}`,
      );
      return mapOptionGroups(product.effectiveOptionGroups);
    } catch (error) {
      if (error instanceof AonikError && error.isNotFound) return [];
      throw error;
    }
  }

  /** The default box bundle's full size plan, keyed on product slug. */
  async getBoxPlan(slug: string): Promise<MappedBoxPlan> {
    return mapBoxPlan(
      await this.get<BoxPlanDto>(
        `/commerce/catalog/products/${encodeURIComponent(slug)}/box-plan`,
      ),
    );
  }

  getPersonalisationOptions(): Promise<PersonalisationOptions> {
    // Retired: option groups are per-product (`Dish` carries which it offers,
    // and the detail read carries the groups themselves). Nothing global exists
    // to fetch, so this cannot be implemented — its callers must move to the
    // per-product groups as part of adopting the live personaliser.
    return this.notYetMapped(
      'global personalisation options',
      'retired by SPEC-2026-07-22-catalog-browse (options are per-product)',
    );
  }

  getHeatingInstructions(): Promise<HeatingInstruction[]> {
    // Likewise retired: heating rides each dish's resolved content.
    return this.notYetMapped(
      'catalogue-wide heating instructions',
      'retired by SPEC-2026-07-22-catalog-browse (heating is per-dish content)',
    );
  }

  /**
   * Step 1's pricing, from the default bundle's size plan.
   *
   * The plan is named by the storefront config's `defaultBoxSlug`, so which
   * bundle the box builder uses is tenant configuration rather than a constant
   * here. Note what the plan cannot provide: a list price for a custom size —
   * `savingAmount` is authored per preset only, so the strikethrough at
   * arbitrary sizes is gone rather than computed (FR-6).
   */
  private async resolveBoxPricing(): Promise<BoxPricing> {
    const config = await this.getStorefrontConfig();
    if (!config.defaultBoxSlug) {
      throw new Error(
        'No defaultBoxSlug in the storefront config — the tenant has not named a box bundle, ' +
          'so Step 1 has nothing to price.',
      );
    }

    const plan = await this.getBoxPlan(config.defaultBoxSlug);

    return {
      presets: plan.offers,
      custom: {
        minDishes: plan.minSize,
        maxDishes: plan.maxSize,
        perDishPence: plan.perSpacePence,
      },
      // Superseded by the plan: growing a box charges the marginal plan price
      // server-side, not a flat per-extra-dish figure (see server-box-cart).
      extraDishPence: plan.perSpacePence,
      delivery: {
        listPence: config.delivery.listPence,
        pricePence: config.delivery.chargedPence,
      },
    };
  }

  async getBoxOffers(): Promise<BoxOffer[]> {
    const { presets } = await this.resolveBoxPricing();
    return presets;
  }

  getBoxPricing(): Promise<BoxPricing> {
    return this.resolveBoxPricing();
  }

  getDeliveryWindow(): Promise<DeliveryWindow> {
    return this.notYetMapped('the delivery promise', 'SPEC-2026-07-22-review-checkout FR-1');
  }

  getExtras(): Promise<Extra[]> {
    return this.notYetMapped('extras', 'SPEC-2026-07-22-server-box-cart FR-6');
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

/**
 * Resolves everything the homepage renders in one concurrent pass.
 *
 * The rail is the `featured` COLLECTION in curated rank order — membership is
 * the tenant's editorial decision, not a flag this storefront derives.
 */
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
 * Per-product option groups → the shape the audited personaliser renders.
 *
 * The source of truth is now per-product (`effectiveOptionGroups`), which is
 * what SPEC-2026-07-22-catalog-browse asks for; this adapter keeps the
 * template-verified components unchanged while that source changes underneath.
 *
 * KNOWN LIMITATION: `PersonalisationOptions` has no way to express a group's
 * `One`/`Multi` mode, so a widened protein group still renders single-select
 * here. Encoding a multi-select selection is SPEC-2026-07-22-server-box-cart's
 * job (it owns `CartPersonalisation` and the cart write); this adapter is
 * deliberately not the place to half-solve it.
 */
function adaptOptionGroups(groups: MappedOptionGroup[]): PersonalisationOptions {
  const find = (...keys: string[]) =>
    groups.find((group) => keys.includes(group.key))?.choices ?? [];

  const heatGroup = groups.find((group) => group.key === 'heat');

  return {
    portions: find('portion', 'portions'),
    proteins: find('protein', 'proteins'),
    sides: find('side', 'sides'),
    heatLevels:
      heatGroup?.choices.map((choice) => ({
        label: choice.label,
        step: Number.parseInt(choice.key, 10) || 0,
      })) ?? [],
  };
}

/**
 * Resolves a dish page. Returns null when the slug does not exist so the route
 * can render a 404 rather than an empty shell.
 */
export async function getDishPageData(slug: string) {
  const client = await getAonikClient();

  const [dish, allDishes, boxes, delivery, optionGroups, genericHeating] = await Promise.all([
    client.getDishBySlug(slug),
    client.getDishes(),
    client.getBoxOffers(),
    client.getDeliveryWindow(),
    // Per-product, not catalogue-wide: an empty list means "not personalisable".
    client.getDishOptionGroups(slug),
    client.getHeatingInstructions(),
  ]);

  if (!dish) return null;

  const personalisation = adaptOptionGroups(optionGroups);

  /*
   * Authored heating wins. The generic steps are a framed fallback for dishes
   * with none — `DishInfoPanels` labels them as general guidance so they are
   * never mistaken for instructions the kitchen wrote for this dish.
   */
  const authored = dish.contentState?.heating ?? [];
  const heating = authored.length > 0 ? authored : genericHeating;

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

/**
 * Resolves everything the /menu page renders in one concurrent pass.
 *
 * Filtering happens server-side: the browse endpoint pages its results, so the
 * only correct place to apply facets is the query itself.
 */
export async function getMenuPageData(options: {
  filters: Record<string, string[]>;
  query: string;
  limit: number;
}): Promise<{
  dishes: Dish[];
  totalCount: number;
  facetGroups: MappedFacetGroup[];
  delivery: DeliveryWindow;
}> {
  const client = await getAonikClient();

  const [page, facetGroups, delivery] = await Promise.all([
    client.listProducts({
      facets: options.filters,
      search: options.query || undefined,
      page: 1,
      pageSize: options.limit,
    }),
    client.getFacetGroups(),
    client.getDeliveryWindow(),
  ]);

  return {
    dishes: page.dishes,
    totalCount: page.totalCount,
    facetGroups,
    delivery,
  };
}
