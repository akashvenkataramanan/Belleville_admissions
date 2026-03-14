import { useState, useCallback, useMemo } from 'react';
import { Settings, Plus, Calculator, Users, BarChart3, BookOpen } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateDistribution } from './utils/distributionAlgorithm';
import { Header } from './components/Header';
import { RounderSetup } from './components/RounderSetup';
import { AdmissionsInput } from './components/AdmissionsInput';
import { DistributionCalculator } from './components/DistributionCalculator';
import { AssignmentOrder } from './components/AssignmentOrder';
import { FlowChart } from './components/FlowChart';
import { AlgorithmGuide } from './components/AlgorithmGuide';
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

  // Fully persisted rounder state (including census)
  const [rounders, setRounders] = useLocalStorage<Rounder[]>(
    'belleville-rounders-v2',
    createDefaultRounders()
  );

  // Admissions state (not persisted - resets each session)
  const [admissions, setAdmissions] = useState<Admission[]>([]);

  // Distribution results
  const [distribution, setDistribution] = useState<DistributionResult | null>(null);

  // Calculate available teams (not currently active)
  const availableTeams = useMemo(() => {
    const activeIds = new Set(rounders.map(r => r.id));
    return TEAM_LETTERS.filter(letter => !activeIds.has(letter));
  }, [rounders]);

  // Tab definitions
  const tabs: Tab[] = [
    { id: 'setup', label: 'Rounder Setup', icon: Settings },
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
  }, [setRounders]);

  // Remove a team from active roster
  const removeRounder = useCallback((id: TeamLetter) => {
    if (rounders.length <= 1) return; // Keep at least one rounder
    setRounders(prev => prev.filter(r => r.id !== id));
  }, [rounders.length, setRounders]);

  // Admission handlers
  const addAdmission = useCallback(() => {
    setAdmissions(prev => [...prev, {
      id: Date.now() + Math.random(),
      admittedBy: 'non-rounder',
      floor: '1S',
      patientName: `Patient ${prev.length + 1}`
    }]);
  }, []);

  const removeAdmission = useCallback((id: number) => {
    setAdmissions(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAdmission = useCallback((id: number, field: keyof Admission, value: string) => {
    setAdmissions(prev =>
      prev.map(a => a.id === id ? { ...a, [field]: value } : a)
    );
  }, []);

  // Distribution calculation
  const handleCalculate = useCallback(() => {
    const result = calculateDistribution(rounders, admissions);
    setDistribution(result);
  }, [rounders, admissions]);

  const poolCount = admissions.filter(a => a.admittedBy === 'non-rounder').length;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />

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
    </div>
  );
}

export default App;
