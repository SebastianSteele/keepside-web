import type { SVGProps } from 'react'

export type IconName = 'today' | 'clients' | 'contact' | 'work' | 'meetings' | 'mail' | 'notes' | 'search' | 'plus' | 'arrow' | 'chevron' | 'clock' | 'pin' | 'send' | 'edit' | 'trash' | 'close' | 'settings' | 'download' | 'upload' | 'check' | 'menu'

const paths: Record<IconName, React.ReactNode> = {
  today: <><path d="M4 5.5h16v14H4z"/><path d="M8 3v5M16 3v5M4 10h16M8 14h3M8 17h6"/></>,
  clients: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19M15 5.5a3 3 0 0 1 0 5.8M17 13.5a4 4 0 0 1 3.5 4V19"/></>,
  contact: <><path d="M5 4h14v16H5z"/><circle cx="12" cy="9" r="2.3"/><path d="M8.5 16v-.8A3.5 3.5 0 0 1 12 12h0a3.5 3.5 0 0 1 3.5 3.2v.8M8 4V2M16 4V2"/></>,
  work: <><path d="M9 5h11v15H4V5h2"/><path d="m7 11 2 2 4-5M13 15h4M13 18h4"/></>,
  meetings: <><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 3v5M17 3v5M3 10h18M7 14h3v3H7z"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m4 7 8 6 8-6"/></>,
  notes: <><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  chevron: <path d="m7 10 5 5 5-5"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
  send: <><path d="m3 11 18-8-8 18-2-8z"/><path d="m11 13 5-5"/></>,
  edit: <><path d="M4 20h4l11-11-4-4L4 16zM13 7l4 4"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1A7 7 0 0 0 15 6l-.3-2.5h-4L10.4 6a7 7 0 0 0-1.7 1L6.4 6 4.5 9.5l2 1.5a7 7 0 0 0 0 2l-2 1.5L6.4 18l2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4L15 18a7 7 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>{paths[name]}</svg>
}
