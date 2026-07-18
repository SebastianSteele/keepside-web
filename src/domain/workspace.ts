import {
  Activity,
  ActivityEntityType,
  ActivityType,
  Client,
  ClientStatus,
  Contact,
  ContactRole,
  Email,
  EmailDirection,
  EmailStatus,
  Id,
  Meeting,
  MeetingStatus,
  Note,
  WorkItem,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
  WorkspaceData,
  WorkspaceSettings,
  WorkspaceTheme,
} from './types'

export const WORKSPACE_STORAGE_KEY = 'keepside.workspace.v1'
export const ACTIVITY_LIMIT = 500

export interface WorkspaceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface WorkspaceLoadResult {
  workspace: WorkspaceData
  error?: 'unavailable' | 'invalid'
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString)
const isOptionalString = (value: unknown) => value === undefined || isString(value)
const isIso = (value: unknown): value is string => isString(value) && !Number.isNaN(Date.parse(value))
const isEnumValue = <T extends Record<string, string>>(values: T, value: unknown): value is T[keyof T] =>
  isString(value) && Object.values(values).includes(value)

export const isValidLocale = (value: unknown): value is string => {
  if (!isString(value) || !value.trim()) return false
  try { return Intl.getCanonicalLocales(value).length === 1 } catch { return false }
}
const hasUniqueIds = (items: { id: Id }[]) => new Set(items.map(({ id }) => id)).size === items.length
const byId = <T extends { id: Id }>(items: T[], item: T) => {
  const index = items.findIndex(({ id }) => id === item.id)
  return index < 0 ? [...items, item] : items.map((current, currentIndex) => currentIndex === index ? item : current)
}
const withoutId = <T extends { id: Id }>(items: T[], id: Id) => items.filter((item) => item.id !== id)
const timestamp = (value?: string) => value ? Date.parse(value) : Number.POSITIVE_INFINITY
const touch = (workspace: WorkspaceData, updatedAt: string) => ({ ...workspace, updatedAt })

export function createEmptyWorkspace(now = new Date().toISOString(), id = 'workspace-local'): WorkspaceData {
  return {
    schemaVersion: 1,
    id,
    name: 'My Workspace',
    settings: {
      ownerName: '',
      businessName: '',
      timezone: 'UTC',
      locale: 'en-US',
      currency: 'USD',
      theme: WorkspaceTheme.System,
      weekStartsOn: 1,
    },
    clients: [],
    contacts: [],
    workItems: [],
    meetings: [],
    notes: [],
    emails: [],
    activities: [],
    createdAt: now,
    updatedAt: now,
  }
}

const isAddress = (value: unknown) => isRecord(value)
  && isString(value.line1)
  && isOptionalString(value.line2)
  && isString(value.city)
  && isString(value.region)
  && isString(value.postalCode)
  && isString(value.country)

const isClient = (value: unknown): value is Client => isRecord(value)
  && isString(value.id)
  && isString(value.name)
  && isEnumValue(ClientStatus, value.status)
  && isOptionalString(value.industry)
  && isOptionalString(value.email)
  && isOptionalString(value.phone)
  && isOptionalString(value.website)
  && (value.address === undefined || isAddress(value.address))
  && isIso(value.createdAt)
  && isIso(value.updatedAt)

const isContact = (value: unknown): value is Contact => isRecord(value)
  && isString(value.id)
  && isString(value.clientId)
  && isString(value.firstName)
  && isString(value.lastName)
  && isEnumValue(ContactRole, value.role)
  && isOptionalString(value.title)
  && isOptionalString(value.email)
  && isOptionalString(value.phone)
  && isBoolean(value.isPrimary)
  && isIso(value.createdAt)
  && isIso(value.updatedAt)

const isWorkItem = (value: unknown): value is WorkItem => isRecord(value)
  && isString(value.id)
  && isString(value.clientId)
  && isString(value.title)
  && isOptionalString(value.description)
  && isEnumValue(WorkItemType, value.type)
  && isEnumValue(WorkItemStatus, value.status)
  && isEnumValue(WorkItemPriority, value.priority)
  && (value.dueAt === undefined || isIso(value.dueAt))
  && (value.completedAt === undefined || isIso(value.completedAt))
  && isIso(value.createdAt)
  && isIso(value.updatedAt)

