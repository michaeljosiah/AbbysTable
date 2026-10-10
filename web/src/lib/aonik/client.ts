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

import { resolveBoxPlan, resolveExampleDish } from '@/lib/how-it-works/pageData';

import { readAonikConfig, resolveDataMode } from './dataMode';
import type {
  BoxPlanDto,
  FacetGroupDto,
  PagedResultDto,
  ProductDto,
  ProductSummaryDto,
  PublicCollectionDto,
  ExtrasListDto,
} from './dto';
import { DemoCoverageLookup, type CoverageLookup } from './coverage';
import { AONIK_CODES, AonikError } from './errors';
import { EXTRA_FIXTURES } from './extras';
import { dishMatchesSearch, filterDishes, sanitiseFilters } from '@/lib/menu/facets';
import { ALL_SORTS, parseMenuSort, sortDishes, type MenuSortKey } from '@/lib/menu/sort';

import { FACET_FIXTURES, fixtureOptionGroups } from './fixtureFacets';
import {
  BOX_FIXTURES,
  BOX_PRICING_FIXTURE,
  DELIVERY_FIXTURE,
  DISH_FIXTURES,
  HEATING_FIXTURE,
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
  mapExtraRow,
} from './map';
import { HttpSignupLists, type SignupLists } from './signupLists';
import type {
  BoxOffer,
  BoxPricing,
  DeliveryWindow,
  Dish,
  Extra,
  HeatingInstruction,
  HomepageData,
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
  /** Null when the tenant has no fulfilment calendar — a state, not an error. */
  getDeliveryWindow(): Promise<DeliveryWindow | null>;
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
   * The menu orders this source can apply across the WHOLE match set, before
   * paging (`lib/menu/sort.ts`). The menu offers only these: an order the
   * source cannot apply is never faked by sorting one page in the browser.
   */
  readonly menuSorts: readonly MenuSortKey[];
  /**
   * A dish's own personalisation groups. Empty means "not personalisable" —
   * hide the panel entirely rather than rendering an empty one.
   */
  getDishOptionGroups(slug: string): Promise<MappedOptionGroup[]>;
  /**
   * Postcode coverage (contract §3b), or null while this source has no lookup
   * — then the Delivery & FAQs checker is held back, never faked.
   */
  readonly coverage: CoverageLookup | null;
  /**
   * The sign-up lists — newsletter, notify-me, Private Table waitlist (Aonik
   * #357) — or null where nothing can store a sign-up. Each form renders only
   * for a list the tenant has published, with its published consent wording.
   */
  readonly signupLists: SignupLists | null;
}

