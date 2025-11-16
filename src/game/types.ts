export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PlayerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  overall: number; // 1-100
  fitness: number; // 0-100
  stats?: PlayerStats;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  players: Player[];
  strength: number; // derived average
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  funds: number;
}

export interface Match {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  playedAt?: string;
  homeScorers?: string[]; // Noms des buteurs de l'équipe à domicile
  awayScorers?: string[]; // Noms des buteurs de l'équipe à l'extérieur
}

export interface League {
  id: string;
  name: string;
  teamIds: string[];
  schedule: Match[];
}

export interface GameState {
  userTeamId: string;
  league: League;
  teams: Record<string, Team>;
  currentRound: number; // starts at 1
}
