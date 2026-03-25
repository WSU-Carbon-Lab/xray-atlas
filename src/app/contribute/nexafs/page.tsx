"use client";

import { useSession } from "next-auth/react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { ContributionAgreementModal } from "@/components/contribute";
import { trpc } from "~/trpc/client";
import { BrushCleaning } from "lucide-react";
import { Breadcrumbs } from "@heroui/react";
import { Tooltip } from "@heroui/react";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  useNexafsOptions,
  useNexafsDatasets,
  useNexafsSubmit,
  NexafsContributeFlow,
} from "~/features/process-nexafs";
import { useState } from "react";
import {
  NexafsCreateCalibrationDialog,
  NexafsCreateEdgeDialog,
} from "~/components/forms";

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
    clearDatasets,
    columnMappingFile,
    handleColumnMappingConfirm,
    handleColumnMappingClose,
  } = useNexafsDatasets({
    instrumentOptions,
    edgeOptions,
    vendors,
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
  const [newCalibrationDescription, setNewCalibrationDescription] =
    useState("");
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
          onClose={handleAgreementAccepted}
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
        onClose={handleAgreementAccepted}
        onAgree={handleAgreementAccepted}
      />

      <div
        className={`container mx-auto flex flex-col px-4 py-8 ${
          datasets.length > 0 ? "min-h-[calc(100vh-4rem)]" : ""
        }`}
      >
        <div
          className={
            datasets.length > 0
              ? "mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col"
              : "mx-auto w-full max-w-7xl"
          }
        >
          <div className="mb-6 flex shrink-0 items-center justify-between">
            <Breadcrumbs className="text-sm font-medium">
              <Breadcrumbs.Item href="/contribute">
                Contributions
              </Breadcrumbs.Item>
              <Breadcrumbs.Item>NEXAFS</Breadcrumbs.Item>
            </Breadcrumbs>
            <Tooltip delay={0}>
              <button
                type="button"
                onClick={clearForm}
                className="border-border bg-surface text-foreground focus-visible:ring-accent hover:bg-default flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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

          <div
            className={
              datasets.length > 0
                ? "flex min-h-0 w-full flex-1 flex-col"
                : "w-full shrink-0"
            }
          >
            <NexafsContributeFlow
              datasets={datasets}
              activeDatasetId={activeDatasetId}
              updateDataset={updateDataset}
              processDatasetData={processDatasetData}
              handleFilesSelected={handleFilesSelected}
              handleNewDataset={handleNewDataset}
              handleDatasetSelect={handleDatasetSelect}
              handleDatasetRemove={handleDatasetRemove}
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

      <NexafsCreateEdgeDialog
        isOpen={showEdgeDialog}
        onClose={() => setShowEdgeDialog(false)}
        targetAtom={newEdgeTargetAtom}
        onTargetAtomChange={setNewEdgeTargetAtom}
        coreState={newEdgeCoreState}
        onCoreStateChange={setNewEdgeCoreState}
        onCreate={() => void handleCreateEdge()}
        isCreating={createEdgeMutation.isPending}
      />

      <NexafsCreateCalibrationDialog
        isOpen={showCalibrationDialog}
        onClose={() => setShowCalibrationDialog(false)}
        name={newCalibrationName}
        onNameChange={setNewCalibrationName}
        description={newCalibrationDescription}
        onDescriptionChange={setNewCalibrationDescription}
        onCreate={() => void handleCreateCalibration()}
        isCreating={createCalibrationMutation.isPending}
      />
    </>
  );
}
