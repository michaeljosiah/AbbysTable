import assert from 'node:assert/strict';
import test from 'node:test';

import { liveOrderingEnabled } from '../src/lib/aonik/dataMode';

function withFlag(value: string | undefined, run: () => void) {
  const previous = process.env.LIVE_ORDERING_ENABLED;
  if (value === undefined) delete process.env.LIVE_ORDERING_ENABLED;
  else process.env.LIVE_ORDERING_ENABLED = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.LIVE_ORDERING_ENABLED;
    else process.env.LIVE_ORDERING_ENABLED = previous;
  }
}

test('live ordering is off when the flag is unset', () => {
  withFlag(undefined, () => assert.equal(liveOrderingEnabled(), false));
});

test('live ordering is on only for an explicit true', () => {
  withFlag('true', () => assert.equal(liveOrderingEnabled(), true));
  withFlag(' TRUE ', () => assert.equal(liveOrderingEnabled(), true));

  for (const value of ['', 'false', '0', '1', 'yes', 'on']) {
    withFlag(value, () => assert.equal(liveOrderingEnabled(), false, `"${value}" must not open ordering`));
  }
});
