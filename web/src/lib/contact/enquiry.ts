/**
 * The Contact form's rules — subjects, validation, image attachments and the
 * action's outcome contract — free of React and the DOM, so the browser and
 * the server action run the SAME checks and both are unit-tested
 * (tests/contact.test.tsx).
 *
 * Sources: design/Abby's Table - Contact Us.dc.html (copy, verbatim),
 * build-handoff "Contact — what was settled", behaviour guide §10, contract
 * §3e. The browser's checks are a courtesy; the server action checks again,
 * and Aonik's enquiry endpoint (michaeljosiah/aonik#356) enforces type, size
 * and count once more, with real content sniffing — the rules here match its
 * limits (counted in UTF-16 units as it counts them) and clean what it would
 * refuse, so a valid form is a valid enquiry.
 */

import { isEmailAddress, MAX_EMAIL_LENGTH } from '@/lib/email';

/* ---- Subjects ------------------------------------------------------------------- */

/**
 * The six subjects, in the design's order and words. They exist to ROUTE
 * (contract §3e): "A dish, ingredients or allergens" is safety-relevant and
 * must never land in a general inbox. Private Table is deliberately NOT a
 * subject — those enquiries go to its own waitlist (build-handoff), so it must
 * never be added here.
 */
export const ENQUIRY_TOPICS = [
  { value: 'order', label: 'An existing order' },
  { value: 'new', label: 'Placing a new order' },
  { value: 'dish', label: 'A dish, ingredients or allergens' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'gift', label: 'Gifting' },
  { value: 'other', label: 'Something else' },
] as const;

export type EnquiryTopic = (typeof ENQUIRY_TOPICS)[number]['value'];

/** The one subject that asks for an (optional) order number. */
export const EXISTING_ORDER_TOPIC: EnquiryTopic = 'order';

export function isEnquiryTopic(value: string): value is EnquiryTopic {
  return ENQUIRY_TOPICS.some((topic) => topic.value === value);
}

/** Whether the order-number field is shown — and its value sent — for this subject. */
export function asksForOrderNumber(topic: string): boolean {
  return topic === EXISTING_ORDER_TOPIC;
}

/* ---- The fields ------------------------------------------------------------------ */

/** What the customer has typed, as typed. */
export interface EnquiryDraft {
  name: string;
  email: string;
  topic: string;
  orderNumber: string;
  message: string;
}

export const EMPTY_ENQUIRY: EnquiryDraft = {
  name: '',
  email: '',
  topic: '',
  orderNumber: '',
  message: '',
};

/**
 * The validated fields, in FIELD ORDER — the order focus takes when a submit
 * fails (build-handoff: "the first error in field order"). The order number is
 * never one of them: it is optional, and a required reference would block the
 * person most likely to need help.
 */
export const ENQUIRY_FIELDS = ['name', 'email', 'topic', 'message'] as const;

export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];

export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

/**
 * Not a count for its own sake: a two-word message cannot be answered, and
 * finding that out by reply wastes a day of the two the page promises.
 */
export const MESSAGE_MIN_CHARACTERS = 10;

/**
 * The longest each field may be — the input's `maxLength` and the action's
 * own check, so a crafted post cannot hand the server an unbounded string.
 * Characters (code points), which a UTF-16 `maxLength` can never exceed.
 */
export const ENQUIRY_LIMITS = {
  name: 200,
  email: MAX_EMAIL_LENGTH,
  orderNumber: 64,
  message: 5000,
} as const;

/**
 * Deliberately permissive (the design's own): stricter patterns reject valid
 * addresses, and the only real proof is a reply that arrives. It catches the
 * typos — no @, nothing after the dot, spaces — in linear time, with at least
 * two characters after the last dot as the design's pattern asked.
 */
function isEnquiryEmail(email: string): boolean {
  return isEmailAddress(email) && email.length - email.lastIndexOf('.') - 1 >= 2;
}

