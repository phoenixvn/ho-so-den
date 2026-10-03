# Security policy

## Supported scope

The current development version is a **single-admin local/community archive alpha**
plus a static fictional preview. No production community service or independent security
audit is claimed. Public-chain and payment integrations are not connected.

## Report privately

https://github.com/phoenixvn/ho-so-den/security/advisories/new

Include affected version/commit, reproduction with fictional data, impact and
mitigation. Never include real private records, credentials, session cookies or
wallet keys. If private reporting is unavailable, ask to enable it via a minimal
public issue without exploit details. We aim to acknowledge within seven days;
this volunteer project cannot guarantee an SLA.

## Local archive boundary

- Default binding/Host policy is loopback. Explicit `HSD_ORIGIN` is required for LAN/proxy origins.
- First-run setup creates one administrator; there is no default password.
- Passwords use salted scrypt. Only hashes of session tokens are persisted.
- Sessions expire after seven days; cookies are HttpOnly/SameSite=Strict and Secure
  when configured for HTTPS. Logout revokes the server-side session.
- Mutations require matching Origin, a custom request header and session CSRF token.
- Unauthenticated users cannot read case APIs, attachments or backups.
- Private data must be outside `dist/`; filesystem access is by generated UUID/hash,
  not a user-provided path. Downloads use attachment/octet-stream and nosniff.
- HTML is not interpreted from local records or discussion text.
- Revision conflicts are rejected. Portable restore validates schema/checksums
  and refuses non-empty targets.

## Contributions and public access

- Connections require admin configuration; only explicit send/refresh contacts a peer.
- HTTPS except loopback or explicitly allowlisted private HTTP peers; no redirects.
- Intake requires a revocable bearer key, refuses cookies/browser origins, and
  scopes receipts to the key owner. Receiver stores token hashes; sender stores
  the usable key in private SQLite, excluded from portable archive backups.
- Strict envelopes reject extra fields and validate hashes/limits. Idempotency
  prevents same-key/package-ID retries from creating duplicate submissions.
- Admin session/CSRF is separate from bearer auth. Approving does not publish.
- Public APIs serve only explicit publication snapshots and selected files; no
  private intake metadata. Withdrawal gates future public reads/downloads.
- Instance-specific cookie names avoid collisions between local/community ports.

## Known alpha limitations

Single process/admin; in-memory login throttling resets on restart. No encrypted
storage/backup, malware scanning, media sanitization, remote password recovery,
multi-user roles, intake purge, resumable uploads or production audit. File contents are not safe merely because
their checksum matches. Keep OS/disk permissions restrictive and protect backup
files. Private data directories contain credentials and sessions in addition to records.

The static preview has no real authentication/upload/payment API. Providers and
reverse proxies may log HTTP requests independently of the application.
