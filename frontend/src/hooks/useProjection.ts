import { useMemo } from 'react';
import { EntryUnion, HoldingEntry, ManualEntry } from '../types/networth';
import { Scenario, ProjectionPoint, ProjectionResult, ReturnAssumptions } from '../types/projection';
import { toTroyOz } from '../utils/metalConversion';

function getEntryNativeValue(entry: EntryUnion): number {
  if (entry.entryType === 'manual') return (entry as ManualEntry).balance;
  const h = entry as HoldingEntry;
  if (h.lastPrice == null) return 0;
  const qty = h.assetClass === 'metal' ? toTroyOz(h.quantity, h.weightUnit ?? 'troy_oz') : h.quantity;
  return qty * h.lastPrice;
}

function getEntryReturnRate(entry: EntryUnion, assumptions: ReturnAssumptions): number {
  if (entry.entryType === 'manual') {
    const m = entry as ManualEntry;
    switch (m.category) {
      case 'bank': return assumptions.bank;
      case 'cpf': return m.cpfType === 'oa' ? assumptions.cpf_oa : assumptions.cpf_sa;
      case 'cpfis': return assumptions.cpfis;
      case 'retirement': return assumptions.retirement;
      case 'liability': return 0;
      default: return assumptions.bank;
    }
  }
  const h = entry as HoldingEntry;
  switch (h.assetClass) {
    case 'stock': case 'etf': return assumptions.equity;
    case 'mutualfund': return assumptions.retirement;
    case 'crypto': return assumptions.crypto;
    case 'metal': return assumptions.metals;
    default: return assumptions.bank;
  }
}

function computeBlendedMonthlyRate(entries: EntryUnion[], assumptions: ReturnAssumptions): number {
  const nonLiability = entries.filter(e => !(e.entryType === 'manual' && (e as ManualEntry).category === 'liability'));
  const total = nonLiability.reduce((s, e) => s + getEntryNativeValue(e), 0);
  if (total === 0) return assumptions.equity / 12;
  const weighted = nonLiability.reduce((s, e) => {
    return s + getEntryNativeValue(e) * getEntryReturnRate(e, assumptions);
  }, 0);
  return (weighted / total) / 12;
}

function forwardProject(
  initialNW: number,
  monthlySurplus: number,
  blendedMonthlyRate: number,
  targetNW: number,
  maxMonths = 540
): { points: ProjectionPoint[]; targetReachedMonth: number | null } {
  const points: ProjectionPoint[] = [{ month: 0, networth: initialNW }];
  let nw = initialNW;
  let targetReachedMonth: number | null = null;

  for (let m = 1; m <= maxMonths; m++) {
    nw = nw * (1 + blendedMonthlyRate) + monthlySurplus;
    points.push({ month: m, networth: Math.round(nw) });
    if (targetReachedMonth === null && nw >= targetNW) {
      targetReachedMonth = m;
    }
  }
  return { points, targetReachedMonth };
}

function backwardProject(
  initialNW: number,
  targetNW: number,
  targetDate: string,
  blendedMonthlyRate: number
): number | null {
  const months = Math.round(
    (new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  if (months <= 0) return null;

  // Solve: FV = PV*(1+r)^n + S * [((1+r)^n - 1) / r]
  // targetNW = initialNW*(1+r)^n + S * [((1+r)^n - 1) / r]
  const growth = Math.pow(1 + blendedMonthlyRate, months);
  if (blendedMonthlyRate === 0) return (targetNW - initialNW) / months;
  const annuityFactor = (growth - 1) / blendedMonthlyRate;
  return (targetNW - initialNW * growth) / annuityFactor;
}

export function useProjectionCalc(
  scenario: Scenario,
  entries: EntryUnion[],
  currentNW: number
): ProjectionResult {
  return useMemo(() => {
    const blendedRate = computeBlendedMonthlyRate(entries, scenario.returnAssumptions);
    const { points, targetReachedMonth } = forwardProject(
      currentNW,
      scenario.monthlySurplus,
      blendedRate,
      scenario.targetNetworth
    );

    let requiredSurplus: number | null = null;
    if (scenario.targetDate) {
      requiredSurplus = backwardProject(currentNW, scenario.targetNetworth, scenario.targetDate, blendedRate);
    }

    return { points, targetReachedMonth, requiredSurplus };
  }, [scenario, entries, currentNW]);
}

export { computeBlendedMonthlyRate };
