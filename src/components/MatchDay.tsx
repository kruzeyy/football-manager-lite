import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { CupMatch, GameState, Match, Team } from '../game/types';
import { simulateMatch, applyMatchResult, applyCupMatchResult } from '../game/engine';
import { isCupStageUnlocked, prepareCupStage, completeCupStage } from '../game/cup';

interface Props {
  state: GameState;
  setState: (s: GameState) => void;
}

interface MatchResult {
  match: Match | CupMatch;
  homeGoals: number;
  awayGoals: number;
  competition: 'league' | 'cup';
  stageName?: string;
  penalties?: { home: number; away: number };
}

interface LiveMatchContext {
  match: Match | CupMatch;
  homeTeam: Team;
  awayTeam: Team;
  plannedScore: { home: number; away: number };
  regulationScore: { home: number; away: number };
  extraGoals?: { home: number; away: number };
  penaltyPlan?: { home: number; away: number } | null;
  cardPlan: PlannedCard[];
  competition: 'league' | 'cup';
  stageName?: string;
  meta: {
    homeRank: number;
    awayRank: number;
    homeForm: string[];
    awayForm: string[];
  };
}

interface PlayerDot {
  id: string;
  team: 'home' | 'away';
  x: number; // 0-100
  y: number; // 0-100
  anchorX: number;
  anchorY: number;
}

interface BallState {
  x: number;
  y: number;
  ownerId: string | null;
  team: 'home' | 'away';
}

interface PassState {
  team: 'home' | 'away';
  targetId: string;
  originId: string;
  length: number;
  fail: boolean;
  error: { x: number; y: number };
  progress: number;
  start: { x: number; y: number };
}

interface ShotState {
  team: 'home' | 'away';
  progress: number;
  start: { x: number; y: number };
  target: { x: number; y: number };
}

interface LiveEvent {
  id: string;
  minute: number;
  team: 'home' | 'away';
  text: string;
}

interface PlannedCard {
  id: string;
  minute: number;
  team: 'home' | 'away';
  color: 'yellow' | 'red';
  player: string;
}

interface RoamOffset {
  offsetX: number;
  offsetY: number;
  ttl: number;
  strength: number;
}

interface PressContext {
  match: Match;
  opponent: Team;
  reason: string;
}

type PressTone = 'confident' | 'calm' | 'deflect';

function getTeamForm(state: GameState, teamId: string, limit = 5): string[] {
  return state.league.schedule
    .filter(m => m.homeGoals != null && m.awayGoals != null && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    .sort((a, b) => b.round - a.round)
    .slice(0, limit)
    .map(match => {
      const isHome = match.homeTeamId === teamId;
      const goalsFor = isHome ? match.homeGoals! : match.awayGoals!;
      const goalsAgainst = isHome ? match.awayGoals! : match.homeGoals!;
      if (goalsFor > goalsAgainst) return 'V';
      if (goalsFor === goalsAgainst) return 'N';
      return 'D';
    });
}

const MIN_SPEED = 0.3;
const MAX_SPEED = 2;
const NORMAL_SPEED = 0.6;
const SPEED_STORAGE_KEY = 'fm-lite-live-speed';

const baseFormation = [
  { x: 8, y: 50 },
  { x: 25, y: 15 },
  { x: 25, y: 35 },
  { x: 25, y: 65 },
  { x: 25, y: 85 },
  { x: 45, y: 25 },
  { x: 45, y: 50 },
  { x: 45, y: 75 },
  { x: 65, y: 30 },
  { x: 72, y: 50 },
  { x: 65, y: 70 }
];

function offsetX(value: number, team: 'home' | 'away'): number {
  const raw = team === 'home' ? value + 12 : 100 - value - 12;
  return Math.max(8, Math.min(92, raw));
}

function createPlayerDots(homeTeam: Team, awayTeam: Team): PlayerDot[] {
  const homeDots = baseFormation.map((pos, idx) => ({
    id: `${homeTeam.id}-home-${idx}-${crypto.randomUUID()}`,
    team: 'home' as const,
    x: offsetX(pos.x, 'home'),
    y: pos.y,
    anchorX: offsetX(pos.x, 'home'),
    anchorY: pos.y
  }));
  const awayDots = baseFormation.map((pos, idx) => ({
    id: `${awayTeam.id}-away-${idx}-${crypto.randomUUID()}`,
    team: 'away' as const,
    x: offsetX(pos.x, 'away'),
    y: pos.y,
    anchorX: offsetX(pos.x, 'away'),
    anchorY: pos.y
  }));
  return [...homeDots, ...awayDots];
}

function randomPenaltyShootout(): { home: number; away: number } {
  let penHome = 3 + Math.floor(Math.random() * 3);
  let penAway = 3 + Math.floor(Math.random() * 3);
  if (penHome === penAway) {
    if (Math.random() > 0.5) penHome += 1;
    else penAway += 1;
  }
  return { home: penHome, away: penAway };
}

function generateGoalMoments(total: number, range: { start: number; end: number } = { start: 5, end: 80 }): number[] {
  const { start, end } = range;
  const spread = Math.max(1, end - start);
  const moments: number[] = [];
  for (let i = 0; i < total; i++) {
    moments.push(Math.floor(start + Math.random() * spread));
  }
  return moments.sort((a, b) => a - b);
}

function weightedSample(weights: number[]): number {
  const total = weights.reduce((sum, value) => sum + value, 0);
  const roll = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (roll <= acc) return i;
  }
  return weights.length - 1;
}

function sampleCardCount(color: 'yellow' | 'red'): number {
  if (color === 'yellow') {
    const weights = [0.6, 0.26, 0.1, 0.04]; // 0 à 3 jaunes
    return weightedSample(weights);
  }
  const weights = [0.94, 0.05, 0.01]; // 0 à 2 rouges
  return weightedSample(weights);
}

function generateCardMoments(total: number, color: 'yellow' | 'red'): number[] {
  const start = color === 'yellow' ? 8 : 22;
  const end = color === 'yellow' ? 94 : 92;
  const spread = Math.max(1, end - start);
  const moments: number[] = [];
  for (let i = 0; i < total; i++) {
    moments.push(Math.floor(start + Math.random() * spread));
  }
  return moments.sort((a, b) => a - b);
}

function pickCardPlayer(team: Team): string {
  if (!team.players.length) return team.shortName;
  const choice = team.players[Math.floor(Math.random() * team.players.length)];
  return choice?.name ?? team.shortName;
}

function buildCardPlan(team: Team, side: 'home' | 'away'): PlannedCard[] {
  const plan: PlannedCard[] = [];
  const yellowCount = sampleCardCount('yellow');
  const redCount = sampleCardCount('red');
  generateCardMoments(yellowCount, 'yellow').forEach(minute => {
    plan.push({
      id: `${team.id}-y-${minute}-${crypto.randomUUID()}`,
      minute,
      team: side,
      color: 'yellow',
      player: pickCardPlayer(team)
    });
  });
  generateCardMoments(redCount, 'red').forEach(minute => {
    plan.push({
      id: `${team.id}-r-${minute}-${crypto.randomUUID()}`,
      minute,
      team: side,
      color: 'red',
      player: pickCardPlayer(team)
    });
  });
  return plan;
}

function pickScorer(team: Team): string {
  const sorted = team.players.slice().sort((a, b) => b.overall - a.overall);
  const pool = sorted.slice(0, Math.max(3, Math.min(sorted.length, 6)));
  if (pool.length === 0) return team.shortName;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  return choice.name;
}

