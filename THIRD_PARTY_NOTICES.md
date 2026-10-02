# Third-party notices

## Fonts shipped in the built preview

The build copies unmodified `.woff2` files and the complete license supplied
by each locked Fontsource package. Each font retains **SIL OFL-1.1**, not AGPL.

- **Be Vietnam Pro** — `@fontsource/be-vietnam-pro` 5.3.0. Font copyright and Reserved Font Names, if any, are in `font-licenses/be-vietnam-pro.txt` in the built site.
- **Noto Serif** — `@fontsource/noto-serif` 5.3.0. See `font-licenses/noto-serif.txt`.
- **IBM Plex Mono** — `@fontsource/ibm-plex-mono` 5.3.0. See `font-licenses/ibm-plex-mono.txt`.

The source package licenses are also available in the corresponding
`node_modules/@fontsource/<name>/LICENSE` after `npm ci`. Fontsource:
https://fontsource.org/ . No runtime Google Fonts request is made by the build.

## Development and runtime tools

- Playwright / `@playwright/test`: Apache-2.0; browser testing only, not shipped in the preview website.
- Node.js and its bundled components retain their upstream licenses in the runtime image: https://github.com/nodejs/node/blob/main/LICENSE .
- The Node Alpine container includes third-party OS components under their respective licenses. The project license does not replace them.

`package-lock.json` records the exact JavaScript dependency graph. Keep the
upstream license notices when redistributing dependencies or built font assets.

## Illustrations and names

All case illustrations are original CSS graphics. No photographs, manga/anime
artwork, third-party logos or real case documents are included. References to
Solana, IPFS and Cryptomus identify intended integrations only.
