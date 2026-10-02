# Ho So Den — The Open Case Archive

**Open source. Self-hostable preview. Working toward local-first archives.**

[Vietnamese README](../README.md) · [Live preview](https://phoenixvn.github.io/ho-so-den/) · [Roadmap](../ROADMAP.md)

Current release: **0.1.0-alpha.2**, an interactive design preview. All records,
sources and legal statuses are fictional. There is no persistent archive,
real authentication, upload API, community sync, payment processing or blockchain
integration yet. Self-hosting currently means hosting this preview.

## Run

```sh
git clone https://github.com/phoenixvn/ho-so-den.git
cd ho-so-den
docker compose up -d --build
```

Open http://localhost:8080 . Docker must be running. The port binds to loopback only.

Or with Node.js 22+ (24 recommended):

```sh
npm ci
npm run build
npm start
```

Fonts are bundled locally after installation. No analytics or remote font
requests are made at runtime. Theme preference is stored locally; demo comments
exist only in memory. Hosted providers may log ordinary HTTP requests.

## Goal

Run your own archive on a PC, NAS or VPS. Keep private records under your control.
Optionally select and send a copy to a community server for private editorial
review. Publication to the community and IPFS/Solana is separate from local storage.
Cryptomus is the sole planned payment integration; ordinary local use needs no wallet.

Read the [architecture](ARCHITECTURE.md), [requirements audit](REQUIREMENTS.md),
[contributing guide](../CONTRIBUTING.md) and [security policy](../SECURITY.md).

## License

Original code, docs and fictional fixtures: **AGPL-3.0-only**, without warranty.
Fonts retain **OFL-1.1**. The code license does not automatically license users'
records. See [LICENSE](../LICENSE), [NOTICE](../NOTICE) and
[third-party notices](../THIRD_PARTY_NOTICES.md).
