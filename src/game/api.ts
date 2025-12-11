import type { League, Player, Position, Team } from './types';
import { getTeamBaseOverall } from './data/ratings';
import { calculateTeamBudget, computeStrength, getDefaultPreferredXI, createTeamWithGeneratedSquad } from './generator';
import { getDefaultFacilities } from './facilities';
import { setApiStadiumForTeam, createStadiumFromApiVenue } from './data/stadiums';

type ApiFootballTeam = {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    logo: string | null;
    founded: number | null;
  };
  venue?: {
    id: number | null;
    name: string | null;
    address: string | null;
    city: string | null;
    capacity: number | null;
    surface: string | null;
    image: string | null;
  } | null;
};

type ApiFootballTeamsResponse = {
  response: ApiFootballTeam[];
};

export async function fetchLeagueFromApiFootball(leagueId: number, season: number, apiKey: string): Promise<{ teams: Record<string, Team>; league: League }> {
  const endpoint = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`;
  const res = await fetch(endpoint, {
    headers: {
      'x-apisports-key': apiKey,
      'accept': 'application/json'
    }
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(`API rate limit exceeded (HTTP 429). Please wait a moment and try again.`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`API key invalid or expired (HTTP ${res.status})`);
    }
    const errorText = await res.text().catch(() => '');
    throw new Error(`API-FOOTBALL HTTP ${res.status}${errorText ? `: ${errorText}` : ''}`);
  }
  const data = await res.json() as ApiFootballTeamsResponse;
  const response = data.response ?? [];
  
  console.log(`[fm-lite] 📥 API returned ${response.length} teams for league ${leagueId} season ${season}`);
  if (response.length < 20) {
    console.warn(`[fm-lite] ⚠️ API returned only ${response.length} teams (expected 20 for Ligue 1)`);
  }

  const teams: Record<string, Team> = {};
  const teamIds: string[] = [];
  let stadiumsFound = 0;

  // Créer toutes les équipes avec des joueurs générés
  for (const item of response) {
    const t = item.team;
    const venue = item.venue; // venue est au même niveau que team dans la réponse API
    
    if (!t || !t.name) continue;
    const id = String(t.id ?? crypto.randomUUID());
    const short = (t.code && t.code.trim().length >= 2 ? t.code.trim().toUpperCase() : t.name.slice(0, 3).toUpperCase());
    
    // Générer une équipe complète avec joueurs générés
    const team = createTeamWithGeneratedSquad(t.name, short, t.logo ?? undefined);
    team.id = id; // Utiliser l'ID de l'API
    
    // Récupérer les informations du stade depuis l'API si disponibles
    if (venue) {
      console.log(`[fm-lite] 🏟️ Données venue trouvées pour ${t.name}:`, {
        name: venue.name,
        capacity: venue.capacity,
        city: venue.city,
        address: venue.address,
        image: venue.image ? venue.image : 'no'
      });
      
      const stadiumInfo = createStadiumFromApiVenue(venue);
      if (stadiumInfo) {
        // Sauvegarder le stade dans le cache pour utilisation future
        setApiStadiumForTeam(t.name, stadiumInfo);
        stadiumsFound++;
        console.log(`[fm-lite] ✅ Stade API sauvegardé pour ${t.name}: ${stadiumInfo.name}${stadiumInfo.capacity ? ` (${stadiumInfo.capacity} places)` : ''}${stadiumInfo.city ? ` - ${stadiumInfo.city}` : ''}${venue.image ? ` - Image: ${venue.image}` : ''}`);
      } else {
        console.warn(`[fm-lite] ⚠️ Impossible de créer StadiumInfo pour ${t.name} malgré la présence de venue`);
      }
    } else {
      console.log(`[fm-lite] ⚠️ Pas de données venue dans l'API pour ${t.name}`);
    }
    
    teams[id] = team;
    teamIds.push(id);
  }

  console.log(`[fm-lite] 🏟️ Résumé: ${stadiumsFound}/${response.length} stades récupérés depuis l'API`);

  console.log(`[fm-lite] ✅ All ${teamIds.length} teams loaded with generated players`);

  const league: League = {
    id: crypto.randomUUID(),
    name: `Ligue ${leagueId} (${season})`,
    teamIds: teamIds.slice(0, 20), // Prendre les 20 premières équipes
    schedule: []
  };

  // Retourner toutes les équipes valides d'un coup (pas de retour progressif)
  return { teams, league };
}

