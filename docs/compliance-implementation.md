# Compliance implementation tracker

Maps repository work to `tmp/compliance-spec.md`. Update status as each phase lands.

| Spec section | Scope | Status |
| --- | --- | --- |
| 2.1 ORCID apex identifier | `user.id` = bare ORCID iD; public `/users/<orcid>`; legacy UUID redirect table | done |
| 2.2 Email removal | Drop `user.email` / `emailVerified`; remove email UI and tRPC mutations | done |
| 5.1 ORCID OIDC | ORCID OAuth scope `openid`; ORCID-only account creation | partial |
| 4.2 Authenticator / passkeys | WebAuthn ceremony, `credentialPublicKey`, AAL | deferred (known broken) |
| 3 Passkey AAL enforcement | Step-up assurance on sensitive mutations | deferred |
| 4.3 audit_event | Structured audit log | not started |
| 10 Token encryption | OAuth token field encryption | not started |
| 9 Tombstones / erasure | Account erasure with attribution tombstones | not started |

## Migration runbook (ORCID PK)

1. Run `bun scripts/migrate-user-orcid-pk-audit.ts` on production data; resolve null ORCID and duplicate ORCID rows before DDL.
2. Apply migration `20260522120000_user_orcid_primary_key` via `bun run db:migrate` or Supabase direct SQL when the pooler stalls.
3. Run `bunx prisma generate` and restart the app.
4. Bootstrap admin ORCIDs with `ADMIN_BOOTSTRAP_ORCIDS` when documented in `.env.example`.

## Local developer auth (replaces dev-mock)

1. Set `ORCID_*` and `DEV_GITHUB_*` in `.env.local`.
2. First sign-in with ORCID creates the user row (`id` = ORCID iD).
3. Optionally link GitHub from the profile page.
4. Grant Labs/admin via role bootstrap using ORCID iDs.
