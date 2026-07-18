import { useEffect, useMemo, useRef, useState } from 'react'
import type { Client, Contact, Email, Meeting, Note, WorkItem, WorkspaceData } from '../domain/types'
import type { RecordKind } from '../screens/Screens'
import { Icon, type IconName } from './Icon'
import type { Section } from './Shell'
import { useDialogFocus } from './useDialogFocus'

type SearchRecord = Client | Contact | WorkItem | Meeting | Note | Email

interface SearchResult {
  id: string
  kind: RecordKind | 'page'
  label: string
  meta: string
  searchable: string
  icon: IconName
  section?: Section
  record?: SearchRecord
}

interface CommandSearchProps {
  workspace: WorkspaceData
  onClose: () => void
  onSection: (section: Section) => void
  onClient: (clientId: string) => void
  onEdit: (kind: RecordKind, record: SearchRecord) => void
}

const pages: { id: Section; label: string; meta: string; icon: IconName }[] = [
  { id: 'today', label: 'Dashboard', meta: 'Today, attention, and recent work', icon: 'today' },
  { id: 'mail', label: 'Mail', meta: 'Sent and received client mail', icon: 'mail' },
  { id: 'meetings', label: 'Calendar', meta: 'Meetings and client conversations', icon: 'meetings' },
  { id: 'work', label: 'Tasks', meta: 'Projects, services, and follow-ups', icon: 'work' },
  { id: 'notes', label: 'Notes', meta: 'Client context and decisions', icon: 'notes' },
  { id: 'clients', label: 'All clients', meta: 'Open the client directory', icon: 'clients' },
  { id: 'contacts', label: 'Contacts', meta: 'People across every client', icon: 'contact' },
]

export function CommandSearch({ workspace, onClose, onSection, onClient, onEdit }: CommandSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    const clientName = (clientId: string) => workspace.clients.find(({ id }) => id === clientId)?.name ?? 'Unknown client'
    const all: SearchResult[] = [
      ...pages.map(({ id, label, meta, icon }) => ({ id: `page-${id}`, kind: 'page' as const, label, meta, searchable: `${label} ${meta}`, icon, section: id })),
      ...workspace.clients.map((record) => ({ id: `client-${record.id}`, kind: 'client' as const, label: record.name, meta: record.industry || 'Client', searchable: `${record.name} ${record.industry ?? ''} ${record.email ?? ''}`, icon: 'clients' as const, record })),
      ...workspace.contacts.map((record) => ({ id: `contact-${record.id}`, kind: 'contact' as const, label: `${record.firstName} ${record.lastName}`, meta: `${record.title || 'Contact'} · ${clientName(record.clientId)}`, searchable: `${record.firstName} ${record.lastName} ${record.title ?? ''} ${record.email ?? ''} ${clientName(record.clientId)}`, icon: 'contact' as const, record })),
      ...workspace.workItems.map((record) => ({ id: `work-${record.id}`, kind: 'work' as const, label: record.title, meta: `Task · ${clientName(record.clientId)}`, searchable: `${record.title} ${record.description ?? ''} ${clientName(record.clientId)}`, icon: 'work' as const, record })),
      ...workspace.meetings.map((record) => ({ id: `meeting-${record.id}`, kind: 'meeting' as const, label: record.title, meta: `Meeting · ${clientName(record.clientId)}`, searchable: `${record.title} ${record.location ?? ''} ${record.agenda ?? ''} ${clientName(record.clientId)}`, icon: 'meetings' as const, record })),
      ...workspace.notes.map((record) => ({ id: `note-${record.id}`, kind: 'note' as const, label: record.title, meta: `Note · ${clientName(record.clientId)}`, searchable: `${record.title} ${record.body} ${clientName(record.clientId)}`, icon: 'notes' as const, record })),
      ...workspace.emails.map((record) => ({ id: `email-${record.id}`, kind: 'email' as const, label: record.subject, meta: `Mail · ${clientName(record.clientId)}`, searchable: `${record.subject} ${record.body} ${record.from} ${record.to.join(' ')} ${clientName(record.clientId)}`, icon: 'mail' as const, record })),
    ]
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return all.filter(({ kind }) => kind === 'page').concat(all.filter(({ kind }) => kind === 'client').slice(0, 4))
    return all.filter(({ searchable }) => terms.every((term) => searchable.toLowerCase().includes(term))).slice(0, 12)
  }, [query, workspace])

  useEffect(() => { setActiveIndex(0) }, [query])
  useDialogFocus(dialogRef, onClose)

  const choose = (result?: SearchResult) => {
    if (!result) return
    if (result.kind === 'page' && result.section) onSection(result.section)
    else if (result.kind === 'client' && result.record) onClient(result.record.id)
    else if (result.kind !== 'page' && result.record) onEdit(result.kind, result.record)
    onClose()
  }

  return <div className="command-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="command" role="dialog" aria-modal="true" aria-label="Search workspace">
      <div className="command__input">
        <Icon name="search" />
        <input ref={inputRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a client, person, task, meeting, note, or email" onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)) }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)) }
          if (event.key === 'Enter') { event.preventDefault(); choose(results[activeIndex]) }
        }} />
        <kbd>ESC</kbd>
      </div>
      <div className="command__results" role="listbox">
        {!query && <p className="command__hint">Jump to</p>}
        {query && results.length > 0 && <p className="command__hint">{results.length} match{results.length === 1 ? '' : 'es'}</p>}
        {results.map((result, index) => <button key={result.id} className={index === activeIndex ? 'command-result command-result--active' : 'command-result'} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(result)} role="option" aria-selected={index === activeIndex}>
          <span className="command-result__icon"><Icon name={result.icon} /></span>
          <span><strong>{result.label}</strong><small>{result.meta}</small></span>
          <Icon name="arrow" className="command-result__arrow" />
        </button>)}
        {!results.length && <div className="command__empty"><strong>No match</strong><span>Try a client name, subject, task, or note.</span></div>}
      </div>
      <footer className="command__foot"><span><kbd>↑↓</kbd> move</span><span><kbd>↵</kbd> open</span><span>Everything stays on this device</span></footer>
    </section>
  </div>
}
