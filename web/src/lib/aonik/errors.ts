/**
 * Aonik's error envelope, typed.
 *
 * Aonik does not use one envelope shape — it uses three, and the differences
 * matter enough that guessing breaks real flows:
 *
 *   validation  { error: <message>, code: "commerce.…", rule?: "V5" }
 *   not found   { error: <message> }                      ← no code at all
 *   box drift   { error: "commerce.box_drift", message, box, quote, changes, cartVersion }
 *   cart write  { code: "commerce.cart_conflict" | "commerce.cart_locked", message,
 *                 cartId, cartVersion, status, orderId }
 *
 * Note the third: for drift, `error` holds the CODE and `message` holds the
 * text — the inverse of the first. A parser that only reads `code` never
 * detects the one error the whole checkout flow is built around. That is why
 * `code` here resolves from `code` first and then from an `error` that *looks
 * like* a code (a dotted lowercase token), rather than blindly falling back —
 * a blind fallback would turn a 404's human sentence into a "code".
 */

/** Codes the storefront branches on. Others pass through as plain strings. */
export const AONIK_CODES = {
  optionValidation: 'commerce.option_validation',
  storefrontValidation: 'commerce.storefront_validation',
  boxDrift: 'commerce.box_drift',
  /** A cart write sent no `X-Cart-Version`, or an older one (Aonik #347). */
  cartConflict: 'commerce.cart_conflict',
  /** The cart is not editable: a payment is in progress, or it was ordered. */
  cartLocked: 'commerce.cart_locked',
  /** The account already holds an active box, so a new one (a reorder) cannot start. */
  activeBoxExists: 'commerce.active_box_exists',
  /** Signing in with a guest box when the account holds a different one (#348). */
  boxChoiceRequired: 'commerce.box_choice_required',
  /** The keep/use-saved choice was made against boxes that have since moved on. */
  boxChoiceStale: 'commerce.box_choice_stale',
  /** The account already holds more than one active box; adoption cannot pick. */
  multipleActiveBoxes: 'commerce.multiple_active_boxes',
  /**
   * Two writes raced on the same row version and this one lost (Aonik's
   * `DbUpdateConcurrencyException`). On a cart it is the same as a conflict:
   * another tab's change landed first.
   */
  concurrencyConflict: 'concurrency_conflict',
} as const;

/** A dotted lowercase token, e.g. `commerce.box_drift`. */
const CODE_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+$/;

export interface AonikErrorBody {
  error?: unknown;
  message?: unknown;
  code?: unknown;
  rule?: unknown;
  box?: unknown;
  quote?: unknown;
  changes?: unknown;
  cartVersion?: unknown;
  status?: unknown;
  errors?: unknown;
  fieldErrors?: unknown;
}

export class AonikError extends Error {
  readonly status: number;
  /** Aonik's error code when it named one. */
  readonly code?: string;
  /** Spec 066 rule id (`V1`–`V12`) on option-validation failures. */
  readonly rule?: string;
  /** The request path, for logs — never shown to a customer. */
  readonly path: string;
  /**
   * The repaired box that rides a 409 drift body: `{ box, quote, changes }`,
   * unmapped. `server-box-cart` maps and re-renders it.
   */
  readonly drift?: { box: unknown; quote: unknown; changes: unknown; cartVersion?: string };
  /**
   * The cart's status as a refused write reported it (`Open`, `CheckedOut`,
   * `Abandoned`): whether the box is busy for now or finished for good.
   */
  readonly cartStatus?: string;
  /**
   * Per-field validation failures, keyed by Aonik's field name: FastEndpoints'
   * `errors` (a request validator's 422) or a service's own `fieldErrors`.
   * Absent when the refusal was not about a field.
   */
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  /**
   * The error body as parsed, for a refusal with details of its own (the
   * Contact form's `imageProblems`). Never shown to a customer as it is.
   */
  readonly body?: unknown;

  constructor(init: {
    status: number;
    path: string;
    message: string;
    code?: string;
    rule?: string;
    drift?: { box: unknown; quote: unknown; changes: unknown; cartVersion?: string };
    cartStatus?: string;
    fieldErrors?: Readonly<Record<string, readonly string[]>>;
    body?: unknown;
  }) {
    super(init.message);
    this.name = 'AonikError';
    this.status = init.status;
    this.path = init.path;
    this.code = init.code;
    this.rule = init.rule;
    this.drift = init.drift;
    this.cartStatus = init.cartStatus;
    this.fieldErrors = init.fieldErrors;
    this.body = init.body;
  }

  /** Catalogue drift at continue/checkout — Spec 068's A18 stop. */
  get isDrift(): boolean {
    return this.status === 409 && this.code === AONIK_CODES.boxDrift;
  }

  /**
   * The cart write was refused because the box is not the one it was based on
   * (`cart_conflict`, or a lost race on the same version, `concurrency_conflict`)
   * or cannot be edited now (`cart_locked`). Nothing changed; the box must be
   * re-read before anything else is attempted.
   */
  get isCartWriteRefused(): boolean {
    return (
      this.status === 409 &&
      (this.code === AONIK_CODES.cartConflict ||
        this.code === AONIK_CODES.cartLocked ||
        this.code === AONIK_CODES.concurrencyConflict)
    );
  }

  /**
   * Unknown OR unauthorized — Aonik makes these deliberately indistinguishable
   * (fail-closed, no existence oracle). UI copy must never speculate which.
   */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** Missing or expired customer session on an authenticated route. */
  get isUnauthenticated(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** `{ field: ["message", …] }`, keeping only well-formed entries; undefined when there are none. */
function asFieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const fields: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    const list = Array.isArray(messages) ? messages.filter((m): m is string => typeof m === 'string') : [];
    if (list.length > 0) fields[field] = list;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

/** Builds an `AonikError` from a non-2xx response body (which may be empty). */
export function toAonikError(status: number, path: string, body: unknown): AonikError {
  const envelope: AonikErrorBody = typeof body === 'object' && body !== null ? body : {};

  const errorField = asString(envelope.error);
  const messageField = asString(envelope.message);

  // Prefer an explicit code; otherwise accept `error` only when it is shaped
  // like a code, which is exactly the drift case.
  const explicitCode = asString(envelope.code);
  const codeFromError = errorField && CODE_PATTERN.test(errorField) ? errorField : undefined;
  const code = explicitCode ?? codeFromError;

  // Whichever field is not carrying the code is carrying the human text.
  const detail =
    (codeFromError ? messageField : errorField) ??
    messageField ??
    errorField ??
    `Aonik request failed with ${status}`;

  // The drift body carries the repaired box's new version too: Aonik saved the
  // repair, so the next write must be based on it.
  const driftVersion = asString(envelope.cartVersion);
  const drift =
    code === AONIK_CODES.boxDrift && envelope.box !== undefined
      ? {
          box: envelope.box,
          quote: envelope.quote,
          changes: envelope.changes,
          ...(driftVersion ? { cartVersion: driftVersion } : {}),
        }
      : undefined;

  return new AonikError({
    status,
    path,
    message: detail,
    code,
    rule: asString(envelope.rule),
    drift,
    cartStatus: asString(envelope.status),
    fieldErrors: asFieldErrors(envelope.fieldErrors) ?? asFieldErrors(envelope.errors),
    body,
  });
}