/** The design's messages, verbatim. */
export const ENQUIRY_MESSAGES = {
  name: 'Please enter your name.',
  emailMissing: 'Please enter your email address.',
  emailInvalid: 'Please enter a valid email address.',
  topic: 'Please choose what your message is about.',
  messageMissing: 'Please enter your message.',
  messageShort: 'Please add a little more detail so we can help.',
  nameLong: `Please shorten your name to ${ENQUIRY_LIMITS.name} characters or fewer.`,
  messageLong: `Please shorten your message to ${ENQUIRY_LIMITS.message.toLocaleString('en-GB')} characters or fewer.`,
  /** Not in the design: Aonik refused a name our rules accepted. */
  nameRefused: 'Please check your name.',
  /** Not in the design: Aonik refused a message our rules accepted. */
  messageRefused: 'Please check your message.',
} as const;

/**
 * Text as Aonik will take it: it refuses control characters — anywhere in a
 * name or an order number, and in a message all but line breaks and tabs. A
 * pasted one is a space (or, in a message, nothing), never a refusal the
 * customer cannot see the cause of.
 */
function cleanLine(text: string): string {
  return text.replace(/\p{Cc}+/gu, ' ').trim();
}
function cleanMessage(text: string): string {
  return text.replace(/[^\P{Cc}\t\n\r]/gu, '').trim();
}

/**
 * Over a limit as the customer sees it (characters) OR as Aonik counts it
 * (UTF-16 units — an emoji is two): Aonik refuses past its count, so ours never
 * lets through what it would refuse. Measured as SENT: a form post carries
 * every line break as CRLF, two units to Aonik, where a textarea's value
 * (and its `maxLength`) counts one — so the browser and the server agree.
 */
function overLimit(text: string, limit: number): boolean {
  const sent = text.replace(/\r\n|\r|\n/g, '\r\n');
  return sent.length > limit || charactersUpTo(sent, limit + 1) > limit;
}

/**
 * Characters, not UTF-16 units — an emoji is one character to the customer —
 * counted only as far as `stopAt`, so a huge string costs no more than a short one.
 */
function charactersUpTo(text: string, stopAt: number): number {
  const codePoints = text[Symbol.iterator]();
  let count = 0;
  while (count < stopAt && !codePoints.next().done) count += 1;
  return count;
}

/** Every problem with the draft, keyed by field. Empty when it can be sent. */
export function validateEnquiry(draft: EnquiryDraft): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const name = cleanLine(draft.name);
  const email = draft.email.trim();
  const message = cleanMessage(draft.message);

  if (!name) errors.name = ENQUIRY_MESSAGES.name;
  else if (overLimit(name, ENQUIRY_LIMITS.name)) errors.name = ENQUIRY_MESSAGES.nameLong;
  if (!email) errors.email = ENQUIRY_MESSAGES.emailMissing;
  else if (!isEnquiryEmail(email)) errors.email = ENQUIRY_MESSAGES.emailInvalid;
  if (!isEnquiryTopic(draft.topic)) errors.topic = ENQUIRY_MESSAGES.topic;
  if (!message) errors.message = ENQUIRY_MESSAGES.messageMissing;
  else {
    if (charactersUpTo(message, MESSAGE_MIN_CHARACTERS) < MESSAGE_MIN_CHARACTERS) {
      errors.message = ENQUIRY_MESSAGES.messageShort;
    } else if (overLimit(message, ENQUIRY_LIMITS.message)) {
      errors.message = ENQUIRY_MESSAGES.messageLong;
    }
  }

  return errors;
}

/** The field focus moves to after a failed submit, or null when none failed. */
export function firstInvalidField(errors: EnquiryErrors): EnquiryField | null {
  return ENQUIRY_FIELDS.find((field) => errors[field]) ?? null;
}

/** An enquiry ready to send: trimmed, with the order number only where it applies. */
export interface Enquiry {
  name: string;
  email: string;
  topic: EnquiryTopic;
  /** Only for "An existing order", and only when given. */
  orderNumber: string | null;
  message: string;
}

