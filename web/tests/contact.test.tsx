import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import ContactPage from '../src/app/(site)/contact/page';
import { ContactForm } from '../src/components/contact/ContactForm';
import { ContactView, type ContactViewProps } from '../src/components/contact/ContactView';
import {
  ENQUIRY_PATH,
  enquiriesAvailable,
  postEnquiry,
  toEnquiryForm,
} from '../src/lib/aonik/enquiries';
import { sendEnquiryAction } from '../src/lib/contact/actions';
import {
  addImages,
  asksForOrderNumber,
  EMPTY_ENQUIRY,
  ENQUIRY_IMAGE_ACCEPT,
  ENQUIRY_LIMITS,
  ENQUIRY_MESSAGES,
  ENQUIRY_TOPICS,
  firstInvalidField,
  IMAGE_MESSAGES,
  imageProblem,
  imagesProblem,
  isAcceptedImageType,
  MAX_ENQUIRY_IMAGE_BYTES,
  toEnquiry,
  validateEnquiry,
  type EnquiryAction,
  type EnquiryDraft,
} from '../src/lib/contact/enquiry';
import {
  formatClock,
  hoursProblems,
  hoursRows,
  isOpenAt,
  msUntilNextMinute,
  OPEN_STATUS_LABELS,
  openStatus,
  ukClock,
  type OpeningHours,
} from '../src/lib/contact/hours';
import { OPENING_HOURS, SUPPORT_CONTACT, WHATSAPP_CONTACT } from '../src/lib/content/contact';
import { PRIVATE_TABLE_HREF, PRIVATE_TABLE_WAITLIST_HREF } from '../src/lib/content/marketing';
import { CONTACT_HREF, DELIVERY_FAQS_HREF, SOCIAL_LINKS } from '../src/lib/content/navigation';
import { waitlistOpen } from '../src/lib/private-table/availability';
import { clearPublishedListsCache } from '../src/lib/aonik/signupLists';
import { WAITLIST_SERVICES } from '../src/lib/content/privateTable';

