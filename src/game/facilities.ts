import type { ClubFacilities, Team } from './types';

export const DEFAULT_FACILITIES: ClubFacilities = {
  stadium: 2,
  hospitality: 1,
  medical: 1,
  youth: 1
};

export function getDefaultFacilities(): ClubFacilities {
  return { ...DEFAULT_FACILITIES };
}

export function resolveFacilities(team: Team): ClubFacilities {
  const defaults = DEFAULT_FACILITIES;
  return {
    stadium: team.facilities?.stadium ?? defaults.stadium,
    hospitality: team.facilities?.hospitality ?? defaults.hospitality,
    medical: team.facilities?.medical ?? defaults.medical,
    youth: team.facilities?.youth ?? defaults.youth
  };
}

export const FACILITY_PAYOUTS = {
  stadium: 220_000,
  hospitality: 80_000,
  medical: 45_000,
  youth: 60_000
} as const;

export function computeFacilityIncome(team: Team, { isHome = false }: { isHome?: boolean } = {}): number {
  const facilities = resolveFacilities(team);
  let total = 0;
  if (isHome) {
    total += facilities.stadium * FACILITY_PAYOUTS.stadium;
  }
  total += facilities.hospitality * FACILITY_PAYOUTS.hospitality;
  total += facilities.medical * FACILITY_PAYOUTS.medical;
  total += facilities.youth * FACILITY_PAYOUTS.youth;
  return Math.round(total);
}

