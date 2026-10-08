/**
 * Delivery & FAQs copy — verbatim from design/Abby's Table - Delivery and
 * FAQs.dc.html, as structured data so one source feeds the browse groups, the
 * search index and the search results (#23).
 *
 * EVERY ANSWER IS A WORKING DRAFT awaiting sign-off (#38): payment methods,
 * gifting mechanics, storage claims and the Private Table answers all need
 * operational or legal confirmation (design/build-handoff.md, open items). Do
 * not reword, extend or "tidy" them here — copy changes when the design does.
 *
 * Nothing here is commerce data. The box minimum, the six-dish price and the
 * delivery charge are `{ value }` slots filled from Aonik at render time
 * (frontend-backend-contract §2, §3d), and Private Table's starting price from
 * its one content constant — never literals in this file. A question whose
 * figure cannot be resolved is left out rather than printed with a gap or a
 * guess (`resolveFaqGroups`).
 *
 * Hyphens are ordinary: approved compounds are held together at render time
 * (`KeepCompounds`); `{ keep }` marks the one the design itself holds.
 *
 * Known copy questions, recorded rather than fixed (build-handoff open items):
 * "Can I freeze my meals?" is asked under both Your food and Storage &
 * reheating (search keeps the first), and the 5-day fridge guidance appears
 * twice in different words; "Orders & changes" predates the 7-day contact rule
 * (SHOPPING-STATE §49).
 */

import { formatCountInWords, formatPrice } from '@/lib/format';

import { PRIVATE_TABLE_FROM_PENCE } from './marketing';
import { PRIVATE_TABLE_ITEM } from './navigation';

/* ---- The content model ------------------------------------------------------ */

/** A figure that comes from data, not copy. */
export type FaqValueKey =
  /** "6 dishes" — the box plan's minimum. */
  | 'minimumDishes'
  /** "Six-dish" — the same minimum, as a compound. */
  | 'minimumBox'
  /** "£158" — the price of a box at that minimum. */
  | 'startPrice'
  /** "£5.95" — the configured delivery charge per order (contract §3d). */
  | 'deliveryCharge'
  /** "£1,500" — Private Table's starting price. */
  | 'privateTablePrice';

export type FaqValues = Partial<Record<FaqValueKey, string>>;

export type FaqInline =
  | string
  | { strong: FaqInline[] }
  | { value: FaqValueKey }
  | { link: string; text: string }
  /** A compound held on one line, as the design's `white-space: nowrap`. */
  | { keep: string };

export type FaqBlock =
  | { p: FaqInline[] }
  | { list: FaqInline[][] }
  /** Steps joined by decorative arrows: Private Table's "typical journey". */
  | { journey: string[] };

export interface FaqQuestion {
  question: FaqInline[];
  answer: FaqBlock[];
}

export const FAQ_GROUP_IDS = [
  'delivery',
  'food',
  'orders',
  'storage',
  'payment',
  'gifting',
  'private',
  'about',
] as const;

export type FaqGroupId = (typeof FAQ_GROUP_IDS)[number];

export interface FaqGroup {
  id: FaqGroupId;
  title: string;
  questions: FaqQuestion[];
}

/* ---- Shorthand -------------------------------------------------------------- */

const p = (...inline: FaqInline[]): FaqBlock => ({ p: inline });
const b = (...inline: FaqInline[]): FaqInline => ({ strong: inline });
const v = (value: FaqValueKey): FaqInline => ({ value });
const q = (question: string | FaqInline[], ...answer: FaqBlock[]): FaqQuestion => ({
  question: typeof question === 'string' ? [question] : question,
  answer,
});

