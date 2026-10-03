# Contributing to Hồ Sơ Đen

Vietnamese and English contributions are welcome. This is a pre-alpha project;
the current deliverables are a **single-admin local archive alpha** and a static design preview. Read
[ROADMAP.md](ROADMAP.md) and [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) first.

Coding assistants start at [AGENTS.md](AGENTS.md). All contributors use the shared
[development workflow](docs/DEVELOPMENT_WORKFLOW.md) and update the
[project status ledger](docs/PROJECT_STATUS.md) at meaningful checkpoints.
Maturity and release terminology: [product lifecycle](docs/PRODUCT_LIFECYCLE.md).

## Start small

1. Look for an existing issue or discussion. Open one before a large change.
2. Fork the repo and create a descriptive branch.
3. Run `npm ci`, then `npm run dev` (Node 22.18+, preferably 24).
4. Make a focused change. Preserve both reading themes, Vietnamese text,
   keyboard navigation and the fictional-data notices.
5. Run `npm run check`, `npm test` and relevant browser tests.
6. Open a PR explaining the change, verification and any limitations.

For a clean browser setup:

```sh
npx playwright install chromium
npm run test:e2e
```

Do not commit `dist/`, `node_modules/`, test artifacts, secrets, personal
archives, private messages, or real identifying case data. Use fictional fixtures.

## Licensing and sign-off

Contributions to original code/docs are accepted under **AGPL-3.0-only**.
Contributors retain their copyright. No copyright assignment or CLA is required.
Include third-party attribution and license information for imported material.

Sign off your commits to certify the [Developer Certificate of Origin](DCO):

```sh
git commit -s -m "feat: describe the change"
```

The sign-off must identify you using a name you are entitled to use and an
email address you control (a GitHub noreply address is fine). Do not sign on
someone else's behalf. Maintainers check sign-offs during review.

## Design and architecture rules

- Local content must not be sent to the community automatically.
- Do not add runtime telemetry, remote fonts or tracking by default.
- Keep mock states visibly distinct from real authentication/payment/proofs.
- Community submissions are copies; central edits must not overwrite a local archive.
- Payment support is Cryptomus only. Never commit merchant secrets or wallet keys.
- Solana/IPFS publication is separate from saving local data and requires a
  deliberate public-release step in the future implementation.
- Validate and escape untrusted content; avoid rendering it through `innerHTML`.

## Review and releases

Maintainers review scope, licenses, accessibility, tests and privacy behavior.
Use `feat:`, `fix:`, `docs:`, `test:`, or `chore:` commit prefixes where practical.
Breaking architecture changes require a proposal in Discussions or an issue.
See [GOVERNANCE.md](GOVERNANCE.md) and [docs/RELEASING.md](docs/RELEASING.md).

Security reports follow [SECURITY.md](SECURITY.md), not public bug reports.

Local storage/auth/backup changes require integration tests using temporary data
directories. The local UI runs at `/local.html`; `npm start` starts the local
server while `npm run start:preview` serves only the static demo. Never use a
contributor's real archive for tests; tests must not clear a pre-existing data directory.
