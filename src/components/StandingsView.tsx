import { useMemo, useState } from 'react';
import type { GameState } from '../game/types';
import { getCupStageWinners } from '../game/cup';

interface Props {
  state: GameState;
}

type ViewMode = 'league' | 'cup';

function CupBracket({ state }: { state: GameState }) {
  const { cup, teams } = state;
  
  // Afficher tous les stages dans l'ordre (préliminaire, huitièmes, quarts, demis, finale)
  // Même s'ils n'ont pas encore de matchs
  const stageOrder = ['prelim', 'round16', 'quarters', 'semis', 'final'];
  const stages = stageOrder.map(stageId => {
    return cup.stages.find(s => s.id === stageId);
  }).filter((stage): stage is typeof cup.stages[0] => stage !== undefined);
  
  // Fonction pour obtenir le gagnant d'un match
  const getMatchWinner = (match: any): string | null => {
    if (match.homeGoals == null || match.awayGoals == null) return null;
    if (match.homeGoals > match.awayGoals) return match.homeTeamId;
    if (match.awayGoals > match.homeGoals) return match.awayTeamId;
    if (match.penalties) {
      return match.penalties.home > match.penalties.away ? match.homeTeamId : match.awayTeamId;
    }
    return null;
  };
  
  const MATCH_HEIGHT = 100;
  const MATCH_GAP = 8;
  const CONNECTOR_WIDTH = 40;
  
  // Calculer la hauteur du premier stage (le plus grand) AVANT de l'utiliser
  const firstStage = stages[0];
  const firstStageHeight = firstStage ? firstStage.matches.length * (MATCH_HEIGHT + MATCH_GAP) - MATCH_GAP : 0;
  
  // Calculer la position Y de chaque match en fonction de ses matchs parents
  // Les huitièmes de finale doivent être positionnés entre les deux matchs du préliminaire qui les ont produits
  const getMatchVerticalPosition = (stageIdx: number, matchIdx: number): number => {
    if (stageIdx === 0) {
      // Premier stage: position linéaire
      return matchIdx * (MATCH_HEIGHT + MATCH_GAP);
    }
    
    // Pour les stages suivants, trouver les matchs parents dans le stage précédent
    const currentStage = stages[stageIdx];
    const prevStage = stages[stageIdx - 1];
    if (!currentStage || !prevStage) return 0;
    
    const match = currentStage.matches[matchIdx];
    if (!match) return 0;
    
    // Trouver les indices des deux matchs du stage précédent qui ont produit ce match
    const parentIndices: number[] = [];
    prevStage.matches.forEach((prevMatch, prevIdx) => {
      const prevWinner = getMatchWinner(prevMatch);
      if (prevWinner === match.homeTeamId || prevWinner === match.awayTeamId) {
        parentIndices.push(prevIdx);
      }
    });
    
    if (parentIndices.length === 2) {
      // Positionner le match entre les deux matchs parents
      const parent1Y = getMatchVerticalPosition(stageIdx - 1, parentIndices[0]);
      const parent2Y = getMatchVerticalPosition(stageIdx - 1, parentIndices[1]);
      const parent1Center = parent1Y + MATCH_HEIGHT / 2;
      const parent2Center = parent2Y + MATCH_HEIGHT / 2;
      const centerY = (parent1Center + parent2Center) / 2;
      return centerY - MATCH_HEIGHT / 2;
    } else if (parentIndices.length === 1) {
      // Un seul parent trouvé (ne devrait pas arriver normalement)
      const parentY = getMatchVerticalPosition(stageIdx - 1, parentIndices[0]);
      return parentY;
    }
    
    // Fallback: position linéaire basée sur l'index
    return matchIdx * (MATCH_HEIGHT + MATCH_GAP);
  };
  
  const bracketContentWidth = stages.length * 280 + (stages.length - 1) * CONNECTOR_WIDTH;
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'flex-start',
      width: '100%',
      overflowX: 'auto', 
      padding: '20px 0',
      position: 'relative'
    }}>
      <div style={{ 
        display: 'flex', 
        gap: CONNECTOR_WIDTH, 
        justifyContent: 'flex-start',
        position: 'relative',
        minWidth: bracketContentWidth,
        minHeight: firstStageHeight
      }}>
      {stages.map((stage, stageIdx) => {
        const isActive = stageIdx === cup.currentStageIndex;
        
        return (
          <div key={stage.id} style={{ minWidth: 280, position: 'relative' }}>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 700, 
              marginBottom: 12, 
              color: isActive ? '#3b82f6' : 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              position: 'relative'
            }}>
              {stage.name}
            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 0,
              position: 'relative',
              minHeight: firstStageHeight
            }}>
              {stage.matches && stage.matches.length > 0 ? (
                stage.matches.map((match, matchIdx) => {
                const homeTeam = teams[match.homeTeamId];
                const awayTeam = teams[match.awayTeamId];
                const isPlayed = match.homeGoals != null && match.awayGoals != null;
                const winnerId = getMatchWinner(match);
                const homeWon = isPlayed && winnerId === match.homeTeamId;
                const awayWon = isPlayed && winnerId === match.awayTeamId;
                const isUserMatch = match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId;
                
                // Position du match calculée en fonction des matchs parents
                const matchTop = getMatchVerticalPosition(stageIdx, matchIdx);
                
                return (
                  <div key={match.id} style={{ position: 'relative', zIndex: 1 }}>
                    <div
                      style={{
                        background: isUserMatch ? 'rgba(34, 197, 94, 0.1)' : 'var(--card)',
                        border: isUserMatch ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                        borderRadius: 8,
                        padding: 8,
                        minHeight: MATCH_HEIGHT,
                        position: 'absolute',
                        top: matchTop,
                        left: 0,
                        right: 0,
                        zIndex: 1
                      }}
                    >
                      {/* Équipe domicile */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 6,
                        background: homeWon ? 'rgba(34, 197, 94, 0.2)' : undefined,
                        borderRadius: 4,
                        fontWeight: homeWon ? 700 : 400
                      }}>
                        <img
                          src={homeTeam?.logoUrl || '/vite.svg'}
                          alt={homeTeam?.shortName || ''}
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/vite.svg';
                          }}
                        />
                        <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {homeTeam?.shortName || homeTeam?.name || 'Inconnu'}
                        </div>
                        {isPlayed && (
                          <div style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'right' }}>
                            {match.homeGoals}
                          </div>
                        )}
                      </div>
                      
                      {/* Séparateur */}
                      <div style={{ 
                        height: 1, 
                        background: 'var(--border)', 
                        margin: '4px 0',
                        position: 'relative'
                      }}>
                        {isPlayed && match.penalties && (
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: -8,
                            fontSize: 10,
                            color: 'var(--muted)'
                          }}>
                            TAB {match.penalties.home}-{match.penalties.away}
                          </div>
                        )}
                      </div>
                      
                      {/* Équipe extérieure */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 6,
                        background: awayWon ? 'rgba(34, 197, 94, 0.2)' : undefined,
                        borderRadius: 4,
                        fontWeight: awayWon ? 700 : 400
                      }}>
                        <img
                          src={awayTeam?.logoUrl || '/vite.svg'}
                          alt={awayTeam?.shortName || ''}
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/vite.svg';
                          }}
                        />
                        <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {awayTeam?.shortName || awayTeam?.name || 'Inconnu'}
                        </div>
                        {isPlayed && (
                          <div style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'right' }}>
                            {match.awayGoals}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })
              ) : (
                // Afficher un placeholder si pas encore de matchs
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 13
                }}>
                  Matchs à venir
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default function StandingsView({ state }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('league');
  
  // Filtrer uniquement les équipes de la ligue choisie
  const leagueTeamIds = state.league.teamIds;
  
  // Calculer les équipes encore en lice en Coupe de France
  const cupTeams = useMemo(() => {
    const activeStage = state.cup.stages[state.cup.currentStageIndex];
    if (!activeStage) return [];
    
    // Récupérer les équipes qui ont gagné dans les stages précédents
    const winners: string[] = [];
    for (let i = 0; i < state.cup.currentStageIndex; i++) {
      const stage = state.cup.stages[i];
      if (stage.completed) {
        winners.push(...getCupStageWinners(stage));
      }
    }
    
    // Récupérer les équipes du stage actuel (celles qui jouent encore)
    const currentStageTeamIds = new Set<string>();
    activeStage.matches.forEach(match => {
      if (match.homeGoals == null || match.awayGoals == null) {
        // Match pas encore joué, les deux équipes sont encore en lice
        currentStageTeamIds.add(match.homeTeamId);
        currentStageTeamIds.add(match.awayTeamId);
      } else {
        // Match joué, seule l'équipe gagnante est encore en lice
        if (match.homeGoals > match.awayGoals) {
          currentStageTeamIds.add(match.homeTeamId);
        } else if (match.awayGoals > match.homeGoals) {
          currentStageTeamIds.add(match.awayTeamId);
        } else if (match.penalties) {
          // Match décidé aux tirs au but
          if (match.penalties.home > match.penalties.away) {
            currentStageTeamIds.add(match.homeTeamId);
          } else {
            currentStageTeamIds.add(match.awayTeamId);
          }
        }
      }
    });
    
    // Combiner les gagnants des stages précédents et les équipes du stage actuel
    const allCupTeamIds = [...winners, ...Array.from(currentStageTeamIds)];
    return Object.values(state.teams)
      .filter(team => allCupTeamIds.includes(team.id))
      .map(team => ({
        team,
        stage: activeStage.name
      }));
  }, [state.cup, state.teams]);
  
  const table = useMemo(() => {
    if (viewMode === 'cup') {
      // Pour la coupe, on affiche simplement les équipes encore en lice
      return cupTeams.map(({ team }) => team);
    }
    
    // Pour le championnat, filtrer uniquement les équipes de la ligue choisie
    return Object.values(state.teams)
      .filter(team => leagueTeamIds.includes(team.id))
      .sort((a, b) => {
        // Trier par points, puis différence de buts, puis buts marqués
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        if (gdB !== gdA) return gdB - gdA;
        return b.goalsFor - a.goalsFor;
      });
  }, [state.teams, leagueTeamIds, viewMode, cupTeams]);

  const userTeamId = state.userTeamId;
  
  // Détecter si c'est Ligue 1 (61) ou Ligue 2 (62)
  const isLigue2 = /Ligue 62|ligue 2/i.test(state.league.name);

  // Calculer les statistiques
  const wins = table.map(t => {
    const wins = state.league.schedule.filter(m => 
      (m.homeTeamId === t.id && m.homeGoals != null && m.homeGoals > m.awayGoals!) ||
      (m.awayTeamId === t.id && m.awayGoals != null && m.awayGoals! > m.homeGoals!)
    ).length;
    return { team: t, wins };
  });

  const draws = table.map(t => {
    const draws = state.league.schedule.filter(m => 
      (m.homeTeamId === t.id || m.awayTeamId === t.id) &&
      m.homeGoals != null && m.awayGoals != null &&
      m.homeGoals === m.awayGoals
    ).length;
    return { team: t, draws };
  });

  const losses = table.map(t => {
    const losses = state.league.schedule.filter(m => 
      (m.homeTeamId === t.id && m.homeGoals != null && m.homeGoals < m.awayGoals!) ||
      (m.awayTeamId === t.id && m.awayGoals != null && m.awayGoals! < m.homeGoals!)
    ).length;
    return { team: t, losses };
  });

  const activeStage = state.cup.stages[state.cup.currentStageIndex];
  
  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>
          {viewMode === 'league' ? `Classement ${state.league.name}` : `Coupe de France — ${activeStage?.name || 'En cours'}`}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('league')}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: viewMode === 'league' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: 'var(--fg)',
              cursor: 'pointer',
              fontWeight: viewMode === 'league' ? 700 : 400
            }}
          >
            Championnat
          </button>
          <button
            onClick={() => setViewMode('cup')}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: viewMode === 'cup' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: 'var(--fg)',
              cursor: 'pointer',
              fontWeight: viewMode === 'cup' ? 700 : 400
            }}
          >
            Coupe de France
          </button>
        </div>
      </div>

      {viewMode === 'league' ? (
        <div className="card card--standings" style={{ marginBottom: 24 }}>
          <div className="card-title">Classement</div>
          <table className="mini-table">
            <thead>
              <tr>
                <th>#</th>
                <th></th>
                <th>Équipe</th>
                <th>Pts</th>
                <th>V</th>
                <th>N</th>
                <th>D</th>
                <th>DG</th>
              </tr>
            </thead>
            <tbody>
              {table.map((t, i) => {
              const rank = i + 1;
              const isUserTeam = t.id === userTeamId;
              const teamWins = wins.find(w => w.team.id === t.id)?.wins || 0;
              const teamDraws = draws.find(d => d.team.id === t.id)?.draws || 0;
              const teamLosses = losses.find(l => l.team.id === t.id)?.losses || 0;
              const gd = t.goalsFor - t.goalsAgainst;
              
              // Déterminer la classe CSS pour la position
              let rankClass = '';
              if (!isLigue2) {
                // Ligue 1: Champions League (1-3), Barrage CL (4), Europa (5-6), Barrage relégation (17), Relégation (18-20)
                if (rank <= 3) rankClass = 'rank-cell--champions';
                else if (rank === 4) rankClass = 'rank-cell--playoff';
                else if (rank >= 5 && rank <= 6) rankClass = 'rank-cell--europa';
                else if (rank === 17) rankClass = 'rank-cell--relegation';
                else if (rank >= 18 && rank <= 20) rankClass = 'rank-cell--relegation';
              } else {
                // Ligue 2: Promotion directe (1-2), Barrage promotion (3-5), Barrage relégation (18), Relégation (19-20)
                if (rank <= 2) rankClass = 'rank-cell--champions';
                else if (rank >= 3 && rank <= 5) rankClass = 'rank-cell--playoff';
                else if (rank === 18) rankClass = 'rank-cell--relegation';
                else if (rank >= 19 && rank <= 20) rankClass = 'rank-cell--relegation';
              }

              return (
                <tr
                  key={t.id}
                  className={isUserTeam ? 'user-team-row' : ''}
                  style={{
                    background: isUserTeam ? 'rgba(34, 197, 94, 0.15)' : undefined,
                    fontWeight: isUserTeam ? 700 : undefined
                  }}
                >
                  <td>
                    <span
                      className={rankClass}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 32,
                        height: 24,
                        borderRadius: 4,
                        padding: '2px 6px',
                        fontWeight: 700,
                        fontSize: 13,
                        ...(rank <= 3 && !isLigue2 || (rank <= 2 && isLigue2) ? {
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: '#fff'
                        } : rank === 4 && !isLigue2 || (rank >= 3 && rank <= 5 && isLigue2) ? {
                          background: 'linear-gradient(90deg, #facc15, #eab308)',
                          color: '#000'
                        } : rank >= 5 && rank <= 6 && !isLigue2 ? {
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          color: '#fff'
                        } : rank === 17 && !isLigue2 || rank === 18 && isLigue2 ? {
                          background: 'linear-gradient(90deg, #f97316, #ea580c)',
                          color: '#fff'
                        } : (rank >= 18 && rank <= 20 && !isLigue2) || (rank >= 19 && rank <= 20 && isLigue2) ? {
                          background: 'linear-gradient(90deg, #f43f5e, #ef4444)',
                          color: '#fff'
                        } : {})
                      }}
                    >
                      {rank}
                    </span>
                  </td>
                  <td>
                    <img
                      className="mini-logo"
                      src={t.logoUrl || '/vite.svg'}
                      alt={t.shortName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/vite.svg';
                      }}
                    />
                  </td>
                  <td>
                    <div className="ellipsis">{t.name}</div>
                  </td>
                  <td>{t.points}</td>
                  <td>{teamWins}</td>
                  <td>{teamDraws}</td>
                  <td>{teamLosses}</td>
                  <td style={{ color: gd > 0 ? '#22c55e' : gd < 0 ? '#ef4444' : undefined }}>
                    {gd > 0 ? '+' : ''}{gd}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <CupBracket state={state} />
        </div>
      )}

      {/* Légende - seulement pour le championnat */}
      {viewMode === 'league' && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Légende</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
            {!isLigue2 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: 11 }}>1-3</span>
                  <span>Champions League</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(90deg, #facc15, #eab308)', color: '#000', fontWeight: 700, fontSize: 11 }}>4</span>
                  <span>Barrage Champions League</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: 11 }}>5-6</span>
                  <span>Europa League</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(90deg, #f97316, #ea580c)', color: '#fff', fontWeight: 700, fontSize: 11 }}>17</span>
                  <span>Barrage relégation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(90deg, #f43f5e, #ef4444)', color: '#fff', fontWeight: 700, fontSize: 11 }}>18-20</span>
                  <span>Relégation</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 700, fontSize: 11 }}>1-2</span>
                  <span>Promotion directe</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(90deg, #facc15, #eab308)', color: '#000', fontWeight: 700, fontSize: 11 }}>3-5</span>
                  <span>Barrage promotion</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(90deg, #f97316, #ea580c)', color: '#fff', fontWeight: 700, fontSize: 11 }}>18</span>
                  <span>Barrage relégation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'linear-gradient(90deg, #f43f5e, #ef4444)', color: '#fff', fontWeight: 700, fontSize: 11 }}>19-20</span>
                  <span>Relégation</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

