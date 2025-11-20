import type { GameState, Match, Team, Player } from './types';
import { computeFacilityIncome } from './facilities';

type Tactic = 'attacking' | 'balanced' | 'defensive';

interface TeamContext {
  baseRating: number;
  tactic: Tactic;
  attackBias: number;
  defenseBias: number;
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function expectedGoals(strengthDiff: number): number {
  const base = 1.2;
  const adj = logistic(strengthDiff / 12) - 0.5; // ~[-0.5, 0.5]
  return Math.max(0.1, base + adj * 1.2);
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

function getRecentFormBonus(state: GameState, teamId: string, sample = 5): number {
  const matches = state.league.schedule
    .filter(m => m.homeGoals != null && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    .sort((a, b) => b.round - a.round)
    .slice(0, sample);

  let score = 0;
  matches.forEach(match => {
    const isHome = match.homeTeamId === teamId;
    const goalsFor = isHome ? match.homeGoals! : match.awayGoals!;
    const goalsAgainst = isHome ? match.awayGoals! : match.homeGoals!;
    if (goalsFor > goalsAgainst) score += 2;
    else if (goalsFor === goalsAgainst) score += 1;
    else score -= 2;
  });

  return score;
}

function getPreferredXI(team: Team): Player[] {
  const preferredIds = team.preferredXI ?? [];
  const playersById: Record<string, Player> = {};
  team.players.forEach(p => {
    playersById[p.id] = p;
  });
  const selected: Player[] = preferredIds
    .map(id => playersById[id])
    .filter((p): p is Player => Boolean(p));
  if (selected.length < 11) {
    const remaining = team.players
      .filter(p => !preferredIds.includes(p.id))
      .sort((a, b) => b.overall - a.overall);
    selected.push(...remaining.slice(0, 11 - selected.length));
  }
  return selected.slice(0, 11);
}

function getFatiguePenalty(team: Team): number {
  const xi = getPreferredXI(team);
  if (xi.length === 0) return 0;
  const avgFitness = xi.reduce((sum, p) => sum + (p.fitness ?? 70), 0) / xi.length;
  return Math.max(0, (75 - avgFitness) / 5); // avg 65 => +2 malus
}

function buildTeamContext(state: GameState, team: Team): TeamContext {
  const formBonus = getRecentFormBonus(state, team.id);
  const fatiguePenalty = getFatiguePenalty(team);
  const baseRating = team.strength + formBonus - fatiguePenalty;
  return {
    baseRating,
    tactic: 'balanced',
    attackBias: 0,
    defenseBias: 0
  };
}

function chooseTactic(delta: number): Tactic {
  if (delta > 3) return 'attacking';
  if (delta < -3) return 'defensive';
  return 'balanced';
}

function tacticBias(tactic: Tactic): { attack: number; defense: number } {
  switch (tactic) {
    case 'attacking':
      return { attack: 0.2, defense: -0.4 };
    case 'defensive':
      return { attack: -0.15, defense: 0.5 };
    default:
      return { attack: 0, defense: 0 };
  }
}

export function simulateMatch(state: GameState, match: Match): { home: number; away: number } {
  const home = state.teams[match.homeTeamId];
  const away = state.teams[match.awayTeamId];

  const homeCtx = buildTeamContext(state, home);
  const awayCtx = buildTeamContext(state, away);

  const ratingDelta = homeCtx.baseRating - awayCtx.baseRating;
  homeCtx.tactic = chooseTactic(ratingDelta);
  awayCtx.tactic = chooseTactic(-ratingDelta);

  const homeBias = tacticBias(homeCtx.tactic);
  const awayBias = tacticBias(awayCtx.tactic);
  homeCtx.attackBias = homeBias.attack;
  homeCtx.defenseBias = homeBias.defense;
  awayCtx.attackBias = awayBias.attack;
  awayCtx.defenseBias = awayBias.defense;

  const homeAdv = 3; // avantage domicile légèrement réduit
  const effectiveDiff = (homeCtx.baseRating + homeCtx.defenseBias + homeAdv) - (awayCtx.baseRating + awayCtx.defenseBias);
  const homeXg = Math.max(0.1, expectedGoals(effectiveDiff) + homeCtx.attackBias);
  const awayXg = Math.max(0.1, expectedGoals(-effectiveDiff) + awayCtx.attackBias);

  const homeGoals = sampleGoals(homeXg);
  const awayGoals = sampleGoals(awayXg);
  return { home: homeGoals, away: awayGoals };
}

function generatePlayerStats(team: Team, goals: number, isHome: boolean): string[] {
  // Sélectionner 11 joueurs pour le match (XI type)
  const selectedPlayers = getPreferredXI(team);

  // Initialiser les stats si nécessaire
  selectedPlayers.forEach(p => {
    if (!p.stats) {
      p.stats = { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    }
    p.stats.matchesPlayed += 1;
  });

  const scorers: string[] = [];

  // Distribuer les buts (probabilité plus élevée pour les attaquants)
  let remainingGoals = goals;
  while (remainingGoals > 0) {
    const attackers = selectedPlayers.filter(p => p.position === 'FWD');
    const midfielders = selectedPlayers.filter(p => p.position === 'MID');
    const defenders = selectedPlayers.filter(p => p.position === 'DEF');
    
    const allScorers = [...attackers, ...midfielders, ...defenders];
    if (allScorers.length === 0) break;
    
    // Probabilité : 50% attaquant, 30% milieu, 15% défenseur, 5% gardien
    let scorer: Player;
    const rand = Math.random();
    if (rand < 0.5 && attackers.length > 0) {
      scorer = attackers[Math.floor(Math.random() * attackers.length)];
    } else if (rand < 0.8 && midfielders.length > 0) {
      scorer = midfielders[Math.floor(Math.random() * midfielders.length)];
    } else if (rand < 0.95 && defenders.length > 0) {
      scorer = defenders[Math.floor(Math.random() * defenders.length)];
    } else {
      scorer = allScorers[Math.floor(Math.random() * allScorers.length)];
    }
    
    scorer.stats!.goals += 1;
    scorers.push(scorer.name);
    
    // Ajouter une passe décisive (probabilité 60%)
    if (Math.random() < 0.6) {
      const assisters = selectedPlayers.filter(p => p.id !== scorer.id);
      if (assisters.length > 0) {
        const assister = assisters[Math.floor(Math.random() * assisters.length)];
        assister.stats!.assists += 1;
      }
    }
    
    remainingGoals--;
  }

  // Cartons jaunes (probabilité 20% par joueur)
  selectedPlayers.forEach(p => {
    if (Math.random() < 0.2) {
      p.stats!.yellowCards += 1;
    }
  });

  // Carton rouge (probabilité 2% par joueur)
  selectedPlayers.forEach(p => {
    if (Math.random() < 0.02) {
      p.stats!.redCards += 1;
    }
  });

  return scorers;
}

export function applyMatchResult(state: GameState, match: Match, homeGoals: number, awayGoals: number): void {
  const home = state.teams[match.homeTeamId];
  const away = state.teams[match.awayTeamId];

  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) {
    home.points += 3;
    home.wins += 1;
    away.losses += 1;
  } else if (awayGoals > homeGoals) {
    away.points += 3;
    away.wins += 1;
    home.losses += 1;
  } else {
    home.points += 1;
    away.points += 1;
    home.draws += 1;
    away.draws += 1;
  }

  // Générer les statistiques des joueurs et récupérer les buteurs
  const homeScorers = generatePlayerStats(home, homeGoals, true);
  const awayScorers = generatePlayerStats(away, awayGoals, false);
  
  // Stocker les buteurs dans le match
  match.homeScorers = homeScorers;
  match.awayScorers = awayScorers;

  const homeFacilityBonus = computeFacilityIncome(home, { isHome: true });
  const awayFacilityBonus = computeFacilityIncome(away, { isHome: false });
  home.funds += homeFacilityBonus;
  away.funds += awayFacilityBonus;
}

export function applyCupMatchResult(state: GameState, match: CupMatch, homeGoals: number, awayGoals: number): void {
  const home = state.teams[match.homeTeamId];
  const away = state.teams[match.awayTeamId];
  const homeScorers = generatePlayerStats(home, homeGoals, true);
  const awayScorers = generatePlayerStats(away, awayGoals, false);
  match.homeScorers = homeScorers;
  match.awayScorers = awayScorers;
  const homeFacilityBonus = computeFacilityIncome(home, { isHome: true });
  const awayFacilityBonus = computeFacilityIncome(away, { isHome: false });
  home.funds += homeFacilityBonus;
  away.funds += awayFacilityBonus;
}
