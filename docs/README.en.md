# Ho So Den — The Open Case Archive

**Open source. Local-first. Privately stored, deliberately shared.**

[Vietnamese README](../README.md) · [Static preview](https://phoenixvn.github.io/ho-so-den/) · [Roadmap](../ROADMAP.md)

**Taking over the project?** Read [AGENTS.md](../AGENTS.md), the
[status ledger](PROJECT_STATUS.md), [development workflow](DEVELOPMENT_WORKFLOW.md)
and [product lifecycle](PRODUCT_LIFECYCLE.md). Editor-specific instructions point
to the same rules instead of maintaining competing copies.

Development version **0.3.0-alpha.1** includes a single-admin local archive:
SQLite persistence, case/source editing, version history, private attachments
and validated portable backups. The public website remains a fictional static
design preview. Optional community mode receives selected immutable packages,
reviews privately and separately publishes/withdraws editorial snapshots.
Real email OTP, PostgreSQL/multi-user, payments and Web3 are not implemented.

## Run locally

```sh
git clone https://github.com/phoenixvn/ho-so-den.git
cd ho-so-den
docker compose up -d --build
```

Open http://localhost:8080 and create the first administrator. Docker uses a
persistent named volume and binds localhost by default. `docker compose down`
preserves data; **`down -v` deletes it**.

Or use Node.js 22.18+ (24 LTS recommended):

```sh
npm ci
npm run build
npm start
```

Data defaults to `data/`. Set `HSD_DATA_DIR` to move it outside the web root.
There is no default password or central account. `npm run start:preview` runs only
the static demo. Fonts are bundled and no telemetry is enabled by default.

## Alpha boundaries

One administrator, one process per archive. Attachments: 25 MiB each. Portable
backup: 100 MiB JSON / 60 MiB media / 10,000 entries per collection, restored only
into an empty archive. Backups are unencrypted and exclude admin credentials and
sessions. For complete/larger archives, stop the server and back up the entire
data directory. No malware scanning, video transcoding or password-recovery email yet.

Read [local archive operations](LOCAL_ARCHIVE.md), [requirements](REQUIREMENTS.md),
[contributing](../CONTRIBUTING.md), [privacy](PRIVACY.md) and [security](../SECURITY.md).

For a two-instance Docker demo:
`docker compose -f compose.yaml -f compose.community.yaml up -d --build`.
Pair a receiver-issued key explicitly; selected file/content previews must be
confirmed before sending. See [COMMUNITY_SETUP.md](COMMUNITY_SETUP.md). Limits:
20 MiB media/50 files/package, 32 MiB JSON, 256 MiB payload per outbox/intake and
50 submissions/key. No automatic sending, polling or chunk-level resume.

Original code/docs/fixtures: **AGPL-3.0-only**, without warranty. Fonts retain
**OFL-1.1**. The software license does not automatically license users' records.
