import { Plus, Trash2, AlertCircle, Users } from 'lucide-react';
import type { Admission, Rounder } from '../types';
import { FLOORS } from '../types';

interface AdmissionsInputProps {
  admissions: Admission[];
  rounders: Rounder[];
  onAddAdmission: () => void;
  onRemoveAdmission: (id: number) => void;
  onUpdateAdmission: (id: number, field: keyof Admission, value: string) => void;
}

export function AdmissionsInput({
  admissions,
  rounders,
  onAddAdmission,
  onRemoveAdmission,
  onUpdateAdmission
}: AdmissionsInputProps) {
  const poolCount = admissions.filter(a => a.admittedBy === 'non-rounder').length;

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-400 mb-1">Pool Definition</h3>
            <p className="text-sm text-blue-200">
              Only add patients admitted yesterday by <strong>swing shift or nocturnists</strong>.
              Patients admitted by rounders should already be assigned (see Setup tab).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-900/30 border-l-4 border-red-500 p-4 rounded">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-400 mb-1">PHI Protection Required</h3>
            <p className="text-sm text-red-200">
              <strong>Do NOT enter:</strong> Patient names, medical record numbers (MRNs), room numbers, dates of birth,
              or any other Protected Health Information. Use generic identifiers only (e.g., "Patient 1", "Patient A", "Admit #1").
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-400">Swing + Nocturnist Admissions Pool</h2>
          <button
            onClick={onAddAdmission}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors text-white"
          >
            <Plus className="w-4 h-4" />
            Add Admission
          </button>
        </div>

        {admissions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No admissions added yet</p>
            <p className="text-sm mt-1">Click "Add Admission" to start</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-2">Patient ID (No PHI)</th>
                  <th className="text-left py-2 px-2">Admitted By</th>
                  <th className="text-left py-2 px-2">Floor</th>
                  <th className="text-center py-2 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map(a => (
                  <tr key={a.id} className="border-b border-gray-700/50">
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={a.patientName}
                        onChange={(e) => onUpdateAdmission(a.id, 'patientName', e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-full max-w-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={a.admittedBy}
                        onChange={(e) => onUpdateAdmission(a.id, 'admittedBy', e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      >
                        <option value="non-rounder">Swing/Nocturnist</option>
                        {rounders.map(r => (
                          <option key={r.id} value={`team-${r.id}`}>Team {r.id} - {r.name} (manual)</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={a.floor}
                        onChange={(e) => onUpdateAdmission(a.id, 'floor', e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      >
                        {FLOORS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2 text-center">
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
        )}

        <div className="mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded">
          <p className="text-sm text-green-300">
            <strong>Total Pool Admissions:</strong> {poolCount}
            <span className="text-gray-400 ml-2">
              (Only "Swing/Nocturnist" admissions will be distributed by the algorithm)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
