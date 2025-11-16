import type { GameState, Team, Player } from '../game/types';
import { getStadiumForTeam } from '../game/data/stadiums';

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
  const venueTeam: Team | null = next ? state.teams[next.homeTeamId] : null;
  const venue = venueTeam ? getStadiumForTeam(venueTeam.name) : null;
  // Sélection simple d'un XI type (4-4-2) pour affichage rapide
  const pickLineup = (team: Team | null): { gk: Player[]; def: Player[]; mid: Player[]; fwd: Player[] } => {
    if (!team) return { gk: [], def: [], mid: [], fwd: [] };
    const byOverallDesc = (a: Player, b: Player) => b.overall - a.overall;
    const gk = team.players.filter(p => p.position === 'GK').sort(byOverallDesc).slice(0,1);
    const def = team.players.filter(p => p.position === 'DEF').sort(byOverallDesc).slice(0,4);
    const mid = team.players.filter(p => p.position === 'MID').sort(byOverallDesc).slice(0,3);
    const fwd = team.players.filter(p => p.position === 'FWD').sort(byOverallDesc).slice(0,3);
    return { gk, def, mid, fwd };
  };
  const userXI = pickLineup(user);
  const oppXI = pickLineup(opponent);

  // Mini rendu de compo 4-3-3 sur une pelouse
  const Pitch433 = ({ team, xi, reversed = false }: { team: Team; xi: { gk: any[]; def: any[]; mid: any[]; fwd: any[] }; reversed?: boolean }) => {
    const renderRow = (players: any[], cols: number[]) => (
      <div className="pitch-row">
        {cols.map((col, idx) => {
          const p = players[idx];
          return (
            <div key={idx} className="pitch-cell" style={{ gridColumn: col }}>
              {p ? (
                <div className="shirt">
                  <span className="shirt-num">{p.overall}</span>
                </div>
              ) : <div className="shirt shirt--ghost" />}
              <div className="player-label">{p ? p.name : ''}</div>
            </div>
          );
        })}
      </div>
    );
    return (
      <div className={`pitch ${reversed ? 'pitch--reversed' : ''}`}>
        <div className="pitch-header">
          <img className="mini-logo" src={team.logoUrl || '/vite.svg'} alt={team.shortName} onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }} />
          <div className="ellipsis">{team.name}</div>
          <span className="muted" style={{ marginLeft: 'auto' }}>4-3-3</span>
        </div>
        <div className="pitch-grid">
          {/* Lignes haut -> bas: ATT (3), MID (3), DEF (4), GK (1) */}
          {renderRow(xi.fwd, [2, 5, 8])}
          {renderRow(xi.mid, [3, 5, 7])}
          {renderRow(xi.def, [2, 4, 6, 8])}
          <div className="pitch-row">
            <div className="pitch-cell" style={{ gridColumn: 5 }}>
              {xi.gk[0] ? (
                <div className="shirt shirt--gk">
                  <span className="shirt-num">{xi.gk[0].overall}</span>
                </div>
              ) : <div className="shirt shirt--ghost" />}
              <div className="player-label">{xi.gk[0]?.name || ''}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          <div className="fixture-header">
            <div className="pill">Journée {state.currentRound}</div>
            <div className="flex-spacer" />
            {next ? (
              <div className={`pill ${next.homeTeamId === user.id ? 'pill--home' : 'pill--away'}`}>
                {next.homeTeamId === user.id ? 'À domicile' : 'À l’extérieur'}
              </div>
            ) : null}
          </div>
          <div className="card-title">Prochain match</div>
          {next && opponent ? (
            <div className="next-fixture next-fixture--pretty">
              <div className="fixture-col">
                <img
                  className="fixture-logo fixture-logo--xl"
                  src={state.teams[next.homeTeamId].logoUrl || '/vite.svg'}
                  alt="home"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                />
                <div className="fixture-name fixture-name--lg">{state.teams[next.homeTeamId].shortName}</div>
                <div className="pill pill--gen">GEN {state.teams[next.homeTeamId].strength}</div>
              </div>
              <div className="vs-badge">VS</div>
              <div className="fixture-col">
                <img
                  className="fixture-logo fixture-logo--xl"
                  src={state.teams[next.awayTeamId].logoUrl || '/vite.svg'}
                  alt="away"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                />
                <div className="fixture-name fixture-name--lg">{state.teams[next.awayTeamId].shortName}</div>
                <div className="pill pill--gen">GEN {state.teams[next.awayTeamId].strength}</div>
              </div>
            </div>
          ) : (
            <div className="muted">Aucun match à venir.</div>
          )}
          {next && venue ? (
            <div className="stadium">
              <img className="stadium-img" src={venue.imagePath} alt={venue.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="stadium-caption">
                <span className="muted">Stade:</span> {venue.name}
              </div>
            </div>
          ) : null}

        </div>

        {/* Carte dédiée aux compositions (placée juste en dessous du prochain match) */}
        {opponent ? (
          <div className="card card--lineups">
            <div className="card-title">Compositions probables (4-3-3)</div>
            <div className="pitches pitches--compact">
              <div className="lineup-col">
                <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>Équipe type {user.shortName}</div>
                <Pitch433 team={user} xi={userXI} />
              </div>
              <div className="lineup-col">
                <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>Équipe type {opponent.shortName}</div>
                <Pitch433 team={opponent} xi={oppXI} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="card card--standings">
          <div className="card-title">Classement</div>
          <table className="mini-table">
            <thead>
              <tr>
                <th>#</th>
                <th></th>
                <th>Équipe</th>
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
