"use client";

import React, { memo, useEffect, useState } from "react";
import Image from "next/image";
import { Copy } from "lucide-react";
import { Tag, TagGroup } from "@heroui/react";
import { useSession } from "next-auth/react";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";
import { useRealtimeUpvotes } from "~/hooks/useRealtimeUpvotes";
import type { MoleculeView } from "~/types/molecule";
import {
  CAS_FAVICON_URL,
  PUBCHEM_FAVICON_URL,
} from "./molecule-display-constants";
import {
  casUrl,
  copyTextToClipboard,
  getCommonNames,
  pubChemUrl,
  shortestSynonymsFromOrdered,
} from "./molecule-display-helpers";
import { MoleculeImageSVG } from "./molecule-image-svg";
import type { MoleculeCardContext, MoleculeCardProps } from "./molecule-card-types";
import { CompactCard } from "./molecule-compact-card";
import { FullCard, FullCardCarousel } from "./molecule-full-card";
import { HeaderCard } from "./molecule-header-card";

export type { MoleculeCardProps } from "./molecule-card-types";
export { MoleculeCardActions } from "./molecule-card-actions";
export { MoleculeImageModal } from "./molecule-image-modal";
export { CompactCard } from "./molecule-compact-card";
export { FullCard, FullCardCarousel } from "./molecule-full-card";
export { HeaderCard } from "./molecule-header-card";

export interface MoleculeImageProps {
  imageUrl: string;
  name: string;
  size?: "sm" | "md" | "lg";
  experimentCount?: number;
  className?: string;
  badge?: boolean;
}

export const MoleculeImage = ({
  imageUrl,
  name,
  size = "md",
  className = "",
  experimentCount: _experimentCount,
  badge: _badge,
}: MoleculeImageProps) => {
  const sizeMap = {
    sm: "w-14",
    md: "w-20",
    lg: "w-24",
  } as const;
  const sizeClass = sizeMap[size];
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden sm:w-[45%] ${sizeClass} ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <MoleculeImageSVG
          imageUrl={imageUrl}
          name={name}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
        />
      </div>
    </div>
  );
};

interface MoleculeDecriptionTagsProps extends React.ComponentProps<
  typeof TagGroup
> {
  molecule: MoleculeView;
}

export const MoleculeDecriptionTags = ({
  molecule,
  ...props
}: MoleculeDecriptionTagsProps) => {
  return (
    <TagGroup {...props}>
      <TagGroup.List>
        <Tag id="inchi" onClick={() => copyTextToClipboard(molecule.InChI)}>
          <Copy className="h-4 w-4" />
          InChI
        </Tag>
        <Tag id="smiles" onClick={() => copyTextToClipboard(molecule.SMILES)}>
          <Copy className="h-4 w-4" />
          SMILES
        </Tag>
        <Tag
          id="pubchem"
          onClick={() =>
            window.open(pubChemUrl(molecule.pubChemCid ?? ""), "_blank")
          }
        >
          <Image
            src={PUBCHEM_FAVICON_URL}
            alt="PubChem registry icon"
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            unoptimized
          />
          PubChem
        </Tag>
        <Tag
          id="cas"
          onClick={() =>
            window.open(casUrl(molecule.casNumber ?? ""), "_blank")
          }
        >
          <Image
            src={CAS_FAVICON_URL}
            alt="CAS registry icon"
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
            unoptimized
          />
          CAS
        </Tag>
      </TagGroup.List>
    </TagGroup>
  );
};

/**
 * Renders a molecule summary card for grids, carousels, and headers.
 */