import { AONIK_BASE, TENANT_ID, configureAonik, useAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * Contact us (#24). Sources: design/Abby's Table - Contact Us.dc.html,
 * build-handoff "Contact — what was settled", behaviour guide §10, contract
 * §3e (submission) and §3f (opening hours).
 *
 * The hours below are TEST data, deliberately not the design's placeholder
 * hours: those are unverified and must never be written into the site.
 */

const env = process.env as Record<string, string | undefined>;

/** Mon–Fri 08:30–18:00, Sat 09:00–13:00, Sun closed; one bank holiday. */
const HOURS: OpeningHours = {
  weekly: [
    null,
    { opens: '08:30', closes: '18:00' },
    { opens: '08:30', closes: '18:00' },
    { opens: '08:30', closes: '18:00' },
    { opens: '08:30', closes: '18:00' },
    { opens: '08:30', closes: '18:00' },
    { opens: '09:00', closes: '13:00' },
  ],
  bankHolidays: ['2026-08-31'],
  closures: [],
};

const at = (iso: string) => new Date(iso);

/* ---- Opening hours: the London wall clock ---------------------------------------- */

test('the clock is London’s, whatever the machine’s zone: dates roll over at London midnight', () => {
  // 23:30 UTC on 30 June is 00:30 BST on Wednesday 1 July.
  assert.deepEqual(ukClock(at('2026-06-30T23:30:00Z')), { date: '2026-07-01', weekday: 3, minutes: 30 });
  // In winter London is on UTC itself.
  assert.deepEqual(ukClock(at('2026-12-01T23:30:00Z')), { date: '2026-12-01', weekday: 2, minutes: 23 * 60 + 30 });
});

test('the night the clocks go forward (29 March 2026): 00:59 GMT, then 02:00 BST', () => {
  assert.equal(ukClock(at('2026-03-29T00:59:00Z')).minutes, 59);
  assert.equal(ukClock(at('2026-03-29T01:00:00Z')).minutes, 120);
});

test('BST starts: the same UTC instant is closed on Friday and open on Monday', () => {
  // Friday 27 March, GMT: 08:29 UTC is 08:29 local — before 08:30.
  assert.equal(isOpenAt(HOURS, at('2026-03-27T08:29:00Z')), false);
  // Monday 30 March, BST: 08:29 UTC is 09:29 local.
  assert.equal(isOpenAt(HOURS, at('2026-03-30T08:29:00Z')), true);
  // …and 07:30 UTC is 08:30 local: opening is inclusive.
  assert.equal(isOpenAt(HOURS, at('2026-03-30T07:30:00Z')), true);
  assert.equal(isOpenAt(HOURS, at('2026-03-30T07:29:00Z')), false);
});

test('BST ends (25 October 2026): closing time follows the local clock', () => {
  // Friday 23 October, BST: 16:59 UTC is 17:59 local (open), 17:00 UTC is 18:00 (closed — exclusive).
  assert.equal(isOpenAt(HOURS, at('2026-10-23T16:59:00Z')), true);
  assert.equal(isOpenAt(HOURS, at('2026-10-23T17:00:00Z')), false);
  // Monday 26 October, GMT: 17:30 UTC is 17:30 local — still open.
  assert.equal(isOpenAt(HOURS, at('2026-10-26T17:30:00Z')), true);
  assert.equal(isOpenAt(HOURS, at('2026-10-26T18:00:00Z')), false);
});

test('closed days: Sunday all day, Saturday outside its shorter window', () => {
  assert.equal(isOpenAt(HOURS, at('2026-07-05T11:00:00Z')), false, 'Sunday noon');
  assert.equal(isOpenAt(HOURS, at('2026-07-04T11:00:00Z')), true, 'Saturday 12:00 BST');
  assert.equal(isOpenAt(HOURS, at('2026-07-04T12:00:00Z')), false, 'Saturday 13:00 BST');
});

test('a bank holiday closes the whole day, judged by the London date', () => {
  // Monday 31 August 2026, 10:00 BST — a weekday window, but a bank holiday.
  assert.equal(isOpenAt(HOURS, at('2026-08-31T09:00:00Z')), false);
  assert.equal(isOpenAt(HOURS, at('2026-09-01T09:00:00Z')), true, 'the day after');

  // With a window around the clock, the London date — not the UTC one —
  // decides: 23:30 UTC on 30 June is already 1 July in London.
  const allDay = { opens: '00:00', closes: '23:59' };
  const roundTheClock: OpeningHours = {
    weekly: [allDay, allDay, allDay, allDay, allDay, allDay, allDay],
    bankHolidays: ['2026-07-01'],
    closures: [],
  };
  assert.equal(isOpenAt(roundTheClock, at('2026-06-30T22:30:00Z')), true, '23:30 BST on 30 June');
  assert.equal(isOpenAt(roundTheClock, at('2026-06-30T23:30:00Z')), false, '00:30 BST on 1 July');
});

test('an exceptional closure wins over the table, for exactly its span', () => {
  const hours: OpeningHours = {
    ...HOURS,
    closures: [{ from: '2026-07-01T12:00:00+01:00', until: '2026-07-01T14:00:00+01:00' }],
  };
  assert.equal(isOpenAt(hours, at('2026-07-01T10:59:00Z')), true, '11:59 BST');
  assert.equal(isOpenAt(hours, at('2026-07-01T11:00:00Z')), false, '12:00 BST');
  assert.equal(isOpenAt(hours, at('2026-07-01T13:00:00Z')), true, '14:00 BST — until is exclusive');
});

test('no hours, no status; a malformed window is closed, never open', () => {
  assert.equal(openStatus(null, at('2026-07-01T10:00:00Z')), null);
  assert.equal(openStatus(HOURS, at('2026-07-01T10:00:00Z')), 'open');
  assert.equal(openStatus(HOURS, at('2026-07-05T10:00:00Z')), 'closed');
  assert.deepEqual(OPEN_STATUS_LABELS, { open: 'Open now', closed: 'Closed' });

  const broken: OpeningHours = { ...HOURS, weekly: [null, { opens: '18:00', closes: '09:00' }, null, null, null, null, null] };
  assert.equal(isOpenAt(broken, at('2026-07-06T11:00:00Z')), false);
  const typo: OpeningHours = { ...HOURS, weekly: [null, { opens: '9am', closes: '17:00' }, null, null, null, null, null] };
  assert.equal(isOpenAt(typo, at('2026-07-06T11:00:00Z')), false);
});

test('the printed table is derived from the same hours: runs share a row', () => {
  assert.deepEqual(hoursRows(HOURS.weekly), [
    { days: 'Mon–Fri', hours: '8:30am – 6pm' },
    { days: 'Saturday', hours: '9am – 1pm' },
    { days: 'Sunday', hours: null },
  ]);
  assert.equal(formatClock('12:00'), '12pm');
  assert.equal(formatClock('00:00'), '12am');
  assert.equal(formatClock('17:05'), '5:05pm');
});

test('a configured table is checked, so a typo fails the build', () => {
  assert.deepEqual(hoursProblems(HOURS), []);
  const bad: OpeningHours = {
    weekly: [null, { opens: '25:00', closes: '17:00' }, { opens: '17:00', closes: '09:00' }, null, null, null, null],
    bankHolidays: ['31/08/2026', '2026-02-30', '2026-13-01'],
    closures: [
      { from: '2026-07-01T14:00:00Z', until: '2026-07-01T12:00:00Z' },
      // A local timestamp: each visitor's browser would read it in its own zone.
      { from: '2026-07-01T12:00:00', until: '2026-07-01T14:00:00+01:00' },
      // Date.parse would quietly move this to 2 March.
      { from: '2026-02-30T12:00:00Z', until: '2026-03-03T12:00:00Z' },
    ],
  };
  assert.equal(hoursProblems(bad).length, 8);
  assert.deepEqual(
    hoursProblems({ ...HOURS, bankHolidays: ['2028-02-29'], closures: [{ from: '2026-07-01T12:00:00.000Z', until: '2026-07-01T14:00+01:00' }] }),
    [],
    'a leap day, milliseconds and an hour-minute offset are all fine',
  );
  if (OPENING_HOURS) assert.deepEqual(hoursProblems(OPENING_HOURS), [], 'OPENING_HOURS');
});

test('the indicator re-checks as the minute turns', () => {
  assert.equal(msUntilNextMinute(at('2026-07-01T10:00:00.000Z')), 60_000);
  assert.equal(msUntilNextMinute(at('2026-07-01T10:00:59.250Z')), 750);
});

/* ---- The form's rules ------------------------------------------------------------- */

test('six subjects, in the design’s words and order — and never Private Table', () => {
  assert.deepEqual(
    ENQUIRY_TOPICS.map((topic) => topic.label),
    [
      'An existing order',
      'Placing a new order',
      'A dish, ingredients or allergens',
      'Delivery',
      'Gifting',
      'Something else',
    ],
  );
  for (const topic of ENQUIRY_TOPICS) {
    assert.doesNotMatch(`${topic.value} ${topic.label}`, /private|table/i, topic.label);
  }
  assert.equal(asksForOrderNumber('order'), true);
  for (const topic of ENQUIRY_TOPICS.filter((t) => t.value !== 'order')) {
    assert.equal(asksForOrderNumber(topic.value), false, topic.label);
  }
});

const draft = (over: Partial<EnquiryDraft> = {}): EnquiryDraft => ({
  name: 'Ada',
  email: 'ada@example.test',
  topic: 'dish',
  orderNumber: '',
  message: 'Does the egusi contain nuts?',
  ...over,
});

test('every required field fails with the design’s own message, in field order', () => {
  const errors = validateEnquiry(EMPTY_ENQUIRY);
  assert.deepEqual(errors, {
    name: ENQUIRY_MESSAGES.name,
    email: ENQUIRY_MESSAGES.emailMissing,
    topic: ENQUIRY_MESSAGES.topic,
    message: ENQUIRY_MESSAGES.messageMissing,
  });
  assert.equal(ENQUIRY_MESSAGES.name, 'Please enter your name.');
  assert.equal(ENQUIRY_MESSAGES.messageShort, 'Please add a little more detail so we can help.');
  assert.equal(firstInvalidField(errors), 'name');
  // Focus goes to the first error in FIELD order, not the first found.
  assert.equal(firstInvalidField({ message: 'x', email: 'y' }), 'email');
  assert.equal(firstInvalidField({}), null);
  assert.deepEqual(validateEnquiry(draft()), {});
});

test('email is checked permissively; a subject must be one of the six', () => {
  assert.equal(validateEnquiry(draft({ email: 'ada@example' })).email, ENQUIRY_MESSAGES.emailInvalid);
  assert.equal(validateEnquiry(draft({ email: 'ada example.test' })).email, ENQUIRY_MESSAGES.emailInvalid);
  assert.equal(validateEnquiry(draft({ email: '  ada+box@sub.example.co.uk ' })).email, undefined);
  assert.equal(validateEnquiry(draft({ topic: 'private-table' })).topic, ENQUIRY_MESSAGES.topic);
  // The design's pattern wanted two characters after the last dot.
  assert.equal(validateEnquiry(draft({ email: 'ada@example.c' })).email, ENQUIRY_MESSAGES.emailInvalid);
});

test('every field is capped, and a hostile one costs no more than a short one', () => {
  const name = 'A'.repeat(ENQUIRY_LIMITS.name);
  assert.equal(validateEnquiry(draft({ name })).name, undefined);
  assert.equal(validateEnquiry(draft({ name: `${name}A` })).name, ENQUIRY_MESSAGES.nameLong);
  const message = 'm'.repeat(ENQUIRY_LIMITS.message);
  assert.equal(validateEnquiry(draft({ message })).message, undefined);
  assert.equal(validateEnquiry(draft({ message: `${message}m` })).message, ENQUIRY_MESSAGES.messageLong);
  assert.match(ENQUIRY_MESSAGES.messageLong, /5,000 characters/);
  const order = toEnquiry(draft({ topic: 'order', orderNumber: '9'.repeat(ENQUIRY_LIMITS.orderNumber + 1) }));
  assert.ok('errors' in order, 'an over-long order number is refused, never truncated');

  // ~1MB in every field, the shape that made the old email pattern backtrack.
  const huge = `a@${'x.'.repeat(500_000)}@`;
  const started = performance.now();
  const errors = validateEnquiry(draft({ name: huge, email: huge, message: huge }));
  assert.ok(performance.now() - started < 200, 'linear, and stopped at the cap');
  assert.equal(errors.name, ENQUIRY_MESSAGES.nameLong);
  assert.equal(errors.email, ENQUIRY_MESSAGES.emailInvalid);
  assert.equal(errors.message, ENQUIRY_MESSAGES.messageLong);
});

test('a message needs at least 10 characters, counted as the customer sees them', () => {
  assert.equal(validateEnquiry(draft({ message: '123456789' })).message, ENQUIRY_MESSAGES.messageShort);
  assert.equal(validateEnquiry(draft({ message: '1234567890' })).message, undefined);
  assert.equal(validateEnquiry(draft({ message: '   12345   ' })).message, ENQUIRY_MESSAGES.messageShort);
  assert.equal(validateEnquiry(draft({ message: '      ' })).message, ENQUIRY_MESSAGES.messageMissing);
  // Nine emoji are nine characters, not eighteen UTF-16 units.
  assert.equal(validateEnquiry(draft({ message: '🙂'.repeat(9) })).message, ENQUIRY_MESSAGES.messageShort);
});

test('the order number is optional, and sent only for an existing order', () => {
  assert.deepEqual(validateEnquiry(draft({ topic: 'order', orderNumber: '' })), {});
  const withNumber = toEnquiry(draft({ topic: 'order', orderNumber: '  AT-1042 ' }));
  assert.ok('enquiry' in withNumber);
  assert.equal(withNumber.enquiry.orderNumber, 'AT-1042');
  const elsewhere = toEnquiry(draft({ topic: 'delivery', orderNumber: 'AT-1042' }));
  assert.ok('enquiry' in elsewhere);
  assert.equal(elsewhere.enquiry.orderNumber, null);
  const trimmed = toEnquiry(draft({ name: '  Ada  ', message: '  Does the egusi contain nuts?  ' }));
  assert.ok('enquiry' in trimmed);
  assert.equal(trimmed.enquiry.name, 'Ada');
  assert.equal(trimmed.enquiry.message, 'Does the egusi contain nuts?');
  assert.ok('errors' in toEnquiry(EMPTY_ENQUIRY));
});

const image = (name: string, type = 'image/jpeg', size = 1024) => ({ name, type, size });

test('JPG, PNG or HEIC — a typeless HEIC by its extension, and only then', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/heic', 'image/heif']) {
    assert.equal(isAcceptedImageType({ name: 'x', type }), true, type);
  }
  assert.equal(isAcceptedImageType({ name: 'photo.HEIC', type: '' }), true);
  assert.equal(isAcceptedImageType({ name: 'photo.heif', type: 'application/octet-stream' }), true);
  assert.equal(isAcceptedImageType({ name: 'photo.heic', type: 'application/pdf' }), false);
  assert.equal(isAcceptedImageType({ name: 'anim.gif', type: 'image/gif' }), false);
  assert.equal(ENQUIRY_IMAGE_ACCEPT, 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif');
});

test('10MB each: exactly 10MB attaches, a byte more is reported by name', () => {
  assert.equal(imageProblem(image('a.jpg', 'image/jpeg', MAX_ENQUIRY_IMAGE_BYTES)), null);
  assert.equal(
    imageProblem(image('big.jpg', 'image/jpeg', MAX_ENQUIRY_IMAGE_BYTES + 1)),
    'big.jpg is larger than 10MB.',
  );
  assert.equal(imageProblem(image('doc.pdf', 'application/pdf')), 'doc.pdf isn’t a JPG, PNG or HEIC.');
  // An empty photo would show as attached and arrive as nothing.
  assert.equal(imageProblem(image('blank.jpg', 'image/jpeg', 0)), IMAGE_MESSAGES.empty('blank.jpg'));
});

test('a pick keeps the valid files, names the invalid ones, and stops at three', () => {
  const first = addImages([], [image('a.jpg'), image('notes.pdf', 'application/pdf'), image('b.png', 'image/png')]);
  assert.deepEqual(first.attached.map((file) => file.name), ['a.jpg', 'b.png']);
  assert.deepEqual(first.problems, [IMAGE_MESSAGES.type('notes.pdf')]);

  // The same file again is skipped quietly; past the third, one message.
  const second = addImages(first.attached, [image('a.jpg'), image('c.jpg'), image('d.jpg'), image('e.jpg')]);
  assert.deepEqual(second.attached.map((file) => file.name), ['a.jpg', 'b.png', 'c.jpg']);
  assert.deepEqual(second.problems, ['You can attach up to 3 images.']);

  // Two different photos can share a name and a size (IMG_0001.jpg from two
  // phones); only the same file picked twice is skipped.
  const photo = { ...image('IMG_0001.jpg'), lastModified: 1 };
  const twin = { ...image('IMG_0001.jpg'), lastModified: 2 };
  assert.equal(addImages([photo], [twin]).attached.length, 2);
  assert.equal(addImages([photo], [{ ...photo }]).attached.length, 1);
});

test('the server refuses what the form would have trimmed', () => {
  assert.equal(imagesProblem([]), null);
  assert.equal(imagesProblem([image('a.jpg'), image('b.jpg'), image('c.jpg')]), null);
  assert.equal(imagesProblem([image('a.jpg'), image('b.jpg'), image('c.jpg'), image('d.jpg')]), IMAGE_MESSAGES.count);
  assert.equal(imagesProblem([image('a.jpg'), image('x.gif', 'image/gif')]), IMAGE_MESSAGES.type('x.gif'));
});

/* ---- Never a false "sent" ------------------------------------------------------------ */

function formOf(values: Partial<EnquiryDraft>, images: File[] = []): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...draft(), ...values })) form.set(key, value);
  for (const file of images) form.append('images', file, file.name);
  return form;
}

