import { defineCollection } from "astro:content";
import { tometLoader } from "@tomet/astro";
import { resolve } from "node:path";
import { tometRev } from "./lib/tomet";

// `.tomet/` links into the locked tomet revision via nix/dev.nix so the
// documents, vault config, and renderer all come from the exact same revision.
const tometDir = resolve(process.cwd(), ".tomet");
const tmtroot = resolve(tometDir, "tmtroot");
const vaultConfig = resolve(tometDir, "vault.config.tmt");

/**
 * Empty (0-byte) specification stubs in `tomet`'s `tmtroot/spec/` that are
 * explicitly excluded from publication until they have content.
 */
export const EXCLUDED_SPEC_STUBS: Readonly<Record<string, string>> = {
  "spec/bindings/java.tmt":
    "Unwritten Java binding spec stub (common validate behavior is in spec/bindings/validate.tmt).",
  "spec/bindings/javascript.tmt":
    "Unwritten JavaScript binding spec stub (common validate behavior is in spec/bindings/validate.tmt).",
  "spec/bindings/python.tmt":
    "Unwritten Python binding spec stub (common validate behavior is in spec/bindings/validate.tmt).",
  "spec/declarations/std.declaretions.declaration.tmt":
    "Empty typo stub (`declaretions`).",
  "spec/declarations/std.element.declaration.tmt":
    "Unwritten stub for `::element` (vocabulary declarations are in spec/features/vocabulary.tmt).",
  "spec/declarations/std.elements.declaration.tmt":
    "Unwritten plural stub for `::element` (vocabulary declarations are in spec/features/vocabulary.tmt).",
  "spec/declarations/std.macro.declaration.tmt":
    "Empty stub; `::macro` is documented in spec/elements/std.macros.element.tmt.",
  "spec/declarations/std.macros.declaration.tmt":
    "Empty plural stub; `::macro` is documented in spec/elements/std.macros.element.tmt.",
  "spec/declarations/std.vars.declaration.tmt":
    "Empty stub; `::var` is documented in spec/elements/std.vars.element.tmt.",
  "spec/declarations/std.vocabulary.declaration.tmt":
    "Empty stub; vocabulary registration is in spec/declarations/std.vocabularies.declaration.tmt and authoring in spec/features/vocabulary.tmt.",
  "spec/division/file.tmt":
    "Unwritten file division stub (division overview is in spec/division.tmt).",
  "spec/division/folder.tmt":
    "Unwritten folder division stub (division overview is in spec/division.tmt).",
  "spec/division/vault.tmt":
    "Unwritten vault division stub (division overview is in spec/division.tmt).",
  "spec/elements/doc.kbd.element.tmt":
    "Unwritten stub for the `@doc.kbd` element.",
  "spec/features/dictionary.tmt":
    "Empty stub; dictionaries are documented in spec/declarations/std.dictionary.declaration.tmt and std.dictionaries.declaration.tmt.",
  "spec/features/format.tmt":
    "Empty stub; formatting is documented in spec/declarations/std.format.declaration.tmt and spec/cli/format.tmt.",
  "spec/features/index.tmt":
    "Unwritten stub for the index feature.",
  "spec/forms/element.tmt":
    "Unwritten element form stub (hole and slot forms are in spec/forms/hole.tmt and spec/forms/slot.tmt).",
};

export const collections = {
  docs: defineCollection({
    loader: tometLoader({
      base: tmtroot,
      vault: vaultConfig,
      basePath: "tmtroot",
      sourcePathPrefix: "tmtroot",
      sourceUrl: tometRev.sourceUrl,
      advanced: true,
      filter: (relPath) =>
        relPath.startsWith("spec/") && !(relPath in EXCLUDED_SPEC_STUBS),
    }),
  }),
  samples: defineCollection({
    loader: tometLoader({
      base: resolve(process.cwd(), "src", "samples"),
      advanced: false,
    }),
  }),
};
