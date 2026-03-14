import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Trash2, Check } from 'lucide-react';
import type { Rounder, Admission, DistributionResult, TeamLetter, WizardStep, CensusSnapshot } from '../types';
import { SaturdayTransition } from './SaturdayTransition';
import { BulkImport } from './BulkImport';
import { CensusSnapshotView } from './CensusSnapshot';
import { AssignmentOrder } from './AssignmentOrder';
import { FlowChart } from './FlowChart';
import { DistributionCalculator } from './DistributionCalculator';

interface WeekendWizardProps {
  rounders: Rounder[];
  admissions: Admission[];
  distribution: DistributionResult | null;
  availableTeams: readonly TeamLetter[];
  onUpdateRounder: (id: TeamLetter, field: keyof Rounder, value: string | number | boolean) => void;
  onUpdateRounders: (rounders: Rounder[]) => void;
  onAddRounder: (teamLetter: TeamLetter) => void;
  onRemoveRounder: (id: TeamLetter) => void;
  onAddAdmission: () => void;
  onRemoveAdmission: (id: number) => void;
  onUpdateAdmission: (id: number, field: keyof Admission, value: string) => void;
  onBulkAddAdmissions: (items: Array<{ floor: string; patientName: string }>) => void;
  onCalculate: () => void;
  onApplyRebalance: (finalCensus: Record<string, number>) => void;
  onClearSession: () => void;
  poolCount: number;
}

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'census', label: 'Census' },
  { key: 'transitions', label: 'Transitions' },
  { key: 'admissions', label: 'Admissions' },
  { key: 'distribute', label: 'Distribute' },
  { key: 'review', label: 'Review' },
];

