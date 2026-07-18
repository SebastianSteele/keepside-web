# Contributing

Small, focused pull requests are welcome.

Before opening one, run:

```bash
npm run typecheck
npm test
npm run build
npm audit
```

Keep domain rules in `src/domain/workspace.ts`. Do not introduce a second persistence path or duplicate entity logic inside a screen. New dependencies should solve a demonstrated problem that browser APIs and the existing code cannot cover simply.

The interface should remain calm, readable, and specific to client work. Avoid generic dashboard cards, decorative statistics, chat assistants, automation builders, gradients used as filler, or placeholder business metrics.
