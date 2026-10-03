# Privacy and data behavior

## Preview behavior today

- The page loads assets from its own origin, including fonts after `npm run build`.
- There is no analytics, tracking pixel, telemetry SDK or automatic update check.
- `hoso-reading-theme` in localStorage records `paper` or `ink` when permitted.
- Demo discussion notes exist in memory in the current browser tab; reload clears them.
- Email/OTP inputs are handled only in the page; no email is sent or account created.
- Cryptomus and Solana/IPFS screens do not make provider requests.
- Source/repository/license links are ordinary links, opened only by user action.
- The server does not implement an upload or contribution API.

The statement above applies to the **static preview server** only, not the local
archive server introduced in 0.2.0-alpha.1.

## Local archive behavior

The local UI sends records and selected attachments only to its own instance's
same-origin API. SQLite and blob files are stored in the configured private data
directory. Passwords are hashed; sessions use HttpOnly cookies and token hashes
in SQLite. Record/source/version metadata and current attachments persist until
deleted. LocalStorage still stores only the theme; archive content is not placed
in browser storage by the app.

Local APIs contact only explicitly configured peers when the administrator sends
a previewed package or requests a status refresh. No background polling occurs.
They do not contact Cryptomus, Solana or IPFS. Source
links may navigate externally only when the user clicks them. Portable backups
contain the whole current archive and are **unencrypted**; they omit account and
session data. Deleting an item does not delete copies in existing backup files.
Whole-directory backups include accounts/sessions as well as archive content,
connector secrets, outbox, intake and public snapshots.

## Contribution behavior

Packages contain only selected record content and files, plus intentional credit
and a rights statement. Title/summary/category are always previewed and sent.
Preparing a package stores a separate fixed copy in private outbox; deleting or
editing the original does not alter this copy. Sending uploads that copy to the
selected receiver, which can observe normal network metadata such as source IP.

Intake remains private until the receiver's administrator separately approves and
publishes an editorial snapshot. Public metadata excludes credentials, intake IDs,
rights statements and unselected files. A receiver's contributor-visible feedback
is returned on manual refresh. Withdrawal gates public access but cannot recall
downloaded copies. Intake has no automatic purge/retention policy in this alpha.

Sender connectors contain plaintext bearer keys in private SQLite; receivers keep
hashes only. Revoking a key does not erase submissions. Portable `.hsd.json` exports
exclude all contribution state; see the full-directory backup guidance.

Serving the website necessarily sends HTTP requests to its operator. Hosting
providers, reverse proxies and infrastructure may log requests/IP addresses under
their own policies. GitHub Pages is public hosting, not a private local archive.

## Installation

`npm ci`, Docker image pulls and browser-test installation contact their package
registries/providers. Runtime privacy claims do not mean installation is offline.
The build includes the required font assets so normal reading needs no remote font CDN.

## Planned local-first behavior

No automatic upload of records, hashes, inventory or metadata. A user must choose
and preview a package and explicitly send it to a configured community endpoint.
Private originals stay local. A community service must disclose its own retention,
moderation and publication terms before accepting real contributions.

Software licensing does not transfer rights over user data. Those future features
are implemented only to the bounded alpha scope; see [REQUIREMENTS.md](REQUIREMENTS.md).