function LiveMatchModal({
  context,
  onClose,
  onComplete
}: {
  context: LiveMatchContext;
  onClose: () => void;
  onComplete: (result: { home: number; away: number; penalties?: { home: number; away: number }; scorers?: { home: string[]; away: string[] } }) => void;
}) {
  const { homeTeam, awayTeam, plannedScore, meta, competition, stageName, regulationScore, cardPlan = [] } = context;
  const safeMeta = meta ?? { homeRank: 0, awayRank: 0, homeForm: [], awayForm: [] };
  const stageLabel = stageName;
  const regulationTarget = regulationScore ?? plannedScore;
  const extraHomeGoals = Math.max(0, plannedScore.home - regulationTarget.home);
  const extraAwayGoals = Math.max(0, plannedScore.away - regulationTarget.away);
  const needsExtraTime = competition === 'cup' && regulationTarget.home === regulationTarget.away;
  const requiresShootout = competition === 'cup' && plannedScore.home === plannedScore.away;
  const renderForm = (form: string[]) => {
    if (!form.length) return <div style={{ fontSize: 12, color: '#94a3b8' }}>Aucune donnée</div>;
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {form.map((res, idx) => {
          const color = res === 'V' ? '#22c55e' : res === 'N' ? '#fbbf24' : '#f87171';
          return (
            <span
              key={`${res}-${idx}`}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: color,
                color: '#020617',
                fontWeight: 800,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {res}
            </span>
          );
        })}
      </div>
    );
  };
  const describeFormLabel = (form: string[]) => {
    if (!form.length) return 'Forme inconnue';
    const wins = form.filter(res => res === 'V').length;
    const losses = form.filter(res => res === 'D').length;
    if (wins >= 4) return 'Série impressionnante';
    if (wins >= 2 && losses <= 1) return 'Forme positive';
    if (losses >= 3) return 'Forme fragile';
    return 'Forme mitigée';
  };
  const formatFormText = (form: string[]) => (form.length ? form.join(' · ') : '—');
  const clampSpeed = (value: number) => Math.max(MIN_SPEED, Math.min(MAX_SPEED, value));
  const readInitialSpeed = () => {
    if (typeof window === 'undefined') return NORMAL_SPEED;
    const stored = Number(window.localStorage.getItem(SPEED_STORAGE_KEY));
    return Number.isFinite(stored) ? clampSpeed(stored) : NORMAL_SPEED;
  };
  const [phase, setPhase] = useState<'regular' | 'extra' | 'shootout'>('regular');
  const [penalties, setPenalties] = useState<{ home: number; away: number } | null>(null);
  const playerSeeds = useMemo(() => createPlayerDots(homeTeam, awayTeam), [homeTeam.id, awayTeam.id]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const regulationHomeMoments = useMemo(() => generateGoalMoments(regulationTarget.home, { start: 5, end: 80 }), [regulationTarget.home]);
  const regulationAwayMoments = useMemo(() => generateGoalMoments(regulationTarget.away, { start: 5, end: 80 }), [regulationTarget.away]);
  const extraHomeMoments = useMemo(() => generateGoalMoments(extraHomeGoals, { start: 96, end: 118 }), [extraHomeGoals]);
  const extraAwayMoments = useMemo(() => generateGoalMoments(extraAwayGoals, { start: 96, end: 118 }), [extraAwayGoals]);
  const homeGoalMoments = useMemo(() => [...regulationHomeMoments, ...extraHomeMoments], [regulationHomeMoments, extraHomeMoments]);
  const awayGoalMoments = useMemo(() => [...regulationAwayMoments, ...extraAwayMoments], [regulationAwayMoments, extraAwayMoments]);
  const goalPlan = useMemo(() => {
    const homeEntries = homeGoalMoments.map(minute => ({ id: `home-${minute}-${crypto.randomUUID()}`, team: 'home' as const, minute }));
    const awayEntries = awayGoalMoments.map(minute => ({ id: `away-${minute}-${crypto.randomUUID()}`, team: 'away' as const, minute }));
    return [...homeEntries, ...awayEntries].sort((a, b) => a.minute - b.minute);
  }, [homeGoalMoments, awayGoalMoments]);

  const [minute, setMinute] = useState(1);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(readInitialSpeed);
  const [possession, setPossession] = useState({ home: 50, away: 50 });
  const [shots, setShots] = useState({ home: 0, away: 0 });
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [highlightType, setHighlightType] = useState<'goal' | 'shot' | null>(null);

  const playerPositionsRef = useRef<PlayerDot[]>(playerSeeds);
  const firstHome = playerSeeds.find(p => p.team === 'home');
  const initialBall: BallState = {
    x: firstHome?.x ?? 50,
    y: firstHome?.y ?? 50,
    ownerId: firstHome?.id ?? null,
    team: 'home'
  };
  const ballRef = useRef<BallState>(initialBall);
  const penaltyPlanRef = useRef(context.penaltyPlan ?? null);
  const pendingGoalsRef = useRef<{ home: number; away: number }>({ home: plannedScore.home, away: plannedScore.away });
  const goalPlanRef = useRef(goalPlan.map(plan => ({ ...plan, done: false })));
  const cardPlanRef = useRef<Array<PlannedCard & { done: boolean }>>([]);
  const scorersRef = useRef<{ home: string[]; away: string[] }>({ home: [], away: [] });
  const activeGoalRef = useRef<'home' | 'away' | null>(null);
  const goalCooldownRef = useRef(0);
  const minuteRef = useRef(1);
  const speedRef = useRef(1);
  const passRef = useRef<PassState | null>(null);
  const shotRef = useRef<ShotState | null>(null);
  const decisionCooldownRef = useRef(0);
  const lastCarrierRef = useRef<string | null>(null);
  const roamRef = useRef<Record<string, RoamOffset>>({});
  const possessionTicksRef = useRef({ home: 1, away: 1 });
  const possessionAccumulatorRef = useRef(0);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    speedRef.current = speed;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SPEED_STORAGE_KEY, String(speed));
    }
  }, [speed]);

  useEffect(() => {
    playerPositionsRef.current = playerSeeds;
    const firstHome = playerSeeds.find(p => p.team === 'home');
    ballRef.current = {
      x: firstHome?.x ?? 50,
      y: firstHome?.y ?? 50,
      ownerId: firstHome?.id ?? null,
      team: 'home'
    };
    setPhase('regular');
    setPenalties(null);
    penaltyPlanRef.current = context.penaltyPlan ?? null;
    setMinute(1);
    minuteRef.current = 1;
    setHomeScore(0);
    setAwayScore(0);
    setEvents([]);
    setIsFinished(false);
    pendingGoalsRef.current = { home: plannedScore.home, away: plannedScore.away };
    goalPlanRef.current = goalPlan.map(plan => ({ ...plan, done: false }));
    cardPlanRef.current = (cardPlan || []).map(plan => ({ ...plan, done: false }));
    scorersRef.current = { home: [], away: [] };
    activeGoalRef.current = null;
    goalCooldownRef.current = 0;
    passRef.current = null;
    shotRef.current = null;
    decisionCooldownRef.current = 0;
    lastCarrierRef.current = null;
    roamRef.current = {};
    possessionTicksRef.current = { home: 1, away: 1 };
    possessionAccumulatorRef.current = 0;
    setShots({ home: 0, away: 0 });
    setPossession({ home: 50, away: 50 });
    setHighlightVisible(false);
    lastFrameRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [playerSeeds, goalPlan, cardPlan, plannedScore.home, plannedScore.away, context.penaltyPlan]);

  useEffect(() => {
    minuteRef.current = minute;
  }, [minute]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const showHighlight = useCallback((type: 'goal' | 'shot') => {
    setHighlightType(type);
    setHighlightVisible(true);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    const duration = type === 'goal' ? 8000 : 5000; // 8 secondes pour les buts, 5 pour les tirs
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightVisible(false);
      setHighlightType(null);
    }, duration);
  }, []);

  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setMinute(prev => prev + 1);
    }, 600 / Math.max(speedRef.current, 0.15));
    return () => clearInterval(timer);
  }, [isFinished, speed]);

  const handleGoal = useCallback((team: 'home' | 'away') => {
    if (pendingGoalsRef.current[team] <= 0) return;
    pendingGoalsRef.current[team] -= 1;
    const scorer = pickScorer(team === 'home' ? homeTeam : awayTeam);
    const minuteStamp = minuteRef.current;
    // Stocker le buteur dans le ref
    scorersRef.current[team].push(scorer);
    showHighlight('goal');
    setEvents(prev => {
      const next = [
        ...prev,
        {
          id: crypto.randomUUID(),
          minute: minuteStamp,
          team,
          text: `${scorer} marque !`
        }
      ];
      return next.slice(-8);
    });
    if (team === 'home') {
      setHomeScore(s => s + 1);
    } else {
      setAwayScore(s => s + 1);
    }
    const entryIndex = goalPlanRef.current.findIndex(plan => !plan.done && plan.team === team);
    if (entryIndex >= 0) {
      goalPlanRef.current[entryIndex].done = true;
    }
    goalCooldownRef.current = 10;
    activeGoalRef.current = null;
    // Laisser la balle dans le but pendant l'animation, puis la remettre au centre
    setTimeout(() => {
      ballRef.current = {
        x: 50,
        y: 50,
        ownerId: null,
        team: team === 'home' ? 'away' : 'home'
      };
    }, 8000);
  }, [homeTeam, awayTeam, showHighlight]);

  const handleCard = useCallback((entry: PlannedCard) => {
    setEvents(prev => {
      const emoji = entry.color === 'yellow' ? '🟨' : '🟥';
      const cardType = entry.color === 'yellow' ? 'Carton jaune' : 'Carton rouge';
      const next = [
        ...prev,
        {
          id: entry.id,
          minute: entry.minute,
          team: entry.team,
          text: `${emoji} ${cardType} pour ${entry.player}`
        }
      ];
      return next.slice(-8);
    });
  }, []);

  useEffect(() => {
    if (isFinished) return;
    const nextPlan = goalPlanRef.current.find(plan => !plan.done && minute >= plan.minute);
    if (nextPlan) {
      activeGoalRef.current = nextPlan.team;
      handleGoal(nextPlan.team);
    }
  }, [minute, isFinished, handleGoal]);

  useEffect(() => {
    if (isFinished) return;
    const cards = cardPlanRef.current;
    if (!cards || cards.length === 0) return;
    const currentMinute = minute;
    const pendingCards = cards.filter(plan => !plan.done && currentMinute >= plan.minute);
    pendingCards.forEach(card => {
      handleCard(card);
      card.done = true;
    });
  }, [minute, isFinished, handleCard]);

  const advanceSimulation = useCallback((delta: number) => {
    if (isFinished) return;
    const goalTop = 39;
    const goalBottom = 61;
    const players = playerPositionsRef.current.map(p => ({ ...p }));
    const push = activeGoalRef.current;
    const ballSnapshot = ballRef.current;
    const currentPass = passRef.current;
    const currentShot = shotRef.current;
    const passTargetId = currentPass?.targetId ?? null;
    const playerMap = new Map(players.map(p => [p.id, p]));
    const passTargetDot = passTargetId ? playerMap.get(passTargetId) ?? null : null;
    const ownerFromSnapshot = ballSnapshot.ownerId ? playerMap.get(ballSnapshot.ownerId) ?? null : null;
    const possessionTeam = currentShot
      ? currentShot.team
      : currentPass
        ? currentPass.team
        : ownerFromSnapshot
          ? ownerFromSnapshot.team
          : null;
    if (possessionTeam) {
      possessionTicksRef.current[possessionTeam] += delta;
      possessionAccumulatorRef.current += delta;
      if (possessionAccumulatorRef.current >= 1.5) {
        const total = possessionTicksRef.current.home + possessionTicksRef.current.away;
        setPossession({
          home: Math.round((possessionTicksRef.current.home / total) * 100),
          away: Math.round((possessionTicksRef.current.away / total) * 100)
        });
        possessionAccumulatorRef.current = 0;
      }
    }
    const ballFocus = currentShot
      ? currentShot.target
      : passTargetDot
        ? { x: passTargetDot.x, y: passTargetDot.y }
        : { x: ballSnapshot.x, y: ballSnapshot.y };
    const center = { x: 50, y: 50 };

    const ensureRoam = (player: PlayerDot, hasBall: boolean): RoamOffset => {
      const map = roamRef.current;
      let entry = map[player.id];
      const widthGroup = player.anchorX < 35 || player.anchorX > 65 ? 'wide' : 'central';
      const baseIntensity = hasBall ? 12 : 8;
      const widthBonus = widthGroup === 'wide' ? 8 : 3;
      const decay = delta * (hasBall ? 1.1 : 0.8);
      if (!entry || entry.ttl <= 0) {
        const strength = baseIntensity + widthBonus + Math.random() * 3;
        entry = {
          offsetX: (Math.random() - 0.5) * strength,
          offsetY: (Math.random() - 0.5) * strength * 0.7,
          ttl: 2 + Math.random() * 3,
          strength
        };
        map[player.id] = entry;
      } else if (Math.random() < (hasBall ? 0.05 : 0.025)) {
        const strength = baseIntensity + widthBonus + Math.random() * 4;
        entry.offsetX = (Math.random() - 0.5) * strength;
        entry.offsetY = (Math.random() - 0.5) * strength * 0.7;
        entry.ttl = 2 + Math.random() * 3;
        entry.strength = strength;
      } else {
        entry.ttl -= decay;
      }
      return entry;
    };

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    for (const player of players) {
      const isPassTarget = passTargetId === player.id;
      const attacksRight = player.anchorX < 50;
      const hasBall = possessionTeam === player.team;
      const roam = ensureRoam(player, hasBall);
      const fromCenterX = player.anchorX - center.x;
      const fromCenterY = player.anchorY - center.y;
      const radialPushX = fromCenterX * 0.25;
      const radialPushY = fromCenterY * 0.25;
      const widthStretch = hasBall ? (attacksRight ? 10 : -10) : radialPushX * 0.15;
      const desiredAnchorX = clamp(player.anchorX + roam.offsetX + widthStretch + radialPushX, 4, 96);
      const flankPull = player.anchorY < 40 ? -10 : player.anchorY > 60 ? 10 : 0;
      const desiredAnchorY = clamp(player.anchorY + roam.offsetY + flankPull + radialPushY, 6, 94);
      const baseJitter = hasBall ? 1.15 : 0.85;
      const anchorStrength = hasBall ? 0.32 : 0.7;
      const anchorBiasX = (desiredAnchorX - player.x) * anchorStrength * 0.085;
      let roleBiasX = 0;
      if (hasBall) {
        roleBiasX += (ballFocus.x - player.x) * 0.018;
        roleBiasX += attacksRight ? 0.45 : -0.45;
      } else {
        roleBiasX += (ballFocus.x - player.x) * 0.055;
      }
      if (isPassTarget && currentPass) {
        roleBiasX += (currentPass.start.x - player.x) * -0.02;
      }
      if (push === 'home' && player.team === 'home') roleBiasX += 0.8;
      if (push === 'away' && player.team === 'away') roleBiasX -= 0.8;
      let nextX = player.x + ((Math.random() - 0.5) * baseJitter * 2 + anchorBiasX + roleBiasX) * delta;
      if (nextX < 10) nextX += (10 - nextX) * 0.25;
      if (nextX > 90) nextX -= (nextX - 90) * 0.25;

      const anchorBiasY = (desiredAnchorY - player.y) * anchorStrength * 0.085;
      let roleBiasY = 0;
      if (hasBall) {
        roleBiasY += (ballFocus.y - player.y) * 0.018;
      } else {
        roleBiasY += (ballFocus.y - player.y) * 0.055;
      }
      if (isPassTarget && currentPass) {
        roleBiasY += (currentPass.start.y - player.y) * -0.015;
      }
      let nextY = player.y + ((Math.random() - 0.5) * baseJitter * 1.5 + anchorBiasY + roleBiasY) * delta;

      player.x = Math.max(4, Math.min(96, nextX));
      player.y = Math.max(6, Math.min(94, nextY));
    }
    playerPositionsRef.current = players;

    const ball = { ...ballRef.current };
    const updatedPlayers = playerPositionsRef.current;
    const findClosest = (team: 'home' | 'away', refX: number, refY: number) => {
      let best: PlayerDot | null = null;
      let bestDist = Infinity;
      for (const player of updatedPlayers) {
        if (player.team !== team) continue;
        const dx = player.x - refX;
        const dy = player.y - refY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = player;
        }
      }
      return best ?? null;
    };

    let owner = currentPass || currentShot ? null : updatedPlayers.find(p => p.id === ball.ownerId);
    if (!owner && !currentPass && !currentShot) {
      owner = findClosest(ball.team, ball.x, ball.y) ?? updatedPlayers[Math.floor(Math.random() * updatedPlayers.length)];
      if (owner) {
        ball.ownerId = owner.id;
        ball.team = owner.team;
      }
    }

    if (push && !currentPass && !currentShot) {
      const forced = findClosest(push, ball.x, ball.y) ?? owner;
      owner = forced;
      if (forced) {
        ball.ownerId = forced.id;
        ball.team = forced.team;
      }
    }

    const pickPassTarget = (origin: PlayerDot) => {
      const teammates = updatedPlayers.filter(p => p.team === origin.team && p.id !== origin.id);
      if (teammates.length === 0) return null;
      const forwardPref = origin.anchorX < 50 ? 1 : -1;
      const lastCarrier = lastCarrierRef.current;
      const sorted = teammates
        .map(player => {
          const dx = player.x - origin.x;
          const dy = Math.abs(player.y - origin.y);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const forwardScore = forwardPref * dx;
          let score = forwardScore - distance * 0.35 - dy * 0.12;
          if (player.id === lastCarrier) {
            score -= 8; // éviter les passes rapides en aller-retour
          }
          return { player, score };
        })
        .sort((a, b) => b.score - a.score);
      return sorted[0]?.player ?? teammates[0];
    };

    const startPass = (origin: PlayerDot, target: PlayerDot) => {
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const failProb = Math.min(0.45, Math.max(0, (length - 12) * 0.018));
      const errorScale = Math.min(14, 0.12 * length + 3);
      const errorVector = {
        x: (Math.random() - 0.5) * errorScale,
        y: (Math.random() - 0.5) * errorScale * 0.6
      };
      const fail = Math.random() < failProb;
      passRef.current = {
        team: origin.team,
        originId: origin.id,
        targetId: target.id,
        length,
        fail,
        error: errorVector,
        progress: 0,
        start: { x: origin.x, y: origin.y }
      };
      // mémoriser l'actuel porteur pour éviter la remise instantanée
      lastCarrierRef.current = origin.id;
      ball.ownerId = null;
    };

    const startShot = (origin: PlayerDot) => {
      const attacksRight = origin.anchorX < 50;
      const goalX = attacksRight ? 99.2 : 0.8;
      const goalY = 44 + Math.random() * 12;
      setShots(prev => ({
        home: origin.team === 'home' ? prev.home + 1 : prev.home,
        away: origin.team === 'away' ? prev.away + 1 : prev.away
      }));
      showHighlight('shot');
      shotRef.current = {
        team: origin.team,
        progress: 0,
        start: { x: origin.x, y: origin.y },
        target: { x: goalX, y: goalY }
      };
      ball.ownerId = null;
    };

    const shouldDribble = (carrier: PlayerDot) => {
      const attacksRight = carrier.anchorX < 50;
      const canShootSoon = attacksRight ? carrier.x > 70 : carrier.x < 30;
      if (carrier.x < 15 || carrier.x > 85) return true;
      if (canShootSoon && Math.random() < 0.4) return true;
      const teammates = updatedPlayers.filter(p => p.team === carrier.team && p.id !== carrier.id);
      if (teammates.length === 0) return true;
      const bestScore = Math.max(
        ...teammates.map(p => {
          const dx = p.x - carrier.x;
          const dy = Math.abs(p.y - carrier.y);
          return (attacksRight ? dx : -dx) - Math.hypot(dx, dy) * 0.4;
        })
      );
      return bestScore < 5; // si aucun coéquipier intéressant
    };

    if (!currentPass && !currentShot && owner) {
      decisionCooldownRef.current -= delta * 0.6;
      if (decisionCooldownRef.current <= 0) {
        const attacksRight = owner.anchorX < 50;
        const canShoot = attacksRight ? owner.x > 78 : owner.x < 22;
        const shouldShoot = canShoot && Math.random() < 0.6;
        if (shouldShoot) {
          startShot(owner);
        } else {
          const target = pickPassTarget(owner);
          if (target && !shouldDribble(owner)) {
            startPass(owner, target);
          } else {
            const pushDir = attacksRight ? 1 : -1;
            owner.x = clamp(owner.x + (2.5 + Math.random()) * pushDir, 6, 94);
            owner.y = clamp(owner.y + (Math.random() - 0.5) * 4, 8, 92);
            ball.ownerId = owner.id;
            ball.team = owner.team;
          }
        }
        decisionCooldownRef.current = 2 + Math.random() * 1.5;
      }
    }

    if (passRef.current) {
      const pass = passRef.current;
      const origin = updatedPlayers.find(p => p.id === pass.originId);
      if (origin) {
        pass.start = { x: origin.x, y: origin.y };
      }
      const targetPlayer = updatedPlayers.find(p => p.id === pass.targetId);
      const baseTarget = targetPlayer ? { x: targetPlayer.x, y: targetPlayer.y } : pass.start;
      pass.progress += delta * 0.45;
      const t = Math.min(1, pass.progress);
      const noisyTarget = {
        x: baseTarget.x + pass.error.x * t,
        y: baseTarget.y + pass.error.y * t
      };
      ball.x = pass.start.x + (noisyTarget.x - pass.start.x) * t;
      ball.y = pass.start.y + (noisyTarget.y - pass.start.y) * t;
      const arrivalDist = targetPlayer ? Math.hypot((baseTarget.x + pass.error.x) - ball.x, (baseTarget.y + pass.error.y) - ball.y) : 0;
      if (t >= 1 || (targetPlayer && arrivalDist < 1.2 && !pass.fail)) {
        passRef.current = null;
        if (targetPlayer && !pass.fail) {
          ball.ownerId = targetPlayer.id;
          ball.team = targetPlayer.team;
          owner = targetPlayer;
        } else {
          const landing = {
            x: baseTarget.x + pass.error.x,
            y: baseTarget.y + pass.error.y
          };
          ball.x = clamp(landing.x, 5, 95);
          ball.y = clamp(landing.y, 6, 94);
          ball.ownerId = null;
        }
        if (targetPlayer && !pass.fail) {
          lastCarrierRef.current = pass.originId;
        }
        decisionCooldownRef.current = 0.8;
      }
    } else if (shotRef.current) {
      const shot = shotRef.current;
      shot.progress += delta * 0.55;
      const t = Math.min(1, shot.progress);
      ball.x = shot.start.x + (shot.target.x - shot.start.x) * t;
      ball.y = shot.start.y + (shot.target.y - shot.start.y) * t;
      if (t >= 1) {
        shotRef.current = null;
      }
    } else if (owner) {
      const targetX = owner.x;
      const targetY = owner.y;
      ball.x += (targetX - ball.x) * 0.18 * delta;
      ball.y += (targetY - ball.y) * 0.18 * delta;
    }

    if (push) {
      const pushTeamSample = updatedPlayers.find(p => p.team === push);
      const pushAttacksRight = (pushTeamSample?.anchorX ?? (push === 'home' ? 30 : 70)) < 50;
      if (pushAttacksRight) {
        ball.x += Math.min(2, (100 - ball.x)) * 0.3 * delta;
      } else {
        ball.x -= Math.min(2, ball.x) * 0.3 * delta;
      }
      ball.y += (50 - ball.y) * 0.04 * delta;
    }
    ball.x = Math.max(0.4, Math.min(99.6, ball.x));
    ball.y = Math.max(6, Math.min(94, ball.y));

    const possessionTeamCurrent = passRef.current?.team ?? shotRef.current?.team ?? owner?.team ?? ball.team;
    const defenders = updatedPlayers.filter(p => p.team !== possessionTeamCurrent);
    let closest = null as PlayerDot | null;
    let bestDist = Infinity;
    defenders.forEach(player => {
      const dx = player.x - ball.x;
      const dy = player.y - ball.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        closest = player;
      }
    });
    if (closest && bestDist < 200) {
      const stealProb = Math.max(0.04, 0.45 - bestDist * 0.002);
      if (Math.random() < stealProb * delta) {
        passRef.current = null;
        shotRef.current = null;
        ball.ownerId = closest.id;
        ball.team = closest.team;
        owner = closest;
        decisionCooldownRef.current = 1.2;
      }
    }

    if (goalCooldownRef.current > 0) {
      goalCooldownRef.current -= 1 * delta;
    } else if (ball.x <= 1 && ball.y >= goalTop && ball.y <= goalBottom && pendingGoalsRef.current.away > 0) {
      handleGoal('away');
    } else if (ball.x >= 99 && ball.y >= goalTop && ball.y <= goalBottom && pendingGoalsRef.current.home > 0) {
      handleGoal('home');
    }
    ballRef.current = ball;
  }, [handleGoal, isFinished, showHighlight, highlightVisible, highlightType]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 900;
    const displayHeight = canvas.clientHeight || 500;
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    const gradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
    gradient.addColorStop(0, '#0f3a2f');
    gradient.addColorStop(1, '#071425');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, displayWidth - 24, displayHeight - 24);
    ctx.beginPath();
    ctx.moveTo(displayWidth / 2, 12);
    ctx.lineTo(displayWidth / 2, displayHeight - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(displayWidth / 2, displayHeight / 2, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, displayHeight / 2 - 30, 12, 60);
    ctx.fillRect(displayWidth - 12, displayHeight / 2 - 30, 12, 60);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, displayHeight / 2 - 32, 10, 64);
    ctx.strokeRect(displayWidth - 12, displayHeight / 2 - 32, 10, 64);
    const players = playerPositionsRef.current;
    const ball = ballRef.current;
    for (const player of players) {
      const x = (player.x / 100) * displayWidth;
      const y = (player.y / 100) * displayHeight;
      const owned = player.id === ball.ownerId;
      ctx.beginPath();
      ctx.arc(x, y, owned ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = player.team === 'home' ? '#34d399' : '#f87171';
      ctx.fill();
      if (owned) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    ctx.beginPath();
    ctx.arc((ball.x / 100) * displayWidth, (ball.y / 100) * displayHeight, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f3f4f6';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  useEffect(() => {
    if (isFinished) return;
    const loop = (timestamp: number) => {
      if (isFinished) return;
      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
      }
      const delta = Math.min(1.2, (timestamp - lastFrameRef.current) / 16.67) * speedRef.current;
      lastFrameRef.current = timestamp;
      advanceSimulation(delta);
      if (highlightVisible) {
        drawFrame();
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [advanceSimulation, drawFrame, isFinished, highlightVisible]);

  useEffect(() => {
    if (isFinished) return;
    const noGoalsPending = pendingGoalsRef.current.home === 0 && pendingGoalsRef.current.away === 0;
    const finalThreshold = needsExtraTime ? 121 : 95;
    const hardCap = needsExtraTime ? 124 : 98;
    if (needsExtraTime && phase === 'regular' && minute >= 96) {
      setPhase('extra');
    }
    if ((minute >= finalThreshold && noGoalsPending) || minute >= hardCap) {
      if (requiresShootout) {
        if (!penalties) {
          const template = penaltyPlanRef.current ?? randomPenaltyShootout();
          setPenalties(template);
        }
        setPhase('shootout');
      }
      setIsFinished(true);
    }
  }, [minute, isFinished, needsExtraTime, phase, requiresShootout, penalties]);

  const fastForward = () => {
    if (isFinished) return;
    pendingGoalsRef.current = { home: 0, away: 0 };
    goalPlanRef.current.forEach(plan => (plan.done = true));
    cardPlanRef.current.forEach(plan => (plan.done = true));
    activeGoalRef.current = null;
    goalCooldownRef.current = 0;
    setHomeScore(plannedScore.home);
    setAwayScore(plannedScore.away);
    setShots(prev => ({
      home: Math.max(prev.home, plannedScore.home),
      away: Math.max(prev.away, plannedScore.away)
    }));
    const generated: LiveEvent[] = [];
    scorersRef.current = { home: [], away: [] };
    homeGoalMoments.forEach(minuteStamp => {
      const scorer = pickScorer(homeTeam);
      scorersRef.current.home.push(scorer);
      generated.push({
        id: crypto.randomUUID(),
        minute: minuteStamp,
        team: 'home',
        text: `${scorer} marque !`
      });
    });
    awayGoalMoments.forEach(minuteStamp => {
      const scorer = pickScorer(awayTeam);
      scorersRef.current.away.push(scorer);
      generated.push({
        id: crypto.randomUUID(),
        minute: minuteStamp,
        team: 'away',
        text: `${scorer} marque !`
      });
    });
    cardPlanRef.current.forEach(plan => {
      const emoji = plan.color === 'yellow' ? '🟨' : '🟥';
      const cardType = plan.color === 'yellow' ? 'Carton jaune' : 'Carton rouge';
      generated.push({
        id: plan.id,
        minute: plan.minute,
        team: plan.team,
        text: `${emoji} ${cardType} pour ${plan.player}`
      });
    });
    generated.sort((a, b) => a.minute - b.minute);
    setEvents(generated.slice(-8));
    const finalMinute = needsExtraTime ? 122 : 96;
    setMinute(finalMinute);
    minuteRef.current = finalMinute;
    if (requiresShootout) {
      const template = penalties ?? penaltyPlanRef.current ?? randomPenaltyShootout();
      penaltyPlanRef.current = template;
      setPenalties(template);
      setPhase('shootout');
    } else if (needsExtraTime) {
      setPhase('extra');
    } else {
      setPhase('regular');
    }
    setIsFinished(true);
    drawFrame();
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: 16
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(960px, 95vw)',
          maxHeight: '95vh',
          overflow: 'hidden',
          padding: 24,
          border: '2px solid var(--border)',
          position: 'relative'
        }}
      >
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          <button
            onClick={() => setSettingsOpen(open => !open)}
            style={{
              background: settingsOpen ? 'rgba(59,130,246,0.2)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg)',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 16
            }}
            title="Paramètres"
          >
            ⚙
          </button>
          <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--fg)',
            padding: '4px 10px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
        </div>
        {settingsOpen && (
          <div
            style={{
              position: 'absolute',
              top: 56,
              right: 24,
              width: 220,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(4, 12, 24, 0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              zIndex: 5
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Paramètres</div>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, color: 'var(--muted)', gap: 4 }}>
              <span>
                Vitesse de jeu — {speed.toFixed(1)}x {Math.abs(speed - NORMAL_SPEED) < 0.05 ? '(normal)' : ''}
              </span>
              <input
                type="range"
                min={MIN_SPEED}
                max={MAX_SPEED}
                step="0.1"
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span>{MIN_SPEED.toFixed(1)}x</span>
                <button
                  type="button"
                  onClick={() => setSpeed(NORMAL_SPEED)}
                  style={{
                    border: '1px solid var(--border)',
                    background: Math.abs(speed - NORMAL_SPEED) < 0.05 ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: 'var(--fg)',
                    padding: '2px 8px',
                    borderRadius: 999
                  }}
                >
                  Vitesse normale
                </button>
                <span>{MAX_SPEED.toFixed(1)}x</span>
              </div>
            </label>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{homeTeam.shortName}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{homeScore}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Temps</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{minute}&apos;</div>
            {context.competition === 'cup' && context.stageName ? (
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>{context.stageName}</div>
            ) : null}
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{awayTeam.shortName}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{awayScore}</div>
          </div>
        </div>
        {(((needsExtraTime && phase !== 'regular')) || penalties) && (
          <div style={{ textAlign: 'center', marginBottom: penalties ? 8 : 12 }}>
            {needsExtraTime && phase !== 'regular' && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fde68a' }}>
                {phase === 'extra' ? 'Prolongations' : 'Tirs au but'}
              </div>
            )}
            {penalties && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>
                Tirs au but : {penalties.home} - {penalties.away}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
              <span>Classement</span>
              <span>Points</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{homeTeam.shortName}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {safeMeta.homeRank > 0 ? `${safeMeta.homeRank}ᵉ` : '—'} · {homeTeam.points ?? 0}
              </div>
            </div>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Forme</div>
            {renderForm(safeMeta.homeForm)}
          </div>
          <div style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
              <span>Classement</span>
              <span>Points</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'right', width: '100%' }}>{awayTeam.shortName}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {safeMeta.awayRank > 0 ? `${safeMeta.awayRank}ᵉ` : '—'} · {awayTeam.points ?? 0}
              </div>
            </div>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Forme</div>
            {renderForm(safeMeta.awayForm)}
          </div>
        </div>
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '56%',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            background: '#021018',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: highlightVisible ? 0 : 24
          }}
        >
          {highlightVisible ? (
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block'
              }}
            />
          ) : (
            <div style={{ width: '100%', color: 'var(--muted)' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Possession</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>{possession.home}%</div>
                      <div style={{ fontSize: 12 }}>{homeTeam.shortName}</div>
                    </div>
                    <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${possession.home}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #22c55e, #0ea5e9)'
                        }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>{possession.away}%</div>
                      <div style={{ fontSize: 12 }}>{awayTeam.shortName}</div>
                    </div>
                  </div>
                </div>
                {stageLabel ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 6 }}>
                    {stageLabel}
                  </div>
                ) : null}
                <div style={{ display: 'flex', flex: 1, minWidth: 160, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tirs</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{shots.home} - {shots.away}</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Temps fort</div>
                    <div style={{ fontSize: 14 }}>En attente d&apos;un moment clé...</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Contexte du match</div>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                    <strong>{homeTeam.shortName}</strong> : {describeFormLabel(safeMeta.homeForm)} ({formatFormText(safeMeta.homeForm)})
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                    <strong>{awayTeam.shortName}</strong> : {describeFormLabel(safeMeta.awayForm)} ({formatFormText(safeMeta.awayForm)})
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Analyse basée sur les 5 derniers matches officiels.</div>
                </div>
                <div style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Projection IA</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                    {typeof plannedScore.home === 'number' ? plannedScore.home.toFixed(1) : plannedScore.home} - {typeof plannedScore.away === 'number' ? plannedScore.away.toFixed(1) : plannedScore.away}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {safeMeta.homeRank && safeMeta.awayRank
                      ? safeMeta.homeRank < safeMeta.awayRank
                        ? `${homeTeam.shortName} part favori`
                        : safeMeta.homeRank === safeMeta.awayRank
                          ? 'Duel annoncé équilibré'
                          : `${awayTeam.shortName} semble favori`
                      : 'Projection basée sur la note globale des effectifs.'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 600 }}>Le match se joue, affichage automatique lors des buts ou occasions.</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Moments forts</div>
          <div
            style={{
              maxHeight: 140,
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              background: 'rgba(15,23,42,0.6)'
            }}
          >
            {events.length === 0 ? (
              <div className="muted">Le match est en cours...</div>
            ) : (
              events
                .slice()
                .reverse()
                .map(event => (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      justifyContent: event.team === 'home' ? 'flex-start' : 'flex-end',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      color: event.team === 'home' ? '#34d399' : '#f87171'
                    }}
                  >
                    {event.team === 'home' ? (
                      <>
                        <span style={{ fontWeight: 600 }}>{event.minute}&apos;</span>
                        <span>{event.text}</span>
                      </>
                    ) : (
                      <>
                        <span>{event.text}</span>
                        <span style={{ fontWeight: 600 }}>{event.minute}&apos;</span>
                      </>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
          {!isFinished ? (
            <>
              <button
                onClick={fastForward}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Passer l&apos;animation
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(244,63,94,0.5)',
                  background: 'rgba(244,63,94,0.15)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Quitter
              </button>
            </>
          ) : (
            <button
              onClick={() => onComplete({ home: homeScore, away: awayScore, penalties: penalties ?? undefined, scorers: scorersRef.current })}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                color: '#04130a',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer'
              }}
            >
              Valider le résultat
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
          <h2 style={{ margin: 0 }}>Résultats</h2>
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
          {results.map(({ match, homeGoals, awayGoals, competition, stageName, penalties }) => {
            const homeTeam = teams[match.homeTeamId];
            const awayTeam = teams[match.awayTeamId];
            const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;
            const homeScorers = match.homeScorers || [];
            const awayScorers = match.awayScorers || [];
            const homeYellowCards = match.homeYellowCards || [];
            const awayYellowCards = match.awayYellowCards || [];
            const homeRedCards = match.homeRedCards || [];
            const awayRedCards = match.awayRedCards || [];
            const isCup = competition === 'cup';
            const stageLabel = isCup
              ? stageName
              : 'round' in match && match.round ? `Journée ${match.round}` : undefined;

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: (homeScorers.length > 0 || awayScorers.length > 0 || (isCup && penalties)) ? 12 : 0 }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80, justifyContent: 'center', position: 'relative' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, minWidth: 25, textAlign: 'center' }}>
                      {homeGoals}
                    </div>
                    <div style={{ color: 'var(--muted)', fontWeight: 700 }}>—</div>
                    <div style={{ fontWeight: 800, fontSize: 18, minWidth: 25, textAlign: 'center' }}>
                      {awayGoals}
                    </div>
                    {isCup && penalties ? (
                      <div style={{ position: 'absolute', bottom: -16, fontSize: 11, color: 'var(--muted)', width: '100%', textAlign: 'center' }}>
                        TAB {penalties.home} - {penalties.away}
                      </div>
                    ) : null}
                  </div>

                  {stageLabel ? (
                    <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginBottom: 6 }}>
                      {stageLabel}
                    </div>
                  ) : null}

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
                
                {/* Buteurs et cartons */}
                {(homeScorers.length > 0 || awayScorers.length > 0 || homeYellowCards.length > 0 || awayYellowCards.length > 0 || homeRedCards.length > 0 || awayRedCards.length > 0) && (
                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    {(homeScorers.length > 0 || awayScorers.length > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
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
                    {(homeYellowCards.length > 0 || awayYellowCards.length > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: '#fde047', marginBottom: 4 }}>
                        <div style={{ flex: 1 }}>
                          {homeYellowCards.length > 0 && (
                            <div>
                              <span style={{ fontWeight: 600 }}>🟨</span> {homeYellowCards.join(', ')}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          {awayYellowCards.length > 0 && (
                            <div>
                              <span style={{ fontWeight: 600 }}>🟨</span> {awayYellowCards.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {(homeRedCards.length > 0 || awayRedCards.length > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: '#ef4444' }}>
                        <div style={{ flex: 1 }}>
                          {homeRedCards.length > 0 && (
                            <div>
                              <span style={{ fontWeight: 600 }}>🟥</span> {homeRedCards.join(', ')}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          {awayRedCards.length > 0 && (
                            <div>
                              <span style={{ fontWeight: 600 }}>🟥</span> {awayRedCards.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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

function PressConferenceModal({
  opponent,
  reason,
  onAnswer,
  onSkip
}: {
  opponent: Team;
  reason: string;
  onAnswer: (tone: PressTone) => void;
  onSkip: () => void;
}) {
  const choices: { tone: PressTone; title: string; text: string }[] = [
    { tone: 'confident', title: 'Promettre une victoire', text: '“On va les étouffer dès la première minute.”' },
    { tone: 'calm', title: 'Rester mesuré', text: '“On respecte l’adversaire, on joue notre jeu.”' },
    { tone: 'deflect', title: 'Esquiver la pression', text: '“Laissons le terrain parler.”' }
  ];
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1500,
        padding: 16
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(720px, 95vw)',
          borderRadius: 18,
          border: '2px solid rgba(59,130,246,0.4)',
          padding: 0,
          overflow: 'hidden',
          background: '#0b1222'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(59,130,246,0.25), rgba(37,99,235,0.5))',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#cbd5f5' }}>Conférence de presse</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e0e7ff' }}>Enjeux avant {opponent.shortName}</div>
          </div>
          <button
            onClick={onSkip}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 999,
              padding: '6px 16px',
              color: '#e0e7ff',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Passer
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: 260
          }}
        >
          <div
            style={{
              background: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), rgba(15,23,42,0.9))',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ fontSize: 13, color: '#94a3b8', letterSpacing: .5 }}>Question principale</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
              {reason}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Journalistes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Canal Foot', 'L’Équipe', 'EuroSport'].map(name => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9ca3af' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                    {name.slice(0, 1)}
                  </div>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 24, background: 'rgba(15,23,42,0.9)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {choices.map(choice => (
              <button
                key={choice.tone}
                onClick={() => onAnswer(choice.tone)}
                style={{
                  textAlign: 'left',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid rgba(59,130,246,0.4)',
                  background: 'rgba(30,64,175,0.15)',
                  color: '#cbd5f5',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 15 }}>{choice.title}</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>{choice.text}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchDay({ state, setState }: Props) {
  const { league, teams, currentRound, userTeamId, cup } = state;
  const totalRounds = Math.max(...league.schedule.map(m => m.round), 38);
  const roundMatches = league.schedule.filter(m => m.round === currentRound);
  const activeCupStage = cup.stages[cup.currentStageIndex] ?? null;
  const cupActive = Boolean(activeCupStage && isCupStageUnlocked(state) && !activeCupStage.completed);
  const activeMatches: Array<Match | CupMatch> = cupActive && activeCupStage ? activeCupStage.matches : roundMatches;
  const unplayedMatches = activeMatches.filter(m => m.homeGoals == null && m.awayGoals == null);
  const playedMatches = activeMatches.filter(m => m.homeGoals != null && m.awayGoals != null);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [liveMatch, setLiveMatch] = useState<LiveMatchContext | null>(null);
  const [pendingAutoResults, setPendingAutoResults] = useState<MatchResult[]>([]);
  const [pressHistory, setPressHistory] = useState<Record<string, boolean>>({});
  const [pressContext, setPressContext] = useState<PressContext | null>(null);
  const [pressNote, setPressNote] = useState<string | null>(null);
  useEffect(() => {
    setPressNote(null);
  }, [currentRound]);

  useEffect(() => {
    if (isCupStageUnlocked(state)) {
      const stage = state.cup.stages[state.cup.currentStageIndex];
      if (stage && stage.matches.length === 0) {
        const prepared = prepareCupStage(state, state.cup.currentStageIndex);
        if (prepared !== state) {
          setState(prepared);
        }
      }
    }
  }, [state, setState]);

  const rankMap = useMemo(() => {
    const sorted = Object.values(teams).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
    const map: Record<string, number> = {};
    sorted.forEach((team, idx) => { map[team.id] = idx + 1; });
    return map;
  }, [teams]);

  const simulateLeagueMatches = (sourceState: GameState, skipMatchId?: string) => {
    const newState: GameState = JSON.parse(JSON.stringify(sourceState));
    const newResults: MatchResult[] = [];
    for (const match of newState.league.schedule.filter(m => m.round === newState.currentRound)) {
      if (match.homeGoals != null && match.awayGoals != null) continue;
      if (skipMatchId && match.id === skipMatchId) continue;
      const { home, away } = simulateMatch(newState, match);
      match.homeGoals = home;
      match.awayGoals = away;
      match.playedAt = new Date().toISOString();
      applyMatchResult(newState, match, home, away);
      newResults.push({ match, homeGoals: home, awayGoals: away, competition: 'league' });
    }
    return { newState, newResults };
  };

  const simulateCupMatches = (sourceState: GameState, stageIndex: number, skipMatchId?: string) => {
    const newState: GameState = JSON.parse(JSON.stringify(sourceState));
    const stage = newState.cup.stages[stageIndex];
    const newResults: MatchResult[] = [];
    if (!stage) return { newState, newResults };
    for (const match of stage.matches) {
      if (match.homeGoals != null && match.awayGoals != null) continue;
      if (skipMatchId && match.id === skipMatchId) continue;
      const { home, away } = simulateMatch(newState, match as unknown as Match);
      match.homeGoals = home;
      match.awayGoals = away;
      match.playedAt = new Date().toISOString();
      match.decidedBy = 'REGULATION';
      match.penalties = undefined;
      if (home === away) {
        match.decidedBy = 'PENALTIES';
        match.penalties = randomPenaltyShootout();
      }
      applyCupMatchResult(newState, match, home, away);
      newResults.push({
        match,
        homeGoals: home,
        awayGoals: away,
        competition: 'cup',
        stageName: stage.name,
        penalties: match.penalties
      });
    }
    return { newState, newResults };
  };

  const startLiveMatch = (match: Match | CupMatch, options?: { competition?: 'league' | 'cup'; stageName?: string }) => {
    if (liveMatch) return;
    const homeTeam = teams[match.homeTeamId];
    const awayTeam = teams[match.awayTeamId];
    if (!homeTeam || !awayTeam) return;
    const regulationScore = simulateMatch(state, match as Match);
    let finalScore = { ...regulationScore };
    let extraGoals: { home: number; away: number } | undefined;
    let penaltyPlan: { home: number; away: number } | null = null;
    const matchCompetition = options?.competition ?? 'league';
    if (matchCompetition === 'cup' && regulationScore.home === regulationScore.away) {
      const extraHome = Math.random() < 0.55 ? Math.round(Math.random()) : 0;
      const extraAway = Math.random() < 0.55 ? Math.round(Math.random()) : 0;
      extraGoals = { home: extraHome, away: extraAway };
      finalScore = {
        home: regulationScore.home + extraHome,
        away: regulationScore.away + extraAway
      };
      if (finalScore.home === finalScore.away) {
        penaltyPlan = randomPenaltyShootout();
      }
    }
    const homeRank = rankMap[homeTeam.id] ?? 0;
    const awayRank = rankMap[awayTeam.id] ?? 0;
    const homeForm = getTeamForm(state, homeTeam.id);
    const awayForm = getTeamForm(state, awayTeam.id);
    const cardPlan = [...buildCardPlan(homeTeam, 'home'), ...buildCardPlan(awayTeam, 'away')].sort((a, b) => a.minute - b.minute);
    setLiveMatch({
      match,
      homeTeam,
      awayTeam,
      plannedScore: finalScore,
      regulationScore,
      extraGoals,
      penaltyPlan,
      cardPlan,
      competition: matchCompetition,
      stageName: options?.stageName,
      meta: {
        homeRank,
        awayRank,
        homeForm,
        awayForm
      }
    });
  };

  const completeLiveMatch = (score: { home: number; away: number; penalties?: { home: number; away: number }; scorers?: { home: string[]; away: string[] } }) => {
    if (!liveMatch) return;
    const { match, competition, stageName, cardPlan } = liveMatch;
    const newState: GameState = JSON.parse(JSON.stringify(state));
    
    // Extraire les cartons du cardPlan pour les stocker dans le match
    const homeYellowCards: string[] = [];
    const awayYellowCards: string[] = [];
    const homeRedCards: string[] = [];
    const awayRedCards: string[] = [];
    
    if (cardPlan && cardPlan.length > 0) {
      cardPlan.forEach(card => {
        if (card.color === 'yellow') {
          if (card.team === 'home') {
            homeYellowCards.push(card.player);
          } else {
            awayYellowCards.push(card.player);
          }
        } else {
          if (card.team === 'home') {
            homeRedCards.push(card.player);
          } else {
            awayRedCards.push(card.player);
          }
        }
      });
    }
    
    // Utiliser les buteurs passés ou générer des valeurs par défaut
    const homeScorers = score.scorers?.home || [];
    const awayScorers = score.scorers?.away || [];
    
    if (competition === 'league') {
      const target = newState.league.schedule.find(m => m.id === match.id);
      if (!target) return;
      target.homeGoals = score.home;
      target.awayGoals = score.away;
      target.playedAt = new Date().toISOString();
      applyMatchResult(newState, target, score.home, score.away);
      // Remplacer les buteurs et cartons générés par ceux du match en direct
      target.homeScorers = homeScorers;
      target.awayScorers = awayScorers;
      target.homeYellowCards = homeYellowCards;
      target.awayYellowCards = awayYellowCards;
      target.homeRedCards = homeRedCards;
      target.awayRedCards = awayRedCards;
      newState.currentRound += 1;
      setState(newState);
      setLiveMatch(null);
      const latestResult: MatchResult = { match: target, homeGoals: score.home, awayGoals: score.away, competition: 'league' };
      const combinedResults = [...pendingAutoResults, latestResult];
      setPendingAutoResults([]);
      setResults(combinedResults);
    } else {
      const stage = newState.cup.stages[newState.cup.currentStageIndex];
      if (!stage) return;
      const target = stage.matches.find(m => m.id === match.id);
      if (!target) return;
      target.homeGoals = score.home;
      target.awayGoals = score.away;
      target.playedAt = new Date().toISOString();
      target.decidedBy = 'REGULATION';
      target.penalties = undefined;
      if (score.penalties) {
        target.decidedBy = 'PENALTIES';
        target.penalties = score.penalties;
      } else if (score.home === score.away) {
        target.decidedBy = 'PENALTIES';
        target.penalties = randomPenaltyShootout();
      } else {
        target.decidedBy = 'REGULATION';
        target.penalties = undefined;
      }
      applyCupMatchResult(newState, target, score.home, score.away);
      // Remplacer les buteurs et cartons générés par ceux du match en direct
      target.homeScorers = homeScorers;
      target.awayScorers = awayScorers;
      target.homeYellowCards = homeYellowCards;
      target.awayYellowCards = awayYellowCards;
      target.homeRedCards = homeRedCards;
      target.awayRedCards = awayRedCards;
      let updatedState = newState;
      const stageCompleted = stage.matches.every(m => m.homeGoals != null && m.awayGoals != null);
      if (stageCompleted) {
        updatedState = completeCupStage(updatedState, updatedState.cup.currentStageIndex);
      }
      setState(updatedState);
      setLiveMatch(null);
      const cupResult: MatchResult = {
        match: target,
        homeGoals: score.home,
        awayGoals: score.away,
        competition: 'cup',
        stageName,
        penalties: target.penalties
      };
      const combinedResults = [...pendingAutoResults, cupResult];
      setPendingAutoResults([]);
      setResults(combinedResults);
    }
  };
  const pressMessages: Record<PressTone, string> = {
    confident: 'Vous avez promis une victoire, le vestiaire est en feu !',
    calm: 'Vous avez apaisé les esprits avant ce choc important.',
    deflect: 'Vous avez détourné la pression, vos joueurs restent concentrés.'
  };

  const completePressConference = (tone: PressTone) => {
    if (!pressContext) return;
    setPressHistory(prev => ({ ...prev, [pressContext.match.id]: true }));
    setPressNote(pressMessages[tone]);
    const matchToPlay = pressContext.match;
    setPressContext(null);
    startLiveMatch(matchToPlay);
  };

  const skipPressConference = () => {
    if (!pressContext) return;
    setPressHistory(prev => ({ ...prev, [pressContext.match.id]: true }));
    const matchToPlay = pressContext.match;
    setPressContext(null);
    startLiveMatch(matchToPlay);
  };

  const handlePlayUserMatch = () => {
    if (!userMatch) return;
    if (cupActive && activeCupStage) {
      const { newState, newResults } = simulateCupMatches(state, state.cup.currentStageIndex, userMatch.id);
      setState(newState);
      setPendingAutoResults(newResults);
      startLiveMatch(userMatch as CupMatch, { competition: 'cup', stageName: activeCupStage.name });
      return;
    }
    const { newState, newResults } = simulateLeagueMatches(state, userMatch.id);
    setState(newState);
    setPendingAutoResults(newResults);
    if (importanceReason && opponentTeam && !pressHistory[userMatch.id]) {
      setPressContext({ match: userMatch as Match, opponent: opponentTeam, reason: importanceReason });
      return;
    }
    startLiveMatch(userMatch as Match);
  };

  const handleSimulateDay = () => {
    if (cupActive && activeCupStage) {
      const { newState, newResults } = simulateCupMatches(state, state.cup.currentStageIndex);
      setState(newState);
      setResults(newResults);
    } else {
      const { newState, newResults } = simulateLeagueMatches(state);
      newState.currentRound += 1;
      setState(newState);
      setResults(newResults);
    }
  };


  const getImportanceReason = useCallback((_: Match, opponent: Team): string | null => {
    const opponentRank = rankMap[opponent.id];
    const userRank = rankMap[userTeamId];
    if (!opponentRank || !userRank) return null;
    if (opponentRank <= 3) return `${opponent.name} est sur le podium (${opponentRank}e).`;
    if (userRank <= 3 && opponentRank <= 5) return 'Course au titre, la pression est maximale.';
    if (Math.abs(opponentRank - userRank) <= 1) return 'Duel direct au classement.';
    if (currentRound >= totalRounds - 2) return 'La fin de saison approche, chaque point compte.';
    return null;
  }, [rankMap, userTeamId, currentRound, totalRounds]);

  const leagueFinished = currentRound > totalRounds;
  const cupFinished = state.cup.stages.every(stage => stage.completed);
  const isSeasonFinished = leagueFinished && cupFinished;
  const userMatch = activeMatches.find(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId);
  const opponentTeam = userMatch ? teams[userMatch.homeTeamId === userTeamId ? userMatch.awayTeamId : userMatch.homeTeamId] : null;
  const importanceReason = !cupActive && userMatch && opponentTeam && 'round' in userMatch
    ? getImportanceReason(userMatch, opponentTeam)
    : null;
  const headerTitle = cupActive && activeCupStage ? `Coupe de France — ${activeCupStage.name}` : `Jour de match — Journée ${currentRound}`;
  const headerSub = cupActive && activeCupStage ? 'Semaine dédiée à la Coupe' : `${currentRound} / ${totalRounds}`;
  const competitionLabel = cupActive && activeCupStage ? 'Coupe de France' : league.name;
  return (
    <>
      {pressContext && (
        <PressConferenceModal
          opponent={pressContext.opponent}
          reason={pressContext.reason}
          onAnswer={completePressConference}
          onSkip={skipPressConference}
        />
      )}
      {liveMatch && (
        <LiveMatchModal
          context={liveMatch}
          onClose={() => setLiveMatch(null)}
          onComplete={(score) => completeLiveMatch(score)}
        />
      )}
      {results && results.length > 0 && (
        <ResultsModal
          results={results}
          teams={teams}
          userTeamId={userTeamId}
          onClose={() => setResults(null)}
        />
      )}
      <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{headerTitle}</h2>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          {headerSub}
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
        Championnat&nbsp;: {competitionLabel}
      </div>

      {isSeasonFinished ? (
        <div style={{ padding: 24, textAlign: 'center', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Saison terminée !</div>
          <div className="muted">Tous les matchs ont été joués.</div>
        </div>
      ) : (
        <>
        {pressNote && (
          <div style={{ marginBottom: 16, padding: 12, background: 'rgba(37,99,235,0.12)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.4)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Conférence de presse</div>
            <div style={{ fontSize: 13 }}>{pressNote}</div>
          </div>
        )}

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

          {userMatch && userMatch.homeGoals == null && userMatch.awayGoals == null && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handlePlayUserMatch}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(90deg, #2563eb, #0ea5e9)',
                  color: '#e0f2fe',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Jouer votre match
              </button>
            </div>
          )}
          {!userMatch && unplayedMatches.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handleSimulateDay}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(90deg, #f97316, #fb923c)',
                  color: '#0a0a0a',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Simuler la journée
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {activeMatches.map(m => {
              const homeTeam = teams[m.homeTeamId];
              const awayTeam = teams[m.awayTeamId];
              const isUserMatch = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
              const isPlayed = m.homeGoals != null && m.awayGoals != null;
              const homeScorers = m.homeScorers || [];
              const awayScorers = m.awayScorers || [];
              const homeYellowCards = m.homeYellowCards || [];
              const awayYellowCards = m.awayYellowCards || [];
              const homeRedCards = m.homeRedCards || [];
              const awayRedCards = m.awayRedCards || [];
               const isCupMatch = cupActive && !!activeCupStage;
               const stageLabel = isCupMatch ? activeCupStage?.name : ('round' in m && m.round ? `Journée ${m.round}` : '');

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
                  {isPlayed && (homeScorers.length > 0 || awayScorers.length > 0 || homeYellowCards.length > 0 || awayYellowCards.length > 0 || homeRedCards.length > 0 || awayRedCards.length > 0) && (
                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                      {(homeScorers.length > 0 || awayScorers.length > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
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
                      {(homeYellowCards.length > 0 || awayYellowCards.length > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: '#fde047', marginBottom: 4 }}>
                          <div style={{ flex: 1 }}>
                            {homeYellowCards.length > 0 && (
                              <div>
                                <span style={{ fontWeight: 600 }}>🟨</span> {homeYellowCards.join(', ')}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            {awayYellowCards.length > 0 && (
                              <div>
                                <span style={{ fontWeight: 600 }}>🟨</span> {awayYellowCards.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {(homeRedCards.length > 0 || awayRedCards.length > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: '#ef4444' }}>
                          <div style={{ flex: 1 }}>
                            {homeRedCards.length > 0 && (
                              <div>
                                <span style={{ fontWeight: 600 }}>🟥</span> {homeRedCards.join(', ')}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            {awayRedCards.length > 0 && (
                              <div>
                                <span style={{ fontWeight: 600 }}>🟥</span> {awayRedCards.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {stageLabel ? (
                    <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{stageLabel}</div>
                  ) : null}

                  {!isPlayed && isUserMatch && (
                    <button
                      onClick={() => startLiveMatch(m, isCupMatch ? { competition: 'cup', stageName: stageLabel ?? undefined } : undefined)}
                      style={{
                        width: '100%',
                        marginTop: 12,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'rgba(59,130,246,0.15)',
                        color: '#bfdbfe',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Jouer
                    </button>
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
