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
are not present in this preview; see [REQUIREMENTS.md](REQUIREMENTS.md).
