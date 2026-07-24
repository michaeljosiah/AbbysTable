/** Dumps the design-template fixtures as JSON so the Aonik seed can use them. */
import { DISH_FIXTURES, BOX_PRICING_FIXTURE, HEATING_FIXTURES, PERSONALISATION_FIXTURE } from '@/lib/aonik/fixtures';
import { EXTRA_FIXTURES } from '@/lib/aonik/extras';

console.log(JSON.stringify({
  dishes: DISH_FIXTURES,
  boxPricing: BOX_PRICING_FIXTURE,
  extras: EXTRA_FIXTURES,
  heating: HEATING_FIXTURES,
  personalisation: PERSONALISATION_FIXTURE,
}, null, 2));
