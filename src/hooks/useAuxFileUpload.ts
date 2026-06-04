"use client";

import { useCallback } from "react";
import { trpc } from "~/trpc/client";
import {
  sha256HexFromFile,
  type AuxFileScope,
} from "~/lib/aux-file-client";
import type { PendingAuxFile } from "~/features/process-nexafs/types";

export type AuxUploadProgress = Record<string, number>;

type UploadQueuedAuxFilesArgs = {
  scope: AuxFileScope;
  subjectId: string;
  files: PendingAuxFile[];
  onProgress?: (progress: AuxUploadProgress) => void;
};

type UploadQueuedAuxFilesResult = {
  uploaded: number;
  failed: Array<{ clientKey: string; filename: string; message: string }>;
};

/**
 * Uploads queued auxiliary files after sample or experiment records exist.
 */
export async function uploadQueuedAuxFiles(
  utils: ReturnType<typeof trpc.useUtils>,
  args: UploadQueuedAuxFilesArgs,
): Promise<UploadQueuedAuxFilesResult> {
  const { scope, subjectId, files, onProgress } = args;
  const failed: UploadQueuedAuxFilesResult["failed"] = [];
  let uploaded = 0;

  const setProgress = (clientKey: string, value: number) => {
    onProgress?.({ [clientKey]: value });
  };

  for (const entry of files) {
    const { file, kind, description, clientKey } = entry;
    try {
      setProgress(clientKey, 5);
      const mimeType = file.type.trim().toLowerCase();

      const uploadRequest =
        scope === "sample"
          ? await utils.client.sampleFile.requestUploadUrl.mutate({
              sampleId: subjectId,
              upload: {
                mimeType,
                sizeBytes: file.size,
                kind,
                originalFilename: file.name,
                description: description?.trim() ?? undefined,
              },
            })
          : await utils.client.experimentFile.requestUploadUrl.mutate({
              experimentId: subjectId,
              upload: {
                mimeType,
                sizeBytes: file.size,
                kind,
                originalFilename: file.name,
                description: description?.trim() ?? undefined,
              },
            });

      setProgress(clientKey, 25);

      const putResponse = await fetch(uploadRequest.signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": mimeType,
        },
      });

      if (!putResponse.ok) {
        throw new Error(
          `Storage upload failed (${putResponse.status} ${putResponse.statusText})`,
        );
      }

      setProgress(clientKey, 70);
      const checksumSha256 = await sha256HexFromFile(file);
      setProgress(clientKey, 90);

      if (scope === "sample") {
        await utils.client.sampleFile.commitUpload.mutate({
          sampleId: subjectId,
          commit: {
            fileId: uploadRequest.fileId,
            checksumSha256,
          },
        });
      } else {
        await utils.client.experimentFile.commitUpload.mutate({
          experimentId: subjectId,
          commit: {
            fileId: uploadRequest.fileId,
            checksumSha256,
          },
        });
      }

      setProgress(clientKey, 100);
      uploaded += 1;
    } catch (error) {
      failed.push({
        clientKey,
        filename: file.name,
        message:
          error instanceof Error ? error.message : "Auxiliary upload failed.",
      });
      setProgress(clientKey, 0);
    }
  }

  return { uploaded, failed };
}

/**
 * Returns a stable callback that uploads pending aux files through tRPC and storage PUT.
 */
export function useAuxFileUpload() {
  const utils = trpc.useUtils();

  const uploadQueued = useCallback(
    (args: UploadQueuedAuxFilesArgs) => uploadQueuedAuxFiles(utils, args),
    [utils],
  );

  return { uploadQueuedAuxFiles: uploadQueued };
}
