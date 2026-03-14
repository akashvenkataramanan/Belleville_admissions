import { useState } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { Rounder, TeamLetter } from '../types';
import { TEAM_FLOORS } from '../types';

interface RounderSetupProps {
  rounders: Rounder[];
  availableTeams: TeamLetter[];
  onUpdateRounder: (id: TeamLetter, field: keyof Rounder, value: string | number | boolean) => void;
  onAddRounder: (teamLetter: TeamLetter) => void;
  onRemoveRounder: (id: TeamLetter) => void;
}

export function RounderSetup({
  rounders,
  availableTeams,
  onUpdateRounder,
  onAddRounder,
  onRemoveRounder
}: RounderSetupProps) {
  const [selectedTeam, setSelectedTeam] = useState<TeamLetter | ''>('');

  const handleAddTeam = () => {
    if (selectedTeam) {
      onAddRounder(selectedTeam);
      setSelectedTeam('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-400 mb-1">Important: Pre-Assignment Required</h3>
            <p className="text-sm text-yellow-200">
              <strong>Before using this calculator:</strong> Manually assign all patients who were admitted yesterday
              by today's rounders back to those same rounders. Include those in the "Current Census" below.
            </p>
            <p className="text-sm text-yellow-200 mt-2">
              This tool only distributes <strong>swing shift and nocturnist admissions</strong> from yesterday.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Team Configuration</h2>
          <span className="text-sm text-gray-400">Teams A-K (excluding H = Admissions)</span>
        </div>

        {/* Add Team Section */}
        {availableTeams.length > 0 && (
          <div className="mb-4 p-3 bg-gray-700/50 border border-gray-600 rounded flex items-center gap-3">
            <label className="text-sm text-gray-300 whitespace-nowrap">Add Team:</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value as TeamLetter | '')}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="">Select team...</option>
              {availableTeams.map(letter => (
                <option key={letter} value={letter}>
                  Team {letter} ({TEAM_FLOORS[letter].floor})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddTeam}
              disabled={!selectedTeam}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-1.5 rounded transition-colors text-white text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Team
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-2">Team</th>
                <th className="text-left py-2 px-2">Rounder Name</th>
                <th className="text-left py-2 px-2">Current Census</th>
                <th className="text-left py-2 px-2">Home Floor</th>
                <th className="text-center py-2 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rounders.map((r) => (
                <tr key={r.id} className="border-b border-gray-700/50">
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      r.isFloating
                        ? 'bg-purple-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {r.id}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => onUpdateRounder(r.id, 'name', e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-full max-w-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      value={r.currentCensus}
                      onChange={(e) => onUpdateRounder(r.id, 'currentCensus', parseInt(e.target.value) || 0)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      min="0"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={r.isFloating ? 'Floating' : r.floor}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue === 'Floating') {
                          onUpdateRounder(r.id, 'floor', 'Floating');
                          onUpdateRounder(r.id, 'isFloating', true);
                        } else {
                          onUpdateRounder(r.id, 'floor', newValue);
                          onUpdateRounder(r.id, 'isFloating', false);
                        }
                      }}
                      className={`rounded px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        r.isFloating
                          ? 'bg-purple-700/50 text-purple-200 border border-purple-600'
                          : 'bg-gray-700 text-gray-200 border border-gray-600'
                      }`}
                    >
                      <option value="1S">1S</option>
                      <option value="1C">1C</option>
                      <option value="2S">2S</option>
                      <option value="2C">2C</option>
                      <option value="3S">3S</option>
                      <option value="4S">4S</option>
                      <option value="2NE">2NE</option>
                      <option value="2N">2N</option>
                      <option value="Floating">Floating</option>
                    </select>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => onRemoveRounder(r.id)}
                      className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={rounders.length <= 1}
                      title={rounders.length <= 1 ? "Must have at least 1 team" : "Remove team"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded">
          <p className="text-sm text-blue-300">
            <strong>Current Census:</strong> Total number of patients this rounder has at the start of the day,
            INCLUDING any patients they personally admitted yesterday (continuity already assigned).
          </p>
        </div>

        <div className="mt-3 p-3 bg-gray-700/50 border border-gray-600 rounded">
          <p className="text-sm text-gray-300">
            <strong>Active Teams:</strong> {rounders.length} |
            <strong className="ml-2">Total Starting Census:</strong> {rounders.reduce((sum, r) => sum + r.currentCensus, 0)}
            {availableTeams.length > 0 && (
              <span className="ml-2 text-gray-400">| <strong>Inactive:</strong> {availableTeams.join(', ')}</span>
            )}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs">B</span>
            <span className="text-gray-400">Fixed Floor Team</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs">A</span>
            <span className="text-gray-400">Floating Team</span>
          </div>
        </div>
      </div>
    </div>
  );
}
