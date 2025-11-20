import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ClubFacilities, GameState, Team } from '../game/types';
import { getDefaultFacilities, FACILITY_PAYOUTS } from '../game/facilities';

interface Props {
  state: GameState;
  setState: Dispatch<SetStateAction<GameState | null>>;
}

type FacilityKey = keyof ClubFacilities;

const MAX_LEVEL = 5;
const LEVEL_LABELS = ['-', 'Basique', 'Standard', 'Moderne', 'Élite', 'Iconique'];

const FACILITY_DEFINITIONS: Record<
  FacilityKey,
  {
    title: string;
    description: string;
    icon: string;
    impact: string;
    costs: number[];
  }
> = {
  stadium: {
    title: 'Infrastructure du stade',
    description: 'Capacité, acoustique, toit retravaillé et loges supplémentaires.',
    icon: '🏟️',
    impact: '+ Recettes jour de match · + Prestige',
    costs: [2_500_000, 4_500_000, 7_500_000, 12_000_000]
  },
  hospitality: {
    title: 'Services supporters',
    description: 'Hospitalité VIP, restauration et expérience fans.',
    icon: '🍽️',
    impact: '+ Satisfaction supporters · + Revenus boutiques',
    costs: [900_000, 1_800_000, 3_000_000, 4_500_000]
  },
  medical: {
    title: 'Pôle médical',
    description: 'Staff élargi, équipements cryo, soins personnalisés.',
    icon: '🩺',
    impact: '- Blessures graves · + Récupération',
    costs: [1_200_000, 2_400_000, 4_000_000, 6_000_000]
  },
  youth: {
    title: 'Centre de formation',
    description: 'Scouting national, internat modernisé, suivi scolaire.',
    icon: '🌱',
    impact: '+ Potentiel jeunes · + Valeur académiciens',
    costs: [1_500_000, 3_000_000, 5_000_000, 8_000_000]
  }
};