test('there is no enquiry endpoint yet, so this deployment cannot send — in either mode', async () => {
  assert.equal(ENQUIRY_PATH, null, 'aonik#356 has shipped? Wire it, then update this test and the spec');
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  assert.equal(await enquiriesAvailable(), false);
  env.AONIK_DATA_MODE = 'demo';
  assert.equal(await enquiriesAvailable(), false);
  delete env.AONIK_DATA_MODE;
});

test('the action re-checks every field and never answers "sent" without an endpoint', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response(null, { status: 201 });
  }) as typeof fetch;
  try {
    const empty = await sendEnquiryAction({ status: 'idle' }, new FormData());
    assert.equal(empty.status, 'invalid');
    assert.equal(empty.errors?.name, ENQUIRY_MESSAGES.name);

    const tooMany = await sendEnquiryAction(
      { status: 'idle' },
      formOf({}, ['a', 'b', 'c', 'd'].map((n) => new File(['x'], `${n}.jpg`, { type: 'image/jpeg' }))),
    );
    assert.equal(tooMany.status, 'invalid');
    assert.equal(tooMany.imageError, IMAGE_MESSAGES.count);

    // An empty file with a name is refused, never dropped and answered "sent";
    // only the nameless empty part a plain browser post sends for "no file" is ignored.
    const blank = await sendEnquiryAction(
      { status: 'idle' },
      formOf({}, [new File([], 'blank.jpg', { type: 'image/jpeg' })]),
    );
    assert.equal(blank.status, 'invalid');
    assert.equal(blank.imageError, IMAGE_MESSAGES.empty('blank.jpg'));
    const noFile = await sendEnquiryAction({ status: 'idle' }, formOf({}, [new File([], '')]));
    assert.equal(noFile.status, 'unavailable', 'the "no file" part is not an attachment');

    const valid = await sendEnquiryAction({ status: 'idle' }, formOf({}));
    assert.equal(valid.status, 'unavailable');
    assert.equal(requests, 0, 'nothing was sent anywhere');
  } finally {
    globalThis.fetch = original;
    delete env.AONIK_DATA_MODE;
  }
});

