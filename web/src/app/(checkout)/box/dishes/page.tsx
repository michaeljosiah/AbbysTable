import type { Metadata } from 'next';
import { DishPicker } from '@/components/checkout/DishPicker';
import { getAonikClient, getMenuPageData } from '@/lib/aonik/client';
import { upcomingDeliveryDate } from '@/lib/delivery/checker';
import { formatDeliveryDate } from '@/lib/format';
import { filtersFromParams } from '@/lib/menu/facets';

export const metadata: Metadata = { title: "Add dishes to your box — Abby's Table", description: 'Choose your dishes with Light Table or Full Table portions.' };
export default async function BoxDishesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const limit = Math.min(120, Math.max(6, Number(params.limit) || 6));
  const client = await getAonikClient();
  const [menu, catalogue, pricing, heating, extras, delivery] = await Promise.all([
    getMenuPageData({ filters: filtersFromParams(params), query, limit, sort: params.sort }),
    client.getDishes(), client.getBoxPricing(), client.getHeatingInstructions(), client.getExtras(), client.getDeliveryWindow(),
  ]);
  const optionGroupsBySlug = Object.fromEntries(await Promise.all(catalogue.map(async (dish) => [dish.slug, await client.getDishOptionGroups(dish.slug).catch(() => [])])));
  return <DishPicker earliestDeliveryLabel={formatDeliveryDate(upcomingDeliveryDate(delivery?.earliestDeliveryDate))} dishes={menu.dishes} catalogue={catalogue} extras={extras} pricing={pricing} heating={heating} optionGroupsBySlug={optionGroupsBySlug} browse={{ totalCount: menu.totalCount, facetGroups: menu.facetGroups, filters: menu.filters, sort: menu.sort, sorts: menu.sorts, query, limit }} />;
}
