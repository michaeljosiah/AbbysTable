import './support/runtime';

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import DeliveryAndFaqsPage from '../src/app/(site)/delivery-and-faqs/page';
import { FaqGroups, FaqTopics } from '../src/components/delivery-faqs/FaqBrowse';
import { NotifyMeForm } from '../src/components/delivery-faqs/NotifyMeForm';
import { PostcodeChecker } from '../src/components/delivery-faqs/PostcodeChecker';
import { getAonikClient, MockAonikClient } from '../src/lib/aonik/client';
import { DEMO_UNSERVED_AREAS, DemoCoverageLookup } from '../src/lib/aonik/coverage';
import { DELIVERY_FIXTURE, STOREFRONT_CONFIG_FIXTURE } from '../src/lib/aonik/fixtures';
import {
  answerText,
  FAQ_GROUP_IDS,
  FAQ_GROUPS,
  faqValues,
  resolveFaqGroups,
  type ResolvedFaqGroup,
} from '../src/lib/content/deliveryFaqs';
import { PRIVATE_TABLE_FROM_PENCE } from '../src/lib/content/marketing';
import { CONTACT_HREF, DELIVERY_FAQS_HREF, PRIVATE_TABLE_ITEM } from '../src/lib/content/navigation';
import { checkPostcode, joinNotifyList, locatePostcode } from '../src/lib/delivery/actions';
import { SIGNUP_FORM_CHANGED } from '../src/lib/signup/consent';
import {
  checkerReducer,
  INITIAL_CHECKER_STATE,
  upcomingDeliveryDate,
  type CheckerState,
} from '../src/lib/delivery/checker';
import {
  CHECKED_POSTCODE_KEY,
  CHECKED_POSTCODE_TTL_MS,
  clearCheckedPostcode,
  parseCheckedPostcode,
  readCheckedPostcode,
  writeCheckedPostcode,
} from '../src/lib/delivery/handoff';
import { resolveDeliveryFaqsData } from '../src/lib/delivery/pageData';
import {
  normalisePostcode,
  POSTCODE_MESSAGES,
  postcodeArea,
  readPostcodeEntry,
} from '../src/lib/delivery/postcode';
import {
  buildFaqIndex,
  MIN_QUERY_LENGTH,
  noResultsLine,
  questionCountLabel,
  resultLine,
  searchFaqs,
  type FaqIndexEntry,
} from '../src/lib/faq/search';
import { formatDeliveryDateLong } from '../src/lib/format';

import { aonikRequests, configureAonik, useAonik as stubAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * Delivery & FAQs (#23). Sources: design/Abby's Table - Delivery and
 * FAQs.dc.html, build-handoff §3l, page behaviour guide §9,
 * frontend-backend-contract §3b–§3d and §4b. Spec:
 * docs/specifications/delivery-and-faqs.md.
 */

const WEB_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(WEB_ROOT, 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) ? [full] : [];
  });
}

/** The text a reader gets: tags dropped, entities decoded, whitespace collapsed. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Runs `fn` with console.error silenced (failure paths log on purpose). */
async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const quiet = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = quiet;
  }
}

/** Runs `fn` against a live tenant answered by `responder`, restoring the environment after. */
async function live<T>(
  responder: Parameters<typeof stubAonik>[0],
  fn: () => Promise<T>,
): Promise<T> {
  const saved = { ...process.env };
  configureAonik({ AONIK_DATA_MODE: 'live' });
  stubAonik(responder);
  resetCookies();
  try {
    return await quietly(fn);
  } finally {
    process.env = saved;
  }
}

/** Demo mode: no Aonik configured, so the data mode resolves to the fixtures. */
async function demo<T>(fn: () => Promise<T>): Promise<T> {
  const saved = { ...process.env };
  delete process.env.AONIK_API_URL;
  delete process.env.AONIK_TENANT_ID;
  delete process.env.AONIK_DATA_MODE;
  resetCookies();
  try {
    return await fn();
  } finally {
    process.env = saved;
  }
}

/** A storefront config document as Aonik sends it: £158 for six, £5.95 delivery. */
const STOREFRONT_DTO = {
  currency: 'GBP',
  recommendedChoiceLabel: 'Abby’s choice',
  resultsPageSize: 8,
  backToTopTrigger: null,
  delivery: { listAmount: 5.95, chargedAmount: 5.95 },
  defaultBoxSlug: 'abbys-box',
  extrasCollectionSlug: null,
  box: {
    minSize: 6,
    maxSize: 99,
    currency: 'GBP',
    perSpacePrice: 17,
    presets: [{ size: 6, price: 158, badge: null, blurb: null, saving: null }],
  },
};

/* ---- Postcodes ------------------------------------------------------------------- */

