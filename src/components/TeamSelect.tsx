import type { League, Team } from '../game/types';

interface Props {
  teams: Record<string, Team>;
  league: League;
  onSelect: (teamId: string) => void;
  onBack?: () => void;
}

export default function TeamSelect({ teams, league, onSelect, onBack }: Props) {
  const ids = (league.teamIds && league.teamIds.length > 0) ? league.teamIds : Object.keys(teams);
  // Filtrer uniquement les équipes qui existent réellement
  const list = ids.map(id => teams[id]).filter((t): t is Team => Boolean(t));

  // Afficher toutes les équipes d'un coup (pas de rendu progressif)
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '2px solid #4a90e2',
              borderRadius: '8px',
              color: '#4a90e2',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4a90e2';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#4a90e2';
            }}
          >
            ← Retour
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Choisis ton équipe</h2>
          <p className="muted" style={{ marginTop: '8px', marginBottom: 0 }}>
            {list.length} équipe(s) disponible(s) - {league.name}
          </p>
        </div>
      </div>
      {list.length === 0 ? <p className="muted">Chargement des équipes...</p> : null}
      <div className="team-grid">
        {list.map(team => {
          const gen = team.strength || 55;
          const funds = (team.funds / 1_000_000).toFixed(0);
          return (
            <button 
              key={team.id} 
              className="team-card" 
              onClick={() => {
                console.log('[TeamSelect] 🖱️ Team clicked:', team.id, team.name);
                onSelect(team.id);
              }}
            >
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


