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
  if (!baseOrder.includes(userTeamId)) {
    baseOrder.unshift(userTeamId);
  }
  let preliminaryTeams = baseOrder.slice(0, 8);
  if (!preliminaryTeams.includes(userTeamId)) {
    preliminaryTeams = [userTeamId, ...preliminaryTeams.slice(0, 7)];
  }
  const directStageTeams = baseOrder.filter(id => !preliminaryTeams.includes(id));

  const stages: CupStage[] = CUP_STAGE_DEFS.map(def => ({
    ...def,
    matches: [],
    completed: false
  }));

  stages[0].matches = pairTeams(preliminaryTeams, stages[0].id);

  return {
    stages,
    currentStageIndex: 0,
    stageSeeds: {
      0: preliminaryTeams,
      1: directStageTeams
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
    entrants = state.cup.stageSeeds[0] ?? [];
  } else {
    const previousStage = state.cup.stages[stageIndex - 1];
    if (!previousStage || !previousStage.completed) {
      return state;
    }
    const winners = getCupStageWinners(previousStage);
    const seeds = state.cup.stageSeeds[stageIndex] ?? [];
    entrants = [...winners, ...seeds];
  }
  if (entrants.length % 2 === 1) {
    entrants = entrants.slice(0, entrants.length - 1);
  }
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