export interface ProductPage {
  dishes: Dish[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Serves the design-template fixtures. Used until Aonik is reachable. */
export class MockAonikClient implements AonikClient {
  /** The design's placeholder coverage — a READ, so demo may serve it. */
  readonly coverage: CoverageLookup = new DemoCoverageLookup();

  /**
   * None, deliberately: demo serves fixture reads but never pretends a write
   * succeeded — it stores no email or name, so it offers no sign-up form
   * (`./signupLists`).
   */
  readonly signupLists: SignupLists | null = null;

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

  async getDeliveryWindow(): Promise<DeliveryWindow | null> {
    return DELIVERY_FIXTURE;
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

  /** Every menu order: the fixtures are all here, so the whole set sorts before paging. */
  readonly menuSorts: readonly MenuSortKey[] = ALL_SORTS;

  /**
   * Mirrors Aonik's browse semantics locally: OR within a facet group, AND
   * across groups (`lib/menu/facets.ts`). Keeping the contract identical in
   * both modes is what lets the menu drop its client-side filtering entirely.
   */
  async listProducts(options: ProductBrowseOptions = {}): Promise<ProductPage> {
    let dishes = DISH_FIXTURES;

    if (options.collection === FEATURED_COLLECTION_SLUG) {
      dishes = dishes.filter((dish) => dish.isFeatured);
    }

    if (options.search?.trim()) {
      const query = options.search;
      dishes = dishes.filter((dish) => dishMatchesSearch(dish, query));
    }

    dishes = filterDishes(dishes, options.facets ?? {});
    dishes = sortDishes(dishes, options.order ?? 'recommended');

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

/**
 * The dish menu.
 *
 * `/commerce/catalog/products` is every Active product in the tenant, which
 * includes the à-la-carte extras and the box bundle itself. Aonik has no "this
 * is a dish" flag — curation is what a collection is for — so the browse is
 * scoped to this collection instead.
 *
 * It is OPTIONAL. A tenant that has not curated one still gets a working menu
 * (see `listProducts`), because "not curated yet" is a legitimate state and a
 * blank or broken menu page is a far worse answer than an over-inclusive one.
 */
const MENU_COLLECTION_SLUG = 'menu';

/** The menu's orders in Aonik's words (aonik#359); Recommended sends none. */
const AONIK_SORT: Record<MenuSortKey, string | undefined> = {
  recommended: undefined,
  protein: 'protein-desc',
  calories: 'calories-asc',
};

/** Browse parameters. Facet values must be tokens the facets read advertised. */
export interface ProductBrowseOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  collection?: string;
  /**
   * Aonik's own order — `name` | `newest` | `rank` (the curated order inside a
   * collection). Wins over `order`.
   */
  sort?: 'name' | 'newest' | 'rank';
  /**
   * A menu order (`lib/menu/sort.ts`). Honoured only by a client that lists it
   * in `menuSorts`; callers ask for nothing else (`getMenuPageData`).
   */
  order?: MenuSortKey;
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
 * `aonikFetch` owns URL joining, the tenant header, cache policy and the
 * `AonikError` taxonomy; `map.ts` owns the pence adapter and DTO mapping
 * (SPEC-2026-07-22-catalog-browse for the catalogue). Every read is mapped.
 *
 * A failure here is thrown, never answered with fixtures: silently serving demo
 * data from a client labelled "live" is the one failure mode that would make
 * every downstream test a lie.
 */
export class HttpAonikClient implements AonikClient {
  constructor(private readonly options: HttpAonikClientOptions) {}

  /**
   * None yet: Aonik has no coverage endpoint (michaeljosiah/aonik#352). Null,
   * not a stub that fails every check — "we couldn't check that postcode just
   * now, try again in a moment" would be untrue when no moment will fix it.
   * The Delivery & FAQs page holds its checker back until this is a
   * `CoverageLookup` over that endpoint.
   */
  readonly coverage: CoverageLookup | null = null;

  /**
   * All three, applied by Aonik across the whole match set before paging
   * (aonik#359): Recommended is the `menu` collection's curated rank (Aonik's
   * default inside a collection), Highest protein `protein-desc`, Lowest
   * calories `calories-asc` — a dish without the figure after every dish with
   * it, as ours. Ties go by name, where demo keeps the recommended order.
   */
  readonly menuSorts: readonly MenuSortKey[] = ['recommended', 'protein', 'calories'];

  /** Aonik's sign-up lists (#357). Which forms show is the tenant's publishing. */
  get signupLists(): SignupLists {
    return new HttpSignupLists(this.options);
  }

  private get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return aonikFetch<T>(path, {
      baseUrl: this.options.baseUrl,
      tenantId: this.options.tenantId,
      policy: 'catalog',
      query,
    });
  }

  async getStorefrontConfig(): Promise<StorefrontConfig> {
    return mapStorefrontConfig(
      await this.get<StorefrontConfigDto>('/commerce/config/storefront'),
    );
  }

  /** The browse read, with optional facet/collection/sort/paging parameters. */
  async listProducts(options: ProductBrowseOptions = {}): Promise<ProductPage> {
    // A caller that names no collection is browsing the dish menu; every such
    // caller (the /menu page, the homepage rail, Step 2) wants dishes.
    const defaultedCollection = options.collection === undefined;
    const collection = options.collection ?? MENU_COLLECTION_SLUG;

    try {
      return await this.browse(options, collection);
    } catch (error) {
      // Aonik answers an unknown collection with a LOUD 400 rather than an
      // empty list, deliberately. That is right for a collection the caller
      // asked for by name, but our own default must not turn "this tenant has
      // not curated a menu" into a broken menu page — so that one case, and
      // only that one, retries unscoped.
      const unknownDefault =
        defaultedCollection &&
        error instanceof AonikError &&
        error.code === AONIK_CODES.storefrontValidation;

      if (!unknownDefault) throw error;

      console.warn(
        `[aonik] no '${MENU_COLLECTION_SLUG}' collection for this tenant; the menu is falling ` +
          'back to every simple product, which will include à-la-carte extras. Curate a ' +
          `'${MENU_COLLECTION_SLUG}' collection to control what the menu shows.`,
      );
      return this.browse(options, undefined);
    }
  }

  /** One browse round trip. `collection` undefined means unscoped. */
  private async browse(
    options: ProductBrowseOptions,
    collection: string | undefined,
  ): Promise<ProductPage> {
    const query: Record<string, string | number | undefined> = {
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      collection,
      // A menu order Aonik applies itself; none for Recommended, which is the
      // collection's rank by default (and name on the unscoped fallback).
      sort: options.sort ?? (options.order ? AONIK_SORT[options.order] : undefined),
      // Belt and braces alongside the collection: the box bundle is not a dish,
      // and must never appear on the menu as though it were something you could
      // put IN a box. This still holds on the unscoped fallback path.
      kind: 'Simple',
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

  /**
   * The curated `featured` collection, in rank order — not a derived flag.
   *
   * A tenant that has not authored the collection is a legitimate state (every
   * tenant starts that way), and Aonik answers 404 for it. That must degrade to
   * an empty rail, not a 500: losing one homepage section is a merchandising
   * gap, while throwing takes down the whole page over a collection the
   * operator simply has not created yet.
   */
  /**
   * The homepage rail.
   *
   * The collection endpoint answers with browse rows. Since aonik#359 they
   * carry the card's description and figures, but an older Aonik's did not,
   * and the detail read is the one with the resolved content — so each dish is
   * still hydrated from its own detail read.
   *
   * The reads run in parallel and the rail is six dishes, so this is one round
   * trip's worth of latency rather than six. A dish whose detail read fails
   * falls back to its summary: a card missing a line is much better than a
   * homepage that will not render.
   */
  async getFeaturedDishes(): Promise<Dish[]> {
    try {
      const collection = await this.get<PublicCollectionDto>(
        `/commerce/catalog/collections/${encodeURIComponent(FEATURED_COLLECTION_SLUG)}`,
      );

      return await Promise.all(
        collection.products.map(async (product) => {
          const summary = { ...mapSummaryToDish(product), isFeatured: true };
          // A typed row's figures are the card's (aonik#359): Aonik withholds a
          // stale block's from cards, which the detail read still carries for
          // the dish page's captioned panel — so the rail card agrees with /menu.
          const typedFigures = 'kcal' in product || 'proteinGrams' in product || 'fibreGrams' in product;
          try {
            const detail = await this.getDishBySlug(summary.slug);
            // Curation lives on the collection, not the product, so `isFeatured`
            // is re-applied over the detail read.
            if (!detail) return summary;
            return { ...detail, nutrition: typedFigures ? summary.nutrition : detail.nutrition, isFeatured: true };
          } catch {
            return summary;
          }
        }),
      );
    } catch (error) {
      if (error instanceof AonikError && error.isNotFound) return [];
      throw error;
    }
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

  /**
   * Empty for the same reason: reheating guidance rides each dish's resolved
   * content (`Dish.contentState.heating`), which the dish read already carries.
   * `DishInfoPanels` falls back to its framed generic note when a dish has
   * none, so an empty list here degrades to correct copy rather than a gap.
   */
  getHeatingInstructions(): Promise<HeatingInstruction[]> {
    return Promise.resolve([]);
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
        baseDishes: plan.baseSize,
        basePence: plan.basePence,
        perSpacePence: plan.perSpacePence,
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

  /**
   * The earliest-delivery promise, or null when there is none.
   *
   * A 404 here is Aonik saying the tenant has no resolvable fulfilment
   * calendar. That is a designed state — the storefront hides the promise
   * line rather than inventing a date — so it must not be cached and must not
   * surface as an error.
   */
  async getDeliveryWindow(): Promise<DeliveryWindow | null> {
    try {
      return await this.get<DeliveryWindow>('/commerce/config/delivery');
    } catch (error) {
      if (error instanceof AonikError && error.isNotFound) return null;
      throw error;
    }
  }

  /**
   * The extras rail (Spec 071 §4): the configured collection's members with
   * retail prices — the deliberate exception to "dishes never show a price".
   *
   * `skipped` counts rows Aonik could not price. It is an OPERATOR signal, not
   * a customer one: the rail simply shows fewer items, and logging it here is
   * what makes a silently-shrinking rail diagnosable instead of mysterious.
   */
  async getExtras(): Promise<Extra[]> {
    const list = await this.get<ExtrasListDto>('/commerce/catalog/extras');

    if (list.skipped > 0) {
      console.warn(
        `[aonik] the extras rail omitted ${list.skipped} unpriceable row(s); ` +
          'check their variant pricing in Aonik.',
      );
    }

    return list.rows.map(mapExtraRow);
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
 * Resolves the homepage's catalogue data: the dish rail.
 *
 * The rail is the `featured` COLLECTION in curated rank order — membership is
 * the tenant's editorial decision, not a flag this storefront derives.
 *
 * Nothing else: the v2 homepage has no boxes promo to price and never shows a
 * delivery date, and its box plan is read with the purchase bar's data
 * (`getPurchaseBarData`), so the page asks for the plan once.
 *
 * Optional, like every commerce read on a marketing page: if the collection
 * cannot be read (or Aonik is not configured) the band is left out and the
 * homepage still renders, rather than becoming a 500.
 */
export async function getHomepageData(): Promise<HomepageData> {
  const dishes = await optionalRead(
    'the homepage featured dishes',
    async () => (await getAonikClient()).getFeaturedDishes(),
    [] as Dish[],
  );
  return { dishes };
}

/** How many "You might also like" cards a dish page shows. */
const RELATED_COUNT = 4;

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

  return { dish, related, boxes, delivery, optionGroups, heating };
}

/**
 * One OPTIONAL read for an editorial page: on any failure it logs and resolves
 * to `fallback`, so a hiccup in one piece leaves that piece out instead of
 * turning the whole page into a 500.
 */
async function optionalRead<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[aonik] ${label} could not be read; rendering without it.`, error);
    return fallback;
  }
}

/**
 * Resolves everything Our Standards renders in one concurrent pass.
 *
 * The page is editorial: every commerce piece on it is optional, and each one
 * degrades on its own rather than taking the page down.
 *  - `exampleDish`: the dish band 05 prints as "Example dish information" —
 *    null when the catalogue has no such dish or it could not be read, and the
 *    panel is then omitted.
 *  - `returnDish`: only when the page was opened from a dish
 *    (`?from=dish&dish=<slug>`), so "Back to dish" is validated against the
 *    real catalogue. No dish behind the slug (or no answer) means no link.
 *
 * The box minimum the closing CTA states is NOT read here: it is the
 * storefront plan's, read once by `getPurchaseBarData` for the page's mobile
 * bar, so the closing line and the bar can never quote different minimums
 * (marketing-pages FR-02).
 */
export async function getStandardsPageData(options: {
  exampleDishSlug: string;
  returnSlug?: string | null;
}): Promise<{
  exampleDish: Dish | null;
  returnDish: Dish | null;
}> {
  const client = await getAonikClient();
  const { exampleDishSlug, returnSlug } = options;

  const [exampleDish, returnDish] = await Promise.all([
    optionalRead('the Our Standards example dish', () => client.getDishBySlug(exampleDishSlug), null),
    returnSlug
      ? optionalRead('the dish behind "Back to dish"', () => client.getDishBySlug(returnSlug), null)
      : Promise.resolve(null),
  ]);

  return { exampleDish, returnDish };
}

export interface MenuPageData {
  dishes: Dish[];
  /** Matches across the whole catalogue, not just this page. */
  totalCount: number;
  facetGroups: MappedFacetGroup[];
  /** The filters APPLIED: the request's, less anything the facets read did not advertise. */
  filters: Record<string, string[]>;
  /** The order applied — Recommended unless the source can apply the one asked for. */
  sort: MenuSortKey;
  /** The orders this source can apply; the Sort control offers only these. */
  sorts: readonly MenuSortKey[];
  /** The earliest-delivery promise, or null — then the page states no date. */
  delivery: DeliveryWindow | null;
}

/**
 * Resolves everything the /menu page renders.
 *
 * Filtering and sorting happen at the source: the browse endpoint pages its
 * results, so the only correct place to apply facets and order is the query.
 *
 * The facets read comes FIRST, because the browse may only be asked for what
 * it advertised: Aonik answers an unknown facet key or value with a 400, so a
 * stale or pasted URL would otherwise take the whole menu down. The facets and
 * the delivery date are optional to the page — without them it lists its
 * dishes with no filters and no date, never a guess. The browse is not: a
 * menu that cannot read its dishes is a real fault, for the error boundary.
 */
export async function getMenuPageData(options: {
  filters: Record<string, string[]>;
  query: string;
  limit: number;
  sort?: string | string[];
}): Promise<MenuPageData> {
  const client = await getAonikClient();

  const delivery = optionalRead('the delivery window', () => client.getDeliveryWindow(), null);
  const facetGroups = await optionalRead('the menu filters', () => client.getFacetGroups(), []);
  const filters = sanitiseFilters(options.filters, facetGroups);
  const sort = parseMenuSort(options.sort, client.menuSorts);

  const page = await client.listProducts({
    facets: filters,
    search: options.query || undefined,
    page: 1,
    pageSize: options.limit,
    order: sort === 'recommended' ? undefined : sort,
  });

  return {
    dishes: page.dishes,
    totalCount: page.totalCount,
    facetGroups,
    filters,
    sort,
    sorts: client.menuSorts,
    delivery: await delivery,
  };
}

/**
 * Resolves everything the /how-it-works page renders in one concurrent pass.
 *
 * Both pieces are optional to the page and degrade independently — an Aonik
 * failure costs the picker its sizes and prices, or the page its example card,
 * never the whole page (see `lib/how-it-works/pageData.ts`):
 *
 * - `boxPlan` is the tenant's size plan from the storefront config: the size
 *   picker's presets, prices and authored savings. Undefined when the tenant
 *   has not set one or the config cannot be read; the picker then degrades to
 *   a plain link to Choose Box.
 * - `exampleDish` is the editorially chosen dish (`exampleSlug`) for the
 *   "Example dish" card and the hero photograph. If that slug 404s, the first
 *   featured dish that resolves through its own DETAIL read is used (a browse
 *   summary never is — it omits figures the dish does publish); null, and no
 *   card, when none does or Aonik errors.
 */
export async function getHowItWorksPageData(exampleSlug: string): Promise<{
  boxPlan: StorefrontConfig['box'];
  exampleDish: Dish | null;
}> {
  const client = await getAonikClient();

  const [boxPlan, exampleDish] = await Promise.all([
    resolveBoxPlan(client),
    resolveExampleDish(client, {
      slug: exampleSlug,
      featuredCollection: FEATURED_COLLECTION_SLUG,
    }),
  ]);

  return { boxPlan, exampleDish };
}
