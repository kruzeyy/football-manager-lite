import type { League, Team } from './types';

const CACHE_KEY_PREFIX = 'fm-lite-league-cache-v1:';

export type LeaguePack = { teams: Record<string, Team>; league: League };

export function loadLeagueCache(cacheId: string, maxAgeMs = 1000 * 60 * 60 * 24): LeaguePack | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + cacheId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; pack: LeaguePack };
    if (!parsed || !parsed.at || !parsed.pack) return null;
    if (Date.now() - parsed.at > maxAgeMs) return null;
    return parsed.pack;
  } catch {
    return null;
  }
}

export function saveLeagueCache(cacheId: string, pack: LeaguePack): void {
  try {
    const payload = JSON.stringify({ at: Date.now(), pack });
    localStorage.setItem(CACHE_KEY_PREFIX + cacheId, payload);
  } catch {
    // ignore storage errors
  }
}

export function clearLeagueCache(cacheId: string): void {
  try {
    localStorage.removeItem(CACHE_KEY_PREFIX + cacheId);
  } catch {
    // ignore
  }
}

export function clearAllLeagueCache(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}


