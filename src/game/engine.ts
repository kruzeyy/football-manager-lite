import type { GameState, Match, Team, Player } from './types';

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function expectedGoals(strengthDiff: number): number {
  const base = 1.2;
  const adj = logistic(strengthDiff / 12) - 0.5; // ~[-0.5, 0.5]
  return Math.max(0.2, base + adj * 1.2);
}

function sampleGoals(lambda: number): number {
  // Poor man’s Poisson-like sampling
  let goals = 0;
  let prob = Math.min(0.9, lambda / 3);
  for (let i = 0; i < 6; i++) {
    if (Math.random() < prob) goals++;
    prob *= 0.75;
  }
  return goals;
}

export function simulateMatch(state: GameState, match: Match): { home: number; away: number } {
  const home: Team = state.teams[match.homeTeamId];
  const away: Team = state.teams[match.awayTeamId];
  const homeAdv = 4; // avantage domicile
  const diff = (home.strength + homeAdv) - away.strength;
  const homeXg = expectedGoals(diff);
  const awayXg = expectedGoals(-diff);
  const homeGoals = sampleGoals(homeXg);
  const awayGoals = sampleGoals(awayXg);
  return { home: homeGoals, away: awayGoals };
}

function generatePlayerStats(players: Player[], goals: number, isHome: boolean): string[] {
  // Sélectionner 11 joueurs pour le match (XI type)
  const selectedPlayers = players
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11);

  // Initialiser les stats si nécessaire
  selectedPlayers.forEach(p => {
    if (!p.stats) {
      p.stats = { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    }
    p.stats.matchesPlayed += 1;
  });

  const scorers: string[] = [];

  // Distribuer les buts (probabilité plus élevée pour les attaquants)
  let remainingGoals = goals;
  while (remainingGoals > 0) {
    const attackers = selectedPlayers.filter(p => p.position === 'FWD');
    const midfielders = selectedPlayers.filter(p => p.position === 'MID');
    const defenders = selectedPlayers.filter(p => p.position === 'DEF');
    
    const allScorers = [...attackers, ...midfielders, ...defenders];
    if (allScorers.length === 0) break;
    
    // Probabilité : 50% attaquant, 30% milieu, 15% défenseur, 5% gardien
    let scorer: Player;
    const rand = Math.random();
    if (rand < 0.5 && attackers.length > 0) {
      scorer = attackers[Math.floor(Math.random() * attackers.length)];
    } else if (rand < 0.8 && midfielders.length > 0) {
      scorer = midfielders[Math.floor(Math.random() * midfielders.length)];
    } else if (rand < 0.95 && defenders.length > 0) {
      scorer = defenders[Math.floor(Math.random() * defenders.length)];
    } else {
      scorer = allScorers[Math.floor(Math.random() * allScorers.length)];
    }
    
    scorer.stats!.goals += 1;
    scorers.push(scorer.name);
    
    // Ajouter une passe décisive (probabilité 60%)
    if (Math.random() < 0.6) {
      const assisters = selectedPlayers.filter(p => p.id !== scorer.id);
      if (assisters.length > 0) {
        const assister = assisters[Math.floor(Math.random() * assisters.length)];
        assister.stats!.assists += 1;
      }
    }
    
    remainingGoals--;
  }

  // Cartons jaunes (probabilité 20% par joueur)
  selectedPlayers.forEach(p => {
    if (Math.random() < 0.2) {
      p.stats!.yellowCards += 1;
    }
  });

  // Carton rouge (probabilité 2% par joueur)
  selectedPlayers.forEach(p => {
    if (Math.random() < 0.02) {
      p.stats!.redCards += 1;
    }
  });

  return scorers;
}

export function applyMatchResult(state: GameState, match: Match, homeGoals: number, awayGoals: number): void {
  const home = state.teams[match.homeTeamId];
  const away = state.teams[match.awayTeamId];

  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) home.points += 3;
  else if (awayGoals > homeGoals) away.points += 3;
  else { home.points += 1; away.points += 1; }

  // Générer les statistiques des joueurs et récupérer les buteurs
  const homeScorers = generatePlayerStats(home.players, homeGoals, true);
  const awayScorers = generatePlayerStats(away.players, awayGoals, false);
  
  // Stocker les buteurs dans le match
  match.homeScorers = homeScorers;
  match.awayScorers = awayScorers;
}
