/**
 * Dumps the design-template fixtures as the single JSON input every seeder reads.
 *
 * One file, not two. `seed.mjs` used to be fed a hand-prepared `seed-data.json`
 * that nothing in the repo produced, so a fresh clone could run the documented
 * commands and still not rebuild the catalog. The transform that produced it
 * lives here now, in TypeScript, where it is checked against the fixture types.
 *
 * Each dish therefore carries BOTH shapes: the raw fixture fields the content
 * seeders read (`slug`, `nutrition`, `ingredients`, `allergens`) and the derived
 * fields the product seeder needs (`name`, `attributes`, `unitSurcharge`).
 */
import {
  DISH_FIXTURES,
  BOX_PRICING_FIXTURE,
  HEATING_FIXTURE,
  PERSONALISATION_FIXTURE,
} from '@/lib/aonik/fixtures';
import { EXTRA_FIXTURES } from '@/lib/aonik/extras';
import { HEAT_STEPS } from '@/lib/aonik/types';

/**
 * The flat `attributesJson` a browse row is filtered and rendered from.
 *
 * Keys are read back by `readAttributes` in `map.ts` and referenced by facet
 * `sourcePath`s in `seed.mjs` — the two must agree, so change them together.
 *
 * The macros are here because Aonik's product summary DTO carries no nutrition
 * at all: a browse row can only show a figure that was published as an
 * attribute. Omitting fibre is what made every card read "Fibre 0g" over dishes
 * with 9g, and omitting carbs and fat left Step 2's personaliser showing two of
 * the template's four "Nutritional highlights" cells.
 */
const attributesOf = (dish: (typeof DISH_FIXTURES)[number]) => ({
  heatStep: HEAT_STEPS[dish.heat],
  protein: dish.proteinType,
  meal: dish.mealType,
  wellness: dish.wellness,
  dietary: dish.dietary,
  kcal: dish.nutrition.calories,
  proteinGrams: dish.nutrition.proteinGrams,
  fibreGrams: dish.nutrition.fibreGrams,
  carbsGrams: dish.nutrition.carbsGrams,
  fatGrams: dish.nutrition.fatGrams,
});

console.log(
  JSON.stringify(
    {
      dishes: DISH_FIXTURES.map((dish) => ({
        ...dish,
        name: dish.title,
        attributes: attributesOf(dish),
        // Admin money is decimal major units; the fixtures store pence.
        unitSurcharge: dish.upgradePence === undefined ? null : dish.upgradePence / 100,
      })),
      extras: EXTRA_FIXTURES,
      box: BOX_PRICING_FIXTURE,
      heating: HEATING_FIXTURE,
      personalisation: PERSONALISATION_FIXTURE,
    },
    null,
    2,
  ),
);
