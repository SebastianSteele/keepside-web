import { useEffect, useRef, useState } from 'react'
import { CommandSearch } from './components/CommandSearch'
import { Shell, type Section } from './components/Shell'
import { createSampleWorkspace } from './domain/sample'
import {
  ActivityEntityType,
  ActivityType,
  Client,
  Contact,
  Email,
  EmailDirection,
  Meeting,
  MeetingStatus,
  Note,
  WorkItem,
  WorkItemStatus,
  WorkspaceData,
} from './domain/types'
import {
  createEmptyWorkspace,
  deleteClient,
  deleteContact,
  deleteEmail,
  deleteMeeting,
  deleteNote,
  deleteWorkItem,
  importWorkspace,
  loadWorkspaceResult,
  saveWorkspace,
  updateWorkspaceSettings,
  upsertActivity,
  upsertClient,
  upsertContact,
  upsertEmail,
  upsertMeeting,
  upsertNote,
  upsertWorkItem,
} from './domain/workspace'
import { MailRelayClient } from './infrastructure/serverClients'
import { EditableRecord, EditorTarget, RecordEditor, SettingsEditor } from './screens/Editors'
import {
  ClientsScreen,
  ContactsScreen,
  MailScreen,
  MeetingsScreen,
  NotesScreen,
  RecordKind,
  ScreenActions,
  TodayScreen,
  WorkScreen,
} from './screens/Screens'

const recordId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
const connectedApiUrl = import.meta.env.VITE_KEEPSIDE_API_URL?.trim()
const mailRelay = connectedApiUrl ? new MailRelayClient(connectedApiUrl) : undefined
const demoMode = import.meta.env.VITE_KEEPSIDE_DEMO === 'true'
const demoParams = demoMode ? new URLSearchParams(window.location.search) : undefined
const sectionValues: Section[] = ['today', 'clients', 'work', 'meetings', 'mail', 'notes', 'contacts']
const demoSection = sectionValues.find((value) => value === demoParams?.get('section')) ?? 'today'

export default function App() {
  const [loaded] = useState(() => demoMode ? { workspace: createSampleWorkspace() } : loadWorkspaceResult())
  const [workspace, setWorkspace] = useState<WorkspaceData>(loaded.workspace)
  const [section, setSection] = useState<Section>(demoSection)
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(() => demoParams?.get('client') ?? undefined)
  const [editor, setEditor] = useState<EditorTarget | undefined>(() => {
    const emailId = demoParams?.get('compose')
    const record = emailId ? loaded.workspace.emails.find(({ id }) => id === emailId) : undefined
    return record ? { kind: 'email', record } : undefined
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [storageError, setStorageError] = useState(loaded.error === 'unavailable')
  const [loadError, setLoadError] = useState(loaded.error === 'invalid')
  const firstSave = useRef(true)

  useEffect(() => {
    if (firstSave.current) { firstSave.current = false; return }
    setLoadError(false)
    setStorageError(!saveWorkspace(workspace))
  }, [workspace])
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); return }
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) return
      const kind = ({ n: 'client', t: 'work', m: 'meeting', e: 'email', d: 'note' } as Partial<Record<string, RecordKind>>)[event.key.toLowerCase()]
      if (kind && (kind === 'client' || workspace.clients.length)) { event.preventDefault(); setEditor({ kind }) }
    }
    window.addEventListener('keydown', shortcuts)
    return () => window.removeEventListener('keydown', shortcuts)
  }, [workspace.clients.length])

  const actions: ScreenActions = {
    edit: (kind, record, clientId) => setEditor({ kind, record, clientId }),
    openClient: (clientId) => { setSelectedClientId(clientId); setSection('clients') },
    navigate: (next) => { if (next === 'clients') setSelectedClientId(undefined); setSection(next) },
    loadSample: () => setWorkspace(createSampleWorkspace()),
  }

  const saveRecord = (kind: RecordKind, record: EditableRecord) => {
    setWorkspace((current) => recordChange(current, kind, record))
    if (kind === 'client') setSelectedClientId(record.id)
    setEditor(undefined)
  }

  const removeRecord = (kind: RecordKind, id: string) => {
    setWorkspace((current) => {
      switch (kind) {
        case 'client': return deleteClient(current, id)
        case 'contact': return deleteContact(current, id)
        case 'work': return deleteWorkItem(current, id)
        case 'meeting': return deleteMeeting(current, id)
        case 'note': return deleteNote(current, id)
        case 'email': return deleteEmail(current, id)
      }
    })
    if (kind === 'client') setSelectedClientId(undefined)
    setEditor(undefined)
  }

  return <><Shell section={section} onSection={setSection} onClient={(clientId) => setSelectedClientId(clientId)} onSearch={() => setSearchOpen(true)} onNewClient={() => setEditor({ kind: 'client' })} onSettings={() => setSettingsOpen(true)} workspace={workspace} selectedClientId={selectedClientId} mobileOpen={mobileOpen} onMobileOpen={setMobileOpen}>
    {section === 'today' && <TodayScreen workspace={workspace} actions={actions} />}
    {section === 'clients' && <ClientsScreen workspace={workspace} actions={actions} selectedId={selectedClientId} onSelect={setSelectedClientId} />}
    {section === 'work' && <WorkScreen workspace={workspace} actions={actions} />}
    {section === 'meetings' && <MeetingsScreen workspace={workspace} actions={actions} />}
    {section === 'mail' && <MailScreen workspace={workspace} actions={actions} />}
    {section === 'notes' && <NotesScreen workspace={workspace} actions={actions} />}
    {section === 'contacts' && <ContactsScreen workspace={workspace} actions={actions} />}
    {searchOpen && <CommandSearch workspace={workspace} onClose={() => setSearchOpen(false)} onSection={(next) => { if (next === 'clients') setSelectedClientId(undefined); setSection(next) }} onClient={actions.openClient} onEdit={(kind, record) => setEditor({ kind, record })} />}
    {editor && <RecordEditor key={`${editor.kind}-${editor.record?.id ?? 'new'}`} target={editor} workspace={workspace} mailRelay={mailRelay} onClose={() => setEditor(undefined)} onSave={saveRecord} onDelete={removeRecord} />}
    {settingsOpen && <SettingsEditor workspace={workspace} onClose={() => setSettingsOpen(false)} onSettings={(settings) => { setWorkspace((current) => updateWorkspaceSettings(current, settings)); setSettingsOpen(false) }} onImport={(serialized) => { const imported = importWorkspace(serialized); if (!imported) return false; setWorkspace(imported); setSelectedClientId(undefined); return true }} onSample={() => { if (window.confirm('Replace this workspace with sample data?')) { setWorkspace(createSampleWorkspace()); setSelectedClientId(undefined); setSettingsOpen(false) } }} onClear={() => { setWorkspace(createEmptyWorkspace()); setSelectedClientId(undefined); setSettingsOpen(false) }} />}
  </Shell>{loadError && <div className="storage-alert" role="alert">The saved workspace could not be read, so Keepside left it untouched. Import a valid backup before making changes.</div>}{storageError && <div className="storage-alert" role="alert">Keepside cannot save in this browser right now. Export a workspace copy from Settings before closing this tab.</div>}</>
}