test('postcodes: case and spacing are fixed, never errors', () => {
  assert.equal(normalisePostcode('da12ab'), 'DA1 2AB');
  assert.equal(normalisePostcode('  DA1   2AB '), 'DA1 2AB');
  assert.equal(normalisePostcode('ab123cd'), 'AB12 3CD');
  assert.equal(normalisePostcode('W1A 1AA'), 'W1A 1AA');
  assert.equal(normalisePostcode('ec1a1bb'), 'EC1A 1BB');
  assert.equal(normalisePostcode('M1 1AE'), 'M1 1AE');
  // Girobank: a live postcode the standard pattern cannot express.
  assert.equal(normalisePostcode('gir0aa'), 'GIR 0AA');
});

test('postcodes: a malformed entry is not a postcode', () => {
  for (const raw of ['', ' ', 'DA1ABC', 'DA1-2AB', '12345', 'DA1 2A', 'ZZZZ 1AA', 'DA1 2ABC', null, undefined]) {
    assert.equal(normalisePostcode(raw), null, String(raw));
  }
});

test('postcodes: empty and invalid are the two corrections, with the design’s words', () => {
  assert.deepEqual(readPostcodeEntry('   '), { ok: false, reason: 'empty' });
  assert.deepEqual(readPostcodeEntry('DA1ABC'), { ok: false, reason: 'invalid' });
  assert.deepEqual(readPostcodeEntry('da1 2ab'), { ok: true, postcode: 'DA1 2AB' });
  assert.equal(POSTCODE_MESSAGES.empty, 'Enter your postcode to check delivery.');
  assert.equal(POSTCODE_MESSAGES.invalid, 'Please enter a valid UK postcode.');
  assert.equal(POSTCODE_MESSAGES.location, 'We couldn’t access your location. Enter your postcode instead.');
  assert.equal(postcodeArea('DA1 2AB'), 'DA');
  assert.equal(postcodeArea('W1A 1AA'), 'W');
});

/* ---- The checker's nine states ---------------------------------------------------- */

const run = (...events: Parameters<typeof checkerReducer>[1][]): CheckerState =>
  events.reduce(checkerReducer, INITIAL_CHECKER_STATE);

test('checker: every state is reached by an event — there is no override', () => {
  // 1. idle
  assert.deepEqual(run(), INITIAL_CHECKER_STATE);
  // 2–3. empty / invalid: beside the field, never a panel
  assert.equal(run({ type: 'correct', message: 'empty' }).message, 'empty');
  assert.equal(run({ type: 'correct', message: 'invalid' }).result, null);
  // 4. checking
  assert.equal(run({ type: 'start', busy: 'checking', request: 1 }).busy, 'checking');
  // 5. serves
  const serves = run(
    { type: 'start', busy: 'checking', request: 1 },
    { type: 'answer', request: 1, result: { kind: 'serves', postcode: 'DA1 2AB', earliestDeliveryDate: '2026-08-06' } },
  );
  assert.equal(serves.result?.kind, 'serves');
  assert.equal(serves.busy, null);
  assert.equal(serves.revision, 1, 'a genuine outcome bumps the revision (the phone scroll)');
  // 6. not served
  const refused = run(
    { type: 'start', busy: 'checking', request: 1 },
    { type: 'answer', request: 1, result: { kind: 'not-served', postcode: 'AB12 3CD' } },
  );
  assert.equal(refused.result?.kind, 'not-served');
  // 7. could not check
  const failed = run(
    { type: 'start', busy: 'checking', request: 1 },
    { type: 'answer', request: 1, result: { kind: 'unavailable' } },
  );
  assert.equal(failed.result?.kind, 'unavailable');
  // 8. finding location
  assert.equal(run({ type: 'start', busy: 'locating', request: 1 }).busy, 'locating');
  // 9. location refused: beside the field
  const refusedLocation = run(
    { type: 'start', busy: 'locating', request: 1 },
    { type: 'correct', message: 'location', request: 1 },
  );
  assert.equal(refusedLocation.message, 'location');
  assert.equal(refusedLocation.busy, null);
  assert.equal(refusedLocation.revision, 0, 'a correction never moves the page');
});

test('checker: an answer for a request the customer moved on from never lands', () => {
  // Typed while the check was in flight.
  const edited = run(
    { type: 'start', busy: 'checking', request: 1 },
    { type: 'reset', request: 2 },
    { type: 'answer', request: 1, result: { kind: 'serves', postcode: 'DA1 2AB', earliestDeliveryDate: null } },
  );
  assert.equal(edited.result, null);
  // Started again: only the newer request's answer counts.
  const restarted = run(
    { type: 'start', busy: 'checking', request: 1 },
    { type: 'start', busy: 'checking', request: 2 },
    { type: 'answer', request: 1, result: { kind: 'not-served', postcode: 'AB12 3CD' } },
  );
  assert.equal(restarted.result, null);
  assert.equal(restarted.busy, 'checking');
  // A late location failure after the customer typed.
  const late = run(
    { type: 'start', busy: 'locating', request: 1 },
    { type: 'reset', request: 2 },
    { type: 'correct', message: 'location', request: 1 },
  );
  assert.equal(late.message, null);
  // An answer with nothing in flight.
  assert.equal(run({ type: 'answer', request: 0, result: { kind: 'unavailable' } }).result, null);
});

