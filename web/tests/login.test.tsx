import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import ForgotPasswordPage from '../src/app/(site)/forgot-password/page';
import LoginPage from '../src/app/(site)/login/page';
import { loginAction, requestPasswordResetAction } from '../src/lib/auth/actions';
import { LOGIN_MESSAGES, SIGN_IN_REFUSED, emailProblem } from '../src/lib/auth/messages';
import { FORGOT_PASSWORD_PATH, requestPasswordReset } from '../src/lib/auth/passwordReset';
import { loginPathFor, safePostAuthPath, sessionRefreshPath } from '../src/lib/auth/redirect';
import { SESSION_COOKIE } from '../src/lib/auth/session';
import { FORGOT_PASSWORD_HREF } from '../src/lib/content/navigation';

import { aonikRequests, configureAonik, TENANT_ID, useAonik } from './support/aonik';
import { cookieValue, resetCookies, setRequestHeaders } from './support/next-headers';

/*
 * Log in v2 (#33): the page, its messages, the neutral refusal, the password
 * reset and where /register went — against a stubbed Aonik.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

beforeEach(() => resetCookies());

const TOKEN = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 300, tokenType: 'Bearer', idToken: null };

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

/** The path a server action's `redirect()` threw. */
async function redirectedTo(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? '';
    if (digest.startsWith('NEXT_REDIRECT')) return digest.split(';')[2];
    throw error;
  }
  assert.fail('expected a redirect');
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* ---- The page -------------------------------------------------------------- */

test('Log in carries the design: Welcome back, the two fields, Forgot your password?, Log in', async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));

  assert.match(html, /<h1[^>]*>Welcome back<\/h1>/);
  assert.match(text(html), /Log in to your Abby’s Table account\./);
  assert.match(html, /type="email"[^>]*autoComplete="email"|autoComplete="email"[^>]*type="email"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /aria-label="Show password"/);
  assert.match(html, new RegExp(`href="${FORGOT_PASSWORD_HREF}"`));
  assert.match(text(html), /Forgot your password\?/);
  assert.match(html, /<button[^>]*type="submit"[^>]*>Log in<\/button>/);
});

test('Log in leaves out what Aonik has no backend for, and the retired sign-up', async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  const read = text(html);

  assert.doesNotMatch(read, /Keep me signed in/);
  assert.doesNotMatch(read, /Google|Apple/);
  assert.doesNotMatch(read, /Create (your )?account|New to Abby/);
  assert.doesNotMatch(html, /href="\/register"/);
});

test('Log in carries the return path through the form, and does not bounce a signed-in visitor', async () => {
  resetCookies({
    [SESSION_COOKIE]: JSON.stringify({ accessToken: 'a', expiresAt: Date.now() + 3_600_000, email: 'ada@example.com' }),
  });
  const html = renderToStaticMarkup(
    await LoginPage({ searchParams: Promise.resolve({ next: '/account/orders?page=2' }) }),
  );

  assert.match(html, /name="next"[^>]*value="\/account\/orders\?page=2"|value="\/account\/orders\?page=2"[^>]*name="next"/);
  assert.match(html, /<h1[^>]*>Welcome back<\/h1>/);
});

/* ---- Messages and the neutral refusal --------------------------------------- */

test('the email rule says one thing when empty and another when malformed', () => {
  assert.equal(emailProblem(''), LOGIN_MESSAGES.emailMissing);
  assert.equal(emailProblem('ada'), LOGIN_MESSAGES.emailInvalid);
  assert.equal(emailProblem('ada@nowhere'), LOGIN_MESSAGES.emailInvalid);
  assert.equal(emailProblem('ada@example.com'), undefined);
  assert.equal(LOGIN_MESSAGES.emailMissing, 'Enter your email address.');
  assert.equal(LOGIN_MESSAGES.emailInvalid, 'Enter an email address in the format name@example.com.');
  assert.equal(LOGIN_MESSAGES.passwordMissing, 'Enter your password.');
});

test('log in validates before it asks Aonik anything', async () => {
  useAonik(() => undefined);

  assert.deepEqual(await loginAction({ status: 'idle' }, form({ email: '', password: '' })), {
    status: 'error',
    fieldErrors: { email: LOGIN_MESSAGES.emailMissing, password: LOGIN_MESSAGES.passwordMissing },
  });
  assert.deepEqual(await loginAction({ status: 'idle' }, form({ email: 'ada', password: 'x' })), {
    status: 'error',
    fieldErrors: { email: LOGIN_MESSAGES.emailInvalid },
  });
  assert.equal(aonikRequests.length, 0);
});

test('a refused password is one neutral line, never Aonik’s own wording', async () => {
  useAonik((request) =>
    request.path === '/auth/token' ? { status: 400, body: { error: 'No user ada@example.com in realm' } } : undefined,
  );

  const state = await loginAction({ status: 'idle' }, form({ email: 'ada@example.com', password: 'wrong' }));

  assert.deepEqual(state, { status: 'error', message: SIGN_IN_REFUSED });
  assert.doesNotMatch(JSON.stringify(state), /realm|No user/);
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
});

test('an unknown failure is a generic line and carries no internals', async () => {
  useAonik(() => ({ status: 500, body: { error: 'stack trace here' } }));

  const state = await loginAction({ status: 'idle' }, form({ email: 'ada@example.com', password: 'pw' }));

  assert.equal(state.status, 'error');
  assert.doesNotMatch(state.message ?? '', /stack/);
});