/* ---- The eight groups, in the design's order ------------------------------- */

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'delivery',
    title: 'Delivery',
    questions: [
      q(
        'Where do you deliver?',
        p(
          'We deliver across supported mainland UK postcodes. Enter your postcode above to check whether we currently deliver to your area and see your earliest available delivery date.',
        ),
      ),
      q(
        'When will my order arrive?',
        p(
          'Available delivery dates are shown after you enter your postcode and again when you order. We take a limited number of orders for each cooking run, so we can give every dish the care it deserves. The delivery date shown reflects our next available cooking run.',
        ),
      ),
      q(
        'How will my food arrive?',
        p(
          'Your meals are freshly prepared, chilled and packed in insulated packaging designed to keep them at the right temperature during delivery.',
        ),
      ),
      q(
        'Do I need to be home for my delivery?',
        p(
          'Not necessarily. Where the delivery service allows it, you’ll be able to leave suitable delivery instructions. We recommend bringing your meals inside and refrigerating them as soon as possible after delivery.',
        ),
      ),
      q(
        'Can I choose my delivery date?',
        p(
          'Yes. Once we know your delivery postcode, you’ll be able to choose from the available delivery dates for your area.',
        ),
      ),
      q(
        'What happens if my delivery is delayed?',
        p(
          'Occasionally circumstances outside our control can affect a delivery. If we become aware of a significant delay, we’ll keep you informed using the contact details on your order. If you have any concerns about your food when it arrives, please contact us before eating it.',
        ),
      ),
      q(
        'How much is delivery?',
        p(
          'Delivery is ',
          b(v('deliveryCharge'), ' per order'),
          '. The delivery charge will be shown clearly before you complete your order.',
        ),
      ),
    ],
  },
  {
    id: 'food',
    title: 'Your food',
    questions: [
      q(
        'How long will my dishes keep?',
        p(
          'Most dishes are designed to be enjoyed within 5 days of delivery. Always follow the storage and use-by information supplied with your individual dish.',
        ),
      ),
      q(
        'Can I freeze my meals?',
        p(
          'Some dishes can be frozen and some are best enjoyed fresh. Each dish will clearly tell you whether it is suitable for freezing. Freeze suitable dishes on arrival and follow the storage guidance provided.',
        ),
      ),
      q(
        'Do the meals arrive ready to eat?',
        p(
          'Your meals arrive fully prepared and chilled, ready for you to heat and enjoy at home. Heating instructions are provided for each dish.',
        ),
      ),
      q(
        'Where can I find ingredients and allergen information?',
        p(
          'Ingredients and allergen information is available on each individual dish page before you order and is also provided with your food when it arrives.',
        ),
      ),
      q(
        'Do you provide nutritional information?',
        p(
          'Yes. Full nutritional information is provided for our dishes so you can make informed choices about what you eat. You’ll find it on the individual dish page.',
        ),
      ),
      q(
        'Are your meals freshly cooked or frozen?',
        p(
          'Our meals are freshly cooked in small batches and delivered chilled. They are not sent to you frozen. Dishes that are suitable for home freezing will be clearly marked.',
        ),
      ),
    ],
  },
  {
    id: 'orders',
    title: 'Orders & changes',
    questions: [
      q(
        'Is there a minimum order?',
        p(
          'Yes. Abby’s Table orders start from a minimum of ',
          b(v('minimumDishes')),
          '. ',
          v('minimumBox'),
          ' boxes currently start from ',
          b(v('startPrice')),
          ', with the final price depending on the dishes and portions you choose.',
        ),
      ),
      q(
        'Can I change my order after placing it?',
        p(
          'Please contact us as soon as possible if you need to make a change. Because we take a limited number of orders for each cooking run, we may not be able to alter an order once preparation has begun.',
        ),
      ),
      q(
        'Can I change my delivery date after ordering?',
        p(
          'Contact us as soon as possible and we’ll let you know whether your delivery date can still be changed. Once your order has entered preparation or dispatch, changes may no longer be possible.',
        ),
      ),
      q(
        'What if there is a problem with one of my dishes?',
        p(
          'Please contact us with your order details and tell us what went wrong. If relevant, we may ask for a photograph so we can understand the issue and resolve it appropriately.',
        ),
      ),
      q(
        'Can I order for someone else?',
        p(
          'Yes. You can order an Abby’s Table box for someone else by entering their delivery details when you place the order.',
        ),
      ),
      q(
        'Can I order as a one-off, or do I need a subscription?',
        p(
          'Abby’s Table will launch with ',
          b('one-off ordering only'),
          '. No subscription is required. A subscription option may be introduced later, but it is not part of the launch journey.',
        ),
      ),
    ],
  },
  {
    id: 'storage',
    title: 'Storage & reheating',
    questions: [
      q(
        'How should I store my meals when they arrive?',
        p('Refrigerate your meals as soon as they arrive.'),
        p(
          'If a dish is suitable for freezing and you want to keep it for later, freeze it on arrival and follow the storage guidance provided with that dish.',
        ),
      ),
      q(
        'How long will my meals keep in the fridge?',
        p('Most dishes are designed to be enjoyed within ', b('5 days of delivery'), '.'),
        p(
          'Always follow the individual use-by and storage information supplied with your dish, as some meals may have different guidance.',
        ),
      ),
      q(
        'Can I freeze my meals?',
        p('Some dishes can be frozen and some are best enjoyed fresh.'),
        p(
          'Each dish will clearly state whether it is suitable for freezing. Freeze suitable dishes on arrival and follow the storage instructions provided.',
        ),
      ),
      q(
        'How should I reheat my meals?',
        p('Heating instructions are provided for each individual dish.'),
        p(
          'Follow the method and timings shown with your meal, as reheating instructions can vary depending on the dish and portion.',
        ),
        p('Heat food thoroughly before eating.'),
      ),
      q(
        'Are reheating instructions provided with every dish?',
        p(
          'Yes. Each dish comes with its own reheating guidance so you know the recommended way to heat and enjoy it.',
        ),
        p('The same information is also available with the dish details where applicable.'),
      ),
    ],
  },
  {
    id: 'payment',
    title: 'Payment',
    questions: [
      q(
        'What payment methods do you accept?',
        p(
          'We accept secure online payment at checkout using the payment methods made available there, including major debit and credit cards.',
        ),
        p('Any additional payment options enabled at launch will be shown clearly during checkout.'),
      ),
      q(
        'When will I be charged for my order?',
        p('Payment is taken when you place and confirm your order.'),
        p(
          'Because we take a limited number of orders for each cooking run, your order is only secured once payment has been successfully completed.',
        ),
      ),
      q(
        'Is delivery included in the price?',
        p('Delivery is charged separately at ', b(v('deliveryCharge'), ' per order'), '.'),
        p('The delivery charge will be shown clearly before you complete your order.'),
      ),
      q(
        'What happens if my payment is declined?',
        p('If your payment is not successful, your order will not be confirmed.'),
        p(
          'You can check your payment details and try again, or use another available payment method. If you continue to have difficulty, please contact us for help.',
        ),
      ),
      q(
        'How are refunds processed?',
        p(
          'Where a refund is agreed, it will be returned to the original payment method used for the order.',
        ),
        p(
          'The time it takes to appear in your account can vary depending on your bank or payment provider.',
        ),
      ),
    ],
  },
  {
    id: 'gifting',
    title: 'Gifting',
    questions: [
      q(
        'Can I send an Abby’s Table order as a gift?',
        p(
          'Yes. You can send an Abby’s Table box as a gift by placing the order using the recipient’s delivery details.',
        ),
        p('You can choose the dishes and delivery date as part of the order.'),
      ),
      q(
        'Can I send the gift directly to the recipient?',
        p(
          'Yes. Enter the recipient’s delivery address at checkout and we’ll send the order directly to them.',
        ),
        p(
          'Please make sure the delivery details are correct and that the recipient will be able to store the meals appropriately when they arrive.',
        ),
      ),
      q(
        'Can I include a gift message?',
        p(
          'Yes. Where the gifting option is selected, you can add a personal message for the recipient during the order process.',
        ),
        p('The message will be included with the gift without showing your payment details.'),
      ),
      q(
        'Can the recipient choose their own dishes?',
        p(
          'If you would prefer the recipient to choose for themselves, use the gifting option designed for recipient choice rather than selecting the dishes on their behalf.',
        ),
        p('The exact gifting journey will be shown clearly when you order.'),
      ),
      q(
        'Do you offer gift cards?',
        p(
          'Gift cards are intended to be available through the Abby’s Table gifting service so the recipient can choose what they would like to order.',
        ),
      ),
    ],
  },
  {
    id: 'private',
    title: 'Private Table',
    questions: [
      q(
        'What makes Abby’s Private Table different from a standard recipe-planning or meal-planning service?',
        p(
          'Abby’s Private Table is not a recipe pack, meal-plan template or adapted version of a standard menu.',
        ),
        p(
          'Every engagement begins with the individual. Your food preferences, lifestyle, goals, dietary requirements and any relevant professional guidance are considered before your menu is developed.',
        ),
        p(
          'The service is ',
          b(
            'guided by a UK-certified health coach, with oversight from a registered dietitian and, where appropriate, in collaboration with your clinical team',
          ),
          '.',
        ),
        p(
          'The result is a private, highly personalised Nigerian fusion food service created specifically around you.',
        ),
      ),
      q(
        'How bespoke is the service?',
        p('Completely bespoke.'),
        p(
          'Private Table does not begin with a fixed menu that is then adjusted. Your recipes and menus are developed specifically for your requirements, while preserving the flavours, ingredients and style of food you genuinely want to eat.',
        ),
        p(
          'The scope can include your preferences, dislikes, dietary restrictions, lifestyle, health or recovery considerations, performance goals, household requirements and any relevant guidance from your professional team.',
        ),
        p('No two Private Table engagements need to look the same.'),
      ),
      q(
        'Who is involved in creating my Private Table service?',
        p('Private Table brings together food, nutrition and — where relevant — clinical guidance.'),
        p('The service is:'),
        {
          list: [
            [b('Guided by a UK-certified health coach')],
            [b('Overseen by a registered dietitian')],
            [
              b(
                'Able to work in collaboration with your clinical team, where appropriate and with your permission',
              ),
            ],
          ],
        },
        p(
          'This structure allows the food itself to remain personal, enjoyable and rooted in the flavours you love, while relevant professional guidance can be reflected in the service.',
        ),
        p(
          'Private Table is designed to complement professional healthcare, not replace diagnosis, treatment or medical advice.',
        ),
      ),
      q(
        'Can you work directly with my doctor, dietitian or clinical team?',
        p('Yes, where appropriate and with your permission.'),
        p(
          'If your requirements are connected to medical treatment, recovery, a diagnosed condition or another area where your clinical team has provided guidance, Private Table can work from that information when developing your menu.',
        ),
        p(
          'The purpose is not to reinterpret clinical advice, but to translate relevant guidance into food that is practical, personal and enjoyable for you.',
        ),
        p('Any collaboration is agreed as part of the scope of your service.'),
      ),
      q(
        'Is Private Table confidential?',
        p('Yes. Private Table is confidential by nature.'),
        p(
          'We understand that clients may be sharing personal information about their health, lifestyle, family circumstances or professional life in order for us to create an appropriate service.',
        ),
        p(
          'Information is handled discreetly and only used as necessary to deliver the agreed Private Table service.',
        ),
        p(
          'Where additional confidentiality is required, ',
          b('we can sign a non-disclosure agreement (NDA)'),
          ' before detailed information is shared.',
        ),
      ),
      q(
        'What is the difference between the worldwide and UK-wide Private Table services?',
        p(
          b('Worldwide'),
          ' clients can commission a completely bespoke recipe and menu-development service, created around their individual requirements.',
        ),
        p(
          b('UK-wide'),
          ' clients can also choose to have those bespoke recipes prepared as meals by Abby’s Table, subject to the agreed service scope.',
        ),
        p(
          'This means Private Table can support an international client who wants a highly personalised menu to prepare themselves or with their own cook or chef, while UK clients can access the additional convenience of meal preparation.',
        ),
        p('Prepared-meal delivery is currently available within the UK only.'),
      ),
      q(
        'Can Private Table accommodate allergies, intolerances and complex dietary requirements?',
        p('Potentially, yes — but suitability is assessed individually.'),
        p(
          'Allergies, intolerances, dietary restrictions and other requirements are discussed during the consultation so we can understand the level of complexity and determine whether we can accommodate them safely and appropriately.',
        ),
        p(
          'Where relevant, guidance from your registered dietitian or clinical team can also be incorporated into the agreed service.',
        ),
        p(
          'If we do not believe a requirement can be accommodated to the appropriate standard, we will tell you before proceeding.',
        ),
      ),
      q(
        'What does a Private Table engagement actually include?',
        p('The service is defined around your individual brief rather than a fixed package.'),
        p('Depending on what you require, it may include:'),
        {
          list: [
            ['an in-depth consultation'],
            ['bespoke Nigerian fusion recipe development'],
            ['personalised menu development'],
            ['consideration of dietary, lifestyle, health, recovery or performance requirements'],
            ['registered dietitian oversight'],
            ['collaboration with your clinical team where appropriate'],
            ['nutritional information where relevant to the agreed scope'],
            ['UK meal preparation where selected'],
            ['an agreed delivery or implementation plan'],
          ],
        },
        p('Your proposal will set out exactly what is included before the engagement begins.'),
      ),
      q(
        ['Why does Private Table start from ', v('privateTablePrice'), '?'],
        p(
          'Private Table starts from ',
          b(v('privateTablePrice')),
          ' because it is an individually commissioned service rather than a standardised meal-planning product.',
        ),
        p(
          'The fee reflects the depth of consultation, bespoke recipe and menu development, professional oversight and the level of individual consideration required to create a service around one client’s needs.',
        ),
        p(
          'Where the brief requires registered dietitian oversight, collaboration with a clinical team, additional development, multiple household members or UK meal preparation, the final scope and fee will reflect that work.',
        ),
        p(
          'You will receive a clear proposal before proceeding, so the service and price are agreed in advance.',
        ),
      ),
      q(
        'What happens after I enquire?',
        p('Every Private Table engagement begins privately and individually.'),
        p(
          'We first review your enquiry and arrange a consultation to understand what you are looking for, what matters to you and whether Private Table is the right fit.',
        ),
        p(
          'If we proceed, we define the scope of the engagement, including any professional collaboration required, and provide a clear proposal.',
        ),
        p(
          'From there, your bespoke recipes and menu are developed. For UK clients who choose meal preparation, the preparation and delivery plan is then agreed.',
        ),
        p('A typical journey is:'),
        {
          journey: [
            'Private enquiry',
            'Consultation',
            'Bespoke scope & proposal',
            'Menu development',
            'Professional oversight/collaboration where required',
            'Meal preparation where selected',
            'Delivery or implementation',
          ],
        },
      ),
    ],
  },
  {
    id: 'about',
    title: 'About Abby’s Table',
    questions: [
      q(
        'What makes Abby’s Table different?',
        p(
          'Abby’s Table is Nigerian fusion food rooted in traditional flavours, with nutrition considered alongside taste. We cook from scratch using carefully chosen ingredients, without commercial seasoning blends or unnecessary shortcuts, and provide full nutritional information for our dishes.',
        ),
      ),
      q(
        'Do you use Maggi or commercial seasoning blends?',
        p(
          'No. We don’t use Maggi, bouillon cubes or commercial seasoning blends. We build flavour from real ingredients, herbs, spices, aromatics and house-made stocks.',
        ),
      ),
      q(
        'Do you cater for specific health or dietary needs?',
        p(
          'Our main menu provides clear ingredient, allergen and nutritional information to help you choose dishes that suit you. For more individual requirements, ',
          // The chrome's own Private Table destination: its page (#25).
          { link: PRIVATE_TABLE_ITEM.href, text: 'Abby’s Private Table' },
          ' offers bespoke Nigerian fusion menus created around personal health, recovery or performance needs, with ',
          { keep: 'UK-wide' },
          ' meal preparation available as part of the service.',
        ),
      ),
      q(
        'I still have a question. How can I contact you?',
        p(
          'If you can’t find the answer you need here, visit our Contact page and send us a message. We’ll be happy to help.',
        ),
      ),
    ],
  },
];

