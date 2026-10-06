'use client';

import { useSyncExternalStore } from 'react';

import { consentStore, isGranted, PENDING, type ConsentCategory, type ConsentSnapshot } from './consent';

/** The server never knows the choice (it lives in the browser), so it renders essential only. */
const getServerSnapshot = (): ConsentSnapshot => PENDING;

/** The live consent snapshot. Re-renders on every change, withdrawal included. */
export function useConsent(): ConsentSnapshot {
  return useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot, getServerSnapshot);
}

/** True only while a valid, stored choice grants `category`. */
export function useConsentGranted(category: ConsentCategory): boolean {
  return isGranted(useConsent(), category);
}
