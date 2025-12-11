import { useCallback, useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard';
import SquadView from './components/SquadView';
import FixturesView from './components/FixturesView';
import MatchDay from './components/MatchDay';
import TransfersView from './components/TransfersView';
import StadiumView from './components/StadiumView';
import type { GameState, SponsorContract, TvDeal } from './game/types';
import TeamSelect from './components/TeamSelect';
import LeagueSelect from './components/LeagueSelect';
import { createNewGameFrom } from './game/generator';
import { createInitialCupState } from './game/cup';
import { fetchLeagueFromApiFootball, fetchLeagueTeamsFromStandings } from './game/api';
import { generateRoundRobinSchedule } from './game/schedule';
import { loadState, saveState, clearState } from './game/storage';
import { loadLeagueCache, saveLeagueCache, clearAllLeagueCache } from './game/cache';
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
    description: 'Équipementier mondial, attente d\'un jeu spectaculaire.'
  },
  {
    id: 'adidas',
    name: 'Adidas',
    bonus: 8_500_000,
    duration: '3 ans',
    description: 'Équipementier historique, expertise technique reconnue.'
  },
  {
    id: 'puma',
    name: 'Puma',
    bonus: 4_500_000,
    duration: '2 ans',
    description: 'Marque dynamique, focus sur la jeunesse et l\'innovation.'
  },
  {
    id: 'orange',
    name: 'Orange',
    bonus: 6_000_000,
    duration: '2 ans',
    description: 'Opérateur télécom, partenaire digital majeur.'
  },
  {
    id: 'carrefour',
    name: 'Carrefour',
    bonus: 3_000_000,
    duration: '1 an',
    description: 'Grande distribution, ancrage local fort.'
  },
  {
    id: 'betclic',
    name: 'Betclic',
    bonus: 7_500_000,
    duration: '2 ans',
    description: 'Parieur officiel, investissement croissant.'
  },
  {
    id: 'coca-cola',
    name: 'Coca-Cola',
    bonus: 5_000_000,
    duration: '2 ans',
    description: 'Marque mondiale, sponsoring événementiel.'
  },
  {
    id: 'psg',
    name: 'Qatar Sports Investments',
    bonus: 12_000_000,
    duration: '3 ans',
    description: 'Investisseur majeur, ambition internationale.'
  },
  {
    id: 'amazon',
    name: 'Amazon',
    bonus: 10_000_000,
    duration: '3 ans',
    description: 'Tech géant, présence digitale massive.'
  },
  {
    id: 'mcdo',
    name: 'McDonald\'s',
    bonus: 3_500_000,
    duration: '1 an',
    description: 'Fast-food mondial, proximité avec les supporters.'
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
  },
  {
    id: 'tf1',
    name: 'TF1',
    payout: 3_000_000,
    description: 'Chaine généraliste, audience massive du dimanche.',
    expectation: 'Performance médiatique attendue'
  },
  {
    id: 'france-tv',
    name: 'France Télévisions',
    payout: 2_500_000,
    description: 'Service public, couverture équitable.',
    expectation: 'Engagement sportif modéré'
  },
  {
    id: 'm6',
    name: 'M6',
    payout: 2_800_000,
    description: 'Chaine privée, format dynamique.',
    expectation: 'Objectifs modérés'
  },
  {
    id: 'espn',
    name: 'ESPN',
    payout: 8_000_000,
    description: 'Réseau américain, visibilité internationale.',
    expectation: 'Excellence et résultats européens'
  },
  {
    id: 'sky-sports',
    name: 'Sky Sports',
    payout: 7_000_000,
    description: 'Diffuseur britannique premium, production soignée.',
    expectation: 'Performance de haut niveau'
  },
  {
    id: 'dazn',
    name: 'DAZN',
    payout: 5_500_000,
    description: 'Plateforme streaming, approche moderne.',
    expectation: 'Résultats compétitifs'
  },
  {
    id: 'rmc-sport',
    name: 'RMC Sport',
    payout: 4_500_000,
    description: 'Chaîne sportive française, expertise locale.',
    expectation: 'Engagement fort'
  },
  {
    id: 'eurosport',
    name: 'Eurosport',
    payout: 3_500_000,
    description: 'Réseau pan-européen, couverture large.',
    expectation: 'Performance correcte'
  },
  {
    id: 'youtube-tv',
    name: 'YouTube TV',
    payout: 5_000_000,
    description: 'Streaming innovant, nouvelle génération.',
    expectation: 'Visibilité digitale importante'
  }
];

