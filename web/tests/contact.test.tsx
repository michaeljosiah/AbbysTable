import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { POST as postEnquiryRoute } from '../src/app/api/enquiries/route';
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
import { clearEnquiryAttempts, ENQUIRY_ATTEMPTS } from '../src/lib/contact/send';
import { addressFromHeaders, addressOf } from '../src/lib/request/clientAddress';
import { addressKey } from '../src/lib/request/rateLimit';
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
  readEnquiryAnswer,
  uploadName,
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
import { isSubmissionId, newSubmissionId, referenceFor, submissionKey } from '../src/lib/contact/submission';
import { clearPublishedListsCache } from '../src/lib/aonik/signupLists';
import { WAITLIST_SERVICES } from '../src/lib/content/privateTable';

import { AONIK_BASE, TENANT_ID, aonikRequests, configureAonik, useAonik, useAonik as stubAonik } from './support/aonik';
import { resetCookies, setRequestHeaders } from './support/next-headers';

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

const VALID_ID = '3f2b8c1e-9a4d-4e7b-8c21-5d6e7f8a9b0c';

test('enquiries go to Aonik in live mode only — demo never sends', async () => {
  assert.equal(ENQUIRY_PATH, '/v1/contact-enquiries');
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  try {
    assert.equal(await enquiriesAvailable(), true);
    env.AONIK_DATA_MODE = 'demo';
    assert.equal(await enquiriesAvailable(), false);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

test('the action re-checks every field and never sends what the form would refuse', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'demo' });
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response(null, { status: 202 });
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
    assert.equal(noFile.status, 'unavailable', 'the "no file" part is not an attachment; demo cannot send');

    assert.equal((await sendEnquiryAction({ status: 'idle' }, formOf({}))).status, 'unavailable');
    assert.equal(requests, 0, 'nothing was sent anywhere');
  } finally {
    globalThis.fetch = original;
    delete env.AONIK_DATA_MODE;
  }
});

test('what Aonik would refuse is cleaned or counted as it counts', () => {
  // Control characters: a pasted tab in a name is a space; in a message only line breaks and tabs stay.
  const cleaned = toEnquiry(draft({ name: 'Ada\tObi', message: 'Line one\r\nline\u0007 two\ttabbed.' }));
  assert.ok('enquiry' in cleaned);
  assert.equal(cleaned.enquiry.name, 'Ada Obi');
  assert.equal(cleaned.enquiry.message, 'Line one\r\nline two\ttabbed.');
  // Aonik counts UTF-16 units, as the browser's maxLength does: 2,501 emoji are 5,002.
  assert.equal(validateEnquiry(draft({ message: '🍲'.repeat(2501) })).message, ENQUIRY_MESSAGES.messageLong);
  assert.equal(validateEnquiry(draft({ message: '🍲'.repeat(2500) })).message, undefined);
  assert.equal(validateEnquiry(draft({ name: '🍲'.repeat(101) })).name, ENQUIRY_MESSAGES.nameLong);
  // A line break is posted as CRLF — two to Aonik — so it counts two here, in
  // the browser as on the server: 4,990 letters and five breaks are 5,000 sent…
  assert.equal(validateEnquiry(draft({ message: `${'a\n'.repeat(5)}${'a'.repeat(4985)}` })).message, undefined);
  // …4,991 and five are 5,001, though the textarea counts 4,996.
  assert.equal(validateEnquiry(draft({ message: `${'a\n'.repeat(5)}${'a'.repeat(4986)}` })).message, ENQUIRY_MESSAGES.messageLong);
  // The same post as the server receives it, breaks already CRLF: the same answer.
  assert.equal(validateEnquiry(draft({ message: `${'a\r\n'.repeat(5)}${'a'.repeat(4985)}` })).message, undefined);
  assert.equal(validateEnquiry(draft({ message: `${'a\r\n'.repeat(5)}${'a'.repeat(4986)}` })).message, ENQUIRY_MESSAGES.messageLong);
});

