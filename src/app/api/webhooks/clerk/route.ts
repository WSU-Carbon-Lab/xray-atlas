import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { syncUserFromClerk } from "~/server/api";
import type { UserData } from "~/server/api";
import { env } from "~/env";

// Note: Primary webhook handler is Supabase Edge Function (clerk-webhook)
// This route is kept as a backup/fallback handler
export async function POST(req: Request) {
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  const payload: unknown = await req.json();
  const body = JSON.stringify(payload);

  const webhookSecret = env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", {
      status: 500,
    });
  }

  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, first_name, last_name, image_url, username, email_addresses, primary_email_address_id } = evt.data;

    const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim();

    // Extract primary email from email_addresses array (same logic as syncCurrentUser)
    const primaryEmail = email_addresses && Array.isArray(email_addresses) && email_addresses.length > 0
      ? (primary_email_address_id
          ? email_addresses.find((e: { id: string }) => e.id === primary_email_address_id)?.email_address
          : email_addresses.find((e: { verification?: { status: string } }) => e.verification?.status === "verified")?.email_address) ||
        email_addresses[0]?.email_address
      : undefined;

    const userData: UserData = {
      clerkId: id,
      name: fullName || "User",
      email: primaryEmail,
      image: image_url,
      orcid: username ?? undefined,
    };

    try {
      await syncUserFromClerk(userData);
      console.log(`User ${eventType}:`, id);
    } catch (error) {
      console.error("Error syncing user:", error);
      return new Response("Error syncing user", {
        status: 500,
      });
    }
  }

  return new Response("", { status: 200 });
}