/* ---- Resolution ------------------------------------------------------------- */

/** A content node with every value filled in: what the page renders. */
export type ResolvedInline =
  | string
  | { strong: ResolvedInline[] }
  | { link: string; text: string }
  | { keep: string };

export type ResolvedBlock =
  | { p: ResolvedInline[] }
  | { list: ResolvedInline[][] }
  | { journey: string[] };

export interface ResolvedFaq {
  /** Stable within a page: the group and the question's authored position. */
  id: string;
  groupId: FaqGroupId;
  /** Plain text — questions carry no markup. */
  question: string;
  answer: ResolvedBlock[];
}

export interface ResolvedFaqGroup {
  id: FaqGroupId;
  title: string;
  /** The in-page anchor, `faq-<id>`, as the design names it. */
  anchor: string;
  questions: ResolvedFaq[];
}

class MissingValue extends Error {}

function resolveInline(node: FaqInline, values: FaqValues): ResolvedInline[] {
  if (typeof node === 'string') return [node];
  if ('value' in node) {
    const value = values[node.value];
    if (!value) throw new MissingValue(node.value);
    return [value];
  }
  if ('strong' in node) return [{ strong: resolveInlines(node.strong, values) }];
  return [node];
}

function resolveInlines(nodes: FaqInline[], values: FaqValues): ResolvedInline[] {
  return mergeText(nodes.flatMap((node) => resolveInline(node, values)));
}