export default function App() {
  console.log('[fm-lite] 🔄 App function called (component render)');
  
  const [state, setState] = useState<GameState | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<{ id: number; name: string } | null>(null);
  const [pending, setPending] = useState<{ teams: Record<string, Team>; league: League } | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  
  console.log('[fm-lite] 📊 App render - State values:', {
    hasState: !!state,
    selectedLeague,
    hasPending: !!pending,
    pendingTeamCount: pending?.league.teamIds.length || 0,
    tab
  });
  const [seasonOptions, setSeasonOptions] = useState<{
    sponsors: SponsorContract[];
    tvDeals: TvDeal[];
  }>({ sponsors: [], tvDeals: [] });
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>('');
  const [selectedTvId, setSelectedTvId] = useState<string>('');

  // Saison forcée
  const forcedSeason = 2022;
  const cacheId = selectedLeague ? `league-${selectedLeague.id}-${forcedSeason}` : `league-61-${forcedSeason}`;

  // Garantit un championnat à 20 équipes en complétant si besoin
  const ensureTwentyTeams = (pack: { teams: Record<string, Team>; league: League }): { teams: Record<string, Team>; league: League } => {
    const desired = 20;
    let { teams, league } = pack;
    
    // Filtrer pour garder seulement les équipes valides (pas besoin de vérifier les joueurs, ils seront chargés après)
    const validTeamIds = league.teamIds.filter(id => {
      const team = teams[id];
      return team !== undefined; // Juste vérifier que l'équipe existe
    });
    
    if (validTeamIds.length >= desired) {
      // On a assez d'équipes, prendre les 20 premières
      return { teams, league: { ...league, teamIds: validTeamIds.slice(0, desired) } };
    }
    
    // Utiliser toutes les équipes disponibles (même si moins de 20)
    const missing = desired - validTeamIds.length;
    if (missing > 0) {
      console.log(`[fm-lite] ℹ️ Using ${validTeamIds.length} teams from API (missing ${missing} to reach ${desired})`);
    } else {
      console.log(`[fm-lite] ✅ Using ${validTeamIds.length} teams from API`);
    }
    
    league = { ...league, teamIds: validTeamIds };
    return { teams, league };
  };

  const fetchPendingFromApi = async (leagueId: number, leagueName: string) => {
    console.log('[fm-lite] 🔄 fetchPendingFromApi() called - starting API fetch for', leagueName, `(ID: ${leagueId})...`);
    const apiKey = (import.meta as any).env?.VITE_API_FOOTBALL_KEY as string | undefined;
    const currentCacheId = `league-${leagueId}-${forcedSeason}`;
    
    if (!apiKey || apiKey.trim().length === 0) {
      console.error('[fm-lite] ❌ API key is missing! Cannot fetch players from API.');
      alert('⚠️ Clé API manquante\n\nVeuillez configurer votre clé API dans les variables d\'environnement.');
      setSelectedLeague(null); // Réinitialiser pour permettre une nouvelle sélection
      return;
    }
    
    try {
      console.log('[fm-lite] ✅ API key present, using API-FOOTBALL (forced season)', forcedSeason);
        // 1) Essai principal: endpoint teams
        try {
        console.log('[fm-lite] 🔄 Starting API fetch for league...');
          const { teams, league } = await fetchLeagueFromApiFootball(leagueId, forcedSeason, apiKey);
        console.log('[fm-lite] ✅ API fetch completed, checking teams...');
        
        // Les équipes n'ont pas de joueurs pour le moment (ils seront chargés après le choix)
        // Vérifier seulement qu'on a des équipes valides
        if (league.teamIds.length === 0) {
          console.warn('[fm-lite] ⚠️ API returned 0 teams');
          throw new Error('API returned 0 teams');
        }
        
        // Vérifier si on a des équipes valides
        const validTeams = league.teamIds.filter(id => teams[id] !== undefined);
        if (validTeams.length === 0) {
          console.warn('[fm-lite] ⚠️ No valid teams found');
          throw new Error('No valid teams found');
        }
        
        // Utiliser les équipes valides
        league.teamIds = validTeams;
        
        // Les équipes ont déjà des joueurs générés
        const pendingLeague = { ...league, id: crypto.randomUUID(), name: `${leagueName} (API ${forcedSeason})`, schedule: [] };
        const pendingPack = ensureTwentyTeams({ teams, league: pendingLeague });
        
        console.log('[fm-lite] ✅ Ready from API with generated players - displaying all teams at once', { 
          count: league.teamIds.length, 
          season: forcedSeason
        });
        
        // Mettre à jour l'état avec toutes les équipes
        setPending(pendingPack);
        saveLeagueCache(currentCacheId, pendingPack);
        return;
        } catch (error) {
          console.warn('[fm-lite] ⚠️ Error fetching via teams endpoint:', error);
        }
        
        // 2) Fallback: standings
        try {
          const viaStandings = await fetchLeagueTeamsFromStandings(leagueId, forcedSeason, apiKey);
          
          // Vérifier qu'on a des équipes valides
          if (viaStandings.league.teamIds.length === 0) {
            console.warn('[fm-lite] ⚠️ Standings API returned 0 teams');
            throw new Error('Standings API returned 0 teams');
          }
          
          const validTeams = viaStandings.league.teamIds.filter(id => viaStandings.teams[id] !== undefined);
          if (validTeams.length === 0) {
            console.warn('[fm-lite] ⚠️ No valid teams found in standings');
            throw new Error('No valid teams found in standings');
          }
          
          viaStandings.league.teamIds = validTeams;
          
          // Les équipes ont déjà des joueurs générés
          const pendingLeague = { ...viaStandings.league, id: crypto.randomUUID(), name: `${leagueName} (API ${forcedSeason})`, schedule: [] };
          const pendingPack = ensureTwentyTeams({ teams: viaStandings.teams, league: pendingLeague });
          
          console.log('[fm-lite] ✅ Ready from API via standings with generated players - displaying all teams at once', { 
            count: viaStandings.league.teamIds.length, 
            season: forcedSeason
          });
          
          setPending(pendingPack);
          saveLeagueCache(currentCacheId, pendingPack);
          return;
        } catch (error) {
          console.warn('[fm-lite] ⚠️ Error fetching via standings:', error);
        }
    } catch (e) {
      const errorMessage = (e as Error)?.message || 'Unknown error';
      console.warn('[fm-lite] API-FOOTBALL failed', e);
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        console.error('[fm-lite] ❌ API rate limit exceeded. Please wait a moment and try again later.');
        alert('⚠️ Limite d\'API atteinte\n\nVous avez utilisé toutes vos requêtes API pour aujourd\'hui. Veuillez réessayer demain ou utiliser un autre compte API.');
      } else {
        console.error('[fm-lite] ❌ Failed to fetch teams from API:', errorMessage);
        alert(`⚠️ Erreur API\n\nImpossible de récupérer les équipes depuis l'API.\n\nErreur: ${errorMessage}\n\nVérifiez votre clé API ou réessayez plus tard.`);
      }
      // Réinitialiser pour permettre une nouvelle sélection
      setSelectedLeague(null);
      setPending(null);
    }
  };

  useEffect(() => {
    console.log('[fm-lite] 🚀 App component mounted/updated');
    console.log('[fm-lite] 🔍 Current state:', { 
      hasState: !!state, 
      hasPending: !!pending, 
      selectedLeague: selectedLeague 
    });
    
    const loaded = loadState();
    console.log('[fm-lite] 📦 loadState() result:', loaded ? 'FOUND saved game' : 'NO saved game');
    if (loaded) {
      let upgraded = ensureTeamStats(loaded);
      if (!upgraded.cup) {
        upgraded = {
          ...upgraded,
          cup: createInitialCupState(upgraded.league.teamIds, upgraded.userTeamId)
        };
      }
      upgraded = ensureTeamStats(upgraded);
      console.log('[fm-lite] ✅ Loading saved game state');
      setState(upgraded);
    } else {
      console.log('[fm-lite] ⏳ No saved game, waiting for league selection');
      // Ne rien faire ici - on attendra que l'utilisateur sélectionne une ligue
    }
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const randomizeContracts = useCallback(() => {
    const shuffle = <T,>(arr: T[]): T[] => arr.slice().sort(() => Math.random() - 0.5);
    // Sélectionner entre 4 et 6 sponsors aléatoirement
    const numSponsors = Math.floor(Math.random() * 3) + 4; // 4, 5 ou 6
    const numTvDeals = Math.floor(Math.random() * 3) + 4; // 4, 5 ou 6
    const sponsors = shuffle(SPONSOR_OPTIONS).slice(0, numSponsors);
    const tvDeals = shuffle(TV_OPTIONS).slice(0, numTvDeals);
    setSeasonOptions({ sponsors, tvDeals });
    setSelectedSponsorId(sponsors[0]?.id ?? '');
    setSelectedTvId(tvDeals[0]?.id ?? '');
  }, []);

  const reset = () => {
    clearState();
    setState(null);
    randomizeContracts();
    // Toujours vider le cache pour forcer une nouvelle récupération depuis l'API avec les vrais joueurs de 2022
    clearAllLeagueCache();
    setSelectedLeague(null);
    setPending(null);
    console.log('[fm-lite] 🔄 Reset: Cache cleared, ready to select league...');
  };

  const onLeagueSelect = useCallback(async (leagueId: number, leagueName: string) => {
    console.log('[fm-lite] 📌 League selected:', leagueName, leagueId);
    setSelectedLeague({ id: leagueId, name: leagueName });
    setPending(null); // Réinitialiser pending pour éviter les états intermédiaires
    const currentCacheId = `league-${leagueId}-${forcedSeason}`;
    
    console.log('[fm-lite] 🔍 Checking cache for:', currentCacheId);
    
    try {
      // Vérifier le cache pour cette ligue - TOUJOURS utiliser le cache s'il existe
      const cached = loadLeagueCache(currentCacheId, 1000 * 60 * 60 * 24 * 7); // 7 jours
      console.log('[fm-lite] 🔍 Cache check result:', cached ? 'FOUND' : 'NOT FOUND');
      
      if (cached) {
        const cachedTeamCount = cached.league.teamIds.length;
        console.log('[fm-lite] 🔍 Cached teams count:', cachedTeamCount);
        if (cachedTeamCount >= 20) {
          console.log('[fm-lite] ✅ Using cached league with generated players (saving API calls)', { 
            league: leagueName,
            cachedTeamCount
          });
          const pack = ensureTwentyTeams(cached);
          console.log('[fm-lite] 🔍 Setting pending with pack:', pack);
          setPending(pack);
          return;
        } else {
          // Cache avec moins de 20 équipes - vider et récupérer depuis l'API
          console.log(`[fm-lite] ⚠️ Cache has only ${cachedTeamCount} teams (need 20), clearing and fetching from API...`);
          clearAllLeagueCache();
          console.log('[fm-lite] 🔍 Cache cleared, checking again...');
          const cachedAfterClear = loadLeagueCache(currentCacheId, 1000 * 60 * 60 * 24 * 7);
          console.log('[fm-lite] 🔍 Cache after clear:', cachedAfterClear ? 'STILL EXISTS (BUG!)' : 'CLEARED');
        }
      }
      
      // Récupérer depuis l'API (cache vide ou invalide)
      console.log('[fm-lite] 🔄 No valid cache found, fetching from API...');
      await fetchPendingFromApi(leagueId, leagueName);
    } catch (error) {
      console.error('[fm-lite] ❌ Error in onLeagueSelect:', error);
      setSelectedLeague(null);
      setPending(null);
    }
  }, [forcedSeason]);

  const startWithTeam = useCallback((teamId: string) => {
    console.log('[fm-lite] 🎯 startWithTeam called with teamId:', teamId);
    console.log('[fm-lite] 🔍 Current pending:', pending);
    
    if (!pending) {
      console.error('[fm-lite] ❌ Cannot start game: pending is null');
      alert('Erreur: Aucune ligue sélectionnée. Veuillez sélectionner une ligue d\'abord.');
      return;
    }
    
    const selectedTeam = pending.teams[teamId];
    if (!selectedTeam) {
      console.error('[fm-lite] ❌ Team not found:', teamId, 'Available teams:', Object.keys(pending.teams));
      alert(`Erreur: Équipe non trouvée (ID: ${teamId})`);
      return;
    }
    
    console.log('[fm-lite] ✅ Selected team:', selectedTeam.name);
    console.log('[fm-lite] 🔍 Team has players:', selectedTeam.players?.length || 0);
    
    randomizeContracts();
    
    // Les joueurs sont déjà générés dans les équipes, pas besoin de les charger depuis l'API
    console.log('[fm-lite] 🔄 Creating game from pending teams...');
    try {
      const game = createNewGameFrom(pending.teams, { ...pending.league, schedule: [] }, teamId);
      console.log('[fm-lite] 🔄 Generating schedule...');
      game.league.schedule = generateRoundRobinSchedule(game.league);
      console.log('[fm-lite] ✅ Game created, setting state...');
      console.log('[fm-lite] 🔍 Game state:', {
        userTeamId: game.userTeamId,
        teamCount: Object.keys(game.teams).length,
        scheduleLength: game.league.schedule.length
      });
      
      setState(game);
      setPending(null);
      setTab('dashboard');
      console.log('[fm-lite] ✅ Game started successfully!');
    } catch (error) {
      console.error('[fm-lite] ❌ Error creating game:', error);
      alert(`Erreur lors de la création de la partie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }, [pending, randomizeContracts]);

  const content = useMemo(() => {
    console.log('[fm-lite] 🎨 content useMemo recalculated:', {
      hasState: !!state,
      hasPending: !!pending,
      selectedLeague: selectedLeague
    });
    
    if (!state) {
      if (pending) {
        console.log('[fm-lite] 🎨 Rendering TeamSelect');
        return (
          <TeamSelect 
            teams={pending.teams} 
            league={pending.league} 
            onSelect={startWithTeam}
            onBack={() => {
              console.log('[fm-lite] 🔙 Back button clicked, resetting to league selection');
              setSelectedLeague(null);
              setPending(null);
            }}
          />
        );
      }
      if (!selectedLeague) {
        console.log('[fm-lite] 🎨 Rendering LeagueSelect');
        return <LeagueSelect onSelect={onLeagueSelect} />;
      }
      // Si selectedLeague est défini mais pending pas encore, afficher un message avec possibilité de réessayer
      console.log('[fm-lite] 🎨 Rendering loading message for:', selectedLeague.name);
      return (
        <div style={{ padding: 24 }}>
          <p>Chargement des équipes de {selectedLeague.name}...</p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            Debug: selectedLeague={JSON.stringify(selectedLeague)}, pending={pending ? 'exists' : 'null'}
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                console.log('[fm-lite] 🔄 Force reload from API (ignoring cache)');
                clearAllLeagueCache();
                const leagueId = selectedLeague.id;
                const leagueName = selectedLeague.name;
                setSelectedLeague(null);
                setPending(null);
                // Recharger immédiatement sans vérifier le cache
                setTimeout(() => {
                  fetchPendingFromApi(leagueId, leagueName);
                }, 100);
              }}
              style={{ padding: '8px 16px' }}
            >
              Forcer le rechargement depuis l'API
            </button>
            <button 
              onClick={() => {
                setSelectedLeague(null);
                setPending(null);
              }}
              style={{ padding: '8px 16px' }}
            >
              Annuler et choisir une autre ligue
            </button>
          </div>
        </div>
      );
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
  }, [state, tab, pending, selectedLeague, onLeagueSelect, startWithTeam]);

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

  // Ne plus retourner ici - utiliser content à la place qui gère selectedLeague
  // if (!state && !pending) return <div style={{ padding: 24 }}>Chargement…</div>;

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
