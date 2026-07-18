# Connected mode reference

Keepside works without a server. Connected mode is an experimental boundary for people who want to provide their own workspace database and outbound email relay.

This repository includes the browser clients, API contract, and PostgreSQL schema. It does not ship an authentication server or a public mail service. Those choices are deployment-specific and carry real security and abuse responsibilities.

## The boundary

```text
Keepside in the browser
        |
        | authenticated HTTPS requests
        v
your same-origin API
        |--------------------|
        v                    v
PostgreSQL              mail provider
WorkspaceData           outbound only
```

Local mode remains the default. A connected build should make activation explicit: upload the local workspace once or use the existing server workspace. Do not merge automatically and do not write to browser storage and PostgreSQL at the same time.

## Browser configuration

Copy `.env.example` to `.env.local` and set only the public API location:

```bash
VITE_KEEPSIDE_API_URL=/api
```

Every Vite variable with a `VITE_` prefix is included in the browser bundle. Never place a database URL, session secret, or mail-provider key in one.

The reference client assumes the app and API share an origin. A cross-origin API needs a deliberate cookie, CORS, and CSRF design; changing the URL alone is not enough.

The included clients expect:

- `GET /v1/workspace`, `POST /v1/workspace`, and `PUT /v1/workspace`
- `POST /v1/mail/send`
- secure session cookies sent with `credentials: include`
- JSON responses that match `docs/openapi.yaml`
- an `ETag` on every successful workspace load and save

`WorkspaceApiClient` validates every returned document through `parseWorkspace`. `MailRelayClient` sends a stable idempotency key built from the workspace and email IDs.

The OpenAPI workspace shape is a transport envelope, not a replacement validator. Reuse `parseWorkspace` in a TypeScript server or port it with the same contract tests. An OpenAPI-generated object check alone is not sufficient.

## Server configuration

These names are suggestions for the service you write, not values consumed by Vite:

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=...
EMAIL_PROVIDER_API_KEY=...
EMAIL_FROM=mail@example.com
EMAIL_FROM_NAME=Keepside
APP_ORIGIN=https://clients.example.com
```

Apply the reference schema with your normal migration system, or directly during development:

```bash
psql "$DATABASE_URL" -f docs/postgres.sql
```

Store the complete validated `WorkspaceData` document in `workspace_documents.document`. Do not create a second hand-maintained model of clients, tasks, notes, and mail unless the product later needs server-side queries.

## Workspace writes

The server resolves `owner_subject` from the authenticated session. It never accepts an owner ID from the request body.

Create the first remote workspace with `POST /v1/workspace`. The server returns `409 Conflict` if one already exists for that owner.

For every later save:

1. Verify the request origin and authenticated owner.
2. Require `If-Match` and decode its revision.
3. Validate the full workspace and its record references.
4. Update only where both owner and revision match.
5. Return `412 Precondition Failed` when no row matches.
6. Return the saved document with a new opaque `ETag`.

This prevents a stale tab from silently overwriting a newer workspace.

## Outbound mail relay

The first relay should send plain text only. It is not inbox sync and it does not claim final delivery.

Before calling a provider, the server must:

- authenticate the owner and verify the workspace belongs to that session
- reject incoming records and invalid addresses
- strip CR and LF from any value used as a header
- use the server-controlled `EMAIL_FROM` value
- allow at most 20 recipients, a 200-character subject, and a 100 KB body
- reserve the idempotency key and a SHA-256 payload hash in `mail_dispatches`
- limit each owner to a small hourly send quota
- omit message bodies and recipient addresses from logs

If the provider accepts the request, record its message ID and return `202` with `acceptedAt` and the effective sender mailbox in `from`. Only then should the browser change the Keepside record from draft to sent. If the provider call times out after submission, return `503` and mark the dispatch uncertain. Do not retry automatically.

A shared public relay needs abuse review, suppression handling, per-user quotas, and verified sender domains. Keep sign-up invite-only until those controls exist.

## Web security checklist

- HTTPS only, including local staging behind a trusted proxy
- `Secure`, `HttpOnly`, `SameSite=Strict` session cookies
- strict `APP_ORIGIN` validation on every state-changing request
- no wildcard CORS with credentialed requests
- rate limits on authentication, workspace writes, and mail
- generic public errors with detailed server-only logs
- `Cache-Control: no-store` for workspace and relay responses
- database roles that cannot read another owner's row
- encrypted database backups with a tested restore procedure

## Backups and upgrades

Keep daily database backups and test a restore before calling the deployment production-ready. Preserve `schemaVersion` in every document. When a new document schema ships, migrate a copy first and retain the previous backup until the new build has been verified.

The browser's JSON export remains the portable escape hatch in both modes.
