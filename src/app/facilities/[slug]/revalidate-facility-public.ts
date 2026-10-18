"use server";

import { revalidateFacilityPublicCache } from "~/server/cache/facility-public-cache";

/**
 * Expires the public facility catalog cache after an instrument write that
 * does not pass through the facilities router.
 */
export async function revalidateFacilityPublicDetail(): Promise<void> {
  revalidateFacilityPublicCache();
}