test('an image is sent under a name its type agrees with — Aonik refuses one that disagrees', () => {
  assert.equal(uploadName('okra.jpg', 'image/jpeg'), 'okra.jpg');
  assert.equal(uploadName('OKRA.JPEG', 'image/jpeg'), 'OKRA.JPEG');
  assert.equal(uploadName('okra.jfif', 'image/jpeg'), 'okra.jpg');
  assert.equal(uploadName('pasted', 'image/png'), 'pasted.png');
  assert.equal(uploadName('photo.heif', 'image/heic'), 'photo.heif');
  assert.equal(uploadName('photo.jpg', 'image/heic'), 'photo.heic');
  assert.equal(uploadName('IMG_1.HEIC', ''), 'IMG_1.HEIC', 'a typeless HEIC keeps the name it was accepted by');
  assert.equal(uploadName('.png', 'image/jpeg'), 'image.jpg');
});

test('an image name Aonik would refuse is made one it accepts — never "couldn’t be attached" for a good photo', () => {
  // Colons (GNOME screenshots, Android), angle brackets, quotes, controls.
  assert.equal(uploadName('Screenshot from 2016-05-18 14:23:15.png', 'image/png'), 'Screenshot from 2016-05-18 14-23-15.png');
  assert.equal(uploadName('a<b>"c".jpg', 'image/jpeg'), 'a-b--c-.jpg');
  assert.equal(uploadName('tab\there.jpg', 'image/jpeg'), 'tab-here.jpg');
  // No path, whichever separator.
  assert.equal(uploadName('C:\\Users\\ada\\okra.jpg', 'image/jpeg'), 'okra.jpg');
  assert.equal(uploadName('photos/okra.jfif', 'image/jpeg'), 'okra.jpg');
  // Long names keep their extension and stay well under Aonik's 200.
  const long = uploadName(`${'x'.repeat(3000)}.jpeg`, 'image/jpeg');
  assert.equal(long, `${'x'.repeat(145)}.jpeg`);
  assert.ok(long.length <= 150);
  const emoji = uploadName(`${'🍲'.repeat(100)}.png`, 'image/png');
  assert.equal(emoji, `${'🍲'.repeat(73)}.png`, 'never half an emoji');
  assert.equal(uploadName(':::.jpg', 'image/jpeg'), '---.jpg');
  assert.equal(uploadName('   .jpg', 'image/jpeg'), 'image.jpg');
});

test('the request: multipart, Aonik’s field names and reference, the tenant, images under one key', async () => {
  const result = toEnquiry(draft({ topic: 'order', orderNumber: 'AT-1042' }));
  assert.ok('enquiry' in result);
  const photo = new File(['jpeg'], 'okra.jfif', { type: 'image/jpeg' });
  const body = toEnquiryForm(result.enquiry, [photo], VALID_ID);
  assert.equal(body.get('submission_id'), VALID_ID);
  assert.equal(body.get('name'), 'Ada');
  assert.equal(body.get('email'), 'ada@example.test');
  assert.equal(body.get('topic'), 'order');
  assert.equal(body.get('order_number'), 'AT-1042');
  assert.equal(body.get('message'), 'Does the egusi contain nuts?');
  assert.equal((body.getAll('images')[0] as File).name, 'okra.jpg');

  const noOrder = toEnquiry(draft());
  assert.ok('enquiry' in noOrder);
  assert.equal(toEnquiryForm(noOrder.enquiry, [], VALID_ID).has('order_number'), false);

  const original = globalThis.fetch;
  const seen: Array<{ url: string; init: RequestInit | undefined }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(input), init });
    return new Response('{"id":"e-1","receivedAtUtc":"2026-10-10T09:00:00Z"}', { status: 202 });
  }) as typeof fetch;
  try {
    await postEnquiry({ baseUrl: AONIK_BASE, tenantId: TENANT_ID }, result.enquiry, [], VALID_ID);
    assert.equal(seen[0].url, `${AONIK_BASE}/v1/contact-enquiries`);
    assert.equal(seen[0].init?.method, 'POST');
    assert.ok(seen[0].init?.body instanceof FormData, 'multipart, not JSON');
    const headers = new Headers(seen[0].init?.headers);
    assert.equal(headers.get('X-Tenant-Id'), TENANT_ID);
    // fetch sets the multipart boundary itself; a JSON content type would break it.
    assert.equal(headers.get('Content-Type'), null);
  } finally {
    globalThis.fetch = original;
  }
});

