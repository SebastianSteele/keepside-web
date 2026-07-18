import { useEffect, useRef, useState, type ReactNode } from 'react'
import { WorkItemStatus, type WorkspaceData } from '../domain/types'
import { Icon, type IconName } from './Icon'
import { Wordmark } from './Logo'

export type Section = 'today' | 'clients' | 'work' | 'meetings' | 'mail' | 'notes' | 'contacts'

const overview: { id: Section; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Dashboard', icon: 'today' },
  { id: 'mail', label: 'Mail', icon: 'mail' },
  { id: 'meetings', label: 'Calendar', icon: 'meetings' },
  { id: 'work', label: 'Tasks', icon: 'work' },
  { id: 'notes', label: 'Notes', icon: 'notes' },
]

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const clientTone = (id: string) => [...id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 6

interface ShellProps {
  section: Section
  onSection: (section: Section) => void
  onClient: (clientId?: string) => void
  onSearch: () => void
  onNewClient: () => void
  onSettings: () => void
  workspace: WorkspaceData
  selectedClientId?: string
  mobileOpen: boolean
  onMobileOpen: (open: boolean) => void
  children: ReactNode
}

export function Shell({ section, onSection, onClient, onSearch, onNewClient, onSettings, workspace, selectedClientId, mobileOpen, onMobileOpen, children }: ShellProps) {
  const stageRef = useRef<HTMLElement>(null)
  const [clientsOpen, setClientsOpen] = useState(true)
  const clients = [...workspace.clients].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  const openTasks = workspace.workItems.filter(({ status }) => status !== WorkItemStatus.Completed && status !== WorkItemStatus.Canceled).length

  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [section, selectedClientId])

  const navigate = (next: Section) => {
    onSection(next)
    onMobileOpen(false)
  }

  const openClient = (clientId?: string) => {
    onClient(clientId)
    onSection('clients')
    onMobileOpen(false)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__head">
          <Wordmark />
          <button className="sidebar__close" onClick={() => onMobileOpen(false)} aria-label="Close navigation"><Icon name="close" /></button>
        </div>

        <button className="sidebar-search" onClick={onSearch}>
          <Icon name="search" />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>

        <div className="sidebar__scroll">
          <nav aria-label="Workspace navigation" className="sidebar-group">
            <p className="sidebar-group__label">Overview</p>
            {overview.map((item) => (
              <button key={item.id} className={section === item.id ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => navigate(item.id)}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === 'work' && openTasks > 0 && <span className="nav-item__count">{openTasks}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-group sidebar-clients">
            <p className="sidebar-group__label">Clients</p>
            <div className="client-index-row">
              <button className={section === 'clients' && !selectedClientId ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => openClient()}>
                <Icon name="clients" /><span>All clients</span><span className="nav-item__count">{clients.length}</span>
              </button>
              <button className={`client-disclosure${clientsOpen ? ' client-disclosure--open' : ''}`} onClick={() => setClientsOpen((open) => !open)} aria-label={clientsOpen ? 'Collapse client list' : 'Expand client list'} aria-expanded={clientsOpen}><Icon name="chevron" /></button>
            </div>
            {clientsOpen && <div className="client-shortcuts">
              {clients.map((client) => (
                <button key={client.id} className={section === 'clients' && selectedClientId === client.id ? 'client-shortcut client-shortcut--active' : 'client-shortcut'} onClick={() => openClient(client.id)}>
                  <span className="client-token" data-tone={clientTone(client.id)}>{initials(client.name)}</span>
                  <span>{client.name}</span>
                </button>
              ))}
              {!clients.length && <p className="client-shortcuts__empty">Your client list will live here.</p>}
            </div>}
          </div>

          <nav aria-label="Tools" className="sidebar-group sidebar-tools">
            <p className="sidebar-group__label">Tools</p>
            <button className={section === 'contacts' ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => navigate('contacts')}>
              <Icon name="contact" /><span>Contacts</span>
            </button>
          </nav>
        </div>

        <div className="sidebar__foot">
          <button className="new-client" onClick={onNewClient}><Icon name="plus" /><span>New client</span><kbd>⇧ N</kbd></button>
          <button className="settings-link" onClick={onSettings}><Icon name="settings" /><span>Workspace settings</span></button>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => onMobileOpen(false)} aria-label="Close navigation" />}
      <main className="main-stage" id="main-content" ref={stageRef} tabIndex={-1}>
        <div className="mobile-bar"><button className="icon-button" onClick={() => onMobileOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button><Wordmark /><button className="mobile-search" onClick={onSearch} aria-label="Search"><Icon name="search" /></button></div>
        {children}
      </main>
    </div>
  )
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header__copy"><h1>{title}</h1><p>{description}</p></div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  )
}
