import { Users, AlertCircle } from 'lucide-react';

export function Header() {
  return (
    <>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
            <Users className="w-7 h-7" />
            Belleville Memorial Hospital Admission Flowchart
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Weekend admission assignment tool • <span className="text-blue-300">by Akash Venkataramanan</span>
          </p>
        </div>
      </div>

      {/* PHI Warning Banner */}
      <div className="bg-red-900/40 border-l-4 border-red-500 p-3 no-print">
        <div className="flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="text-sm">
            <strong className="text-red-300">PHI Warning:</strong>
            <span className="text-red-200 ml-2">
              Do not enter Protected Health Information (patient names, MRNs, room numbers, dates of birth).
              Use generic identifiers only (e.g., "Patient 1", "Patient 2").
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
