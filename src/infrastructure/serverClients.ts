import { Email, EmailDirection, EmailStatus } from '../domain/types'
import { parseWorkspace } from '../domain/workspace'
import type { WorkspaceData } from '../domain/types'

type Fetcher = typeof fetch

export type ConnectedErrorKind = 'conflict' | 'invalid' | 'relay_conflict' | 'rate_limited' | 'unauthorized' | 'uncertain' | 'unavailable'

export class ConnectedError extends Error {
  constructor(readonly kind: ConnectedErrorKind, readonly status?: number) {
    super(messageFor(kind))
    this.name = 'ConnectedError'
  }
}

export interface WorkspaceSnapshot {
  workspace: WorkspaceData
  etag: string
}

export interface RelayReceipt {
  status: 'accepted'
  providerMessageId: string
  acceptedAt: string
  from: string
}

const endpoint = (baseUrl: string, path: string) => `${baseUrl.replace(/\/+$/, '')}${path}`
const isMailbox = (value: string) => value.length <= 320
  && value === value.trim()
  && !/[\r\n]/.test(value)
  && /^[^\s@]+@[^\s@]+$/.test(value)

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json() } catch { throw new ConnectedError('invalid', response.status) }
}

function ensureOk(response: Response): void {
  if (response.ok) return
  if (response.status === 401 || response.status === 403) throw new ConnectedError('unauthorized', response.status)
  if (response.status === 409 || response.status === 412) throw new ConnectedError('conflict', response.status)
  if (response.status === 400 || response.status === 413 || response.status === 422) throw new ConnectedError('invalid', response.status)
  if (response.status === 429) throw new ConnectedError('rate_limited', response.status)
  throw new ConnectedError('unavailable', response.status)
}

async function readWorkspaceSnapshot(response: Response): Promise<WorkspaceSnapshot> {
  const workspace = parseWorkspace(await readJson(response))
  const etag = response.headers.get('etag')
  if (!workspace || !etag) throw new ConnectedError('invalid', response.status)
  return { workspace, etag }
}

function messageFor(kind: ConnectedErrorKind): string {
  switch (kind) {
    case 'conflict': return 'This workspace changed elsewhere. Reload it before saving again.'
    case 'invalid': return 'The connected service returned data Keepside could not verify.'
    case 'relay_conflict': return 'This draft ID was already used for different email content. Save a new draft instead.'
    case 'unauthorized': return 'Sign in to the connected service and try again.'
    case 'rate_limited': return 'The connected service is receiving too many requests. Try again shortly.'
    case 'uncertain': return 'The relay lost confirmation and this message may have been sent. Check the provider before trying again.'
    case 'unavailable': return 'The connected service could not complete the request.'
  }
}

export class WorkspaceApiClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = fetch) {}

  async load(): Promise<WorkspaceSnapshot | null> {
    const response = await this.fetcher(endpoint(this.baseUrl, '/v1/workspace'), {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (response.status === 404) return null
    ensureOk(response)
    return readWorkspaceSnapshot(response)
  }

  async create(workspace: WorkspaceData): Promise<WorkspaceSnapshot> {
    const validWorkspace = parseWorkspace(workspace)
    if (!validWorkspace) throw new ConnectedError('invalid')
    const response = await this.fetcher(endpoint(this.baseUrl, '/v1/workspace'), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(validWorkspace),
    })
    ensureOk(response)
    return readWorkspaceSnapshot(response)
  }

  async save(workspace: WorkspaceData, expectedEtag: string): Promise<WorkspaceSnapshot> {
    const validWorkspace = parseWorkspace(workspace)
    if (!validWorkspace || !expectedEtag) throw new ConnectedError('invalid')
    const response = await this.fetcher(endpoint(this.baseUrl, '/v1/workspace'), {
      method: 'PUT',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'If-Match': expectedEtag,
      },
      body: JSON.stringify(validWorkspace),
    })
    ensureOk(response)
    return readWorkspaceSnapshot(response)
  }
}

export class MailRelayClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = fetch) {}

  async send(workspaceId: string, email: Email): Promise<RelayReceipt> {
    if (email.direction !== EmailDirection.Outgoing
      || email.status !== EmailStatus.Draft
      || !workspaceId
      || !email.id
      || !isMailbox(email.from)
      || email.to.length === 0
      || email.to.length + email.cc.length > 20
      || ![...email.to, ...email.cc].every(isMailbox)
      || !email.subject.trim()
      || email.subject.length > 200
      || /[\r\n]/.test(email.subject)
      || !email.body.trim()
      || email.body.length > 100000) throw new ConnectedError('invalid')
    const idempotencyKey = `${encodeURIComponent(workspaceId)}:${encodeURIComponent(email.id)}`
    if (idempotencyKey.length > 300) throw new ConnectedError('invalid')

    let response: Response
    try {
      response = await this.fetcher(endpoint(this.baseUrl, '/v1/mail/send'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ workspaceId, email }),
      })
    } catch {
      throw new ConnectedError('uncertain')
    }
    if (response.status === 409) throw new ConnectedError('relay_conflict', response.status)
    if (response.status === 408 || response.status >= 500) throw new ConnectedError('uncertain', response.status)
    ensureOk(response)
    let receipt: unknown
    try {
      receipt = await readJson(response)
    } catch {
      throw new ConnectedError('uncertain', response.status)
    }
    if (!isRelayReceipt(receipt)) throw new ConnectedError('uncertain', response.status)
    return receipt
  }
}

function isRelayReceipt(value: unknown): value is RelayReceipt {
  if (typeof value !== 'object' || value === null) return false
  const receipt = value as Partial<RelayReceipt>
  return receipt.status === 'accepted'
    && typeof receipt.providerMessageId === 'string'
    && receipt.providerMessageId.length > 0
    && typeof receipt.acceptedAt === 'string'
    && !Number.isNaN(Date.parse(receipt.acceptedAt))
    && typeof receipt.from === 'string'
    && isMailbox(receipt.from)
}
