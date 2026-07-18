import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Mark } from '../components/Logo'
import { PageHeader } from '../components/Shell'
import type { Section } from '../components/Shell'
import {
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
} from '../domain/types'
import {
  selectContactsForClient,
  selectEmailsForClient,
  selectMeetingsForClient,
  selectNotesForClient,
  selectWorkItemsForClient,
  sortClients,
  sortContacts,
  sortEmails,
  sortMeetings,
  sortNotes,
  sortWorkItems,
} from '../domain/workspace'

export type RecordKind = 'client' | 'contact' | 'work' | 'meeting' | 'note' | 'email'

export interface ScreenActions {
  edit: (kind: RecordKind, record?: Client | Contact | WorkItem | Meeting | Note | Email, clientId?: string) => void
  openClient: (clientId: string) => void
  navigate: (section: Section) => void
  loadSample: () => void
}

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const clientTone = (id: string) => [...id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 6
const clientName = (workspace: WorkspaceData, clientId: string) => workspace.clients.find(({ id }) => id === clientId)?.name ?? 'Unknown client'
const formatDate = (value: string, locale: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
  new Intl.DateTimeFormat(locale, options).format(new Date(value))
const formatTime = (value: string, locale: string) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const relativeDate = (value: string) => {
  const days = Math.round((new Date(value).getTime() - Date.now()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(days, 'day')
}
const sameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
const greeting = (date: Date) => date.getHours() < 12 ? 'morning' : date.getHours() < 18 ? 'afternoon' : 'evening'

function EmptyState({ title, copy, action, onAction, sample }: { title: string; copy: string; action: string; onAction: () => void; sample?: () => void }) {
  return <div className="empty-state"><div><div className="empty-state__mark"><Mark size={34} /></div><h2>{title}</h2><p>{copy}</p><div className="empty-state__actions"><button className="button button--primary" onClick={onAction}>{action}</button>{sample && <button className="button" onClick={sample}>Use sample workspace</button>}</div></div></div>
}

function WorkRow({ item, workspace, onClick, full }: { item: WorkItem; workspace: WorkspaceData; onClick: () => void; full?: boolean }) {
  const overdue = item.dueAt && new Date(item.dueAt) < new Date() && item.status !== WorkItemStatus.Completed
  return <button className={`ledger-row work-row${full ? ' full-work-row' : ''}`} onClick={onClick}>
    <span className="priority-mark" data-priority={item.priority} aria-label={`${titleCase(item.priority)} priority`} role="img" />
    <span className="row-title"><strong>{item.title}</strong><span>{titleCase(item.type)}</span></span>
    <span className="row-meta">{clientName(workspace, item.clientId)}</span>
    <span className="status" data-tone={item.status}>{titleCase(item.status)}</span>
    <span className={overdue ? 'row-date row-date--overdue' : 'row-date'}>{item.dueAt ? relativeDate(item.dueAt) : 'No date'}</span>
  </button>
}

function MeetingRow({ meeting, workspace, onClick }: { meeting: Meeting; workspace: WorkspaceData; onClick: () => void }) {
  return <button className="meeting-row" onClick={onClick}>
    <span className="date-block"><b>{formatDate(meeting.startsAt, workspace.settings.locale, { day: '2-digit' })}</b><span>{formatDate(meeting.startsAt, workspace.settings.locale, { month: 'short' })}</span></span>
    <span className="row-title"><strong>{meeting.title}</strong><span>{clientName(workspace, meeting.clientId)}{meeting.location ? ` · ${meeting.location}` : ''}</span></span>
    <span className="meeting-row__time">{formatTime(meeting.startsAt, workspace.settings.locale)}</span>
  </button>
}

export function TodayScreen({ workspace, actions }: { workspace: WorkspaceData; actions: ScreenActions }) {
  const now = new Date()
  const openWork = sortWorkItems(workspace.workItems).filter(({ status }) => status !== WorkItemStatus.Completed && status !== WorkItemStatus.Canceled)
  const upcoming = sortMeetings(workspace.meetings).filter(({ status, startsAt }) => status === MeetingStatus.Scheduled && new Date(startsAt) >= now)
  const dueToday = openWork.filter(({ dueAt }) => dueAt && sameDay(new Date(dueAt), now))
  const weekEnds = new Date(now)
  weekEnds.setDate(weekEnds.getDate() + 7)
  const attention = workspace.clients.map((client) => {
    const work = openWork.filter(({ clientId }) => clientId === client.id)
    const overdue = work.filter(({ dueAt }) => dueAt && new Date(dueAt) < now && !sameDay(new Date(dueAt), now)).length
    const waiting = work.filter(({ status }) => status === WorkItemStatus.Waiting).length
    return { client, work, overdue, waiting }
  }).filter(({ work }) => work.length).sort((a, b) => b.overdue - a.overdue || b.waiting - a.waiting || b.work.length - a.work.length)
  const weekAhead = [
    ...upcoming.filter(({ startsAt }) => new Date(startsAt) <= weekEnds).map((record) => ({ id: record.id, kind: 'meeting' as const, at: record.startsAt, title: record.title, clientId: record.clientId, record })),
    ...openWork.filter(({ dueAt }) => dueAt && new Date(dueAt) >= now && new Date(dueAt) <= weekEnds).map((record) => ({ id: record.id, kind: 'work' as const, at: record.dueAt!, title: record.title, clientId: record.clientId, record })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const railNotes = sortNotes(workspace.notes).slice(0, 3)
  const railMail = sortEmails(workspace.emails).slice(0, 3)
  const recentClients = [...workspace.clients].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4)
  const owner = workspace.settings.ownerName.trim().split(/\s+/)[0] || 'there'

  if (!workspace.clients.length) return <div className="page"><EmptyState title="Start with the people you serve" copy="Keepside keeps clients, conversations, work, and follow-ups together in one private ledger." action="Add your first client" onAction={() => actions.edit('client')} sample={actions.loadSample} /></div>

  return <div className="page dashboard-page">
    <header className="dashboard-head">
      <h1>Good {greeting(now)}, {owner}</h1>
      <p>{formatDate(now.toISOString(), workspace.settings.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    </header>

    <div className="dashboard-layout">
      <div className="dashboard-flow">
        <section className="dashboard-section dashboard-today">
          <header className="dashboard-section__head"><h2>Today</h2><time>{formatDate(now.toISOString(), workspace.settings.locale, { weekday: 'long', day: 'numeric', month: 'short' })}</time></header>
          <div className="today-outcome">
            <h3>{dueToday.length ? `${dueToday.length} ${dueToday.length === 1 ? 'item' : 'items'} due today` : 'Nothing due today'}</h3>
            <p>{dueToday.length ? 'These are the commitments that need a decision before the day closes.' : upcoming[0] ? 'You are clear for now. Your next client conversation is below.' : 'You are clear. Add a task or meeting when something new lands.'}</p>
          </div>
          {dueToday.slice(0, 3).map((item) => <button className="today-focus-row" key={item.id} onClick={() => actions.edit('work', item)}><span className="priority-mark" data-priority={item.priority} aria-label={`${titleCase(item.priority)} priority`} role="img" /><span><strong>{item.title}</strong><small>{clientName(workspace, item.clientId)}</small></span><Icon name="arrow" /></button>)}
          {!dueToday.length && upcoming[0] && <button className="next-conversation" onClick={() => actions.edit('meeting', upcoming[0])}><span className="next-conversation__icon"><Icon name="meetings" /></span><span><strong>{upcoming[0].title}</strong><small>Next up · {formatDate(upcoming[0].startsAt, workspace.settings.locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {clientName(workspace, upcoming[0].clientId)}</small></span><Icon name="arrow" /></button>}
          <button className="button button--primary dashboard-link" onClick={() => actions.navigate('meetings')}>Open calendar <Icon name="arrow" /></button>
        </section>

        <section className="dashboard-section">
          <header className="dashboard-section__head"><h2>Needs attention</h2><span>By client</span></header>
          <div className="attention-list">{attention.slice(0, 7).map(({ client, work, overdue, waiting }) => <button className="attention-row" key={client.id} onClick={() => actions.openClient(client.id)}>
            <span className="client-token client-token--large" data-tone={clientTone(client.id)}>{initials(client.name)}</span>
            <span className="attention-row__copy"><strong>{client.name}</strong><small>{overdue ? `${overdue} overdue ${overdue === 1 ? 'task' : 'tasks'}` : waiting ? `${waiting} waiting ${waiting === 1 ? 'item' : 'items'}` : `${work.length} open ${work.length === 1 ? 'item' : 'items'}`}</small></span>
            <span className="attention-row__count" data-state={overdue ? 'late' : waiting ? 'waiting' : 'open'}>{work.length}</span>
          </button>)}</div>
          {!attention.length && <p className="empty-row">Every client is clear.</p>}
        </section>

        <section className="dashboard-section week-section">
          <header className="dashboard-section__head"><h2>Week ahead</h2><span>Next seven days</span></header>
          <div className="week-list">{weekAhead.slice(0, 8).map((event) => <button className="week-row" key={`${event.kind}-${event.id}`} onClick={() => actions.edit(event.kind, event.record)}>
            <span className="week-row__icon"><Icon name={event.kind === 'meeting' ? 'meetings' : 'work'} /></span>
            <span><strong>{event.title}</strong><small>{clientName(workspace, event.clientId)}</small></span>
            <time>{formatDate(event.at, workspace.settings.locale, { weekday: 'short', day: 'numeric', month: 'short' })}{event.kind === 'meeting' ? ` · ${formatTime(event.at, workspace.settings.locale)}` : ''}</time>
          </button>)}</div>
          {!weekAhead.length && <p className="empty-row">The next seven days are open.</p>}
        </section>
      </div>

      <aside className="dashboard-rail">
        <section className="rail-section">
          <header><h2>Quick notes</h2></header>
          <button className="jot-note" onClick={() => actions.edit('note')}><Icon name="plus" /><span>Jot a client note</span></button>
          {railNotes.map((note) => <button className="rail-row" key={note.id} onClick={() => actions.edit('note', note)}><span className="rail-row__icon"><Icon name={note.isPinned ? 'pin' : 'notes'} /></span><span><strong>{note.title}</strong><small>{clientName(workspace, note.clientId)} · {relativeDate(note.updatedAt)}</small></span></button>)}
          {!railNotes.length && <p className="rail-empty">No notes yet.</p>}
        </section>

        <section className="rail-section">
          <header><h2>Mail</h2><button onClick={() => actions.navigate('mail')}>View all</button></header>
          {railMail.map((email) => <button className="rail-row" key={email.id} onClick={() => actions.edit('email', email)}><span className="rail-row__icon"><Icon name="mail" /></span><span><strong>{email.subject}</strong><small>{clientName(workspace, email.clientId)} · {relativeDate(email.occurredAt)}</small></span></button>)}
          {!railMail.length && <p className="rail-empty">No mail recorded.</p>}
        </section>

        <section className="rail-section">
          <header><h2>Recent clients</h2><button onClick={() => actions.navigate('clients')}>All clients</button></header>
          <div className="recent-clients">{recentClients.map((client) => {
            const clientOpen = openWork.filter(({ clientId }) => clientId === client.id).length
            return <button key={client.id} onClick={() => actions.openClient(client.id)}><span className="client-token" data-tone={clientTone(client.id)}>{initials(client.name)}</span><span><strong>{client.name}</strong><small>{clientOpen} open {clientOpen === 1 ? 'item' : 'items'}</small></span></button>
          })}</div>
        </section>

        <section className="rail-section rail-activity">
          <header><h2>Latest activity</h2></header>
          {workspace.activities.slice(0, 5).map((activity) => <div className="rail-activity__row" key={activity.id}><span /><div><strong>{activity.summary}</strong><small>{activity.clientId ? clientName(workspace, activity.clientId) : workspace.name}</small></div><time>{relativeDate(activity.occurredAt)}</time></div>)}
          {!workspace.activities.length && <p className="rail-empty">Changes you make will appear here.</p>}
        </section>
      </aside>
    </div>
  </div>
}

export function ClientsScreen({ workspace, actions, selectedId, onSelect }: { workspace: WorkspaceData; actions: ScreenActions; selectedId?: string; onSelect: (id?: string) => void }) {
  const [search, setSearch] = useState('')
  const clients = useMemo(() => sortClients(workspace.clients).filter((client) => `${client.name} ${client.industry ?? ''} ${client.email ?? ''}`.toLowerCase().includes(search.toLowerCase())), [workspace.clients, search])
  const selected = workspace.clients.find(({ id }) => id === selectedId)

  if (!workspace.clients.length) return <div className="page"><EmptyState title="No clients yet" copy="Build your register one relationship at a time. You can add contacts, work, meetings, notes, and mail after the client exists." action="New client" onAction={() => actions.edit('client')} sample={actions.loadSample} /></div>
  if (selected) return <div className="page client-detail-page"><ClientDetail client={selected} workspace={workspace} actions={actions} onBack={() => onSelect(undefined)} /></div>

  return <div className="page"><PageHeader title="Clients" description="The people and organizations you serve, with every conversation and commitment close by." action={<button className="button button--primary" onClick={() => actions.edit('client')}><Icon name="plus" />New client</button>} />
    <div className="list-page"><div className="toolbar"><div className="search-box"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, field, or email" aria-label="Search clients" /></div></div>
      <div className="client-directory">{clients.map((client) => {
        const open = workspace.workItems.filter(({ clientId, status }) => clientId === client.id && status !== WorkItemStatus.Completed && status !== WorkItemStatus.Canceled).length
        const primary = workspace.contacts.find(({ clientId, isPrimary }) => clientId === client.id && isPrimary)
        return <button key={client.id} className="client-directory-row" onClick={() => onSelect(client.id)}>
          <span className="client-token client-token--large" data-tone={clientTone(client.id)}>{initials(client.name)}</span>
          <span className="client-directory-row__name"><strong>{client.name}</strong><small>{client.industry || 'General services'}</small></span>
          <span className="client-directory-row__contact">{primary ? `${primary.firstName} ${primary.lastName}` : 'No primary contact'}</span>
          <span className="status" data-tone={client.status}>{titleCase(client.status)}</span>
          <span className="client-directory-row__open"><strong>{open}</strong><small>open</small></span>
          <Icon name="arrow" />
        </button>
      })}</div>
      {!clients.length && <EmptyState title="No matching clients" copy="Try another name, field, or email." action="New client" onAction={() => actions.edit('client')} />}
    </div>
  </div>
}

function ClientDetail({ client, workspace, actions, onBack }: { client: Client; workspace: WorkspaceData; actions: ScreenActions; onBack: () => void }) {
  const contacts = selectContactsForClient(workspace, client.id)
  const work = selectWorkItemsForClient(workspace, client.id)
  const meetings = selectMeetingsForClient(workspace, client.id)
  const notes = selectNotesForClient(workspace, client.id)
  const emails = selectEmailsForClient(workspace, client.id)
  const address = client.address && [client.address.line1, client.address.line2, client.address.city, client.address.region, client.address.postalCode, client.address.country].filter(Boolean).join(', ')
  return <>
    <button className="button button--text back-link" onClick={onBack}>← All clients</button>
    <header className="client-detail__head"><span className="monogram">{initials(client.name)}</span><div><h1>{client.name}</h1><p>{client.industry || 'General services'} · {titleCase(client.status)}</p></div><div className="client-detail__actions"><button className="button" onClick={() => actions.edit('client', client)}><Icon name="edit" />Edit</button></div></header>
    <div className="quick-actions"><button className="button button--primary" onClick={() => actions.edit('email', undefined, client.id)}><Icon name="mail" />Write email</button><button className="button" onClick={() => actions.edit('work', undefined, client.id)}><Icon name="plus" />Add task</button><button className="button" onClick={() => actions.edit('meeting', undefined, client.id)}><Icon name="meetings" />Schedule</button><button className="button" onClick={() => actions.edit('note', undefined, client.id)}><Icon name="notes" />Add note</button></div>
    <div className="client-detail__grid"><div>
      <section className="record-section"><div className="record-section__head"><h2>Open tasks</h2><span>{work.length} records</span></div>{work.slice(0, 6).map((item) => <WorkRow key={item.id} item={item} workspace={workspace} onClick={() => actions.edit('work', item)} />)}{!work.length && <p>No tasks have been recorded for this client.</p>}</section>
      <section className="record-section"><div className="record-section__head"><h2>Meetings</h2><span>{meetings.length} records</span></div>{meetings.slice(0, 4).map((meeting) => <MeetingRow key={meeting.id} meeting={meeting} workspace={workspace} onClick={() => actions.edit('meeting', meeting)} />)}{!meetings.length && <p>No meetings recorded.</p>}</section>
      <section className="record-section"><div className="record-section__head"><h2>Notes</h2><span>{notes.length} records</span></div>{notes.slice(0, 4).map((note) => <button className="note-row" key={note.id} onClick={() => actions.edit('note', note)}><strong>{note.title}</strong><span>{note.body}</span></button>)}{!notes.length && <p>No notes recorded.</p>}</section>
    </div><aside className="client-detail__side">
      <section className="record-section"><div className="record-section__head"><h2>Details</h2><span>Profile</span></div><dl className="fact-list"><Fact label="Status" value={titleCase(client.status)} /><Fact label="Email" value={client.email} /><Fact label="Phone" value={client.phone} /><Fact label="Website" value={client.website} link /><Fact label="Address" value={address} /></dl></section>
      <section className="record-section"><div className="record-section__head"><h2>Contacts</h2><button className="button button--text" onClick={() => actions.edit('contact', undefined, client.id)}>Add contact</button></div>{contacts.map((contact) => <button className="contact-row" key={contact.id} onClick={() => actions.edit('contact', contact)}><span><strong>{contact.firstName} {contact.lastName}</strong><span>{contact.title || titleCase(contact.role)}{contact.email ? ` · ${contact.email}` : ''}</span></span>{contact.isPrimary && <small>Primary</small>}</button>)}{!contacts.length && <p>No contacts yet.</p>}</section>
      <section className="record-section"><div className="record-section__head"><h2>Mail</h2><span>{emails.length} records</span></div>{emails.slice(0, 5).map((email) => <button className="email-row" key={email.id} onClick={() => actions.edit('email', email)}><strong>{email.subject}</strong><span>{titleCase(email.status)} · {relativeDate(email.occurredAt)}</span></button>)}{!emails.length && <p>No mail recorded.</p>}</section>
    </aside></div>
  </>
}

function Fact({ label, value, link }: { label: string; value?: string; link?: boolean }) {
  if (!value) return null
  const href = link ? (value.startsWith('http') ? value : `https://${value}`) : undefined
  return <div className="fact"><dt>{label}</dt><dd>{href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : value}</dd></div>
}

function ListPage({ title, description, action, children }: { title: string; description: string; action: React.ReactNode; children: React.ReactNode }) {
  return <div className="page"><PageHeader title={title} description={description} action={action} /><div className="list-page">{children}</div></div>
}

export function WorkScreen({ workspace, actions }: { workspace: WorkspaceData; actions: ScreenActions }) {
  const [filter, setFilter] = useState('all')
  const items = sortWorkItems(workspace.workItems).filter(({ status }) => filter === 'all' || status === filter)
  const groups = Object.values(WorkItemStatus).map((status) => [status, items.filter((item) => item.status === status)] as const).filter(([, records]) => records.length)
  return <ListPage title="Tasks" description="Tasks, projects, services, and follow-ups across every client." action={<button className="button button--primary" disabled={!workspace.clients.length} onClick={() => actions.edit('work')}><Icon name="plus" />Add task</button>}><div className="toolbar"><select className="filter-select" aria-label="Filter tasks by status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option>{Object.values(WorkItemStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></div><div className="grouped-list">{groups.map(([status, records]) => <section className="group" key={status}><div className="group-label"><h2>{titleCase(status)}</h2><span>{records.length}</span></div>{records.map((item) => <WorkRow key={item.id} item={item} workspace={workspace} full onClick={() => actions.edit('work', item)} />)}</section>)}{!items.length && <EmptyState title="No tasks here" copy="Add a task, project, or follow-up and connect it to the client it belongs to." action="Add task" onAction={() => actions.edit('work')} />}</div></ListPage>
}

export function MeetingsScreen({ workspace, actions }: { workspace: WorkspaceData; actions: ScreenActions }) {
  const meetings = sortMeetings(workspace.meetings)
  return <ListPage title="Calendar" description="Upcoming conversations and the decisions that came out of past ones." action={<button className="button button--primary" disabled={!workspace.clients.length} onClick={() => actions.edit('meeting')}><Icon name="plus" />Schedule meeting</button>}><div className="grouped-list">{meetings.map((meeting) => <MeetingRow key={meeting.id} meeting={meeting} workspace={workspace} onClick={() => actions.edit('meeting', meeting)} />)}{!meetings.length && <EmptyState title="No meetings recorded" copy="Schedule a client conversation or record the outcome of one that already happened." action="Schedule meeting" onAction={() => actions.edit('meeting')} />}</div></ListPage>
}

export function MailScreen({ workspace, actions }: { workspace: WorkspaceData; actions: ScreenActions }) {
  const [search, setSearch] = useState('')
  const emails = sortEmails(workspace.emails).filter((email) => `${email.subject} ${email.from} ${email.to.join(' ')} ${clientName(workspace, email.clientId)}`.toLowerCase().includes(search.toLowerCase()))
  return <ListPage title="Mail" description="Write in your usual mail app and keep the client history here." action={<button className="button button--primary" disabled={!workspace.clients.length} onClick={() => actions.edit('email')}><Icon name="send" />Write email</button>}><div className="toolbar"><div className="search-box"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject, person, or client" aria-label="Search mail" /></div></div>{emails.map((email) => <button className="mail-row" key={email.id} onClick={() => actions.edit('email', email)}><span className="mail-direction" data-status={email.status}>{titleCase(email.status)}</span><span><strong>{email.subject}</strong><span>{email.direction === EmailDirection.Outgoing ? `To ${email.to.join(', ')}` : `From ${email.from}`}</span></span><span>{clientName(workspace, email.clientId)}</span><time className="row-date">{formatDate(email.occurredAt, workspace.settings.locale)}</time></button>)}{!emails.length && <EmptyState title="No mail yet" copy="Write a new email or save one you received. Keepside opens your default mail app when it is time to send." action="Write email" onAction={() => actions.edit('email')} />}</ListPage>
}

export function NotesScreen({ workspace, actions }: { workspace: WorkspaceData; actions: ScreenActions }) {
  const notes = sortNotes(workspace.notes)
  return <ListPage title="Notes" description="Decisions, preferences, context, and anything worth remembering." action={<button className="button button--primary" disabled={!workspace.clients.length} onClick={() => actions.edit('note')}><Icon name="plus" />New note</button>}><div className="note-list">{notes.map((note) => <button className="note-index-row" key={note.id} onClick={() => actions.edit('note', note)}><span className="note-index-row__kind">{note.isPinned ? <><Icon name="pin" />Pinned</> : 'Note'}</span><span className="note-index-row__copy"><strong>{note.title}</strong><p>{note.body}</p><span>{clientName(workspace, note.clientId)}</span></span><time>{formatDate(note.updatedAt, workspace.settings.locale)}</time></button>)}</div>{!notes.length && <EmptyState title="No notes yet" copy="Record the details that make the next client conversation better." action="New note" onAction={() => actions.edit('note')} />}</ListPage>
}

export function ContactsScreen({ workspace, actions }: { workspace: WorkspaceData; actions: ScreenActions }) {
  const [search, setSearch] = useState('')
  const contacts = sortContacts(workspace.contacts).filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.title ?? ''} ${contact.email ?? ''} ${clientName(workspace, contact.clientId)}`.toLowerCase().includes(search.toLowerCase()))
  return <ListPage title="Contacts" description="Every person connected to your client work, in one clear directory." action={<button className="button button--primary" disabled={!workspace.clients.length} onClick={() => actions.edit('contact')}><Icon name="plus" />Add contact</button>}>
    <div className="toolbar"><div className="search-box"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, company, title, or email" aria-label="Search contacts" /></div></div>
    <div className="contact-directory">{contacts.map((contact) => {
      const client = workspace.clients.find(({ id }) => id === contact.clientId)
      return <button className="contact-directory-row" key={contact.id} onClick={() => actions.edit('contact', contact)}>
        <span className="client-token client-token--large" data-tone={clientTone(contact.clientId)}>{initials(`${contact.firstName} ${contact.lastName}`)}</span>
        <span className="contact-directory-row__person"><strong>{contact.firstName} {contact.lastName}</strong><small>{contact.title || titleCase(contact.role)}</small></span>
        <span className="contact-directory-row__client">{client?.name ?? 'Unknown client'}</span>
        <span className="contact-directory-row__details">{contact.email || contact.phone || 'No contact details'}</span>
        {contact.isPrimary && <span className="status" data-tone="active">Primary</span>}
      </button>
    })}</div>
    {!contacts.length && <EmptyState title="No contacts here" copy={search ? 'Try another name, company, title, or email.' : 'Add the people you speak with and connect each one to a client.'} action="Add contact" onAction={() => actions.edit('contact')} />}
  </ListPage>
}
