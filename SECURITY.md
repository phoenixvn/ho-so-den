# Security policy

## Supported versions

Only the latest pre-alpha preview is maintained on a best-effort basis.
No stable production archive server has been released. Do not rely on this
preview to authenticate users, protect private case files or process payments.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting:
https://github.com/realitechteam/ho-so-den/security/advisories/new

Include the affected commit/version, reproduction steps using fictional data,
impact and suggested mitigation. Do not attach real case records, credentials,
wallet seeds, payment secrets or personal data.

If private reporting is unavailable, open a minimal issue asking the maintainer
to enable it, without exploit details. We aim to acknowledge reports within
seven days, but this volunteer project cannot guarantee a response SLA.

## Current boundaries

- The Node server serves `dist/` only; it is not a database or upload API.
- Docker binds localhost by default and runs as a non-root user, read-only.
- No OTP is sent, no money is collected, and no blockchain transaction is signed.
- Demo discussion text is rendered as text, not HTML, and is not persisted.
- Build/install processes contact npm; runtime assets are self-hosted.
- Any reverse proxy or hosting provider may maintain its own HTTP logs.

Before introducing a real backend, review authentication, file isolation,
tenant permissions, upload handling, backup/restore and the opt-in contribution
boundary described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
