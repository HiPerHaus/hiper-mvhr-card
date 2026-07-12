# Contributing

Thanks for considering contributing to HiPer MVHR Card. Read `docs/architecture.md` before your first PR — the one rule that matters everywhere in this codebase is that manufacturer differences are data (capability profiles), never conditionals in UI code.

## Setup

```bash
npm install
npm run dev       # local build/watch
npm run lint
npm run typecheck
npm test
npm run build
```

## Adding a new manufacturer

This is the most common and most welcome contribution. Follow the checklist in `CLAUDE.md` under "Adding a manufacturer." In short:

1. Get the facts right first — bypass support, frost protection, filter units, operating modes — from real documentation, not guesswork. If you're not sure, say so in your PR description and mark it `TBD` rather than assuming.
2. One capability profile per control platform (not per SKU) unless a specific model genuinely differs in what it supports.
3. Include a test fixture, including at least one incomplete/missing-sensor variant.
4. Include a manufacturer doc under `docs/manufacturers/` and an example under `examples/`.
5. Update the capability matrix in `SPECIFICATION.md`.

## Code standards

- TypeScript strict mode; no `any` without a comment explaining why.
- ESLint + Prettier are enforced in CI; run `npm run lint` before pushing.
- Every role your code touches must handle all three non-value states (unsupported / not configured / unavailable) — see `SPECIFICATION.md` §6.
- No manufacturer-name conditionals under `src/components/` or `src/editor/`.

## Commits & PRs

- Keep commits scoped and descriptive.
- Update `CHANGELOG.md` under `Unreleased` for any user-facing change.
- CI (`build.yml`) must pass: lint, typecheck, test, build.
- Describe *why*, not just *what*, in the PR description — especially for anything touching the capability model.

## Reporting issues

Please include: the manufacturer/profile in use, your card YAML config (with entity IDs redacted if you prefer), and whether the issue is a rendering bug, a missing capability, or a capability that's declared but shouldn't be (or vice versa).
