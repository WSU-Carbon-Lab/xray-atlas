import { useCallback, useRef, useState } from "react";
import { scrubMolfileCustomLabels } from "../utils/alkyl-label-expand";

const HISTORY_MAX = 5;

export function useMolfileHistory(initialMolfile: string) {
  const molfileRef = useRef<string>(initialMolfile);
  const displayedMolRef = useRef<string>(initialMolfile);
  const burstStartRef = useRef<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const historyMuteRef = useRef(false);

  const [molfile, setMolfile] = useState(initialMolfile);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const commitHistoryPoint = useCallback((snapshot: string) => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = undefined;
    burstStartRef.current = null;
    setUndoStack((u) => [...u, snapshot].slice(-HISTORY_MAX));
    setRedoStack([]);
  }, []);

  const onEditorChange = useCallback((raw: string) => {
    if (historyMuteRef.current) {
      historyMuteRef.current = false;
      const scrubbed = scrubMolfileCustomLabels(raw);
      molfileRef.current = scrubbed;
      displayedMolRef.current = scrubbed;
      setMolfile(scrubbed);
      burstStartRef.current = null;
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = undefined;
      return;
    }
    const scrubbed = scrubMolfileCustomLabels(raw);
    if (scrubbed === displayedMolRef.current) return;
    burstStartRef.current ??= displayedMolRef.current;
    molfileRef.current = scrubbed;
    displayedMolRef.current = scrubbed;
    setMolfile(scrubbed);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = undefined;
      const start = burstStartRef.current;
      burstStartRef.current = null;
      if (start !== null && start !== scrubbed) {
        setUndoStack((u) => [...u, start].slice(-HISTORY_MAX));
        setRedoStack([]);
      }
    }, 420);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((u) => {
      if (u.length === 0) return u;
      const prev = u[u.length - 1]!;
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = undefined;
      burstStartRef.current = null;
      historyMuteRef.current = true;
      const cur = molfileRef.current;
      setRedoStack((r) => [cur, ...r].slice(0, HISTORY_MAX));
      molfileRef.current = prev;
      displayedMolRef.current = prev;
      setMolfile(prev);
      return u.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[0]!;
      historyMuteRef.current = true;
      const cur = molfileRef.current;
      setUndoStack((u) => [...u, cur].slice(-HISTORY_MAX));
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
      return r.slice(1);
    });
  }, []);

  return {
    molfile,
    setMolfile,
    molfileRef,
    displayedMolRef,
    burstStartRef,
    idleTimerRef,
    historyMuteRef,
    commitHistoryPoint,
    onEditorChange,
    undo,
    redo,
    undoStack,
    redoStack,
  };
}
