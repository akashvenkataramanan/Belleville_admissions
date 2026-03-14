import { useState } from 'react';
import { UserPlus, UserMinus, ArrowLeftRight, Eye, Check } from 'lucide-react';
import type { Rounder, TeamLetter, TransitionResult } from '../types';
import { replaceProvider, gainProvider, loseProvider } from '../utils/transitionEngine';

interface SaturdayTransitionProps {
  rounders: Rounder[];
  availableTeams: readonly TeamLetter[];
  onUpdateRounders: (rounders: Rounder[]) => void;
  onAddRounder: (teamLetter: TeamLetter) => void;
  onRemoveRounder: (id: TeamLetter) => void;
}

export function SaturdayTransition({
  rounders,
  availableTeams,
  onUpdateRounders,
  onAddRounder: _onAddRounder,
  onRemoveRounder: _onRemoveRounder,
}: SaturdayTransitionProps) {
  // These are passed through for interface compatibility but used indirectly via onUpdateRounders
  void _onAddRounder;
  void _onRemoveRounder;
  // Replace state
  const [replaceTeam, setReplaceTeam] = useState<TeamLetter | ''>('');
  const [replaceName, setReplaceName] = useState('');
  const [replaceSuccess, setReplaceSuccess] = useState(false);

  // Gain state
  const [gainTeam, setGainTeam] = useState<TeamLetter | ''>('');
  const [gainName, setGainName] = useState('');
  const [gainPreview, setGainPreview] = useState<TransitionResult | null>(null);

  // Lose state
  const [loseTeam, setLoseTeam] = useState<TeamLetter | ''>('');
  const [losePreview, setLosePreview] = useState<TransitionResult | null>(null);

  // ── Replace Handler ──
  const handleReplace = () => {
    if (!replaceTeam || !replaceName.trim()) return;
    const updated = replaceProvider(rounders, replaceTeam, replaceName.trim());
    onUpdateRounders(updated);
    setReplaceSuccess(true);
    setTimeout(() => setReplaceSuccess(false), 2500);
    setReplaceTeam('');
    setReplaceName('');
  };

  // ── Gain Handlers ──
  const handleGainPreview = () => {
    if (!gainTeam || !gainName.trim()) return;
    const result = gainProvider(rounders, gainTeam, gainName.trim());
    setGainPreview(result);
  };

  const handleGainConfirm = () => {
    if (!gainPreview) return;
    onUpdateRounders(gainPreview.updatedRounders);
    setGainTeam('');
    setGainName('');
    setGainPreview(null);
  };

  // ── Lose Handlers ──
  const handleLosePreview = () => {
    if (!loseTeam) return;
    const result = loseProvider(rounders, loseTeam);
    setLosePreview(result);
  };

  const handleLoseConfirm = () => {
    if (!losePreview) return;
    onUpdateRounders(losePreview.updatedRounders);
    setLoseTeam('');
    setLosePreview(null);
  };

  // Build a lookup of original census for the gain preview
  const originalCensus: Record<string, number> = {};
  rounders.forEach(r => {
    originalCensus[r.id] = r.currentCensus;
  });

  return (
    <div className="space-y-4">
      {/* ════════════════════════════════════════════════════════
          Card 1 — Replace Provider
         ════════════════════════════════════════════════════════ */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-5 h-5" />
          Replace Provider
        </h2>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Team</label>
            <select
              value={replaceTeam}
              onChange={e => setReplaceTeam(e.target.value as TeamLetter | '')}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="">Select team...</option>
              {rounders.map(r => (
                <option key={r.id} value={r.id}>
                  Team {r.id} — {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">New Provider Name</label>
            <input
              type="text"
              value={replaceName}
              onChange={e => setReplaceName(e.target.value)}
              placeholder="Enter name..."
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            />
          </div>

          <button
            onClick={handleReplace}
            disabled={!replaceTeam || !replaceName.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-1.5 rounded transition-colors text-white text-sm"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Replace
          </button>
        </div>

        {replaceSuccess && (
          <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
            <Check className="w-4 h-4" />
            Provider replaced successfully.
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          Card 2 — Add Provider (Gain)
         ════════════════════════════════════════════════════════ */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5" />
          Add Provider (Gain)
        </h2>

        {availableTeams.length === 0 ? (
          <p className="text-sm text-gray-400">All teams are already active.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Team to Add</label>
                <select
                  value={gainTeam}
                  onChange={e => {
                    setGainTeam(e.target.value as TeamLetter | '');
                    setGainPreview(null);
                  }}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="">Select team...</option>
                  {availableTeams.map(letter => (
                    <option key={letter} value={letter}>
                      Team {letter}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Provider Name</label>
                <input
                  type="text"
                  value={gainName}
                  onChange={e => {
                    setGainName(e.target.value);
                    setGainPreview(null);
                  }}
                  placeholder="Enter name..."
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>

              <button
                onClick={handleGainPreview}
                disabled={!gainTeam || !gainName.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-1.5 rounded transition-colors text-white text-sm"
              >
                <Eye className="w-4 h-4" />
                Preview Transfers
              </button>
            </div>

            {gainPreview && (
              <div className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2">Team</th>
                        <th className="text-right py-2 px-2">Current Census</th>
                        <th className="text-right py-2 px-2">Change</th>
                        <th className="text-right py-2 px-2">New Census</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gainPreview.updatedRounders.map(r => {
                        const prev = originalCensus[r.id] ?? 0;
                        const change = r.currentCensus - prev;
                        return (
                          <tr key={r.id} className="border-b border-gray-700/50">
                            <td className="py-2 px-2 font-medium">
                              Team {r.id} — {r.name}
                            </td>
                            <td className="py-2 px-2 text-right">{prev}</td>
                            <td
                              className={`py-2 px-2 text-right font-semibold ${
                                change < 0
                                  ? 'text-red-400'
                                  : change > 0
                                  ? 'text-green-400'
                                  : 'text-gray-400'
                              }`}
                            >
                              {change > 0 ? `+${change}` : change}
                            </td>
                            <td className="py-2 px-2 text-right">{r.currentCensus}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 p-3 bg-gray-700/50 border border-gray-600 rounded flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    Max census difference: <strong>{gainPreview.maxDifference}</strong>
                  </span>
                  <button
                    onClick={handleGainConfirm}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded transition-colors text-white text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Confirm &amp; Apply
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          Card 3 — Remove Provider (Lose)
         ════════════════════════════════════════════════════════ */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2 mb-4">
          <UserMinus className="w-5 h-5" />
          Remove Provider (Lose)
        </h2>

        {rounders.length <= 1 ? (
          <p className="text-sm text-gray-400">
            Must have more than 1 active team to remove a provider.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Team to Remove</label>
                <select
                  value={loseTeam}
                  onChange={e => {
                    setLoseTeam(e.target.value as TeamLetter | '');
                    setLosePreview(null);
                  }}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="">Select team...</option>
                  {rounders.map(r => (
                    <option key={r.id} value={r.id}>
                      Team {r.id} — {r.name} (census: {r.currentCensus})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleLosePreview}
                disabled={!loseTeam}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-1.5 rounded transition-colors text-white text-sm"
              >
                <Eye className="w-4 h-4" />
                Preview Distribution
              </button>
            </div>

            {losePreview && (
              <div className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2">Team</th>
                        <th className="text-right py-2 px-2">Current Census</th>
                        <th className="text-right py-2 px-2">Receives</th>
                        <th className="text-right py-2 px-2">New Census</th>
                      </tr>
                    </thead>
                    <tbody>
                      {losePreview.updatedRounders.map(r => {
                        const prev = originalCensus[r.id] ?? 0;
                        const receives = r.currentCensus - prev;
                        return (
                          <tr key={r.id} className="border-b border-gray-700/50">
                            <td className="py-2 px-2 font-medium">
                              Team {r.id} — {r.name}
                            </td>
                            <td className="py-2 px-2 text-right">{prev}</td>
                            <td
                              className={`py-2 px-2 text-right font-semibold ${
                                receives > 0 ? 'text-green-400' : 'text-gray-400'
                              }`}
                            >
                              {receives > 0 ? `+${receives}` : receives}
                            </td>
                            <td className="py-2 px-2 text-right">{r.currentCensus}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 p-3 bg-gray-700/50 border border-gray-600 rounded flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    Max census difference: <strong>{losePreview.maxDifference}</strong>
                  </span>
                  <button
                    onClick={handleLoseConfirm}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded transition-colors text-white text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Confirm &amp; Apply
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
