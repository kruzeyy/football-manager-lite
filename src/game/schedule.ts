import type { League, Match } from './types';

export function generateRoundRobinSchedule(league: League): Match[] {
  const teamIds = [...league.teamIds];
  if (teamIds.length % 2 === 1) teamIds.push('BYE');
  const numTeams = teamIds.length;
  const rounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  const schedule: Match[] = [];

  const rotation = teamIds.slice(1);
  for (let round = 1; round <= rounds; round++) {
    const roundPairs: Array<[string, string]> = [];
    const left = [teamIds[0], ...rotation.slice(0, matchesPerRound - 1)];
    const right = rotation.slice(matchesPerRound - 1).reverse();
    for (let i = 0; i < matchesPerRound; i++) {
      roundPairs.push([left[i], right[i]]);
    }
    for (const [home, away] of roundPairs) {
      if (home === 'BYE' || away === 'BYE') continue;
      schedule.push({
        id: crypto.randomUUID(),
        round,
        homeTeamId: home,
        awayTeamId: away,
        homeGoals: null,
        awayGoals: null
      });
    }
    rotation.unshift(rotation.pop() as string);
  }

  // Retour (matchs inversés)
  const returnLeg: Match[] = schedule.map(m => ({
    ...m,
    id: crypto.randomUUID(),
    round: m.round + rounds,
    homeTeamId: m.awayTeamId,
    awayTeamId: m.homeTeamId
  }));

  return [...schedule, ...returnLeg];
}
