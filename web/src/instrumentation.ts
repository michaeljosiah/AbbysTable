/**
 * Runs once when the server starts (Next's instrumentation hook).
 *
 * Validates the Aonik configuration at boot, so a half-configured production
 * deployment fails on start-up rather than on the first customer request
 * (SPEC-2026-07-22-aonik-transport, "Missing tenant id fails fast at startup").
 * It is the check a live request makes, run early: production throws on a base
 * URL without a tenant; development degrades to demo data and says why in the
 * dev badge. A deployment configured for demo never reads the connection, so
 * it is not checked — a stray `AONIK_API_URL` beside `AONIK_DATA_MODE=demo`
 * (as `.env.example` ships) must still start.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { configuredDataMode, readAonikConfig } = await import('@/lib/aonik/dataMode');
  if (configuredDataMode().mode === 'live') readAonikConfig();
}
