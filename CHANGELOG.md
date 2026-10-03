# Changelog

## 0.3.0-alpha.1 — Opt-in community contributions (development)

### Added
- SQLite schema v2: peer connectors, frozen outbox packages, revocable contributor
  keys, private intake, review events and public snapshots.
- Selective file/body/source inclusion, preview and explicit hash-bound send confirmation.
- Server-to-server intake, strict payload/hash validation, scoped receipts and
  idempotent whole-package retry; no automatic polling or sending.
- Separate approval/publication, reviewer edits, public file selection and withdrawal.
- Public reader, optional two-instance Docker configuration, API/browser tests.
- Per-instance cookie names for side-by-side sessions on the same hostname.
- Shared AGENTS.md guidance, AI tool entry points, project status ledger,
  development workflow and product lifecycle documentation.

### Limits and upgrade
Back up full data before schema v2 migration. Portable .hsd.json excludes peer
keys/outbox/intake/publications. Contributions: 20 MiB media/50 files, 32 MiB JSON,
256 MiB retained payload per outbox/intake, 50 packages/key. Single-admin SQLite;
no resumable upload, intake purge, PostgreSQL, real OTP email, payments or Web3.

## 0.2.0-alpha.1 — Local core (development)

### Added
- Independent local administrator setup, scrypt password hashes, persisted sessions,
  CSRF/origin/Host checks and login throttling.
- SQLite schema v1, private case CRUD, source metadata, version snapshots and
  optimistic revision checks.
- Private attachment storage, 25 MiB/file limit and SHA-256 integrity checks.
- Portable JSON backups with validated restore into an empty archive; current
  accounts/sessions are excluded and destination credentials are preserved.
- Separate local UI, file management, history reader and backup/restore forms.
- Persistent Docker data volume and restart/restore integration/browser tests.

### Changed
- `npm start` / Docker now start the local archive. `npm run start:preview` retains
  the static demo. GitHub Pages remains static and cannot host archive APIs.
- Node requirement is 22.18+ (24 LTS recommended) for built-in SQLite.

### Limits
Single local administrator. Backup UI: 100 MiB JSON, 60 MiB media, 10,000 entries
per collection. No community push, real email OTP, payments, blockchain, NFTs,
malware scanner or video transcoding. Backup files are not encrypted.

## 0.1.0-alpha.2 — Repository ownership and publishing links

### Changed
- Project stewardship, source links, contribution links and Pages URL now target `phoenixvn/ho-so-den`.
- Updated distribution metadata and self-hosting instructions for the new location.
- Preserved the original release/history; this remains a design preview with the same functional limitations.

## 0.1.0-alpha.1 — Open-source design preview

### Added
- Vietnamese wiki-style archive with Paper/Night reading themes.
- Six fictional records, search/filter/sort, source dialogs and version examples.
- Hash-linked dossier routes, keyboard navigation and responsive layout.
- Demo-only email OTP, discussion notes, proof checks and Cryptomus checkout.
- AGPL-3.0-only license, contributor/community policies and architecture roadmap.
- Node preview server, non-root Docker image and localhost-bound Compose setup.
- Bundled OFL fonts, legal/source links, automated HTTP and browser tests.
- CI and public preview deployment configuration.

### Limitations
No persistent archive, file uploads, real accounts, community submissions,
Solana transactions, IPFS uploads, NFTs or payment processing. This release is
for design feedback and software contributors, not production case management.
