<!-- Generated from tmtroot/readme.tmt. Edit that, then `tomet export .`. -->

# Tomet Website

The official documentation portal and marketing website for the [Tomet](https://github.com/tomet-lang/tomet) language ecosystem.

## Architecture & How It Works

Built with **Astro 5** and `@tomet/astro`.
The documentation content collections load `.tmt` source documents and render them directly using `@tomet/wasm` (backed by `tomet-convert-html`).
There is no separate JavaScript `.tmt` parser; the Rust-compiled Wasm engine remains the authoritative source of truth.

Astro 5's Content Layer caching (`digest`) guarantees that only modified documents are re-rendered on incremental builds, scaling smoothly to tens of thousands of pages.

## Toolchain & Source Separation

Tooling and document sources are provisioned independently:

- **Toolchain & renderer (Nix — `flake.lock`)**:
`nix develop` (or `direnv`) provides the `tomet` / `sisho` / `catasto` CLI toolchain and links `@tomet/astro` and `@tomet/wasm` into `.tomet/astro` and `.tomet/wasm` (`package.json` depends on them via `file:`).
To move to a newer toolchain or renderer, run `nix flake update tomet`.
- **Document sources (`fs-catasto` — `catasto.ctmt` + `catasto.lock`)**:
`catasto.ctmt` declares `catasto.git` upstreams and uses `catasto.upstream` to copy only the required schemas (`tmtroot/schema/catasto@1.0.0.*`), vault configs (`vault.config.tmt`), and document/dictionary directories (`repos/atlas/{.tomet/schema,dict,docs}`, `repos/tomet/tmtroot`) into `repos/` without `.git`.
Each copied file or directory tree is committed in this repository and locked to its deterministic tree `sha256` and upstream `commit` under `"files"` in `catasto.lock`.
Run `catasto sync --update` (or `just sync`) to refresh from upstream, and `catasto check .` to verify no managed file or directory tree has drifted.
`src/lib/tomet.ts` reads `catasto.lock` directly and refuses to build if `catasto.lock` is missing or if entries for a repository have mismatched commits.

## Development

### Prerequisites

- Nix with flakes. Everything else comes from the dev shell (`nix develop`, or `direnv`).

### Run development server

```bash
npm install
just dev
```

To refresh `catasto`-managed sources under `repos/` and `tmtroot/schema/` from upstream:

```bash
catasto sync --update
```

To preview a local `@tomet/astro` or `@tomet/wasm` renderer checkout instead of the locked Nix revision:

```bash
just dev-local                 # ../tomet
just dev-local path/to/tomet
```

Only the files git tracks in that checkout are seen.

### Build static site

```bash
npm run build
npm run preview
```

## Published Content

The site publishes two `catasto`-managed document collections under `/docs/`:

- **`atlas` (`repos/atlas/docs/`)**: Ecosystem-wide overview and cross-repository guides (such as `/docs/overview`), validated against `repos/atlas/vault.config.tmt`.
- **`docs` (`repos/tomet/tmtroot/spec/`)**: Language and toolchain specification grouped by topic (`syntax`, `forms`, `expressions`, `declarations`, `elements`, `features`, `division`, `cli`, `lsp`, `bindings`), validated against `repos/tomet/vault.config.tmt`.

Unwritten 0-byte specification stubs are explicitly excluded by path with documented reasons in `src/content.config.ts` rather than skipped silently.

## Strict Build Guarantees

Production builds (`just build`) fail fast on any content or link defect:

- **Loader & Vault validation**: `tometLoader` validates each collection's `vault.config.tmt` (`repos/atlas/vault.config.tmt` and `repos/tomet/vault.config.tmt`) and fails with all parse errors, empty documents, unknown elements, `@draft` markers, and unresolved links at once.
- **Required collection & entry checks**: Page templates use `requireCollection`, `loadPublishedDocs`, `requireEntry`, and `requireRenderedHtml` so missing collections, slug collisions, missing entries, or empty HTML outputs fail the build.
- **Post-build link & anchor verification**: `src/integrations/check-links.ts` scans all generated HTML pages in `astro:build:done` and fails the build if any internal `href` or `#fragment` target is missing.

