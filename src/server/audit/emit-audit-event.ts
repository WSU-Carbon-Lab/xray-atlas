import type { Prisma, PrismaClient } from "~/prisma/client";
import { db } from "~/server/db";
import type { AuditEventType } from "~/server/audit/event-types";
import type { AuditRequestMeta } from "~/server/audit/request-meta";

/** Prisma client or an interactive transaction client used for co-located audit writes. */
export type AuditDbClient = PrismaClient | Prisma.TransactionClient;

/** JSON-compatible audit payload stored in `audit_event.payload`. */
export type AuditEventPayload = Prisma.InputJsonValue;

/** Input for {@link emitAuditEvent}: append-only audit row fields and write behavior. */
export interface EmitAuditEventInput {
  eventType: AuditEventType;
  eventScope: string;
  actorUserId?: string | null;
  subjectUserId?: string | null;
  payload?: AuditEventPayload;
  requestMeta?: AuditRequestMeta;
  db?: AuditDbClient;
  /** When true, logs insert failures and does not throw (auth adapter and OAuth callbacks). */
  failSilent?: boolean;
}

/**
 * Inserts one append-only row into `next_auth.audit_event`.
 * Uses the shared Prisma client unless `db` supplies a transaction client for atomic admin mutations.
 */
export async function emitAuditEvent(
  input: EmitAuditEventInput,
): Promise<void> {
  const client = input.db ?? db;
  const requestMeta = input.requestMeta;

  try {
    await client.auditEvent.create({
      data: {
        eventType: input.eventType,
        eventScope: input.eventScope,
        actorUserId: input.actorUserId ?? null,
        subjectUserId: input.subjectUserId ?? null,
        payload: input.payload ?? undefined,
        sourceIp: requestMeta?.sourceIp ?? null,
        userAgent: requestMeta?.userAgent ?? null,
        sessionId: requestMeta?.sessionId ?? null,
      },
    });
  } catch (error) {
    if (input.failSilent) {
      console.error("[audit] Failed to emit audit event:", {
        eventType: input.eventType,
        eventScope: input.eventScope,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    throw error;
  }
}
