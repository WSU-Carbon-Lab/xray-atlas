"use client";

import { useCallback, useRef, useState } from "react";
import type { PinnedInspectPoint } from "../types";

export type UseInspectPinsResult = {
  pins: PinnedInspectPoint[];
  selectedPinId: string | null;
  addPin: (energy: number) => string;
  removePin: (id: string) => void;
  updatePinEnergy: (id: string, energy: number) => void;
  selectPin: (id: string | null) => void;
  clearPins: () => void;
};

function makePinId(seq: number, energy: number): string {
  return `pin-${seq}-${energy.toFixed(3)}`;
}

/**
 * Lightweight client-side state container for inspect pins on the spectrum
 * plot. Pins are never persisted; this hook only exposes the imperative
 * operations the plot needs to add, move, delete, and select pins, and keeps
 * a stable list ordering so the popover "Pin N" labels stay consistent while
 * any given pin exists.
 *
 * Returns
 * -------
 * pins : PinnedInspectPoint[]
 *     Current pin list in insertion order.
 * selectedPinId : string | null
 *     The id of the most recently interacted pin (used for stacking order
 *     of popovers and emphasized rail styling).
 * addPin : (energy: number) => string
 *     Appends a pin and returns its new id.
 * removePin : (id: string) => void
 *     Drops the pin with the given id and clears selection if it matched.
 * updatePinEnergy : (id: string, energy: number) => void
 *     Updates the axis position of an existing pin (fast path for drag).
 * selectPin : (id: string | null) => void
 *     Marks a pin as the active pin without mutating positions.
 * clearPins : () => void
 *     Removes all pins.
 */
export function useInspectPins(): UseInspectPinsResult {
  const [pins, setPins] = useState<PinnedInspectPoint[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const seqRef = useRef(0);

  const addPin = useCallback((energy: number) => {
    const next = ++seqRef.current;
    const id = makePinId(next, energy);
    setPins((prev) => [...prev, { id, energy }]);
    setSelectedPinId(id);
    return id;
  }, []);

  const removePin = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
    setSelectedPinId((prev) => (prev === id ? null : prev));
  }, []);

  const updatePinEnergy = useCallback((id: string, energy: number) => {
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, energy } : p)),
    );
  }, []);

  const selectPin = useCallback((id: string | null) => {
    setSelectedPinId(id);
  }, []);

  const clearPins = useCallback(() => {
    setPins([]);
    setSelectedPinId(null);
  }, []);

  return {
    pins,
    selectedPinId,
    addPin,
    removePin,
    updatePinEnergy,
    selectPin,
    clearPins,
  };
}
