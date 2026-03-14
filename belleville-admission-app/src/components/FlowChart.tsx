import { Download, BarChart3 } from 'lucide-react';
import type { DistributionResult } from '../types';

interface FlowChartProps {
  distribution: DistributionResult | null;
}

export function FlowChart({ distribution }: FlowChartProps) {
  const downloadPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4 flow-chart-container">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Patient Flow Visualization</h2>
          {distribution && (
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors no-print text-white font-semibold"
            >
              <Download className="w-4 h-4" />
              Download PDF / Print
            </button>
          )}
        </div>

        {distribution ? (
          <div className="space-y-6">
            <div className="bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded no-print">
              <div className="flex gap-3 items-start">
                <Download className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-blue-300">How to save as PDF:</strong>
                  <span className="text-blue-200 ml-2">
                    Click the green button above, then in the print dialog select "Save as PDF" as your destination/printer.
                  </span>
                </div>
              </div>
            </div>

            <div className="print-only mb-6">
              <h1 className="text-2xl font-bold mb-2">Belleville Memorial Hospital</h1>
              <h2 className="text-xl mb-1">Admission Distribution Report</h2>
              <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              <p className="text-sm text-gray-600">By: Akash Venkataramanan</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-700 border-2 border-blue-500 p-3 rounded">
                <p className="text-xs text-blue-100 mb-1 font-semibold">Total Census Start</p>
                <p className="text-2xl font-bold text-white">{distribution.summary.reduce((sum, s) => sum + s.startCensus, 0)}</p>
              </div>
              <div className="bg-green-700 border-2 border-green-500 p-3 rounded">
                <p className="text-xs text-green-100 mb-1 font-semibold">Pool Distributed</p>
                <p className="text-2xl font-bold text-white">{distribution.summary.reduce((sum, s) => sum + s.newAdmissions, 0)}</p>
              </div>
              <div className="bg-purple-700 border-2 border-purple-500 p-3 rounded">
                <p className="text-xs text-purple-100 mb-1 font-semibold">Total Census End</p>
                <p className="text-2xl font-bold text-white">{distribution.summary.reduce((sum, s) => sum + s.endCensus, 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-600 border-2 border-green-400 p-3 rounded">
                <p className="text-xs text-green-100 font-semibold mb-1">Geographic Matches</p>
                <p className="text-xl font-bold text-white">{distribution.metrics.geoMatches}</p>
              </div>
              <div className="bg-purple-600 border-2 border-purple-400 p-3 rounded">
                <p className="text-xs text-purple-100 font-semibold mb-1">Proportional</p>
                <p className="text-xl font-bold text-white">{distribution.metrics.proportionalAssignments}</p>
              </div>
              <div className="bg-orange-600 border-2 border-orange-400 p-3 rounded">
                <p className="text-xs text-orange-100 font-semibold mb-1">Overflow</p>
                <p className="text-xl font-bold text-white">{distribution.metrics.overflowAssignments}</p>
              </div>
            </div>

            <div className="overflow-x-auto pb-4">
              <div className="min-w-[600px]">
                {distribution.summary.map(s => (
                  <div key={s.rounderId} className="flex items-center gap-4 mb-3 flow-chart-item">
                    <div className="w-32 text-right">
                      <div className="text-sm font-medium">{s.rounderName}</div>
                      <div className="text-xs text-gray-400">{s.floor}</div>
                    </div>

                    <div className="flex items-center">
                      <div className="bg-blue-600 px-3 py-2 rounded text-sm font-semibold min-w-[50px] text-center text-white">
                        {s.startCensus}
                      </div>
                    </div>

                    <div className="flex items-center flex-1">
                      <div className="h-0.5 bg-gradient-to-r from-blue-500 to-green-500 flex-1 min-w-[100px]"></div>
                      {s.newAdmissions > 0 && (
                        <div className="bg-green-600 px-2 py-1 rounded text-xs font-semibold mx-2 text-white">
                          +{s.newAdmissions}
                        </div>
                      )}
                      <div className="h-0.5 bg-gradient-to-r from-green-500 to-purple-500 flex-1 min-w-[100px]"></div>
                    </div>

                    <div className="flex items-center">
                      <div className={`px-3 py-2 rounded text-sm font-semibold min-w-[50px] text-center text-white ${
                        'bg-purple-600'
                      }`}>
                        {s.endCensus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Starting Census</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Pool Assignments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded"></div>
                <span>Under Cap</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>At/Over Cap</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Calculate distribution first to see patient flow</p>
            <p className="text-sm mt-1">Go to Distribution tab and run the calculator</p>
          </div>
        )}
      </div>
    </div>
  );
}
