import { FormEvent, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Field, Modal } from '../components/Modal'
import {
  Client,
  ClientStatus,
  Contact,
  ContactRole,
  Email,
  EmailDirection,
  EmailStatus,
  Meeting,
  MeetingStatus,
  Note,
  WorkItem,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
  WorkspaceData,
  WorkspaceSettings,
} from '../domain/types'
import { exportWorkspace, isValidLocale } from '../domain/workspace'
import { ConnectedError, type MailRelayClient } from '../infrastructure/serverClients'
import type { RecordKind } from './Screens'

export type EditableRecord = Client | Contact | WorkItem | Meeting | Note | Email
export type EditorTarget = { kind: RecordKind; record?: EditableRecord; clientId?: string }

interface EditorProps {
  target: EditorTarget
  workspace: WorkspaceData
  mailRelay?: MailRelayClient
  onClose: () => void
  onSave: (kind: RecordKind, record: EditableRecord) => void
  onDelete: (kind: RecordKind, id: string) => void
}

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
const now = () => new Date().toISOString()
const inputDate = (value?: string) => value ? new Date(value).toISOString().slice(0, 16) : ''
const isoDate = (value: string) => value ? new Date(value).toISOString() : undefined

function Actions({ existing, onClose, onDelete, submit = 'Save record', extra, disabled = false }: { existing: boolean; onClose: () => void; onDelete: () => void; submit?: string; extra?: React.ReactNode; disabled?: boolean }) {
  return <div className="form__actions">{existing && <button type="button" disabled={disabled} className="button button--danger delete-action" onClick={onDelete}><Icon name="trash" />Delete</button>}<span className="form__spacer" />{extra}<button type="button" disabled={disabled} className="button" onClick={onClose}>Cancel</button><button type="submit" disabled={disabled} className="button button--primary">{submit}</button></div>
}

export function RecordEditor(props: EditorProps) {
  switch (props.target.kind) {
    case 'client': return <ClientEditor {...props} record={props.target.record as Client | undefined} />
    case 'contact': return <ContactEditor {...props} record={props.target.record as Contact | undefined} />
    case 'work': return <WorkEditor {...props} record={props.target.record as WorkItem | undefined} />
    case 'meeting': return <MeetingEditor {...props} record={props.target.record as Meeting | undefined} />
    case 'note': return <NoteEditor {...props} record={props.target.record as Note | undefined} />
    case 'email': return <EmailEditor {...props} record={props.target.record as Email | undefined} />
  }
}

