import { useCallback, useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard';
import SquadView from './components/SquadView';
import FixturesView from './components/FixturesView';
import MatchDay from './components/MatchDay';
import TransfersView from './components/TransfersView';
import StadiumView from './components/StadiumView';
import type { GameState, SponsorContract, TvDeal } from './game/types';
import TeamSelect from './components/TeamSelect';
import { createNewGameFrom, createTeamWithGeneratedSquad } from './game/generator';
import { createInitialCupState } from './game/cup';
import { fetchLeagueFromApiFootball, fetchLeagueTeamsFromStandings } from './game/api';
import { generateRoundRobinSchedule } from './game/schedule';
import { loadState, saveState, clearState } from './game/storage';
import { loadLeagueCache, saveLeagueCache } from './game/cache';
import './index.css';
import type { League, Team } from './game/types';

type Tab = 'dashboard' | 'squad' | 'fixtures' | 'matchday' | 'transfers' | 'stadium';

const SPONSOR_OPTIONS: SponsorContract[] = [
  {
    id: 'uber-eats',
    name: 'Uber Eats',
    bonus: 2_000_000,
    duration: '1 an',
    description: 'Sponsor historique de Ligue 1, visibilité digitale massive.'
  },
  {
    id: 'qatar-airways',
    name: 'Qatar Airways',
    bonus: 5_500_000,
    duration: '2 ans',
    description: 'Compagnie aérienne premium, partenariats internationaux.'
  },
  {
    id: 'nike',
    name: 'Nike',
    bonus: 9_500_000,
    duration: '3 ans',
    description: 'Équipementier mondial, attente d’un jeu spectaculaire.'
  }
];

const TV_OPTIONS: TvDeal[] = [
  {
    id: 'canal-plus',
    name: 'Canal+',
    payout: 2_000_000,
    description: 'Diffuseur historique, soirées dominicales classiques.',
    expectation: 'Objectifs raisonnables'
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime Video',
    payout: 4_000_000,
    description: 'Multiplex nationaux, interviews obligatoires.',
    expectation: 'Forte pression médiatique'
  },
  {
    id: 'bein-sports',
    name: 'beIN SPORTS',
    payout: 6_500_000,
    description: 'Diffusion internationale en continu.',
    expectation: 'Résultats européens espérés'
  }
];

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [pending, setPending] = useState<{ teams: Record<string, Team>; league: League } | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [seasonOptions, setSeasonOptions] = useState<{
    sponsors: SponsorContract[];
    tvDeals: TvDeal[];
  }>({ sponsors: [], tvDeals: [] });
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>('');
  const [selectedTvId, setSelectedTvId] = useState<string>('');

  // Saison forcée
  const forcedSeason = 2022;
  const cacheId = `league-61-${forcedSeason}`;

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
      let upgraded = ensureTeamStats(loaded);
      if (!upgraded.cup) {
        upgraded = {
          ...upgraded,
          cup: createInitialCupState(upgraded.league.teamIds, upgraded.userTeamId)
        };
      }
      upgraded = ensureTeamStats(upgraded);
      setState(upgraded);
    } else {
      // Essaye d'abord l'API-FOOTBALL; sinon on montre un écran vide avec message
      // 0) tente le cache local (évite des requêtes inutiles)
      const cached = loadLeagueCache(cacheId, 1000 * 60 * 60 * 24 * 7); // 7 jours
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

  const randomizeContracts = useCallback(() => {
    const shuffle = <T,>(arr: T[]): T[] => arr.slice().sort(() => Math.random() - 0.5);
    const sponsors = shuffle(SPONSOR_OPTIONS).slice(0, 3);
    const tvDeals = shuffle(TV_OPTIONS).slice(0, 3);
    setSeasonOptions({ sponsors, tvDeals });
    setSelectedSponsorId(sponsors[0]?.id ?? '');
    setSelectedTvId(tvDeals[0]?.id ?? '');
  }, []);

  const reset = () => {
    clearState();
    setState(null);
    randomizeContracts();
    const cached = loadLeagueCache(cacheId, 1000 * 60 * 60 * 24 * 7);
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
    randomizeContracts();
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
        return <SquadView state={state} setState={setState} />;
      case 'fixtures':
        return <FixturesView state={state} />;
      case 'matchday':
        return <MatchDay state={state} setState={setState} />;
      case 'transfers':
        return <TransfersView state={state} setState={setState} />;
      case 'stadium':
        return <StadiumView state={state} setState={setState} />;
      default:
        return null;
    }
  }, [state, tab, pending]);

  const needsContracts = state && (!state.economy?.sponsor || !state.economy?.tvDeal);
  const currentSponsor = seasonOptions.sponsors.find(s => s.id === selectedSponsorId);
  const currentTv = seasonOptions.tvDeals.find(t => t.id === selectedTvId);

  const confirmContracts = () => {
    if (!state || !currentSponsor || !currentTv) return;
    const userTeam = state.teams[state.userTeamId];
    const updatedTeam = {
      ...userTeam,
      funds: userTeam.funds + currentSponsor.bonus + currentTv.payout
    };
    setState({
      ...state,
      teams: {
        ...state.teams,
        [state.userTeamId]: updatedTeam
      },
      economy: {
        sponsor: currentSponsor,
        tvDeal: currentTv
      }
    });
  };

  useEffect(() => {
    if (state && (!state.economy?.sponsor || !state.economy?.tvDeal) && seasonOptions.sponsors.length === 0) {
      randomizeContracts();
    }
  }, [state, seasonOptions.sponsors.length, randomizeContracts]);

  if (!state && !pending) return <div style={{ padding: 24 }}>Chargement…</div>;

  return (
    <div className="app">
      {state && needsContracts && (
        <ContractsModal
          sponsorOptions={seasonOptions.sponsors}
          tvOptions={seasonOptions.tvDeals}
          selectedSponsorId={selectedSponsorId}
          selectedTvId={selectedTvId}
          onSelectSponsor={setSelectedSponsorId}
          onSelectTv={setSelectedTvId}
          onConfirm={confirmContracts}
        />
      )}
      <header className="topbar">
        <h1>Football Manager Lite</h1>
        <div className="spacer" />
        {state && (
          <>
            <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Tableau</button>
            <button className={tab === 'squad' ? 'active' : ''} onClick={() => setTab('squad')}>Effectif</button>
            <button className={tab === 'fixtures' ? 'active' : ''} onClick={() => setTab('fixtures')}>Calendrier</button>
            <button className={tab === 'matchday' ? 'active' : ''} onClick={() => setTab('matchday')}>Jour de match</button>
            <button className={tab === 'stadium' ? 'active' : ''} onClick={() => setTab('stadium')}>Stade</button>
            <button className={tab === 'transfers' ? 'active' : ''} onClick={() => setTab('transfers')}>Transfert</button>
          </>
        )}
        <button onClick={reset} style={{ marginLeft: 12 }}>Nouvelle partie</button>
      </header>
      <main>{content}</main>
    </div>
  );
}

