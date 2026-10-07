/**
 * What every CSS import resolves to under test (see `./runtime`): a CSS
 * Module whose class names are their own keys, so `styles.header` is
 * `"header"`. Lets tests load components without a CSS pipeline.
 */
const classNames: Record<string, string> = new Proxy(
  {},
  { get: (_target, key) => (typeof key === 'string' ? key : undefined) },
);

export default classNames;