test('a good log in sets the session and goes to the carried path, or the default', async () => {
  useAonik((request) => (request.path === '/auth/token' ? { status: 200, body: TOKEN } : undefined));

  const carried = await redirectedTo(
    loginAction({ status: 'idle' }, form({ email: 'ada@example.com', password: 'pw', next: '/account/orders?page=2' })),
  );
  assert.equal(carried, '/account/orders?page=2');
  assert.equal(JSON.parse(cookieValue(SESSION_COOKIE) ?? '{}').accessToken, 'access-1');

  const fallback = await redirectedTo(
    loginAction({ status: 'idle' }, form({ email: 'ada@example.com', password: 'pw', next: '//evil.example' })),
  );
  assert.equal(fallback, safePostAuthPath(undefined));
});

/* ---- Password reset ---------------------------------------------------------- */

test('a reset request posts the email and tenant, with the customer’s address, and reads no body', async () => {
  useAonik((request) => (request.path === FORGOT_PASSWORD_PATH ? { status: 200, body: { ok: true } } : undefined));

  const outcome = await requestPasswordReset('ada@example.com', '203.0.113.9');

  assert.deepEqual(outcome, { status: 'requested' });
  assert.equal(aonikRequests.length, 1);
  assert.equal(aonikRequests[0].method, 'POST');
  assert.deepEqual(aonikRequests[0].body, { email: 'ada@example.com', tenantId: TENANT_ID });
  assert.equal(aonikRequests[0].headers['x-forwarded-for'], '203.0.113.9');
  assert.equal(aonikRequests[0].headers.authorization, undefined, 'anonymous');
});

test('a reset works without the OAuth client (only the connection is needed)', async () => {
  const saved = process.env.AONIK_AUTH_CLIENT_ID;
  delete process.env.AONIK_AUTH_CLIENT_ID;
  try {
    useAonik(() => ({ status: 202 }));
    assert.deepEqual(await requestPasswordReset('ada@example.com'), { status: 'requested' });
  } finally {
    process.env.AONIK_AUTH_CLIENT_ID = saved;
  }
});

test('a reset names no outcome that hints at an account: 429 and 5xx are the only other answers', async () => {
  useAonik(() => ({ status: 429, body: { error: 'slow down' } }));
  assert.deepEqual(await requestPasswordReset('ada@example.com'), { status: 'rate-limited' });

  useAonik(() => ({ status: 503, body: { error: 'down' } }));
  assert.deepEqual(await requestPasswordReset('ada@example.com'), { status: 'failed' });
});

test('on demo data a reset says it is unavailable and sends nothing', async () => {
  const saved = { url: process.env.AONIK_API_URL, tenant: process.env.AONIK_TENANT_ID };
  delete process.env.AONIK_API_URL;
  delete process.env.AONIK_TENANT_ID;
  try {
    useAonik(() => undefined);
    assert.deepEqual(await requestPasswordReset('ada@example.com'), { status: 'unavailable' });
    assert.equal(aonikRequests.length, 0);
  } finally {
    process.env.AONIK_API_URL = saved.url;
    process.env.AONIK_TENANT_ID = saved.tenant;
  }
});

test('the reset action validates first, then answers sent for the address it was given', async () => {
  useAonik((request) => (request.path === FORGOT_PASSWORD_PATH ? { status: 200 } : undefined));

  const missing = await requestPasswordResetAction({ status: 'idle' }, form({ email: ' ' }));
  assert.deepEqual(missing.fieldErrors, { email: LOGIN_MESSAGES.emailMissing });
  const invalid = await requestPasswordResetAction({ status: 'idle' }, form({ email: 'nope' }));
  assert.deepEqual(invalid.fieldErrors, { email: LOGIN_MESSAGES.emailInvalid });
  assert.equal(aonikRequests.length, 0);

  setRequestHeaders({ 'x-forwarded-for': '198.51.100.4' });
  const sent = await requestPasswordResetAction({ status: 'idle' }, form({ email: ' ada@example.com ' }));
  assert.deepEqual(sent, { status: 'sent', email: 'ada@example.com' });
});

test('the reset action says "too many" and "could not send" in plain words', async () => {
  useAonik(() => ({ status: 429 }));
  const limited = await requestPasswordResetAction({ status: 'idle' }, form({ email: 'ada@example.com' }));
  assert.equal(limited.status, 'error');
  assert.match(limited.message ?? '', /Too many requests/);

  useAonik(() => ({ status: 500 }));
  const failed = await requestPasswordResetAction({ status: 'idle' }, form({ email: 'ada@example.com' }));
  assert.match(failed.message ?? '', /couldn’t send that just now/);
});

test('Forgot password renders its form and a way back, without promising anything', () => {
  const html = renderToStaticMarkup(ForgotPasswordPage());
  const read = text(html);

  assert.match(html, /<h1[^>]*>Reset your password<\/h1>/);
  assert.match(html, /type="email"/);
  assert.match(html, /<button[^>]*type="submit"[^>]*>Send reset link<\/button>/);
  assert.match(html, /href="\/login"/);
  assert.doesNotMatch(read, /Check your email/);
});

/* ---- Where requests go -------------------------------------------------------- */

test('a signed-out request is sent to Log in with a return path, or the bare page for an unsafe one', () => {
  assert.equal(loginPathFor('/account/orders?page=2'), '/login?next=%2Faccount%2Forders%3Fpage%3D2');
  assert.equal(loginPathFor('/account/orders'), '/login?next=%2Faccount%2Forders');
  assert.equal(loginPathFor('//evil.example'), '/login');
  assert.equal(loginPathFor('https://evil.example'), '/login');
  assert.equal(sessionRefreshPath('/account/orders'), '/account/refresh?next=%2Faccount%2Forders');
  assert.equal(sessionRefreshPath('//evil.example'), '/account/refresh?next=%2Faccount%2Forders');
});