function recordChange(workspace: WorkspaceData, kind: RecordKind, record: EditableRecord): WorkspaceData {
  const stamp = new Date().toISOString()
  let next: WorkspaceData
  let activity: { clientId?: string; entityType: ActivityEntityType; type: ActivityType; summary: string }

  switch (kind) {
    case 'client': {
      const client = record as Client
      const existing = workspace.clients.some(({ id }) => id === client.id)
      next = upsertClient(workspace, client, stamp)
      activity = { clientId: client.id, entityType: ActivityEntityType.Client, type: existing ? ActivityType.ClientUpdated : ActivityType.ClientCreated, summary: `${existing ? 'Updated' : 'Added'} ${client.name}` }
      break
    }
    case 'contact': {
      const contact = record as Contact
      next = upsertContact(workspace, contact, stamp)
      activity = { clientId: contact.clientId, entityType: ActivityEntityType.Contact, type: ActivityType.ContactAdded, summary: `Recorded contact ${contact.firstName} ${contact.lastName}` }
      break
    }
    case 'work': {
      const work = record as WorkItem
      const existing = workspace.workItems.find(({ id }) => id === work.id)
      next = upsertWorkItem(workspace, work, stamp)
      activity = { clientId: work.clientId, entityType: ActivityEntityType.WorkItem, type: work.status === WorkItemStatus.Completed && existing?.status !== WorkItemStatus.Completed ? ActivityType.WorkCompleted : existing ? ActivityType.WorkUpdated : ActivityType.WorkCreated, summary: `${existing ? 'Updated' : 'Added'} ${work.title}` }
      break
    }
    case 'meeting': {
      const meeting = record as Meeting
      next = upsertMeeting(workspace, meeting, stamp)
      activity = { clientId: meeting.clientId, entityType: ActivityEntityType.Meeting, type: meeting.status === MeetingStatus.Completed ? ActivityType.MeetingCompleted : ActivityType.MeetingScheduled, summary: `${meeting.status === MeetingStatus.Completed ? 'Completed' : 'Scheduled'} ${meeting.title}` }
      break
    }
    case 'note': {
      const note = record as Note
      next = upsertNote(workspace, note, stamp)
      activity = { clientId: note.clientId, entityType: ActivityEntityType.Note, type: ActivityType.NoteAdded, summary: `Recorded ${note.title}` }
      break
    }
    case 'email': {
      const email = record as Email
      next = upsertEmail(workspace, email, stamp)
      const sent = email.direction === EmailDirection.Outgoing && email.status === 'sent'
      const received = email.direction === EmailDirection.Incoming && email.status === 'received'
      activity = { clientId: email.clientId, entityType: ActivityEntityType.Email, type: sent ? ActivityType.EmailSent : received ? ActivityType.EmailReceived : ActivityType.EmailSaved, summary: `${sent ? 'Sent' : received ? 'Received' : 'Saved'} ${email.subject}` }
      break
    }
  }

  return upsertActivity(next, { id: recordId(), clientId: activity.clientId, entityType: activity.entityType, entityId: record.id, type: activity.type, summary: activity.summary, occurredAt: stamp }, stamp)
}
