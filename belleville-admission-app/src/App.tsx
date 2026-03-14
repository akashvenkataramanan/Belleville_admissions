import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Settings, Plus, Calculator, Users, BarChart3, BookOpen, ArrowLeftRight, Wand2, Undo2 } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useUndoStack } from './hooks/useUndoStack';
import { calculateDistribution } from './utils/distributionAlgorithm';
import { Header } from './components/Header';
import { RounderSetup } from './components/RounderSetup';
import { AdmissionsInput } from './components/AdmissionsInput';
import { DistributionCalculator } from './components/DistributionCalculator';
import { AssignmentOrder } from './components/AssignmentOrder';
import { FlowChart } from './components/FlowChart';
import { AlgorithmGuide } from './components/AlgorithmGuide';
import { SaturdayTransition } from './components/SaturdayTransition';
import { WeekendWizard } from './components/WeekendWizard';
import type {
  Rounder,
  Admission,
  DistributionResult,
  Tab,
  TeamLetter
} from './types';
import { createDefaultRounders, TEAM_LETTERS, TEAM_FLOORS } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('setup');
  const [wizardMode, setWizardMode] = useState(true);

  // Fully persisted rounder state (including census)
  const [rounders, setRounders] = useLocalStorage<Rounder[]>(
    'belleville-rounders-v2',
    createDefaultRounders()
  );

  // Admissions state (not persisted - resets each session)
  const [admissions, setAdmissions] = useState<Admission[]>([]);

  // Distribution results
  const [distribution, setDistribution] = useState<DistributionResult | null>(null);

  // Undo stack
  const { pushSnapshot, undo, canUndo, undoLabel } = useUndoStack();

  // Ref to capture state on focus for text/number inputs
  const focusSnapshotRef = useRef<{ saved: boolean }>({ saved: false });

  const snapshot = useCallback((label: string) => {
    pushSnapshot({ rounders, admissions, distribution, label });
  }, [pushSnapshot, rounders, admissions, distribution]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) {
      setRounders(prev.rounders);
      setAdmissions(prev.admissions);
      setDistribution(prev.distribution);
    }
  }, [undo, setRounders]);

  // Ctrl+Z / Cmd+Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        // Don't intercept if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo]);

  // Save snapshot on focus for text/number fields (before editing begins)
  const handleFieldFocus = useCallback(() => {
    if (!focusSnapshotRef.current.saved) {
      snapshot('Edit field');
      focusSnapshotRef.current.saved = true;
    }
  }, [snapshot]);

  const handleFieldBlur = useCallback(() => {
    focusSnapshotRef.current.saved = false;
  }, []);

  // Calculate available teams (not currently active)
  const availableTeams = useMemo(() => {
    const activeIds = new Set(rounders.map(r => r.id));
    return TEAM_LETTERS.filter(letter => !activeIds.has(letter));
  }, [rounders]);

  // Tab definitions
  const tabs: Tab[] = [
    { id: 'setup', label: 'Rounder Setup', icon: Settings },
    { id: 'transition', label: 'Transitions', icon: ArrowLeftRight },
    { id: 'admissions', label: 'New Admissions', icon: Plus },
    { id: 'calculator', label: 'Distribution', icon: Calculator },
    { id: 'assignments', label: 'Assignment Order', icon: Users },
    { id: 'sankey', label: 'Flow Chart', icon: BarChart3 },
    { id: 'legend', label: 'Algorithm Guide', icon: BookOpen }
  ];

  // Rounder update handler
  const updateRounder = useCallback((id: TeamLetter, field: keyof Rounder, value: string | number | boolean) => {
    if (field === 'name' || field === 'currentCensus' || field === 'floor' || field === 'isFloating') {
      setRounders(prev =>
        prev.map(r => r.id === id ? { ...r, [field]: value } : r)
      );
    }
  }, [setRounders]);

  // Add a team back to the active roster
  const addRounder = useCallback((teamLetter: TeamLetter) => {
    snapshot('Add team');
    const teamInfo = TEAM_FLOORS[teamLetter];
    const newRounder: Rounder = {
      id: teamLetter,
      name: `Team ${teamLetter}`,
      floor: teamInfo.floor,
      isFloating: teamInfo.isFloating,
      currentCensus: 0
    };

    // Insert in correct order (A, B, C, D, E, F, G, I, J, K)
    setRounders(prev => {
      const newList = [...prev, newRounder];
      return newList.sort((a, b) => a.id.localeCompare(b.id));
    });
  }, [setRounders, snapshot]);

  // Remove a team from active roster
  const removeRounder = useCallback((id: TeamLetter) => {
    if (rounders.length <= 1) return; // Keep at least one rounder
    snapshot('Remove team');
    setRounders(prev => prev.filter(r => r.id !== id));
  }, [rounders.length, setRounders, snapshot]);

  // Admission handlers
  const addAdmission = useCallback(() => {
    snapshot('Add admission');
    setAdmissions(prev => [...prev, {
      id: Date.now() + Math.random(),
      admittedBy: 'non-rounder',
      floor: '1S',
      patientName: `Patient ${prev.length + 1}`
    }]);
  }, [snapshot]);

  const removeAdmission = useCallback((id: number) => {
    snapshot('Remove admission');
    setAdmissions(prev => prev.filter(a => a.id !== id));
  }, [snapshot]);

  const updateAdmission = useCallback((id: number, field: keyof Admission, value: string) => {
    setAdmissions(prev =>
      prev.map(a => a.id === id ? { ...a, [field]: value } : a)
    );
  }, []);

  // Distribution calculation
  const handleCalculate = useCallback(() => {
    snapshot('Calculate distribution');
    const result = calculateDistribution(rounders, admissions);
    setDistribution(result);
  }, [rounders, admissions, snapshot]);

  const setRoundersDirectly = useCallback((newRounders: Rounder[]) => {
    snapshot('Update rounders');
    setRounders(newRounders);
  }, [setRounders, snapshot]);

  const handleApplyRebalance = useCallback((finalCensus: Record<string, number>) => {
    snapshot('Apply rebalance');
    setRounders(prev => prev.map(r => ({
      ...r,
      currentCensus: finalCensus[r.id] ?? r.currentCensus
    })));
    setDistribution(null); // Clear old results since census changed
  }, [setRounders, snapshot]);

  const bulkAddAdmissions = useCallback((items: Array<{ floor: string; patientName: string }>) => {
    snapshot('Bulk add admissions');
    const newAdmissions: Admission[] = items.map((item, i) => ({
      id: Date.now() + i + Math.random(),
      admittedBy: 'non-rounder',
      floor: item.floor,
      patientName: item.patientName
    }));
    setAdmissions(prev => [...prev, ...newAdmissions]);
  }, [snapshot]);

  const updateDistribution = useCallback((newDistribution: DistributionResult) => {
    snapshot('Reassign patient');
    setDistribution(newDistribution);
  }, [snapshot]);

  const clearSession = useCallback(() => {
    setAdmissions([]);
    setDistribution(null);
  }, []);

  const poolCount = admissions.filter(a => a.admittedBy === 'non-rounder').length;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />

      {/* Mode Toggle + Undo */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWizardMode(!wizardMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              wizardMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            {wizardMode ? 'Wizard Mode' : 'Tab Mode'}
          </button>
        </div>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed"
          title={canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'}
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>
      </div>

      {wizardMode ? (
        /* Wizard Mode */
        <div className="p-4 max-w-7xl mx-auto">
          <WeekendWizard
            rounders={rounders}
            admissions={admissions}
            distribution={distribution}
            availableTeams={availableTeams}
            onUpdateRounder={updateRounder}
            onUpdateRounders={setRoundersDirectly}
            onAddRounder={addRounder}
            onRemoveRounder={removeRounder}
            onAddAdmission={addAdmission}
            onRemoveAdmission={removeAdmission}
            onUpdateAdmission={updateAdmission}
            onBulkAddAdmissions={bulkAddAdmissions}
            onCalculate={handleCalculate}
            onApplyRebalance={handleApplyRebalance}
            onUpdateDistribution={updateDistribution}
            onClearSession={clearSession}
            poolCount={poolCount}
            onFieldFocus={handleFieldFocus}
            onFieldBlur={handleFieldBlur}
          />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-gray-800 border-b border-gray-700 px-2 overflow-x-auto no-print">
            <div className="flex gap-1 min-w-max">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400 bg-gray-750'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-w-7xl mx-auto">
            {activeTab === 'setup' && (
              <RounderSetup
                rounders={rounders}
                availableTeams={availableTeams}
                onUpdateRounder={updateRounder}
                onAddRounder={addRounder}
                onRemoveRounder={removeRounder}
              />
            )}

            {activeTab === 'transition' && (
              <SaturdayTransition
                rounders={rounders}
                availableTeams={availableTeams}
                onUpdateRounders={setRoundersDirectly}
                onAddRounder={addRounder}
                onRemoveRounder={removeRounder}
              />
            )}

            {activeTab === 'admissions' && (
              <AdmissionsInput
                admissions={admissions}
                rounders={rounders}
                onAddAdmission={addAdmission}
                onRemoveAdmission={removeAdmission}
                onUpdateAdmission={updateAdmission}
              />
            )}

            {activeTab === 'calculator' && (
              <DistributionCalculator
                distribution={distribution}
                poolCount={poolCount}
                onCalculate={handleCalculate}
                onApplyRebalance={handleApplyRebalance}
                onUpdateDistribution={updateDistribution}
              />
            )}

            {activeTab === 'assignments' && (
              <AssignmentOrder distribution={distribution} />
            )}

            {activeTab === 'sankey' && (
              <FlowChart distribution={distribution} />
            )}

            {activeTab === 'legend' && (
              <AlgorithmGuide />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
