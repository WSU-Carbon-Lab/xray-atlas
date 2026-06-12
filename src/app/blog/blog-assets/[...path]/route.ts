import { listBlogAssetPathSegments, readBlogAsset } from "~/lib/content/blog-assets";

export const dynamic = "force-static";

interface BlogAssetRouteProps {
  params: Promise<{ path: string[] }>;
}

/**
 * Builds static params for each file in `content/blog/blog-assets`.
 */
export async function generateStaticParams(): Promise<{ path: string[] }[]> {
  const segmentsList = await listBlogAssetPathSegments();
  return segmentsList.map((pathSegments) => ({ path: pathSegments }));
}

/**
 * Serves blog post images from `content/blog/blog-assets` at
 * `/blog/blog-assets/{filename}`.
 */
export async function GET(
  _request: Request,
  { params }: BlogAssetRouteProps,
): Promise<Response> {
  const { path: pathSegments } = await params;
  const asset = await readBlogAsset(pathSegments);

  if (!asset) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(new Uint8Array(asset.body), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
