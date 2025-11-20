import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DragEvent } from 'react';
import type { GameState, Player, Team } from '../game/types';

const SLOT_POSITIONS: Array<Player['position']> = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
const SLOT_COUNT = SLOT_POSITIONS.length;
const STARTERS_COUNT = SLOT_COUNT;

function seedSlots(team: Team): string[] {
  const byOverallDesc = (a: Player, b: Player) => b.overall - a.overall;
  const available = team.players.slice().sort(byOverallDesc);
  const used = new Set<string>();
  return SLOT_POSITIONS.map(pos => {
    const exact = available.find(p => p.position === pos && !used.has(p.id));
    if (exact) {
      used.add(exact.id);
      return exact.id;
    }
    const fallback = available.find(p => !used.has(p.id));
    if (fallback) {
      used.add(fallback.id);
      return fallback.id;
    }
    return '';
  });
}

function ensureSlotArray(ids: string[] | undefined): string[] {
  const copy = ids ? ids.slice(0, SLOT_COUNT) : [];
  while (copy.length < SLOT_COUNT) copy.push('');
  return copy;
}

function resolvePreferredXI(team: Team): string[] {
  if (team.preferredXI && team.preferredXI.length === SLOT_COUNT) {
    return ensureSlotArray(team.preferredXI);
  }
  return seedSlots(team);
}

function buildLineup(team: Team, slotOrder: string[]): (Player | null)[] {
  const playersById: Record<string, Player> = {};
  team.players.forEach(p => { playersById[p.id] = p; });
  return slotOrder.map(id => (id && playersById[id]) ? playersById[id] : null);
}

