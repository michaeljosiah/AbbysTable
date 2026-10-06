/**
 * Runs once when the server starts (Next's instrumentation hook).
 *
 * Validates the Aonik configuration at boot, so a half-configured production
 * deployment fails on start-up rather than on the first customer request
 * (SPEC-2026-07-22-aonik-transport, "Missing tenant id fails fast at startup").
 * It is the same check `readAonikConfig` already makes per request, run early:
 * production throws on a base URL without a tenant; development degrades to
 * demo data and says why in the dev badge.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { readAonikConfig } = await import('@/lib/aonik/dataMode');
  readAonikConfig();
}