const isMeeting = (value: unknown): value is Meeting => isRecord(value)
  && isString(value.id)
  && isString(value.clientId)
  && isStringArray(value.contactIds)
  && isString(value.title)
  && isEnumValue(MeetingStatus, value.status)
  && isIso(value.startsAt)
  && isIso(value.endsAt)
  && isOptionalString(value.location)
  && isOptionalString(value.agenda)
  && isOptionalString(value.outcome)
  && isIso(value.createdAt)
  && isIso(value.updatedAt)

const isNote = (value: unknown): value is Note => isRecord(value)
  && isString(value.id)
  && isString(value.clientId)
  && isOptionalString(value.workItemId)
  && isString(value.title)
  && isString(value.body)
  && isBoolean(value.isPinned)
  && isIso(value.createdAt)
  && isIso(value.updatedAt)

const isEmail = (value: unknown): value is Email => isRecord(value)
  && isString(value.id)
  && isString(value.clientId)
  && isOptionalString(value.contactId)
  && isEnumValue(EmailDirection, value.direction)
  && isEnumValue(EmailStatus, value.status)
  && isString(value.from)
  && isStringArray(value.to)
  && isStringArray(value.cc)
  && isString(value.subject)
  && isString(value.body)
  && isIso(value.occurredAt)
  && isIso(value.createdAt)
  && isIso(value.updatedAt)

const isActivity = (value: unknown): value is Activity => isRecord(value)
  && isString(value.id)
  && isOptionalString(value.clientId)
  && isEnumValue(ActivityEntityType, value.entityType)
  && isString(value.entityId)
  && isEnumValue(ActivityType, value.type)
  && isString(value.summary)
  && isIso(value.occurredAt)

const isSettings = (value: unknown): value is WorkspaceSettings => isRecord(value)
  && isString(value.ownerName)
  && isString(value.businessName)
  && isString(value.timezone)
  && isValidLocale(value.locale)
  && isString(value.currency)
  && isEnumValue(WorkspaceTheme, value.theme)
  && (value.weekStartsOn === 0 || value.weekStartsOn === 1)

const asArray = <T>(value: unknown, predicate: (item: unknown) => item is T): T[] | null =>
  Array.isArray(value) && value.every(predicate) ? value : null

function normalizePrimaryContacts(contacts: Contact[]): Contact[] {
  const clientIds = new Set(contacts.map(({ clientId }) => clientId))
  let normalized = contacts
  for (const clientId of clientIds) {
    const matches = normalized.filter((contact) => contact.clientId === clientId)
    const primaryId = (matches.find(({ isPrimary }) => isPrimary) ?? matches[0]).id
    normalized = normalized.map((contact) => contact.clientId === clientId
      ? { ...contact, isPrimary: contact.id === primaryId }
      : contact)
  }
  return normalized
}

