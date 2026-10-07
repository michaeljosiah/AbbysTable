/**
 * The Contact form's rules — subjects, validation, image attachments and the
 * action's outcome contract — free of React and the DOM, so the browser and
 * the server action run the SAME checks and both are unit-tested
 * (tests/contact.test.tsx).
 *
 * Sources: design/Abby's Table - Contact Us.dc.html (copy, verbatim),
 * build-handoff "Contact — what was settled", behaviour guide §10, contract
 * §3e. The browser's checks are a courtesy; the server action checks again,
 * and the enquiry endpoint (michaeljosiah/aonik#356) must enforce type, size
 * and count once more, with real content sniffing.
 */

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
 * Deliberately permissive (the design's own): stricter patterns reject valid
 * addresses, and the only real proof is a reply that arrives. It catches the
 * typos — no @, nothing after the dot, spaces.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The design's messages, verbatim. */
export const ENQUIRY_MESSAGES = {
  name: 'Please enter your name.',
  emailMissing: 'Please enter your email address.',
  emailInvalid: 'Please enter a valid email address.',
  topic: 'Please choose what your message is about.',
  messageMissing: 'Please enter your message.',
  messageShort: 'Please add a little more detail so we can help.',
} as const;

/** Characters, not UTF-16 units: an emoji is one character to the customer. */
const characters = (text: string) => [...text].length;

/** Every problem with the draft, keyed by field. Empty when it can be sent. */
export function validateEnquiry(draft: EnquiryDraft): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const name = draft.name.trim();
  const email = draft.email.trim();
  const message = draft.message.trim();

  if (!name) errors.name = ENQUIRY_MESSAGES.name;
  if (!email) errors.email = ENQUIRY_MESSAGES.emailMissing;
  else if (!EMAIL_PATTERN.test(email)) errors.email = ENQUIRY_MESSAGES.emailInvalid;
  if (!isEnquiryTopic(draft.topic)) errors.topic = ENQUIRY_MESSAGES.topic;
  if (!message) errors.message = ENQUIRY_MESSAGES.messageMissing;
  else if (characters(message) < MESSAGE_MIN_CHARACTERS) errors.message = ENQUIRY_MESSAGES.messageShort;

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
  const orderNumber = asksForOrderNumber(draft.topic) ? draft.orderNumber.trim() : '';
  return {
    enquiry: {
      name: draft.name.trim(),
      email: draft.email.trim(),
      topic: draft.topic,
      orderNumber: orderNumber || null,
      message: draft.message.trim(),
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

/** The parts of a `File` the rules read, so they are testable without one. */
export interface ImageCandidate {
  name: string;
  size: number;
  type: string;
}

export const IMAGE_MESSAGES = {
  type: (name: string) => `${name} isn’t a JPG, PNG or HEIC.`,
  size: (name: string) => `${name} is larger than 10MB.`,
  count: `You can attach up to ${MAX_ENQUIRY_IMAGES} images.`,
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
    if (next.some((kept) => kept.name === file.name && kept.size === file.size)) continue;
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
 * - `error`       the endpoint failed; everything typed stays in the form
 * - `unavailable` this deployment cannot send at all (no endpoint yet)
 */
export interface EnquiryState {
  status: 'idle' | 'invalid' | 'sent' | 'error' | 'unavailable';
  errors?: EnquiryErrors;
  imageError?: string;
  email?: string;
}

export type EnquiryAction = (previous: EnquiryState, formData: FormData) => Promise<EnquiryState>;

/** The form's field names, shared by the form and the action. */
export const ENQUIRY_FORM_FIELDS = {
  name: 'name',
  email: 'email',
  topic: 'topic',
  orderNumber: 'orderNumber',
  message: 'message',
  images: 'images',
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
