-- Keepside connected-mode reference schema for PostgreSQL 15+.
-- The authenticated owner subject comes from the server session, never the request body.

create table if not exists workspace_documents (
  owner_subject text primary key,
  workspace_id text not null,
  revision bigint not null default 1 check (revision >= 1),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(document) = 'object'),
  check (document ->> 'id' = workspace_id),
  check (document ->> 'schemaVersion' = '1'),
  check (octet_length(document::text) <= 5000000)
);

create table if not exists mail_dispatches (
  owner_subject text not null references workspace_documents(owner_subject) on delete cascade,
  email_id text not null check (length(email_id) between 1 and 128),
  idempotency_key text not null check (length(idempotency_key) between 3 and 300),
  payload_sha256 text not null check (length(payload_sha256) = 64),
  status text not null check (status in ('sending', 'accepted', 'failed', 'uncertain')),
  provider_message_id text,
  recipient_count integer not null check (recipient_count between 1 and 20),
  accepted_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_subject, email_id),
  unique (owner_subject, idempotency_key),
  check (status <> 'accepted' or (provider_message_id is not null and accepted_at is not null))
);

-- Save with optimistic concurrency. A zero-row result means the caller's ETag is stale.
--
-- update workspace_documents
-- set document = $3, revision = revision + 1, updated_at = now()
-- where owner_subject = $1 and revision = $2
-- returning revision, document;

comment on table workspace_documents is
  'One canonical, validated Keepside WorkspaceData document per authenticated owner.';
comment on table mail_dispatches is
  'Delivery metadata only. Message bodies and recipient addresses are deliberately omitted.';
