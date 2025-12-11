import type { GameState, League, Player, Team } from './types';
import { getTeamBaseOverall } from './data/ratings';
import { getDefaultFacilities } from './facilities';
import { createInitialCupState } from './cup';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CITY = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Toulouse', 'Nantes', 'Nice', 'Rennes', 'Strasbourg', 'Montpellier'];
const ANIMALS = ['Lions', 'Aigles', 'Tigres', 'Renards', 'Panthères', 'Phoenix', 'Loups', 'Taureaux', 'Dauphins', 'Dragons'];
const FIRST = ['Maxime', 'Lucas', 'Hugo', 'Arthur', 'Adam', 'Jules', 'Raphaël', 'Léo', 'Noah', 'Louis', 'Nina', 'Léa', 'Zoé', 'Camille', 'Chloé'];
const LAST = ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Simon'];

function generateName(): string {
  return `${pick(FIRST)} ${pick(LAST)}`;
}

function generateTeamName(): { name: string; shortName: string } {
  const city = pick(CITY);
  const animal = pick(ANIMALS);
  return { name: `${city} ${animal}`, shortName: city.slice(0, 3).toUpperCase() };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gaussian(mean: number, stdDev: number): number {
  // Box–Muller
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

function generatePlayer(position: Player['position'], targetAvg = 72): Player {
  // Légers biais par poste (GK souvent un peu plus haut que la moyenne de l'équipe)
  const posBias =
    position === 'GK' ? 1.5 :
    position === 'DEF' ? -0.5 :
    position === 'MID' ? 0.0 : 0.5; // FWD
  const mean = targetAvg + posBias;
  const overall = Math.round(clamp(gaussian(mean, 4.5), 60, 90));
  return {
    id: crypto.randomUUID(),
    name: generateName(),
    age: randomInt(17, 35),
    position,
    overall,
    fitness: randomInt(70, 100),
    stats: {
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0
    }
  };
}

function generateSquad(targetAvg = 72): Player[] {
  const players: Player[] = [];
  players.push(generatePlayer('GK', targetAvg));
  players.push(generatePlayer('GK', targetAvg));
  for (let i = 0; i < 8; i++) players.push(generatePlayer('DEF', targetAvg));
  for (let i = 0; i < 8; i++) players.push(generatePlayer('MID', targetAvg));
  for (let i = 0; i < 6; i++) players.push(generatePlayer('FWD', targetAvg));
  return players;
}

// Calcule le budget d'une équipe en fonction de sa note (style FIFA)
// Budgets varient de ~5M€ (équipes faibles) à ~50M€ (grandes équipes)
// Ajoute une variation aléatoire de ±30% pour plus de diversité
export function calculateTeamBudget(strength: number, addRandomVariation = true): number {
  // Formule linéaire: budget = base + (strength - 60) * multiplicateur
  // Pour strength 60: ~5M€
  // Pour strength 84: ~50M€
  const baseBudget = 5_000_000; // Budget minimum
  const maxBudget = 50_000_000; // Budget maximum
  const minStrength = 60;
  const maxStrength = 84;
  
  // Clamp la force entre 60 et 84
  const clampedStrength = Math.max(minStrength, Math.min(maxStrength, strength));
  
  // Calcul linéaire
  const ratio = (clampedStrength - minStrength) / (maxStrength - minStrength);
  let budget = baseBudget + (maxBudget - baseBudget) * ratio;
  
  // Ajouter une variation aléatoire de ±30% pour plus de diversité
  if (addRandomVariation) {
    const variation = (Math.random() - 0.5) * 0.6; // Entre -30% et +30%
    budget = budget * (1 + variation);
  }
  
  // Arrondir à 0.5M€ près pour plus de réalisme
  return Math.round(budget / 500_000) * 500_000;
}

// Calcule la note d'équipe style FIFA basée sur les meilleurs joueurs de chaque poste
export function computeStrength(players: Player[]): number {
  if (players.length === 0) return 60;
  
  // Sélectionner les meilleurs joueurs de chaque poste (XI type)
  const byOverallDesc = (a: Player, b: Player) => b.overall - a.overall;
  const gk = players.filter(p => p.position === 'GK').sort(byOverallDesc).slice(0, 1);
  const def = players.filter(p => p.position === 'DEF').sort(byOverallDesc).slice(0, 4);
  const mid = players.filter(p => p.position === 'MID').sort(byOverallDesc).slice(0, 3);
  const fwd = players.filter(p => p.position === 'FWD').sort(byOverallDesc).slice(0, 3);
  
  // Si on n'a pas assez de joueurs, compléter avec les meilleurs disponibles
  const xi = [...gk, ...def, ...mid, ...fwd];
  if (xi.length < 11) {
    const remaining = players.filter(p => !xi.includes(p)).sort(byOverallDesc);
    xi.push(...remaining.slice(0, 11 - xi.length));
  }
  
  // Calculer la moyenne pondérée style FIFA
  // Pondération: GK (1), DEF (4), MID (3), FWD (3)
  let totalWeighted = 0;
  let totalWeight = 0;
  
  gk.forEach(p => { totalWeighted += p.overall * 1; totalWeight += 1; });
  def.forEach(p => { totalWeighted += p.overall * 1; totalWeight += 1; });
  mid.forEach(p => { totalWeighted += p.overall * 1; totalWeight += 1; });
  fwd.forEach(p => { totalWeighted += p.overall * 1; totalWeight += 1; });
  
  // Si on a moins de 11 joueurs, ajuster le poids
  if (xi.length < 11) {
    const avg = totalWeighted / totalWeight;
    return Math.round(avg);
  }
  
  const avg = totalWeighted / totalWeight;
  // Arrondir à l'entier le plus proche
  return Math.round(avg);
}

export function getDefaultPreferredXI(players: Player[]): string[] {
  return players
    .slice()
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11)
    .map(p => p.id);
}

export function generateLeague(numTeams = 10): { teams: Record<string, Team>; league: League } {
  const teams: Record<string, Team> = {};
  const teamIds: string[] = [];
  for (let i = 0; i < numTeams; i++) {
    const { name, shortName } = generateTeamName();
    const players = generateSquad(72);
    const strength = computeStrength(players);
    const team: Team = {
      id: crypto.randomUUID(),
      name,
      shortName,
      players,
      strength,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      funds: calculateTeamBudget(strength),
      preferredXI: getDefaultPreferredXI(players),
      facilities: getDefaultFacilities()
    };
    teams[team.id] = team;
    teamIds.push(team.id);
  }

  const league: League = {
    id: crypto.randomUUID(),
    name: 'Ligue Élite',
    teamIds,
    schedule: []
  };

  return { teams, league };
}

export function createNewGame(): GameState {
  const { teams, league } = generateLeague(12);
  const userTeamId = Object.keys(teams)[0];
  const cup = createInitialCupState(league.teamIds, userTeamId);
  return {
    userTeamId,
    teams: injectFacilities(teams),
    league,
    currentRound: 1,
    cup,
    economy: {}
  };
}

function injectFacilities(map: Record<string, Team>): Record<string, Team> {
  const next: Record<string, Team> = {};
  for (const [id, team] of Object.entries(map)) {
    if (team.facilities) {
      next[id] = team;
      continue;
    }
    next[id] = {
      ...team,
      facilities: getDefaultFacilities()
    };
  }
  return next;
}

export function createNewGameFrom(teams: Record<string, Team>, league: League, userTeamId: string, cupTeamIds?: string[]): GameState {
  // Utiliser cupTeamIds si fourni (pour inclure les équipes de l'autre ligue), sinon utiliser uniquement les équipes de la ligue
  const allCupTeamIds = cupTeamIds || league.teamIds;
  const cup = createInitialCupState(allCupTeamIds, userTeamId);
  return {
    userTeamId,
    teams: injectFacilities(teams),
    league,
    currentRound: 1,
    cup,
    economy: {}
  };
}

// Utilitaire: crée une équipe avec un effectif généré et une force calculée
export function createTeamWithGeneratedSquad(name: string, shortName: string, logoUrl?: string): Team {
  const target = getTeamBaseOverall(name);
  const players = generateSquad(target);
  const strength = computeStrength(players);
  return {
    id: crypto.randomUUID(),
    name,
    shortName,
    logoUrl,
    players,
    strength,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    funds: calculateTeamBudget(strength),
    preferredXI: getDefaultPreferredXI(players),
    facilities: getDefaultFacilities()
  };
}