export function parseWorkspace(value: unknown): WorkspaceData | null {
  if (!isRecord(value)
    || value.schemaVersion !== 1
    || !isString(value.id)
    || !isString(value.name)
    || !isSettings(value.settings)
    || !isIso(value.createdAt)
    || !isIso(value.updatedAt)) return null

  const clients = asArray(value.clients, isClient)
  const contacts = asArray(value.contacts, isContact)
  const workItems = asArray(value.workItems, isWorkItem)
  const meetings = asArray(value.meetings, isMeeting)
  const notes = asArray(value.notes, isNote)
  const emails = asArray(value.emails, isEmail)
  const activities = asArray(value.activities, isActivity)
  if (!clients || !contacts || !workItems || !meetings || !notes || !emails || !activities
    || !hasUniqueIds(clients)
    || !hasUniqueIds(contacts)
    || !hasUniqueIds(workItems)
    || !hasUniqueIds(meetings)
    || !hasUniqueIds(notes)
    || !hasUniqueIds(emails)
    || !hasUniqueIds(activities)) return null

  const clientIds = new Set(clients.map(({ id }) => id))
  const contactIds = new Set(contacts.map(({ id }) => id))
  const workItemIds = new Set(workItems.map(({ id }) => id))
  if (contacts.some(({ clientId }) => !clientIds.has(clientId))
    || workItems.some(({ clientId }) => !clientIds.has(clientId))
    || meetings.some(({ clientId, contactIds: ids }) => !clientIds.has(clientId) || ids.some((id) => !contactIds.has(id)))
    || notes.some(({ clientId, workItemId }) => !clientIds.has(clientId) || workItemId !== undefined && !workItemIds.has(workItemId))
    || emails.some(({ clientId, contactId }) => !clientIds.has(clientId) || contactId !== undefined && !contactIds.has(contactId))
    || activities.some(({ clientId }) => clientId !== undefined && !clientIds.has(clientId))) return null

  return {
    schemaVersion: 1,
    id: value.id,
    name: value.name,
    settings: value.settings,
    clients,
    contacts: normalizePrimaryContacts(contacts),
    workItems,
    meetings,
    notes,
    emails,
    activities: sortActivities(activities).slice(0, ACTIVITY_LIMIT),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

export function isWorkspaceData(value: unknown): value is WorkspaceData {
  return parseWorkspace(value) !== null
}

function defaultStorage(): WorkspaceStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

export function loadWorkspaceResult(storage = defaultStorage(), fallback = createEmptyWorkspace()): WorkspaceLoadResult {
  if (!storage) return { workspace: fallback, error: 'unavailable' }
  try {
    const serialized = storage.getItem(WORKSPACE_STORAGE_KEY)
    if (serialized === null) return { workspace: fallback }
    const workspace = parseWorkspace(JSON.parse(serialized))
    return workspace ? { workspace } : { workspace: fallback, error: 'invalid' }
  } catch {
    return { workspace: fallback, error: 'invalid' }
  }
}

export function loadWorkspace(storage = defaultStorage(), fallback = createEmptyWorkspace()): WorkspaceData {
  return loadWorkspaceResult(storage, fallback).workspace
}

export function saveWorkspace(workspace: WorkspaceData, storage = defaultStorage()): boolean {
  if (!storage) return false
  const valid = parseWorkspace(workspace)
  if (!valid) return false
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(valid))
    return true
  } catch {
    return false
  }
}

export function exportWorkspace(workspace: WorkspaceData): string {
  const valid = parseWorkspace(workspace)
  if (!valid) throw new TypeError('Cannot export an invalid workspace')
  return JSON.stringify(valid, null, 2)
}

export function importWorkspace(serialized: string): WorkspaceData | null {
  try {
    return parseWorkspace(JSON.parse(serialized))
  } catch {
    return null
  }
}

const requireClient = (workspace: WorkspaceData, clientId: Id) => {
  if (!workspace.clients.some(({ id }) => id === clientId)) throw new RangeError(`Unknown client: ${clientId}`)
}

export function upsertClient(workspace: WorkspaceData, client: Client, now = new Date().toISOString()): WorkspaceData {
  return touch({ ...workspace, clients: byId(workspace.clients, { ...client, updatedAt: now }) }, now)
}

export function upsertContact(workspace: WorkspaceData, contact: Contact, now = new Date().toISOString()): WorkspaceData {
  requireClient(workspace, contact.clientId)
  const existing = workspace.contacts.find(({ id }) => id === contact.id)
  if (existing && existing.clientId !== contact.clientId) throw new RangeError('A contact cannot move between clients')
  const clientContacts = workspace.contacts.filter(({ clientId, id }) => clientId === contact.clientId && id !== contact.id)
  const candidate = { ...contact, isPrimary: contact.isPrimary || clientContacts.length === 0, updatedAt: now }
  let contacts = byId(workspace.contacts, candidate)
  if (candidate.isPrimary) {
    contacts = contacts.map((current) => current.clientId === candidate.clientId
      ? { ...current, isPrimary: current.id === candidate.id }
      : current)
  } else if (existing?.isPrimary) {
    const replacementId = clientContacts[0]?.id
    contacts = contacts.map((current) => current.clientId === candidate.clientId
      ? { ...current, isPrimary: current.id === replacementId }
      : current)
  }
  return touch({ ...workspace, contacts }, now)
}

