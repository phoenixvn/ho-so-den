# Self-hosting

## Local archive (default)

Read [LOCAL_ARCHIVE.md](LOCAL_ARCHIVE.md) for first-run setup, storage, limits,
backup and restore. Node.js 22.18+ is required; 24 LTS is recommended.

```sh
git clone https://github.com/phoenixvn/ho-so-den.git
cd ho-so-den
npm ci
npm run build
npm start
```

Open http://127.0.0.1:8080 and create the local administrator. SQLite/files live
in `data/`, not in the public `dist/` directory. No central account is needed.

Or:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 archive
```

Docker uses a persistent named volume; default host binding is loopback only.
If port 8080 is occupied, PowerShell: `$env:PREVIEW_PORT = '8098'`, then run Compose.
POSIX: `PREVIEW_PORT=8098 docker compose up -d --build`.

`docker compose down` preserves the archive. **Do not add `-v` unless you intend
to delete the data volume.** Upgrading requires a backup first, then rebuild/restart.
The SQLite schema version is checked on startup; newer unsupported schemas are refused.

## Static design preview

```sh
npm run build
npm run start:preview
```

The preview has fictional cases and no archive API. `dist/` may be deployed to
GitHub Pages or another static host. Upload **only `dist/`**, never the data
directory, repo root or Docker volume. Hash routes work under subpaths.

Keep `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md` and `font-licenses/` when
redistributing. A modified network deployment must link to its corresponding
source. The local archive cannot run on GitHub Pages; it requires the Node server.

## Dependencies and data boundary

Installation/build uses npm and Docker registries. Fonts are bundled; normal
runtime makes no provider calls. Private endpoints require local authentication,
same-origin mutation headers and CSRF. A hosting provider may keep HTTP logs.
Optional community pairing and explicit contributions are available via
[COMMUNITY_SETUP.md](COMMUNITY_SETUP.md). OTP email, Cryptomus, Solana, IPFS and
NFTs are not connected. Community is a separate instance with its own data volume.