/** Runs the action live against `reply`, returning its answer and what reached Aonik. */
async function sendLive(
  reply: { status: number; body?: unknown },
  form: FormData = formOf({}),
  requestHeaders: Record<string, string> = {},
) {
  resetCookies();
  clearEnquiryAttempts();
  setRequestHeaders(requestHeaders);
  configureAonik({ AONIK_DATA_MODE: 'live' });
  stubAonik(() => reply);
  const quiet = [mock.method(console, 'error', () => undefined), mock.method(console, 'warn', () => undefined)];
  try {
    return await sendEnquiryAction({ status: 'idle' }, form);
  } finally {
    for (const logged of quiet) logged.mock.restore();
    delete env.AONIK_DATA_MODE;
  }
}

test('"sent" only on Aonik’s 202, and with the reference the form kept', async () => {
  const form = formOf({});
  form.set('submissionId', VALID_ID);
  assert.deepEqual(await sendLive({ status: 202, body: { id: 'e-1', receivedAtUtc: '2026-10-10T09:00:00Z' } }, form), {
    status: 'sent',
    email: 'ada@example.test',
  });
  const [request] = aonikRequests;
  assert.equal(request.path, '/v1/contact-enquiries');

  // The customer's address goes with it — the one the platform appended, not
  // what the client claimed before it — and only when it is one.
  await sendLive({ status: 202 }, formOf({}), { 'x-forwarded-for': '198.51.100.7, 203.0.113.9:51234' });
  assert.equal(aonikRequests[0].headers['x-forwarded-for'], '203.0.113.9');
  await sendLive({ status: 202 }, formOf({}), { 'x-forwarded-for': 'unknown; drop table' });
  assert.equal(aonikRequests[0].headers['x-forwarded-for'], undefined);

  // No reference posted (no JavaScript): the action makes one rather than refuse.
  assert.equal((await sendLive({ status: 202 })).status, 'sent');
  // A post with something that is not a UUID is given a fresh one too.
  const odd = formOf({});
  odd.set('submissionId', 'not-a-uuid');
  assert.equal((await sendLive({ status: 202 }, odd)).status, 'sent');
});

