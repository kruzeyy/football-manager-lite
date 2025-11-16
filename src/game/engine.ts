import type { GameState, Match, Team } from './types';

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function expectedGoals(strengthDiff: number): number {
  const base = 1.2;
  const adj = logistic(strengthDiff / 12) - 0.5; // ~[-0.5, 0.5]
  return Math.max(0.2, base + adj * 1.2);
}

function sampleGoals(lambda: number): number {
  // Poor man’s Poisson-like sampling
  let goals = 0;
  let prob = Math.min(0.9, lambda / 3);
  for (let i = 0; i < 6; i++) {
    if (Math.random() < prob) goals++;
    prob *= 0.75;
  }
  return goals;
}

export function simulateMatch(state: GameState, match: Match): { home: number; away: number } {
  const home: Team = state.teams[match.homeTeamId];
  const away: Team = state.teams[match.awayTeamId];
  const homeAdv = 4; // avantage domicile
  const diff = (home.strength + homeAdv) - away.strength;
  const homeXg = expectedGoals(diff);
  const awayXg = expectedGoals(-diff);
  const homeGoals = sampleGoals(homeXg);
  const awayGoals = sampleGoals(awayXg);
  return { home: homeGoals, away: awayGoals };
}

export function applyMatchResult(state: GameState, match: Match, homeGoals: number, awayGoals: number): void {
  const home = state.teams[match.homeTeamId];
  const away = state.teams[match.awayTeamId];

  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) home.points += 3;
  else if (awayGoals > homeGoals) away.points += 3;
  else { home.points += 1; away.points += 1; }
}