/** The draft as it is sent, or the errors that stop it. */
export function toEnquiry(draft: EnquiryDraft): { enquiry: Enquiry } | { errors: EnquiryErrors } {
  const errors = validateEnquiry(draft);
  if (firstInvalidField(errors) || !isEnquiryTopic(draft.topic)) return { errors };
  const orderNumber = asksForOrderNumber(draft.topic) ? cleanLine(draft.orderNumber) : '';
  // The field's maxLength stops this in the browser; only a crafted post gets here.
  if (overLimit(orderNumber, ENQUIRY_LIMITS.orderNumber)) return { errors };
  return {
    enquiry: {
      name: cleanLine(draft.name),
      email: draft.email.trim(),
      topic: draft.topic,
      orderNumber: orderNumber || null,
      message: cleanMessage(draft.message),
    },
  };
}

/* ---- Images ------------------------------------------------------------------------ */

/** Up to three photographs — the fastest way to show a problem with a dish or a delivery. */
export const MAX_ENQUIRY_IMAGES = 3;

/** 10MB each. */
export const MAX_ENQUIRY_IMAGE_BYTES = 10 * 1024 * 1024;

export const ENQUIRY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'] as const;

/**
 * The picker's `accept`. The two extensions are there because HEIC often
 * arrives with an empty MIME type from older phones (build-handoff), and a
 * desktop picker filtering by type alone would hide the file.
 */
export const ENQUIRY_IMAGE_ACCEPT = [...ENQUIRY_IMAGE_TYPES, '.heic', '.heif'].join(',');

/** The extensions Aonik accepts for each type, the first being the one to give. */
const UPLOAD_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic', '.heif'],
  'image/heif': ['.heif', '.heic'],
};

/** Longest name sent, in UTF-16 units: Aonik refuses one over 200. */
const UPLOAD_NAME_MAX = 150;

/**
 * The name an image is sent under. Aonik checks a file's bytes AND that its
 * name's extension matches them (an extension proves nothing alone, but one
 * that disagrees is refused) — so a JPEG saved as "photo.jfif", or pasted with
 * no name at all, is sent as "photo.jpg". The bytes are never touched, and a
 * typeless HEIC keeps the extension it was accepted by.
 *
 * Aonik also refuses a name with a path, a `:`, `<`, `>` or a control
 * character, or over 200 units ("Screenshot from 2016-05-18 14:23:15.png") —
 * as "couldn't be attached", which would blame a good photo. Those characters
 * become "-", and a long name is shortened before its extension.
 */
