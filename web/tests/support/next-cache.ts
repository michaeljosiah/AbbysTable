/**
 * A recording stand-in for `next/cache`, resolved by `./runtime`: the paths a
 * server action asked Next to revalidate, so a test can assert on them.
 */

export const revalidated: Array<{ path: string; type?: string }> = [];

export function revalidatePath(path: string, type?: string): void {
  revalidated.push({ path, type });
}

export function resetRevalidated(): void {
  revalidated.length = 0;
}
