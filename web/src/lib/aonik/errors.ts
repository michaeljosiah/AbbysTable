/**
 * Aonik's error envelope, typed.
 *
 * Aonik does not use one envelope shape — it uses three, and the differences
 * matter enough that guessing breaks real flows:
 *
 *   validation  { error: <message>, code: "commerce.…", rule?: "V5" }
 *   not found   { error: <message> }                      ← no code at all
 *   box drift   { error: "commerce.box_drift", message, box, quote, changes }
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
  readonly drift?: { box: unknown; quote: unknown; changes: unknown };

  constructor(init: {
    status: number;
    path: string;
    message: string;
    code?: string;
    rule?: string;
    drift?: { box: unknown; quote: unknown; changes: unknown };
  }) {
    super(init.message);
    this.name = 'AonikError';
    this.status = init.status;
    this.path = init.path;
    this.code = init.code;
    this.rule = init.rule;
    this.drift = init.drift;
  }

  /** Catalogue drift at continue/checkout — Spec 068's A18 stop. */
  get isDrift(): boolean {
    return this.status === 409 && this.code === AONIK_CODES.boxDrift;
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

  const drift =
    code === AONIK_CODES.boxDrift && envelope.box !== undefined
      ? { box: envelope.box, quote: envelope.quote, changes: envelope.changes }
      : undefined;

  return new AonikError({
    status,
    path,
    message: detail,
    code,
    rule: asString(envelope.rule),
    drift,
  });
}