/** Adjacent strings joined, so a filled-in value reads as one run of text. */
function mergeText(nodes: ResolvedInline[]): ResolvedInline[] {
  const out: ResolvedInline[] = [];
  for (const node of nodes) {
    const last = out[out.length - 1];
    if (typeof node === 'string' && typeof last === 'string') out[out.length - 1] = last + node;
    else out.push(node);
  }
  return out;
}

function resolveBlock(block: FaqBlock, values: FaqValues): ResolvedBlock {
  if ('p' in block) return { p: resolveInlines(block.p, values) };
  if ('list' in block) return { list: block.list.map((item) => resolveInlines(item, values)) };
  return block;
}

/** The plain text of resolved inline content. */
export function inlineText(nodes: ResolvedInline[]): string {
  return nodes
    .map((node) => {
      if (typeof node === 'string') return node;
      if ('strong' in node) return inlineText(node.strong);
      if ('link' in node) return node.text;
      return node.keep;
    })
    .join('');
}

/** The plain text of an answer — what search matches against. */
export function answerText(blocks: ResolvedBlock[]): string {
  return blocks
    .map((block) => {
      if ('p' in block) return inlineText(block.p);
      if ('list' in block) return block.list.map(inlineText).join(' ');
      return block.journey.join(' ');
    })
    .join(' ');
}