test('checker: editing, clearing or "Change postcode" drops the panel and the correction', () => {
  const shown = run(
    { type: 'start', busy: 'checking', request: 1 },
    { type: 'answer', request: 1, result: { kind: 'not-served', postcode: 'AB12 3CD' } },
  );
  const reset = checkerReducer(shown, { type: 'reset', request: 2 });
  assert.equal(reset.result, null);
  assert.equal(reset.message, null);
  assert.equal(checkerReducer(run({ type: 'correct', message: 'invalid' }), { type: 'reset', request: 1 }).message, null);
});

/* ---- The hand-off to the box builder ---------------------------------------------- */

class MemoryStorage {
  readonly items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

const NOW = Date.UTC(2026, 9, 7, 12);

test('hand-off: the checked postcode is carried in session storage, normalised', () => {
  const storage = new MemoryStorage();
  assert.equal(writeCheckedPostcode(storage, 'da1 2ab', NOW), true);
  assert.deepEqual(JSON.parse(storage.items.get(CHECKED_POSTCODE_KEY)!), { v: 1, t: NOW, postcode: 'DA1 2AB' });
  assert.equal(readCheckedPostcode(storage, NOW + 1000), 'DA1 2AB');
  clearCheckedPostcode(storage);
  assert.equal(readCheckedPostcode(storage, NOW), null);
});

test('hand-off: stale, future, foreign or malformed records carry nothing', () => {
  const record = (value: unknown) => JSON.stringify(value);
  assert.equal(parseCheckedPostcode(record({ v: 1, t: NOW, postcode: 'DA1 2AB' }), NOW + CHECKED_POSTCODE_TTL_MS + 1), null);
  assert.equal(parseCheckedPostcode(record({ v: 1, t: NOW + 60_000, postcode: 'DA1 2AB' }), NOW), null);
  assert.equal(parseCheckedPostcode(record({ v: 2, t: NOW, postcode: 'DA1 2AB' }), NOW), null);
  assert.equal(parseCheckedPostcode(record({ v: 1, t: NOW, postcode: 'da12ab' }), NOW), null);
  assert.equal(parseCheckedPostcode(record({ v: 1, t: NOW, postcode: '<script>' }), NOW), null);
  assert.equal(parseCheckedPostcode('{not json', NOW), null);
  assert.equal(parseCheckedPostcode(null, NOW), null);
  assert.equal(writeCheckedPostcode(new MemoryStorage(), 'not a postcode', NOW), false);
});

test('hand-off: storage that throws is no postcode, never an error', () => {
  const broken = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {
      throw new Error('SecurityError');
    },
  };
  assert.equal(readCheckedPostcode(broken, NOW), null);
  assert.equal(writeCheckedPostcode(broken, 'DA1 2AB', NOW), false);
  assert.doesNotThrow(() => clearCheckedPostcode(broken));
  assert.equal(readCheckedPostcode(null, NOW), null);
});

test('hand-off: the postcode never travels in a URL', () => {
  for (const file of sourceFiles(SRC)) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /[?&]postcode=/, path.relative(SRC, file));
  }
});

/* ---- Coverage: demo answers, live holds back ------------------------------------- */

test('coverage (demo): the design’s placeholder areas decide, and nothing else', async () => {
  const lookup = new DemoCoverageLookup();
  assert.deepEqual(await lookup.check('DA1 2AB'), { status: 'serves', postcode: 'DA1 2AB' });
  assert.deepEqual(await lookup.check('ab123cd'), { status: 'not-served', postcode: 'AB12 3CD' });
  for (const area of DEMO_UNSERVED_AREAS) {
    const postcode = `${area}1 1AA`;
    assert.equal((await lookup.check(postcode)).status, 'not-served', postcode);
  }
  await assert.rejects(lookup.check('nonsense'), 'a malformed postcode is a fault, never an answer');
});

test('coverage (demo): a location resolves only near a demo postcode, never to a guess', async () => {
  const lookup = new DemoCoverageLookup();
  assert.equal(await lookup.postcodeAt(51.45, 0.21), 'DA1 2AB'); // Dartford
  assert.equal(await lookup.postcodeAt(57.12, -2.1), 'AB12 3CD'); // Aberdeen
  assert.equal(await lookup.postcodeAt(53.48, -2.24), null); // Manchester
});

test('coverage (live): no lookup until Aonik has one (aonik#352); sign-up lists only live (#357)', async () => {
  await live(
    () => undefined,
    async () => {
      const client = await getAonikClient();
      assert.equal(client.coverage, null);
      assert.ok(client.signupLists, 'live reads the published lists');
    },
  );
  const demoClient = new MockAonikClient();
  assert.ok(demoClient.coverage, 'demo serves the fixture coverage — a read');
  assert.equal(demoClient.signupLists, null, 'demo never pretends a write');
});

