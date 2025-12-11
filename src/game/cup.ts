import type { CupMatch, CupStage, CupState, GameState } from './types';

export const CUP_STAGE_DEFS = [
  { id: 'prelim', name: 'Tour préliminaire', triggerRound: 5 },
  { id: 'round16', name: 'Huitièmes de finale', triggerRound: 10 },
  { id: 'quarters', name: 'Quarts de finale', triggerRound: 20 },
  { id: 'semis', name: 'Demi-finales', triggerRound: 30 },
  { id: 'final', name: 'Finale', triggerRound: 38 }
] as const;

function shuffle<T>(arr: T[]): T[] {
  return arr
    .slice()
    .sort(() => Math.random() - 0.5);
}

function pairTeams(teamIds: string[], stageId: string): CupMatch[] {
  const shuffled = shuffle(teamIds);
  const matches: CupMatch[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const home = shuffled[i];
    const away = shuffled[i + 1];
    if (!home || !away) continue;
    matches.push({
      id: crypto.randomUUID(),
      stageId,
      homeTeamId: home,
      awayTeamId: away,
      homeGoals: null,
      awayGoals: null
    });
  }
  return matches;
}

export function createInitialCupState(teamIds: string[], userTeamId: string): CupState {
  const baseOrder = shuffle(teamIds);
  // S'assurer que l'équipe de l'utilisateur est incluse
  if (!baseOrder.includes(userTeamId)) {
    baseOrder.unshift(userTeamId);
  }
  
  // TOUTES les équipes commencent au tour préliminaire
  // Si le nombre d'équipes est impair, retirer la dernière équipe (mais jamais celle de l'utilisateur)
  let preliminaryTeams = [...baseOrder];
  if (preliminaryTeams.length % 2 === 1) {
    // Si impair, retirer la dernière équipe (si ce n'est pas celle de l'utilisateur)
    const lastTeam = preliminaryTeams[preliminaryTeams.length - 1];
    if (lastTeam === userTeamId && preliminaryTeams.length > 1) {
      // Si c'est l'équipe de l'utilisateur, retirer l'avant-dernière
      preliminaryTeams = preliminaryTeams.slice(0, preliminaryTeams.length - 2).concat([userTeamId]);
    } else {
      preliminaryTeams = preliminaryTeams.slice(0, preliminaryTeams.length - 1);
    }
  }

  const stages: CupStage[] = CUP_STAGE_DEFS.map(def => ({
    ...def,
    matches: [],
    completed: false
  }));

  // Toutes les équipes commencent au tour préliminaire
  stages[0].matches = pairTeams(preliminaryTeams, stages[0].id);

  return {
    stages,
    currentStageIndex: 0,
    stageSeeds: {
      0: preliminaryTeams
    }
  };
}

export function getCupStageWinners(stage: CupStage): string[] {
  return stage.matches
    .filter(m => m.homeGoals != null && m.awayGoals != null)
    .map(match => {
      if (match.homeGoals! > match.awayGoals!) return match.homeTeamId;
      if (match.awayGoals! > match.homeGoals!) return match.awayTeamId;
      if (match.penalties) {
        return match.penalties.home > match.penalties.away ? match.homeTeamId : match.awayTeamId;
      }
      return match.homeTeamId;
    });
}

export function prepareCupStage(state: GameState, stageIndex: number): GameState {
  const stage = state.cup.stages[stageIndex];
  if (!stage || stage.matches.length > 0) {
    return state;
  }
  let entrants: string[] = [];
  if (stageIndex === 0) {
    // Le tour préliminaire utilise déjà toutes les équipes, pas besoin de le préparer à nouveau
    entrants = state.cup.stageSeeds[0] ?? [];
    // Pour le tour préliminaire, on peut utiliser pairTeams (shuffle)
    const updatedStage: CupStage = {
      ...stage,
      matches: pairTeams(entrants, stage.id)
    };
    const stages = state.cup.stages.map((s, idx) => (idx === stageIndex ? updatedStage : s));
    return {
      ...state,
      cup: {
        ...state.cup,
        stages
      }
    };
  } else {
    // Pour les stages suivants, utiliser uniquement les gagnants du stage précédent
    const previousStage = state.cup.stages[stageIndex - 1];
    if (!previousStage || !previousStage.completed) {
      return state;
    }
    // Récupérer les gagnants DANS L'ORDRE des matchs (pas shuffle)
    // Le gagnant du match 1 joue contre le gagnant du match 2, etc.
    const winners = getCupStageWinners(previousStage);
    if (winners.length % 2 === 1) {
      // Retirer une équipe si nombre impair (mais pas l'équipe du joueur)
      const nonUserIndex = winners.findIndex(id => id !== state.userTeamId);
      if (nonUserIndex !== -1) {
        winners.splice(nonUserIndex, 1);
      } else if (winners.length > 1) {
        winners.pop();
      }
    }
    
    // Apparier les gagnants dans l'ordre : match 1 vs match 2, match 3 vs match 4, etc.
    const matches: CupMatch[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      const home = winners[i];
      const away = winners[i + 1];
      if (!home || !away) continue;
      matches.push({
        id: crypto.randomUUID(),
        stageId: stage.id,
        homeTeamId: home,
        awayTeamId: away,
        homeGoals: null,
        awayGoals: null,
        penalties: null
      });
    }
    
    const updatedStage: CupStage = {
      ...stage,
      matches
    };
    const stages = state.cup.stages.map((s, idx) => (idx === stageIndex ? updatedStage : s));
    return {
      ...state,
      cup: {
        ...state.cup,
        stages
      }
    };
  }
}

export function isCupStageUnlocked(state: GameState): boolean {
  const stage = state.cup.stages[state.cup.currentStageIndex];
  if (!stage) return false;
  return state.currentRound > stage.triggerRound && !stage.completed;
}

export function completeCupStage(state: GameState, stageIndex: number): GameState {
  const stages = state.cup.stages.map((stage, idx) =>
    idx === stageIndex ? { ...stage, completed: true } : stage
  );
  return {
    ...state,
    cup: {
      ...state.cup,
      stages,
      currentStageIndex: Math.min(stageIndex + 1, stages.length)
    }
  };
}

