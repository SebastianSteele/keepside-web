# Architecture

Keepside uses a single workspace document as its source of truth.

## Ownership

- `src/domain/types.ts` owns record shapes and allowed enum values.
- `src/domain/workspace.ts` owns validation, persistence, sorting, and mutation rules.
- `src/domain/sample.ts` owns the optional demonstration workspace.
- `src/App.tsx` owns the current workspace instance and presentation state.
- Screens render derived data and open editors. They do not write browser storage directly.
- Editors return complete typed records to the application. They do not implement persistence rules.
- `src/infrastructure/serverClients.ts` owns the optional connected-service transport. It does not redefine domain records.

## Local mode

The whole workspace is validated before it is read, saved, imported, or exported. Invalid stored data falls back to an empty workspace. Deleting a client also removes records owned by that client. Deleting a contact clears its references from meetings and email records.

Local mode persists that document in one browser `localStorage` entry. It makes no workspace or mail network request.

## Connected-mode seam

Connected mode is an experimental integration boundary, not a second active data model. `WorkspaceApiClient` loads and saves the same `WorkspaceData` document through the contract in `docs/openapi.yaml`. Every response is passed through the existing domain validator. Conditional writes use the last server `ETag`, so a stale client cannot overwrite a newer revision silently.

A product that activates connected storage must choose it explicitly. It should upload once or open the existing server workspace, then use one store only. Automatic merges and local-plus-server dual writes are intentionally absent.

`MailRelayClient` submits one outgoing draft after an explicit user action. It marks nothing sent by itself. When **Send through relay** is used, the editor changes the record to sent only after the relay returns an accepted receipt. A person can still log an already-sent message manually.

The reference PostgreSQL shape stores one JSON document per authenticated owner. Delivery metadata lives in a separate table because it describes the transport, not the client record.

## Product boundary

Keepside is a manual client manager. AI features, analytics, inbox ingestion, automations, browser-side credential storage, automatic conflict merging, and public mail-service infrastructure are outside this repository.
