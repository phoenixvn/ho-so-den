# Architecture decision: local-first, opt-in community

Status: **accepted direction, not yet implemented backend**.

## Current implementation

Static HTML/CSS/browser JavaScript with fictional fixtures. A small Node HTTP
server serves a built allowlist of website assets. There is no database, API,
file ingestion, cryptographic signing or payment processing. The preview is also
deployable as a static website.

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
the published link locally without changing the original. Everything beyond the
preview remains tracked in [ROADMAP.md](../ROADMAP.md).