/**
 * The groups with every figure filled in. A question that needs a figure the
 * data cannot supply is LEFT OUT — never printed with a gap or a guess
 * (marketing-pages FR-02) — and the group's count follows, because counts are
 * read from what renders.
 */
export function resolveFaqGroups(values: FaqValues, groups: FaqGroup[] = FAQ_GROUPS): ResolvedFaqGroup[] {
  return groups.map((group) => ({
    id: group.id,
    title: group.title,
    anchor: `faq-${group.id}`,
    questions: group.questions.flatMap((faq, index): ResolvedFaq[] => {
      try {
        return [
          {
            id: `${group.id}-${index + 1}`,
            groupId: group.id,
            question: inlineText(resolveInlines(faq.question, values)),
            answer: faq.answer.map((block) => resolveBlock(block, values)),
          },
        ];
      } catch (error) {
        if (error instanceof MissingValue) return [];
        throw error;
      }
    }),
  }));
}

/**
 * The figures, formatted at the edge from data: the box plan's minimum and
 * its price there (`purchaseBarOffer`), the storefront's delivery charge, and
 * Private Table's content constant. Absent inputs leave their key unset.
 *
 * A charge of 0 is free delivery, which the design's "Delivery is … per
 * order" cannot say truthfully, so both delivery-charge answers are left out
 * until the owner words it (spec open question).
 */
