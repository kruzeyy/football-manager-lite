import type { GameState, League, Player, Team } from './types';
import { getTeamBaseOverall } from './data/ratings';

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
    fitness: randomInt(70, 100)
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

function computeStrength(players: Player[]): number {
  const avg = players.reduce((s, p) => s + p.overall, 0) / players.length;
  return Math.round(avg);
}

export function generateLeague(numTeams = 10): { teams: Record<string, Team>; league: League } {
  const teams: Record<string, Team> = {};
  const teamIds: string[] = [];
  for (let i = 0; i < numTeams; i++) {
    const { name, shortName } = generateTeamName();
    const players = generateSquad(72);
    const team: Team = {
      id: crypto.randomUUID(),
      name,
      shortName,
      players,
      strength: computeStrength(players),
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      funds: 50_000_000
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
  return {
    userTeamId,
    teams,
    league,
    currentRound: 1
  };
}

export function createNewGameFrom(teams: Record<string, Team>, league: League, userTeamId: string): GameState {
  return {
    userTeamId,
    teams,
    league,
    currentRound: 1
  };
}

// Utilitaire: crée une équipe avec un effectif généré et une force calculée
export function createTeamWithGeneratedSquad(name: string, shortName: string, logoUrl?: string): Team {
  const target = getTeamBaseOverall(name);
  const players = generateSquad(target);
  return {
    id: crypto.randomUUID(),
    name,
    shortName,
    logoUrl,
    players,
    strength: computeStrength(players),
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    funds: 50_000_000
  };
}
