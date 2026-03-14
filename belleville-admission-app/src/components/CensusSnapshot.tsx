import type { CensusSnapshot as CensusSnapshotType, Rounder } from '../types';

interface CensusSnapshotProps {
  preSnapshot: CensusSnapshotType | null;
  postSnapshot: CensusSnapshotType | null;
  rounders: Rounder[];
}

export function CensusSnapshotView({ preSnapshot, postSnapshot, rounders }: CensusSnapshotProps) {
  if (!preSnapshot && !postSnapshot) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No census snapshots yet.</p>
      </div>
    );
  }

  if (preSnapshot && !postSnapshot) {
    return (
      <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-sm text-blue-200">
          Pre-distribution census recorded. Run distribution to see comparison.
        </p>
      </div>
    );
  }

  if (!preSnapshot || !postSnapshot) return null;

  // Build comparison rows
  const allKeys = new Set([...Object.keys(preSnapshot.data), ...Object.keys(postSnapshot.data)]);
  const rows = rounders
    .filter(r => allKeys.has(r.id))
    .map(r => {
      const pre = preSnapshot.data[r.id] ?? 0;
      const post = postSnapshot.data[r.id] ?? 0;
      const delta = post - pre;
      return { id: r.id, name: r.name, pre, post, delta };
    });

  const totalPre = rows.reduce((s, r) => s + r.pre, 0);
  const totalPost = rows.reduce((s, r) => s + r.post, 0);
  const totalDelta = totalPost - totalPre;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-700">
            <th className="text-left py-2 px-3">Team</th>
            <th className="text-left py-2 px-3">Provider</th>
            <th className="text-center py-2 px-3">Pre-Census</th>
            <th className="text-center py-2 px-3">Post-Census</th>
            <th className="text-center py-2 px-3">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b border-gray-700/50">
              <td className="py-2 px-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs">
                  {r.id}
                </span>
              </td>
              <td className="py-2 px-3">{r.name}</td>
              <td className="py-2 px-3 text-center">{r.pre}</td>
              <td className="py-2 px-3 text-center font-semibold">{r.post}</td>
              <td className={`py-2 px-3 text-center font-semibold ${
                r.delta > 0 ? 'text-green-400' : r.delta < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {r.delta > 0 ? `+${r.delta}` : r.delta}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-600 font-bold">
            <td className="py-2 px-3" colSpan={2}>Totals</td>
            <td className="py-2 px-3 text-center">{totalPre}</td>
            <td className="py-2 px-3 text-center">{totalPost}</td>
            <td className={`py-2 px-3 text-center ${
              totalDelta > 0 ? 'text-green-400' : totalDelta < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