function ensureFacilities(team: Team): ClubFacilities {
  return {
    stadium: team.facilities?.stadium ?? getDefaultFacilities().stadium,
    hospitality: team.facilities?.hospitality ?? getDefaultFacilities().hospitality,
    medical: team.facilities?.medical ?? getDefaultFacilities().medical,
    youth: team.facilities?.youth ?? getDefaultFacilities().youth
  };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(1)}K`;
  }
  return `€${value.toLocaleString('fr-FR')}`;
}

function StadiumPreview({ facilities }: { facilities: ClubFacilities }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#031022');
    bgGradient.addColorStop(1, '#050b16');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const baseScale = 0.78 + facilities.stadium * 0.07;
    const tierHeight = 35 + facilities.hospitality * 6;
    const roofHeight = 14 + facilities.stadium * 3;
    const turfGlow = 0.15 + facilities.medical * 0.04;
    const youthLights = facilities.youth * 0.1;

    const pitchWidth = width * 0.6 * baseScale;
    const pitchHeight = height * 0.18 * baseScale;
    const pitchX = (width - pitchWidth) / 2;
    const pitchY = height * 0.55;

    ctx.save();
    ctx.translate(pitchX, pitchY);
    ctx.fillStyle = '#0f8f4b';
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(0, 0, pitchWidth, pitchHeight);
    ctx.fill();
    ctx.stroke();
    ctx.strokeRect(pitchWidth / 2 - 1, 0, 2, pitchHeight);
    ctx.strokeRect(pitchWidth / 2 - 12, pitchHeight / 2 - 12, 24, 24);
    ctx.restore();

    const drawStand = (offset: number, depth: number, color: string) => {
      ctx.save();
      ctx.translate(width / 2, pitchY);
      ctx.beginPath();
      ctx.moveTo(-pitchWidth / 2 - offset, 5);
      ctx.lineTo(pitchWidth / 2 + offset, 5);
      ctx.lineTo(pitchWidth / 2 + offset + depth, -(tierHeight + roofHeight));
      ctx.lineTo(-pitchWidth / 2 - offset - depth, -(tierHeight + roofHeight));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    drawStand(18, 30, 'rgba(23,32,62,0.85)');
    drawStand(10, 18, 'rgba(17,53,95,0.85)');

    ctx.save();
    ctx.translate(width / 2, pitchY - tierHeight - 20);
    ctx.beginPath();
    ctx.moveTo(-pitchWidth / 2 - 30, -roofHeight);
    ctx.lineTo(pitchWidth / 2 + 30, -roofHeight);
    ctx.lineTo(pitchWidth / 2 + 10, 4);
    ctx.lineTo(-pitchWidth / 2 - 10, 4);
    ctx.closePath();
    const roofGradient = ctx.createLinearGradient(-pitchWidth / 2, -roofHeight, pitchWidth / 2, 4);
    roofGradient.addColorStop(0, '#1e293b');
    roofGradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = roofGradient;
    ctx.fill();
    ctx.restore();

    const glowGradient = ctx.createRadialGradient(width / 2, pitchY + pitchHeight / 2, 10, width / 2, pitchY + pitchHeight / 2, pitchWidth);
    glowGradient.addColorStop(0, `rgba(34,197,94,${turfGlow})`);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = `rgba(80,160,255,${0.25 + youthLights})`;
    const lightPositions = [-pitchWidth / 2 - 40, -pitchWidth / 3, pitchWidth / 3, pitchWidth / 2 + 40];
    lightPositions.forEach(pos => {
      ctx.beginPath();
      ctx.ellipse(width / 2 + pos, pitchY - tierHeight - roofHeight - 10, 6, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [facilities]);

  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        padding: 0,
        overflow: 'hidden',
        border: '1px solid rgba(59,130,246,0.2)'
      }}
    >
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Vue 3D</div>
          <div style={{ fontWeight: 700 }}>Maquette dynamique du stade</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chaque niveau étend la structure</div>
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}

export default function StadiumView({ state, setState }: Props) {
  const team = state.teams[state.userTeamId];
  const facilities = useMemo(() => ensureFacilities(team), [team.facilities]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const matchdayIncome = facilities.stadium * FACILITY_PAYOUTS.stadium;
  const hospitalityIncome = facilities.hospitality * FACILITY_PAYOUTS.hospitality;
  const medicalSavings = facilities.medical * FACILITY_PAYOUTS.medical;
  const academyIncome = facilities.youth * FACILITY_PAYOUTS.youth;

  useEffect(() => {
    if (team.facilities) return;
    setState(prev => {
      if (!prev) return prev;
      const current = prev.teams[prev.userTeamId];
      if (!current || current.facilities) return prev;
      return {
        ...prev,
        teams: {
          ...prev.teams,
          [prev.userTeamId]: {
            ...current,
            facilities: ensureFacilities(current)
          }
        }
      };
    });
  }, [team.facilities, setState]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const handleUpgrade = (key: FacilityKey) => {
    const currentLevel = facilities[key];
    if (currentLevel >= MAX_LEVEL) return;
    const definition = FACILITY_DEFINITIONS[key];
    const cost = definition.costs[currentLevel - 1];
    if (team.funds < cost) {
      setFeedback('Trésorerie insuffisante pour cet investissement.');
      return;
    }
    const nextLevel = Math.min(MAX_LEVEL, currentLevel + 1);
    setState(prev => {
      if (!prev) return prev;
      const userTeam = prev.teams[prev.userTeamId];
      if (!userTeam) return prev;
      const safeFacilities = ensureFacilities(userTeam);
      const nextTeam: Team = {
        ...userTeam,
        funds: userTeam.funds - cost,
        facilities: {
          ...safeFacilities,
          [key]: nextLevel
        }
      };
      return {
        ...prev,
        teams: {
          ...prev.teams,
          [prev.userTeamId]: nextTeam
        }
      };
    });
    setFeedback(`${definition.title} passe au niveau ${nextLevel}!`);
  };

  const estimatedCapacity = 25000 + facilities.stadium * 8000;
  const matchdayBonus = facilities.hospitality * 2.5;
  const injuryMitigation = facilities.medical * 5;
  const academyRating = facilities.youth * 12;

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>Infrastructure</div>
          <h2 style={{ margin: 0 }}>{team.name} - Parc des supporters</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Trésorerie</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{formatCurrency(team.funds)}</div>
        </div>
      </div>

      <StadiumPreview facilities={facilities} />

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Capacité estimée</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{estimatedCapacity.toLocaleString('fr-FR')} places</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Recettes jour de match : +{formatCurrency(matchdayIncome)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Expérience fans</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{(75 + matchdayBonus).toFixed(0)}/100</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Merchandising : +{formatCurrency(hospitalityIncome)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Risque blessures</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{Math.max(15, 45 - injuryMitigation).toFixed(0)}%</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Économies soins : +{formatCurrency(medicalSavings)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Indice académie</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{(60 + academyRating).toFixed(0)}/100</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Prime formation : +{formatCurrency(academyIncome)}</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          Bonus financiers appliqués automatiquement après chaque match (stade = domicile uniquement).
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, marginTop: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {(Object.keys(FACILITY_DEFINITIONS) as FacilityKey[]).map(key => {
          const level = facilities[key];
          const definition = FACILITY_DEFINITIONS[key];
          const maxed = level >= MAX_LEVEL;
          const nextCost = maxed ? null : definition.costs[level - 1];
          return (
            <div key={key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 28 }}>{definition.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{definition.impact}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{definition.title}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>{definition.description}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Niveau actuel : {LEVEL_LABELS[level]}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: MAX_LEVEL }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 999,
                      background: idx < level ? 'linear-gradient(90deg, #4ade80, #22d3ee)' : 'rgba(148,163,184,0.2)'
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{maxed ? 'Niveau maximal atteint' : 'Coût prochain palier'}</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{nextCost ? formatCurrency(nextCost) : '—'}</div>
                </div>
                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={maxed || (nextCost != null && team.funds < nextCost)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: maxed ? 'not-allowed' : 'pointer',
                    background: maxed
                      ? 'rgba(100,116,139,0.25)'
                      : team.funds >= (nextCost ?? 0)
                        ? 'linear-gradient(90deg, #22c55e, #0ea5e9)'
                        : 'rgba(244,63,94,0.2)',
                    color: maxed ? '#cbd5f5' : team.funds >= (nextCost ?? 0) ? '#04121a' : '#fca5a5'
                  }}
                >
                  {maxed ? 'Max' : 'Améliorer'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 10,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#86efac',
            fontWeight: 600
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

