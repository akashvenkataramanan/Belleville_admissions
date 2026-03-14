import { useState, useCallback } from 'react';
import type { Rounder, Admission, DistributionResult } from '../types';

export interface UndoSnapshot {
  rounders: Rounder[];
  admissions: Admission[];
  distribution: DistributionResult | null;
  label: string;
}

const MAX_SNAPSHOTS = 50;

export function useUndoStack() {
  const [stack, setStack] = useState<UndoSnapshot[]>([]);

  const pushSnapshot = useCallback((snapshot: UndoSnapshot) => {
    const cloned = structuredClone(snapshot);
    setStack(prev => {
      const next = [...prev, cloned];
      if (next.length > MAX_SNAPSHOTS) next.shift();
      return next;
    });
  }, []);

  const undo = useCallback((): UndoSnapshot | null => {
    let popped: UndoSnapshot | null = null;
    setStack(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      popped = next.pop()!;
      return next;
    });
    return popped;
  }, []);

  const canUndo = stack.length > 0;
  const undoLabel = stack.length > 0 ? stack[stack.length - 1].label : '';

  return { pushSnapshot, undo, canUndo, undoLabel };
}
