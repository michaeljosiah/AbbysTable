import assert from 'node:assert/strict';
import test from 'node:test';

import { isEmailAddress, MAX_EMAIL_LENGTH } from '../src/lib/email';

test('isEmailAddress: the shapes the old pattern accepted', () => {
  for (const ok of ['esther@example.com', 'a@b.co', 'first.last+box@mail.example.co.uk', 'x@a..b']) {
    assert.equal(isEmailAddress(ok), true, ok);
  }
});

test('isEmailAddress: what it refuses', () => {
  for (const bad of [
    '',
    'no-at.example.com',
    '@example.com',
    'esther@',
    'esther@example',
    'esther@example.',
    'esther@.com',
    'two@@example.com',
    'a@b@example.com',
    'has space@example.com',
    'esther@exa mple.com',
    'line\nbreak@example.com',
  ]) {
    assert.equal(isEmailAddress(bad), false, JSON.stringify(bad));
  }
});

test('isEmailAddress: longer than SMTP can carry is refused', () => {
  const local = 'a'.repeat(64);
  const fits = `${local}@${'d'.repeat(MAX_EMAIL_LENGTH - local.length - 5)}.com`;
  assert.equal(fits.length, MAX_EMAIL_LENGTH);
  assert.equal(isEmailAddress(fits), true);
  assert.equal(isEmailAddress(`a${fits}`), false);
});

test('isEmailAddress: linear on the input that made the old pattern backtrack', () => {
  // ~1MB, a server action's whole body: the old pattern took minutes on this.
  const hostile = `a@${'x.'.repeat(500_000)}@`;
  const started = performance.now();
  for (let i = 0; i < 100; i += 1) isEmailAddress(hostile);
  assert.ok(performance.now() - started < 500, 'a hundred checks well under half a second');
  // The same shape at a length the cap allows is still refused, without backtracking.
  assert.equal(isEmailAddress(`a@${'x.'.repeat(100)}@`), false);
});
