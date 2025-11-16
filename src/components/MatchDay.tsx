import type { GameState, Match } from '../game/types';
import { simulateMatch, applyMatchResult } from '../game/engine';

interface Props {
  state: GameState;
  setState: (s: GameState) => void;
}

export default function MatchDay({ state, setState }: Props) {
  const { league, currentRound } = state;
  const roundMatches = league.schedule.filter(m => m.round === currentRound && m.homeGoals == null && m.awayGoals == null);

  const playRound = () => {
    const newState: GameState = JSON.parse(JSON.stringify(state));
    for (const match of newState.league.schedule.filter(m => m.round === newState.currentRound)) {
      if (match.homeGoals != null && match.awayGoals != null) continue;
      const { home, away } = simulateMatch(newState, match);
      match.homeGoals = home;
      match.awayGoals = away;
      match.playedAt = new Date().toISOString();
      applyMatchResult(newState, match, home, away);
    }
    newState.currentRound += 1;
    setState(newState);
  };

  return (
    <div className="panel">
      <h2>Jour de match — Journée {currentRound}</h2>
      <p>{roundMatches.length} matchs à jouer.</p>
      <button onClick={playRound}>Simuler la journée</button>
    </div>
  );
}
