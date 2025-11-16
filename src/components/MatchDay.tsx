import { useState } from 'react';
import type { GameState, Match } from '../game/types';
import { simulateMatch, applyMatchResult } from '../game/engine';

interface Props {
  state: GameState;
  setState: (s: GameState) => void;
}

interface MatchResult {
  match: Match;
  homeGoals: number;
  awayGoals: number;
}

function ResultsModal({ results, teams, userTeamId, onClose }: { results: MatchResult[]; teams: GameState['teams']; userTeamId: string; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'var(--panel)',
          border: '2px solid var(--border)',
          padding: 20
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>Résultats de la journée</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg)',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {results.map(({ match, homeGoals, awayGoals }) => {
            const homeTeam = teams[match.homeTeamId];
            const awayTeam = teams[match.awayTeamId];
            const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;
            const homeScorers = match.homeScorers || [];
            const awayScorers = match.awayScorers || [];

            return (
              <div
                key={match.id}
                style={{
                  padding: 12,
                  background: isUserMatch ? 'rgba(34, 197, 94, 0.1)' : 'var(--card)',
                  border: isUserMatch ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                  borderRadius: 8
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: homeScorers.length > 0 || awayScorers.length > 0 ? 8 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    {homeTeam.logoUrl ? (
                      <img
                        src={homeTeam.logoUrl}
                        alt={homeTeam.shortName}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: '#0b0f1d',
                          objectFit: 'contain',
                          padding: 3
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: '#0b0f1d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted)',
                          fontSize: 10
                        }}
                      >
                        {homeTeam.shortName.slice(0, 2)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {homeTeam.shortName}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80, justifyContent: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, minWidth: 25, textAlign: 'center' }}>
                      {homeGoals}
                    </div>
                    <div style={{ color: 'var(--muted)', fontWeight: 700 }}>—</div>
                    <div style={{ fontWeight: 800, fontSize: 18, minWidth: 25, textAlign: 'center' }}>
                      {awayGoals}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexDirection: 'row-reverse' }}>
                    {awayTeam.logoUrl ? (
                      <img
                        src={awayTeam.logoUrl}
                        alt={awayTeam.shortName}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: '#0b0f1d',
                          objectFit: 'contain',
                          padding: 3
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: '#0b0f1d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted)',
                          fontSize: 10
                        }}
                      >
                        {awayTeam.shortName.slice(0, 2)}
                      </div>
                    )}
                    <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {awayTeam.shortName}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Buteurs */}
                {(homeScorers.length > 0 || awayScorers.length > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: 'var(--muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
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
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '12px 24px',
            background: 'var(--accent)',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default function MatchDay({ state, setState }: Props) {
  const { league, teams, currentRound, userTeamId } = state;
  const totalRounds = Math.max(...league.schedule.map(m => m.round), 38);
  const roundMatches = league.schedule.filter(m => m.round === currentRound);
  const unplayedMatches = roundMatches.filter(m => m.homeGoals == null && m.awayGoals == null);
  const playedMatches = roundMatches.filter(m => m.homeGoals != null && m.awayGoals != null);
  const [results, setResults] = useState<MatchResult[] | null>(null);

  const playRound = () => {
    const newState: GameState = JSON.parse(JSON.stringify(state));
    const newResults: MatchResult[] = [];
    
    for (const match of newState.league.schedule.filter(m => m.round === newState.currentRound)) {
      if (match.homeGoals != null && match.awayGoals != null) continue;
      const { home, away } = simulateMatch(newState, match);
      match.homeGoals = home;
      match.awayGoals = away;
      match.playedAt = new Date().toISOString();
      applyMatchResult(newState, match, home, away);
      newResults.push({ match, homeGoals: home, awayGoals: away });
    }
    
    newState.currentRound += 1;
    setState(newState);
    setResults(newResults);
  };

  const isSeasonFinished = currentRound > totalRounds;

  return (
    <>
      {results && results.length > 0 && (
        <ResultsModal
          results={results}
          teams={teams}
          userTeamId={userTeamId}
          onClose={() => setResults(null)}
        />
      )}
      <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Jour de match — Journée {currentRound}</h2>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          {currentRound} / {totalRounds}
        </div>
      </div>

      {isSeasonFinished ? (
        <div style={{ padding: 24, textAlign: 'center', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Saison terminée !</div>
          <div className="muted">Tous les matchs ont été joués.</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Matchs à jouer</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{unplayedMatches.length}</div>
              </div>
              {playedMatches.length > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Matchs joués</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{playedMatches.length}</div>
                </div>
              )}
            </div>
          </div>

          {unplayedMatches.length > 0 && (
            <button
              onClick={playRound}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'var(--accent)',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              Simuler la journée
            </button>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {roundMatches.map(m => {
              const homeTeam = teams[m.homeTeamId];
              const awayTeam = teams[m.awayTeamId];
              const isUserMatch = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
              const isPlayed = m.homeGoals != null && m.awayGoals != null;
              const homeScorers = m.homeScorers || [];
              const awayScorers = m.awayScorers || [];

              return (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    padding: 16,
                    background: isUserMatch ? 'rgba(34, 197, 94, 0.08)' : 'var(--card)',
                    border: isUserMatch ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                    opacity: isPlayed ? 0.7 : 1
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
                  
                  {/* Buteurs pour les matchs joués */}
                  {isPlayed && (homeScorers.length > 0 || awayScorers.length > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: 'var(--muted)', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
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
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>
    </>
  );
}
