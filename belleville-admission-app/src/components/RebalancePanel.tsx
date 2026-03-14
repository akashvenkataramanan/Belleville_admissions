import { Check, AlertTriangle } from 'lucide-react';
import type { RebalanceResult } from '../utils/rebalanceEngine';

interface RebalancePanelProps {
  rebalance: RebalanceResult;
  onApplyRebalance: (finalCensus: Record<string, number>) => void;
}

export function RebalancePanel({ rebalance, onApplyRebalance }: RebalancePanelProps) {
  if (!rebalance.needed) {
    return (
      <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-green-700">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5" />
          <span className="font-semibold">
            Census is balanced (spread: {rebalance.currentSpread})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-amber-700 space-y-4">
      <div className="flex items-center gap-2 text-amber-400">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-semibold">
          Census spread is {rebalance.currentSpread}. Target: {rebalance.targetLow}-{rebalance.targetHigh} per provider.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-2 text-gray-300">From</th>
              <th className="text-left py-2 px-2 text-gray-300">To</th>
              <th className="text-center py-2 px-2 text-gray-300">Patients to Move</th>
            </tr>
          </thead>
          <tbody>
            {rebalance.transfers.map((t, idx) => (
              <tr key={idx} className="border-b border-gray-700/50">
                <td className="py-2 px-2 text-red-300">{t.fromName}</td>
                <td className="py-2 px-2 text-green-300">{t.toName}</td>
                <td className="py-2 px-2 text-center font-bold text-amber-300">{t.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => onApplyRebalance(rebalance.finalCensus)}
        className="w-full bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded font-semibold transition-colors text-white"
      >
        Apply Rebalance
      </button>
    </div>
  );
}
