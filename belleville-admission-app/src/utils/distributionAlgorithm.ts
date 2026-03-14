import type {
  Rounder,
  Admission,
  DistributionResult,
  RounderState,
  TeamLetter
} from '../types';

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
  const rounderStates: RounderState[] = rounders.map(r => ({
    ...r,
    weight: 0,
    assignedPatients: [],
    assignedCount: 0,
    quota: 0,
    remainingQuota: 0
  }));

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
      admissions: []
    }));
    return result;
  }

  const N = poolAdmissions.length;

  // Target-end-census approach
  // Goal: make all providers end at the same census (within 1-2)
  const totalCurrentCensus = rounderStates.reduce((sum, r) => sum + r.currentCensus, 0);
  const totalEnd = totalCurrentCensus + N;
  const numRounders = rounderStates.length;
  const targetEndLow = Math.floor(totalEnd / numRounders);
  const targetEndHigh = targetEndLow + 1;
  const numAtHigh = totalEnd % numRounders;

  // Calculate ideal quota for each rounder to reach target end census
  // Sort by current census descending -- highest-census providers get targetEndLow first
  const sortedForTarget = [...rounderStates].sort((a, b) => b.currentCensus - a.currentCensus);
  let highSlotsRemaining = numAtHigh;

  sortedForTarget.forEach(r => {
    let targetEnd: number;
    if (highSlotsRemaining > 0 && r.currentCensus <= targetEndHigh) {
      targetEnd = targetEndHigh;
      highSlotsRemaining--;
    } else {
      targetEnd = targetEndLow;
    }

    // Quota = how many new patients to reach target (minimum 0)
    r.quota = Math.max(0, targetEnd - r.currentCensus);
    r.remainingQuota = r.quota;
  });

  // Distribute any unassigned remainder (from rounding constraints)
  // Give to provider with lowest projected end census
  let assigned = rounderStates.reduce((sum, r) => sum + r.quota, 0);
  let remaining = N - assigned;

  while (remaining > 0) {
    const sorted = [...rounderStates].sort((a, b) => {
      const aProjected = a.currentCensus + a.quota;
      const bProjected = b.currentCensus + b.quota;
      if (aProjected !== bProjected) return aProjected - bProjected;
      return a.id.localeCompare(b.id);
    });

    sorted[0].quota++;
    sorted[0].remainingQuota++;
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

  // Safety net: assign any remaining unassigned patients
  poolAdmissions.forEach((patient, idx) => {
    if (assignedIndices.has(idx)) return;
    const alreadyAssigned = result.assignmentOrder.some(a => a.patientId === patient.patientName);
    if (alreadyAssigned) return;

    const sorted = [...rounderStates].sort((a, b) => {
      const aTotal = a.currentCensus + a.assignedCount;
      const bTotal = b.currentCensus + b.assignedCount;
      if (aTotal !== bTotal) return aTotal - bTotal;
      return a.id.localeCompare(b.id);
    });

    const targetRounder = sorted[0];
    targetRounder.assignedPatients.push({ ...patient, reason: 'safety_catchall' });
    targetRounder.assignedCount++;
    assignedIndices.add(idx);
    result.metrics.proportionalAssignments++;

    assignmentCounter++;
    result.assignmentOrder.push({
      order: assignmentCounter,
      patientId: patient.patientName,
      floor: patient.floor,
      assignedTo: targetRounder.name,
      assignedToId: targetRounder.id,
      assignedFloor: targetRounder.floor,
      reason: 'safety_catchall',
      reasonLabel: 'Safety Catchall (Unmatched)'
    });
  });

  // Create summary
  result.summary = rounderStates.map(r => ({
    rounderId: r.id,
    rounderName: r.name,
    floor: r.floor,
    startCensus: r.currentCensus,
    newAdmissions: r.assignedCount,
    endCensus: r.currentCensus + r.assignedCount,
    admissions: r.assignedPatients
  }));

  result.assignments = rounderStates.reduce((acc, r) => {
    acc[r.id] = r;
    return acc;
  }, {} as Record<TeamLetter, RounderState>);

  return result;
}
