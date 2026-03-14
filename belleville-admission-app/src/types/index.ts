// Team letters (A-K, excluding H which is admissions)
export const TEAM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'J', 'K', 'L'] as const;
export type TeamLetter = typeof TEAM_LETTERS[number];

// Fixed team floor assignments (cannot be changed)
export const TEAM_FLOORS: Record<TeamLetter, { floor: string; isFloating: boolean }> = {
  'A': { floor: 'Floating', isFloating: true },
  'B': { floor: '2N', isFloating: false },
  'C': { floor: '3S', isFloating: false },
  'D': { floor: '1C', isFloating: false },
  'E': { floor: 'Floating', isFloating: true },
  'F': { floor: '2NE', isFloating: false },
  'G': { floor: 'Floating', isFloating: true },
  'I': { floor: '2C', isFloating: false },
  'J': { floor: '4S', isFloating: false },
  'K': { floor: '2S', isFloating: false },
  'L': { floor: 'Floating', isFloating: true },
};

// Rounder state (fully persisted to localStorage)
export interface Rounder {
  id: TeamLetter;
  name: string;
  floor: string;
  isFloating: boolean;
  currentCensus: number;
}

// Patient admission
export interface Admission {
  id: number;
  admittedBy: string; // 'non-rounder' or 'team-{letter}'
  floor: string;
  patientName: string;
}

// Assignment tracking for display
export interface Assignment {
  order: number;
  patientId: string;
  floor: string;
  assignedTo: string;
  assignedToId: TeamLetter;
  assignedFloor: string;
  reason: string;
  reasonLabel: string;
}

// Summary for each rounder after distribution
export interface RounderSummary {
  rounderId: TeamLetter;
  rounderName: string;
  floor: string;
  startCensus: number;
  newAdmissions: number;
  endCensus: number;
  admissions: Array<Admission & { reason: string }>;
}

// Distribution algorithm result
export interface DistributionResult {
  assignments: Record<TeamLetter, RounderState>;
  summary: RounderSummary[];
  assignmentOrder: Assignment[];
  metrics: {
    geoMatches: number;
    proportionalAssignments: number;
    overflowAssignments: number;
  };
}

// Internal state during algorithm execution
export interface RounderState extends Rounder {
  weight: number;
  assignedPatients: Array<Admission & { reason: string }>;
  assignedCount: number;
  quota: number;
  remainingQuota: number;
  remainder?: number;
}

// Tab definition
export interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Floor options (for patient floor selection, not team floors)
export const FLOORS = ['1S', '1C', '2S', '2C', '3S', '4S', '2NE', '2N'] as const;
export type Floor = typeof FLOORS[number];

// Algorithm constants
export const ALPHA = 0.88; // Increased from 0.685 to reduce disparity between high/low census doctors

// Default teams (excludes surge team L)
export const DEFAULT_TEAM_LETTERS: readonly TeamLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'J', 'K'];

// Helper to create default rounders
export function createDefaultRounders(): Rounder[] {
  return DEFAULT_TEAM_LETTERS.map(letter => ({
    id: letter,
    name: `Team ${letter}`,
    floor: TEAM_FLOORS[letter].floor,
    isFloating: TEAM_FLOORS[letter].isFloating,
    currentCensus: 0
  }));
}

// Saturday transition types
export type TransitionType = 'replace' | 'gain' | 'lose';

export interface TransferInstruction {
  fromTeam: TeamLetter;
  fromName: string;
  toTeam: TeamLetter;
  toName: string;
  patientCount: number;
}

export interface TransitionResult {
  transfers: TransferInstruction[];
  updatedRounders: Rounder[];
  finalCensus: Record<string, number>;
  maxDifference: number;
}

// Wizard types
export type WizardStep = 'census' | 'transitions' | 'admissions' | 'distribute' | 'review';

export interface CensusSnapshot {
  timestamp: number;
  label: string;
  data: Record<string, number>;
}
