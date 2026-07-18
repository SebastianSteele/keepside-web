# Keepside for the web

Keepside is a private client relationship ledger that runs entirely in the browser. It keeps client profiles, contacts, work, meetings, notes, and email history together without an account, hosted database, automation system, or tracking layer.

This is the cross-platform React edition. The separate [native macOS edition](https://github.com/SebastianSteele/keepside) remains its own project.

## What it handles

- Client and organization records
- Primary and supporting contacts
- Projects, tasks, services, and follow-ups
- Meeting agendas and outcomes
- Pinned client notes
- Sent and received email history
- Email composition through the default mail app
- Portable JSON import and export
- Responsive desktop and mobile layouts

## Privacy model

Keepside stores one validated workspace in browser `localStorage`. There is no server component. Nothing is uploaded by the application.

Browser storage can be cleared by the user, the browser, or device-management policies. Export the workspace regularly if the data matters. Keepside is not a replacement for an encrypted records system when handling regulated or highly sensitive information.

## Run locally

Requires Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verify a change

```bash
npm run typecheck
npm test
npm run build
npm audit
```

## Architecture

The application has one canonical `WorkspaceData` document. Domain rules, validation, persistence, import, export, cascade deletion, and sorting live in `src/domain/workspace.ts`. React screens receive that workspace and route all mutations back through the domain layer.

No state library, router, component kit, icon package, date package, or styling framework is used. The small dependency surface is deliberate.

## Design

Keepside uses Onest for the dense product interface and the supplied Lutoria Serif family selectively for longer, editorial text. Its carbon ledger layout, chrome K lockup, heated-metal accent, and persistent client rail form the visual identity. Source and license details are in the [font credits](public/fonts/README.md).

Lutoria is an optional local font and is not included in public commits without confirmed redistribution rights. A clean clone falls back to Georgia for editorial text while keeping Onest for the full product interface. Licensed owners can place the three WOFF2 files named in the font credits inside `public/fonts/`.

## Browser support

Keepside targets current evergreen browsers with support for ES2020, `localStorage`, and `crypto.randomUUID`. The application includes a fallback identifier generator for older compatible browsers.

## Current limitations

- Data is local to one browser profile and does not sync between devices.
- Email composition opens the default mail application; Keepside does not connect to an inbox or confirm delivery.
- Browser storage can be cleared, so important workspaces should be exported regularly.

## License

[MIT](LICENSE)
