const STORAGE_KEY = "goldRates.v1";

export type StoredRates = {
  pure24K: number;
  silver: number;
  overrides: Record<string, number | undefined>; // e.g., { "22K": 9166.67 }
};

export const defaultStoredRates: StoredRates = {
  pure24K: 10000,
  silver: 150,
  overrides: {},
};

export function saveRates(rates: StoredRates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
  } catch {}
}

export function loadRates(): StoredRates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoredRates;
    const parsed = JSON.parse(raw) as StoredRates;
    return { ...defaultStoredRates, ...parsed, overrides: parsed.overrides || {} };
  } catch {
    return defaultStoredRates;
  }
}