test('Aonik’s refusals, in the form’s own words — never its text', async () => {
  const fields = await sendLive({
    status: 422,
    body: {
      code: 'contact.validation_failed',
      error: 'Check the enquiry fields and images before submitting.',
      fieldErrors: { email: ['Enter a valid email address of up to 254 characters.'], message: ['Enter a message of 10 to 5,000 characters.'] },
      imageProblems: [],
    },
  });
  assert.deepEqual(fields, {
    status: 'invalid',
    errors: { email: ENQUIRY_MESSAGES.emailInvalid, message: ENQUIRY_MESSAGES.messageRefused },
    imageError: undefined,
  });

  const images = await sendLive({
    status: 422,
    body: {
      code: 'contact.validation_failed',
      error: 'Check the enquiry fields and images before submitting.',
      fieldErrors: {},
      imageProblems: [{ index: 0, fileName: 'okra.jpg', code: 'image_format', message: 'Choose a JPG, PNG or HEIC image.' }],
    },
  });
  assert.deepEqual(images, { status: 'invalid', errors: undefined, imageError: IMAGE_MESSAGES.type('okra.jpg') });
  for (const [code, expected] of [
    ['image_dimensions', IMAGE_MESSAGES.tooDetailed('okra.jpg')],
    ['image_invalid', IMAGE_MESSAGES.unreadable('okra.jpg')],
    ['image_size', IMAGE_MESSAGES.size('okra.jpg')],
    ['infected', IMAGE_MESSAGES.refused('okra.jpg')],
  ] as const) {
    const answer = await sendLive({
      status: 422,
      body: { code: 'contact.validation_failed', fieldErrors: {}, imageProblems: [{ index: 0, fileName: 'okra.jpg', code }] },
    });
    assert.equal(answer.imageError, expected, code);
  }

  // A refusal of nothing the customer can change is a failure to send.
  assert.deepEqual(
    await sendLive({ status: 422, body: { code: 'contact.validation_failed', fieldErrors: { submission_id: ['Supply a submission ID.'] } } }),
    { status: 'error' },
  );
  assert.deepEqual(await sendLive({ status: 413 }), { status: 'invalid', imageError: IMAGE_MESSAGES.together });
  // The reference belongs to other details: the next attempt takes a fresh one.
  assert.deepEqual(await sendLive({ status: 409, body: { code: 'contact.submission_conflict', error: 'Used.' } }), {
    status: 'error',
    newSubmission: true,
  });
  // A 503 is nearly always passing (image slots full, the scanner or storage
  // down, an unknown commit): try again, under the same reference — never
  // "can't be sent from this page".
  assert.deepEqual(await sendLive({ status: 503, body: { code: 'contact.unavailable', error: 'Unavailable.' } }), {
    status: 'error',
  });
  // Aonik's 429 is its upload slots, or its limit counting the whole site (it
  // sees only the storefront's address): never "you've sent several".
  assert.deepEqual(await sendLive({ status: 429 }), { status: 'error' });
});