test('the request: multipart, the contract’s field names, the tenant, images under one key', () => {
  const result = toEnquiry(draft({ topic: 'order', orderNumber: 'AT-1042' }));
  assert.ok('enquiry' in result);
  const photo = new File(['jpeg'], 'okra.jpg', { type: 'image/jpeg' });
  const body = toEnquiryForm(result.enquiry, [photo]);
  assert.equal(body.get('name'), 'Ada');
  assert.equal(body.get('email'), 'ada@example.test');
  assert.equal(body.get('topic'), 'order');
  assert.equal(body.get('order_number'), 'AT-1042');
  assert.equal(body.get('message'), 'Does the egusi contain nuts?');
  assert.equal(body.getAll('images').length, 1);

  const noOrder = toEnquiry(draft());
  assert.ok('enquiry' in noOrder);
  assert.equal(toEnquiryForm(noOrder.enquiry, []).has('order_number'), false);
});

test('only a 2xx from the endpoint counts as accepted', async () => {
  const result = toEnquiry(draft());
  assert.ok('enquiry' in result);
  const original = globalThis.fetch;
  const seen: Array<{ url: string; init: RequestInit | undefined }> = [];
  let status = 201;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(input), init });
    return new Response(status === 201 ? '{}' : '{"error":"down"}', { status });
  }) as typeof fetch;
  const config = { baseUrl: AONIK_BASE, tenantId: TENANT_ID };
  try {
    await postEnquiry('/commerce/enquiries', config, result.enquiry, []);
    assert.equal(seen[0].url, `${AONIK_BASE}/commerce/enquiries`);
    assert.equal(seen[0].init?.method, 'POST');
    assert.ok(seen[0].init?.body instanceof FormData, 'multipart, not JSON');
    const headers = new Headers(seen[0].init?.headers);
    assert.equal(headers.get('X-Tenant-Id'), TENANT_ID);
    // fetch sets the multipart boundary itself; a JSON content type would break it.
    assert.equal(headers.get('Content-Type'), null);

    // An empty 200 or 201 is still the acceptance — not a parse failure that
    // would tell the customer nothing was sent and invite a duplicate.
    globalThis.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;
    await postEnquiry('/commerce/enquiries', config, result.enquiry, []);
    globalThis.fetch = (async () => new Response('', { status: 201 })) as typeof fetch;
    await postEnquiry('/commerce/enquiries', config, result.enquiry, []);

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      seen.push({ url: String(input), init });
      return new Response('{"error":"down"}', { status: 503 });
    }) as typeof fetch;
    status = 503;
    await assert.rejects(postEnquiry('/commerce/enquiries', config, result.enquiry, []));
  } finally {
    globalThis.fetch = original;
  }
});

