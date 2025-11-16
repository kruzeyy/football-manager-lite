import type { GameState, Team } from '../game/types';

interface Props {
  state: GameState;
}

export default function Dashboard({ state }: Props) {
  const user: Team = state.teams[state.userTeamId];
  const table = Object.values(state.teams)
    .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  const rank = table.findIndex(t => t.id === user.id) + 1;
  const gd = user.goalsFor - user.goalsAgainst;

  // Prochain match (journée courante)
  const next = state.league.schedule.find(m =>
    m.round === state.currentRound &&
    (m.homeTeamId === user.id || m.awayTeamId === user.id)
  );
  const opponent: Team | null = next
    ? state.teams[next.homeTeamId === user.id ? next.awayTeamId : next.homeTeamId]
    : null;

  return (
    <div className="panel">
      <h2 className="center-title">Tableau de bord</h2>
      <div className="cards">
        <div className="card card--club">
          <div className="club-header">
            {user.logoUrl ? (
              <img
                className="club-logo"
                src={user.logoUrl}
                alt={user.shortName}
                onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
              />
            ) : null}
            <div>
              <div className="club-name">{user.name}</div>
              <div className="muted">Classement: {rank}/{table.length}</div>
            </div>
          </div>
          <div className="club-stats">
            <div className="stat"><span className="stat-label">Points</span><span className="stat-value">{user.points}</span></div>
            <div className="stat"><span className="stat-label">DG</span><span className="stat-value">{gd}</span></div>
            <div className="stat"><span className="stat-label">Trésorerie</span><span className="stat-value">€{(user.funds / 1_000_000).toFixed(1)}M</span></div>
          </div>
        </div>

        <div className="card card--fixture">
          <div className="card-title">Prochain match — Journée {state.currentRound}</div>
          {next && opponent ? (
            <div className="next-fixture">
              <div className="fixture-side">
                <img className="fixture-logo" src={state.teams[next.homeTeamId].logoUrl || '/vite.svg'} alt="home" onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }} />
                <div className="fixture-team">
                  <div className="fixture-name">{state.teams[next.homeTeamId].shortName}</div>
                  <div className="muted">{next.homeTeamId === user.id ? 'À domicile' : ''}</div>
                </div>
              </div>
              <div className="fixture-vs">VS</div>
              <div className="fixture-side">
                <img className="fixture-logo" src={state.teams[next.awayTeamId].logoUrl || '/vite.svg'} alt="away" onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }} />
                <div className="fixture-team">
                  <div className="fixture-name">{state.teams[next.awayTeamId].shortName}</div>
                  <div className="muted">{next.awayTeamId === user.id ? 'À l’extérieur' : ''}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="muted">Aucun match à venir.</div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Classement</div>
          <table className="mini-table">
            <thead>
              <tr>
                <th>#</th>
                <th colSpan={2}>Équipe</th>
                <th>Pts</th>
                <th>DG</th>
              </tr>
            </thead>
            <tbody>
              {table.map((t, i) => (
                <tr key={t.id} className={t.id === user.id ? 'row-you' : ''}>
                  <td>{i + 1}</td>
                  <td className="mini-logo-cell">
                    <img className="mini-logo" src={t.logoUrl || '/vite.svg'} alt={t.shortName} onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }} />
                  </td>
                  <td className="ellipsis">{t.name}</td>
                  <td>{t.points}</td>
                  <td>{t.goalsFor - t.goalsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
