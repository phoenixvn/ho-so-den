# Architecture decision: local-first, opt-in community

Status: **local core and SQLite community contribution vertical slice implemented; production adapters pending**.

## Current implementation

Two runtime modes share static assets. `scripts/serve.mjs` serves the fictional
preview. `scripts/local.mjs` adds authenticated `server/local-api.mjs` and the
SQLite/filesystem store in `server/store.mjs`. The local UI is `local.html`.
The static runtime stub never probes a visitor's local machine; the local server
serves a same-origin runtime flag to enable API calls. Private files remain outside
the web root, are addressed by digest and require authenticated downloads.

Schema v2 stores one administrator, hashed sessions, records, content versions
and attachments. A serial operation queue makes mutations and archive backups
consistent within the supported single-process runtime. SQLite transactions
protect record changes; blob writes are staged before metadata commit. Portable
restore validates all input before committing into an empty archive. Credentials
are excluded from portable backups. Schema v2 adds frozen outbox, peer credentials,
hashed intake keys, private submissions, editorial events and public snapshots.
Community mode uses the same SQLite engine for the alpha, not PostgreSQL yet.
See [LOCAL_ARCHIVE.md](LOCAL_ARCHIVE.md) and [COMMUNITY_SETUP.md](COMMUNITY_SETUP.md).

## Target components

### Local instance

- First-run administrator and independent local sessions; no central account required.
- SQLite for records/versions; filesystem for attachments under administrator-selected storage.
- Read/search/edit, export/import and backup/restore offline.
- Optional community connector, disabled until configured by the owner.
- No automatic inventory, hashes, telemetry or files sent to a central server.

### Community instance

- PostgreSQL, object storage and background workers for multi-user editorial workflows.
- Email OTP and role-scoped sessions for contributors/reviewers/admins.
- Separate private intake, approved public material and rejected/withdrawn submissions.
- A contributor sends a copy; community edits do not mutate the local record.
- A public profile/credit is chosen explicitly; a private source's identity is not
  automatically published or placed on-chain.

### Publication and funding modules

- IPFS stores only the approved public version, never an automatic replica of local originals.
- Solana/Rust/Anchor records minimal version commitments and replacement/withdrawal status.
- Public-chain data cannot be assumed erasable; data publication is a separate decision.
- Cryptomus is the sole planned payment provider. Credentials live on the server;
  verified webhooks and reconciliation determine payment state.
- NFT memberships are optional and grant no authority to decide factual guilt.

## Shared application boundaries

Share domain validation, version models and export formats across local/community
modes. Isolate database, blob storage, identity, contribution transport and
publication behind adapters. Both SQLite and PostgreSQL need migration and
integration tests; changing a connection string alone is insufficient.

The preview UI can migrate to Next.js/TypeScript when persistent workflows are
implemented. A Node backend (NestJS is the current preference) should keep
media/OCR and publication jobs out of request handlers. Do not force a full
PostgreSQL/Redis cluster on a basic local installation.

## Trust boundaries

Local private store → explicitly selected package → private community intake →
reviewed public version → optional public IPFS/Solana commitments.

Each transition needs authorization and a versioned audit event. The community
must not remotely browse the entire local disk. Rejection means no publication;
withdrawal on the community server cannot guarantee deletion of copies already
distributed elsewhere. Hashes prove a byte match, not truth of allegations.

## First end-to-end acceptance goal

Install locally, create a fictional case with an attachment, restart safely,
send a selected copy to a separate community instance, approve it there and show
the published link locally without changing the original. This flow is implemented
and tested with two instances. Production PostgreSQL/object storage, OTP/RBAC,
resumable transport and retention remain tracked in [ROADMAP.md](../ROADMAP.md).