/* ---- The server actions ---------------------------------------------------------- */

test('checkPostcode (demo): serves with the earliest date, not served, invalid', async () => {
  await demo(async () => {
    assert.deepEqual(await checkPostcode('da1 2ab'), {
      status: 'serves',
      postcode: 'DA1 2AB',
      earliestDeliveryDate: upcomingDeliveryDate(DELIVERY_FIXTURE.earliestDeliveryDate),
    });
    assert.deepEqual(await checkPostcode('AB12 3CD'), { status: 'not-served', postcode: 'AB12 3CD' });
    assert.deepEqual(await checkPostcode('DA1ABC'), { status: 'invalid' });
    assert.deepEqual(await checkPostcode(42), { status: 'invalid' }, 'a public endpoint validates its input');
    assert.deepEqual(await checkPostcode(`DA1 2AB${' '.repeat(40)}x`), { status: 'invalid' });
  });
});

test('checkPostcode (live): "could not check", and no request to an endpoint that does not exist', async () => {
  await live(
    () => ({ status: 404, body: { error: 'Not found' } }),
    async () => {
      assert.deepEqual(await checkPostcode('DA1 2AB'), { status: 'unavailable' });
      assert.deepEqual(aonikRequests, [], 'nothing is asked of Aonik');
    },
  );
});

test('locatePostcode: validates coordinates and never invents a postcode', async () => {
  await demo(async () => {
    assert.equal(await locatePostcode(51.45, 0.21), 'DA1 2AB');
    assert.equal(await locatePostcode(53.48, -2.24), null);
    assert.equal(await locatePostcode(Number.NaN, 0), null);
    assert.equal(await locatePostcode(91, 0), null);
    assert.equal(await locatePostcode('51.45', 0.21), null);
  });
  await live(
    () => undefined,
    async () => {
      assert.equal(await locatePostcode(51.45, 0.21), null, 'live has no lookup yet');
    },
  );
});

const notifyForm = (email: string, postcode = 'AB12 3CD', consentVersion: string | null = 'delivery-v1') => {
  const data = new FormData();
  data.set('email', email);
  data.set('postcode', postcode);
  if (consentVersion !== null) data.set('consentVersion', consentVersion);
  return data;
};

test('joinNotifyList: never "joined" where nothing can store it, nor for a post that is not one', async () => {
  await demo(async () => {
    const result = await quietly(() => joinNotifyList({ status: 'idle' }, notifyForm('ada@example.com')));
    assert.equal(result.status, 'error', 'demo has no lists');
    assert.equal((await joinNotifyList({ status: 'idle' }, notifyForm('not-an-email'))).status, 'error');
    assert.equal((await joinNotifyList({ status: 'idle' }, notifyForm('ada@example.com', 'nope'))).status, 'error');
  });
  await live(
    () => undefined,
    async () => {
      // No version shown: nothing can say what the customer agreed to, and nothing is sent.
      const unversioned = await joinNotifyList({ status: 'idle' }, notifyForm('ada@example.com', 'AB12 3CD', null));
      assert.deepEqual(unversioned, { status: 'error', message: SIGNUP_FORM_CHANGED });
      assert.equal((await joinNotifyList({ status: 'idle' }, notifyForm('ada\u0001@example.com'))).status, 'error');
      assert.deepEqual(aonikRequests, []);
    },
  );
});

test('joinNotifyList (live): the email, the checked postcode and the version shown — "joined" only on 202', async () => {
  await live(
    () => ({ status: 202 }),
    async () => {
      assert.deepEqual(await joinNotifyList({ status: 'idle' }, notifyForm(' ada@example.com ', 'ab123cd')), { status: 'joined' });
      assert.equal(aonikRequests[0].method, 'POST');
      assert.equal(aonikRequests[0].path, '/v1/signup-lists/delivery-availability');
      assert.deepEqual(aonikRequests[0].body, { email: 'ada@example.com', consentVersion: 'delivery-v1', postcode: 'AB12 3CD' });
    },
  );
  await live(
    () => ({ status: 422, body: { error: 'This sign-up form is unavailable or has changed. Reload it before submitting.' } }),
    async () => {
      // The wording changed (or the list was withdrawn) since the page was rendered: reload, never retry.
      assert.deepEqual(await joinNotifyList({ status: 'idle' }, notifyForm('ada@example.com')), {
        status: 'error',
        message: SIGNUP_FORM_CHANGED,
      });
    },
  );
  await live(
    () => ({ status: 503, body: { error: 'down' } }),
    async () => {
      const failed = await joinNotifyList({ status: 'idle' }, notifyForm('ada@example.com'));
      assert.equal(failed.status, 'error');
      assert.notEqual(failed.message, SIGNUP_FORM_CHANGED);
    },
  );
});

/* ---- FAQ content ----------------------------------------------------------------- */

