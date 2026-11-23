<!-- Generated from tmtroot/readme.tmt. Edit that, then `tomet export .`. -->

# Tomet Website

The official documentation portal and marketing website for the [Tomet](https://github.com/tomet-lang/tomet) language.

## Architecture & How It Works

Built with **Astro 5** and `@tomet/astro`.
The documentation content collection loads `.tmt` source documents and renders them directly using `@tomet/wasm` (backed by `tomet-convert-html`).
There is no separate JavaScript `.tmt` parser; the Rust-compiled Wasm engine remains the authoritative source of truth.

Astro 5's Content Layer caching (`digest`) guarantees that only modified documents are re-rendered on incremental builds, scaling smoothly to tens of thousands of pages.

## One tomet revision

The `tomet` input in `flake.lock` is the only tomet this site knows.
The dev shell links it into `.tomet/`:

- `.tomet/astro`, `.tomet/wasm`: `@tomet/astro` and `@tomet/wasm` built from that revision. `package.json` depends on them with `file:`.
- `.tomet/tmtroot`: the documents of that revision, which the docs collection loads.
- `.tomet/vault.config.tmt`: the vault config of that revision, resolving vocabularies, dictionaries, and blueprints alongside `.tomet/tmtroot`.

The `tomet` CLI in the shell is built from the same input, and the footer of every page names the revision.
The build refuses to run outside the dev shell, where no revision is set.
To move to a newer tomet, run `nix flake update tomet`.

## Development

### Prerequisites

- Nix with flakes. Everything else comes from the dev shell (`nix develop`, or direnv).

### Run development server

```bash
npm install
just dev
```

To preview a local tomet checkout (unreleased documents or renderer changes) instead of the locked revision:

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

The site publishes the language and toolchain specification from `tmtroot/spec/` in `tomet` (`docs/`), grouped by topic (`syntax`, `forms`, `expressions`, `declarations`, `elements`, `features`, `division`, `cli`, `lsp`, `bindings`).
Unwritten 0-byte specification stubs are explicitly excluded by path with documented reasons in `src/content.config.ts` rather than skipped silently.

## Strict Build Guarantees

Production builds (`just build`) fail fast on any content or link defect:

- **Loader & Vault validation**: `tometLoader` validates `.tomet/vault.config.tmt` and fails with all parse errors, empty documents, unknown elements, `@draft` markers, and unresolved links at once.
- **Required collection & entry checks**: Page templates use `requireCollection`, `requireEntry`, and `requireRenderedHtml` so missing collections, missing entries, or empty HTML outputs fail the build.
- **Post-build link & anchor verification**: `src/integrations/check-links.ts` scans all generated HTML pages in `astro:build:done` and fails the build if any internal `href` or `#fragment` target is missing.