export function WeekendWizard({
  rounders,
  admissions,
  distribution,
  availableTeams,
  onUpdateRounder,
  onUpdateRounders,
  onAddRounder,
  onRemoveRounder,
  onAddAdmission,
  onRemoveAdmission,
  onUpdateAdmission,
  onBulkAddAdmissions,
  onCalculate,
  onApplyRebalance,
  onClearSession,
  poolCount,
}: WeekendWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('census');
  const [preSnapshot, setPreSnapshot] = useState<CensusSnapshot | null>(null);
  const [postSnapshot, setPostSnapshot] = useState<CensusSnapshot | null>(null);
  const [showTransitions, setShowTransitions] = useState(false);
  const [quickFill, setQuickFill] = useState<number>(0);

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  const goNext = useCallback(() => {
    if (stepIndex < STEPS.length - 1) setCurrentStep(STEPS[stepIndex + 1].key);
  }, [stepIndex]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) setCurrentStep(STEPS[stepIndex - 1].key);
  }, [stepIndex]);

  const savePreSnapshot = () => {
    const data: Record<string, number> = {};
    rounders.forEach(r => { data[r.id] = r.currentCensus; });
    setPreSnapshot({ timestamp: Date.now(), label: 'Pre-distribution', data });
    goNext();
  };

  const handleCalculateAndSnapshot = () => {
    onCalculate();
    // Post-snapshot will be saved after distribution renders via effect-like approach
    // Save it immediately based on current census + pool
    setTimeout(() => {
      const data: Record<string, number> = {};
      rounders.forEach(r => { data[r.id] = r.currentCensus; });
      // We'll update post snapshot when distribution results are available
    }, 0);
  };

  // Save post snapshot when distribution becomes available
  const savePostSnapshot = useCallback(() => {
    if (distribution && !postSnapshot) {
      const data: Record<string, number> = {};
      distribution.summary.forEach(s => { data[s.rounderId] = s.endCensus; });
      setPostSnapshot({ timestamp: Date.now(), label: 'Post-distribution', data });
    }
  }, [distribution, postSnapshot]);

  // Trigger post snapshot save when on distribute step with results
  if (currentStep === 'distribute' && distribution && !postSnapshot) {
    savePostSnapshot();
  }

  const handleStartNew = () => {
    onClearSession();
    setPreSnapshot(null);
    setPostSnapshot(null);
    setShowTransitions(false);
    setQuickFill(0);
    setCurrentStep('census');
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 no-print">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const isCompleted = i < stepIndex;
            const isCurrent = i === stepIndex;
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (i <= stepIndex) setCurrentStep(step.key);
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isCompleted
                        ? 'bg-green-600 text-white cursor-pointer'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 cursor-default'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                  </button>
                  <span className={`text-xs mt-1 ${
                    isCurrent ? 'text-blue-400 font-semibold' : isCompleted ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    i < stepIndex ? 'bg-green-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {/* ──── Step 1: Census ──── */}
        {currentStep === 'census' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-400 mb-1">Step 1: Enter Starting Census</h2>
              <p className="text-sm text-gray-400">Enter the current patient count for each active provider.</p>
            </div>

            {/* Quick Fill */}
            <div className="flex items-center gap-3 p-3 bg-gray-700/50 border border-gray-600 rounded">
              <label className="text-sm text-gray-300 whitespace-nowrap">Quick fill:</label>
              <input
                type="number"
                value={quickFill}
                onChange={e => setQuickFill(parseInt(e.target.value) || 0)}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-20 text-white focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              <button
                onClick={() => {
                  rounders.forEach(r => onUpdateRounder(r.id, 'currentCensus', quickFill));
                }}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm text-white transition-colors"
              >
                Apply to All
              </button>
            </div>

            {/* Census Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-2">Team</th>
                    <th className="text-left py-2 px-2">Provider Name</th>
                    <th className="text-left py-2 px-2">Floor</th>
                    <th className="text-left py-2 px-2">Current Census</th>
                  </tr>
                </thead>
                <tbody>
                  {rounders.map(r => (
                    <tr key={r.id} className="border-b border-gray-700/50">
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          r.isFloating ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {r.id}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={r.name}
                          onChange={e => onUpdateRounder(r.id, 'name', e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-full max-w-[150px] text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-2 text-gray-400 text-xs">{r.floor}</td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={r.currentCensus}
                          onChange={e => onUpdateRounder(r.id, 'currentCensus', parseInt(e.target.value) || 0)}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-20 text-white focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-gray-700/50 border border-gray-600 rounded">
              <p className="text-sm text-gray-300">
                <strong>Total Starting Census:</strong> {rounders.reduce((s, r) => s + r.currentCensus, 0)}
              </p>
            </div>

            <button
              onClick={savePreSnapshot}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded font-semibold text-white transition-colors"
            >
              Save Snapshot & Continue
            </button>
          </div>
        )}

        {/* ──── Step 2: Transitions ──── */}
        {currentStep === 'transitions' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-400 mb-1">Step 2: Provider Changes (Optional)</h2>
              <p className="text-sm text-gray-400">Handle any provider replacements, additions, or removals.</p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-700/50 border border-gray-600 rounded">
              <label className="text-sm text-gray-300">Any provider changes today?</label>
              <button
                onClick={() => setShowTransitions(!showTransitions)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showTransitions ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  showTransitions ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {showTransitions && (
              <SaturdayTransition
                rounders={rounders}
                availableTeams={availableTeams}
                onUpdateRounders={onUpdateRounders}
                onAddRounder={onAddRounder}
                onRemoveRounder={onRemoveRounder}
              />
            )}
          </div>
        )}

        {/* ──── Step 3: Admissions ──── */}
        {currentStep === 'admissions' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-400 mb-1">Step 3: Enter Admissions</h2>
              <p className="text-sm text-gray-400">Add swing shift and nocturnist admissions to the pool.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bulk Import */}
              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-3">Bulk Import (Paste floor-room)</h3>
                <BulkImport onImport={onBulkAddAdmissions} />
              </div>

              {/* Manual Entry */}
              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">Manual Entry</h3>
                <button
                  onClick={onAddAdmission}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm text-white transition-colors mb-3"
                >
                  + Add Admission
                </button>
                <p className="text-xs text-gray-400">Add one at a time, then edit floor and details below.</p>
              </div>
            </div>

            {/* Current Admissions List */}
            {admissions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-300">
                  Current Admissions ({admissions.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2">Patient ID</th>
                        <th className="text-left py-2 px-2">Floor</th>
                        <th className="text-center py-2 px-2">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admissions.map(a => (
                        <tr key={a.id} className="border-b border-gray-700/50">
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={a.patientName}
                              onChange={e => onUpdateAdmission(a.id, 'patientName', e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-full max-w-[150px] text-white text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={a.floor}
                              onChange={e => onUpdateAdmission(a.id, 'floor', e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              {(['1S', '1C', '2S', '2C', '3S', '4S', '2NE', '2N'] as const).map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => onRemoveAdmission(a.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded">
              <p className="text-sm text-green-300">
                <strong>Pool Count:</strong> {poolCount} patients ready for distribution
              </p>
            </div>
          </div>
        )}

        {/* ──── Step 4: Distribute ──── */}
        {currentStep === 'distribute' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-400 mb-1">Step 4: Calculate Distribution</h2>
              <p className="text-sm text-gray-400">Run the algorithm to distribute {poolCount} patients.</p>
            </div>

            <DistributionCalculator
              distribution={distribution}
              poolCount={poolCount}
              onCalculate={() => {
                handleCalculateAndSnapshot();
              }}
              onApplyRebalance={onApplyRebalance}
            />
          </div>
        )}

        {/* ──── Step 5: Review ──── */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-blue-400 mb-1">Step 5: Review & Export</h2>
              <p className="text-sm text-gray-400">Review the final distribution and export results.</p>
            </div>

            {/* Census Comparison */}
            <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-400 mb-3">Census Comparison</h3>
              <CensusSnapshotView
                preSnapshot={preSnapshot}
                postSnapshot={postSnapshot}
                rounders={rounders}
              />
            </div>

            {/* Assignment Order */}
            <AssignmentOrder distribution={distribution} />

            {/* Flow Chart */}
            <FlowChart distribution={distribution} />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold transition-colors no-print"
              >
                <Download className="w-4 h-4" />
                Download PDF / Print
              </button>
              <button
                onClick={handleStartNew}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white transition-colors no-print"
              >
                <RotateCcw className="w-4 h-4" />
                Start New Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between no-print">
        <button
          onClick={goBack}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {currentStep !== 'review' && currentStep !== 'census' && currentStep !== 'distribute' && (
          <button
            onClick={goNext}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {currentStep === 'distribute' && distribution && (
          <button
            onClick={goNext}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white transition-colors"
          >
            Review Results
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
