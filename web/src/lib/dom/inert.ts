/**
 * Makes everything outside `keep` inert — every sibling of each kept element
 * and of each of its ancestors, up to <body> — and returns the undo. Only
 * elements this call made inert are released, so one already inert stays so.
 * For true modals (a phone bottom sheet): the page behind can be neither
 * reached by Tab nor heard by a screen reader.
 */
export function inertOutside(keep: ReadonlyArray<Element | null>): () => void {
  const kept = keep.filter((element): element is Element => element !== null);
  const chain = new Set<Element>();
  for (const element of kept) {
    for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
      chain.add(node);
    }
  }
  const changed: Element[] = [];
  for (const node of chain) {
    const parent = node.parentElement;
    if (!parent) continue;
    for (const sibling of Array.from(parent.children)) {
      if (chain.has(sibling) || sibling.hasAttribute('inert')) continue;
      if (sibling instanceof HTMLScriptElement || sibling instanceof HTMLStyleElement) continue;
      sibling.setAttribute('inert', '');
      changed.push(sibling);
    }
  }
  return () => {
    for (const element of changed) element.removeAttribute('inert');
  };
}
