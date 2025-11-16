import type { League, Team } from './types';
import { getTeamBaseOverall } from './data/ratings';
import { calculateTeamBudget } from './generator';

type ApiFootballTeam = {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    logo: string | null;
    founded: number | null;
  };
};

type ApiFootballTeamsResponse = {
  response: ApiFootballTeam[];
};

export async function fetchLeagueFromApiFootball(leagueId: number, season: number, apiKey: string): Promise<{ teams: Record<string, Team>; league: League }> {
  const endpoint = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`;
  const res = await fetch(endpoint, {
    headers: {
      'x-apisports-key': apiKey,
      'accept': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`API-FOOTBALL HTTP ${res.status}`);
  }
  const data = await res.json() as ApiFootballTeamsResponse;
  const response = data.response ?? [];

  const teams: Record<string, Team> = {};
  const teamIds: string[] = [];
  for (const item of response) {
    const t = item.team;
    if (!t || !t.name) continue;
    const id = String(t.id ?? crypto.randomUUID());
    const short = (t.code && t.code.trim().length >= 2 ? t.code.trim().toUpperCase() : t.name.slice(0, 3).toUpperCase());
    // Budget basé sur la note attendue de l'équipe (sera recalculé après génération de l'effectif)
    const expectedStrength = getTeamBaseOverall(t.name);
    const team: Team = {
      id,
      name: t.name,
      shortName: short,
      logoUrl: t.logo ?? undefined,
      // effectif généré plus tard par notre générateur
      players: [],
      strength: expectedStrength, // Force temporaire basée sur le nom
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      funds: calculateTeamBudget(expectedStrength)
    };
    teams[id] = team;
    teamIds.push(id);
  }

  const league: League = {
    id: crypto.randomUUID(),
    name: `Ligue ${leagueId} (${season})`,
    teamIds,
    schedule: []
  };

  return { teams, league };
}

// Fallback via standings: extrait les équipes à partir du classement
type ApiFootballStandingsTeam = {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
};
type ApiFootballStandingsLeague = {
  league: {
    id: number;
    name: string;
    standings: ApiFootballStandingsTeam[][];
  };
};
type ApiFootballStandingsResponse = {
  response: ApiFootballStandingsLeague[];
};

export async function fetchLeagueTeamsFromStandings(leagueId: number, season: number, apiKey: string): Promise<{ teams: Record<string, Team>; league: League }> {
  const endpoint = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`;
  const res = await fetch(endpoint, {
    headers: {
      'x-apisports-key': apiKey,
      'accept': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`API-FOOTBALL standings HTTP ${res.status}`);
  }
  const data = await res.json() as ApiFootballStandingsResponse;
  const first = data.response?.[0];
  const groups = first?.league?.standings?.[0] ?? [];

  const teams: Record<string, Team> = {};
  const teamIds: string[] = [];
  for (const row of groups) {
    const t = row.team;
    if (!t || !t.name) continue;
    const id = String(t.id ?? crypto.randomUUID());
    const short = t.name.slice(0, 3).toUpperCase();
    // Budget basé sur la note attendue de l'équipe (sera recalculé après génération de l'effectif)
    const expectedStrength = getTeamBaseOverall(t.name);
    teams[id] = {
      id,
      name: t.name,
      shortName: short,
      logoUrl: t.logo ?? undefined,
      players: [],
      strength: expectedStrength, // Force temporaire basée sur le nom
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      funds: calculateTeamBudget(expectedStrength)
    };
    teamIds.push(id);
  }

  const league: League = {
    id: crypto.randomUUID(),
    name: `Ligue ${leagueId} (${season})`,
    teamIds,
    schedule: []
  };
  return { teams, league };
}

// Récupère les saisons disponibles pour une ligue
type ApiFootballLeaguesResponse = {
  response: Array<{
    league: { id: number; name: string };
    seasons: Array<{ year: number; current: boolean; coverage?: { standings?: boolean } }>;
  }>;
};

export async function fetchLeagueSeasons(leagueId: number, apiKey: string): Promise<number[]> {
  const endpoint = `https://v3.football.api-sports.io/leagues?id=${leagueId}`;
  const res = await fetch(endpoint, {
    headers: {
      'x-apisports-key': apiKey,
      'accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`API-FOOTBALL leagues HTTP ${res.status}`);
  const data = await res.json() as ApiFootballLeaguesResponse;
  const seasons = data.response?.[0]?.seasons ?? [];
  return seasons.map(s => s.year).sort((a, b) => b - a);
}


