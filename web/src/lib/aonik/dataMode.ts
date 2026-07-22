/**
 * Demo vs live data mode.
 *
 * SERVER-ONLY. Reads non-`NEXT_PUBLIC_` env and the dev override cookie, so it
 * must never be imported into a Client Component.
 *
 * - **demo** — the design-template fixtures. No network, no tenant, deterministic.
 * - **live** — the real Aonik commerce API.
 *
 * The default comes from configuration. In development ONLY, that default can be
 * overridden per-browser by a cookie so you can flip between a stable demo dataset
 * and the real API without restarting the server or editing `.env`. In production
 * the cookie is not read at all — the mode is whatever configuration says.
 */

import { cookies } from 'next/headers';

export type DataMode = 'demo' | 'live';

/** Dev-only override cookie. Ignored outside development. */
export const DATA_MODE_COOKIE = 'abbys-table:data-mode';

export interface DataModeResolution {
  mode: DataMode;
  /** Where this mode came from — surfaced by the dev toggle, never to customers. */
  source: 'config' | 'dev-override' | 'fallback';
  /** Set when live was asked for but cannot be served; explains the demo fallback. */
  unavailableReason?: string;
}

export interface AonikConfig {
  baseUrl: string;
  tenantId: string;
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function parseMode(value: string | undefined): DataMode | null {
  return value === 'demo' || value === 'live' ? value : null;
}

/**
 * The live connection details, or null when they are incomplete.
 *
 * Aonik partitions every storefront read by tenant, so a base URL without a
 * tenant id is not a usable configuration — it would resolve no tenant and
 * return errors or empty data. We treat the pair as all-or-nothing.
 */
export function readAonikConfig(): AonikConfig | null {
  const baseUrl = process.env.AONIK_API_URL?.trim();
  const tenantId = process.env.AONIK_TENANT_ID?.trim();

  if (!baseUrl) return null;

  if (!tenantId) {
    // A half-configured deployment is a mistake we refuse to paper over in
    // production; in development it degrades to demo with a visible reason.
    if (!isDevelopment()) {
      throw new Error(
        'AONIK_API_URL is set but AONIK_TENANT_ID is missing. Aonik requires a tenant on ' +
          'every request — set both, or unset AONIK_API_URL to run on demo data.',
      );
    }
    return null;
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), tenantId };
}

/** The configured default, before any development override. */
export function configuredDataMode(): DataMode {
  const explicit = parseMode(process.env.AONIK_DATA_MODE?.trim().toLowerCase());
  if (explicit) return explicit;

  // Unset means "live if we know how to reach Aonik, demo otherwise" — the
  // behaviour this repo had before the mode existed.
  return process.env.AONIK_API_URL?.trim() ? 'live' : 'demo';
}

/**
 * Resolves the mode for this request, including the development override and
 * any fallback to demo when live is unreachable by configuration.
 */
export async function resolveDataMode(): Promise<DataModeResolution> {
  let mode = configuredDataMode();
  let source: DataModeResolution['source'] = 'config';

  if (isDevelopment()) {
    // `cookies()` opts this render out of static generation, which is correct:
    // a page whose data source can change per-browser is not static. Production
    // never takes this branch, so production caching is unaffected.
    //
    // It also THROWS outside a request scope — `generateStaticParams` and
    // `generateMetadata` at build time have no browser and no cookies. There is
    // no override to read there by definition, so fall back to configuration
    // rather than taking the build down.
    let override: DataMode | null = null;
    try {
      override = parseMode((await cookies()).get(DATA_MODE_COOKIE)?.value);
    } catch {
      override = null;
    }

    if (override) {
      mode = override;
      source = 'dev-override';
    }
  }

  if (mode === 'live' && !readAonikConfig()) {
    return {
      mode: 'demo',
      source: 'fallback',
      unavailableReason: process.env.AONIK_API_URL?.trim()
        ? 'AONIK_TENANT_ID is not set'
        : 'AONIK_API_URL is not set',
    };
  }

  return { mode, source };
}
