import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';

import { readAonikConfig } from '../src/lib/aonik/dataMode';
import { AONIK_CODES, toAonikError } from '../src/lib/aonik/errors';
import { toMajor, toPence } from '../src/lib/aonik/map';
import { register } from '../src/instrumentation';

const env = process.env as Record<string, string | undefined>;

function withEnv(values: Record<string, string | undefined>, run: () => void | Promise<void>) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, env[key]]));
  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  try {
    const result = run();
    if (result instanceof Promise) return result.finally(restore);
    restore();
    return undefined;
  } catch (error) {
    restore();
    throw error;
  }
}

/* ---- Money adapter (aonik-transport: Money adapter) ----------------------- */

test('toPence converts Aonik decimals to integer pence', () => {
  assert.equal(toPence(95), 9500);
  assert.equal(toPence(95.0), 9500);
  assert.equal(toPence(19.99), 1999);
  assert.equal(toPence(0.1 + 0.2), 30);
  assert.equal(toPence(0), 0);
});

test('toPence rounds half a penny away from zero, through float error', () => {
  // 1.005 and 1.255 land on x.x49999… once multiplied in binary floating point.
  assert.equal(toPence(1.005), 101);
  assert.equal(toPence(1.255), 126);
  assert.equal(toPence(2.345), 235);
});

test('toPence treats a refund and a charge of the same size symmetrically', () => {
  assert.equal(toPence(-2.5), -250);
  assert.equal(toPence(-1.005), -101);
  assert.equal(toPence(0.015), 2);
  assert.equal(toPence(-0.015), -2);
});

test('toPence never returns negative zero, and keeps NaN as NaN', () => {
  assert.ok(Object.is(toPence(-0.004), 0));
  assert.ok(Object.is(toPence(-0), 0));
  assert.ok(Number.isNaN(toPence(Number.NaN)));
});

test('toMajor converts pence back, and signed adjustments survive the round trip', () => {
  assert.equal(toMajor(9500), 95);
  assert.equal(toMajor(1999), 19.99);
  assert.equal(toMajor(-250), -2.5);
  assert.equal(toMajor(toPence(-2.5)), -2.5);
});

/* ---- Error taxonomy (aonik-transport: Typed error taxonomy) --------------- */

test('a validation envelope keeps its code, rule and message', () => {
  const error = toAonikError(400, '/commerce/carts/c/lines', {
    error: 'Pick a protein.',
    code: AONIK_CODES.optionValidation,
    rule: 'V5',
  });

  assert.equal(error.status, 400);
  assert.equal(error.code, AONIK_CODES.optionValidation);
  assert.equal(error.rule, 'V5');
  assert.equal(error.message, 'Pick a protein.');
  assert.equal(error.isDrift, false);
});

test('a 409 drift body reads its code from `error` and its text from `message`', () => {
  const box = { cartId: 'c' };
  const quote = { total: 158 };
  const changes = [{ reason: 'unavailable' }];
  const error = toAonikError(409, '/commerce/carts/c/checkout', {
    error: AONIK_CODES.boxDrift,
    message: 'Your box changed.',
    box,
    quote,
    changes,
  });

  assert.equal(error.code, AONIK_CODES.boxDrift);
  assert.equal(error.message, 'Your box changed.');
  assert.equal(error.isDrift, true);
  assert.deepEqual(error.drift, { box, quote, changes });
});

test('a not-found sentence is never mistaken for a code', () => {
  const error = toAonikError(404, '/commerce/carts/c', { error: 'Cart c was not found.' });

  assert.equal(error.code, undefined);
  assert.equal(error.message, 'Cart c was not found.');
  assert.equal(error.isNotFound, true);
});

test('an empty body still produces a usable error', () => {
  for (const body of [null, undefined, '', 'not json']) {
    const error = toAonikError(500, '/commerce/config/storefront', body);
    assert.equal(error.status, 500);
    assert.equal(error.code, undefined);
    assert.equal(error.message, 'Aonik request failed with 500');
    assert.equal(error.drift, undefined);
  }
});

test('a 409 without the drift code is not drift', () => {
  const error = toAonikError(409, '/v1/registrations/individual', { error: 'Email already registered.' });

  assert.equal(error.isDrift, false);
  assert.equal(error.drift, undefined);
});

/* ---- Configuration ----------------------------------------------------------- */

test('a complete configuration resolves, without a trailing slash', () => {
  withEnv({ AONIK_API_URL: 'https://aonik.test/', AONIK_TENANT_ID: 'tenant-test' }, () => {
    assert.deepEqual(readAonikConfig(), { baseUrl: 'https://aonik.test', tenantId: 'tenant-test' });
  });
});

test('no base URL means demo data, not an error', () => {
  withEnv({ AONIK_API_URL: undefined, AONIK_TENANT_ID: undefined, NODE_ENV: 'production' }, () => {
    assert.equal(readAonikConfig(), null);
  });
});

test('a base URL without a tenant throws in production, naming the variable', () => {
  withEnv({ AONIK_API_URL: 'https://aonik.test', AONIK_TENANT_ID: undefined, NODE_ENV: 'production' }, () => {
    assert.throws(() => readAonikConfig(), /AONIK_TENANT_ID/);
  });
});

test('a base URL without a tenant degrades to demo in development', () => {
  withEnv({ AONIK_API_URL: 'https://aonik.test', AONIK_TENANT_ID: undefined, NODE_ENV: 'development' }, () => {
    assert.equal(readAonikConfig(), null);
  });
});

test('the boot-time check fails a half-configured production server at start-up', async () => {
  await withEnv(
    { NEXT_RUNTIME: 'nodejs', AONIK_API_URL: 'https://aonik.test', AONIK_TENANT_ID: undefined, NODE_ENV: 'production' },
    async () => {
      await assert.rejects(register(), /AONIK_TENANT_ID/);
    },
  );

  await withEnv(
    { NEXT_RUNTIME: 'nodejs', AONIK_API_URL: 'https://aonik.test', AONIK_TENANT_ID: 'tenant-test', NODE_ENV: 'production' },
    async () => {
      await assert.doesNotReject(register());
    },
  );
});

test('the boot-time check leaves an explicit demo deployment alone', async () => {
  // As .env.example ships: demo, with a URL but no tenant. It never reads the
  // connection, so it must start.
  await withEnv(
    {
      NEXT_RUNTIME: 'nodejs',
      AONIK_DATA_MODE: 'demo',
      AONIK_API_URL: 'https://aonik.test',
      AONIK_TENANT_ID: undefined,
      NODE_ENV: 'production',
    },
    async () => {
      await assert.doesNotReject(register());
    },
  );
});
