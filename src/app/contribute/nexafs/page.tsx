"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { DefaultButton as Button } from "@/components/ui/button";
import { SignInButton } from "@/components/auth/sign-in-button";
import {
  ContributionAgreementModal,
} from "@/components/contribute";
import { SimpleDialog } from "@/components/ui/dialog";
import { FieldTooltip } from "@/components/ui/field-tooltip";
import { trpc } from "~/trpc/client";
import {
  ArrowLeftIcon,
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { BrushCleaning } from "lucide-react";
import { Label, Input } from "@heroui/react";
import { Tooltip } from "@heroui/react";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  useNexafsOptions,
  useNexafsDatasets,
  useNexafsSubmit,
  NexafsContributeFlow,
} from "~/features/nexafs-contribute";
import { useState } from "react";

export default function NEXAFSContributePage() {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const handleAgreementAccepted = () => setShowAgreementModal(false);

  const {
    instrumentOptions,
    edgeOptions,
    calibrationOptions,
    vendors,
    isLoadingInstruments,
    isLoadingEdges,
    isLoadingCalibrations,
    isLoadingVendors,
  } = useNexafsOptions();

  const {
    datasets,
    activeDatasetId,
    updateDataset,
    processDatasetData,
    handleFilesSelected,
    handleNewDataset,
    handleDatasetSelect,
    handleDatasetRemove,
    handleDatasetRename,
    clearDatasets,
    columnMappingFile,
    handleColumnMappingConfirm,
    handleColumnMappingClose,
  } = useNexafsDatasets({
    instrumentOptions,
    edgeOptions,
    showToast,
  });

  const { submit, submitStatus, setSubmitStatus, isPending } = useNexafsSubmit(
    datasets,
    { onSuccess: clearDatasets },
  );

  const [showEdgeDialog, setShowEdgeDialog] = useState(false);
  const [newEdgeTargetAtom, setNewEdgeTargetAtom] = useState("");
  const [newEdgeCoreState, setNewEdgeCoreState] = useState("");
  const createEdgeMutation = trpc.experiments.createEdge.useMutation();

  const handleCreateEdge = async () => {
    if (!newEdgeTargetAtom.trim() || !newEdgeCoreState.trim()) return;
    try {
      await createEdgeMutation.mutateAsync({
        targetatom: newEdgeTargetAtom.trim(),
        corestate: newEdgeCoreState.trim(),
      });
      await utils.experiments.listEdges.invalidate();
      setShowEdgeDialog(false);
      setNewEdgeTargetAtom("");
      setNewEdgeCoreState("");
    } catch (error) {
      console.error("Failed to create edge", error);
    }
  };

  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [newCalibrationName, setNewCalibrationName] = useState("");
  const [newCalibrationDescription, setNewCalibrationDescription] = useState("");
  const createCalibrationMutation =
    trpc.experiments.createCalibrationMethod.useMutation();

  const handleCreateCalibration = async () => {
    if (!newCalibrationName.trim()) return;
    try {
      await createCalibrationMutation.mutateAsync({
        name: newCalibrationName.trim(),
        description: newCalibrationDescription.trim() || undefined,
      });
      await utils.experiments.listCalibrationMethods.invalidate();
      setShowCalibrationDialog(false);
      setNewCalibrationName("");
      setNewCalibrationDescription("");
    } catch (error) {
      console.error("Failed to create calibration method", error);
    }
  };

  const clearForm = () => {
    clearDatasets();
    setSubmitStatus(undefined);
  };

  if (!isSignedIn) {
    return (
      <>
        <ContributionAgreementModal
          isOpen={showAgreementModal}
          onClose={() => {}}
          onAgree={handleAgreementAccepted}
        />
        <div className="container mx-auto flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-foreground mb-4 text-3xl font-bold">
              Sign In Required
            </h1>
            <p className="text-muted mb-8">
              You must be signed in to contribute NEXAFS experiments.
            </p>
            <div className="flex justify-center">
              <SignInButton variant="primary">Sign In</SignInButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ContributionAgreementModal
        isOpen={showAgreementModal}
        onClose={() => {}}
        onAgree={handleAgreementAccepted}
      />

      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col px-4 py-8">
        <div className="mx-auto w-full max-w-7xl flex min-h-0 flex-1 flex-col">
          <div className="mb-6 flex shrink-0 items-center justify-between">
            <Link
              href="/contribute"
              className="text-foreground hover:text-accent inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" /> Back to contribution options
            </Link>
            <Tooltip delay={0}>
              <button
                type="button"
                onClick={clearForm}
                className="border-border bg-surface text-foreground focus-visible:ring-accent flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <BrushCleaning className="h-4 w-4" />
                <span>Clear Form</span>
              </button>
              <Tooltip.Content className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg">
                Clear all uploaded datasets and reset the form
              </Tooltip.Content>
            </Tooltip>
          </div>

          <ToastContainer toasts={toasts} onRemove={removeToast} />
          <h1 className="text-foreground mb-3 text-4xl font-bold">
            Upload NEXAFS Experiment
          </h1>
          <p className="text-muted mb-8 text-lg">
            Contribute Near-Edge X-ray Absorption Fine Structure (NEXAFS) data
            including sample metadata, geometry, and spectral measurements. You
            can upload multiple datasets and process them through tabs.
          </p>

          <div className="flex w-full min-h-0 flex-1 flex-col">
            <NexafsContributeFlow
              datasets={datasets}
              activeDatasetId={activeDatasetId}
              updateDataset={updateDataset}
              processDatasetData={processDatasetData}
              handleFilesSelected={handleFilesSelected}
              handleNewDataset={handleNewDataset}
              handleDatasetSelect={handleDatasetSelect}
              handleDatasetRemove={handleDatasetRemove}
              handleDatasetRename={handleDatasetRename}
              columnMappingFile={columnMappingFile}
              handleColumnMappingConfirm={handleColumnMappingConfirm}
              handleColumnMappingClose={handleColumnMappingClose}
              instrumentOptions={instrumentOptions}
              edgeOptions={edgeOptions}
              calibrationOptions={calibrationOptions}
              vendors={vendors}
              isLoadingInstruments={isLoadingInstruments}
              isLoadingEdges={isLoadingEdges}
              isLoadingCalibrations={isLoadingCalibrations}
              isLoadingVendors={isLoadingVendors}
              submit={submit}
              submitStatus={submitStatus}
              setSubmitStatus={setSubmitStatus}
              isPending={isPending}
            />
          </div>
        </div>
      </div>

      <SimpleDialog
        isOpen={showEdgeDialog}
        onClose={() => setShowEdgeDialog(false)}
        title="Create New Edge"
      >
        <div className="space-y-4">
          <div>
            <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
              Target Atom
              <span className="text-red-500">*</span>
              <FieldTooltip description="The target atom for the absorption edge (e.g., C for carbon K-edge)" />
            </Label>
            <Input
              name="targetAtom"
              value={newEdgeTargetAtom}
              onChange={(e) => setNewEdgeTargetAtom(e.target.value)}
              placeholder="e.g., C, N, O"
              required
              className="form-input"
              aria-label="Target atom"
            />
          </div>
          <div>
            <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
              Core State
              <span className="text-red-500">*</span>
              <FieldTooltip description="The core state of the electron (e.g., K for K-edge)" />
            </Label>
            <Input
              name="coreState"
              value={newEdgeCoreState}
              onChange={(e) => setNewEdgeCoreState(e.target.value)}
              placeholder="e.g., K, L1, L2, L3"
              required
              className="form-input"
              aria-label="Core state"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Tooltip delay={0}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEdgeDialog(false)}
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Tooltip.Content className="tooltip-content-panel">
                Cancel creating a new edge
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0}>
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateEdge}
                isDisabled={createEdgeMutation.isPending}
              >
                {createEdgeMutation.isPending ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Edge</span>
                  </>
                )}
              </Button>
              <Tooltip.Content className="tooltip-content-panel">
                Create a new absorption edge with the specified target atom and
                core state
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={showCalibrationDialog}
        onClose={() => setShowCalibrationDialog(false)}
        title="Create New Calibration Method"
      >
        <div className="space-y-4">
          <div>
            <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
              Name
              <span className="text-red-500">*</span>
              <FieldTooltip description="The name of the calibration method" />
            </Label>
            <Input
              name="calibrationName"
              value={newCalibrationName}
              onChange={(e) => setNewCalibrationName(e.target.value)}
              placeholder="e.g., Carbon K-edge calibration"
              required
              className="form-input"
              aria-label="Calibration method name"
            />
          </div>
          <div>
            <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
              Description
              <FieldTooltip description="Additional details about the calibration method" />
            </Label>
            <textarea
              name="calibrationDescription"
              value={newCalibrationDescription}
              onChange={(e) => setNewCalibrationDescription(e.target.value)}
              placeholder="Optional description of the calibration method"
              rows={3}
              className="form-input min-h-[80px] resize-y"
              aria-label="Calibration method description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Tooltip delay={0}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCalibrationDialog(false)}
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Tooltip.Content className="tooltip-content-panel">
                Cancel creating a new calibration method
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={0}>
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateCalibration}
                isDisabled={createCalibrationMutation.isPending}
              >
                {createCalibrationMutation.isPending ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Method</span>
                  </>
                )}
              </Button>
              <Tooltip.Content className="tooltip-content-panel">
                Create a new calibration method with the specified name and
                description
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </SimpleDialog>
    </>
  );
}