const FULL = faqValues({ minDishes: 6, fromPence: 15800, deliveryChargePence: 595 });

const flat = (groups: ResolvedFaqGroup[]) => groups.flatMap((group) => group.questions);

test('FAQs: eight topic groups in the design’s order, with its question counts', () => {
  const groups = resolveFaqGroups(FULL);
  assert.deepEqual(
    groups.map((group) => group.id),
    [...FAQ_GROUP_IDS],
  );
  assert.deepEqual(
    groups.map((group) => [group.title, group.questions.length]),
    [
      ['Delivery', 7],
      ['Your food', 6],
      ['Orders & changes', 6],
      ['Storage & reheating', 5],
      ['Payment', 5],
      ['Gifting', 5],
      ['Private Table', 10],
      ['About Abby’s Table', 4],
    ],
  );
  assert.equal(groups[0].anchor, 'faq-delivery');
  assert.equal(new Set(flat(groups).map((faq) => faq.id)).size, 48, 'ids are unique');
});

test('FAQs: figures come from data — the delivery charge, the minimum and both prices', () => {
  const faqs = flat(resolveFaqGroups(faqValues({ minDishes: 6, fromPence: 16500, deliveryChargePence: 650 })));
  const answer = (question: string) => answerText(faqs.find((faq) => faq.question === question)!.answer);

  assert.equal(
    answer('How much is delivery?'),
    'Delivery is £6.50 per order. The delivery charge will be shown clearly before you complete your order.',
  );
  assert.match(answer('Is delivery included in the price?'), /^Delivery is charged separately at £6\.50 per order\./);
  assert.equal(
    answer('Is there a minimum order?'),
    'Yes. Abby’s Table orders start from a minimum of 6 dishes. Six-dish boxes currently start from £165, with the final price depending on the dishes and portions you choose.',
  );
  const privatePrice = faqs.find((faq) => faq.question.startsWith('Why does Private Table start from'))!;
  assert.equal(privatePrice.question, 'Why does Private Table start from £1,500?');
  assert.equal(PRIVATE_TABLE_FROM_PENCE, 150_000);

  // The same content with a different plan: the words follow the data.
  const twelve = flat(resolveFaqGroups(faqValues({ minDishes: 12, fromPence: 30600, deliveryChargePence: 595 })));
  assert.match(answerText(twelve.find((faq) => faq.question === 'Is there a minimum order?')!.answer), /minimum of 12 dishes\. Twelve-dish boxes currently start from £306,/);
});

test('FAQs: a question whose figure is unknown is left out, never printed with a guess', () => {
  const none = resolveFaqGroups(faqValues({}));
  const questions = flat(none).map((faq) => faq.question);
  assert.ok(!questions.includes('How much is delivery?'));
  assert.ok(!questions.includes('Is delivery included in the price?'));
  assert.ok(!questions.includes('Is there a minimum order?'));
  assert.ok(questions.includes('Why does Private Table start from £1,500?'), 'a content constant is always known');
  assert.equal(none[0].questions.length, 6, 'the count follows what renders');

  // Free delivery is not "£0 per order": the design's wording cannot say it.
  const free = flat(resolveFaqGroups(faqValues({ minDishes: 6, fromPence: 15800, deliveryChargePence: 0 })));
  assert.ok(!free.some((faq) => faq.question === 'How much is delivery?'));
  // A minimum with no price at it still leaves the minimum question out.
  const noPrice = flat(resolveFaqGroups(faqValues({ minDishes: 6, fromPence: null, deliveryChargePence: 595 })));
  assert.ok(!noPrice.some((faq) => faq.question === 'Is there a minimum order?'));
});

test('FAQs: no figure is a literal in the copy or the components', () => {
  const files = [
    'lib/content/deliveryFaqs.ts',
    ...readdirSync(path.join(SRC, 'components', 'delivery-faqs')).map((name) => `components/delivery-faqs/${name}`),
    'app/(site)/delivery-and-faqs/page.tsx',
  ];
  for (const file of files) {
    // Code only: a comment may quote the design's figures to explain a slot.
    const source = readFileSync(path.join(SRC, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(source, /£\s?\d/, `${file}: a price written as copy`);
    assert.doesNotMatch(source, /5\.95|595\b|158\b|1,500/, `${file}: a figure written as copy`);
  }
  // The Private Table link is the chrome's destination, never a page that would 404.
  const about = FAQ_GROUPS.find((group) => group.id === 'about')!;
  assert.ok(JSON.stringify(about).includes(`"link":"${PRIVATE_TABLE_ITEM.href}"`));
});

test('FAQs: development-only review controls never ship (contract §4b)', () => {
  for (const file of sourceFiles(SRC)) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /stateOverride|NOT_YET\b/, path.relative(SRC, file));
  }
});

/* ---- FAQ search ------------------------------------------------------------------ */

