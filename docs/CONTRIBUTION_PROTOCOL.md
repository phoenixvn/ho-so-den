# Community contribution protocol — design draft

**Not implemented. No endpoint described here is currently available.**

## Submission model

One submission references a local case version and contains a selected public
copy. A versioned manifest is expected to include a random submission ID, schema
version, case content, source references, selected attachments (size, media type,
digest), per-file publication rights and contributor attribution preferences.

Do not include absolute local paths, machine usernames, unpublished filenames,
unselected attachments, private notes, credentials or a complete archive inventory.

## Proposed flow

1. Owner selects content and previews the exact package, including redactions.
2. Owner signs in to the configured community and explicitly confirms sending.
3. Client creates a submission with an idempotency key and agreed upload limits.
4. Selected files upload with resumability, digest verification and strict quotas.
5. Server finalizes into private intake, scans and validates; it is not public.
6. Reviewer requests changes, rejects or approves a new community version.
7. Client polls authenticated status and stores the community link separately.

Retrying a finalized submission must not create a second publication. A changed
local version requires a new package. Community modifications produce a linked
community version; they never silently replace the source local version.

## State transitions

`draft → uploading → submitted → under_review → changes_requested | rejected | approved`

`approved → published → superseded | withdrawn`

Only the operator's authorized editorial process may publish. Contributors may
cancel eligible unpublished submissions or request withdrawal; retention rules
must be explicit before real data is accepted. A status response must not expose
another contributor's private package or reviewer-only notes.

## Publication outputs

Public version ID, source linkage, public file manifest, editorial reason,
optional IPFS CID and optional Solana transaction reference. Uploading alone
must never enqueue irreversible public publication.

Before implementation, specify canonical serialization/hash algorithms,
API authentication, request/response schemas, retention, malware handling,
conflict resolution and export compatibility in a reviewed design proposal.
