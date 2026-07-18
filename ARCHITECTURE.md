# Architecture

Keepside uses a single workspace document as its source of truth.

## Ownership

- `src/domain/types.ts` owns record shapes and allowed enum values.
- `src/domain/workspace.ts` owns validation, persistence, sorting, and mutation rules.
- `src/domain/sample.ts` owns the optional demonstration workspace.
- `src/App.tsx` owns the current workspace instance and presentation state.
- Screens render derived data and open editors. They do not write browser storage directly.
- Editors return complete typed records to the application. They do not implement persistence rules.

## Storage

The whole workspace is validated before it is read, saved, imported, or exported. Invalid stored data falls back to an empty workspace. Deleting a client also removes records owned by that client. Deleting a contact clears its references from meetings and email records.

## Product boundary

Keepside is a manual client manager. Hosted sync, AI features, analytics, inbox access, automations, credential storage, and third-party integrations are outside this repository.