export const MoleculeCard = memo(function MoleculeCard({
  molecule,
  onEdit,
  variant = "full",
  enableRealtime = true,
  canEdit: canEditProp,
  isSignedIn: isSignedInProp,
}: {
  molecule: MoleculeView;
  onEdit?: () => void;
  variant?: "full" | "fullCarousel" | "compact" | "header";
  enableRealtime?: boolean;
  canEdit?: boolean;
  isSignedIn?: boolean;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = isSignedInProp ?? !!session?.user;
  const canEdit = canEditProp ?? isSignedIn;
  const utils = trpc.useUtils();
  const [localFavoriteState, setLocalFavoriteState] = useState<{
    favoriteCount: number;
    favorited: boolean;
  } | null>(null);
  const {
    upvoteCount: realtimeUpvoteCount,
    userHasUpvoted: realtimeUserHasUpvoted,
  } = useRealtimeUpvotes({
    moleculeId: enableRealtime ? molecule.id : undefined,
    initialUpvoteCount: molecule.favoriteCount ?? 0,
    initialUserHasUpvoted: molecule.userHasFavorited ?? false,
    userId: user?.id,
    enabled: enableRealtime,
  });
  const baseUpvoteCount = enableRealtime
    ? realtimeUpvoteCount
    : (molecule.favoriteCount ?? 0);
  const baseUserHasUpvoted = enableRealtime
    ? realtimeUserHasUpvoted
    : (molecule.userHasFavorited ?? false);
  useEffect(() => {
    setLocalFavoriteState(null);
  }, [molecule.id]);

  useEffect(() => {
    if (
      localFavoriteState?.favoriteCount === baseUpvoteCount &&
      localFavoriteState?.favorited === baseUserHasUpvoted
    ) {
      setLocalFavoriteState(null);
    }
  }, [baseUpvoteCount, baseUserHasUpvoted, localFavoriteState]);

  const favoriteMutation = trpc.molecules.toggleFavorite.useMutation({
    onMutate: () => {
      const sourceCount = localFavoriteState
        ? localFavoriteState.favoriteCount
        : baseUpvoteCount;
      const sourceFavorited = localFavoriteState
        ? localFavoriteState.favorited
        : baseUserHasUpvoted;
      setLocalFavoriteState({
        favoriteCount: Math.max(0, sourceCount + (sourceFavorited ? -1 : 1)),
        favorited: !sourceFavorited,
      });
    },
    onSuccess: (result) => {
      setLocalFavoriteState({
        favoriteCount: result.favoriteCount,
        favorited: result.favorited,
      });
      if (molecule.id) {
        void utils.molecules.getById.invalidate({ id: molecule.id });
      }
    },
    onError: () => {
      setLocalFavoriteState(null);
    },
  });
  const displayUpvoteCount =
    localFavoriteState?.favoriteCount ?? baseUpvoteCount;
  const displayUserHasUpvoted =
    localFavoriteState?.favorited ?? baseUserHasUpvoted;
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleFavorite = () => {
    if (!isSignedIn || !molecule.id) return;
    void favoriteMutation.mutateAsync({ moleculeId: molecule.id });
  };
  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedText(label);
          showToast(`${label} copied`, "success");
          setTimeout(() => setCopiedText(null), 2000);
        })
        .catch(() => {
          showToast("Could not copy to clipboard", "error");
        });
    }
  };
  const noop = () => {
    return;
  };
  const context: MoleculeCardContext = {
    onEdit: onEdit ?? noop,
    isSignedIn,
    canEdit,
    handleFavorite,
    favoriteMutation,
    realtimeUserHasUpvoted: displayUserHasUpvoted,
    realtimeUpvoteCount: displayUpvoteCount,
    copiedText,
    handleCopy,
  };
  const cardProps = resolveMolecule(molecule, context);
  if (variant === "compact") return <CompactCard props={cardProps} />;
  if (variant === "header") return <HeaderCard props={cardProps} />;
  if (variant === "fullCarousel") return <FullCardCarousel props={cardProps} />;
  return <FullCard props={cardProps} />;
});

export function resolveMolecule(
  molecule: MoleculeView,
  context: MoleculeCardContext,
): MoleculeCardProps {
  const orderedSynonyms = getCommonNames(molecule);
  const primaryName =
    orderedSynonyms.length > 0 ? orderedSynonyms[0]! : molecule.name;
  const shortestSynonyms = shortestSynonymsFromOrdered(
    orderedSynonyms,
    primaryName,
  );
  const pubChemUrlResolved = molecule.pubChemCid
    ? pubChemUrl(molecule.pubChemCid)
    : null;
  const casUrlResolved = molecule.casNumber ? casUrl(molecule.casNumber) : null;
  return {
    molecule,
    primaryName,
    orderedSynonyms,
    shortestSynonyms,
    pubChemUrl: pubChemUrlResolved,
    casUrl: casUrlResolved,
    ...context,
  };
}

export type DisplayMolecule = MoleculeView;

export const MoleculeDisplay = MoleculeCard;

export function MoleculeDisplayCompact({
  molecule,
  enableRealtime = true,
}: {
  molecule: MoleculeView;
  enableRealtime?: boolean;
}) {
  return (
    <MoleculeCard
      molecule={molecule}
      variant="compact"
      enableRealtime={enableRealtime}
    />
  );
}
