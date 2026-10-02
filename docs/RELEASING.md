# Release and preview publishing

## Scope

Pre-alpha tags identify design-preview releases, not production archive servers.
Publish the source and a static preview artifact from the same commit.

## Before tagging

1. Update `CHANGELOG.md`, `package.json` and the Compose image version together.
2. Run `npm ci`, `npm run check`, `npm test`, `npm run test:e2e` and Docker smoke tests.
3. Run `npm run check:license` to compare the AGPL text with SPDX (network required).
4. Review Git diff, staged files, dependency notices and release limitations.
5. Ensure no secrets, user archives, private paths or test artifacts are staged.
6. Ensure the UI source link points to the corresponding source repository.

## Publish

- Tag the tested commit as `v0.1.0-alpha.2` (or the next version).
- `npm run release:pack` produces a static preview `.tar.gz` in `release/`.
- Create a GitHub **prerelease**, attach the preview archive and point to the source tag.
- State prominently that OTP, Cryptomus, uploads and blockchain remain demo-only.

## GitHub Pages

Enable Pages with **GitHub Actions** as the source. `.github/workflows/pages.yml`
builds, tests and deploys `dist/` on a push to `main` or manual dispatch. It only
requests Pages/id-token write permissions for its deployment job. PR builds never
deploy and receive no deployment credentials.

The hosting URL is `https://phoenixvn.github.io/ho-so-den/`. After deployment,
verify the home page, fonts, a hash-linked dossier, legal links and both themes.
Never point a static preview deployment at a private archive directory.

## Rollback

Revert the faulty commit in a new commit and let the Pages workflow redeploy.
Do not rewrite an existing release tag. Publish a follow-up prerelease when needed.
The current release has no database migrations or payment state to roll back.