// Fallback via standings: extrait les équipes à partir du classement
type ApiFootballStandingsTeam = {
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
};
type ApiFootballStandingsLeague = {
  league: {
    id: number;
    name: string;
    standings: ApiFootballStandingsTeam[][];
  };
};
type ApiFootballStandingsResponse = {
  response: ApiFootballStandingsLeague[];
};

export async function fetchLeagueTeamsFromStandings(leagueId: number, season: number, apiKey: string): Promise<{ teams: Record<string, Team>; league: League }> {
  const endpoint = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`;
  const res = await fetch(endpoint, {
    headers: {
      'x-apisports-key': apiKey,
      'accept': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`API-FOOTBALL standings HTTP ${res.status}`);
  }
  const data = await res.json() as ApiFootballStandingsResponse;
  const first = data.response?.[0];
  const groups = first?.league?.standings?.[0] ?? [];

  const teams: Record<string, Team> = {};
  const teamIds: string[] = [];

  // Créer toutes les équipes avec des joueurs générés
  for (const row of groups) {
    const t = row.team;
    if (!t || !t.name || !t.id) continue;
    const id = String(t.id);
    const short = t.name.slice(0, 3).toUpperCase();
    
    // Générer une équipe complète avec joueurs générés
    const team = createTeamWithGeneratedSquad(t.name, short, t.logo ?? undefined);
    team.id = id; // Utiliser l'ID de l'API
    
    teams[id] = team;
    teamIds.push(id);
  }
  
  console.log(`[fm-lite] ✅ All ${teamIds.length} teams loaded with generated players`);

  const league: League = {
    id: crypto.randomUUID(),
    name: `Ligue ${leagueId} (${season})`,
    teamIds: teamIds.slice(0, 20), // Prendre les 20 premières équipes
    schedule: []
  };

  // Retourner toutes les équipes d'un coup (pas de retour progressif)
  return { teams, league };
}

// Fonction pour charger les joueurs de toutes les équipes après le choix
export async function loadAllTeamSquads(teams: Record<string, Team>, season: number, apiKey: string): Promise<Record<string, Team>> {
  const teamIds = Object.keys(teams);
  console.log(`[fm-lite] 📥 Loading squads for ${teamIds.length} teams (season ${season})...`);
  
  // Récupérer les joueurs de manière séquentielle avec délai pour éviter les rate limits
  const updatedTeams: Record<string, Team> = { ...teams };
  
  for (let i = 0; i < teamIds.length; i++) {
    const teamId = teamIds[i];
    const team = teams[teamId];
    if (!team) continue;
    
    // Extraire l'ID numérique de l'équipe depuis l'ID string
    const numericTeamId = parseInt(teamId, 10);
    if (isNaN(numericTeamId)) {
      console.warn(`[fm-lite] ⚠️ Cannot extract numeric team ID from ${teamId}`);
      continue;
    }
    
    // Délai progressif : 200ms entre chaque requête (limite API: ~10 req/s)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    try {
      const players = await fetchTeamSquad(numericTeamId, season, apiKey);
      if (players.length > 0) {
        const strength = computeStrength(players);
        updatedTeams[teamId] = {
          ...team,
          players,
          strength,
          preferredXI: getDefaultPreferredXI(players),
          funds: calculateTeamBudget(strength)
        };
        console.log(`[fm-lite] ✅ [${i + 1}/${teamIds.length}] Team ${team.name} loaded ${players.length} players`);
      } else {
        console.warn(`[fm-lite] ⚠️ [${i + 1}/${teamIds.length}] Team ${team.name} has no players`);
      }
    } catch (error) {
      console.error(`[fm-lite] ❌ [${i + 1}/${teamIds.length}] Error loading squad for team ${team.name}:`, error);
    }
  }
  
  const teamsWithPlayers = Object.values(updatedTeams).filter(t => t.players && t.players.length > 0).length;
  console.log(`[fm-lite] ✅ All squads loaded: ${teamsWithPlayers}/${teamIds.length} teams have players`);
  
  return updatedTeams;
}

// Récupère les saisons disponibles pour une ligue
type ApiFootballLeaguesResponse = {
  response: Array<{
    league: { id: number; name: string };
    seasons: Array<{ year: number; current: boolean; coverage?: { standings?: boolean } }>;
  }>;
};

export async function fetchLeagueSeasons(leagueId: number, apiKey: string): Promise<number[]> {
  const endpoint = `https://v3.football.api-sports.io/leagues?id=${leagueId}`;
  const res = await fetch(endpoint, {
    headers: {
      'x-apisports-key': apiKey,
      'accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`API-FOOTBALL leagues HTTP ${res.status}`);
  const data = await res.json() as ApiFootballLeaguesResponse;
  const seasons = data.response?.[0]?.seasons ?? [];
  return seasons.map(s => s.year).sort((a, b) => b - a);
}

// Types pour l'API des joueurs
type ApiFootballSquadPlayer = {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
};

// Types pour les statistiques des joueurs depuis l'API
type ApiFootballPlayerStats = {
  player: {
    id: number;
    name: string;
    age: number | null;
    birth: {
      date: string | null;
      place: string | null;
      country: string | null;
    };
    nationality: string | null;
    height: string | null;
    weight: string | null;
    injured: boolean;
    photo: string | null;
  };
  statistics: Array<{
    team: {
      id: number;
      name: string;
      logo: string | null;
    };
    league: {
      id: number;
      name: string;
      country: string;
      logo: string | null;
      flag: string | null;
      season: number;
    };
    games: {
      appearances: number | null;
      lineups: number | null;
      minutes: number | null;
      number: number | null;
      position: string | null;
      rating: string | null;
      captain: boolean;
    };
    substitutes: {
      in: number | null;
      out: number | null;
      bench: number | null;
    };
    shots: {
      total: number | null;
      on: number | null;
    };
    goals: {
      total: number | null;
      conceded: number | null;
      assists: number | null;
      saves: number | null;
    };
    passes: {
      total: number | null;
      key: number | null;
      accuracy: number | null;
    };
    tackles: {
      total: number | null;
      blocks: number | null;
      interceptions: number | null;
    };
    duels: {
      total: number | null;
      won: number | null;
    };
    dribbles: {
      attempts: number | null;
      success: number | null;
    };
    fouls: {
      drawn: number | null;
      committed: number | null;
    };
    cards: {
      yellow: number | null;
      red: number | null;
    };
    penalty: {
      won: number | null;
      commited: number | null;
      scored: number | null;
      missed: number | null;
      saved: number | null;
    };
  }>;
};

type ApiFootballPlayerStatsResponse = {
  response: ApiFootballPlayerStats[];
};

type ApiFootballSquadResponse = {
  response: Array<{
    team: {
      id: number;
      name: string;
      logo: string | null;
    };
    players: ApiFootballSquadPlayer[];
  }>;
};

// Convertit la position de l'API vers notre format
function convertPosition(apiPosition: string | null): Position {
  if (!apiPosition) return 'MID'; // Par défaut
  const pos = apiPosition.toLowerCase();
  if (pos.includes('goalkeeper') || pos === 'g') return 'GK';
  if (pos.includes('defender') || pos === 'd') return 'DEF';
  if (pos.includes('midfielder') || pos === 'm') return 'MID';
  if (pos.includes('attacker') || pos.includes('forward') || pos === 'f') return 'FWD';
  return 'MID'; // Par défaut
}

// Estime le overall d'un joueur basé sur son âge et sa position
function estimatePlayerOverall(age: number | null, position: Position): number {
  const baseAge = age ?? 25;
  // Pénalité/bonus basé sur l'âge (pic de performance entre 25-28 ans)
  let ageBonus = 0;
  if (baseAge < 20) ageBonus = -5;
  else if (baseAge < 23) ageBonus = -2;
  else if (baseAge <= 28) ageBonus = 3;
  else if (baseAge <= 32) ageBonus = 0;
  else if (baseAge <= 35) ageBonus = -3;
  else ageBonus = -7;
  
  // Note de base selon la position (pour avoir une base réaliste)
  const baseOverall = position === 'GK' ? 70 : 68;
  
  // Variation aléatoire pour plus de réalisme
  const randomVariation = (Math.random() - 0.5) * 15;
  
  const overall = baseOverall + ageBonus + randomVariation;
  return Math.round(Math.max(55, Math.min(90, overall)));
}

// Cache pour les stats des joueurs pour éviter les requêtes répétées
const playerStatsCache = new Map<number, {
  age: number | null;
  rating: number | null;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
} | null>();

// Récupère les statistiques détaillées d'un joueur depuis l'API-FOOTBALL
async function fetchPlayerStats(playerId: number, season: number, apiKey: string): Promise<{
  age: number | null;
  rating: number | null;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
} | null> {
  // Vérifier le cache
  if (playerStatsCache.has(playerId)) {
    return playerStatsCache.get(playerId) ?? null;
  }
  
  const endpoint = `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        'x-apisports-key': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      playerStatsCache.set(playerId, null);
      return null;
    }
    
    const data = await res.json() as ApiFootballPlayerStatsResponse;
    const playerData = data.response?.[0];
    
    if (!playerData || !playerData.statistics || playerData.statistics.length === 0) {
      playerStatsCache.set(playerId, null);
      return null;
    }
    
    // Trouver les stats pour la ligue actuelle (Ligue 1 = 61)
    const leagueStats = playerData.statistics.find(s => s.league.id === 61) || playerData.statistics[0];
    
    const rating = leagueStats.games.rating ? parseFloat(leagueStats.games.rating) : null;
    // Convertir la note de l'API (0-10) vers notre format (0-100) en multipliant par 10
    let overall = rating ? Math.round(rating * 10) : null;
    
    // Si pas de rating direct, calculer un rating basé sur les statistiques
    if (!overall && leagueStats.games.appearances && leagueStats.games.appearances > 0) {
      const appearances = leagueStats.games.appearances;
      const goals = leagueStats.goals.total ?? 0;
      const assists = leagueStats.goals.assists ?? 0;
      const passesAccuracy = leagueStats.passes.accuracy ?? 0;
      const dribblesSuccess = leagueStats.dribbles.attempts 
        ? (leagueStats.dribbles.success ?? 0) / leagueStats.dribbles.attempts * 100 
        : 0;
      
      // Calculer un rating basé sur les performances
      let calculatedRating = 60; // Base
      
      // Bonus pour les buts et passes décisives
      const goalContribution = (goals + assists) / appearances;
      calculatedRating += Math.min(goalContribution * 5, 15); // Max +15
      
      // Bonus pour la précision des passes
      if (passesAccuracy > 0) {
        calculatedRating += (passesAccuracy - 70) / 2; // Bonus si > 70%
      }
      
      // Bonus pour les dribbles réussis
      if (dribblesSuccess > 0) {
        calculatedRating += (dribblesSuccess - 50) / 3; // Bonus si > 50%
      }
      
      // Bonus pour les minutes jouées (indique l'importance du joueur)
      const minutes = leagueStats.games.minutes ?? 0;
      const avgMinutes = minutes / appearances;
      if (avgMinutes > 60) {
        calculatedRating += 3; // Titulaire régulier
      }
      
      overall = Math.round(Math.max(55, Math.min(90, calculatedRating)));
    }
    
    const stats = {
      age: playerData.player.age,
      rating: overall,
      appearances: leagueStats.games.appearances ?? 0,
      goals: leagueStats.goals.total ?? 0,
      assists: leagueStats.goals.assists ?? 0,
      yellowCards: leagueStats.cards.yellow ?? 0,
      redCards: leagueStats.cards.red ?? 0
    };
    
    // Mettre en cache
    playerStatsCache.set(playerId, stats);
    return stats;
  } catch (error) {
    playerStatsCache.set(playerId, null);
    return null;
  }
}

// Récupère l'effectif d'une équipe depuis l'API-FOOTBALL avec vraies stats
// Type pour la réponse de l'endpoint /players (avec league et season)
type ApiFootballPlayersResponse = {
  response: Array<{
    player: {
      id: number;
      name: string;
      age: number | null;
      birth: {
        date: string | null;
        place: string | null;
        country: string | null;
      } | null;
      nationality: string | null;
      height: string | null;
      weight: string | null;
      injured: boolean | null;
      photo: string | null;
    };
    statistics: Array<{
      team: {
        id: number;
        name: string;
      };
      league: {
        id: number;
        name: string;
        season: number;
      };
      games: {
        position: string | null;
        rating: string | null;
        captain: boolean;
        substitute: boolean;
        minutes: number | null;
        number: number | null;
        appearances: number | null;
        lineups: number | null;
      };
      goals: {
        total: number | null;
        assists: number | null;
      };
      cards: {
        yellow: number | null;
        red: number | null;
      };
    }>;
  }>;
};

export async function fetchTeamSquad(teamId: number, season: number, apiKey: string): Promise<Player[]> {
  // Utiliser l'endpoint /players avec league et season pour récupérer les joueurs de la saison 2022
  // Cela garantit qu'on récupère les joueurs de la bonne saison
  const leagueId = 61; // Ligue 1
  const endpoint = `https://v3.football.api-sports.io/players?team=${teamId}&league=${leagueId}&season=${season}`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        'x-apisports-key': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[fm-lite] ❌ API-FOOTBALL players HTTP ${res.status} for team ${teamId} season ${season}`);
      console.error(`[fm-lite] Error response:`, errorText);
      
      // Si erreur 401, 403, 429, etc. on arrête tout
      if (res.status === 401 || res.status === 403) {
        throw new Error(`API key invalide ou expirée (HTTP ${res.status})`);
      }
      if (res.status === 429) {
        throw new Error(`Rate limit dépassé (HTTP ${res.status})`);
      }
      return [];
    }
    
    const data = await res.json() as ApiFootballPlayersResponse;
    
    // Log de la réponse pour debug
    if (!data.response || data.response.length === 0) {
      console.warn(`[fm-lite] ⚠️ No players data in API response for team ${teamId} season ${season}`);
      return [];
    }
    
    console.log(`[fm-lite] 📥 API returned ${data.response.length} players for team ${teamId} season ${season}`);
    
    // Créer les joueurs avec les données de l'API
    const players: Player[] = [];
    const playerIdsToFetch: number[] = [];
    
    for (const item of data.response) {
      const apiPlayer = item.player;
      const stats = item.statistics?.[0]; // Prendre la première statistique (pour cette équipe et cette saison)
      
      if (!apiPlayer || !apiPlayer.name || !apiPlayer.name.trim()) {
        console.warn(`[fm-lite] ⚠️ Skipping player without name (ID: ${apiPlayer?.id || 'unknown'})`);
        continue;
      }
      
      // Utiliser la position depuis les statistiques si disponible, sinon depuis le joueur
      const position = convertPosition(stats?.games?.position || null);
      
      // Calculer l'âge depuis la date de naissance ou utiliser l'âge fourni
      let age = apiPlayer.age ?? null;
      if (!age && apiPlayer.birth?.date) {
        const birthYear = new Date(apiPlayer.birth.date).getFullYear();
        age = season - birthYear;
      }
      if (!age) {
        age = Math.floor(Math.random() * 15) + 20; // Fallback si pas d'âge
      }
      
      // Estimation initiale du overall basé sur l'âge réel
      const overall = estimatePlayerOverall(age, position);
      
      // Vérifier que le nom vient bien de l'API (pas généré)
      const playerName = apiPlayer.name.trim();
      if (!playerName) {
        console.warn(`[fm-lite] ⚠️ Player has empty name after trim (ID: ${apiPlayer.id})`);
        continue;
      }
      
      // Créer le joueur avec les données de base
      const player: Player = {
        id: `player-${apiPlayer.id}`,
        name: playerName,
        age: age,
        position: position,
        overall: overall,
        fitness: 100,
        stats: {
          matchesPlayed: stats?.games?.appearances ?? 0,
          goals: stats?.goals?.total ?? 0,
          assists: stats?.goals?.assists ?? 0,
          yellowCards: stats?.cards?.yellow ?? 0,
          redCards: stats?.cards?.red ?? 0
        }
      };
      
      players.push(player);
      
      // Si on a besoin de stats détaillées, on les récupérera plus tard
      // Pour l'instant, on utilise les stats de base de la réponse
      if (stats && (stats.games?.appearances ?? 0) > 0) {
        // On a déjà les stats de base, pas besoin de fetch supplémentaire
      } else {
        // Si pas de stats dans la réponse, on peut les récupérer plus tard si nécessaire
        playerIdsToFetch.push(apiPlayer.id);
      }
    }
    
    // Log les 3 premiers joueurs pour vérifier
    if (players.length > 0) {
      console.log(`[fm-lite] 🔍 Sample players from API (season ${season}):`, players.slice(0, 3).map(p => ({ id: p.id, name: p.name, age: p.age, position: p.position, overall: p.overall })));
    }
    
    // Si on a besoin de récupérer des stats détaillées pour certains joueurs, on le fait maintenant
    // Mais pour l'instant, on utilise les stats de base de la réponse /players
    // Les stats détaillées peuvent être récupérées plus tard si nécessaire
    
    if (players.length > 0) {
      const withRealStats = players.filter(p => p.stats && p.stats.matchesPlayed > 0).length;
      const withRealAge = players.filter(p => p.age && p.age > 0 && p.age < 50).length;
      
      console.log(`[fm-lite] ✅ Fetched ${players.length} REAL players for team ${teamId} season ${season}`);
      console.log(`[fm-lite]    - ${withRealAge}/${players.length} players with real age from API`);
      console.log(`[fm-lite]    - ${withRealStats}/${players.length} players with real stats from API`);
      console.log(`[fm-lite]    First 3:`, 
        players.slice(0, 3).map(p => `${p.name} (${p.age}ans, OVR:${p.overall}${p.stats?.matchesPlayed ? `, ${p.stats.matchesPlayed} matches` : ''})`)
      );
    } else {
      console.warn(`[fm-lite] ⚠️ No valid players found in API response for team ${teamId} season ${season}`);
    }
    
    return players;
  } catch (error) {
    console.error(`[fm-lite] Error fetching squad for team ${teamId}:`, error);
    return [];
  }
}




