import type { PersonalisationSelection } from '../aonik/map';

export const QUICK_RETURN_KEY = 'abbys-table:quick-return:v1';
export interface QuickReturn {
  source: 'dishes' | 'extras';
  id: string;
  name: string;
  url: string;
  selection?: PersonalisationSelection;
  entry: string;
  time: number;
  scroll: number;
  historyLength: number;
  departed: boolean;
  returning: boolean;
}
export function readQuickReturn(
  raw: string | null,
  now: number,
): QuickReturn | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as QuickReturn;
    if (
      !value ||
      (value.source !== 'dishes' && value.source !== 'extras') ||
      typeof value.id !== 'string' ||
      typeof value.name !== 'string' ||
      typeof value.entry !== 'string' ||
      !value.entry
    )
      return null;
    if (
      !Number.isFinite(value.time) ||
      now < value.time ||
      now - value.time > 6 * 60 * 60 * 1000 ||
      !Number.isFinite(value.scroll) ||
      !Number.isInteger(value.historyLength)
    )
      return null;
    const url = new URL(value.url, 'https://abbys.invalid');
    if (
      url.origin !== 'https://abbys.invalid' ||
      url.pathname !== `/box/${value.source}`
    )
      return null;
    if (
      value.selection &&
      (typeof value.selection !== 'object' ||
        Array.isArray(value.selection) ||
        Object.values(value.selection).some(
          (item) =>
            typeof item !== 'string' &&
            (!Array.isArray(item) ||
              !item.every((key) => typeof key === 'string')),
        ))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
