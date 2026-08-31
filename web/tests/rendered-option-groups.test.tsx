import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { OptionGroupsControl } from '../src/components/personalisation/OptionGroupsControl';
import type { MappedOptionGroup } from '../src/lib/aonik/map';
import { hasOptionChoices } from '../src/lib/aonik/personalisation';

const group: MappedOptionGroup = {
  key: 'garnish',
  label: 'Choose a garnish',
  helpText: 'Finished at the table',
  selectionMode: 'One',
  defaultChoiceKey: 'parsley',
  choices: [
    { key: 'parsley', label: 'Parsley', detail: 'Fresh', pricePence: 0 },
    { key: 'mint', label: 'Mint', pricePence: 25 },
    { key: 'none', label: 'No garnish', pricePence: -50 },
  ],
};

test('reusable group control renders authored labels, selection, price and default', () => {
  const html = renderToStaticMarkup(
    <OptionGroupsControl
      groups={[group]}
      selection={{ garnish: ['mint'] }}
      onChange={() => undefined}
    />,
  );

  assert.match(html, /Choose a garnish/);
  assert.match(html, /Finished at the table/);
  assert.match(html, /aria-pressed="true"[^>]*><span>Mint<\/span>/);
  assert.match(html, /\+£0\.25/);
  assert.match(html, /-£0\.50/);
  assert.doesNotMatch(html, /\+-£/);
  assert.match(html, /Parsley is Abby&#x27;s choice/);
});

test('zero effective groups and groups without choices render no control', () => {
  assert.equal(hasOptionChoices([]), false);
  assert.equal(
    renderToStaticMarkup(
      <OptionGroupsControl groups={[]} selection={{}} onChange={() => undefined} />,
    ),
    '',
  );
  assert.equal(
    renderToStaticMarkup(
      <OptionGroupsControl
        groups={[{ ...group, choices: [] }]}
        selection={{}}
        onChange={() => undefined}
      />,
    ),
    '',
  );
});
