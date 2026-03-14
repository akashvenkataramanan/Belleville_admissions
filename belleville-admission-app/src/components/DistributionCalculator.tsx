import { Calculator } from 'lucide-react';
import type { DistributionResult } from '../types';
import { calculateRebalance } from '../utils/rebalanceEngine';
import { RebalancePanel } from './RebalancePanel';

interface DistributionCalculatorProps {
  distribution: DistributionResult | null;
  poolCount: number;
  onCalculate: () => void;
  onApplyRebalance?: (finalCensus: Record<string, number>) => void;
}

export function DistributionCalculator({
  distribution,
  poolCount,
  onCalculate,
  onApplyRebalance
}: DistributionCalculatorProps) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Distribution Calculator</h2>

        <button
          onClick={onCalculate}
          disabled={poolCount === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded font-semibold transition-colors flex items-center justify-center gap-2 text-white"
        >
          <Calculator className="w-5 h-5" />
          Calculate Distribution
        </button>

        {distribution && (
          <div className="text-sm text-gray-400 mt-2">
            Patients in pool: {poolCount} | Patients assigned: {distribution.assignmentOrder.length}
            {poolCount !== distribution.assignmentOrder.length && (
              <span className="text-red-400 font-semibold ml-2">
                ⚠ {poolCount - distribution.assignmentOrder.length} patient(s) not assigned!
              </span>
            )}
          </div>
        )}

        {distribution && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-green-400">Distribution Results</h3>

            {/* Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-600 p-4 rounded border-2 border-green-400">
                <p className="text-xs text-green-100 mb-1 font-semibold">Geographic Matches</p>
                <p className="text-3xl font-bold text-white">{distribution.metrics.geoMatches}</p>
              </div>
              <div className="bg-purple-600 p-4 rounded border-2 border-purple-400">
                <p className="text-xs text-purple-100 mb-1 font-semibold">Proportional Assignments</p>
                <p className="text-3xl font-bold text-white">{distribution.metrics.proportionalAssignments}</p>
              </div>
              <div className="bg-orange-600 p-4 rounded border-2 border-orange-400">
                <p className="text-xs text-orange-100 mb-1 font-semibold">Overflow Assignments</p>
                <p className="text-3xl font-bold text-white">{distribution.metrics.overflowAssignments}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-2">Rounder</th>
                    <th className="text-left py-2 px-2">Floor</th>
                    <th className="text-center py-2 px-2">Start</th>
                    <th className="text-center py-2 px-2">+New</th>
                    <th className="text-center py-2 px-2">End</th>
                    <th className="text-left py-2 px-2">Assigned Patients (No PHI)</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.summary.map(s => (
                    <tr key={s.rounderId} className="border-b border-gray-700/50">
                      <td className="py-3 px-2 font-medium">{s.rounderName}</td>
                      <td className="py-3 px-2 text-gray-400 text-xs">{s.floor}</td>
                      <td className="py-3 px-2 text-center">{s.startCensus}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="bg-green-700 text-green-100 px-2 py-1 rounded text-xs">
                          +{s.newAdmissions}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold">
                        <span className="text-green-400">
                          {s.endCensus}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        {s.admissions.length > 0 ? (
                          <div className="space-y-1">
                            {s.admissions.map((a, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-gray-300">{a.patientName}</span>
                                <span className={`text-xs px-1 rounded ${
                                  a.reason === 'geo_match_within_quota' ? 'bg-green-700 text-green-200' :
                                  a.reason === 'proportional_within_quota' ? 'bg-purple-700 text-purple-200' :
                                  a.reason === 'overflow_waterfill' ? 'bg-orange-700 text-orange-200' :
                                  'bg-gray-700 text-gray-200'
                                }`}>
                                  {a.reason === 'geo_match_within_quota' ? 'G' :
                                   a.reason === 'proportional_within_quota' ? 'P' :
                                   a.reason === 'overflow_waterfill' ? 'O' : '?'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-3 text-xs pt-2 border-t border-gray-700">
              <div className="flex items-center gap-1">
                <span className="bg-green-700 text-green-200 px-2 py-1 rounded">G</span>
                <span className="text-gray-400">Geographic Match</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-purple-700 text-purple-200 px-2 py-1 rounded">P</span>
                <span className="text-gray-400">Proportional</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-orange-700 text-orange-200 px-2 py-1 rounded">O</span>
                <span className="text-gray-400">Overflow</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-700 border-2 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-100 font-semibold">Total Census Start</p>
                <p className="text-2xl font-bold text-white">
                  {distribution.summary.reduce((sum, s) => sum + s.startCensus, 0)}
                </p>
              </div>
              <div className="bg-green-700 border-2 border-green-500 p-4 rounded">
                <p className="text-sm text-green-100 font-semibold">Pool Distributed</p>
                <p className="text-2xl font-bold text-white">
                  {distribution.summary.reduce((sum, s) => sum + s.newAdmissions, 0)}
                </p>
              </div>
              <div className="bg-purple-700 border-2 border-purple-500 p-4 rounded">
                <p className="text-sm text-purple-100 font-semibold">Total Census End</p>
                <p className="text-2xl font-bold text-white">
                  {distribution.summary.reduce((sum, s) => sum + s.endCensus, 0)}
                </p>
              </div>
            </div>

            {distribution.summary.length > 0 && onApplyRebalance && (
              <RebalancePanel
                rebalance={calculateRebalance(distribution.summary)}
                onApplyRebalance={onApplyRebalance}
              />
            )}
          </div>
        )}

        {!distribution && (
          <div className="mt-6 text-center text-gray-400 py-8">
            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Run calculation to see distribution results</p>
          </div>
        )}
      </div>
    </div>
  );
}
