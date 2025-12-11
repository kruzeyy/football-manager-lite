import { useState, useMemo, useEffect } from 'react';
import type { GameState, Player, Team, Position } from '../game/types';
import { computeStrength } from '../game/generator';
import { isSubscriptionActiveSync, FREE_LIMITATIONS } from '../game/subscription';
import PremiumBanner from './PremiumBanner';

interface Props {
  state: GameState;
  setState: (state: GameState) => void;
}

function calculatePlayerPrice(player: Player): number {
  // Prix basé sur l'overall, l'âge et la forme
  const basePrice = player.overall * 100_000;
  const ageMultiplier = player.age < 23 ? 1.5 : player.age > 30 ? 0.7 : 1.0;
  const fitnessMultiplier = player.fitness / 100;
  return Math.round(basePrice * ageMultiplier * fitnessMultiplier);
}

export default function TransfersView({ state, setState }: Props) {
  const userTeam = state.teams[state.userTeamId];
  const otherTeams = Object.values(state.teams).filter(t => t.id !== state.userTeamId);
  const isSubscribed = isSubscriptionActiveSync();
  
  // Compter les transferts de la saison (stocké dans localStorage)
  const TRANSFERS_COUNT_KEY = `transfers_count_${state.userTeamId}_${state.currentRound}`;
  const getTransfersCount = (): number => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(TRANSFERS_COUNT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  };
  const [transfersCount, setTransfersCount] = useState(getTransfersCount());

  // Filtres
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL');
  const [maxPrice, setMaxPrice] = useState<number>(userTeam.funds);
  const [minAge, setMinAge] = useState<number>(17);
  const [maxAge, setMaxAge] = useState<number>(35);
  const [minOverall, setMinOverall] = useState<number>(60);
  const [maxOverall, setMaxOverall] = useState<number>(100);
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  // Mettre à jour le prix max quand la trésorerie change
  useEffect(() => {
    if (maxPrice > userTeam.funds) {
      setMaxPrice(userTeam.funds);
    }
  }, [userTeam.funds, maxPrice]);

  const handleBuyPlayer = (player: Player, fromTeam: Team) => {
    // Vérifier la limite de transferts pour les utilisateurs non abonnés
    if (!isSubscribed && transfersCount >= FREE_LIMITATIONS.maxTransfersPerSeason) {
      alert(`Vous avez atteint la limite de ${FREE_LIMITATIONS.maxTransfersPerSeason} transferts par saison (version gratuite).\n\nAbonnez-vous pour des transferts illimités !`);
      return;
    }
    
    const price = calculatePlayerPrice(player);
    
    if (userTeam.funds < price) {
      alert(`Fonds insuffisants. Vous avez €${(userTeam.funds / 1_000_000).toFixed(1)}M, mais ce joueur coûte €${(price / 1_000_000).toFixed(1)}M.`);
      return;
    }

    if (userTeam.players.length >= 30) {
      alert('Votre effectif est complet (30 joueurs maximum).');
      return;
    }

    // Confirmation
    if (!confirm(`Acheter ${player.name} pour €${(price / 1_000_000).toFixed(1)}M ?`)) {
      return;
    }

    // Mise à jour de l'état
    const newTeams = { ...state.teams };
    
    // Retirer le joueur de l'équipe vendeuse
    const updatedFromTeam = {
      ...fromTeam,
      players: fromTeam.players.filter(p => p.id !== player.id),
      funds: fromTeam.funds + price
    };
    newTeams[fromTeam.id] = updatedFromTeam;

    // Ajouter le joueur à l'équipe acheteuse (initialiser les stats si nécessaire)
    const playerWithStats = {
      ...player,
      stats: player.stats || {
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0
      }
    };
    const updatedUserTeam = {
      ...userTeam,
      players: [...userTeam.players, playerWithStats],
      funds: userTeam.funds - price
    };
    newTeams[state.userTeamId] = updatedUserTeam;

    // Recalculer la force de l'équipe (style FIFA)
    updatedUserTeam.strength = computeStrength(updatedUserTeam.players);

    // Incrémenter le compteur de transferts
    const newCount = transfersCount + 1;
    setTransfersCount(newCount);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TRANSFERS_COUNT_KEY, String(newCount));
    }

    setState({
      ...state,
      teams: newTeams
    });
  };

  // Filtrer les joueurs selon les critères
  const remainingTransfers = isSubscribed ? Infinity : Math.max(0, FREE_LIMITATIONS.maxTransfersPerSeason - transfersCount);
  
  const filteredTeams = useMemo(() => {
    return otherTeams.map(team => {
      const filteredPlayers = team.players.filter(player => {
        const price = calculatePlayerPrice(player);
        
        // Filtre par poste
        if (positionFilter !== 'ALL' && player.position !== positionFilter) {
          return false;
        }
        
        // Filtre par prix
        if (price > maxPrice) {
          return false;
        }
        
        // Filtre par âge
        if (player.age < minAge || player.age > maxAge) {
          return false;
        }
        
        // Filtre par overall
        if (player.overall < minOverall || player.overall > maxOverall) {
          return false;
        }
        
        return true;
      });
      
      return { ...team, players: filteredPlayers };
    }).filter(team => {
      // Filtre par équipe
      if (teamFilter !== 'ALL' && team.id !== teamFilter) {
        return false;
      }
      // Ne garder que les équipes qui ont des joueurs après filtrage
      return team.players.length > 0;
    });
  }, [otherTeams, positionFilter, maxPrice, minAge, maxAge, minOverall, maxOverall, teamFilter]);

  const totalFilteredPlayers = filteredTeams.reduce((sum, team) => sum + team.players.length, 0);

  return (
    <div className="panel">
      <h2>Mercato - Transferts</h2>
      
      {!isSubscribed && (
        <>
          <PremiumBanner 
            feature="des transferts illimités"
            onSubscribe={() => {
              // Trouver le bouton abonnement dans la navigation
              const buttons = Array.from(document.querySelectorAll('button'));
              const abonnementBtn = buttons.find(b => b.textContent?.includes('Abonnement'));
              if (abonnementBtn) {
                abonnementBtn.click();
              }
            }}
          />
          <div style={{
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            marginBottom: 16
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: '#ef4444' }}>
              ⚠️ Version gratuite
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Transferts restants cette saison: <strong>{remainingTransfers} / {FREE_LIMITATIONS.maxTransfersPerSeason}</strong>
            </div>
          </div>
        </>
      )}
      
      {isSubscribed && (
        <div style={{
          padding: 12,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 8,
          marginBottom: 16
        }}>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            ✅ Abonnement actif - Transferts illimités
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: 16, padding: 12, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Trésorerie disponible</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
          €{(userTeam.funds / 1_000_000).toFixed(1)}M
        </div>
      </div>

      {/* Filtres */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Filtres</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* Filtre par poste */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Poste</label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as Position | 'ALL')}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 14
              }}
            >
              <option value="ALL">Tous les postes</option>
              <option value="GK">Gardien</option>
              <option value="DEF">Défenseur</option>
              <option value="MID">Milieu</option>
              <option value="FWD">Attaquant</option>
            </select>
          </div>

          {/* Filtre par prix max */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              Prix max: €{(maxPrice / 1_000_000).toFixed(1)}M
            </label>
            <input
              type="range"
              min="0"
              max={userTeam.funds}
              step={100_000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filtre par âge min */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              Âge min: {minAge} ans
            </label>
            <input
              type="range"
              min="17"
              max="35"
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filtre par âge max */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              Âge max: {maxAge} ans
            </label>
            <input
              type="range"
              min="17"
              max="35"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filtre par GEN min */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              GEN min: {minOverall}
            </label>
            <input
              type="range"
              min="60"
              max="100"
              value={minOverall}
              onChange={(e) => setMinOverall(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filtre par GEN max */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              GEN max: {maxOverall}
            </label>
            <input
              type="range"
              min="60"
              max="100"
              value={maxOverall}
              onChange={(e) => setMaxOverall(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filtre par équipe */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Équipe</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 14
              }}
            >
              <option value="ALL">Toutes les équipes</option>
              {otherTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 8, background: 'var(--panel)', borderRadius: 6, fontSize: 12, color: 'var(--muted)' }}>
          {totalFilteredPlayers} joueur{totalFilteredPlayers > 1 ? 's' : ''} trouvé{totalFilteredPlayers > 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredTeams.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
            Aucun joueur ne correspond aux critères de recherche.
          </div>
        ) : (
          filteredTeams.map(team => (
          <div key={team.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {team.logoUrl && (
                <img
                  src={team.logoUrl}
                  alt={team.shortName}
                  style={{ width: 40, height: 40, borderRadius: 8 }}
                  onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                />
              )}
              <div>
                <div style={{ fontWeight: 700 }}>{team.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{team.players.length} joueurs</div>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Âge</th>
                  <th>Poste</th>
                  <th>GEN</th>
                  <th>Forme</th>
                  <th>Prix</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {team.players
                  .sort((a, b) => b.overall - a.overall)
                  .map(player => {
                    const price = calculatePlayerPrice(player);
                    const canAfford = userTeam.funds >= price;
                    return (
                      <tr key={player.id}>
                        <td>{player.name}</td>
                        <td>{player.age}</td>
                        <td>
                          <span className={`pos pos-${player.position.toLowerCase()}`}>
                            {player.position}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{player.overall}</td>
                        <td>{player.fitness}</td>
                        <td style={{ fontWeight: 700, color: canAfford ? 'var(--accent)' : 'var(--muted)' }}>
                          €{(price / 1_000_000).toFixed(1)}M
                        </td>
                        <td>
                          <button
                            onClick={() => handleBuyPlayer(player, team)}
                            disabled={
                              !canAfford || 
                              userTeam.players.length >= 30 ||
                              (!isSubscribed && transfersCount >= FREE_LIMITATIONS.maxTransfersPerSeason)
                            }
                            style={{
                              padding: '4px 12px',
                              background: (canAfford && userTeam.players.length < 30 && (isSubscribed || transfersCount < FREE_LIMITATIONS.maxTransfersPerSeason)) 
                                ? 'var(--accent)' 
                                : 'var(--pill)',
                              color: (canAfford && userTeam.players.length < 30 && (isSubscribed || transfersCount < FREE_LIMITATIONS.maxTransfersPerSeason)) 
                                ? '#0a0a0a' 
                                : 'var(--muted)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              cursor: (canAfford && userTeam.players.length < 30 && (isSubscribed || transfersCount < FREE_LIMITATIONS.maxTransfersPerSeason)) 
                                ? 'pointer' 
                                : 'not-allowed',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            Acheter
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ))
        )}
      </div>
    </div>
  );
}