export function deleteContact(workspace: WorkspaceData, contactId: Id, now = new Date().toISOString()): WorkspaceData {
  const contact = workspace.contacts.find(({ id }) => id === contactId)
  if (!contact) return workspace
  const contacts = normalizePrimaryContacts(withoutId(workspace.contacts, contactId))
  return touch({
    ...workspace,
    contacts,
    meetings: workspace.meetings.map((meeting) => ({ ...meeting, contactIds: meeting.contactIds.filter((id) => id !== contactId) })),
    emails: workspace.emails.map((email) => email.contactId === contactId ? { ...email, contactId: undefined } : email),
  }, now)
}

export function deleteWorkItem(workspace: WorkspaceData, workItemId: Id, now = new Date().toISOString()): WorkspaceData {
  if (!workspace.workItems.some(({ id }) => id === workItemId)) return workspace
  return touch({
    ...workspace,
    workItems: withoutId(workspace.workItems, workItemId),
    notes: workspace.notes.map((note) => note.workItemId === workItemId ? { ...note, workItemId: undefined } : note),
  }, now)
}

export function deleteMeeting(workspace: WorkspaceData, meetingId: Id, now = new Date().toISOString()): WorkspaceData {
  if (!workspace.meetings.some(({ id }) => id === meetingId)) return workspace
  return touch({ ...workspace, meetings: withoutId(workspace.meetings, meetingId) }, now)
}

export function deleteNote(workspace: WorkspaceData, noteId: Id, now = new Date().toISOString()): WorkspaceData {
  if (!workspace.notes.some(({ id }) => id === noteId)) return workspace
  return touch({ ...workspace, notes: withoutId(workspace.notes, noteId) }, now)
}

export function deleteEmail(workspace: WorkspaceData, emailId: Id, now = new Date().toISOString()): WorkspaceData {
  if (!workspace.emails.some(({ id }) => id === emailId)) return workspace
  return touch({ ...workspace, emails: withoutId(workspace.emails, emailId) }, now)
}

export function upsertWorkItem(workspace: WorkspaceData, item: WorkItem, now = new Date().toISOString()): WorkspaceData {
  requireClient(workspace, item.clientId)
  const existing = workspace.workItems.find(({ id }) => id === item.id)
  if (existing && existing.clientId !== item.clientId) throw new RangeError('A work item cannot move between clients')
  const enteringCompleted = item.status === WorkItemStatus.Completed && existing?.status !== WorkItemStatus.Completed
  const workItem = {
    ...item,
    completedAt: item.status === WorkItemStatus.Completed ? enteringCompleted ? now : item.completedAt : undefined,
    updatedAt: now,
  }
  return touch({ ...workspace, workItems: byId(workspace.workItems, workItem) }, now)
}

export function upsertMeeting(workspace: WorkspaceData, meeting: Meeting, now = new Date().toISOString()): WorkspaceData {
  requireClient(workspace, meeting.clientId)
  const validContacts = new Set(workspace.contacts.filter(({ clientId }) => clientId === meeting.clientId).map(({ id }) => id))
  if (meeting.contactIds.some((id) => !validContacts.has(id))) throw new RangeError('Meeting contacts must belong to its client')
  return touch({ ...workspace, meetings: byId(workspace.meetings, { ...meeting, updatedAt: now }) }, now)
}

export function upsertNote(workspace: WorkspaceData, note: Note, now = new Date().toISOString()): WorkspaceData {
  requireClient(workspace, note.clientId)
  if (note.workItemId && !workspace.workItems.some(({ id, clientId }) => id === note.workItemId && clientId === note.clientId)) {
    throw new RangeError('Note work item must belong to its client')
  }
  return touch({ ...workspace, notes: byId(workspace.notes, { ...note, updatedAt: now }) }, now)
}

export function upsertEmail(workspace: WorkspaceData, email: Email, now = new Date().toISOString()): WorkspaceData {
  requireClient(workspace, email.clientId)
  if (email.contactId && !workspace.contacts.some(({ id, clientId }) => id === email.contactId && clientId === email.clientId)) {
    throw new RangeError('Email contact must belong to its client')
  }
  return touch({ ...workspace, emails: byId(workspace.emails, { ...email, updatedAt: now }) }, now)
}

