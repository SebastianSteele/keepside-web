import { describe, expect, it, vi } from 'vitest'
import { createSampleWorkspace } from '../domain/sample'
import { EmailDirection } from '../domain/types'
import { ConnectedError, MailRelayClient, WorkspaceApiClient } from './serverClients'

const workspace = createSampleWorkspace(new Date('2026-07-18T12:00:00.000Z'))

describe('connected service clients', () => {
  it('validates a remote workspace and keeps its ETag', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(workspace), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ETag: '"revision-4"' },
    }))
    const snapshot = await new WorkspaceApiClient('https://keepside.example/api/', fetcher).load()

    expect(snapshot).toEqual({ workspace, etag: '"revision-4"' })
    expect(fetcher).toHaveBeenCalledWith('https://keepside.example/api/v1/workspace', expect.objectContaining({ credentials: 'include' }))
  })

  it('uses If-Match when saving a workspace', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(init?.body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', ETag: '"revision-5"' },
    }))
    const snapshot = await new WorkspaceApiClient('https://keepside.example/api', fetcher).save(workspace, '"revision-4"')

    expect(snapshot.etag).toBe('"revision-5"')
    expect(fetcher).toHaveBeenCalledWith('https://keepside.example/api/v1/workspace', expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ 'If-Match': '"revision-4"' }),
    }))
  })

  it('creates a first connected workspace without inventing a revision', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(init?.body, {
      status: 201,
      headers: { 'Content-Type': 'application/json', ETag: '"revision-1"' },
    }))
    const snapshot = await new WorkspaceApiClient('/api', fetcher).create(workspace)

    expect(snapshot.etag).toBe('"revision-1"')
    expect(fetcher).toHaveBeenCalledWith('/api/v1/workspace', expect.objectContaining({ method: 'POST' }))
  })

  it('reports revision conflicts without overwriting', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 412 }))

    await expect(new WorkspaceApiClient('/api', fetcher).save(workspace, '"revision-2"'))
      .rejects.toMatchObject({ kind: 'conflict', status: 412 })
  })

  it('sends outgoing mail with a stable idempotency key', async () => {
    const email = workspace.emails.find(({ id }) => id === 'email-studio-review-draft')!
    const receipt = { status: 'accepted', providerMessageId: 'provider-123', acceptedAt: '2026-07-18T14:00:00.000Z', from: 'mail@example.com' } as const
    const fetcher = vi.fn(async () => new Response(JSON.stringify(receipt), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(new MailRelayClient('/api', fetcher).send(workspace.id, email)).resolves.toEqual(receipt)
    expect(fetcher).toHaveBeenCalledWith('/api/v1/mail/send', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': `${workspace.id}:${email.id}` }),
    }))
  })

  it('rejects incoming records before contacting the relay', async () => {
    const email = workspace.emails.find(({ direction }) => direction === EmailDirection.Incoming)!
    const fetcher = vi.fn()

    await expect(new MailRelayClient('/api', fetcher).send(workspace.id, email)).rejects.toBeInstanceOf(ConnectedError)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects more than twenty combined recipients before contacting the relay', async () => {
    const email = workspace.emails.find(({ id }) => id === 'email-studio-review-draft')!
    const fetcher = vi.fn()
    const tooMany = { ...email, to: Array.from({ length: 20 }, (_, index) => `person${index}@example.com`), cc: ['extra@example.com'] }

    await expect(new MailRelayClient('/api', fetcher).send(workspace.id, tooMany)).rejects.toMatchObject({ kind: 'invalid' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    [409, 'relay_conflict'],
    [408, 'uncertain'],
    [502, 'uncertain'],
    [503, 'uncertain'],
    [504, 'uncertain'],
  ])('keeps relay failure %i distinct as %s', async (status, kind) => {
    const email = workspace.emails.find(({ id }) => id === 'email-studio-review-draft')!
    const fetcher = vi.fn(async () => new Response(null, { status }))

    await expect(new MailRelayClient('/api', fetcher).send(workspace.id, email)).rejects.toMatchObject({ kind, status })
  })

  it('treats a lost network response as uncertain', async () => {
    const email = workspace.emails.find(({ id }) => id === 'email-studio-review-draft')!
    const fetcher = vi.fn(async () => { throw new TypeError('Failed to fetch') })

    await expect(new MailRelayClient('/api', fetcher).send(workspace.id, email)).rejects.toMatchObject({ kind: 'uncertain' })
  })

  it('treats an invalid accepted receipt as uncertain', async () => {
    const email = workspace.emails.find(({ id }) => id === 'email-studio-review-draft')!
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: 'accepted' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(new MailRelayClient('/api', fetcher).send(workspace.id, email)).rejects.toMatchObject({ kind: 'uncertain', status: 202 })
  })
})
