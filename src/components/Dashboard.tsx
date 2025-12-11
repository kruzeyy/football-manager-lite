import { useEffect, useState, useRef } from 'react';
import type { GameState, Team, Player } from '../game/types';
import { getStadiumForTeam } from '../game/data/stadiums';
import { getCupStageWinners } from '../game/cup';
import TrophyModal from './TrophyModal';

interface Props {
  state: GameState;
}

export default function Dashboard({ state }: Props) {
  const user: Team = state.teams[state.userTeamId];
  // Filtrer uniquement les équipes de la ligue choisie
  const leagueTeamIds = state.league.teamIds;
  const table = Object.values(state.teams)
    .filter(team => leagueTeamIds.includes(team.id))
    .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  const rank = table.findIndex(t => t.id === user.id) + 1;
  const gd = user.goalsFor - user.goalsAgainst;
  
  // Détecter si c'est Ligue 1 (61) ou Ligue 2 (62)
  const isLigue2 = /Ligue 62|ligue 2/i.test(state.league.name);
  
  // Vérifier si l'utilisateur a gagné la Coupe de France
  const [showTrophy, setShowTrophy] = useState<{ title: string; subtitle?: string } | null>(null);
  const trophyShownRef = useRef<{ cup?: string; ligue2?: string }>({});
  
  useEffect(() => {
    // Vérifier la Coupe de France
    const finalStage = state.cup.stages.find(s => s.id === 'final');
    if (finalStage && finalStage.completed) {
      const winners = getCupStageWinners(finalStage);
      if (winners.length > 0 && winners[0] === state.userTeamId) {
        // Créer une clé unique basée sur l'ID du match final
        const finalMatch = finalStage.matches[0];
        const trophyKey = finalMatch ? `trophy_cup_${finalMatch.id}` : null;
        
        if (trophyKey && trophyShownRef.current.cup !== trophyKey) {
          trophyShownRef.current.cup = trophyKey;
          setShowTrophy({
            title: 'Coupe de France',
            subtitle: `${user.shortName || user.name} remporte la Coupe de France !`
          });
        }
      }
    }
    
    // Vérifier le championnat (Ligue 2 uniquement pour le moment)
    const totalRounds = Math.max(...state.league.schedule.map(m => m.round), 38);
    const allMatchesPlayed = state.league.schedule.every(m => m.homeGoals != null && m.awayGoals != null);
    
    if (isLigue2 && allMatchesPlayed && rank === 1) {
      // Créer une clé unique basée sur le dernier match de la saison
      const lastMatch = state.league.schedule
        .filter(m => m.round === totalRounds && m.homeGoals != null && m.awayGoals != null)
        .sort((a, b) => (a.playedAt || '') > (b.playedAt || '') ? -1 : 1)[0];
      const trophyKey = lastMatch ? `trophy_ligue2_${lastMatch.id}` : null;
      
      if (trophyKey && trophyShownRef.current.ligue2 !== trophyKey) {
        trophyShownRef.current.ligue2 = trophyKey;
        setShowTrophy({
          title: 'Ligue 2',
          subtitle: `${user.shortName || user.name} remporte le championnat !`
        });
      }
    }
  }, [state.cup.stages, state.league.schedule, state.userTeamId, user.shortName, user.name, isLigue2, rank]);
  
  // Log pour vérifier les joueurs
  useEffect(() => {
    if (user.players && user.players.length > 0) {
      console.log(`[Dashboard] User team ${user.name} has ${user.players.length} players. First 3:`, 
        user.players.slice(0, 3).map(p => ({ name: p.name, id: p.id, overall: p.overall }))
      );
    } else {
      console.warn(`[Dashboard] User team ${user.name} has NO players!`);
    }
  }, [user.name, user.players]);

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
  // Sélection du XI type en utilisant preferredXI si disponible, sinon meilleurs joueurs par poste
  const pickLineup = (team: Team | null): { gk: Player[]; def: Player[]; mid: Player[]; fwd: Player[] } => {
    if (!team || !team.players || team.players.length === 0) return { gk: [], def: [], mid: [], fwd: [] };
    
    const byOverallDesc = (a: Player, b: Player) => b.overall - a.overall;
    const playersById = new Map(team.players.map(p => [p.id, p]));
    
    // Si on a un preferredXI, l'utiliser directement dans l'ordre exact (sans filtrer par position)
    // L'ordre dans preferredXI correspond aux slots : 0 = GK, 1-4 = DEF, 5-7 = MID, 8-10 = FWD
    if (team.preferredXI && team.preferredXI.length >= 11) {
      const preferred = team.preferredXI
        .slice(0, 11)
        .map(id => playersById.get(id))
        .filter((p): p is Player => p !== undefined);
      
      // Utiliser l'ordre exact du preferredXI, même si les joueurs ne sont pas à leur position naturelle
      // Slot 0 = GK, Slots 1-4 = DEF, Slots 5-7 = MID, Slots 8-10 = FWD
      const gk = preferred.slice(0, 1).filter(Boolean);
      const def = preferred.slice(1, 5).filter(Boolean);
      const mid = preferred.slice(5, 8).filter(Boolean);
      const fwd = preferred.slice(8, 11).filter(Boolean);
      
      // Si certains slots sont vides, compléter avec les meilleurs joueurs disponibles par poste
      if (gk.length === 0) {
        const bestGK = team.players.filter(p => p.position === 'GK' && !preferred.includes(p)).sort(byOverallDesc)[0];
        if (bestGK) gk.push(bestGK);
      }
      if (def.length < 4) {
        const missing = 4 - def.length;
        const additionalDef = team.players
          .filter(p => !preferred.includes(p) && p.position === 'DEF')
          .sort(byOverallDesc)
          .slice(0, missing);
        def.push(...additionalDef);
      }
      if (mid.length < 3) {
        const missing = 3 - mid.length;
        const additionalMid = team.players
          .filter(p => !preferred.includes(p) && p.position === 'MID')
          .sort(byOverallDesc)
          .slice(0, missing);
        mid.push(...additionalMid);
      }
      if (fwd.length < 3) {
        const missing = 3 - fwd.length;
        const additionalFwd = team.players
          .filter(p => !preferred.includes(p) && p.position === 'FWD')
          .sort(byOverallDesc)
          .slice(0, missing);
        fwd.push(...additionalFwd);
      }
      
      return { 
        gk: gk.slice(0, 1), 
        def: def.slice(0, 4), 
        mid: mid.slice(0, 3), 
        fwd: fwd.slice(0, 3) 
      };
    }
    
    // Sinon, prendre les meilleurs par poste
    const gk = team.players.filter(p => p.position === 'GK').sort(byOverallDesc).slice(0, 1);
    const def = team.players.filter(p => p.position === 'DEF').sort(byOverallDesc).slice(0, 4);
    const mid = team.players.filter(p => p.position === 'MID').sort(byOverallDesc).slice(0, 3);
    const fwd = team.players.filter(p => p.position === 'FWD').sort(byOverallDesc).slice(0, 3);
    return { gk, def, mid, fwd };
  };
  const userXI = pickLineup(user);
  const oppXI = pickLineup(opponent);
  
  // Log pour vérifier les compositions sélectionnées
  useEffect(() => {
    if (opponent) {
      console.log(`[Dashboard] Lineup for ${user.name}:`, {
        gk: userXI.gk.length,
        def: userXI.def.length,
        mid: userXI.mid.length,
        fwd: userXI.fwd.length,
        total: userXI.gk.length + userXI.def.length + userXI.mid.length + userXI.fwd.length
      });
      console.log(`[Dashboard] Lineup for ${opponent.name}:`, {
        gk: oppXI.gk.length,
        def: oppXI.def.length,
        mid: oppXI.mid.length,
        fwd: oppXI.fwd.length,
        total: oppXI.gk.length + oppXI.def.length + oppXI.mid.length + oppXI.fwd.length,
        opponentPlayersCount: opponent.players?.length || 0
      });
    }
  }, [user.name, opponent?.name, userXI, oppXI]);

  // Mini rendu de compo 4-3-3 sur une pelouse
  const Pitch433 = ({ team, xi, reversed = false }: { team: Team; xi: { gk: any[]; def: any[]; mid: any[]; fwd: any[] }; reversed?: boolean }) => {
    // Fonction pour tronquer le nom si trop long
    const truncateName = (name: string, maxLength: number = 15) => {
      if (name.length <= maxLength) return name;
      return name.slice(0, maxLength - 3) + '...';
    };
    
    const renderRow = (players: any[], cols: number[]) => (
      <div className="pitch-row">
        {cols.map((col, idx) => {
          const p = players[idx];
          return (
            <div key={idx} className="pitch-cell" style={{ gridColumn: col }}>
              {p ? (
                <div className="shirt" title={`${p.name} - ${p.age} ans - OVR: ${p.overall}`}>
                  <span className="shirt-num">{p.overall}</span>
                </div>
              ) : <div className="shirt shirt--ghost" />}
              <div className="player-label" title={p ? `${p.name} (${p.age} ans)` : ''}>
                {p ? truncateName(p.name) : ''}
              </div>
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
                <div className="shirt shirt--gk" title={`${xi.gk[0].name} - ${xi.gk[0].age} ans - OVR: ${xi.gk[0].overall}`}>
                  <span className="shirt-num">{xi.gk[0].overall}</span>
                </div>
              ) : <div className="shirt shirt--ghost" />}
              <div className="player-label" title={xi.gk[0] ? `${xi.gk[0].name} (${xi.gk[0].age} ans)` : ''}>
                {xi.gk[0] ? (xi.gk[0].name.length > 15 ? xi.gk[0].name.slice(0, 12) + '...' : xi.gk[0].name) : ''}
              </div>
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
          {next ? (
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: '#e2e8f0' }}>
              Championnat&nbsp;: {state.league.name}
            </div>
          ) : null}
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
              <img className="stadium-img" src={venue.imageUrl} alt={venue.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
            {user.players && user.players.length > 0 ? (
              <div className="pitches pitches--compact">
                <div className="lineup-col">
                  <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                    Équipe type {user.shortName}
                    <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>
                      ({user.players.length} joueurs)
                    </span>
                  </div>
                  <Pitch433 team={user} xi={userXI} />
                </div>
                <div className="lineup-col">
                  <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                    Équipe type {opponent.shortName}
                    <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>
                      ({opponent.players?.length || 0} joueurs)
                    </span>
                  </div>
                  <Pitch433 team={opponent} xi={oppXI} />
                </div>
              </div>
            ) : (
              <div className="muted" style={{ padding: '20px', textAlign: 'center' }}>
                Les compositions seront affichées une fois les joueurs chargés...
              </div>
            )}
          </div>
        ) : null}

        <div className="card card--standings">
          <div className="card-title">Classement</div>
          <table className="mini-table">
            <thead>
              <tr>
                <th>#</th>
                <th></th>
                <th style={{ minWidth: 190 }}></th>
                <th>Pts</th>
                <th>V</th>
                <th>N</th>
                <th>D</th>
                <th>DG</th>
              </tr>
            </thead>
            <tbody>
              {table.map((t, i) => {
                // Calculer les classes CSS selon la ligue
                let rankClass = '';
                if (isLigue2) {
                  // Ligue 2 : places 1-2 montée directe, place 3 barrage montée, place 17 barrage descente, places 18-19 descente directe
                  if (i < 2) {
                    rankClass = 'rank-cell--cl'; // Montée directe (vert)
                  } else if (i === 2) {
                    rankClass = 'rank-cell--el'; // Barrage montée (bleu)
                  } else if (i === 17) {
                    rankClass = 'rank-cell--playoff'; // Barrage descente (orange/jaune)
                  } else if (i >= 18) {
                    rankClass = 'rank-cell--relegation'; // Descente directe (rouge)
                  }
                } else {
                  // Ligue 1 : places 1-3 CL, place 4 EL, place 5 ECL, place 17 barrage, places 18-20 descente
                  if (i < 3) {
                    rankClass = 'rank-cell--cl';
                  } else if (i === 3) {
                    rankClass = 'rank-cell--el';
                  } else if (i === 4) {
                    rankClass = 'rank-cell--conf';
                  } else if (i === 16) {
                    rankClass = 'rank-cell--playoff';
                  } else if (i >= 17) {
                    rankClass = 'rank-cell--relegation';
                  }
                }
                
                return (
                  <tr key={t.id} className={t.id === user.id ? 'row-you' : ''}>
                    <td className={`rank-cell ${rankClass}`}>
                      <span className="rank-cell__dot" />
                      {i + 1}
                    </td>
                  <td className="mini-logo-cell">
                    <img className="mini-logo" src={t.logoUrl || '/vite.svg'} alt={t.shortName} onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }} />
                  </td>
                  <td className="ellipsis">{t.name}</td>
                  <td>{t.points}</td>
                  <td>{t.wins ?? 0}</td>
                  <td>{t.draws ?? 0}</td>
                  <td>{t.losses ?? 0}</td>
                  <td>{t.goalsFor - t.goalsAgainst}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
          <div className="slot-legend">
            {isLigue2 ? (
              <>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--cl" />
                  <div>
                    <div>Montée directe Ligue 1</div>
                    <div className="slot-legend-range">Places 1 à 2</div>
                  </div>
                </div>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--el" />
                  <div>
                    <div>Barrage montée</div>
                    <div className="slot-legend-range">Place 3</div>
                  </div>
                </div>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--playoff" />
                  <div>
                    <div>Barrage descente National</div>
                    <div className="slot-legend-range">Place 18</div>
                  </div>
                </div>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--relegation" />
                  <div>
                    <div>Descente directe National</div>
                    <div className="slot-legend-range">Places 19 à 20</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--cl" />
                  <div>
                    <div>Ligue des Champions</div>
                    <div className="slot-legend-range">Places 1 à 3</div>
                  </div>
                </div>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--el" />
                  <div>
                    <div>Europa League</div>
                    <div className="slot-legend-range">Place 4</div>
                  </div>
                </div>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--conf" />
                  <div>
                    <div>Europa Conference</div>
                    <div className="slot-legend-range">Place 5</div>
                  </div>
                </div>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--playoff" />
                  <div>
                    <div>Barrage Ligue 2</div>
                    <div className="slot-legend-range">Place 17</div>
                  </div>
                </div>
                <div className="slot-legend-item">
                  <span className="legend-dot legend-dot--relegation" />
                  <div>
                    <div>Descente Ligue 2</div>
                    <div className="slot-legend-range">Places 18 à 20</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
      
      {showTrophy && (
        <TrophyModal
          title={showTrophy.title}
          subtitle={showTrophy.subtitle}
          onClose={() => setShowTrophy(null)}
        />
      )}
    </div>
  );
}