function ContractsModal({
  sponsorOptions,
  tvOptions,
  selectedSponsorId,
  selectedTvId,
  onSelectSponsor,
  onSelectTv,
  onConfirm
}: {
  sponsorOptions: SponsorContract[];
  tvOptions: TvDeal[];
  selectedSponsorId: string;
  selectedTvId: string;
  onSelectSponsor: (id: string) => void;
  onSelectTv: (id: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(960px, 95vw)',
          maxHeight: '95vh',
          overflow: 'auto',
          padding: 24,
          border: '2px solid rgba(59,130,246,0.4)',
          background: '#070e1f',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        <h2 style={{ marginTop: 0 }}>Choisissez vos partenaires</h2>
        <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
          Une nouvelle saison commence. Sélectionnez un sponsor principal et un contrat TV pour sécuriser votre budget.
        </div>
        <div style={{ display: 'grid', gap: 20 }}>
          <section>
            <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#38bdf8', marginBottom: 8 }}>Sponsors</div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {sponsorOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => onSelectSponsor(option.id)}
                  style={{
                    borderRadius: 12,
                    border: option.id === selectedSponsorId ? '2px solid rgba(34,197,94,0.8)' : '1px solid rgba(148,163,184,0.3)',
                    background: option.id === selectedSponsorId ? 'rgba(34,197,94,0.12)' : 'rgba(15,23,42,0.8)',
                    padding: 16,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{option.name}</div>
                  <div style={{ fontSize: 13, color: '#cbd5f5', margin: '6px 0' }}>{option.description}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Bonus immédiat : €{(option.bonus / 1_000_000).toFixed(1)}M · Contrat {option.duration}</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#38bdf8', marginBottom: 8 }}>Droits TV</div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {tvOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => onSelectTv(option.id)}
                  style={{
                    borderRadius: 12,
                    border: option.id === selectedTvId ? '2px solid rgba(59,130,246,0.8)' : '1px solid rgba(148,163,184,0.3)',
                    background: option.id === selectedTvId ? 'rgba(59,130,246,0.15)' : 'rgba(15,23,42,0.8)',
                    padding: 16,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{option.name}</div>
                  <div style={{ fontSize: 13, color: '#cbd5f5', margin: '6px 0' }}>{option.description}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Payout : €{(option.payout / 1_000_000).toFixed(1)}M · {option.expectation}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <button
          onClick={onConfirm}
          style={{
            marginTop: 24,
            width: '100%',
            padding: '14px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(90deg,#22c55e,#16a34a)',
            color: '#04130a',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer'
          }}
        >
          Valider les contrats
        </button>
      </div>
    </div>
  );
}

function ensureTeamStats(game: GameState): GameState {
  let changed = false;
  const teams: GameState['teams'] = {};
  for (const [id, team] of Object.entries(game.teams)) {
    const wins = team.wins ?? 0;
    const draws = team.draws ?? 0;
    const losses = team.losses ?? 0;
    if (wins !== team.wins || draws !== team.draws || losses !== team.losses) {
      teams[id] = { ...team, wins, draws, losses };
      changed = true;
    } else {
      teams[id] = team;
    }
  }
  return changed ? { ...game, teams } : game;
}
