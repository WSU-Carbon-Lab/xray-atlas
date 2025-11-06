import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { syncUserFromClerk } from "~/server/api";
import type { UserData } from "~/server/api";
import { env } from "~/env";

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the webhook secret from env
  const webhookSecret = env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", {
      status: 500,
    });
  }

  // Create a new Svix instance with webhook secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
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

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, first_name, last_name, image_url, username } = evt.data;

    // Construct name from first and last name
    const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim();

    const userData: UserData = {
      clerkId: id,
      name: fullName || "User",
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
