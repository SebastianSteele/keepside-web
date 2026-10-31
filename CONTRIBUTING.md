# Contributing

Small, focused pull requests are welcome. Start with the workflow problem and keep the implementation as narrow as the fix allows.

Before opening one, run:

```bash
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

Keep domain rules in `src/domain/workspace.ts`. Do not introduce a second persistence path or duplicate entity logic inside a screen. New dependencies should solve a demonstrated problem that browser APIs and the existing code cannot cover simply.

The interface should remain calm, readable, and specific to client work. Avoid generic dashboard cards, decorative statistics, chat assistants, automation builders, gradients used as filler, or placeholder business metrics.

## Data and screenshots

- Use the built-in sample workspace for reproduction steps and screenshots.
- Never commit a real workspace export, client address, inbox message, API key, or `.env` file.
- Call out changes to `WorkspaceData`, import compatibility, storage, network requests, and deletion behavior in the pull request.
- For connected-mode work, keep `src/domain` canonical and update `docs/openapi.yaml` when the public transport changes.

## Interface work

Check desktop and mobile widths, keyboard focus, reduced motion, empty states, long names, and destructive confirmations. Visual changes need before and after screenshots in the pull request.

For a reproducible production build with the sample workspace preloaded:

```bash
VITE_KEEPSIDE_DEMO=true VITE_KEEPSIDE_API_URL=/api npm run build
npm exec vite -- preview
```

In that build only, `?section=clients&client=client-studio` opens the sample client and `?section=mail&compose=email-studio-review-draft` opens the sample draft. Default builds ignore those query values.
