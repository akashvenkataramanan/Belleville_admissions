import type { Rounder, TeamLetter, TransferInstruction, TransitionResult } from '../types';
import { TEAM_FLOORS } from '../types';

/**
 * Replace a provider on a team — census stays the same, only the name changes.
 */
export function replaceProvider(
  rounders: Rounder[],
  targetTeam: TeamLetter,
  newName: string
): Rounder[] {
  return rounders.map(r =>
    r.id === targetTeam ? { ...r, name: newName } : r
  );
}

/**
 * Add a new provider to the roster and redistribute patients so everyone
 * ends up near the same census.
 */
export function gainProvider(
  rounders: Rounder[],
  teamToAdd: TeamLetter,
  newName: string
): TransitionResult {
  const teamInfo = TEAM_FLOORS[teamToAdd];
  const newRounder: Rounder = {
    id: teamToAdd,
    name: newName,
    floor: teamInfo.floor,
    isFloating: teamInfo.isFloating,
    currentCensus: 0,
  };

  const totalCensus = rounders.reduce((sum, r) => sum + r.currentCensus, 0);
  const target = Math.floor(totalCensus / (rounders.length + 1));

  // Deep-copy existing rounders so we can mutate census safely
  const working = rounders.map(r => ({ ...r }));
  const workingNew = { ...newRounder };
  const transfers: TransferInstruction[] = [];

  // Sort existing rounders by census descending — take from the heaviest first
  const sorted = [...working].sort((a, b) => b.currentCensus - a.currentCensus);

  while (workingNew.currentCensus < target) {
    // Find the highest-census provider who is still above the target
    const donor = sorted.find(r => r.currentCensus > target);
    if (!donor) break;

    donor.currentCensus -= 1;
    workingNew.currentCensus += 1;

    // Accumulate into existing transfer or create new one
    const existing = transfers.find(
      t => t.fromTeam === donor.id && t.toTeam === workingNew.id
    );
    if (existing) {
      existing.patientCount += 1;
    } else {
      transfers.push({
        fromTeam: donor.id,
        fromName: donor.name,
        toTeam: workingNew.id,
        toName: workingNew.name,
        patientCount: 1,
      });
    }

    // Re-sort after adjustment
    sorted.sort((a, b) => b.currentCensus - a.currentCensus);
  }

  // Merge the new provider back with the adjusted existing rounders and sort
  const updatedRounders = [...working, workingNew].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  const finalCensus: Record<string, number> = {};
  updatedRounders.forEach(r => {
    finalCensus[r.id] = r.currentCensus;
  });

  const censusValues = updatedRounders.map(r => r.currentCensus);
  const maxDifference = Math.max(...censusValues) - Math.min(...censusValues);

  return { transfers, updatedRounders, finalCensus, maxDifference };
}

/**
 * Remove a provider and distribute their patients evenly among the remaining
 * rounders, giving one at a time to whoever currently has the fewest.
 */
export function loseProvider(
  rounders: Rounder[],
  teamToRemove: TeamLetter
): TransitionResult {
  const departing = rounders.find(r => r.id === teamToRemove);
  if (!departing) {
    return {
      transfers: [],
      updatedRounders: [...rounders],
      finalCensus: Object.fromEntries(rounders.map(r => [r.id, r.currentCensus])),
      maxDifference: 0,
    };
  }

  let patientsToDistribute = departing.currentCensus;
  const remaining = rounders
    .filter(r => r.id !== teamToRemove)
    .map(r => ({ ...r }));

  const transfers: TransferInstruction[] = [];

  while (patientsToDistribute > 0) {
    // Sort ascending — give to the lowest census provider
    remaining.sort((a, b) => a.currentCensus - b.currentCensus);
    const recipient = remaining[0];

    recipient.currentCensus += 1;
    patientsToDistribute -= 1;

    const existing = transfers.find(
      t => t.fromTeam === departing.id && t.toTeam === recipient.id
    );
    if (existing) {
      existing.patientCount += 1;
    } else {
      transfers.push({
        fromTeam: departing.id,
        fromName: departing.name,
        toTeam: recipient.id,
        toName: recipient.name,
        patientCount: 1,
      });
    }
  }

  const updatedRounders = remaining.sort((a, b) => a.id.localeCompare(b.id));

  const finalCensus: Record<string, number> = {};
  updatedRounders.forEach(r => {
    finalCensus[r.id] = r.currentCensus;
  });

  const censusValues = updatedRounders.map(r => r.currentCensus);
  const maxDifference =
    censusValues.length > 0
      ? Math.max(...censusValues) - Math.min(...censusValues)
      : 0;

  return { transfers, updatedRounders, finalCensus, maxDifference };
}
