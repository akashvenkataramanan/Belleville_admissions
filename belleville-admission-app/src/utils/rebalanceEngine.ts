import type { TeamLetter, RounderSummary } from '../types';

export interface RebalanceTransfer {
  fromTeam: TeamLetter;
  fromName: string;
  toTeam: TeamLetter;
  toName: string;
  count: number;
}

export interface RebalanceResult {
  needed: boolean;
  currentSpread: number;
  transfers: RebalanceTransfer[];
  finalCensus: Record<string, number>;
  targetLow: number;
  targetHigh: number;
}

export function calculateRebalance(summaries: RounderSummary[]): RebalanceResult {
  // Map summaries to working data
  const census = summaries.map(s => ({
    id: s.rounderId,
    name: s.rounderName,
    count: s.endCensus
  }));

  const total = census.reduce((sum, c) => sum + c.count, 0);
  const n = census.length;
  const targetLow = Math.floor(total / n);
  const targetHigh = targetLow + 1;

  const maxCensus = Math.max(...census.map(c => c.count));
  const minCensus = Math.min(...census.map(c => c.count));
  const currentSpread = maxCensus - minCensus;

  if (currentSpread <= 2) {
    return {
      needed: false,
      currentSpread,
      transfers: [],
      finalCensus: Object.fromEntries(census.map(c => [c.id, c.count])),
      targetLow,
      targetHigh
    };
  }

  // Water-fill rebalance: move from highest to lowest until spread <= 1
  const transfers: RebalanceTransfer[] = [];
  const working = census.map(c => ({ ...c }));

  let iterations = 0;
  const maxIterations = total; // safety limit

  while (iterations < maxIterations) {
    working.sort((a, b) => b.count - a.count);
    const donor = working[0];
    const recipient = working[working.length - 1];

    // Stop when spread is acceptable (donor - recipient <= 1)
    if (donor.count - recipient.count <= 1) break;

    // Only transfer if donor is above targetHigh or recipient is below targetLow
    if (donor.count <= targetHigh && recipient.count >= targetLow) break;

    donor.count--;
    recipient.count++;

    const existing = transfers.find(t => t.fromTeam === donor.id && t.toTeam === recipient.id);
    if (existing) {
      existing.count++;
    } else {
      transfers.push({
        fromTeam: donor.id as TeamLetter,
        fromName: donor.name,
        toTeam: recipient.id as TeamLetter,
        toName: recipient.name,
        count: 1
      });
    }
    iterations++;
  }

  return {
    needed: transfers.length > 0,
    currentSpread,
    transfers,
    finalCensus: Object.fromEntries(working.map(c => [c.id, c.count])),
    targetLow,
    targetHigh
  };
}