export function uploadName(name: string, type: string): string {
  const last = name.split(/[/\\]/).at(-1) ?? '';
  const safe = last.replace(/[:<>"\p{Cc}]/gu, '-').trim();
  const allowed = UPLOAD_EXTENSIONS[type];
  const lower = safe.toLowerCase();
  const kept = allowed ? allowed.find((extension) => lower.endsWith(extension)) : /\.[a-z0-9]{1,5}$/i.exec(safe)?.[0];
  const extension = kept ? safe.slice(safe.length - kept.length) : (allowed?.[0] ?? '');
  const stem = (kept ? safe.slice(0, safe.length - kept.length) : safe.replace(/\.[^.]*$/, '')).trim();
  // Shortened by code point, so an emoji is never cut in half.
  let short = '';
  for (const character of stem) {
    if (short.length + character.length > UPLOAD_NAME_MAX - extension.length) break;
    short += character;
  }
  return `${short.trim() || 'image'}${extension}`;
}

/** The parts of a `File` the rules read, so they are testable without one. */
export interface ImageCandidate {
  name: string;
  size: number;
  type: string;
  /** A picked `File` has one; two photos can share a name and a size. */
  lastModified?: number;
}

export const IMAGE_MESSAGES = {
  type: (name: string) => `${name} isn’t a JPG, PNG or HEIC.`,
  size: (name: string) => `${name} is larger than 10MB.`,
  empty: (name: string) => `${name} is empty.`,
  count: `You can attach up to ${MAX_ENQUIRY_IMAGES} images.`,
  /* Not in the design: what Aonik found on receiving them (its `imageProblems`). */
  unreadable: (name: string) => `${name} couldn’t be read. Please choose a JPG, PNG or HEIC.`,
  tooDetailed: (name: string) => `${name} is too large to process. Please choose a smaller image.`,
  refused: (name: string) => `${name} couldn’t be attached. Please choose another image.`,
  together: 'Your images are too large to send together. Please remove one and try again.',
} as const;

const HEIC_NAME = /\.hei[cf]$/i;

/**
 * JPG, PNG or HEIC. A HEIC with no usable MIME type is recognised by its
 * extension — only then: an extension proves nothing about the content, which
 * is why the endpoint must sniff it again.
 */
export function isAcceptedImageType(file: Pick<ImageCandidate, 'name' | 'type'>): boolean {
  if ((ENQUIRY_IMAGE_TYPES as readonly string[]).includes(file.type)) return true;
  const typeless = file.type === '' || file.type === 'application/octet-stream';
  return typeless && HEIC_NAME.test(file.name);
}

/** What is wrong with one file on its own, or null. */
export function imageProblem(file: ImageCandidate): string | null {
  if (!isAcceptedImageType(file)) return IMAGE_MESSAGES.type(file.name);
  // Shown as attached but carrying nothing: say so, never send it silently dropped.
  if (file.size === 0) return IMAGE_MESSAGES.empty(file.name);
  if (file.size > MAX_ENQUIRY_IMAGE_BYTES) return IMAGE_MESSAGES.size(file.name);
  return null;
}

/**
 * Adds a pick or a drop to the images already attached. Valid files attach
 * and invalid ones are reported BY NAME, rather than the whole selection being
 * rejected (behaviour guide §10). Past the third, the rest are refused with
 * one message. The same file picked twice (name and size) is skipped quietly.
 */
export function addImages<T extends ImageCandidate>(
  attached: readonly T[],
  incoming: readonly T[],
): { attached: T[]; problems: string[] } {
  const next = [...attached];
  const problems: string[] = [];
  for (const file of incoming) {
    const problem = imageProblem(file);
    if (problem) {
      problems.push(problem);
      continue;
    }
    // The same file picked twice, not two photos that happen to share a name and size.
    const same = (kept: T) =>
      kept.name === file.name && kept.size === file.size && kept.lastModified === file.lastModified;
    if (next.some(same)) continue;
    if (next.length >= MAX_ENQUIRY_IMAGES) {
      if (!problems.includes(IMAGE_MESSAGES.count)) problems.push(IMAGE_MESSAGES.count);
      continue;
    }
    next.push(file);
  }
  return { attached: next, problems };
}

/**
 * The server's check of what actually arrived: the first problem with the set,
 * or null. Unlike `addImages` it refuses rather than trims — the browser
 * already trimmed, so anything over the limits did not come from our form.
 */
export function imagesProblem(files: readonly ImageCandidate[]): string | null {
  if (files.length > MAX_ENQUIRY_IMAGES) return IMAGE_MESSAGES.count;
  for (const file of files) {
    const problem = imageProblem(file);
    if (problem) return problem;
  }
  return null;
}

/* ---- The action's outcome ------------------------------------------------------------- */

/**
 * What the send action reports. It RETURNS its outcome rather than throwing,
 * as the auth and newsletter actions do (a thrown error reaches the browser as
 * an opaque digest), and the form shows success ONLY for `status: 'sent'` —
 * which the action returns only once the enquiry endpoint has accepted the
 * enquiry. An action that swallows a failure cannot type-check its way into
 * "Thank you — your message has been sent."
 *
 * - `invalid`     the fields failed the shared rules (`errors`, `imageError`)
 * - `sent`        accepted by the endpoint; `email` is echoed on screen
 * - `error`       not sent (Aonik refused, was busy or down, or our own
 *                 per-customer limit — `limited`); everything typed stays
 * - `unavailable` this deployment cannot send (demo)
 *
 * `newSubmission` asks the form to send its next attempt under a fresh
 * submission reference: Aonik refused the one used, as belonging to different
 * details (`./submission`).
 */
export interface EnquiryState {
  status: 'idle' | 'invalid' | 'sent' | 'error' | 'unavailable';
  errors?: EnquiryErrors;
  imageError?: string;
  email?: string;
  newSubmission?: true;
  /** With `error`: too many sends from this address for now. */
  limited?: true;
}

export type EnquiryAction = (previous: EnquiryState, formData: FormData) => Promise<EnquiryState>;

/** Where the form posts when JavaScript runs (`app/api/enquiries/route.ts`). */
export const ENQUIRY_ROUTE = '/api/enquiries';

const STATUSES: ReadonlyArray<EnquiryState['status']> = ['idle', 'invalid', 'sent', 'error', 'unavailable'];

/**
 * An answer from `ENQUIRY_ROUTE` as the form may use it, or an `error` when it
 * is not one — except a 413 with no answer of ours, which a platform's own
 * body limit sends: trying again could never work, so it is the images.
 */
export function readEnquiryAnswer(body: unknown, httpStatus?: number): EnquiryState {
  const answer = body as Partial<EnquiryState> | null;
  if (typeof answer !== 'object' || answer === null || !STATUSES.includes(answer.status as EnquiryState['status'])) {
    return httpStatus === 413 ? { status: 'invalid', imageError: IMAGE_MESSAGES.together } : { status: 'error' };
  }
  return answer as EnquiryState;
}

/** The form's field names, shared by the form and the action. */
export const ENQUIRY_FORM_FIELDS = {
  name: 'name',
  email: 'email',
  topic: 'topic',
  orderNumber: 'orderNumber',
  message: 'message',
  images: 'images',
  /** The submission reference (`./submission`). */
  submissionId: 'submissionId',
} as const;

/** Reads a posted form back into a draft. Missing or non-text values are empty. */
export function draftFromForm(form: FormData): EnquiryDraft {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value : '';
  };
  return {
    name: text(ENQUIRY_FORM_FIELDS.name),
    email: text(ENQUIRY_FORM_FIELDS.email),
    topic: text(ENQUIRY_FORM_FIELDS.topic),
    orderNumber: text(ENQUIRY_FORM_FIELDS.orderNumber),
    message: text(ENQUIRY_FORM_FIELDS.message),
  };
}

/* ---- Aonik's refusal, in our words -------------------------------------------------- */

/** One entry of Aonik's `imageProblems`. */
interface ImageProblem {
  fileName: string;
  code: string;
}

function imageProblemsOf(body: unknown): ImageProblem[] {
  const list = (body as { imageProblems?: unknown } | null)?.imageProblems;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) => {
    const problem = entry as { fileName?: unknown; code?: unknown } | null;
    return typeof problem?.code === 'string'
      ? [{ fileName: typeof problem.fileName === 'string' && problem.fileName ? problem.fileName : 'An image', code: problem.code }]
      : [];
  });
}

