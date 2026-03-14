import { describe, it, expect } from 'vitest';
import { calculateDistribution } from '../distributionAlgorithm';
import type { Rounder, Admission, TeamLetter } from '../../types';
import { TEAM_FLOORS } from '../../types';

function makeRounders(censuses: number[]): Rounder[] {
  const letters: TeamLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'J', 'K'];
  return censuses.map((census, i) => ({
    id: letters[i],
    name: `Team ${letters[i]}`,
    floor: TEAM_FLOORS[letters[i]].floor,
    isFloating: TEAM_FLOORS[letters[i]].isFloating,
    currentCensus: census
  }));
}

function makeAdmissions(count: number, floors?: string[]): Admission[] {
  const defaultFloors = ['1S', '1C', '2S', '2C', '3S', '4S', '2NE', '2N'];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    admittedBy: 'non-rounder',
    floor: floors ? floors[i % floors.length] : defaultFloors[i % defaultFloors.length],
    patientName: `Patient ${i + 1}`
  }));
}

describe('calculateDistribution', () => {
  it('should assign all patients with no drops (8 providers, 16 admissions)', () => {
    const rounders = makeRounders([10, 10, 10, 10, 10, 10, 10, 10]);
    const admissions = makeAdmissions(16);
    const result = calculateDistribution(rounders, admissions);
    expect(result.assignmentOrder.length).toBe(16);
  });

  it('should distribute evenly with equal census (8 providers, 8 admissions)', () => {
    const rounders = makeRounders([10, 10, 10, 10, 10, 10, 10, 10]);
    const admissions = makeAdmissions(8);
    const result = calculateDistribution(rounders, admissions);
    expect(result.assignmentOrder.length).toBe(8);

    const counts: Record<string, number> = {};
    result.assignmentOrder.forEach(a => {
      counts[a.assignedToId] = (counts[a.assignedToId] || 0) + 1;
    });
    const values = Object.values(counts);
    const spread = Math.max(...values) - Math.min(...values);
    expect(spread).toBe(0);
  });

  it('should not assign to provider at cap (census 17)', () => {
    const rounders = makeRounders([17, 10, 10, 10, 10, 10, 10, 10]);
    const admissions = makeAdmissions(7);
    const result = calculateDistribution(rounders, admissions);
    expect(result.assignmentOrder.length).toBe(7);

    const cappedAssignments = result.assignmentOrder.filter(a => a.assignedToId === 'A');
    expect(cappedAssignments.length).toBe(0);

    const counts: Record<string, number> = {};
    result.assignmentOrder.forEach(a => {
      counts[a.assignedToId] = (counts[a.assignedToId] || 0) + 1;
    });
    const values = Object.values(counts);
    values.forEach(v => expect(v).toBe(1));
  });

  it('should use overflow mode when all providers are at cap', () => {
    const rounders = makeRounders([17, 17, 17, 17, 17, 17, 17, 17]);
    const admissions = makeAdmissions(5);
    const result = calculateDistribution(rounders, admissions);
    expect(result.assignmentOrder.length).toBe(5);
    expect(result.metrics.overflowAssignments).toBe(5);
  });

  it('should balance uneven census with spread <= 2', () => {
    const rounders = makeRounders([8, 10, 12, 14, 9, 11, 13, 7]);
    const admissions = makeAdmissions(16);
    const result = calculateDistribution(rounders, admissions);
    expect(result.assignmentOrder.length).toBe(16);

    const endCensuses = result.summary.map(s => s.endCensus);
    const spread = Math.max(...endCensuses) - Math.min(...endCensuses);
    expect(spread).toBeLessThanOrEqual(2);
  });

  it('should assign single admission to lowest census provider', () => {
    const rounders = makeRounders([5, 10, 8, 12, 6, 9, 11, 7, 10, 8]);
    const admissions = makeAdmissions(1);
    const result = calculateDistribution(rounders, admissions);
    expect(result.assignmentOrder.length).toBe(1);
    // Should go to one of the lowest-census providers (census 5 or 6)
    const assignedId = result.assignmentOrder[0].assignedToId;
    const assignedRounder = rounders.find(r => r.id === assignedId)!;
    expect(assignedRounder.currentCensus).toBeLessThanOrEqual(7);
  });

  it('should assign all 30 patients in large batch with spread <= 2', () => {
    const rounders = makeRounders([8, 10, 12, 14, 9, 11, 13, 7]);
    const admissions = makeAdmissions(30);
    const result = calculateDistribution(rounders, admissions);
    expect(result.assignmentOrder.length).toBe(30);

    const endCensuses = result.summary.map(s => s.endCensus);
    const spread = Math.max(...endCensuses) - Math.min(...endCensuses);
    expect(spread).toBeLessThanOrEqual(2);
  });
});