export function upsertActivity(workspace: WorkspaceData, activity: Activity, now = new Date().toISOString()): WorkspaceData {
  if (activity.clientId) requireClient(workspace, activity.clientId)
  const activities = sortActivities(byId(workspace.activities, activity)).slice(0, ACTIVITY_LIMIT)
  return touch({ ...workspace, activities }, now)
}

export function updateWorkspaceSettings(workspace: WorkspaceData, settings: WorkspaceSettings, now = new Date().toISOString()): WorkspaceData {
  return touch({ ...workspace, settings }, now)
}

export function deleteClient(workspace: WorkspaceData, clientId: Id, now = new Date().toISOString()): WorkspaceData {
  if (!workspace.clients.some(({ id }) => id === clientId)) return workspace
  const contactIds = new Set(workspace.contacts.filter((contact) => contact.clientId === clientId).map(({ id }) => id))
  return touch({
    ...workspace,
    clients: workspace.clients.filter(({ id }) => id !== clientId),
    contacts: workspace.contacts.filter((item) => item.clientId !== clientId),
    workItems: workspace.workItems.filter((item) => item.clientId !== clientId),
    meetings: workspace.meetings
      .filter((item) => item.clientId !== clientId)
      .map((item) => ({ ...item, contactIds: item.contactIds.filter((id) => !contactIds.has(id)) })),
    notes: workspace.notes.filter((item) => item.clientId !== clientId),
    emails: workspace.emails.filter((item) => item.clientId !== clientId),
    activities: workspace.activities.filter((item) => item.clientId !== clientId),
  }, now)
}

export const selectClient = (workspace: WorkspaceData, clientId: Id) => workspace.clients.find(({ id }) => id === clientId)
export const selectContactsForClient = (workspace: WorkspaceData, clientId: Id) => sortContacts(workspace.contacts.filter((item) => item.clientId === clientId))
export const selectPrimaryContact = (workspace: WorkspaceData, clientId: Id) => workspace.contacts.find((item) => item.clientId === clientId && item.isPrimary)
export const selectWorkItemsForClient = (workspace: WorkspaceData, clientId: Id) => sortWorkItems(workspace.workItems.filter((item) => item.clientId === clientId))
export const selectMeetingsForClient = (workspace: WorkspaceData, clientId: Id) => sortMeetings(workspace.meetings.filter((item) => item.clientId === clientId))
export const selectNotesForClient = (workspace: WorkspaceData, clientId: Id) => sortNotes(workspace.notes.filter((item) => item.clientId === clientId))
export const selectEmailsForClient = (workspace: WorkspaceData, clientId: Id) => sortEmails(workspace.emails.filter((item) => item.clientId === clientId))
export const selectActivitiesForClient = (workspace: WorkspaceData, clientId: Id) => sortActivities(workspace.activities.filter((item) => item.clientId === clientId))

export const sortClients = (items: Client[]) => [...items].sort((a, b) => a.name.localeCompare(b.name))
export const sortContacts = (items: Contact[]) => [...items].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))

const statusRank: Record<WorkItemStatus, number> = {
  [WorkItemStatus.InProgress]: 0,
  [WorkItemStatus.Waiting]: 1,
  [WorkItemStatus.Planned]: 2,
  [WorkItemStatus.Backlog]: 3,
  [WorkItemStatus.Completed]: 4,
  [WorkItemStatus.Canceled]: 5,
}

export const sortWorkItems = (items: WorkItem[]) => [...items].sort((a, b) =>
  statusRank[a.status] - statusRank[b.status] || timestamp(a.dueAt) - timestamp(b.dueAt) || a.title.localeCompare(b.title))
export const sortMeetings = (items: Meeting[]) => [...items].sort((a, b) => timestamp(a.startsAt) - timestamp(b.startsAt))
export const sortNotes = (items: Note[]) => [...items].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || timestamp(b.updatedAt) - timestamp(a.updatedAt))
export const sortEmails = (items: Email[]) => [...items].sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt))
export const sortActivities = (items: Activity[]) => [...items].sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt))
