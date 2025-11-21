import { useState, useMemo } from 'react';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
}

export default function FixturesView({ state }: Props) {
  const { league, teams, currentRound } = state;
  const userTeamId = state.userTeamId;
  
  // Grouper les matchs par journée
  const matchesByRound = useMemo(() => {
    const grouped: Record<number, typeof league.schedule> = {};
    league.schedule.forEach(match => {
      if (!grouped[match.round]) {
        grouped[match.round] = [];
      }
      grouped[match.round].push(match);
    });
    return grouped;
  }, [league.schedule]);

  const totalRounds = Math.max(...Object.keys(matchesByRound).map(Number), 38);
  const [selectedRound, setSelectedRound] = useState<number | 'all'>(currentRound);

  const renderMatch = (m: typeof league.schedule[0]) => {
    const homeTeam = teams[m.homeTeamId];
    const awayTeam = teams[m.awayTeamId];
    const isUserMatch = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
    const isPlayed = m.homeGoals != null && m.awayGoals != null;
    const homeScorers = m.homeScorers || [];
    const awayScorers = m.awayScorers || [];
    const homeYellowCards = m.homeYellowCards || [];
    const awayYellowCards = m.awayYellowCards || [];
    const homeRedCards = m.homeRedCards || [];
    const awayRedCards = m.awayRedCards || [];

    return (
      <div
        key={m.id}
        className="card"
        style={{
          padding: 16,
          background: isUserMatch ? 'rgba(34, 197, 94, 0.08)' : 'var(--card)',
          border: isUserMatch ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
          opacity: isPlayed ? 0.8 : 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: (isPlayed && (homeScorers.length > 0 || awayScorers.length > 0)) ? 8 : 0 }}>
          {/* Équipe domicile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            {homeTeam.logoUrl ? (
              <img
                src={homeTeam.logoUrl}
                alt={homeTeam.shortName}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: '#0b0f1d',
                  objectFit: 'contain',
                  padding: 4
                }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: '#0b0f1d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted)',
                  fontSize: 12
                }}
              >
                {homeTeam.shortName.slice(0, 2)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{homeTeam.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{homeTeam.shortName}</div>
            </div>
          </div>

          {/* Score ou VS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 100, justifyContent: 'center' }}>
            {isPlayed ? (
              <>
                <div style={{ fontWeight: 800, fontSize: 20, minWidth: 30, textAlign: 'center' }}>
                  {m.homeGoals}
                </div>
                <div style={{ color: 'var(--muted)', fontWeight: 700 }}>—</div>
                <div style={{ fontWeight: 800, fontSize: 20, minWidth: 30, textAlign: 'center' }}>
                  {m.awayGoals}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 14 }}>VS</div>
            )}
          </div>

          {/* Équipe extérieure */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexDirection: 'row-reverse' }}>
            {awayTeam.logoUrl ? (
              <img
                src={awayTeam.logoUrl}
                alt={awayTeam.shortName}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: '#0b0f1d',
                  objectFit: 'contain',
                  padding: 4
                }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: '#0b0f1d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted)',
                  fontSize: 12
                }}
              >
                {awayTeam.shortName.slice(0, 2)}
              </div>
            )}
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{awayTeam.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{awayTeam.shortName}</div>
            </div>
          </div>
        </div>
        
        {/* Buteurs et cartons pour les matchs joués */}
        {isPlayed && (homeScorers.length > 0 || awayScorers.length > 0 || homeYellowCards.length > 0 || awayYellowCards.length > 0 || homeRedCards.length > 0 || awayRedCards.length > 0) && (
          <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            {(homeScorers.length > 0 || awayScorers.length > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  {homeScorers.length > 0 ? (
                    <div>
                      <span style={{ fontWeight: 600 }}>Buts:</span> {homeScorers.join(', ')}
                    </div>
                  ) : (
                    <div className="muted">Aucun but</div>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {awayScorers.length > 0 ? (
                    <div>
                      <span style={{ fontWeight: 600 }}>Buts:</span> {awayScorers.join(', ')}
                    </div>
                  ) : (
                    <div className="muted">Aucun but</div>
                  )}
                </div>
              </div>
            )}
            {(homeYellowCards.length > 0 || awayYellowCards.length > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: '#fde047', marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  {homeYellowCards.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 600 }}>🟨</span> {homeYellowCards.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {awayYellowCards.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 600 }}>🟨</span> {awayYellowCards.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
            {(homeRedCards.length > 0 || awayRedCards.length > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: '#ef4444' }}>
                <div style={{ flex: 1 }}>
                  {homeRedCards.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 600 }}>🟥</span> {homeRedCards.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {awayRedCards.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 600 }}>🟥</span> {awayRedCards.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Calendrier</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{
              padding: '6px 12px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg)',
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            <option value="all">Toutes les journées</option>
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => (
              <option key={round} value={round}>
                Journée {round} {round === currentRound ? '(actuelle)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedRound === 'all' ? (
        <div style={{ display: 'grid', gap: 24 }}>
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => {
            const roundMatches = matchesByRound[round] || [];
            if (roundMatches.length === 0) return null;

            const playedCount = roundMatches.filter(m => m.homeGoals != null && m.awayGoals != null).length;
            const isCurrentRound = round === currentRound;

            return (
              <div key={round}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: isCurrentRound ? 'rgba(34, 197, 94, 0.1)' : 'var(--card)',
                    border: isCurrentRound ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                    borderRadius: 8
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    Journée {round} {isCurrentRound && <span style={{ color: 'var(--accent)' }}>(actuelle)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {playedCount} / {roundMatches.length} joués
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {roundMatches.map(renderMatch)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div
            style={{
              marginBottom: 16,
              padding: '8px 12px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              Journée {selectedRound} {selectedRound === currentRound && <span style={{ color: 'var(--accent)' }}>(actuelle)</span>}
            </div>
            {(() => {
              const roundMatches = matchesByRound[selectedRound] || [];
              const playedCount = roundMatches.filter(m => m.homeGoals != null && m.awayGoals != null).length;
              return (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {playedCount} / {roundMatches.length} joués
                </div>
              );
            })()}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {(matchesByRound[selectedRound] || []).map(renderMatch)}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Coupe de France</div>
        <div style={{ display: 'grid', gap: 16 }}>
          {state.cup.stages.map(stage => {
            const status = stage.completed
              ? 'Terminé'
              : stage.matches.some(m => m.homeGoals != null && m.awayGoals != null)
                ? 'En cours'
                : 'À venir';
            return (
              <div key={stage.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{stage.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{status}</div>
                </div>
                {stage.matches.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>Affiches à déterminer</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {stage.matches.map(match => {
                      const homeTeam = teams[match.homeTeamId];
                      const awayTeam = teams[match.awayTeamId];
                      const isPlayed = match.homeGoals != null && match.awayGoals != null;
                      const homeScorers = match.homeScorers || [];
                      const awayScorers = match.awayScorers || [];
                      const homeYellowCards = match.homeYellowCards || [];
                      const awayYellowCards = match.awayYellowCards || [];
                      const homeRedCards = match.homeRedCards || [];
                      const awayRedCards = match.awayRedCards || [];
                      return (
                        <div
                          key={match.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(15,23,42,0.4)',
                            border: '1px solid rgba(148,163,184,0.2)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                              <img
                                src={homeTeam.logoUrl || '/vite.svg'}
                                alt={homeTeam.shortName}
                                onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                                style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', padding: 2 }}
                              />
                              <div style={{ fontWeight: 600 }}>{homeTeam.shortName}</div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: 90 }}>
                              {isPlayed ? (
                                <>
                                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                                    {match.homeGoals} — {match.awayGoals}
                                  </div>
                                  {match.penalties ? (
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                      TAB {match.penalties.home}-{match.penalties.away}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>à jouer</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexDirection: 'row-reverse' }}>
                              <img
                                src={awayTeam.logoUrl || '/vite.svg'}
                                alt={awayTeam.shortName}
                                onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                                style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', padding: 2 }}
                              />
                              <div style={{ fontWeight: 600 }}>{awayTeam.shortName}</div>
                            </div>
                          </div>
                          {isPlayed && (homeScorers.length > 0 || awayScorers.length > 0 || homeYellowCards.length > 0 || awayYellowCards.length > 0 || homeRedCards.length > 0 || awayRedCards.length > 0) && (
                            <div style={{ width: '100%', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 8 }}>
                              {(homeScorers.length > 0 || awayScorers.length > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
                                  <div style={{ flex: 1 }}>
                                    {homeScorers.length > 0 ? `Buts: ${homeScorers.join(', ')}` : 'Aucun but'}
                                  </div>
                                  <div style={{ flex: 1, textAlign: 'right' }}>
                                    {awayScorers.length > 0 ? `Buts: ${awayScorers.join(', ')}` : 'Aucun but'}
                                  </div>
                                </div>
                              )}
                              {(homeYellowCards.length > 0 || awayYellowCards.length > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fde047', marginBottom: 4, gap: 12 }}>
                                  <div style={{ flex: 1 }}>
                                    {homeYellowCards.length > 0 && <>🟨 {homeYellowCards.join(', ')}</>}
                                  </div>
                                  <div style={{ flex: 1, textAlign: 'right' }}>
                                    {awayYellowCards.length > 0 && <>🟨 {awayYellowCards.join(', ')}</>}
                                  </div>
                                </div>
                              )}
                              {(homeRedCards.length > 0 || awayRedCards.length > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', gap: 12 }}>
                                  <div style={{ flex: 1 }}>
                                    {homeRedCards.length > 0 && <>🟥 {homeRedCards.join(', ')}</>}
                                  </div>
                                  <div style={{ flex: 1, textAlign: 'right' }}>
                                    {awayRedCards.length > 0 && <>🟥 {awayRedCards.join(', ')}</>}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
