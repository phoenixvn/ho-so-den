# Contribution protocol v1 — implemented alpha

Receiver requires `HSD_MODE=community`. Instances have independent SQLite stores
and admin sessions. This is a bounded JSON package protocol, not resumable federation.

## Pairing

Admin `POST /api/community/keys` returns a random 32-byte bearer key once. Receiver
stores its SHA-256 hash and can revoke it. Sender explicitly saves a peer origin,
optional browser-facing public origin and plaintext key in its private database.
Saving a connector makes no network request. Portable archive backups exclude keys.

## Package

`POST /api/outbox/prepare` selects a current record revision, optional body/sources
and chosen attachment IDs belonging to that record. Title, summary and category
are always included. It creates an immutable local snapshot.

Normalized serialization order:

```text
format = "ho-so-den.contribution"
version = 1
id = random package UUID
createdAt = package creation time
sourceRevision = local revision number (no local record ID)
record = { title, summary, body, category, sources: [{ title, url, note }] }
files = [{ id: new UUID, name, size, sha256, data: canonical base64 }]
credit = explicitly chosen public attribution (may be empty)
rights = contributor's statement of publication rights
```

No disk paths, original attachment IDs, admin identity, credentials, other records,
unselected files or version history are sent. Rights statements remain in private intake.

`server/contributions.mjs` normalizes known fields, validates strings/URLs/hashes
and rejects unknown keys. SHA-256 is over UTF-8 `JSON.stringify` of the normalized
v1 structure, preserving array order. This is not RFC 8785 or a digital signature.

Limits: 20 MiB decoded media, 50 files, 32 MiB wire JSON. Each outbox/intake has a
256 MiB retained-payload cap; one receiving key can submit 50 packages.

## Transport

- `POST /api/outbox/:id/send`: admin session/CSRF, `confirm: true`, previewed hash.
- Sender posts frozen payload to `POST /api/intake` with bearer auth, no cookies.
- Idempotency: `(key_id, client_id)` + payload hash. Same content returns the same
  receipt; different content under the same ID returns 409.
- Receipt: receiving ID, client ID, hash, state, contributor-visible feedback,
  timestamp, relative public path only when published.
- Failures leave delivery unresolved; explicit retry reuses the same package ID.
- `POST /api/outbox/:id/refresh` explicitly reads `GET /api/intake/:id`; the key
  can see only its own submissions. No background polling or automatic retries.
- HTTPS except loopback/explicit private HTTP allowlist. Redirects refused;
  timeout and response size bounded; receipt shape/hash validated.

## Review and publication

Admin session/CSRF endpoints: `GET /api/community/submissions`, `/:id`,
`/:id/files/:fileId`, and `POST /:id/decision` with optimistic revision checks.

```text
submitted → approved | changes_requested | rejected
changes_requested → approved | rejected
approved → published | changes_requested | rejected
published → withdrawn
```

Approval stores an editorial copy and selected file IDs. Publication needs a
separate confirmation and atomically writes a public snapshot plus status event.
Public API: `GET /api/publications`, `/:id`, `/:id/files/:fileId`. Only published,
non-withdrawn snapshots are served; no intake IDs, keys, rights statements or
unselected file metadata are exposed. Withdrawal gives 404, but cannot recall
downloaded copies. Original intake remains private.

Next: resumable uploads, retention/purge with idempotency tombstones, key rotation,
multi-user OTP/RBAC, editing source lists, PostgreSQL/object storage, public
correction versions and publication provenance integrations.
