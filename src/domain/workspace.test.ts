import { describe, expect, it } from 'vitest'
import { createSampleWorkspace } from './sample'
import {
  createEmptyWorkspace,
  deleteClient,
  deleteContact,
  isValidLocale,
  loadWorkspace,
  loadWorkspaceResult,
  parseWorkspace,
  saveWorkspace,
  selectContactsForClient,
  upsertClient,
  upsertContact,
  upsertWorkItem,
  WORKSPACE_STORAGE_KEY,
  WorkspaceStorage,
} from './workspace'
import {
  ClientStatus,
  ContactRole,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
} from './types'

const t0 = '2025-01-01T12:00:00.000Z'
const t1 = '2025-01-02T12:00:00.000Z'
const t2 = '2025-01-03T12:00:00.000Z'

function workspaceWithClient() {
  return upsertClient(createEmptyWorkspace(t0), {
    id: 'client-1',
    name: 'Cedar House',
    status: ClientStatus.Active,
    createdAt: t0,
    updatedAt: t0,
  }, t0)
}

describe('workspace domain', () => {
  it('cascade deletes all records owned by a client', () => {
    const workspace = createSampleWorkspace(new Date(t0))
    const deleted = deleteClient(workspace, 'client-studio', t1)

    expect(deleted.clients.some(({ id }) => id === 'client-studio')).toBe(false)
    expect(deleted.contacts.some(({ clientId }) => clientId === 'client-studio')).toBe(false)
    expect(deleted.workItems.some(({ clientId }) => clientId === 'client-studio')).toBe(false)
    expect(deleted.meetings.some(({ clientId }) => clientId === 'client-studio')).toBe(false)
    expect(deleted.notes.some(({ clientId }) => clientId === 'client-studio')).toBe(false)
    expect(deleted.emails.some(({ clientId }) => clientId === 'client-studio')).toBe(false)
    expect(deleted.activities.some(({ clientId }) => clientId === 'client-studio')).toBe(false)
  })

  it('maintains exactly one primary contact for every client with contacts', () => {
    let workspace = workspaceWithClient()
    workspace = upsertContact(workspace, {
      id: 'contact-1',
      clientId: 'client-1',
      firstName: 'Amara',
      lastName: 'Singh',
      role: ContactRole.Owner,
      isPrimary: false,
      createdAt: t0,
      updatedAt: t0,
    }, t0)
    workspace = upsertContact(workspace, {
      id: 'contact-2',
      clientId: 'client-1',
      firstName: 'Leo',
      lastName: 'Martin',
      role: ContactRole.Billing,
      isPrimary: false,
      createdAt: t1,
      updatedAt: t1,
    }, t1)

    expect(selectContactsForClient(workspace, 'client-1').filter(({ isPrimary }) => isPrimary).map(({ id }) => id)).toEqual(['contact-1'])

    const second = workspace.contacts.find(({ id }) => id === 'contact-2')!
    workspace = upsertContact(workspace, { ...second, isPrimary: true }, t2)
    expect(selectContactsForClient(workspace, 'client-1').filter(({ isPrimary }) => isPrimary).map(({ id }) => id)).toEqual(['contact-2'])

    workspace = upsertContact(workspace, { ...workspace.contacts.find(({ id }) => id === 'contact-2')!, isPrimary: false }, t2)
    expect(selectContactsForClient(workspace, 'client-1').filter(({ isPrimary }) => isPrimary).map(({ id }) => id)).toEqual(['contact-1'])

    workspace = deleteContact(workspace, 'contact-1', t2)
    expect(selectContactsForClient(workspace, 'client-1').filter(({ isPrimary }) => isPrimary).map(({ id }) => id)).toEqual(['contact-2'])
  })

  it('sets and clears completedAt as work enters and leaves completed status', () => {
    let workspace = workspaceWithClient()
    workspace = upsertWorkItem(workspace, {
      id: 'work-1',
      clientId: 'client-1',
      title: 'Prepare estimate',
      type: WorkItemType.Task,
      status: WorkItemStatus.Planned,
      priority: WorkItemPriority.Normal,
      createdAt: t0,
      updatedAt: t0,
    }, t0)

    const planned = workspace.workItems[0]
    expect(planned.completedAt).toBeUndefined()

    workspace = upsertWorkItem(workspace, { ...planned, status: WorkItemStatus.Completed }, t1)
    expect(workspace.workItems[0].completedAt).toBe(t1)

    workspace = upsertWorkItem(workspace, { ...workspace.workItems[0], title: 'Prepare final estimate' }, t2)
    expect(workspace.workItems[0].completedAt).toBe(t1)

    workspace = upsertWorkItem(workspace, { ...workspace.workItems[0], status: WorkItemStatus.InProgress }, t2)
    expect(workspace.workItems[0].completedAt).toBeUndefined()
  })

  it('returns the supplied fallback for malformed storage data', () => {
    const fallback = createEmptyWorkspace(t0, 'fallback')
    const storage: WorkspaceStorage = {
      getItem: (key) => key === WORKSPACE_STORAGE_KEY ? '{not-json' : null,
      setItem: () => undefined,
    }

    expect(loadWorkspace(storage, fallback)).toBe(fallback)
    expect(loadWorkspaceResult(storage, fallback)).toEqual({ workspace: fallback, error: 'invalid' })
  })

  it('rejects invalid locales before they can reach date formatting', () => {
    const workspace = createEmptyWorkspace(t0)

    expect(isValidLocale('en-US')).toBe(true)
    expect(isValidLocale('en_US')).toBe(false)
    expect(parseWorkspace({ ...workspace, settings: { ...workspace.settings, locale: 'en_US' } })).toBeNull()
  })

  it('reports browser storage failures', () => {
    const storage: WorkspaceStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded') },
    }

    expect(saveWorkspace(createEmptyWorkspace(t0), storage)).toBe(false)
  })
})
