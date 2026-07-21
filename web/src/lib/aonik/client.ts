/**
 * Aonik client — the single seam between the storefront and commerce data.
 *
 * Components never import fixtures or call `fetch` directly; they receive data
 * resolved through this interface in a Server Component. When Aonik is ready,
 * set AONIK_API_URL and the HTTP implementation takes over with no component
 * changes.
 *
 * SERVER-ONLY: the credential is read from a non-`NEXT_PUBLIC_` variable, so it
 * cannot be bundled into client JavaScript. Keep calls to `getAonikClient()` in
 * Server Components or Route Handlers.
 */

import { BOX_FIXTURES, DELIVERY_FIXTURE, DISH_FIXTURES } from './fixtures';
import type { BoxOffer, DeliveryWindow, Dish, HomepageData } from './types';

export interface AonikClient {
  /** The full catalogue, as shown on /menu. */
  getDishes(): Promise<Dish[]>;
  /** The curated subset the homepage rail shows. */
  getFeaturedDishes(): Promise<Dish[]>;
  getBoxOffers(): Promise<BoxOffer[]>;
  getDeliveryWindow(): Promise<DeliveryWindow>;
}

/** Serves the design-template fixtures. Used until Aonik is reachable. */
export class MockAonikClient implements AonikClient {
  async getDishes(): Promise<Dish[]> {
    return DISH_FIXTURES;
  }

  async getFeaturedDishes(): Promise<Dish[]> {
    return DISH_FIXTURES.filter((dish) => dish.isFeatured);
  }

  async getBoxOffers(): Promise<BoxOffer[]> {
    return BOX_FIXTURES;
  }

  async getDeliveryWindow(): Promise<DeliveryWindow> {
    return DELIVERY_FIXTURE;
  }
}

export interface HttpAonikClientOptions {
  baseUrl: string;
  apiKey?: string;
  /** Seconds to cache each response; 0 disables caching. */
  revalidateSeconds?: number;
}

/**
 * Talks to the real Aonik admin API.
 *
 * Endpoint paths are a first guess and should be reconciled with Aonik's actual
 * routes once published — that reconciliation is confined to this class.
 */
export class HttpAonikClient implements AonikClient {
  constructor(private readonly options: HttpAonikClientOptions) {}

  private async get<T>(path: string): Promise<T> {
    const { baseUrl, apiKey, revalidateSeconds = 300 } = this.options;
    const response = await fetch(new URL(path, baseUrl), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
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

  getBoxOffers(): Promise<BoxOffer[]> {
    return this.get<BoxOffer[]>('/boxes');
  }

  getDeliveryWindow(): Promise<DeliveryWindow> {
    return this.get<DeliveryWindow>('/delivery-window');
  }
}

/**
 * Resolves the client for the current environment: HTTP when AONIK_API_URL is
 * configured, fixtures otherwise. This is the only place that decides.
 */
export function getAonikClient(): AonikClient {
  const baseUrl = process.env.AONIK_API_URL;

  if (!baseUrl) {
    return new MockAonikClient();
  }

  return new HttpAonikClient({
    baseUrl,
    apiKey: process.env.AONIK_API_KEY,
  });
}

/** Resolves everything the homepage renders in one concurrent pass. */
export async function getHomepageData(): Promise<HomepageData> {
  const client = getAonikClient();

  const [dishes, boxes, delivery] = await Promise.all([
    client.getFeaturedDishes(),
    client.getBoxOffers(),
    client.getDeliveryWindow(),
  ]);

  return { dishes, boxes, delivery };
}

/** Resolves everything the /menu page renders in one concurrent pass. */
export async function getMenuPageData(): Promise<{
  dishes: Dish[];
  delivery: DeliveryWindow;
}> {
  const client = getAonikClient();

  const [dishes, delivery] = await Promise.all([
    client.getDishes(),
    client.getDeliveryWindow(),
  ]);

  return { dishes, delivery };
}
