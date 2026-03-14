import { useState, useMemo } from 'react';
import { Upload, Trash2, AlertCircle } from 'lucide-react';
import { FLOORS } from '../types';

interface BulkImportProps {
  onImport: (admissions: Array<{ floor: string; patientName: string }>) => void;
}

export function BulkImport({ onImport }: BulkImportProps) {
  const [text, setText] = useState('');

  const parsed = useMemo(() => {
    if (!text.trim()) return { valid: [], errors: [] };

    const lines = text.split('\n');
    const valid: Array<{ floor: string; patientName: string }> = [];
    const errors: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const dashIdx = line.indexOf('-');
      if (dashIdx === -1) {
        errors.push(line);
        continue;
      }

      const floorPart = line.substring(0, dashIdx).trim();

      // Try exact match first
      let matchedFloor = (FLOORS as readonly string[]).find(f => f === floorPart);

      // Case-insensitive fallback
      if (!matchedFloor) {
        matchedFloor = (FLOORS as readonly string[]).find(
          f => f.toLowerCase() === floorPart.toLowerCase()
        );
      }

      if (!matchedFloor) {
        errors.push(line);
        continue;
      }

      valid.push({ floor: matchedFloor, patientName: line });
    }

    return { valid, errors };
  }, [text]);

  const handleImport = () => {
    if (parsed.valid.length > 0) {
      onImport(parsed.valid);
      setText('');
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={8}
        placeholder={`Paste one patient per line: floor-room\nExamples:\n2N-201\n3S-302\n1C-115\n2N-205`}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
      />

      {text.trim() && (
        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            <span className="text-green-400 font-semibold">{parsed.valid.length}</span> valid
            {parsed.errors.length > 0 && (
              <span className="ml-2">
                | <span className="text-red-400 font-semibold">{parsed.errors.length}</span> invalid
              </span>
            )}
          </p>

          {parsed.errors.length > 0 && (
            <div className="bg-red-900/30 border border-red-700/50 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400 font-medium">Invalid lines (floor not recognized):</span>
              </div>
              <div className="space-y-1">
                {parsed.errors.map((line, i) => (
                  <div key={i} className="text-sm text-red-300 font-mono">{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleImport}
          disabled={parsed.valid.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors text-white text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          Import All ({parsed.valid.length})
        </button>
        <button
          onClick={() => setText('')}
          disabled={!text}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors text-white text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