function imageMessage(problem: ImageProblem): string {
  switch (problem.code) {
    case 'image_format':
      return IMAGE_MESSAGES.type(problem.fileName);
    case 'image_size':
      return IMAGE_MESSAGES.size(problem.fileName);
    case 'image_dimensions':
      return IMAGE_MESSAGES.tooDetailed(problem.fileName);
    case 'image_invalid':
      return IMAGE_MESSAGES.unreadable(problem.fileName);
    default:
      return IMAGE_MESSAGES.refused(problem.fileName);
  }
}

/**
 * Aonik's 422 (`contact.validation_failed`) as the form's own errors: its
 * `fieldErrors` keyed by OUR fields with OUR messages — never its text, which
 * names its field names — and the first of its `imageProblems` by file. Null
 * when it named nothing the customer can change (the submission reference, or
 * the request itself), which is a failure to send, said as one.
 */
export function enquiryRefusal(
  fieldErrors: Readonly<Record<string, readonly string[]>> | undefined,
  body: unknown,
): { errors: EnquiryErrors; imageError?: string } | null {
  const errors: EnquiryErrors = {};
  const fields = fieldErrors ?? {};
  if (fields.name) errors.name = ENQUIRY_MESSAGES.nameRefused;
  if (fields.email) errors.email = ENQUIRY_MESSAGES.emailInvalid;
  if (fields.topic) errors.topic = ENQUIRY_MESSAGES.topic;
  if (fields.message) errors.message = ENQUIRY_MESSAGES.messageRefused;
  const problems = imageProblemsOf(body);
  const imageError = problems.length > 0 ? imageMessage(problems[0]) : fields.images ? IMAGE_MESSAGES.count : undefined;
  if (!firstInvalidField(errors) && !imageError) return null;
  return imageError ? { errors, imageError } : { errors };
}
