import type { GameState, League, Player, Team } from './types';

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

function generatePlayer(position: Player['position']): Player {
  const base = position === 'GK' ? 60 : 55;
  const variance = randomInt(-15, 20);
  return {
    id: crypto.randomUUID(),
    name: generateName(),
    age: randomInt(17, 35),
    position,
    overall: Math.max(40, Math.min(95, base + variance)),
    fitness: randomInt(70, 100)
  };
}

function generateSquad(): Player[] {
  const players: Player[] = [];
  players.push(generatePlayer('GK'));
  players.push(generatePlayer('GK'));
  for (let i = 0; i < 8; i++) players.push(generatePlayer('DEF'));
  for (let i = 0; i < 8; i++) players.push(generatePlayer('MID'));
  for (let i = 0; i < 6; i++) players.push(generatePlayer('FWD'));
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
    const players = generateSquad();
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
  const players = generateSquad();
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
