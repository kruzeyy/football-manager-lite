import { useState } from 'react';
import type { GameState, Player } from '../game/types';

interface Props {
  state: GameState;
}

function PlayerDetailModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const stats = player.stats || { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
  const avgGoals = stats.matchesPlayed > 0 ? (stats.goals / stats.matchesPlayed).toFixed(2) : '0.00';
  const avgAssists = stats.matchesPlayed > 0 ? (stats.assists / stats.matchesPlayed).toFixed(2) : '0.00';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'var(--panel)',
          border: '2px solid var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{player.name}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg)',
              padding: '4px 12px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* Informations générales */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--muted)' }}>Informations</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Âge</div>
                <div style={{ fontWeight: 700 }}>{player.age} ans</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Poste</div>
                <div>
                  <span className={`pos pos-${player.position.toLowerCase()}`}>
                    {player.position}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>GEN</div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{player.overall}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Forme</div>
                <div style={{ fontWeight: 700 }}>{player.fitness}%</div>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--muted)' }}>Statistiques</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Matchs joués</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>{stats.matchesPlayed}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Buts</div>
                <div style={{ fontWeight: 800, fontSize: 24, color: 'var(--accent)' }}>{stats.goals}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Passes décisives</div>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#38bdf8' }}>{stats.assists}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Cartons jaunes</div>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#fde047' }}>{stats.yellowCards}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Cartons rouges</div>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#ef4444' }}>{stats.redCards}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Buts/match</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>{avgGoals}</div>
              </div>
            </div>
            {stats.matchesPlayed > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Passes décisives/match</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{avgAssists}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SquadView({ state }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const players: Player[] = state.teams[state.userTeamId].players
    .slice()
    .sort((a, b) => b.overall - a.overall);

  return (
    <>
      <div className="panel">
        <h2>Effectif</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Âge</th>
              <th>Poste</th>
              <th>GEN</th>
              <th>Forme</th>
              <th>Matchs</th>
              <th>Buts</th>
              <th>Passes</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const stats = p.stats || { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'var(--cardHover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = '';
                  }}
                >
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.age}</td>
                  <td>
                    <span className={`pos pos-${p.position.toLowerCase()}`}>
                      {p.position}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{p.overall}</td>
                  <td>{p.fitness}</td>
                  <td>{stats.matchesPlayed}</td>
                  <td style={{ fontWeight: 700, color: stats.goals > 0 ? 'var(--accent)' : 'inherit' }}>
                    {stats.goals}
                  </td>
                  <td style={{ fontWeight: 700, color: stats.assists > 0 ? '#38bdf8' : 'inherit' }}>
                    {stats.assists}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}
