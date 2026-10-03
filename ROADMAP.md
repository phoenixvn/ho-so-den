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

- [x] First-run local administrator setup and authenticated sessions (single admin).
- [x] SQLite schema v1 and persistent case/source/version records.
- [x] Private attachments with size limits and SHA-256 verification.
- [ ] Malware scanning, storage quotas and media processing.
- [x] Case editing, title/summary/category search and version history.
- [x] Portable archive export/restore into a new empty instance; restart tests.
- [ ] Managed full-instance backup/restore UI and large streaming exports.
- [ ] NAS/ARM64 validation and documented upgrades.

Acceptance: install independently, create a case, add documents, restart without
data loss, export it and restore it on another instance. No central account needed.

## 2 — Community contributions

- [ ] Community mode: PostgreSQL, object storage, OTP email and roles.
- [x] Selective immutable packages, preview and explicit send confirmation.
- [x] Bearer-key intake, manifest/hash validation and idempotent whole-package retry.
- [ ] Resumable uploads, key rotation and production retention/purge.
- [x] Private single-admin review, change requests/reject/approve, separate publish/withdraw.
- [ ] Multi-reviewer workflow, appeals and linked public correction versions.
- [x] Explicit status refresh and public link without overwriting local records.

Acceptance: push a selected copy from a local instance, review privately, publish
an approved version and return its link. Rejected contributions never become public.

This acceptance flow works in the SQLite alpha; PostgreSQL, OTP/multi-user and
large resumable uploads remain open milestones.

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
