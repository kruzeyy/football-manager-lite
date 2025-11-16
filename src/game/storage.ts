import type { GameState } from './types';

const KEY = 'fm-lite-state-v1';

export function saveState(state: GameState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadState(): GameState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(KEY);
}