const index: FaqIndexEntry[] = buildFaqIndex(
  flat(resolveFaqGroups(FULL)).map((faq) => ({ id: faq.id, question: faq.question, answer: answerText(faq.answer) })),
);

const questionOf = (id: string) => flat(resolveFaqGroups(FULL)).find((faq) => faq.id === id)!.question;

test('search: empty is browse, one character is "keep typing", two search', () => {
  assert.deepEqual(searchFaqs(index, ''), { state: 'browse' });
  assert.deepEqual(searchFaqs(index, '   '), { state: 'browse' });
  assert.deepEqual(searchFaqs(index, 'f'), { state: 'too-short', query: 'f' });
  assert.deepEqual(searchFaqs(index, ' f '), { state: 'too-short', query: 'f' });
  assert.equal(MIN_QUERY_LENGTH, 2);
  assert.equal(searchFaqs(index, 'fr').state, 'results');
});

test('search: every term must match, so more words narrow', () => {
  const freeze = searchFaqs(index, 'freeze');
  const freezeMeals = searchFaqs(index, 'freeze meals');
  const freezeMealsNda = searchFaqs(index, 'freeze nda');
  assert.ok(freeze.state === 'results' && freezeMeals.state === 'results' && freezeMealsNda.state === 'results');
  assert.ok(freezeMeals.ids.length > 0);
  assert.ok(freezeMeals.ids.length <= freeze.ids.length);
  for (const id of freezeMeals.ids) {
    const entry = index.find((candidate) => candidate.id === id)!;
    assert.ok(entry.text.includes('freeze') && entry.text.includes('meals'), questionOf(id));
  }
  assert.deepEqual(freezeMealsNda.ids, [], 'no question mentions both');
});

test('search: question matches rank above answer-only matches', () => {
  const result = searchFaqs(index, 'delivery');
  assert.ok(result.state === 'results');
  const inQuestion = result.ids.map((id) => index.find((entry) => entry.id === id)!.question.includes('delivery'));
  const firstAnswerOnly = inQuestion.indexOf(false);
  assert.ok(firstAnswerOnly > 0, 'some question hits, then answer-only hits');
  assert.ok(inQuestion.slice(firstAnswerOnly).every((hit) => !hit), 'no question hit after an answer-only one');
  // Within a rank, the page's own order: the first question that says "delivery".
  assert.equal(questionOf(result.ids[0]), 'Do I need to be home for my delivery?');
});

test('search: a duplicated question is indexed once; curly and straight quotes match', () => {
  const freeze = searchFaqs(index, 'can i freeze my meals');
  assert.ok(freeze.state === 'results');
  assert.equal(freeze.ids.filter((id) => questionOf(id) === 'Can I freeze my meals?').length, 1);
  assert.equal(freeze.ids[0], 'food-2', 'the first in page order wins (Your food)');

  const typed = searchFaqs(index, "abby's table different");
  assert.ok(typed.state === 'results' && typed.ids.includes('about-1'));
  assert.deepEqual(searchFaqs(index, 'zzzz'), { state: 'results', query: 'zzzz', ids: [] });
});

test('search: the lines it shows', () => {
  assert.equal(questionCountLabel(1), '1 question');
  assert.equal(questionCountLabel(7), '7 questions');
  assert.equal(resultLine(1, 'nda'), '1 result for “nda”');
  assert.equal(resultLine(2, 'freeze meals'), '2 results for “freeze meals”');
  assert.equal(noResultsLine('zzzz'), 'We couldn’t find anything for “zzzz”.');
});

/* ---- Dates ----------------------------------------------------------------------- */

test('the earliest delivery reads with its weekday, derived from the date', () => {
  assert.equal(formatDeliveryDateLong('2026-08-06'), 'Thursday 6 August');
  assert.equal(formatDeliveryDateLong('2026-10-14'), 'Wednesday 14 October');
  assert.equal(formatDeliveryDateLong('2026-02-30'), null);
  assert.equal(formatDeliveryDateLong('6 August'), null);
  assert.equal(formatDeliveryDateLong(null), null);
});

test('upcomingDeliveryDate: today or later in the UK; a past date is no answer', () => {
  // 23:30 UTC on 6 Oct is already 7 Oct in London (BST).
  const lateEvening = new Date('2026-10-06T23:30:00Z');
  assert.equal(upcomingDeliveryDate('2026-10-07', lateEvening), '2026-10-07');
  assert.equal(upcomingDeliveryDate('2026-10-06', lateEvening), null);
  assert.equal(upcomingDeliveryDate('2026-08-06', lateEvening), null, 'a stale window shows no date');
  assert.equal(upcomingDeliveryDate('2027-01-02', lateEvening), '2027-01-02');
  assert.equal(upcomingDeliveryDate('6 August', lateEvening), null);
  assert.equal(upcomingDeliveryDate(null, lateEvening), null);
});

/* ---- Page data ------------------------------------------------------------------- */

