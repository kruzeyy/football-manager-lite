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

export interface ClubFacilities {
  stadium: number; // capacité / infrastructure
  hospitality: number; // confort supporters
  medical: number; // soins / staff médical
  youth: number; // centre de formation
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  players: Player[];
  strength: number; // derived average
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  funds: number;
  preferredXI?: string[];
  facilities?: ClubFacilities;
}

export interface SponsorContract {
  id: string;
  name: string;
  bonus: number;
  duration: string;
  description: string;
}

export interface TvDeal {
  id: string;
  name: string;
  payout: number;
  description: string;
  expectation: string;
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

export interface CupMatch {
  id: string;
  stageId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeScorers?: string[];
  awayScorers?: string[];
  decidedBy?: 'REGULATION' | 'PENALTIES';
  penalties?: { home: number; away: number };
  playedAt?: string;
}

export interface CupStage {
  id: string;
  name: string;
  triggerRound: number;
  matches: CupMatch[];
  completed: boolean;
}

export interface CupState {
  stages: CupStage[];
  currentStageIndex: number;
  stageSeeds: Record<number, string[]>;
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
  cup: CupState;
  economy?: {
    sponsor?: SponsorContract;
    tvDeal?: TvDeal;
  };
}