export function faqValues(input: {
  minDishes?: number | null;
  fromPence?: number | null;
  deliveryChargePence?: number | null;
}): FaqValues {
  const values: FaqValues = { privateTablePrice: formatPrice(PRIVATE_TABLE_FROM_PENCE) };
  const { minDishes, fromPence, deliveryChargePence } = input;
  if (typeof minDishes === 'number' && minDishes > 0) {
    const word = formatCountInWords(minDishes);
    values.minimumDishes = `${minDishes} ${minDishes === 1 ? 'dish' : 'dishes'}`;
    values.minimumBox = `${word.charAt(0).toUpperCase()}${word.slice(1)}-dish`;
  }
  if (typeof fromPence === 'number' && fromPence > 0) values.startPrice = formatPrice(fromPence);
  if (typeof deliveryChargePence === 'number' && deliveryChargePence > 0) {
    values.deliveryCharge = formatPrice(deliveryChargePence);
  }
  return values;
}

/* ---- The rest of the page's copy --------------------------------------------- */

export type DeliveryHighlightIcon = 'van' | 'calendar' | 'box' | 'leaf';

export interface DeliveryHighlight {
  icon: DeliveryHighlightIcon;
  title: string;
  body: string;
}

/**
 * The four delivery facts under the checker — desktop only (build-handoff
 * §3l: every fact is also in the Delivery and Storage answers, so hiding them
 * below 1024 hides nothing that is only there).
 */
export const DELIVERY_HIGHLIGHTS: DeliveryHighlight[] = [
  { icon: 'van', title: 'Delivered chilled', body: 'Your meals arrive fresh and ready to heat.' },
  {
    icon: 'calendar',
    title: 'Choose your delivery date',
    body: 'Pick any available date from our earliest delivery slot.',
  },
  {
    icon: 'box',
    title: 'Insulated packaging',
    body: 'Carefully packed to keep your food at the right temperature.',
  },
  {
    icon: 'leaf',
    title: 'Store chilled or freeze on arrival',
    body: 'Refrigerate your meals when they arrive, or freeze those suitable for freezing for later.',
  },
];
