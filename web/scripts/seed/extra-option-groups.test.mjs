import assert from 'node:assert/strict';
import test from 'node:test';

import { extraOptionGroupSeeds } from './extra-option-groups.mjs';

test('extra groups are namespaced and preserve authored attachment and admin values', () => {
  const seeds = extraOptionGroupSeeds([
    {
      id: 'extra-first',
      name: 'First Extra',
      optionGroups: [
        {
          key: 'size',
          label: 'Choose size',
          helpText: 'One size',
          selectionMode: 'One',
          defaultChoiceKey: 'reg',
          choices: [
            { key: 'reg', label: 'Regular', detail: 'Serves one', pricePence: 0 },
            { key: 'lg', label: 'Large', detail: 'Serves two', pricePence: 150 },
          ],
        },
      ],
    },
    {
      id: 'extra-second',
      name: 'Second & Extra',
      optionGroups: [
        {
          key: 'size',
          label: 'Size',
          selectionMode: 'Multi',
          defaultChoiceKey: 'lg',
          choices: [{ key: 'lg', label: 'Large', pricePence: 275 }],
        },
        {
          key: 'heat',
          label: 'Heat',
          selectionMode: 'One',
          defaultChoiceKey: 'hot',
          choices: [{ key: 'hot', label: 'Hot', detail: 'Fiery', pricePence: 0 }],
        },
      ],
    },
  ]);

  assert.deepEqual(
    seeds.map(({ productSlug, group, attachment }) => ({ productSlug, group, attachment })),
    [
      {
        productSlug: 'first-extra',
        group: {
          key: 'extra-first-size',
          label: 'Choose size',
          helpText: 'One size',
          selectionMode: 'One',
          defaultChoiceKey: 'reg',
          sortOrder: 0,
          choices: [
            { key: 'reg', label: 'Regular', note: 'Serves one', price: 0, sortOrder: 0 },
            { key: 'lg', label: 'Large', note: 'Serves two', price: 1.5, sortOrder: 1 },
          ],
        },
        attachment: {
          groupKey: 'extra-first-size',
          allowedChoiceKeys: ['reg', 'lg'],
          defaultChoiceKey: 'reg',
          selectionModeOverride: null,
          sortOrder: 0,
        },
      },
      {
        productSlug: 'second-extra',
        group: {
          key: 'extra-second-size',
          label: 'Size',
          helpText: null,
          selectionMode: 'Multi',
          defaultChoiceKey: 'lg',
          sortOrder: 0,
          choices: [{ key: 'lg', label: 'Large', note: null, price: 2.75, sortOrder: 0 }],
        },
        attachment: {
          groupKey: 'extra-second-size',
          allowedChoiceKeys: ['lg'],
          defaultChoiceKey: 'lg',
          selectionModeOverride: null,
          sortOrder: 0,
        },
      },
      {
        productSlug: 'second-extra',
        group: {
          key: 'extra-second-heat',
          label: 'Heat',
          helpText: null,
          selectionMode: 'One',
          defaultChoiceKey: 'hot',
          sortOrder: 1,
          choices: [{ key: 'hot', label: 'Hot', note: 'Fiery', price: 0, sortOrder: 0 }],
        },
        attachment: {
          groupKey: 'extra-second-heat',
          allowedChoiceKeys: ['hot'],
          defaultChoiceKey: 'hot',
          selectionModeOverride: null,
          sortOrder: 1,
        },
      },
    ],
  );
});