test('page data (demo): the checker with location, no notify-me, £5.95 from the config', async () => {
  const data = await resolveDeliveryFaqsData(new MockAonikClient());
  assert.deepEqual(data.checker, { canLocate: true });
  assert.equal(data.notify, null);
  assert.equal(data.values.deliveryCharge, '£5.95');
  assert.equal(STOREFRONT_CONFIG_FIXTURE.delivery.chargedPence, 595, 'contract §3d, as configured data');
  assert.equal(data.values.minimumBox, 'Six-dish');
});

test('page data: no lookup → no checker; a failing config → the FAQs without their figures', async () => {
  const logged: string[] = [];
  const data = await resolveDeliveryFaqsData(
    {
      getStorefrontConfig: async () => {
        throw new Error('503');
      },
      coverage: null,
      signupLists: {
        published: async () => {
          throw new Error('never read without a checker');
        },
        join: async () => undefined,
      },
    },
    (message) => logged.push(message),
  );
  assert.equal(data.checker, null);
  assert.equal(data.notify, null, 'no checker, so no not-in-area panel to offer it in');
  assert.deepEqual(Object.keys(data.values), ['privateTablePrice']);
  assert.equal(logged.length, 1);

  const noLocate = await resolveDeliveryFaqsData({
    getStorefrontConfig: async () => STOREFRONT_CONFIG_FIXTURE,
    coverage: { check: async () => ({ status: 'not-served', postcode: 'AB12 3CD' }) },
    signupLists: null,
  });
  assert.deepEqual(noLocate.checker, { canLocate: false }, 'no coordinates lookup, no location control');
});

test('page data: notify-me only where the tenant publishes its list — with that list’s wording', async () => {
  const coverage = { check: async () => ({ status: 'not-served' as const, postcode: 'AB12 3CD' }) };
  const published = {
    listType: 'delivery-availability' as const,
    consentVersion: 'delivery-v1',
    consentText: 'We’ll only use your email to tell you when we reach your area.',
    services: null,
  };
  const withList = await resolveDeliveryFaqsData({
    getStorefrontConfig: async () => STOREFRONT_CONFIG_FIXTURE,
    coverage,
    signupLists: { published: async () => [published], join: async () => undefined },
  });
  assert.deepEqual(withList.notify, { text: published.consentText, version: 'delivery-v1' });

  const otherListsOnly = await resolveDeliveryFaqsData({
    getStorefrontConfig: async () => STOREFRONT_CONFIG_FIXTURE,
    coverage,
    signupLists: { published: async () => [{ ...published, listType: 'newsletter' as const }], join: async () => undefined },
  });
  assert.equal(otherListsOnly.notify, null);

  const failing = await quietly(() =>
    resolveDeliveryFaqsData({
      getStorefrontConfig: async () => STOREFRONT_CONFIG_FIXTURE,
      coverage,
      signupLists: { published: async () => Promise.reject(new Error('503')), join: async () => undefined },
    }),
  );
  assert.equal(failing.notify, null, 'a failed read only holds the form back');
  assert.deepEqual(failing.checker, { canLocate: false }, 'and never the checker');
});

/* ---- Rendering ------------------------------------------------------------------- */

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await DeliveryAndFaqsPage());
}

test('page (demo): the head, the checker, the facts, search, eight topics and the groups', async () => {
  const html = await demo(renderPage);
  const text = textOf(html);
  assert.match(html, /<h1[^>]*>Delivery &amp; FAQs<\/h1>/);
  assert.match(text, /Answers to common questions about delivery, your food and your order, all in one place\./);
  assert.match(text, /Check delivery to your postcode/);
  assert.match(text, /Meal delivery is currently available to mainland UK addresses only\./);
  assert.match(html, /placeholder="e\.g\. DA1 2AB"/);
  assert.match(html, /autoComplete="postal-code"|autocomplete="postal-code"/);
  assert.match(text, /Use my current location/);
  for (const fact of ['Delivered chilled', 'Choose your delivery date', 'Insulated packaging', 'Store chilled or freeze on arrival']) {
    assert.match(text, new RegExp(fact));
  }
  assert.match(text, /Search our FAQs/);
  assert.match(text, /Choose a topic/);
  for (const [anchor, count] of [
    ['faq-delivery', '7 questions'],
    ['faq-private', '10 questions'],
    ['faq-about', '4 questions'],
  ]) {
    assert.match(html, new RegExp(`href="#${anchor}"`));
    assert.match(html, new RegExp(`id="${anchor}"`));
    assert.match(text, new RegExp(count));
  }
  assert.equal((html.match(/<details/g) ?? []).length, 48, 'every question, in the page as markup');
  assert.equal((html.match(/Expand all/g) ?? []).length, 8);
  assert.equal((html.match(/Back to FAQ topics/g) ?? []).length, 8);
  assert.match(text, /Delivery is £5\.95 per order/);
  assert.match(text, /Still need help\?/);
});

