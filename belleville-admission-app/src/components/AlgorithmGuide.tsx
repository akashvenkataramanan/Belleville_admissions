import { ALPHA } from '../types';

export function AlgorithmGuide() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Uniform End-Census Distribution Algorithm</h2>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Overview</h3>
            <p className="text-gray-300">
              This algorithm distributes swing shift and nocturnist admissions among rounders fairly,
              targeting a uniform end census (within 1-2 patients) while prioritizing geographic
              matches (patients on a rounder's home floor).
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Algorithm Parameters</h3>
            <div className="bg-gray-700/50 p-3 rounded">
              <p className="text-gray-300">
                <strong>ALPHA:</strong> {ALPHA} (weight exponent for slack calculation)
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Key Concepts</h3>
            <div className="space-y-3">
              <div className="bg-gray-700/50 p-3 rounded">
                <h4 className="font-semibold text-blue-300">Target End Census</h4>
                <p className="text-gray-300">
                  The algorithm calculates a target end census so all rounders finish
                  within 1 patient of each other: (totalCurrentCensus + admissions) / numRounders.
                </p>
              </div>
              <div className="bg-gray-700/50 p-3 rounded">
                <h4 className="font-semibold text-blue-300">Quota</h4>
                <p className="text-gray-300">
                  Number of patients each rounder should receive to reach the target end census.
                  Rounders with lower current census get more patients.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Distribution Stages</h3>
            <div className="space-y-3">
              <div className="bg-green-900/30 border-l-4 border-green-500 p-3 rounded">
                <h4 className="font-semibold text-green-300">Stage A: Home Floor</h4>
                <p className="text-gray-300">
                  Patients are assigned to the rounder whose home floor matches the patient's floor,
                  up to that rounder's quota.
                </p>
              </div>
              <div className="bg-purple-900/30 border-l-4 border-purple-500 p-3 rounded">
                <h4 className="font-semibold text-purple-300">Stage B: Spillover</h4>
                <p className="text-gray-300">
                  Remaining patients are distributed to rounders with remaining quota,
                  preferring geographic matches, then lowest current census.
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
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Variable Rounder Support</h3>
            <p className="text-gray-300">
              This tool supports any number of rounders (1 or more). The algorithm automatically
              adjusts quotas and distributions based on the number of active rounders.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