test('the address: the platform’s own entry, its port dropped, nothing that is not one', () => {
  const from = (entries: Record<string, string>) => addressFromHeaders(new Headers(entries));
  // The client can prepend anything; only the last entry is the proxy's.
  assert.equal(from({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }), '203.0.113.9');
  assert.equal(from({ 'x-forwarded-for': '203.0.113.9:51234' }), '203.0.113.9');
  assert.equal(from({ 'x-forwarded-for': '[2001:db8::1]:443' }), '2001:db8::1');
  assert.equal(from({ 'x-forwarded-for': '2001:db8::1' }), '2001:db8::1');
  assert.equal(from({ 'x-forwarded-for': '1.2.3.4, unknown' }), null, 'never an earlier, client-written entry');
  assert.equal(from({ 'x-real-ip': '198.51.100.4' }), '198.51.100.4');
  assert.equal(from({}), null);
  assert.equal(addressOf('drop table'), null);
  assert.equal(addressOf('1.2.3.4:99999999'), null);
  // Behind two proxies (a CDN in front), the customer is two from the end.
  process.env.TRUSTED_PROXY_HOPS = '2';
  try {
    assert.equal(from({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9, 198.51.100.200' }), '203.0.113.9');
    assert.equal(from({ 'x-forwarded-for': '198.51.100.200' }), null, 'fewer entries than proxies: none trusted');
  } finally {
    delete process.env.TRUSTED_PROXY_HOPS;
  }
  // The /64 an IPv6 host can choose from is one key; IPv4 is itself.
  assert.equal(addressKey('2001:db8:1:2::5'), '2001:db8:1:2::/64');
  assert.equal(addressKey('2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd'), '2001:db8:1:2::/64');
  assert.equal(addressKey('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(addressKey('::1'), '0:0:0:0::/64');
  assert.equal(addressKey('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(addressKey('203.0.113.9'), '203.0.113.9');
});

test('one address may send a few enquiries in a few minutes, then is asked to wait', async () => {
  const address = { 'x-forwarded-for': '203.0.113.20' };
  for (let attempt = 1; attempt <= ENQUIRY_ATTEMPTS; attempt += 1) {
    // sendLive clears the count, so make the earlier attempts by hand.
    if (attempt === 1) await sendLive({ status: 202 }, formOf({}), address);
    else {
      setRequestHeaders(address);
      configureAonik({ AONIK_DATA_MODE: 'live' });
      try {
        assert.equal((await sendEnquiryAction({ status: 'idle' }, formOf({}))).status, 'sent', String(attempt));
      } finally {
        delete env.AONIK_DATA_MODE;
      }
    }
  }
  setRequestHeaders(address);
  configureAonik({ AONIK_DATA_MODE: 'live' });
  try {
    aonikRequests.length = 0;
    assert.deepEqual(await sendEnquiryAction({ status: 'idle' }, formOf({})), { status: 'error', limited: true });
    assert.equal(aonikRequests.length, 0, 'nothing sent');
    // A form the rules refuse costs nothing.
    assert.equal((await sendEnquiryAction({ status: 'idle' }, formOf({ email: 'nope' }))).status, 'invalid');
    // Another address is its own count.
    setRequestHeaders({ 'x-forwarded-for': '203.0.113.21' });
    assert.equal((await sendEnquiryAction({ status: 'idle' }, formOf({}))).status, 'sent');
  } finally {
    delete env.AONIK_DATA_MODE;
    clearEnquiryAttempts();
  }
});

test('a retry of the same content keeps its reference; any change takes a new one', () => {
  const fields = { name: 'Ada', email: 'ada@example.test', topic: 'dish', orderNumber: '', message: 'Does the egusi contain nuts?' };
  const photo = { name: 'okra.jpg', size: 10, lastModified: 1 };
  const first = referenceFor(null, submissionKey(fields, [photo]));
  assert.ok(isSubmissionId(first.id));
  assert.equal(referenceFor(first, submissionKey({ ...fields }, [{ ...photo }])).id, first.id, 'unchanged: the same');
  assert.notEqual(referenceFor(first, submissionKey({ ...fields, message: 'Does the egusi contain peanuts?' }, [photo])).id, first.id);
  assert.notEqual(referenceFor(first, submissionKey(fields, [])).id, first.id, 'an image removed');
  assert.notEqual(referenceFor(null, submissionKey(fields, [photo])).id, first.id, 'after Aonik asked for a new one');
  assert.equal(isSubmissionId('00000000-0000-0000-0000-000000000000'), false, 'never the nil UUID');
  for (let i = 0; i < 20; i += 1) assert.ok(isSubmissionId(newSubmissionId()));
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

test('live: the page offers the form — there is somewhere real to send it', async () => {
  resetCookies();
  clearPublishedListsCache();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  useAonik(() => ({ status: 200, body: { lists: [] } }));
  try {
    const html = renderToStaticMarkup(await ContactPage());
    assert.match(html, /<form/);
    assert.match(textOf(html), /Send message/);
    assert.doesNotMatch(textOf(html), /Our message form isn’t available yet/);
  } finally {
    delete env.AONIK_DATA_MODE;
    clearPublishedListsCache();
  }
});

/* ---- /api/enquiries: the door photos fit through ------------------------------------------ */

function enquiryRequest(form: FormData, headers: Record<string, string> = {}): Request {
  const request = new Request('http://shop.test/api/enquiries', { method: 'POST', body: form, headers });
  return request;
}

/** A request whose body has been measured, as a browser's fetch of a FormData is. */
async function measured(form: FormData, extra: Record<string, string> = {}): Promise<Request> {
  const probe = new Request('http://shop.test/api/enquiries', { method: 'POST', body: form });
  const bytes = await probe.arrayBuffer();
  return new Request('http://shop.test/api/enquiries', {
    method: 'POST',
    body: bytes,
    headers: { 'content-type': probe.headers.get('content-type') ?? '', 'content-length': String(bytes.byteLength), ...extra },
  });
}

test('the route answers what the action answers, as JSON — photos and all', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  useAonik(() => ({ status: 202, body: { id: 'e-1', receivedAtUtc: '2026-10-10T09:00:00Z' } }));
  try {
    const form = formOf({}, [new File(['jpeg'], 'okra.jpg', { type: 'image/jpeg' })]);
    form.set('submissionId', VALID_ID);
    const response = await postEnquiryRoute(await measured(form, { origin: 'http://shop.test', host: 'shop.test' }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { status: 'sent', email: 'ada@example.test' });
    assert.equal(aonikRequests.length, 1);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

test('the route refuses what it must, before reading a byte', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'demo' });
  try {
    const crossSite = await postEnquiryRoute(await measured(formOf({}), { origin: 'https://elsewhere.example', host: 'shop.test' }));
    assert.equal(crossSite.status, 403, 'no other site sends enquiries through a visitor');
    // Behind a proxy the forwarded host is the site's own.
    const proxied = await postEnquiryRoute(
      await measured(formOf({}), { origin: 'https://abbystable.example', host: '10.0.0.4:3000', 'x-forwarded-host': 'abbystable.example' }),
    );
    assert.notEqual(proxied.status, 403);
    // …or, where the proxy forwards its own name, the Host the customer used — as Next accepts.
    const custom = await postEnquiryRoute(
      await measured(formOf({}), { origin: 'https://abbystable.example', host: 'abbystable.example', 'x-forwarded-host': 'app.azurestaticapps.net' }),
    );
    assert.notEqual(custom.status, 403);
    const nullOrigin = await postEnquiryRoute(await measured(formOf({}), { origin: 'null', host: 'shop.test' }));
    assert.equal(nullOrigin.status, 403);

    const unmeasured = enquiryRequest(formOf({}));
    assert.equal((await postEnquiryRoute(unmeasured)).status, 411);

    const huge = new Request('http://shop.test/api/enquiries', {
      method: 'POST',
      body: 'x',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(33 * 1024 * 1024) },
    });
    const tooBig = await postEnquiryRoute(huge);
    assert.equal(tooBig.status, 413);
    assert.deepEqual(await tooBig.json(), { status: 'invalid', imageError: IMAGE_MESSAGES.together });

    const json = new Request('http://shop.test/api/enquiries', {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json', 'content-length': '2' },
    });
    assert.equal((await postEnquiryRoute(json)).status, 415);

    // Demo cannot send, and says so in the body the form reads.
    assert.deepEqual(await (await postEnquiryRoute(await measured(formOf({})))).json(), { status: 'unavailable' });

    env.MAINTENANCE_MODE = 'true';
    const down = await postEnquiryRoute(await measured(formOf({})));
    assert.equal(down.status, 503);
    assert.equal(down.headers.get('retry-after'), '3600');
  } finally {
    delete env.MAINTENANCE_MODE;
    delete env.AONIK_DATA_MODE;
  }
});

test('the form reads only a real answer from the route', () => {
  assert.deepEqual(readEnquiryAnswer({ status: 'sent', email: 'ada@example.test' }), { status: 'sent', email: 'ada@example.test' });
  for (const body of [null, 'nope', {}, { status: 'joined' }, { error: 'down' }]) {
    assert.deepEqual(readEnquiryAnswer(body), { status: 'error' }, JSON.stringify(body));
  }
  // A platform's own body limit answers 413 with no answer of ours: trying
  // again could never work, so it is the images, not "try again".
  assert.deepEqual(readEnquiryAnswer(null, 413), { status: 'invalid', imageError: IMAGE_MESSAGES.together });
  assert.deepEqual(readEnquiryAnswer(null, 502), { status: 'error' });
});

test('the route limits each address and reads only a few bodies at once', async () => {
  resetCookies();
  clearEnquiryAttempts();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  // Aonik holds every send until released.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let sends = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    sends += 1;
    await held;
    return new Response(JSON.stringify({ id: 'e-1' }), { status: 202, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  /** Starts a post from `address` and waits until it is being sent (wrapped: awaiting it would wait for the answer). */
  const sendFrom = async (address: string) => {
    setRequestHeaders({ 'x-forwarded-for': address });
    const before = sends;
    const response = postEnquiryRoute(await measured(formOf({})));
    for (let spin = 0; spin < 200 && sends === before; spin += 1) await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sends, before + 1, `${address} is being sent`);
    return { response };
  };
  try {
    const { response: first } = await sendFrom('203.0.113.31');
    // The same address again while its first is in flight: busy, and no attempt spent.
    const again = await postEnquiryRoute(await measured(formOf({})));
    assert.equal(again.status, 503);
    assert.deepEqual(await again.json(), { status: 'error' });
    // Three more addresses fill the four slots; a fifth is told to try again.
    const others = [
      (await sendFrom('203.0.113.32')).response,
      (await sendFrom('203.0.113.33')).response,
      (await sendFrom('203.0.113.34')).response,
    ];
    setRequestHeaders({ 'x-forwarded-for': '203.0.113.35' });
    const busy = await postEnquiryRoute(await measured(formOf({})));
    assert.equal(busy.status, 503);
    release();
    const settled = await Promise.all([first, ...others]);
    assert.deepEqual(settled.map((response) => response.status), [200, 200, 200, 200]);

    // One address, past its limit: refused before its body is read. The busy
    // refusal above cost 203.0.113.31 nothing, so it has seven left.
    setRequestHeaders({ 'x-forwarded-for': '203.0.113.31' });
    for (let attempt = 1; attempt < ENQUIRY_ATTEMPTS; attempt += 1) {
      assert.equal((await postEnquiryRoute(await measured(formOf({})))).status, 200, String(attempt));
    }
    const limited = await postEnquiryRoute(await measured(formOf({})));
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { status: 'error', limited: true });
    // An IPv6 host is counted by its /64: another address in it is the same customer.
    clearEnquiryAttempts();
    for (let attempt = 0; attempt < ENQUIRY_ATTEMPTS; attempt += 1) {
      setRequestHeaders({ 'x-forwarded-for': `2001:db8:1:2::${attempt + 1}` });
      assert.equal((await postEnquiryRoute(await measured(formOf({})))).status, 200);
    }
    setRequestHeaders({ 'x-forwarded-for': '2001:db8:1:2:ffff::9' });
    assert.equal((await postEnquiryRoute(await measured(formOf({})))).status, 429);
  } finally {
    globalThis.fetch = original;
    delete env.AONIK_DATA_MODE;
    clearEnquiryAttempts();
  }
});

test('a body that stalls is abandoned rather than holding its slot', async () => {
  resetCookies();
  clearEnquiryAttempts();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  const warn = mock.method(console, 'warn', () => undefined);
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    setRequestHeaders({ 'x-forwarded-for': '203.0.113.60' });
    // Declares a body and sends a first chunk, then nothing.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('--x\r\n'));
      },
    });
    const request = new Request('http://shop.test/api/enquiries', {
      method: 'POST',
      body: stream,
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': '5000' },
      duplex: 'half',
    } as RequestInit);
    const pending = postEnquiryRoute(request);
    for (let spin = 0; spin < 50; spin += 1) await new Promise((resolve) => setImmediate(resolve));
    mock.timers.tick(15_000);
    const response = await pending;
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { status: 'error' });
  } finally {
    mock.timers.reset();
    warn.mock.restore();
    delete env.AONIK_DATA_MODE;
    clearEnquiryAttempts();
  }
});
