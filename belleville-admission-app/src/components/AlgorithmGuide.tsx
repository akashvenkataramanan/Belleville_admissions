import { CAP_PATIENTS, ALPHA } from '../types';

export function AlgorithmGuide() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Simplified Slack-Based Distribution Algorithm</h2>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Overview</h3>
            <p className="text-gray-300">
              This algorithm distributes swing shift and nocturnist admissions among rounders fairly,
              prioritizing geographic matches (patients on a rounder's home floor) while respecting
              capacity constraints.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Algorithm Parameters</h3>
            <div className="bg-gray-700/50 p-3 rounded">
              <p className="text-gray-300">
                <strong>CAP_PATIENTS:</strong> {CAP_PATIENTS} (maximum patients per rounder)
              </p>
              <p className="text-gray-300 mt-1">
                <strong>ALPHA:</strong> {ALPHA} (weight exponent for slack calculation)
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Key Concepts</h3>
            <div className="space-y-3">
              <div className="bg-gray-700/50 p-3 rounded">
                <h4 className="font-semibold text-blue-300">Slack</h4>
                <p className="text-gray-300">
                  Remaining capacity as a fraction: (CAP - currentCensus) / CAP.
                  Higher slack means more available capacity.
                </p>
              </div>
              <div className="bg-gray-700/50 p-3 rounded">
                <h4 className="font-semibold text-blue-300">Weight</h4>
                <p className="text-gray-300">
                  Slack raised to power ALPHA (slack^{ALPHA}).
                  Used to calculate proportional quotas.
                </p>
              </div>
              <div className="bg-gray-700/50 p-3 rounded">
                <h4 className="font-semibold text-blue-300">Quota</h4>
                <p className="text-gray-300">
                  Number of patients each rounder should receive, based on their weight
                  relative to total weight of all rounders.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Distribution Modes</h3>
            <div className="space-y-3">
              <div className="bg-green-900/30 border-l-4 border-green-500 p-3 rounded">
                <h4 className="font-semibold text-green-300">Normal Mode</h4>
                <p className="text-gray-300">
                  When total capacity across all rounders exceeds number of admissions.
                  Uses quota-based distribution with geographic priority.
                </p>
              </div>
              <div className="bg-orange-900/30 border-l-4 border-orange-500 p-3 rounded">
                <h4 className="font-semibold text-orange-300">Overflow Mode</h4>
                <p className="text-gray-300">
                  When admissions exceed total capacity.
                  Uses water-filling algorithm to minimize maximum overage.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Assignment Types</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="bg-green-700 text-green-200 px-3 py-1 rounded text-xs font-semibold">G</span>
                <span className="text-gray-300">Geographic Match: Patient assigned to rounder on their floor</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-purple-700 text-purple-200 px-3 py-1 rounded text-xs font-semibold">P</span>
                <span className="text-gray-300">Proportional: Assigned based on quota with no geographic match</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-orange-700 text-orange-200 px-3 py-1 rounded text-xs font-semibold">O</span>
                <span className="text-gray-300">Overflow: Assigned during overflow mode to minimize overage</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Variable Rounder Support</h3>
            <p className="text-gray-300">
              This tool supports any number of rounders (1 or more). The algorithm automatically
              adjusts quotas and distributions based on the number of active rounders and their
              respective capacities.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