function ClientEditor({ record, onClose, onSave, onDelete }: EditorProps & { record?: Client }) {
  const stamp = now()
  const [draft, setDraft] = useState<Client>(record ?? { id: id(), name: '', status: ClientStatus.Prospect, createdAt: stamp, updatedAt: stamp })
  const set = <K extends keyof Client>(key: K, value: Client[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const address = draft.address ?? { line1: '', city: '', region: '', postalCode: '', country: '' }
  const setAddress = (key: keyof typeof address, value: string) => set('address', { ...address, [key]: value })
  const submit = (event: FormEvent) => { event.preventDefault(); onSave('client', { ...draft, name: draft.name.trim() }) }
  return <Modal title={record ? 'Edit client' : 'New client'} subtitle="The client record anchors every contact, task, meeting, note, and email." onClose={onClose} wide><form className="form" onSubmit={submit}><div className="form-grid">
    <Field label="Client or organization" span><input required autoFocus value={draft.name} onChange={(event) => set('name', event.target.value)} placeholder="Northstar Studio" /></Field>
    <Field label="Status"><select value={draft.status} onChange={(event) => set('status', event.target.value as ClientStatus)}>{Object.values(ClientStatus).map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Field or industry"><input value={draft.industry ?? ''} onChange={(event) => set('industry', event.target.value || undefined)} placeholder="Consulting, design, care services" /></Field>
    <p className="form__section">Contact details</p>
    <Field label="General email"><input type="email" value={draft.email ?? ''} onChange={(event) => set('email', event.target.value || undefined)} placeholder="hello@example.com" /></Field>
    <Field label="Phone"><input type="tel" value={draft.phone ?? ''} onChange={(event) => set('phone', event.target.value || undefined)} /></Field>
    <Field label="Website" span><input type="url" value={draft.website ?? ''} onChange={(event) => set('website', event.target.value || undefined)} placeholder="https://example.com" /></Field>
    <p className="form__section">Address</p>
    <Field label="Street" span><input value={address.line1} onChange={(event) => setAddress('line1', event.target.value)} /></Field>
    <Field label="City"><input value={address.city} onChange={(event) => setAddress('city', event.target.value)} /></Field>
    <Field label="Region"><input value={address.region} onChange={(event) => setAddress('region', event.target.value)} /></Field>
    <Field label="Postal code"><input value={address.postalCode} onChange={(event) => setAddress('postalCode', event.target.value)} /></Field>
    <Field label="Country"><input value={address.country} onChange={(event) => setAddress('country', event.target.value)} /></Field>
  </div><Actions existing={!!record} onClose={onClose} onDelete={() => confirmDelete('client', draft.id, onDelete)} /></form></Modal>
}

function ClientPicker({ workspace, value, disabled, onChange }: { workspace: WorkspaceData; value: string; disabled?: boolean; onChange: (id: string) => void }) {
  return <select required disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose a client</option>{workspace.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
}

function ContactEditor({ record, target, workspace, onClose, onSave, onDelete }: EditorProps & { record?: Contact }) {
  const stamp = now()
  const [draft, setDraft] = useState<Contact>(record ?? { id: id(), clientId: target.clientId ?? workspace.clients[0]?.id ?? '', firstName: '', lastName: '', role: ContactRole.Other, isPrimary: false, createdAt: stamp, updatedAt: stamp })
  const set = <K extends keyof Contact>(key: K, value: Contact[K]) => setDraft((current) => ({ ...current, [key]: value }))
  return <Modal title={record ? 'Edit contact' : 'New contact'} subtitle="A real person connected to one client record." onClose={onClose}><form className="form" onSubmit={(event) => { event.preventDefault(); onSave('contact', draft) }}><div className="form-grid">
    <Field label="Client" span><ClientPicker workspace={workspace} value={draft.clientId} disabled={!!record} onChange={(value) => set('clientId', value)} /></Field>
    <Field label="First name"><input required autoFocus value={draft.firstName} onChange={(event) => set('firstName', event.target.value)} /></Field>
    <Field label="Last name"><input required value={draft.lastName} onChange={(event) => set('lastName', event.target.value)} /></Field>
    <Field label="Relationship"><select value={draft.role} onChange={(event) => set('role', event.target.value as ContactRole)}>{Object.values(ContactRole).map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Role or title"><input value={draft.title ?? ''} onChange={(event) => set('title', event.target.value || undefined)} /></Field>
    <Field label="Email"><input type="email" value={draft.email ?? ''} onChange={(event) => set('email', event.target.value || undefined)} /></Field>
    <Field label="Phone"><input type="tel" value={draft.phone ?? ''} onChange={(event) => set('phone', event.target.value || undefined)} /></Field>
    <label className="checkbox field--span"><input type="checkbox" checked={draft.isPrimary} onChange={(event) => set('isPrimary', event.target.checked)} /><span>Primary contact for this client</span></label>
  </div><Actions existing={!!record} onClose={onClose} onDelete={() => confirmDelete('contact', draft.id, onDelete)} /></form></Modal>
}

function WorkEditor({ record, target, workspace, onClose, onSave, onDelete }: EditorProps & { record?: WorkItem }) {
  const stamp = now()
  const [draft, setDraft] = useState<WorkItem>(record ?? { id: id(), clientId: target.clientId ?? workspace.clients[0]?.id ?? '', title: '', type: WorkItemType.Task, status: WorkItemStatus.Planned, priority: WorkItemPriority.Normal, createdAt: stamp, updatedAt: stamp })
  const set = <K extends keyof WorkItem>(key: K, value: WorkItem[K]) => setDraft((current) => ({ ...current, [key]: value }))
  return <Modal title={record ? 'Edit task' : 'Add task'} subtitle="Record the task or project, who it belongs to, and when it is due." onClose={onClose}><form className="form" onSubmit={(event) => { event.preventDefault(); onSave('work', draft) }}><div className="form-grid">
    <Field label="Client" span><ClientPicker workspace={workspace} value={draft.clientId} disabled={!!record} onChange={(value) => set('clientId', value)} /></Field>
    <Field label="Title" span><input required autoFocus value={draft.title} onChange={(event) => set('title', event.target.value)} /></Field>
    <Field label="Type"><select value={draft.type} onChange={(event) => set('type', event.target.value as WorkItemType)}>{Object.values(WorkItemType).map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Status"><select value={draft.status} onChange={(event) => set('status', event.target.value as WorkItemStatus)}>{Object.values(WorkItemStatus).map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Priority"><select value={draft.priority} onChange={(event) => set('priority', event.target.value as WorkItemPriority)}>{Object.values(WorkItemPriority).map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Due"><input type="datetime-local" value={inputDate(draft.dueAt)} onChange={(event) => set('dueAt', isoDate(event.target.value))} /></Field>
    <Field label="Details" span><textarea value={draft.description ?? ''} onChange={(event) => set('description', event.target.value || undefined)} /></Field>
  </div><Actions existing={!!record} onClose={onClose} onDelete={() => confirmDelete('task', draft.id, onDelete)} /></form></Modal>
}

function MeetingEditor({ record, target, workspace, onClose, onSave, onDelete }: EditorProps & { record?: Meeting }) {
  const stamp = now()
  const start = new Date(Date.now() + 86_400_000); start.setMinutes(0, 0, 0)
  const [draft, setDraft] = useState<Meeting>(record ?? { id: id(), clientId: target.clientId ?? workspace.clients[0]?.id ?? '', contactIds: [], title: '', status: MeetingStatus.Scheduled, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3_600_000).toISOString(), createdAt: stamp, updatedAt: stamp })
  const set = <K extends keyof Meeting>(key: K, value: Meeting[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const contacts = workspace.contacts.filter(({ clientId }) => clientId === draft.clientId)
  return <Modal title={record ? 'Edit meeting' : 'Schedule meeting'} subtitle="Keep the agenda before the conversation and the outcome after it." onClose={onClose} wide><form className="form" onSubmit={(event) => { event.preventDefault(); onSave('meeting', draft) }}><div className="form-grid">
    <Field label="Client"><ClientPicker workspace={workspace} value={draft.clientId} onChange={(value) => { setDraft((current) => ({ ...current, clientId: value, contactIds: [] })) }} /></Field>
    <Field label="Contact"><select value={draft.contactIds[0] ?? ''} onChange={(event) => set('contactIds', event.target.value ? [event.target.value] : [])}><option value="">No contact selected</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}</select></Field>
    <Field label="Title" span><input required autoFocus value={draft.title} onChange={(event) => set('title', event.target.value)} /></Field>
    <Field label="Starts"><input required type="datetime-local" value={inputDate(draft.startsAt)} onChange={(event) => set('startsAt', isoDate(event.target.value) ?? draft.startsAt)} /></Field>
    <Field label="Ends"><input required type="datetime-local" min={inputDate(draft.startsAt)} value={inputDate(draft.endsAt)} onChange={(event) => set('endsAt', isoDate(event.target.value) ?? draft.endsAt)} /></Field>
    <Field label="Status"><select value={draft.status} onChange={(event) => set('status', event.target.value as MeetingStatus)}>{Object.values(MeetingStatus).map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Location"><input value={draft.location ?? ''} onChange={(event) => set('location', event.target.value || undefined)} placeholder="Phone, office, video link" /></Field>
    <Field label="Agenda" span><textarea value={draft.agenda ?? ''} onChange={(event) => set('agenda', event.target.value || undefined)} /></Field>
    <Field label="Outcome" span><textarea value={draft.outcome ?? ''} onChange={(event) => set('outcome', event.target.value || undefined)} /></Field>
  </div><Actions existing={!!record} onClose={onClose} onDelete={() => confirmDelete('meeting', draft.id, onDelete)} /></form></Modal>
}

function NoteEditor({ record, target, workspace, onClose, onSave, onDelete }: EditorProps & { record?: Note }) {
  const stamp = now()
  const [draft, setDraft] = useState<Note>(record ?? { id: id(), clientId: target.clientId ?? workspace.clients[0]?.id ?? '', title: '', body: '', isPinned: false, createdAt: stamp, updatedAt: stamp })
  const set = <K extends keyof Note>(key: K, value: Note[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const work = workspace.workItems.filter(({ clientId }) => clientId === draft.clientId)
  return <Modal title={record ? 'Edit note' : 'New note'} subtitle="Keep the context that should not be lost between conversations." onClose={onClose}><form className="form" onSubmit={(event) => { event.preventDefault(); onSave('note', draft) }}><div className="form-grid">
    <Field label="Client"><ClientPicker workspace={workspace} value={draft.clientId} onChange={(value) => setDraft((current) => ({ ...current, clientId: value, workItemId: undefined }))} /></Field>
    <Field label="Related task"><select value={draft.workItemId ?? ''} onChange={(event) => set('workItemId', event.target.value || undefined)}><option value="">No related task</option>{work.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
    <Field label="Title" span><input required autoFocus value={draft.title} onChange={(event) => set('title', event.target.value)} /></Field>
    <Field label="Note" span><textarea required className="long-text" value={draft.body} onChange={(event) => set('body', event.target.value)} /></Field>
    <label className="checkbox field--span"><input type="checkbox" checked={draft.isPinned} onChange={(event) => set('isPinned', event.target.checked)} /><span>Pin this note</span></label>
  </div><Actions existing={!!record} onClose={onClose} onDelete={() => confirmDelete('note', draft.id, onDelete)} /></form></Modal>
}

function EmailEditor({ record, target, workspace, mailRelay, onClose, onSave, onDelete }: EditorProps & { record?: Email }) {
  const stamp = now()
  const formRef = useRef<HTMLFormElement>(null)
  const initialClient = target.clientId ?? workspace.clients[0]?.id ?? ''
  const client = workspace.clients.find(({ id: clientId }) => clientId === initialClient)
  const contact = workspace.contacts.find(({ clientId, isPrimary }) => clientId === initialClient && isPrimary)
  const [draft, setDraft] = useState<Email>(record ?? { id: id(), clientId: initialClient, contactId: contact?.id, direction: EmailDirection.Outgoing, status: EmailStatus.Draft, from: '', to: contact?.email ? [contact.email] : client?.email ? [client.email] : [], cc: [], subject: '', body: '', occurredAt: stamp, createdAt: stamp, updatedAt: stamp })
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const set = <K extends keyof Email>(key: K, value: Email[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const contacts = workspace.contacts.filter(({ clientId }) => clientId === draft.clientId)
  const statuses = draft.direction === EmailDirection.Outgoing ? [EmailStatus.Draft, EmailStatus.Sent, EmailStatus.Archived] : [EmailStatus.Received, EmailStatus.Archived]
  const changeClient = (clientId: string) => {
    const nextContact = workspace.contacts.find(({ clientId: ownerId, isPrimary }) => ownerId === clientId && isPrimary)
    const nextClient = workspace.clients.find(({ id: candidateId }) => candidateId === clientId)
    const recipient = nextContact?.email ?? nextClient?.email
    setDraft((current) => ({
      ...current,
      clientId,
      contactId: nextContact?.id,
      to: current.direction === EmailDirection.Outgoing ? recipient ? [recipient] : [] : current.to,
      cc: current.direction === EmailDirection.Outgoing ? [] : current.cc,
    }))
  }
  const save = (openMail: boolean) => {
    const email = { ...draft, status: openMail ? EmailStatus.Draft : draft.status, occurredAt: draft.occurredAt || stamp }
    onSave('email', email)
    if (openMail && email.direction === EmailDirection.Outgoing) {
      const params = new URLSearchParams({ subject: email.subject, body: email.body })
      if (email.cc.length) params.set('cc', email.cc.join(','))
      window.location.href = `mailto:${email.to.join(',')}?${params}`
    }
  }
  const sendThroughRelay = async () => {
    if (!mailRelay) return
    setSending(true)
    setSendError('')
    try {
      const receipt = await mailRelay.send(workspace.id, draft)
      setSending(false)
      onSave('email', { ...draft, from: receipt.from, status: EmailStatus.Sent, occurredAt: receipt.acceptedAt })
    } catch (error) {
      setSending(false)
      const message = error instanceof ConnectedError ? error.message : 'The relay lost confirmation and this message may have been sent. Check the provider before trying again.'
      setSendError(`${message} Keepside left the record as a draft.`)
    }
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    save(false)
  }
  const canSend = draft.direction === EmailDirection.Outgoing && draft.status === EmailStatus.Draft
  const relayAction = mailRelay && canSend ? <button type="button" onClick={() => formRef.current?.reportValidity() && void sendThroughRelay()} disabled={sending} className="button"><Icon name="send" />{sending ? 'Sending…' : 'Send through relay'}</button> : undefined
  const mailAction = canSend ? <button type="button" onClick={() => formRef.current?.reportValidity() && save(true)} disabled={sending} className="button">Open in Mail</button> : undefined
  return <Modal title={record ? 'Edit mail record' : 'Write or log email'} subtitle={mailRelay ? 'Send through your configured relay or keep this message as a draft.' : 'Open the message in your default mail app or keep it as a draft.'} onClose={onClose} dismissible={!sending} wide><form ref={formRef} className="form email-editor" aria-busy={sending} onSubmit={submit}><fieldset className="form-grid" disabled={sending}>
    <Field label="To" span><input required autoFocus value={draft.to.join(', ')} onChange={(event) => set('to', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="client@example.com" /></Field>
    <Field label="CC" span><input value={draft.cc.join(', ')} onChange={(event) => set('cc', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} /></Field>
    <Field label="Subject" span><input required value={draft.subject} onChange={(event) => set('subject', event.target.value)} /></Field>
    <Field label="Message" span><textarea required className="long-text" value={draft.body} onChange={(event) => set('body', event.target.value)} /></Field>
    <p className="form__section email-editor__details">Record details</p>
    <Field label="Direction"><select value={draft.direction} onChange={(event) => { const direction = event.target.value as EmailDirection; setDraft((current) => ({ ...current, direction, status: direction === EmailDirection.Outgoing ? EmailStatus.Draft : EmailStatus.Received })) }}>{Object.values(EmailDirection).map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Status"><select value={draft.status} onChange={(event) => set('status', event.target.value as EmailStatus)}>{statuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></Field>
    <Field label="Client"><ClientPicker workspace={workspace} value={draft.clientId} onChange={changeClient} /></Field>
    <Field label="Contact"><select value={draft.contactId ?? ''} onChange={(event) => { const chosen = contacts.find(({ id }) => id === event.target.value); setDraft((current) => ({ ...current, contactId: chosen?.id, to: current.direction === EmailDirection.Outgoing && chosen?.email ? [chosen.email] : current.to })) }}><option value="">No contact selected</option>{contacts.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select></Field>
    <Field label="Date"><input required type="datetime-local" value={inputDate(draft.occurredAt)} onChange={(event) => set('occurredAt', isoDate(event.target.value) ?? stamp)} /></Field>
    <Field label="From"><input required type="email" value={draft.from} onChange={(event) => set('from', event.target.value)} placeholder="you@example.com" /></Field>
    {sendError && <p className="form-message field--span" role="alert">{sendError}</p>}
  </fieldset><Actions existing={!!record} disabled={sending} onClose={onClose} onDelete={() => confirmDelete('email record', draft.id, onDelete)} submit={draft.status === EmailStatus.Draft ? 'Save draft' : 'Save record'} extra={<>{relayAction}{mailAction}</>} /></form></Modal>
}

function confirmDelete(label: string, recordId: string, onDelete: (kind: RecordKind, id: string) => void) {
  const kind: RecordKind = label === 'task' ? 'work' : label === 'email record' ? 'email' : label as RecordKind
  if (window.confirm(`Delete this ${label}? This cannot be undone.`)) onDelete(kind, recordId)
}

interface SettingsEditorProps {
  workspace: WorkspaceData
  onClose: () => void
  onSettings: (settings: WorkspaceSettings) => void
  onImport: (serialized: string) => boolean
  onSample: () => void
  onClear: () => void
}

export function SettingsEditor({ workspace, onClose, onSettings, onImport, onSample, onClear }: SettingsEditorProps) {
  const [settings, setSettings] = useState(workspace.settings)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportWorkspace(workspace)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `keepside-workspace-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url)
  }
  const importFile = async (file?: File) => {
    if (!file) return
    if (onImport(await file.text())) { onClose(); return }
    setMessage('That file is not a valid Keepside workspace.')
  }
  return <Modal title="Workspace settings" subtitle="Personalize the register and keep a portable copy of your data." onClose={onClose} wide><form className="form" onSubmit={(event) => { event.preventDefault(); onSettings(settings) }}><div className="form-grid">
    <Field label="Your name"><input value={settings.ownerName} onChange={(event) => setSettings({ ...settings, ownerName: event.target.value })} /></Field>
    <Field label="Business name"><input value={settings.businessName} onChange={(event) => setSettings({ ...settings, businessName: event.target.value })} /></Field>
    <Field label="Locale"><input required value={settings.locale} onChange={(event) => { const locale = event.target.value; event.target.setCustomValidity(isValidLocale(locale) ? '' : 'Use a valid locale such as en-US.'); setSettings({ ...settings, locale }) }} placeholder="en-US" /></Field>
    <Field label="Currency"><input value={settings.currency} maxLength={3} onChange={(event) => setSettings({ ...settings, currency: event.target.value.toUpperCase() })} placeholder="USD" /></Field>
    <p className="form__section">Workspace data</p>
    <div className="settings-grid field--span"><button type="button" className="settings-action" onClick={download}><Icon name="download" /><span><strong>Export workspace</strong><span>Download every record as one portable JSON file.</span></span></button><button type="button" className="settings-action" onClick={() => fileRef.current?.click()}><Icon name="upload" /><span><strong>Import workspace</strong><span>Replace this browser's workspace from a Keepside file.</span></span></button><input className="file-input" ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} /></div>
    {message && <p className="form-message field--span">{message}</p>}
    <p className="privacy-note field--span">Local mode keeps this workspace in the browser. A configured relay receives a message only when you choose Send through relay.</p>
  </div><div className="danger-zone"><button type="button" className="button" onClick={onSample}>Replace with sample workspace</button><button type="button" className="button button--danger danger-right" onClick={() => window.confirm('Clear every record in this workspace? This cannot be undone.') && onClear()}>Clear workspace</button></div><Actions existing={false} onClose={onClose} onDelete={() => undefined} submit="Save settings" /></form></Modal>
}