const Pitch433 = ({
  team,
  slots,
  highlightIds = [],
  onDropSlot,
  onDragStart,
  onDragEnd
}: {
  team: Team;
  slots: (Player | null)[];
  highlightIds?: string[];
  onDropSlot: (slotIndex: number) => void;
  onDragStart: (player: Player, e?: DragEvent) => void;
  onDragEnd: () => void;
}) => {
  const renderRow = (players: (Player | null)[], cols: number[], offset: number) => (
    <div className="pitch-row">
      {cols.map((col, idx) => {
        const slotIndex = offset + idx;
        const p = players[idx];
        const isHighlight = p && highlightIds.includes(p.id);
        return (
          <div
            key={`${col}-${idx}`}
            className={`pitch-cell ${isHighlight ? 'pitch-cell--highlight' : ''}`}
            style={{ gridColumn: col }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onDropSlot(slotIndex);
            }}
          >
            {p ? (
              <div
                className={`shirt ${isHighlight ? 'shirt--highlight' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(p, e)}
                onDragEnd={onDragEnd}
              >
                <span className="shirt-num">{p.overall}</span>
              </div>
            ) : <div className="shirt shirt--ghost" />}
            <div className="player-label">{p ? p.name : ''}</div>
          </div>
        );
      })}
    </div>
  );

  const rowFwd = slots.slice(8, 11);
  const rowMid = slots.slice(5, 8);
  const rowDef = slots.slice(1, 5);
  const rowGk = slots.slice(0, 1);

  return (
    <div className="pitch">
      <div className="pitch-header">
        <img className="mini-logo" src={team.logoUrl || '/vite.svg'} alt={team.shortName} onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }} />
        <div className="ellipsis">{team.name}</div>
        <span className="muted" style={{ marginLeft: 'auto' }}>4-3-3</span>
      </div>
      <div className="pitch-grid">
        {renderRow(rowFwd, [2, 5, 8], 8)}
        {renderRow(rowMid, [3, 5, 7], 5)}
        {renderRow(rowDef, [2, 4, 6, 8], 1)}
        {renderRow(rowGk, [5], 0)}
      </div>
    </div>
  );
};

interface Props {
  state: GameState;
  setState: Dispatch<SetStateAction<GameState | null>>;
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

export default function SquadView({ state, setState }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [changeOut, setChangeOut] = useState<Player | null>(null);
  const [changeIn, setChangeIn] = useState<Player | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draggingPlayer, setDraggingPlayer] = useState<Player | null>(null);
  const team = state.teams[state.userTeamId];
  const players: Player[] = useMemo(
    () => team.players.slice().sort((a, b) => b.overall - a.overall),
    [team.players]
  );
  const slotOrder = useMemo(() => resolvePreferredXI(team), [team.preferredXI, team.players]);
  const starterIds = useMemo(() => new Set(slotOrder.filter(Boolean)), [slotOrder]);
  const startersCount = Array.from(starterIds).length;
  const lineupSlots = useMemo(() => buildLineup(team, slotOrder), [team, slotOrder]);
  const highlightIds = useMemo(() => {
    const ids: string[] = [];
    if (changeOut) ids.push(changeOut.id);
    if (changeIn) ids.push(changeIn.id);
    if (draggingPlayer) ids.push(draggingPlayer.id);
    return ids;
  }, [changeOut, changeIn, draggingPlayer]);

  const updatePreferredXI = (mutator: (current: string[]) => string[]) => {
    setState(prev => {
      if (!prev) return prev;
      const currentTeam = prev.teams[prev.userTeamId];
      if (!currentTeam) return prev;
      const currentXI = resolvePreferredXI(currentTeam);
      const nextXI = ensureSlotArray(mutator([...currentXI]));
      const nextTeam: Team = {
        ...currentTeam,
        preferredXI: nextXI
      };
      return {
        ...prev,
        teams: {
          ...prev.teams,
          [prev.userTeamId]: nextTeam
        }
      };
    });
  };

  const applyDragDrop = (dragId: string, targetSlot: number | null, options?: { benchDrop?: boolean }) => {
    updatePreferredXI(currentXI => {
      const next = ensureSlotArray(currentXI);
      const dragIndex = next.indexOf(dragId);
      if (options?.benchDrop) {
        if (dragIndex !== -1) next[dragIndex] = '';
        return next;
      }
      if (targetSlot == null || targetSlot < 0 || targetSlot >= SLOT_COUNT) return next;
      if (dragIndex === -1) {
        next[targetSlot] = dragId;
        return next;
      }
      if (dragIndex === targetSlot) return next;
      const tmp = next[targetSlot];
      next[targetSlot] = dragId;
      next[dragIndex] = tmp;
      return next;
    });
  };

  const handleSubstitution = () => {
    if (!changeOut || !changeIn) return;
    const slotIndex = slotOrder.indexOf(changeOut.id);
    if (slotIndex === -1) {
      setFeedback('Veuillez choisir un titulaire à sortir.');
      return;
    }
    updatePreferredXI(currentXI => {
      const next = ensureSlotArray(currentXI);
      for (let i = 0; i < next.length; i++) {
        if (next[i] === changeIn.id && i !== slotIndex) next[i] = '';
      }
      next[slotIndex] = changeIn.id;
      return next;
    });
    setFeedback(`${changeIn.name} remplace ${changeOut.name}.`);
    setChangeOut(null);
    setChangeIn(null);
  };

  const clearSelection = () => {
    setChangeOut(null);
    setChangeIn(null);
    setFeedback(null);
  };

  const handleDragStart = (player: Player, e?: DragEvent) => {
    setDraggingPlayer(player);
    e?.dataTransfer?.setData('text/plain', player.id);
  };

  const handleDragEnd = () => {
    setDraggingPlayer(null);
  };

  const handleDropOnSlot = (slotIndex: number) => {
    if (!draggingPlayer) return;
    applyDragDrop(draggingPlayer.id, slotIndex);
    setFeedback(`${draggingPlayer.name} occupe une nouvelle position.`);
    setDraggingPlayer(null);
  };

  const handleDropToBench = () => {
    if (!draggingPlayer) return;
    if (!starterIds.has(draggingPlayer.id)) return;
    applyDragDrop(draggingPlayer.id, null, { benchDrop: true });
    setFeedback(`${draggingPlayer.name} passe sur le banc.`);
    setDraggingPlayer(null);
  };

  const handleDropOnRow = (target: Player) => {
    if (!draggingPlayer || draggingPlayer.id === target.id) return;
    const slotIndex = slotOrder.indexOf(target.id);
    if (slotIndex === -1) return;
    applyDragDrop(draggingPlayer.id, slotIndex);
    setFeedback(`${draggingPlayer.name} échange avec ${target.name}.`);
    setDraggingPlayer(null);
  };

  return (
    <>
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <h2 style={{ margin: 0 }}>Effectif</h2>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {startersCount} / {STARTERS_COUNT} titulaires sélectionnés
          </div>
        </div>
        {feedback && (
          <div className="feedback-banner" style={{ margin: '16px 0', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)', fontSize: 13 }}>
            {feedback}
          </div>
        )}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Disposition actuelle (4-3-3)</div>
          <Pitch433
            team={team}
            slots={lineupSlots}
            highlightIds={highlightIds}
            onDropSlot={handleDropOnSlot}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            Glisse n’importe quel joueur sur le poste de ton choix : les attaquants peuvent descendre en défense, les milieux monter en attaque, etc.
          </div>
        </div>
        <div
          className={`bench-dropzone ${draggingPlayer && starterIds.has(draggingPlayer.id) ? 'bench-dropzone--active' : ''}`}
          onDragOver={(e) => {
            if (draggingPlayer && starterIds.has(draggingPlayer.id)) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDropToBench();
          }}
        >
          Dépose un titulaire ici pour l’envoyer sur le banc
        </div>
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
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const stats = p.stats || { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
              const isStarter = starterIds.has(p.id);
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  style={{ cursor: 'pointer' }}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(p, e);
                  }}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnRow(p);
                  }}
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
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: isStarter ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                        color: isStarter ? '#22c55e' : 'var(--muted)'
                      }}
                    >
                      {isStarter ? 'Titulaire' : 'Banc'}
                    </span>
                  </td>
                  <td>
                    {isStarter ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setChangeOut(p); }}
                        style={{
                          border: '1px solid rgba(248,113,113,0.4)',
                          background: changeOut?.id === p.id ? 'rgba(248,113,113,0.2)' : 'transparent',
                          color: '#f87171',
                          padding: '4px 8px',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Sortir
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setChangeIn(p); }}
                        style={{
                          border: '1px solid rgba(59,130,246,0.4)',
                          background: changeIn?.id === p.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                          color: '#60a5fa',
                          padding: '4px 8px',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Entrer
                      </button>
                    )}
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
