import { Users } from 'lucide-react';
import type { DistributionResult } from '../types';

interface AssignmentOrderProps {
  distribution: DistributionResult | null;
}

export function AssignmentOrder({ distribution }: AssignmentOrderProps) {
  // Sort assignments by patient number instead of assignment order
  const sortedAssignments = distribution && distribution.assignmentOrder
    ? [...distribution.assignmentOrder].sort((a, b) => {
        // Extract numeric part from patient ID for proper sorting
        const aNum = parseInt(a.patientId.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.patientId.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      })
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Patient-by-Patient Assignment Order</h2>

        {distribution && distribution.assignmentOrder && distribution.assignmentOrder.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded">
              <p className="text-sm text-blue-200">
                Patients sorted by patient number showing their assigned rounder and team.
                Use this to make changes in Epic.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-700">
                    <th className="text-left py-3 px-3 bg-gray-700/50">Patient ID (No PHI)</th>
                    <th className="text-left py-3 px-3 bg-gray-700/50">Patient Floor</th>
                    <th className="text-left py-3 px-3 bg-gray-700/50">Assigned Rounder</th>
                    <th className="text-center py-3 px-3 bg-gray-700/50">Team</th>
                    <th className="text-left py-3 px-3 bg-gray-700/50">Rounder's Floor</th>
                    <th className="text-left py-3 px-3 bg-gray-700/50">Assignment Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssignments.map((assignment, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                        idx % 2 === 0 ? 'bg-gray-800/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-medium">
                        {assignment.patientId}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-gray-600 px-2 py-1 rounded text-xs">
                          {assignment.floor}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-green-400">
                          {assignment.assignedTo}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-blue-600 px-3 py-1 rounded font-bold text-white">
                          {assignment.assignedToId}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-gray-600 px-2 py-1 rounded text-xs">
                          {assignment.assignedFloor}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          assignment.reason === 'geo_match_within_quota'
                            ? 'bg-green-700 text-green-200'
                            : assignment.reason === 'proportional_within_quota'
                            ? 'bg-purple-700 text-purple-200'
                            : 'bg-orange-700 text-orange-200'
                        }`}>
                          {assignment.reasonLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <p className="text-xs text-gray-400 mb-1">Total Patients Assigned</p>
                <p className="text-2xl font-bold text-white">{distribution.assignmentOrder.length}</p>
              </div>
              <div className="bg-green-700/30 p-3 rounded border border-green-600">
                <p className="text-xs text-green-300 mb-1">Geographic Matches</p>
                <p className="text-2xl font-bold text-green-400">{distribution.metrics.geoMatches}</p>
              </div>
              <div className="bg-purple-700/30 p-3 rounded border border-purple-600">
                <p className="text-xs text-purple-300 mb-1">Proportional/Overflow</p>
                <p className="text-2xl font-bold text-purple-400">
                  {distribution.metrics.proportionalAssignments + distribution.metrics.overflowAssignments}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No assignments yet</p>
            <p className="text-sm mt-1">Run the distribution calculator first</p>
          </div>
        )}
      </div>
    </div>
  );
}
