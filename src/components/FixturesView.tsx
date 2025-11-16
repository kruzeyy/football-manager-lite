import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

export default function FixturesView({ state }: Props) {
  const { league, teams, currentRound } = state;
  const fixtures = league.schedule.filter(m => m.round === currentRound);
  return (
    <div className="panel">
      <h2>Calendrier — Journée {currentRound}</h2>
      <ul>
        {fixtures.map(m => (
          <li key={m.id}>
            {teams[m.homeTeamId].shortName} vs {teams[m.awayTeamId].shortName}
            {m.homeGoals != null && m.awayGoals != null ? ` — ${m.homeGoals}:${m.awayGoals}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
