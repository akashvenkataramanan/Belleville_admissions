import type {
  Rounder,
  Admission,
  DistributionResult,
  RounderState,
  TeamLetter
} from '../types';
import { CAP_PATIENTS, ALPHA } from '../types';

export function calculateDistribution(
  rounders: Rounder[],
  admissions: Admission[]
): DistributionResult {
  const result: DistributionResult = {
    assignments: {} as Record<TeamLetter, RounderState>,
    summary: [],
    assignmentOrder: [],
    metrics: {
      geoMatches: 0,
      proportionalAssignments: 0,
      overflowAssignments: 0
    }
  };

  let assignmentCounter = 0;

  // Initialize rounder states
  const rounderStates: RounderState[] = rounders.map(r => {
    const capacity = Math.max(0, CAP_PATIENTS - r.currentCensus);
    const slack = capacity / CAP_PATIENTS;
    const weight = Math.pow(slack, ALPHA);
    const overage = Math.max(0, r.currentCensus - CAP_PATIENTS);

    return {
      ...r,
      capacity,
      slack,
      weight,
      overage,
      assignedPatients: [],
      assignedCount: 0,
      quota: 0,
      remainingQuota: 0
    };
  });

  // Filter to only non-rounder admissions
  const poolAdmissions = admissions.filter(a => a.admittedBy === 'non-rounder');

  if (poolAdmissions.length === 0) {
    result.summary = rounderStates.map(r => ({
      rounderId: r.id,
      rounderName: r.name,
      floor: r.floor,
      startCensus: r.currentCensus,
      newAdmissions: 0,
      endCensus: r.currentCensus,
      slack: r.slack,
      overage: r.overage,
      hitCap: r.currentCensus >= CAP_PATIENTS,
      admissions: []
    }));
    return result;
  }

  const N = poolAdmissions.length;
  const totalCapacity = rounderStates.reduce((sum, r) => sum + r.capacity, 0);

  // Check if overflow mode needed
  if (totalCapacity < N) {
    // Overflow mode: water-filling
    poolAdmissions.forEach(admission => {
      const sortedByOverage = [...rounderStates].sort((a, b) => {
        const aCurrentTotal = a.currentCensus + a.assignedCount;
        const bCurrentTotal = b.currentCensus + b.assignedCount;
        const aOver = Math.max(0, aCurrentTotal - CAP_PATIENTS);
        const bOver = Math.max(0, bCurrentTotal - CAP_PATIENTS);

        if (aOver !== bOver) return aOver - bOver;

        const aGeoMatch = !a.isFloating && a.floor === admission.floor ? 1 : 0;
        const bGeoMatch = !b.isFloating && b.floor === admission.floor ? 1 : 0;
        if (aGeoMatch !== bGeoMatch) return bGeoMatch - aGeoMatch;

        if (aCurrentTotal !== bCurrentTotal) return aCurrentTotal - bCurrentTotal;

        // Use localeCompare for string IDs (TeamLetter)
        return a.id.localeCompare(b.id);
      });

      const targetRounder = sortedByOverage[0];
      targetRounder.assignedPatients.push({
        ...admission,
        reason: 'overflow_waterfill'
      });
      targetRounder.assignedCount++;
      result.metrics.overflowAssignments++;

      assignmentCounter++;
      result.assignmentOrder.push({
        order: assignmentCounter,
        patientId: admission.patientName,
        floor: admission.floor,
        assignedTo: targetRounder.name,
        assignedToId: targetRounder.id,
        assignedFloor: targetRounder.floor,
        reason: 'overflow_waterfill',
        reasonLabel: 'Overflow (Water-filling)'
      });
    });
  } else {
    // Normal mode: Calculate quotas
    const totalWeight = rounderStates.reduce((sum, r) => sum + r.weight, 0);

    rounderStates.forEach(r => {
      const rawQuota = totalWeight > 0 ? (r.weight / totalWeight) * N : 0;
      r.quota = Math.min(Math.floor(rawQuota), r.capacity);
      r.remainder = rawQuota - Math.floor(rawQuota);
      r.remainingQuota = r.quota;
    });

    // Apply census-based adjustment to balance distribution
    // This increases quotas for low-census doctors and decreases for high-census doctors
    const avgCensus = rounderStates.reduce((sum, r) => sum + r.currentCensus, 0) / rounderStates.length;
    const censusAdjustmentFactor = 0.35; // Adjustment strength per census point difference (balanced)

    // Calculate adjustments
    const adjustments: { rounder: RounderState; adjustment: number }[] = [];
    rounderStates.forEach(r => {
      const censusDiff = r.currentCensus - avgCensus;
      // Positive censusDiff (above average) -> negative adjustment (get fewer patients)
      // Negative censusDiff (below average) -> positive adjustment (get more patients)
      const rawAdjustment = -censusDiff * censusAdjustmentFactor;
      const adjustment = Math.round(rawAdjustment);
      adjustments.push({ rounder: r, adjustment });
    });

    // Apply adjustments while respecting capacity constraints
    adjustments.forEach(({ rounder, adjustment }) => {
      if (adjustment > 0) {
        // Increase quota for high-census doctors
        const maxIncrease = rounder.capacity - rounder.quota;
        const actualIncrease = Math.min(adjustment, maxIncrease);
        rounder.quota += actualIncrease;
        rounder.remainingQuota += actualIncrease;
      } else if (adjustment < 0) {
        // Decrease quota for low-census doctors
        const maxDecrease = rounder.quota;
        const actualDecrease = Math.min(Math.abs(adjustment), maxDecrease);
        rounder.quota -= actualDecrease;
        rounder.remainingQuota -= actualDecrease;
      }
    });

    // Distribute remainders
    let assigned = rounderStates.reduce((sum, r) => sum + r.quota, 0);
    let remaining = N - assigned;

    while (remaining > 0) {
      const eligible = rounderStates.filter(r => r.quota < r.capacity);
      if (eligible.length === 0) break;

      eligible.sort((a, b) => {
        // Priority 1: LOWER current census (moved to first position for edge case fairness)
        if (a.currentCensus !== b.currentCensus) return a.currentCensus - b.currentCensus;
        // Priority 2: Higher remainder value
        if ((b.remainder ?? 0) !== (a.remainder ?? 0)) return (b.remainder ?? 0) - (a.remainder ?? 0);
        // Priority 3: Higher weight
        if (b.weight !== a.weight) return b.weight - a.weight;
        // Priority 4: Alphabetical
        return a.id.localeCompare(b.id);
      });

      eligible[0].quota++;
      eligible[0].remainingQuota++;
      eligible[0].remainder = 0;
      remaining--;
    }

    // Stage A: Home-floor first
    const assignedIndices = new Set<number>();

    const patientsByFloor: Record<string, Array<{ patient: Admission; index: number }>> = {};
    poolAdmissions.forEach((p, idx) => {
      if (!patientsByFloor[p.floor]) patientsByFloor[p.floor] = [];
      patientsByFloor[p.floor].push({ patient: p, index: idx });
    });

    Object.keys(patientsByFloor).forEach(floor => {
      const homeRounder = rounderStates.find(r => !r.isFloating && r.floor === floor);
      if (!homeRounder || homeRounder.remainingQuota === 0) return;

      const floorPatients = patientsByFloor[floor];
      const toAssign = Math.min(homeRounder.remainingQuota, floorPatients.length);

      for (let i = 0; i < toAssign; i++) {
        const { patient, index } = floorPatients[i];
        homeRounder.assignedPatients.push({
          ...patient,
          reason: 'geo_match_within_quota'
        });
        homeRounder.assignedCount++;
        homeRounder.remainingQuota--;
        assignedIndices.add(index);
        result.metrics.geoMatches++;

        assignmentCounter++;
        result.assignmentOrder.push({
          order: assignmentCounter,
          patientId: patient.patientName,
          floor: patient.floor,
          assignedTo: homeRounder.name,
          assignedToId: homeRounder.id,
          assignedFloor: homeRounder.floor,
          reason: 'geo_match_within_quota',
          reasonLabel: 'Geographic Match (Home Floor)'
        });
      }
    });

    // Stage B: Spillover
    poolAdmissions.forEach((patient, idx) => {
      if (assignedIndices.has(idx)) return;

      const eligible = rounderStates.filter(r => r.remainingQuota > 0);
      if (eligible.length === 0) return;

      eligible.sort((a, b) => {
        const aGeoMatch = !a.isFloating && a.floor === patient.floor ? 1 : 0;
        const bGeoMatch = !b.isFloating && b.floor === patient.floor ? 1 : 0;
        if (aGeoMatch !== bGeoMatch) return bGeoMatch - aGeoMatch;

        const aCensus = a.currentCensus + a.assignedCount;
        const bCensus = b.currentCensus + b.assignedCount;
        if (aCensus !== bCensus) return aCensus - bCensus;

        const aRatio = a.quota > 0 ? a.remainingQuota / a.quota : 0;
        const bRatio = b.quota > 0 ? b.remainingQuota / b.quota : 0;
        if (bRatio !== aRatio) return bRatio - aRatio;

        return a.id.localeCompare(b.id);
      });

      const targetRounder = eligible[0];
      const isGeoMatch = !targetRounder.isFloating && targetRounder.floor === patient.floor;

      targetRounder.assignedPatients.push({
        ...patient,
        reason: isGeoMatch ? 'geo_match_within_quota' : 'proportional_within_quota'
      });
      targetRounder.assignedCount++;
      targetRounder.remainingQuota--;

      if (isGeoMatch) {
        result.metrics.geoMatches++;
      } else {
        result.metrics.proportionalAssignments++;
      }

      assignmentCounter++;
      result.assignmentOrder.push({
        order: assignmentCounter,
        patientId: patient.patientName,
        floor: patient.floor,
        assignedTo: targetRounder.name,
        assignedToId: targetRounder.id,
        assignedFloor: targetRounder.floor,
        reason: isGeoMatch ? 'geo_match_within_quota' : 'proportional_within_quota',
        reasonLabel: isGeoMatch ? 'Geographic Match (Within Quota)' : 'Proportional (Quota-Based)'
      });
    });
  }

  // Create summary
  result.summary = rounderStates.map(r => {
    const finalCensus = r.currentCensus + r.assignedCount;
    const finalSlack = Math.max(0, CAP_PATIENTS - finalCensus) / CAP_PATIENTS;
    const finalOverage = Math.max(0, finalCensus - CAP_PATIENTS);

    return {
      rounderId: r.id,
      rounderName: r.name,
      floor: r.floor,
      startCensus: r.currentCensus,
      newAdmissions: r.assignedCount,
      endCensus: finalCensus,
      slack: finalSlack,
      overage: finalOverage,
      hitCap: finalCensus >= CAP_PATIENTS,
      admissions: r.assignedPatients
    };
  });

  result.assignments = rounderStates.reduce((acc, r) => {
    acc[r.id] = r;
    return acc;
  }, {} as Record<TeamLetter, RounderState>);

  return result;
}