test('page: an information page — no purchase bar, no result yet, no notify-me, no URL postcode', async () => {
  const html = await demo(renderPage);
  assert.doesNotMatch(html, /data-purchase-bar-reveal|data-purchase-bar=/);
  assert.doesNotMatch(html, /Great — we deliver|not in your area yet|couldn’t check that postcode/, 'no state before input');
  assert.doesNotMatch(html, /Let me know|Want to know when we reach your area/, 'notify-me waits on aonik#357');
  // The fields carry no name, so a submit before hydration sends nothing.
  assert.doesNotMatch(html, /name="postcode"|name="q"/);
  // Every "contact us" is the shared constant.
  const contacts = [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>Contact us<\/a>/g)].map((match) => match[1]);
  assert.ok(contacts.length >= 1);
  assert.ok(contacts.every((href) => href === CONTACT_HREF), contacts.join(', '));
});

test('page (live): no checker without a lookup, FAQs priced from the config', async () => {
  const html = await live(
    (request) => (request.path === '/commerce/config/storefront' ? { status: 200, body: STOREFRONT_DTO } : undefined),
    renderPage,
  );
  const text = textOf(html);
  assert.doesNotMatch(text, /Check delivery to your postcode/, 'held back until aonik#352');
  assert.doesNotMatch(text, /Use my current location/);
  assert.match(text, /Delivery is £5\.95 per order/);
  assert.match(text, /minimum of 6 dishes\. Six-dish boxes currently start from £158,/);
  assert.deepEqual(
    aonikRequests.map((request) => request.path),
    ['/commerce/config/storefront'],
    'the config, once — and nothing else',
  );
});

test('page (live): Aonik down — the FAQs still render, without the figures they cannot know', async () => {
  const html = await live(() => ({ status: 503, body: { title: 'Service Unavailable' } }), renderPage);
  const text = textOf(html);
  assert.match(text, /Search our FAQs/);
  assert.doesNotMatch(text, /How much is delivery\?/);
  const deliveryCard = html.match(/href="#faq-delivery"[\s\S]*?(\d+) questions?/);
  const deliveryGroup = html.match(/id="faq-delivery"[\s\S]*?(?=id="faq-|$)/);
  assert.ok(deliveryCard && deliveryGroup, 'the Delivery card and group render');
  assert.equal(
    Number(deliveryCard[1]),
    (deliveryGroup[0].match(/<details/g) ?? []).length,
    'Delivery counts what renders',
  );
});

test('checker markup: labelled field, live regions, location control only where it can work', () => {
  const html = renderToStaticMarkup(<PostcodeChecker canLocate />);
  assert.match(html, /<label for="([^"]+)" class="visuallyHidden">Postcode<\/label>[\s\S]*<input[^>]*id="\1"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /role="region" aria-live="polite" aria-label="Delivery result"/);
  assert.match(html, /<button type="submit"[^>]*>Check<\/button>/);
  assert.doesNotMatch(renderToStaticMarkup(<PostcodeChecker canLocate={false} />), /Use my current location/);
});

test('notify-me markup: email, the checked postcode, the published wording and its version', () => {
  const html = renderToStaticMarkup(
    <NotifyMeForm
      action={async () => ({ status: 'idle' })}
      consent={{ text: 'Use my email only to let me know when delivery reaches my area.', version: 'delivery-v1' }}
      postcode="AB12 3CD"
    />,
  );
  assert.match(html, /<input[^>]*type="email"[^>]*required=""[^>]*name="email"|<input[^>]*name="email"[^>]*type="email"[^>]*required=""/);
  assert.match(html, /type="hidden" name="postcode" value="AB12 3CD"/);
  assert.match(html, /type="hidden" name="consentVersion" value="delivery-v1"/);
  assert.match(textOf(html), /Use my email only to let me know when delivery reaches my area\. See our Privacy Policy\./);
  assert.match(html, /href="\/privacy"/);
  assert.match(textOf(html), /Let me know/);
});

test('topics and groups: jump links, counts, and native disclosures', () => {
  const groups = resolveFaqGroups(FULL);
  const topics = renderToStaticMarkup(<FaqTopics groups={groups} />);
  assert.match(topics, /id="faq-topics"/);
  assert.equal((topics.match(/class="topic"/g) ?? []).length, 8);
  const body = renderToStaticMarkup(<FaqGroups groups={groups} />);
  assert.match(body, /<summary class="summary"><span>Where do you deliver\?<\/span>/);
  assert.match(body, /href="#faq-topics"/);
  // Private Table's journey keeps its decorative arrows out of the accessibility tree.
  assert.match(body, /Private enquiry <span class="journeyArrow" aria-hidden="true">→<\/span> Consultation/);
  // The one compound the design holds together.
  assert.match(body, /<span class="keep">UK-wide<\/span> meal preparation/);
});

test('every link to Delivery & FAQs is its page', () => {
  assert.equal(DELIVERY_FAQS_HREF, '/delivery-and-faqs');
});
