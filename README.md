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

The site serves documentation from:

- `docs/guide`: User tutorials and comprehensive guides.
- `docs/spec`: Formal syntax and semantics specification.
- `docs/examples`: Real-world document examples.
- `docs/why`: Design rationale, architectural ethos, and background.

