import type { League, Team } from '../game/types';

interface Props {
  teams: Record<string, Team>;
  league: League;
  onSelect: (teamId: string) => void;
}

export default function TeamSelect({ teams, league, onSelect }: Props) {
  const ids = (league.teamIds && league.teamIds.length > 0) ? league.teamIds : Object.keys(teams);
  const list = ids.map(id => teams[id]).filter((t): t is Team => Boolean(t));

  return (
    <div className="panel">
      <h2>Choisis ton équipe</h2>
      <p className="muted">{list.length} équipe(s) disponible(s)</p>
      {list.length === 0 ? <p className="muted">Aucune équipe trouvée. Vérifie la génération de ligue.</p> : null}
      <div className="team-grid">
        {list.map(team => {
          const gen = team.strength || 55;
          const funds = (team.funds / 1_000_000).toFixed(0);
          return (
            <button key={team.id} className="team-card" onClick={() => onSelect(team.id)}>
              <div className="team-card__header">
                {team.logoUrl ? (
                  <img
                    className="team-logo"
                    src={team.logoUrl}
                    alt={team.shortName}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                  />
                ) : <img className="team-logo" src="/vite.svg" alt={team.shortName} />}
                <div className="team-title">
                  <div className="team-name">{team.name}</div>
                  <div className="team-short muted">{team.shortName}</div>
                </div>
              </div>
              <div className="team-meta">
                <span className="pill pill--gen">GEN {gen}</span>
                <span className="pill">€{funds}M</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


