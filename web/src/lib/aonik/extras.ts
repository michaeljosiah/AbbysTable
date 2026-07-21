/**
 * Extras catalogue, from the Step 3 template. Every item there publishes full
 * nutrition, ingredients and allergens, so they are populated here — the
 * "never inferred" rule still holds: this is transcription, not invention.
 * Images cycle through the three dish assets exactly as the template does.
 */

import type { Extra } from './types';

const EXTRA_IMAGES = [
  '/assets/dish-goat-efo.png',
  '/assets/dish-fish-peppersoup.png',
  '/assets/dish-lamb-shank.png',
];

const extraImage = (index: number) => EXTRA_IMAGES[index % EXTRA_IMAGES.length];

export const EXTRA_FIXTURES: Extra[] = [
  {
    id: 'extra-puffpuff',
    name: 'Puff Puff',
    category: 'Small chops',
    pricePence: 450,
    description:
      'Golden, pillowy balls of lightly sweetened fried dough with crisp, caramelised edges — a party classic.',
    longDescription:
      'Soft, pillowy balls of lightly sweetened fried dough with golden, crisp edges — a Nigerian party classic, best warm.',
    imageUrl: extraImage(0),
    option: {
      kind: 'Size',
      choices: [
        { key: '6', label: '6 pieces', addPence: 0 },
        { key: '12', label: '12 pieces', addPence: 350 },
      ],
    },
    nutrition: {
      calories: 210,
      proteinGrams: 4,
      carbsGrams: 30,
      fatGrams: 8,
      fibreGrams: 1,
      sugarsGrams: 9,
      saltGrams: 0.3,
    },
    ingredients: 'Plain flour, yeast, cane sugar, nutmeg, sunflower oil, water.',
    allergens: ['Gluten (wheat)'],
    serveStyle: 'hot',
    heating: 'Best enjoyed as is. To warm, place in a low oven (150°C) for 3–4 minutes.',
  },
  {
    id: 'extra-springrolls',
    name: 'Suya Spring Rolls',
    category: 'Small chops',
    pricePence: 500,
    description:
      'Crisp, golden spring rolls filled with our yaji-spiced suya beef and vegetables, with a peppery dipping sauce.',
    longDescription:
      'Crisp, golden spring rolls filled with our yaji-spiced suya beef and vegetables — six to a portion, with a peppery dip.',
    imageUrl: extraImage(1),
    nutrition: {
      calories: 240,
      proteinGrams: 11,
      carbsGrams: 22,
      fatGrams: 12,
      fibreGrams: 2,
      sugarsGrams: 3,
      saltGrams: 0.8,
    },
    ingredients:
      'Wheat pastry, suya-spiced beef, cabbage, carrot, onion, yaji spice, sunflower oil.',
    allergens: ['Gluten (wheat)', 'Peanuts (yaji)', 'Soya'],
    serveStyle: 'hot',
    heating:
      'Oven 180°C for 8–10 min until crisp, or air-fry 6 min. Do not microwave — pastry softens.',
  },
  {
    id: 'extra-scotchegg',
    name: 'Nigerian Scotch Eggs',
    category: 'Small chops',
    pricePence: 550,
    description:
      'A soft-centred egg wrapped in well-seasoned sausage meat, crumbed and fried until deeply golden — two per portion.',
    longDescription:
      'A soft-centred egg wrapped in well-seasoned sausage meat, crumbed and fried until golden — two per portion.',
    imageUrl: extraImage(2),
    nutrition: {
      calories: 280,
      proteinGrams: 15,
      carbsGrams: 14,
      fatGrams: 18,
      fibreGrams: 1,
      sugarsGrams: 2,
      saltGrams: 1.1,
    },
    ingredients: 'Egg, seasoned pork & beef sausage, breadcrumb, herbs, sunflower oil.',
    allergens: ['Egg', 'Gluten (wheat)'],
    serveStyle: 'hot',
    heating: 'Oven 170°C for 10 min until hot through. Halve before serving with pepper sauce.',
  },
  {
    id: 'extra-plantain',
    name: 'Fried Plantain',
    category: 'Sides',
    pricePence: 350,
    description:
      'Ripe plantain fried in a whisper of oil until the edges caramelise — soft, sweet and golden, served warm.',
    longDescription:
      'Ripe plantain fried in a whisper of oil until the edges caramelise — soft, sweet and golden. A table favourite.',
    imageUrl: extraImage(3),
    option: {
      kind: 'Size',
      choices: [
        { key: 'reg', label: 'Regular', addPence: 0 },
        { key: 'lg', label: 'Large', addPence: 150 },
      ],
    },
    nutrition: {
      calories: 180,
      proteinGrams: 2,
      carbsGrams: 34,
      fatGrams: 5,
      fibreGrams: 3,
      sugarsGrams: 16,
      saltGrams: 0.2,
    },
    ingredients: 'Ripe plantain, sunflower oil, pinch of salt.',
    allergens: [],
    serveStyle: 'hot',
    heating: 'Warm in a low oven (150°C) 4–5 min, or a dry pan over low heat. Serve warm.',
  },
  {
    id: 'extra-moimoi',
    name: 'Moi Moi',
    category: 'Sides',
    pricePence: 400,
    description:
      'Blended black-eyed beans steamed with pepper and onion into a soft, gently spiced savoury pudding.',
    longDescription:
      'Blended black-eyed beans steamed with pepper and onion into a soft, savoury pudding — gently spiced.',
    imageUrl: extraImage(4),
    nutrition: {
      calories: 190,
      proteinGrams: 11,
      carbsGrams: 18,
      fatGrams: 8,
      fibreGrams: 5,
      sugarsGrams: 3,
      saltGrams: 0.7,
    },
    ingredients: 'Black-eyed beans, red pepper, onion, sunflower oil, seasoning.',
    allergens: [],
    serveStyle: 'hot',
    heating: 'Steam or microwave 2–3 min until piping hot throughout.',
  },
  {
    id: 'extra-jollofcup',
    name: 'Jollof Rice Cup',
    category: 'Sides',
    pricePence: 450,
    description:
      'A generous cup of our signature smoky party jollof — long-grain rice cooked low in a fried pepper base.',
    longDescription:
      'A generous cup of our signature smoky party jollof — long-grain rice cooked low in a fried pepper and tomato base.',
    imageUrl: extraImage(5),
    nutrition: {
      calories: 320,
      proteinGrams: 7,
      carbsGrams: 52,
      fatGrams: 9,
      fibreGrams: 3,
      sugarsGrams: 6,
      saltGrams: 1.0,
    },
    ingredients: 'Long-grain rice, tomato, red pepper, onion, sunflower oil, native spices.',
    allergens: [],
    serveStyle: 'hot',
    heating:
      'Microwave 2–3 min, stirring halfway, until piping hot. Add a splash of water if needed.',
  },
  {
    id: 'extra-chinchin',
    name: 'Chin Chin',
    category: 'Snacks',
    pricePence: 400,
    description:
      'Lightly sweet, crunchy fried pastry cut into little cubes — our nostalgic snack, made with date sugar.',
    longDescription:
      'Lightly sweet, crunchy fried pastry cut into little cubes — our nostalgic snack, made with date sugar.',
    imageUrl: extraImage(6),
    option: {
      kind: 'Size',
      choices: [
        { key: 'reg', label: 'Regular', addPence: 0 },
        { key: 'share', label: 'Sharing bag', addPence: 200 },
      ],
    },
    nutrition: {
      calories: 230,
      proteinGrams: 4,
      carbsGrams: 33,
      fatGrams: 9,
      fibreGrams: 1,
      sugarsGrams: 11,
      saltGrams: 0.2,
    },
    ingredients: 'Plain flour, butter, egg, date sugar, nutmeg, sunflower oil.',
    allergens: ['Gluten (wheat)', 'Egg', 'Milk'],
    serveStyle: 'ambient',
    heating: 'Ready to eat. Store in an airtight container to keep crunchy.',
  },
  {
    id: 'extra-meatpie',
    name: 'Nigerian Meat Pie',
    category: 'Snacks',
    pricePence: 450,
    description:
      'Buttery, flaky shortcrust filled with spiced minced beef, potato and carrot — a proper Nigerian bakery pie.',
    longDescription:
      'Buttery, flaky shortcrust filled with spiced minced beef, potato and carrot — a proper Nigerian bakery meat pie.',
    imageUrl: extraImage(7),
    nutrition: {
      calories: 330,
      proteinGrams: 10,
      carbsGrams: 34,
      fatGrams: 17,
      fibreGrams: 2,
      sugarsGrams: 3,
      saltGrams: 0.9,
    },
    ingredients: 'Shortcrust pastry, minced beef, potato, carrot, onion, seasoning.',
    allergens: ['Gluten (wheat)', 'Milk'],
    serveStyle: 'hot',
    heating: 'Oven 180°C for 10–12 min until hot through. Best not microwaved.',
  },
  {
    id: 'extra-zobo',
    name: 'Zobo Cooler',
    category: 'Drinks',
    pricePence: 300,
    description:
      'Deep-red hibiscus steeped with ginger and a hint of pineapple, chilled and lightly sweetened — tart and refreshing.',
    longDescription:
      'Deep-red hibiscus steeped with ginger and a hint of pineapple, chilled and lightly sweetened — refreshing and tart.',
    imageUrl: extraImage(8),
    option: {
      kind: 'Size',
      choices: [
        { key: 'reg', label: 'Regular', addPence: 0 },
        { key: 'lg', label: 'Large', addPence: 100 },
      ],
    },
    nutrition: {
      calories: 70,
      proteinGrams: 0,
      carbsGrams: 17,
      fatGrams: 0,
      fibreGrams: 0,
      sugarsGrams: 16,
      saltGrams: 0,
    },
    ingredients: 'Hibiscus, ginger, pineapple, cane sugar, water.',
    allergens: [],
    serveStyle: 'chilled',
    heating: 'Serve chilled over ice. Shake well before pouring.',
  },
  {
    id: 'extra-chapman',
    name: 'Chapman',
    category: 'Drinks',
    pricePence: 350,
    description:
      'The Nigerian classic — a fruity punch of citrus, grenadine and a dash of bitters over ice, with cucumber.',
    longDescription:
      'The Nigerian classic — a fruity punch of citrus, grenadine and a dash of bitters over ice, garnished with cucumber.',
    imageUrl: extraImage(9),
    nutrition: {
      calories: 110,
      proteinGrams: 0,
      carbsGrams: 27,
      fatGrams: 0,
      fibreGrams: 0,
      sugarsGrams: 25,
      saltGrams: 0.1,
    },
    ingredients: 'Citrus, grenadine, aromatic bitters, soda, cucumber.',
    allergens: [],
    serveStyle: 'chilled',
    heating: 'Serve chilled over ice, garnished with cucumber.',
  },
  {
    id: 'extra-ginger',
    name: 'Ginger & Pineapple Juice',
    category: 'Drinks',
    pricePence: 350,
    description:
      'Freshly pressed ginger and pineapple — warming, bright and naturally sweet, with a gentle, cleansing kick.',
    longDescription:
      'Freshly pressed ginger and pineapple — warming, bright and naturally sweet, with a gentle kick.',
    imageUrl: extraImage(10),
    nutrition: {
      calories: 90,
      proteinGrams: 1,
      carbsGrams: 21,
      fatGrams: 0,
      fibreGrams: 1,
      sugarsGrams: 18,
      saltGrams: 0,
    },
    ingredients: 'Pressed pineapple, fresh ginger, water.',
    allergens: [],
    serveStyle: 'chilled',
    heating: 'Serve chilled. Shake well before pouring.',
  },
  {
    id: 'extra-peppersauce',
    name: 'Native Pepper Sauce',
    category: 'Sauces',
    pricePence: 250,
    description:
      'Our fiery blend of scotch bonnet, red pepper and native spices fried low in oil — a little goes a long way.',
    longDescription:
      'Our fiery blend of scotch bonnet, red pepper and native spices fried low in oil — a little goes a long way.',
    imageUrl: extraImage(11),
    option: {
      kind: 'Heat',
      choices: [
        { key: 'mild', label: 'Mild', addPence: 0 },
        { key: 'med', label: 'Medium', addPence: 0 },
        { key: 'hot', label: 'Hot', addPence: 0 },
      ],
    },
    nutrition: {
      calories: 60,
      proteinGrams: 1,
      carbsGrams: 4,
      fatGrams: 5,
      fibreGrams: 1,
      sugarsGrams: 2,
      saltGrams: 0.6,
    },
    ingredients: 'Scotch bonnet, red pepper, onion, sunflower oil, native spices, salt.',
    allergens: [],
    serveStyle: 'ambient',
    heating: 'Ready to serve. Keep refrigerated; use within 5 days of opening.',
  },
  {
    id: 'extra-atadindin',
    name: 'Ata Dindin Sauce',
    category: 'Sauces',
    pricePence: 300,
    description:
      "The smoky, peppery fried-pepper sauce at the heart of Abby's cooking, rich with tomatoes and native spices.",
    longDescription:
      "The smoky, peppery fried-pepper sauce at the heart of Abby's cooking — rich with tomatoes, red peppers and native spices.",
    imageUrl: extraImage(12),
    option: {
      kind: 'Heat',
      choices: [
        { key: 'mild', label: 'Mild', addPence: 0 },
        { key: 'med', label: 'Medium', addPence: 0 },
        { key: 'hot', label: 'Hot', addPence: 0 },
      ],
    },
    nutrition: {
      calories: 80,
      proteinGrams: 1,
      carbsGrams: 6,
      fatGrams: 6,
      fibreGrams: 1,
      sugarsGrams: 3,
      saltGrams: 0.5,
    },
    ingredients: 'Tomato, red pepper, scotch bonnet, onion, sunflower oil, native spices.',
    allergens: [],
    serveStyle: 'ambient',
    heating: 'Warm gently in a pan, or serve at room temperature. Keep refrigerated.',
  },
];
