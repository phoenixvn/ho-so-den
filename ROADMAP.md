# Roadmap

Status: pre-alpha. Milestones describe acceptance criteria, not promised dates.

## 0 — Open-source preview

- [x] Wiki reading UI and two themes.
- [x] Fictional sources, timeline, history, OTP and Cryptomus demo.
- [x] AGPL license, contribution guidelines and community templates.
- [x] Self-hostable preview via Node and Docker Compose.
- [x] Local fonts and no default telemetry.
- [x] HTTP and browser test suite; CI and Pages deployment configuration.

## 1 — Local archive core

- [ ] First-run local administrator setup and authenticated sessions.
- [ ] SQLite migrations and persistent case/source/version records.
- [ ] Local attachment storage with private access, quotas and file checks.
- [ ] Case editing, search and version history.
- [ ] Export/import, complete backup and demonstrated restore.
- [ ] NAS/ARM64 validation and documented upgrades.

Acceptance: install independently, create a case, add documents, restart without
data loss, export it and restore it on another instance. No central account needed.

## 2 — Community contributions

- [ ] Community mode: PostgreSQL, object storage, OTP email and roles.
- [ ] Selective, previewable contribution packages and explicit send confirmation.
- [ ] Authenticated resumable upload, manifest validation and deduplication.
- [ ] Private review queue, editorial requests, decisions and appeals/corrections.
- [ ] Status polling and local/community version linkage without overwriting local data.

Acceptance: push a selected copy from a local instance, review privately, publish
an approved version and return its link. Rejected contributions never become public.

## 3 — Public provenance

- [ ] Solana registry program and Devnet tests.
- [ ] Canonical manifests and independently verifiable hashes.
- [ ] IPFS pinning across independent providers with availability checks.
- [ ] Replacement/withdrawal events and indexer recovery.
- [ ] Key management, threat review and mainnet release criteria.

## 4 — Funding and membership

- [ ] Cryptomus invoice creation, signed webhook verification and reconciliation.
- [ ] Idempotent processing for duplicate/late callbacks and payment state tests.
- [ ] Optional supporter badges/NFTs, separate from editorial authority.

No native token or required wallet is planned for basic local use.
