"use client";

import { useState } from "react";
import { Input, Label, ListBox, Select } from "@heroui/react";
import { SimpleDialog } from "~/components/ui/dialog";
import { trpc } from "~/trpc/client";

const CORE_STATES = [
  "K",
  "L",
  "L1",
  "L2",
  "L3",
  "M",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
] as const;

export type AddEdgeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onEdgeCreated: (edgeId: string) => void;
};

export function AddEdgeModal({
  isOpen,
  onClose,
  onEdgeCreated,
}: AddEdgeModalProps) {
  const [targetAtom, setTargetAtom] = useState("");
  const [coreState, setCoreState] = useState<string>("");
  const utils = trpc.useUtils();
  const createEdge = trpc.experiments.createEdge.useMutation({
    onSuccess: async (edge) => {
      await utils.experiments.listEdges.invalidate();
      onEdgeCreated(edge.id);
      handleClose();
    },
  });

  const handleClose = () => {
    setTargetAtom("");
    setCoreState("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const atom = targetAtom.trim().toUpperCase();
    const core = coreState.trim();
    if (!atom || !core) return;
    createEdge.mutate({ targetatom: atom, corestate: core });
  };

  const isValid = targetAtom.trim().length > 0 && coreState.trim().length > 0;

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Add edge"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="edge-element">Element (e.g. C, Zn)</Label>
          <Input
            id="edge-element"
            placeholder="C"
            value={targetAtom}
            onChange={(event) => setTargetAtom(event.target.value)}
            autoCapitalize="characters"
            maxLength={4}
            required
            aria-required
          />
        </div>
        <Select
          placeholder="Select"
          isRequired
          aria-required
          value={coreState || null}
          onChange={(value) => {
            setCoreState(
              value == null ? "" : String(Array.isArray(value) ? value[0] : value),
            );
          }}
        >
          <Label>Core state</Label>
          <Select.Trigger className="min-h-[44px]">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Core states">
              {CORE_STATES.map((c) => (
                <ListBox.Item key={c} textValue={c}>
                  {c}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {createEdge.isError && (
          <p className="text-danger text-sm" role="alert">
            {createEdge.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="border-border bg-surface hover:bg-surface-2 rounded-md border px-3 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || createEdge.isPending}
            className="bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed"
          >
            {createEdge.isPending ? "Adding..." : "Add edge"}
          </button>
        </div>
      </form>
    </SimpleDialog>
  );
}
