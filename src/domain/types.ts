export type Id = string
export type IsoDateString = string

export enum ClientStatus {
  Prospect = 'prospect',
  Active = 'active',
  Paused = 'paused',
  Inactive = 'inactive',
  Archived = 'archived',
}

export enum ContactRole {
  Owner = 'owner',
  DecisionMaker = 'decision_maker',
  Billing = 'billing',
  Operations = 'operations',
  Other = 'other',
}

export enum WorkItemType {
  Project = 'project',
  Task = 'task',
  Service = 'service',
  FollowUp = 'follow_up',
}

export enum WorkItemStatus {
  Backlog = 'backlog',
  Planned = 'planned',
  InProgress = 'in_progress',
  Waiting = 'waiting',
  Completed = 'completed',
  Canceled = 'canceled',
}

export enum WorkItemPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

export enum MeetingStatus {
  Scheduled = 'scheduled',
  Completed = 'completed',
  Canceled = 'canceled',
}

export enum EmailDirection {
  Incoming = 'incoming',
  Outgoing = 'outgoing',
}

export enum EmailStatus {
  Draft = 'draft',
  Sent = 'sent',
  Received = 'received',
  Archived = 'archived',
}

export enum ActivityType {
  ClientCreated = 'client_created',
  ClientUpdated = 'client_updated',
  ContactAdded = 'contact_added',
  WorkCreated = 'work_created',
  WorkUpdated = 'work_updated',
  WorkCompleted = 'work_completed',
  MeetingScheduled = 'meeting_scheduled',
  MeetingCompleted = 'meeting_completed',
  NoteAdded = 'note_added',
  EmailSaved = 'email_saved',
  EmailSent = 'email_sent',
  EmailReceived = 'email_received',
}

export enum ActivityEntityType {
  Client = 'client',
  Contact = 'contact',
  WorkItem = 'work_item',
  Meeting = 'meeting',
  Note = 'note',
  Email = 'email',
}

export enum WorkspaceTheme {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}

export interface Address {
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
}

export interface Client {
  id: Id
  name: string
  status: ClientStatus
  industry?: string
  email?: string
  phone?: string
  website?: string
  address?: Address
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export interface Contact {
  id: Id
  clientId: Id
  firstName: string
  lastName: string
  role: ContactRole
  title?: string
  email?: string
  phone?: string
  isPrimary: boolean
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export interface WorkItem {
  id: Id
  clientId: Id
  title: string
  description?: string
  type: WorkItemType
  status: WorkItemStatus
  priority: WorkItemPriority
  dueAt?: IsoDateString
  completedAt?: IsoDateString
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export interface Meeting {
  id: Id
  clientId: Id
  contactIds: Id[]
  title: string
  status: MeetingStatus
  startsAt: IsoDateString
  endsAt: IsoDateString
  location?: string
  agenda?: string
  outcome?: string
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export interface Note {
  id: Id
  clientId: Id
  workItemId?: Id
  title: string
  body: string
  isPinned: boolean
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export interface Email {
  id: Id
  clientId: Id
  contactId?: Id
  direction: EmailDirection
  status: EmailStatus
  from: string
  to: string[]
  cc: string[]
  subject: string
  body: string
  occurredAt: IsoDateString
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

export interface Activity {
  id: Id
  clientId?: Id
  entityType: ActivityEntityType
  entityId: Id
  type: ActivityType
  summary: string
  occurredAt: IsoDateString
}

export interface WorkspaceSettings {
  ownerName: string
  businessName: string
  timezone: string
  locale: string
  currency: string
  theme: WorkspaceTheme
  weekStartsOn: 0 | 1
}

export interface WorkspaceData {
  schemaVersion: 1
  id: Id
  name: string
  settings: WorkspaceSettings
  clients: Client[]
  contacts: Contact[]
  workItems: WorkItem[]
  meetings: Meeting[]
  notes: Note[]
  emails: Email[]
  activities: Activity[]
  createdAt: IsoDateString
  updatedAt: IsoDateString
}
