import { useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard';
import SquadView from './components/SquadView';
import FixturesView from './components/FixturesView';
import MatchDay from './components/MatchDay';
import type { GameState } from './game/types';
import TeamSelect from './components/TeamSelect';
import { createNewGameFrom, createTeamWithGeneratedSquad } from './game/generator';
import { fetchLeagueFromApiFootball, fetchLeagueTeamsFromStandings } from './game/api';
import { generateRoundRobinSchedule } from './game/schedule';
import { loadState, saveState, clearState } from './game/storage';
import { loadLeagueCache, saveLeagueCache } from './game/cache';
import './index.css';
import type { League, Team } from './game/types';

type Tab = 'dashboard' | 'squad' | 'fixtures' | 'matchday';

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [pending, setPending] = useState<{ teams: Record<string, Team>; league: League } | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');

  // Saison forcée
  const forcedSeason = 2022;
  const cacheId = `league-61-${forcedSeason}`;
  const CACHE_FOREVER = Number.POSITIVE_INFINITY;

  // Garantit un championnat à 20 équipes en complétant si besoin
  const ensureTwentyTeams = (pack: { teams: Record<string, Team>; league: League }): { teams: Record<string, Team>; league: League } => {
    const desired = 20;
    let { teams, league } = pack;
    const currentIds = [...league.teamIds];
    if (currentIds.length >= desired) {
      return { teams, league: { ...league, teamIds: currentIds.slice(0, desired) } };
    }
    const missing = desired - currentIds.length;
    const additions: string[] = [];
    for (let i = 0; i < missing; i++) {
      const idx = currentIds.length + i + 1;
      const extra = createTeamWithGeneratedSquad(`Club ${idx}`, `C${String(idx).padStart(2, '0')}`);
      teams = { ...teams, [extra.id]: extra };
      additions.push(extra.id);
    }
    league = { ...league, teamIds: [...currentIds, ...additions] };
    return { teams, league };
  };

  const fetchPendingFromApi = async () => {
    const apiKey = (import.meta as any).env?.VITE_API_FOOTBALL_KEY as string | undefined;
    try {
      if (apiKey && apiKey.trim().length > 0) {
        console.log('[fm-lite] using API-FOOTBALL with key present (forced season)', forcedSeason);
        const leagueId = 61;
        // 1) Essai principal: endpoint teams
        try {
          const { teams, league } = await fetchLeagueFromApiFootball(leagueId, forcedSeason, apiKey);
          const mergedTeams: Record<string, any> = {};
          const teamIds: string[] = [];
          for (const id of league.teamIds) {
            const apiTeam = teams[id];
            if (!apiTeam) continue;
            const built = createTeamWithGeneratedSquad(apiTeam.name, apiTeam.shortName, apiTeam.logoUrl);
            mergedTeams[built.id] = built;
            teamIds.push(built.id);
          }
          if (teamIds.length > 0) {
            const pendingLeague = { ...league, id: crypto.randomUUID(), teamIds, name: `Ligue 1 (API ${forcedSeason})`, schedule: [] };
            const pendingPack = ensureTwentyTeams({ teams: mergedTeams, league: pendingLeague });
            console.log('[fm-lite] pending from API', { count: teamIds.length, season: forcedSeason });
            setPending(pendingPack);
            saveLeagueCache(cacheId, pendingPack);
            return;
          }
        } catch {}
        // 2) Fallback: standings
        try {
          const viaStandings = await fetchLeagueTeamsFromStandings(leagueId, forcedSeason, apiKey);
          const mergedTeams2: Record<string, any> = {};
          const teamIds2: string[] = [];
          for (const id of viaStandings.league.teamIds) {
            const apiTeam = viaStandings.teams[id];
            if (!apiTeam) continue;
            const built = createTeamWithGeneratedSquad(apiTeam.name, apiTeam.shortName, apiTeam.logoUrl);
            mergedTeams2[built.id] = built;
            teamIds2.push(built.id);
          }
          if (teamIds2.length > 0) {
            const pendingLeague = { ...viaStandings.league, id: crypto.randomUUID(), teamIds: teamIds2, name: `Ligue 1 (API ${forcedSeason})`, schedule: [] };
            const pendingPack = ensureTwentyTeams({ teams: mergedTeams2, league: pendingLeague });
            console.log('[fm-lite] pending from API via standings', { count: teamIds2.length, season: forcedSeason });
            setPending(pendingPack);
            saveLeagueCache(cacheId, pendingPack);
            return;
          }
        } catch {}
        console.warn('[fm-lite] API returned 0 teams for forced season', forcedSeason);
      }
    } catch (e) {
      console.warn('[fm-lite] API-FOOTBALL failed', e);
    }
    setPending({
      teams: {},
      league: { id: crypto.randomUUID(), name: 'Aucune ligue chargée', teamIds: [], schedule: [] }
    });
  };

  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      setState(loaded);
    } else {
      // Essaye d'abord l'API-FOOTBALL; sinon on montre un écran vide avec message
      // 0) tente le cache local (évite des requêtes inutiles)
      const cached = loadLeagueCache(cacheId, CACHE_FOREVER);
      if (cached) {
        console.log('[fm-lite] using cached league', { count: cached.league.teamIds.length });
        setPending(ensureTwentyTeams(cached));
        return;
      }
      void fetchPendingFromApi();
    }
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const reset = () => {
    clearState();
    setState(null);
    const cached = loadLeagueCache(cacheId, CACHE_FOREVER);
    if (cached) {
      console.log('[fm-lite] using cached league (reset)', { count: cached.league.teamIds.length });
      setPending(ensureTwentyTeams(cached));
    } else {
      setPending({
        teams: {},
        league: { id: crypto.randomUUID(), name: 'Aucune ligue chargée', teamIds: [], schedule: [] }
      });
      void fetchPendingFromApi();
    }
  };

  const startWithTeam = (teamId: string) => {
    if (!pending) return;
    const game = createNewGameFrom(pending.teams, { ...pending.league, schedule: [] }, teamId);
    game.league.schedule = generateRoundRobinSchedule(game.league);
    setState(game);
    setPending(null);
    setTab('dashboard');
  };

  const content = useMemo(() => {
    if (!state) {
      if (pending) {
        return <TeamSelect teams={pending.teams} league={pending.league} onSelect={startWithTeam} />;
      }
      return null;
    }
    switch (tab) {
      case 'dashboard':
        return <Dashboard state={state} />;
      case 'squad':
        return <SquadView state={state} />;
      case 'fixtures':
        return <FixturesView state={state} />;
      case 'matchday':
        return <MatchDay state={state} setState={setState} />;
      default:
        return null;
    }
  }, [state, tab, pending]);

  if (!state && !pending) return <div style={{ padding: 24 }}>Chargement…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Football Manager Lite</h1>
        <div className="spacer" />
        {state && (
          <>
            <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Tableau</button>
            <button className={tab === 'squad' ? 'active' : ''} onClick={() => setTab('squad')}>Effectif</button>
            <button className={tab === 'fixtures' ? 'active' : ''} onClick={() => setTab('fixtures')}>Calendrier</button>
            <button className={tab === 'matchday' ? 'active' : ''} onClick={() => setTab('matchday')}>Jour de match</button>
          </>
        )}
        <button onClick={reset} style={{ marginLeft: 12 }}>Nouvelle partie</button>
      </header>
      <main>{content}</main>
    </div>
  );
}
