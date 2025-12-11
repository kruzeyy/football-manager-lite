import type { GameState, Team, League } from './types';
import { generateRoundRobinSchedule } from './schedule';

export interface PromotionRelegationResult {
  newLigue1Teams: string[];
  newLigue2Teams: string[];
  playoffResults: Array<{
    match1: { team1: string; team2: string; winner: string };
    match2: { team1: string; team2: string; winner: string };
    final: { team1: string; team2: string; winner: string };
  }>;
}

/**
 * Calcule les promotions et relégations entre Ligue 1 et Ligue 2
 * Règles:
 * - Les 2 premiers de Ligue 2 montent directement en Ligue 1
 * - Le 5ème de Ligue 2 joue contre le 4ème de Ligue 2 (match 1)
 * - Le gagnant joue contre le 3ème de Ligue 2 (match 2)
 * - Le gagnant joue contre le 17ème de Ligue 1 (final)
 * - Le gagnant reste/monte en Ligue 1, l'autre descend/reste en Ligue 2
 */
export function calculatePromotionRelegation(
  ligue1State: GameState,
  ligue2State: GameState
): PromotionRelegationResult | null {
  // Trier les équipes de chaque ligue
  const ligue1Teams = Object.values(ligue1State.teams)
    .filter(t => ligue1State.league.teamIds.includes(t.id))
    .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

  const ligue2Teams = Object.values(ligue2State.teams)
    .filter(t => ligue2State.league.teamIds.includes(t.id))
    .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

  if (ligue1Teams.length < 17 || ligue2Teams.length < 5) {
    return null; // Pas assez d'équipes
  }

  // Les 16 premiers de Ligue 1 restent
  const remainingLigue1 = ligue1Teams.slice(0, 16).map(t => t.id);

  // Les 17ème, 18ème, 19ème, 20ème de Ligue 1 descendent
  const relegatedFromLigue1 = ligue1Teams.slice(16, 20).map(t => t.id);

  // Les 2 premiers de Ligue 2 montent directement
  const promotedFromLigue2 = ligue2Teams.slice(0, 2).map(t => t.id);

  // Barrages: 3ème, 4ème, 5ème de Ligue 2 + 17ème de Ligue 1
  const ligue2_3rd = ligue2Teams[2].id;
  const ligue2_4th = ligue2Teams[3].id;
  const ligue2_5th = ligue2Teams[4].id;
  const ligue1_17th = ligue1Teams[16].id;

  // Simuler les barrages (match 1: 5ème vs 4ème)
  const match1Winner = simulatePlayoffMatch(ligue2_5th, ligue2_4th, ligue2State.teams);

  // Match 2: gagnant du match 1 vs 3ème
  const match2Winner = simulatePlayoffMatch(match1Winner, ligue2_3rd, ligue2State.teams);

  // Finale: gagnant du match 2 vs 17ème de Ligue 1
  const finalWinner = simulatePlayoffMatch(match2Winner, ligue1_17th, { ...ligue1State.teams, ...ligue2State.teams });

  const playoffResults = [{
    match1: { team1: ligue2_5th, team2: ligue2_4th, winner: match1Winner },
    match2: { team1: match1Winner, team2: ligue2_3rd, winner: match2Winner },
    final: { team1: match2Winner, team2: ligue1_17th, winner: finalWinner }
  }];

  // Déterminer qui monte/descend
  const newLigue1Teams: string[] = [...remainingLigue1, ...promotedFromLigue2];
  const newLigue2Teams: string[] = [...relegatedFromLigue1];

  if (finalWinner === ligue1_17th) {
    // Le 17ème de Ligue 1 reste
    newLigue1Teams.push(ligue1_17th);
    newLigue2Teams.push(...ligue2Teams.slice(2, 5).map(t => t.id));
  } else {
    // Le gagnant des barrages monte
    newLigue1Teams.push(finalWinner);
    newLigue2Teams.push(ligue1_17th);
    // Ajouter les perdants des barrages
    const playoffLosers = [ligue2_3rd, ligue2_4th, ligue2_5th].filter(id => id !== finalWinner);
    newLigue2Teams.push(...playoffLosers);
  }

  // Ajouter les équipes restantes de Ligue 2 (positions 6 à 20)
  newLigue2Teams.push(...ligue2Teams.slice(5).map(t => t.id));

  return {
    newLigue1Teams,
    newLigue2Teams,
    playoffResults
  };
}

/**
 * Simule un match de barrage (match simple, pas deux matchs)
 */
function simulatePlayoffMatch(team1Id: string, team2Id: string, teams: Record<string, Team>): string {
  const team1 = teams[team1Id];
  const team2 = teams[team2Id];

  if (!team1 || !team2) {
    // En cas d'erreur, retourner l'équipe la plus forte
    return team1 ? team1Id : team2Id;
  }

  // Calcul simple basé sur la force des équipes avec un peu de hasard
  const team1Strength = team1.strength + (Math.random() - 0.5) * 5;
  const team2Strength = team2.strength + (Math.random() - 0.5) * 5;

  return team1Strength > team2Strength ? team1Id : team2Id;
}

/**
 * Crée un nouveau GameState pour une nouvelle saison avec les nouvelles compositions de ligue
 */
export function createNewSeason(
  ligue1State: GameState,
  ligue2State: GameState,
  promotionResult: PromotionRelegationResult,
  userTeamId: string
): { ligue1State: GameState; ligue2State: GameState } {
  // Créer les nouvelles ligues
  const newLigue1: League = {
    ...ligue1State.league,
    id: crypto.randomUUID(),
    name: ligue1State.league.name.replace(/\d{4}/, (match) => String(parseInt(match) + 1)),
    teamIds: promotionResult.newLigue1Teams,
    schedule: []
  };

  const newLigue2: League = {
    ...ligue2State.league,
    id: crypto.randomUUID(),
    name: ligue2State.league.name.replace(/\d{4}/, (match) => String(parseInt(match) + 1)),
    teamIds: promotionResult.newLigue2Teams,
    schedule: []
  };

  // Générer les nouveaux calendriers
  newLigue1.schedule = generateRoundRobinSchedule(newLigue1);
  newLigue2.schedule = generateRoundRobinSchedule(newLigue2);

  // Fusionner toutes les équipes
  const allTeams = { ...ligue1State.teams, ...ligue2State.teams };

  // Réinitialiser les statistiques des équipes
  const resetTeam = (team: Team): Team => ({
    ...team,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0
  });

  const resetTeams = Object.fromEntries(
    Object.entries(allTeams).map(([id, team]) => [id, resetTeam(team)])
  );

  // Créer les nouveaux états
  const newLigue1State: GameState = {
    ...ligue1State,
    league: newLigue1,
    teams: resetTeams,
    currentRound: 1
  };

  const newLigue2State: GameState = {
    ...ligue2State,
    league: newLigue2,
    teams: resetTeams,
    currentRound: 1
  };

  return {
    ligue1State: newLigue1State,
    ligue2State: newLigue2State
  };
}

