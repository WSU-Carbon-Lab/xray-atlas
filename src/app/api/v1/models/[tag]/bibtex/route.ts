import { NextResponse } from "next/server";
import { V1HttpError } from "~/app/api/v1/_lib/write-api";
import { parseVersionParam, readRoute, tagOf } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * BibTeX `@misc` record of a published version as `application/x-bibtex`. Query `version` is
 * `latest` (default) or a version number; `draft` is 422.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return readRoute(request, async (caller) => {
    const version = parseVersionParam(
      new URL(request.url).searchParams.get("version"),
    );
    if (version === "draft") {
      throw new V1HttpError(
        422,
        "UNPROCESSABLE_ENTITY",
        "Only published versions can be cited.",
      );
    }
    const { bibtex } = await caller.opticalModels.citation({
      tag: await tagOf(context),
      version,
    });
    return new NextResponse(bibtex, {
      status: 200,
      headers: {
        "content-type": "application/x-bibtex; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  });
}
