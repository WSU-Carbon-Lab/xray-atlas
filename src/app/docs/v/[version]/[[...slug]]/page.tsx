/**
 * Pinned Dev Docs release.
 *
 * `/docs/v/<id>` renders the same page as the unversioned path. The catalog
 * in `docs-versions` is the only set of ids this route serves. Unknown ids
 * and unknown pages are not found.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { ApiDocChrome } from "~/components/about/api-doc-chrome";
import { docsVersionById } from "~/lib/docs-versions";
import ApiHomePage, { metadata as apiHomeMetadata } from "../../../api/page";
import ApiV1AccountPage, {
  metadata as apiAccountMetadata,
} from "../../../api/v1/account/page";
import ApiV1DatasetsPage, {
  metadata as apiDatasetsMetadata,
} from "../../../api/v1/datasets/page";
import ApiV1MoleculesPage, {
  metadata as apiMoleculesMetadata,
} from "../../../api/v1/molecules/page";
import ApiV1Page, { metadata as apiV1Metadata } from "../../../api/v1/page";
import ApiV1PhysicsPage, {
  metadata as apiPhysicsMetadata,
} from "../../../api/v1/physics/page";
import CliDocsPage, { metadata as cliMetadata } from "../../../cli/page";
import EditorDocsPage, {
  metadata as editorsMetadata,
} from "../../../editors/page";
import IgorDocsPage, { metadata as igorMetadata } from "../../../igor/page";
import InstallingDocsPage, {
  metadata as installingMetadata,
} from "../../../installing/page";
import DocsHomePage, { metadata as homeMetadata } from "../../../page";
import PythonDocsPage, {
  metadata as pythonMetadata,
} from "../../../python/page";

interface VersionedDocsParams {
  version: string;
  slug?: string[];
}

interface VersionedDocsEntry {
  readonly Page: ComponentType;
  readonly metadata: Metadata;
  readonly apiChrome: boolean;
}

function entryForSlug(slug: string): VersionedDocsEntry | undefined {
  switch (slug) {
    case "":
      return { Page: DocsHomePage, metadata: homeMetadata, apiChrome: false };
    case "installing":
      return {
        Page: InstallingDocsPage,
        metadata: installingMetadata,
        apiChrome: false,
      };
    case "cli":
      return { Page: CliDocsPage, metadata: cliMetadata, apiChrome: false };
    case "editors":
      return {
        Page: EditorDocsPage,
        metadata: editorsMetadata,
        apiChrome: false,
      };
    case "python":
      return {
        Page: PythonDocsPage,
        metadata: pythonMetadata,
        apiChrome: false,
      };
    case "igor":
      return { Page: IgorDocsPage, metadata: igorMetadata, apiChrome: false };
    case "api":
      return { Page: ApiHomePage, metadata: apiHomeMetadata, apiChrome: false };
    case "api/v1":
      return { Page: ApiV1Page, metadata: apiV1Metadata, apiChrome: true };
    case "api/v1/molecules":
      return {
        Page: ApiV1MoleculesPage,
        metadata: apiMoleculesMetadata,
        apiChrome: true,
      };
    case "api/v1/datasets":
      return {
        Page: ApiV1DatasetsPage,
        metadata: apiDatasetsMetadata,
        apiChrome: true,
      };
    case "api/v1/account":
      return {
        Page: ApiV1AccountPage,
        metadata: apiAccountMetadata,
        apiChrome: true,
      };
    case "api/v1/physics":
      return {
        Page: ApiV1PhysicsPage,
        metadata: apiPhysicsMetadata,
        apiChrome: true,
      };
    default:
      return undefined;
  }
}

function resolveEntry(
  version: string,
  slug: string[] | undefined,
): VersionedDocsEntry | undefined {
  if (!docsVersionById(version)) {
    return undefined;
  }
  return entryForSlug(slug?.join("/") ?? "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<VersionedDocsParams>;
}): Promise<Metadata> {
  const { version, slug } = await params;
  return resolveEntry(version, slug)?.metadata ?? {};
}

/**
 * Renders one published docs page for a pinned release.
 *
 * @param props.params - `version` is the catalog id. `slug` is the page path under `/docs`.
 */
export default async function VersionedDocsPage({
  params,
}: {
  params: Promise<VersionedDocsParams>;
}): Promise<ReactNode> {
  const { version, slug } = await params;
  const entry = resolveEntry(version, slug);
  if (!entry) {
    notFound();
  }
  const body = <entry.Page />;
  return entry.apiChrome ? <ApiDocChrome>{body}</ApiDocChrome> : body;
}