/* ---- The page ------------------------------------------------------------------------ */

const textOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

test('as configured today: every route marked "to be confirmed", no dead link, no form', async () => {
  resetCookies();
  const html = renderToStaticMarkup(await ContactPage());
  const text = textOf(html);

  assert.equal(count(html, /<h1[ >]/g), 1);
  assert.match(html, /<h1 class="title">Contact us<\/h1>/);
  assert.match(text, /Choose the way you’d prefer to get in touch\./);

  // Nothing confirmed, so nothing linked: no mailto:, tel: or wa.me with no value.
  assert.equal(SUPPORT_CONTACT, null);
  assert.equal(WHATSAPP_CONTACT, null);
  assert.equal(OPENING_HOURS, null);
  assert.doesNotMatch(html, /href="(mailto|tel):/);
  assert.doesNotMatch(html, /wa\.me/);
  assert.equal(count(html, /data-tbc="config"/g), 4, 'WhatsApp, email, phone and hours');
  assert.doesNotMatch(text, /Open now/);

  // The form is held back, and nothing points at it.
  assert.doesNotMatch(html, /<form/);
  assert.doesNotMatch(html, /href="#send"/);
  assert.match(text, /Send us a message Our message form isn’t available yet\./);
  assert.doesNotMatch(text, /ways above/, 'there are no ways above yet');
  // …so the notice names the routes that do work: never a dead end.
  assert.match(html.replace(/<[^>]+>/g, ''), /In the meantime, you can reach us on Instagram, TikTok, Facebook or X\./);
  for (const { href } of SOCIAL_LINKS) assert.ok(html.includes(`href="${href}"`), href);
  assert.doesNotMatch(text, /Usually the quickest way/, 'no promise about a route that is not there');

  // No card linking this page to itself; with Delivery & FAQs built (#23) it goes there.
  if (DELIVERY_FAQS_HREF === CONTACT_HREF) {
    assert.doesNotMatch(text, /Browse our FAQs/);
    assert.match(html, /data-faqs="none"/);
  } else {
    assert.ok(html.includes(`href="${DELIVERY_FAQS_HREF}"`), 'the FAQs card links Delivery & FAQs');
    assert.doesNotMatch(html, /data-faqs="none"/);
  }
  // …and no "Join the waitlist" while the waitlist cannot take a name: the
  // page exists (#25), but this deployment has no published waitlist (aonik#357).
  assert.equal(PRIVATE_TABLE_WAITLIST_HREF, `${PRIVATE_TABLE_HREF}#enquire`);
  assert.equal(await waitlistOpen(), false);
  assert.doesNotMatch(text, /Join the waitlist|Interested in Private Table/);
  assert.doesNotMatch(html, /private-table/);
});

test('none of the design’s placeholder details is anywhere on the page', async () => {
  const html = renderToStaticMarkup(await ContactPage());
  for (const placeholder of ['3875', '442038751234', 'FromAbbysTable.co.uk', 'whatsapp-qr-placeholder', '9am', '10am']) {
    assert.ok(!html.includes(placeholder), placeholder);
  }
});

const sendStub: EnquiryAction = async () => ({ status: 'error' });

const CONFIGURED: ContactViewProps = {
  support: { email: 'hello@example.test', phone: { display: '01632 960000', e164: '+441632960000' } },
  whatsapp: { e164: '+44 7700 900123', qrSrc: '/assets/test-qr.png' },
  hours: HOURS,
  faqsHref: '/delivery-and-faqs',
  waitlistHref: '/private-table#enquire',
  sendAction: sendStub,
};

test('configured: each route is a real link, in the design’s DOM order', () => {
  const html = renderToStaticMarkup(<ContactView {...CONFIGURED} />);
  const text = textOf(html);

  assert.match(html, /href="https:\/\/wa\.me\/447700900123"/);
  assert.match(html, /href="mailto:hello@example\.test"/);
  assert.match(html, /href="tel:\+441632960000"/);
  // The address wraps only after the "@": a zero-width space, the domain kept whole.
  assert.ok(html.includes('hello@​<span class="nowrap">example.test'));
  assert.equal(count(html, /data-tbc=/g), 0);

  // The QR is the configured file, decorative inside the card link.
  assert.match(html, /<img alt=""[^>]*src="\/assets\/test-qr\.png"/);

  const order = [
    'methodWa',
    'methodEmail',
    'methodForm',
    'methodPhone',
    'id="contact-hours"',
    'Looking for something specific?',
    'methodFaqs',
    'Join the waitlist',
    'id="send"',
  ].map((marker) => html.indexOf(marker));
  assert.ok(order.every((index) => index !== -1), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);

  assert.match(html, /<a class="method methodForm" href="#send">/);
  assert.match(html, /<a class="method methodFaqs" href="\/delivery-and-faqs">/);
  assert.match(html, /<a class="ptCta" href="\/private-table#enquire">/);
  assert.doesNotMatch(html, /data-faqs=/);
  assert.match(text, /Send us a message Tell us how we can help\./);
});

test('configured hours: the table prints, the status waits for the browser', () => {
  const html = renderToStaticMarkup(<ContactView {...CONFIGURED} />);
  const text = textOf(html);
  assert.match(text, /Opening hours Mon–Fri 8:30am – 6pm Saturday 9am – 1pm Sunday Closed Closed on bank holidays\. UK time\./);
  assert.match(html, /<dl class="hoursTable"><dt>Mon–Fri<\/dt><dd>8:30am – 6pm<\/dd>/);
  // Never computed on the server: a static page would freeze it at build time.
  assert.match(html, /<p class="status"><\/p>/);
  assert.doesNotMatch(text, /Open now/);
  // The Phone card's control is a disclosure on the server render (phone first).
  assert.match(html, /aria-expanded="false" aria-controls="contact-hours"/);
});

test('the form, server-rendered: the six subjects, no order number yet, ours to validate', () => {
  const html = renderToStaticMarkup(<ContactForm action={sendStub} />);
  assert.match(html, /<form[^>]*novalidate=""/i);
  const options = [...html.matchAll(/<option value="([^"]*)"(?: selected="")?>([^<]*)<\/option>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(options, [['', 'Choose a subject'], ...ENQUIRY_TOPICS.map((t) => [t.value, t.label])]);
  assert.doesNotMatch(html, /Order number/);
  for (const label of ['Your name', 'Email address', 'What’s it about?', 'Your message']) {
    assert.ok(textOf(html).includes(`${label} *`), label);
  }
  // Only the attached list is sent: the hidden picker has no name.
  assert.match(html, /<input type="file" accept="image\/jpeg,image\/png,image\/heic,image\/heif,\.heic,\.heif" multiple="" tabindex="-1" aria-hidden="true"/);
  assert.doesNotMatch(html, /name="images"/);
  assert.match(html, /<button type="submit" class="send">Send message<\/button>/);
  assert.match(html, /<a class="privacyLink" href="\/privacy">Privacy Policy<\/a>/);
  assert.doesNotMatch(html, /role="alert"/, 'no failure before a send');
});

test('without a form, the Phone card stands alone and nothing jumps to a form', () => {
  const html = renderToStaticMarkup(<ContactView {...CONFIGURED} sendAction={undefined} />);
  assert.match(html, /class="method methodPhone methodWide"/);
  assert.doesNotMatch(html, /href="#send"/);
  assert.match(textOf(html), /Our message form isn’t available yet\. Please use one of the ways above to get in touch\./);
});

test('live: the Private Table panel shows while the waitlist is published with every service', async () => {
  resetCookies();
  clearPublishedListsCache();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  const services = WAITLIST_SERVICES.map(({ id, label }) => ({ id, label }));
  const waitlist = { listType: 'private-table', consentVersion: 'pt-1', consentText: 'Only about Private Table.', services };
  const pageText = async () => textOf(renderToStaticMarkup(await ContactPage()));
  try {
    useAonik(() => ({ status: 200, body: { lists: [waitlist] } }));
    assert.match(await pageText(), /Join the waitlist/);

    // A service the form offers is missing from the list: Aonik would refuse it, so no panel.
    clearPublishedListsCache();
    useAonik(() => ({ status: 200, body: { lists: [{ ...waitlist, services: services.slice(1) }] } }));
    const quiet = mock.method(console, 'error', () => undefined);
    try {
      assert.doesNotMatch(await pageText(), /Join the waitlist/);
    } finally {
      quiet.mock.restore();
    }
  } finally {
    delete process.env.AONIK_DATA_MODE;
    clearPublishedListsCache();
  }
});
